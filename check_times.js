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

async function checkMatchTimes() {
  const { data: dbMatches, error } = await supabase
    .from('matches')
    .select('match_date')
    .order('match_date', { ascending: true });
    
  if (error) {
    console.error('DB Error:', error);
    return;
  }
  
  const hours = new Set();
  
  dbMatches.forEach(m => {
    // Pegar a hora no horário de Brasília (UTC-3)
    const date = new Date(m.match_date);
    const hourBrt = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getHours();
    hours.add(hourBrt);
  });
  
  const sortedHours = Array.from(hours).sort((a, b) => a - b);
  console.log('Horários de INÍCIO dos jogos (Hora Local BRT):');
  console.log(sortedHours);
  
  // Calcular hora que o jogo pode acabar (Duração do jogo + ~2 horas por segurança)
  // Jogo que começa as 13h, acaba as 15h. A cron deve checar de 15h até umas 17h.
  const cronHours = new Set();
  sortedHours.forEach(h => {
    cronHours.add((h + 2) % 24); // Hora de término + margem (Pode terminar nos pênaltis)
    cronHours.add((h + 3) % 24);
    cronHours.add((h + 4) % 24);
  });
  
  console.log('\nHorários recomendados para a CRON rodar (BRT):');
  console.log(Array.from(cronHours).sort((a, b) => a - b));
}

checkMatchTimes();
