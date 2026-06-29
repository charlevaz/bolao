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

    const datesToQuery = new Set<string>();

    if (!pendingMatches || pendingMatches.length === 0) {
      console.log('[Sync Scores Cron] No pending matches that have started. Skipping past sync.');
    } else {
      // Determine unique dates needed to query ESPN API
      // ESPN API expects date as YYYYMMDD
      pendingMatches.forEach(m => {
        // Usa en-US explicitamente para garantir o formato MM/DD/YYYY
        const spDate = new Date(m.match_date).toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).split('/');
        const espnDate = `${spDate[2]}${spDate[0]}${spDate[1]}`; // YYYYMMDD
        datesToQuery.add(espnDate);
      });

      console.log(`[Sync Scores Cron] Fetching ESPN API for dates: ${Array.from(datesToQuery).join(', ')}`);
    }

    const processedMatches: any[] = [];
    let totalApiRequests = 0;
    const apiErrors: any[] = [];

    // Tabela de sinônimos (ESPN names vs DB names)
    const aliasMap: Record<string, string> = {
      "turkiye": "turkey",
      "cote d'ivoire": "ivory coast",
      "united states": "usa",
      "bosnia-herzegovina": "bosnia & herzegovina",
      "czechia": "czech republic",
      "congo dr": "dr congo"
    };

    const normalize = (str: string) => {
      if (!str) return '';
      let s = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      return aliasMap[s] || s;
    };

    // Load team translations for knockout syncing
    const { data: translations } = await supabase.from('team_translations').select('*');
    const translationMap = new Map();
    if (translations) {
      translations.forEach(t => {
        translationMap.set(normalize(t.api_name), { pt: t.pt_name, flag: t.flag_code });
      });
    }

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
      const matchesOfDay = (pendingMatches || []).filter(m => {
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

    // 2. Sync Knockout Teams (Future Matches)
    const { data: upcomingKnockouts } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'pending')
      .not('group_name', 'ilike', 'Group%');

    let knockoutUpdates = 0;

    if (upcomingKnockouts && upcomingKnockouts.length > 0) {
      const knockoutDatesToQuery = new Set<string>();
      
      const addDateToSet = (dateObj: Date) => {
        const spDateStr = dateObj.toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
        const parts = spDateStr.split('/');
        knockoutDatesToQuery.add(`${parts[2]}${parts[0]}${parts[1]}`);
      };

      upcomingKnockouts.forEach(m => {
        const dt = new Date(m.match_date);
        addDateToSet(dt); // Data exata
        addDateToSet(new Date(dt.getTime() - 24 * 60 * 60 * 1000)); // Dia anterior (fuso ESPN)
        addDateToSet(new Date(dt.getTime() + 24 * 60 * 60 * 1000)); // Dia seguinte (fuso ESPN)
      });

      console.log(`[Sync Scores Cron] Fetching ESPN API for knockout dates: ${Array.from(knockoutDatesToQuery).join(', ')}`);

      let allEvents: any[] = [];
      
      const fetchPromises = Array.from(knockoutDatesToQuery).map(async (espnDate) => {
        try {
          const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${espnDate}`, {
            cache: 'no-store'
          });
          if (res.ok) {
            const data = await res.json();
            return data.events || [];
          }
        } catch (err) {
          console.error(`[Sync Scores Cron] Error fetching ${espnDate}:`, err);
        }
        return [];
      });

      const eventsArrays = await Promise.all(fetchPromises);
      eventsArrays.forEach(events => {
        allEvents = allEvents.concat(events);
      });
      totalApiRequests += fetchPromises.length;

      for (const dbMatch of upcomingKnockouts) {
        const dbTime = new Date(dbMatch.match_date).getTime();
        const matchedEvent = allEvents.find((e: any) => new Date(e.date).getTime() === dbTime);

        if (matchedEvent) {
           const comp = matchedEvent.competitions[0];
           const homeComp = comp.competitors.find((c: any) => c.homeAway === 'home');
           const awayComp = comp.competitors.find((c: any) => c.homeAway === 'away');
           
           if (homeComp && awayComp && homeComp.team.displayName !== 'TBD' && awayComp.team.displayName !== 'TBD') {
              const apiA = normalize(homeComp.team.name);
              const apiB = normalize(awayComp.team.name);
              
              const trA = translationMap.get(apiA);
              const trB = translationMap.get(apiB);

              if (trA && trB) {
                 if (dbMatch.team_a !== trA.pt || dbMatch.team_b !== trB.pt) {
                    console.log(`[Sync Scores Cron] Updating knockout match ${dbMatch.id} teams to ${trA.pt} vs ${trB.pt}`);
                    await supabase.from('matches').update({
                       team_a: trA.pt,
                       team_b: trB.pt,
                       flag_a: trA.flag,
                       flag_b: trB.flag
                    }).eq('id', dbMatch.id);
                    knockoutUpdates++;
                 }
              }
           }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Scores synced successfully', 
      matchesUpdated: processedMatches.length, 
      apiRequests: totalApiRequests,
      knockoutUpdates,
      debug: {
        allEventsLength: upcomingKnockouts ? upcomingKnockouts.length : 0
      },
      updatedMatches: processedMatches,
      apiErrors
    });

  } catch (error: any) {
    console.error('[Sync Scores Cron] Job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

