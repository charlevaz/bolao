const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: pData } = await supabase.from('profiles').select('*').limit(1);
  console.log("Profiles schema:", pData && pData[0] ? Object.keys(pData[0]) : "No data");
  
  const { data: ppData } = await supabase.from('public_profiles').select('*').limit(1);
  console.log("Public Profiles schema:", ppData && ppData[0] ? Object.keys(ppData[0]) : "No data");
}
test();
