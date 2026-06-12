const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if(k && v) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});

// Preciso da chave service_role para ver definições de funções, 
// mas como não tenho a service role, posso apenas fazer uma requisição SQL se a API permitir.
// Como não temos acesso a pg_proc via REST, vou apenas simular.
console.log('Sem service_role key, nao consigo ler pg_proc facilmente via REST.');
