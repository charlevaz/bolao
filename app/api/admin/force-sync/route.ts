import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(msg);
  };

  try {
    const { data: upcomingKnockouts, error: err } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'pending')
      .not('group_name', 'ilike', 'Group%');

    if (err) throw err;

    const { data: translations } = await supabase.from('team_translations').select('*');
    const translationMap = new Map();
    if (translations) {
      translations.forEach(t => {
        let n = t.api_name ? t.api_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';
        translationMap.set(n, { pt: t.pt_name, flag: t.flag_code });
      });
    }

    const knockoutDatesToQuery = new Set<string>();
    upcomingKnockouts?.forEach(m => {
      const spDateStr = new Date(m.match_date).toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
      const parts = spDateStr.split('/'); // [MM, DD, YYYY]
      const espnDate = `${parts[2]}${parts[0]}${parts[1]}`; // YYYYMMDD
      knockoutDatesToQuery.add(espnDate);
    });

    log(`Dates to query: ${Array.from(knockoutDatesToQuery).join(', ')}`);

    let knockoutUpdates = 0;

    for (const espnDate of Array.from(knockoutDatesToQuery)) {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${espnDate}`, { cache: 'no-store' });
      const data = await res.json();
      const events = data.events || [];
      log(`Fetched ${events.length} events for ${espnDate}`);

      const matchesOfDay = upcomingKnockouts!.filter(m => {
         const spDateStr = new Date(m.match_date).toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
         const parts = spDateStr.split('/');
         const mDate = `${parts[2]}${parts[0]}${parts[1]}`;
         return mDate === espnDate;
      });

      for (const dbMatch of matchesOfDay) {
        const dbTime = new Date(dbMatch.match_date).getTime();
        const matchedEvent = events.find((e: any) => new Date(e.date).getTime() === dbTime);

        if (matchedEvent) {
           const comp = matchedEvent.competitions[0];
           const homeComp = comp.competitors.find((c: any) => c.homeAway === 'home');
           const awayComp = comp.competitors.find((c: any) => c.homeAway === 'away');
           
           if (homeComp && awayComp && homeComp.team.displayName !== 'TBD' && awayComp.team.displayName !== 'TBD') {
              const apiA = homeComp.team.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
              const apiB = awayComp.team.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
              
              const trA = translationMap.get(apiA);
              const trB = translationMap.get(apiB);

              if (trA && trB) {
                 if (dbMatch.team_a !== trA.pt || dbMatch.team_b !== trB.pt) {
                    log(`Updating ${dbMatch.id} to ${trA.pt} vs ${trB.pt}`);
                    const { error } = await supabase.from('matches').update({
                       team_a: trA.pt, team_b: trB.pt, flag_a: trA.flag, flag_b: trB.flag
                    }).eq('id', dbMatch.id);
                    if (error) log(`DB UPDATE ERROR: ${error.message}`);
                    else knockoutUpdates++;
                 } else {
                    log(`Match ${dbMatch.id} already up to date`);
                 }
              } else {
                 log(`Missing translation for ${apiA} or ${apiB}`);
              }
           }
        }
      }
    }

    return NextResponse.json({ success: true, knockoutUpdates, logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, logs }, { status: 500 });
  }
}
