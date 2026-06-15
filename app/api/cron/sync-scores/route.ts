import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    console.log('[Sync Scores Cron] Job started');

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
    const apiFootballKey = process.env.API_FOOTBALL_KEY;

    if (!supabaseKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    if (!apiFootballKey) {
      // The API_FOOTBALL_KEY had spaces in .env.local, maybe it's fixed or needs trimming
      // We will try to get it, or fallback if it's missing (should throw error)
      throw new Error('API_FOOTBALL_KEY is not configured');
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

    // Determine unique dates needed to query API-Football
    // API-Football expects local date (YYYY-MM-DD), but we can just use the date part of ISO
    // The safest is to extract YYYY-MM-DD from the UTC match_date since API fixtures use UTC time
    const datesToQuery = new Set<string>();
    pendingMatches.forEach(m => {
      const d = new Date(m.match_date).toISOString().split('T')[0];
      datesToQuery.add(d);
    });

    console.log(`[Sync Scores Cron] Fetching API-Football for dates: ${Array.from(datesToQuery).join(', ')}`);

    const processedMatches = [];
    let totalApiRequests = 0;
    const apiErrors: any[] = [];

    for (const date of Array.from(datesToQuery)) {
      totalApiRequests++;
      // Removendo league e season para contornar o bloqueio do plano Free da API-Football
      const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
        headers: {
          'x-apisports-key': apiFootballKey.replace(/\s+/g, '') // remove possible spaces
        },
        cache: 'no-store' // <--- EVITA CACHE DO NEXT.JS
      });

      if (!res.ok) {
        console.error(`[Sync Scores Cron] API-Football error for date ${date}: ${res.statusText}`);
        continue;
      }

      const data = await res.json();
      
      if (data.errors && Object.keys(data.errors).length > 0) {
        apiErrors.push({ date, errors: data.errors });
      }

      // Filtra os jogos apenas da Copa do Mundo (League ID 1) para evitar cruzar com outros campeonatos do dia
      const apiFixtures = (data.response || []).filter((f: any) => f.league.id === 1);

      // Match pending matches of this date
      const matchesOfDay = pendingMatches.filter(m => new Date(m.match_date).toISOString().startsWith(date));

      for (const dbMatch of matchesOfDay) {
        // Normaliza removendo acentos e deixando minúsculo para comparar
        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const dbA = normalize(dbMatch.team_a);
        const dbB = normalize(dbMatch.team_b);

        const matchedFixture = apiFixtures.find((api: any) => {
          const apiA = normalize(api.teams.home.name);
          const apiB = normalize(api.teams.away.name);
          return (apiA === dbA && apiB === dbB) || (apiA === dbB && apiB === dbA);
        });

        if (matchedFixture) {
          const statusShort = matchedFixture.fixture.status.short;
          // FT = Full Time, AET = After Extra Time, PEN = Penalties
          if (['FT', 'AET', 'PEN'].includes(statusShort)) {
            // Get regular time + extra time score (API returns total goals in fulltime/extratime/penalty object)
            // But usually the final match score for the guess points is the total goals of the match.
            // If it goes to penalties, we usually count the score AFTER extra time, not including penalties.
            // But API-Football provides "goals" which is the final total score (excluding penalty shootout goals).
            
            let scoreA = matchedFixture.goals.home;
            let scoreB = matchedFixture.goals.away;

            // Se for do jeito que time B estava na casa e time A visitando na API
            if (normalize(matchedFixture.teams.home.name) === dbB) {
              scoreA = matchedFixture.goals.away;
              scoreB = matchedFixture.goals.home;
            }

            console.log(`[Sync Scores Cron] MATCH FINISHED: ${dbMatch.team_a} ${scoreA} x ${scoreB} ${dbMatch.team_b}`);

            if (scoreA !== null && scoreB !== null) {
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
            console.log(`[Sync Scores Cron] Match ${dbMatch.team_a} x ${dbMatch.team_b} is still ongoing/pending (status: ${statusShort})`);
          }
        } else {
          console.warn(`[Sync Scores Cron] Could not map DB match ${dbMatch.team_a} x ${dbMatch.team_b} to API-Football`);
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
