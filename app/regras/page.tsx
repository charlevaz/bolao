import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

export default async function Regras() {
  const supabase = createClient();
  
  // Buscar pool do bolão de colaboradores
  const { data: pool } = await supabase.from('pool_settings').select('*').eq('id', 1).single();
  
  // Buscar total arrecadado (quantos pagos x valor)
  const { data: paidEmails } = await supabase.from('allowed_emails').select('id').eq('paid', true);
  const paidCount = paidEmails?.length || 0;
  
  const totalPool = pool ? paidCount * Number(pool.value_per_person) : 0;
  const prize1 = pool ? (totalPool * Number(pool.pct_1st)) / 100 : 0;
  const prize2 = pool ? (totalPool * Number(pool.pct_2nd)) / 100 : 0;
  const prize3 = pool ? (totalPool * Number(pool.pct_3rd)) / 100 : 0;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6', color: '#fff' }}>
      <Link href="/" style={{ color: '#60a5fa', marginBottom: '2rem', display: 'inline-block' }}>← Voltar para a Home</Link>
      
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#fff', fontWeight: '900', textTransform: 'uppercase' }}>
        Bolão EntreGô Sumarezinho
      </h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', color: '#60a5fa', textTransform: 'uppercase' }}>
        Copa do Mundo 2026
      </h2>

      <p style={{ marginBottom: '3rem', fontSize: '1.1rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '1rem', borderRadius: '8px' }}>
        Participantes com cadastro ativo podem enviar <strong>1 palpite por jogo</strong> e <strong>acumular pontos</strong> no ranking do seu respectivo grupo.
      </p>
      
      <section style={{ marginBottom: '3rem', backgroundColor: '#0F1849', color: 'white', padding: '2rem', borderRadius: '12px' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: '#2C67EA', textAlign: 'center' }}>Sistema de Pontuação</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            Acertou o placar exato do jogo → <strong style={{ color: '#4ade80', fontSize: '1.2rem' }}>+10 pontos</strong>
          </li>
          <li style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            Acertou apenas o vencedor da partida → <strong style={{ color: '#4ade80', fontSize: '1.2rem' }}>+3 pontos</strong>
          </li>
          <li style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            Acertou que o jogo terminaria empatado → <strong style={{ color: '#4ade80', fontSize: '1.2rem' }}>+3 pontos</strong>
          </li>
          <li style={{ marginBottom: '1rem' }}>
            Acertou apenas a quantidade de gols de uma das equipes → <strong style={{ color: '#4ade80', fontSize: '1.2rem' }}>+1 pontos</strong>
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#60a5fa' }}>Regras Gerais</h2>
        <ul style={{ listStylePosition: 'inside', opacity: 0.9, paddingLeft: '1rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>Apenas entregadores e colaboradores ativos podem participar;</li>
          <li style={{ marginBottom: '0.5rem' }}>Será permitido apenas 1 palpite por jogo por CPF cadastrado;</li>
          <li style={{ marginBottom: '0.5rem' }}>Os palpites devem ser enviados antes do início da partida;</li>
          <li style={{ marginBottom: '0.5rem' }}>Não será permitido alterar palpites após o fechamento.</li>
        </ul>
        <p style={{ marginTop: '1.5rem', fontWeight: 'bold' }}>
          Ao final da Copa, os participantes com maior pontuação nos seus respectivos rankings serão premiados.
        </p>
      </section>

      <section style={{ backgroundColor: '#fff', color: '#333', padding: '2rem', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#d97706' }}>🏆 Premiação: Entregadores</h2>
        <p style={{ opacity: 0.9, marginBottom: '1rem' }}>Os prêmios para os líderes do ranking dos <strong>Entregadores</strong> são gratuitos e bancados pela gerência.</p>
        <ul style={{ listStylePosition: 'inside', opacity: 0.9, fontWeight: 'bold', marginBottom: '2rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>1º Lugar: Surpresa a ser definida pela gerência</li>
          <li style={{ marginBottom: '0.5rem' }}>2º Lugar: Surpresa a ser definida pela gerência</li>
          <li>3º Lugar: Surpresa a ser definida pela gerência</li>
        </ul>

        {pool && (
          <div style={{ backgroundColor: '#f0fdf4', padding: '1.5rem', borderRadius: '8px', border: '1px solid #16a34a' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: '#16a34a' }}>💰 Premiação: Colaboradores</h2>
            <p style={{ opacity: 0.9, marginBottom: '1rem' }}>
              Bolão com taxa de inscrição de <strong>R$ {Number(pool.value_per_person).toFixed(2)}</strong>. Todo o valor arrecadado será distribuído entre os vencedores.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '1.5rem', marginBottom: '0.5rem' }}>🥇 1º Lugar</span>
                <strong style={{ fontSize: '1.2rem', color: '#d97706' }}>R$ {prize1.toFixed(2)}</strong>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>({pool.pct_1st}% do total)</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '1.5rem', marginBottom: '0.5rem' }}>🥈 2º Lugar</span>
                <strong style={{ fontSize: '1.2rem', color: '#94a3b8' }}>R$ {prize2.toFixed(2)}</strong>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>({pool.pct_2nd}% do total)</div>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '1.5rem', marginBottom: '0.5rem' }}>🥉 3º Lugar</span>
                <strong style={{ fontSize: '1.2rem', color: '#b45309' }}>R$ {prize3.toFixed(2)}</strong>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>({pool.pct_3rd}% do total)</div>
              </div>
            </div>
            
            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#333' }}>Prêmios do 4º ao 10º lugar:</p>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
              {[4,5,6,7,8,9,10].map(pos => {
                const prize = (pool as any)[`prize_${pos}th`];
                if (!prize) return null;
                return <li key={pos} style={{ backgroundColor: '#fff', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>🎁 {pos}º: {prize}</li>
              })}
            </ul>
          </div>
        )}
      </section>

    </div>
  );
}
