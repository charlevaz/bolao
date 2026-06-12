const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');

// Ler variáveis de ambiente do .env.local manualmente
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const apiKey = 'd16191f69610189a4a831a8e1417b14c';

async function testMatch() {
  const { data: dbMatches, error } = await supabase
    .from('matches')
    .select('id, team_a, team_b, match_date')
    .order('match_date', { ascending: true })
    .limit(10);
    
  if (error) {
    console.error('DB Error:', error);
    return;
  }
  
  console.log('--- JOGOS NO BANCO (Próximos 10) ---');
  dbMatches.forEach(m => console.log(`${m.team_a} x ${m.team_b} (${m.match_date})`));
  
  const firstDate = new Date(dbMatches[0].match_date).toISOString().split('T')[0];
  
  console.log(`\n--- BUSCANDO NA API-FOOTBALL PARA A DATA: ${firstDate} ---`);
  
  https.get({
    hostname: 'v3.football.api-sports.io', 
    path: `/fixtures?league=1&season=2026&date=${firstDate}`, 
    headers: { 'x-apisports-key': apiKey }
  }, res => {
    let d=''; 
    res.on('data', c=>d+=c); 
    res.on('end', ()=> {
      const r = JSON.parse(d).response;
      r.forEach(f => {
        console.log(`API: ${f.teams.home.name} x ${f.teams.away.name} (${f.fixture.date})`);
      });
      
      console.log('\n--- SIMULANDO ALGORITMO DE MATCHING (Nomes) ---');
      dbMatches.filter(m => m.match_date.includes(firstDate)).forEach(dbM => {
        // Ignorar acentos e minúsculas
        const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        
        const dbA = normalize(dbM.team_a);
        const dbB = normalize(dbM.team_b);
        
        const matched = r.find(api => {
          const apiA = normalize(api.teams.home.name);
          const apiB = normalize(api.teams.away.name);
          return (apiA === dbA && apiB === dbB) || (apiA === dbB && apiB === dbA);
        });
        
        if (matched) {
          console.log(`✅ MATCH SUCCESS: DB [${dbM.team_a} x ${dbM.team_b}] === API [${matched.teams.home.name} x ${matched.teams.away.name}]`);
        } else {
          console.log(`❌ MATCH FAIL: DB [${dbM.team_a} x ${dbM.team_b}] NOT FOUND IN API FOR THIS DATE`);
        }
      });
    });
  }).on('error', e => console.error(e));
}

testMatch();
