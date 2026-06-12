const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const https = require('https');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if(k && v) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});

async function testCron() {
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY); // using anon key just to read matches
  const { data: pendingMatches, error: dbErr } = await supabase
    .from('matches')
    .select('*')
    //.eq('status', 'pending')
    .lt('match_date', new Date().toISOString());

  if (dbErr) return console.log('DB Err', dbErr);

  console.log('Pending matches count:', pendingMatches.length);
  const datesToQuery = new Set();
  pendingMatches.forEach(m => {
    const d = new Date(m.match_date).toISOString().split('T')[0];
    datesToQuery.add(d);
  });

  console.log('Dates to query:', datesToQuery);

  for (const date of Array.from(datesToQuery)) {
    https.get({
      hostname: 'v3.football.api-sports.io',
      path: '/fixtures?date=' + date,
      headers: { 'x-apisports-key': 'd16191f69610189a4a831a8e1417b14c' }
    }, res => {
      let d = '';
      res.on('data', c => d+=c);
      res.on('end', () => {
        const data = JSON.parse(d);
        const apiFixtures = (data.response || []).filter(f => f.league.id === 1);
        const matchesOfDay = pendingMatches.filter(m => new Date(m.match_date).toISOString().startsWith(date));
        
        for (const dbMatch of matchesOfDay) {
          const normalize = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
          const dbA = normalize(dbMatch.team_a);
          const dbB = normalize(dbMatch.team_b);

          const matchedFixture = apiFixtures.find(api => {
            const apiA = normalize(api.teams.home.name);
            const apiB = normalize(api.teams.away.name);
            return (apiA === dbA && apiB === dbB) || (apiA === dbB && apiB === dbA);
          });

          if (matchedFixture) {
            console.log('MATCHED:', dbMatch.team_a, 'x', dbMatch.team_b, 'Status:', matchedFixture.fixture.status.short);
          } else {
            console.log('NOT MATCHED:', dbMatch.team_a, 'x', dbMatch.team_b);
          }
        }
      });
    });
  }
}
testCron();
