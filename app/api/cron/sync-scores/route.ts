import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    console.log('[Sync Scores Cron] Job started (ESPN API)');

    const authHeader = request.headers.get('authorization');
    const url = new URL(request.url);
    const bypassKey = url.searchParams.get('bypass');
    
    const cronSecret = process.env.CRON_PASS || process.env.CRON_SECRET;
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isBypassAuthorized = !!(bypassKey && cronSecret && bypassKey === cronSecret);

    if (!isDevelopment && !isBypassAuthorized && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Sync Scores Cron] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch pending matches that have already started (match_date < now)
    const { data: pendingMatches, error: dbErr } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'pending')
      .lt('match_date', new Date().toISOString());

    if (dbErr) {
      throw new Error(`Error fetching DB matches: ${dbErr.message}`);
    }

    if (!pendingMatches || pendingMatches.length === 0) {
      console.log('[Sync Scores Cron] No pending matches that have started. Exiting.');
      return NextResponse.json({ success: true, message: 'No pending past matches', processed: 0 });
    }

    // Determine unique dates needed to query ESPN API
    // ESPN API expects date as YYYYMMDD
    const datesToQuery = new Set<string>();
    pendingMatches.forEach(m => {
      // Usar fuso de SP para a data do jogo e converter pra YYYYMMDD para a ESPN
      const spDate = new Date(m.match_date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/');
      const espnDate = `${spDate[2]}${spDate[1]}${spDate[0]}`; // YYYYMMDD
      datesToQuery.add(espnDate);
    });

    console.log(`[Sync Scores Cron] Fetching ESPN API for dates: ${Array.from(datesToQuery).join(', ')}`);

    const processedMatches = [];
    let totalApiRequests = 0;
    const apiErrors: any[] = [];

    // Tabela de sinônimos (ESPN names vs DB names)
    const aliasMap: Record<string, string> = {
      "turkiye": "turkey",
      "cote d'ivoire": "ivory coast",
      "united states": "usa",
      "bosnia-herzegovina": "bosnia & herzegovina",
      "czechia": "czech republic"
    };

    const normalize = (str: string) => {
      if (!str) return '';
      let s = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      return aliasMap[s] || s;
    };

    for (const espnDate of Array.from(datesToQuery)) {
      totalApiRequests++;
      
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${espnDate}`, {
        cache: 'no-store'
      });

      if (!res.ok) {
        console.error(`[Sync Scores Cron] ESPN API error for date ${espnDate}: ${res.statusText}`);
        continue;
      }

      const data = await res.json();
      const events = data.events || [];

      // Filtra os jogos do DB que pertencem a essa data
      const matchesOfDay = pendingMatches.filter(m => {
         const spDate = new Date(m.match_date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/');
         const mDate = `${spDate[2]}${spDate[1]}${spDate[0]}`;
         return mDate === espnDate;
      });

      for (const dbMatch of matchesOfDay) {
        const dbA = normalize(dbMatch.team_a);
        const dbB = normalize(dbMatch.team_b);

        const matchedEvent = events.find((e: any) => {
          if (!e.competitions || e.competitions.length === 0) return false;
          const comps = e.competitions[0].competitors;
          const home = comps.find((c: any) => c.homeAway === 'home')?.team?.name;
          const away = comps.find((c: any) => c.homeAway === 'away')?.team?.name;
          
          if (!home || !away) return false;

          const apiA = normalize(home);
          const apiB = normalize(away);

          return (apiA === dbA && apiB === dbB) || (apiA === dbB && apiB === dbA);
        });

        if (matchedEvent) {
          const comp = matchedEvent.competitions[0];
          const statusName = comp.status.type.name; // e.g. STATUS_FINAL
          const statusShort = comp.status.type.shortDetail; // e.g. FT, PEN

          if (statusName === 'STATUS_FINAL' || statusShort === 'FT' || statusShort === 'PEN' || statusShort === 'AET') {
            const homeComp = comp.competitors.find((c: any) => c.homeAway === 'home');
            const awayComp = comp.competitors.find((c: any) => c.homeAway === 'away');
            
            let scoreA = parseInt(homeComp.score, 10);
            let scoreB = parseInt(awayComp.score, 10);

            if (normalize(homeComp.team.name) === dbB) {
              scoreA = parseInt(awayComp.score, 10);
              scoreB = parseInt(homeComp.score, 10);
            }

            console.log(`[Sync Scores Cron] MATCH FINISHED: ${dbMatch.team_a} ${scoreA} x ${scoreB} ${dbMatch.team_b}`);

            if (!isNaN(scoreA) && !isNaN(scoreB)) {
              // Finish the match in our DB!
              const { error: rpcErr } = await supabase.rpc('finish_match', {
                p_match_id: dbMatch.id,
                p_real_score_a: scoreA,
                p_real_score_b: scoreB
              });

              if (rpcErr) {
                console.error(`[Sync Scores Cron] Failed to finish match ${dbMatch.id}:`, rpcErr);
              } else {
                processedMatches.push({
                  id: dbMatch.id,
                  teams: `${dbMatch.team_a} x ${dbMatch.team_b}`,
                  score: `${scoreA} x ${scoreB}`
                });
              }
            }
          } else {
            console.log(`[Sync Scores Cron] Match ${dbMatch.team_a} x ${dbMatch.team_b} is still ongoing/pending (status: ${statusName})`);
          }
        } else {
          console.warn(`[Sync Scores Cron] Could not map DB match ${dbMatch.team_a} x ${dbMatch.team_b} to ESPN`);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: processedMatches.length, 
      apiRequests: totalApiRequests,
      updatedMatches: processedMatches,
      apiErrors
    });

  } catch (error: any) {
    console.error('[Sync Scores Cron] Job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

