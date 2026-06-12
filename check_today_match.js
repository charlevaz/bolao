const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMatch() {
  const { data: dbMatches, error } = await supabase
    .from('matches')
    .select('id, team_a, team_b, match_date, status')
    .order('match_date', { ascending: true })
    .limit(3);
    
  if (error) {
    console.error('DB Error:', error);
    return;
  }
  
  dbMatches.forEach(m => {
    const d = new Date(m.match_date);
    const brtTime = d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log(`${m.team_a} x ${m.team_b} | UTC: ${m.match_date} | BRT: ${brtTime} | Status: ${m.status}`);
  });
}

checkMatch();
