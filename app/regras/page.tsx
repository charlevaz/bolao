import Link from 'next/link';

export default function Regras() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
      <Link href="/" style={{ color: '#2C67EA', marginBottom: '2rem', display: 'inline-block' }}>← Voltar para a Home</Link>
      
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#0F1849', fontWeight: '900', textTransform: 'uppercase' }}>
        Bolão EntreGô Sumarezinho
      </h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', color: '#2C67EA', textTransform: 'uppercase' }}>
        Copa do Mundo 2026
      </h2>

      <p style={{ marginBottom: '3rem', fontSize: '1.1rem', backgroundColor: 'rgba(44, 103, 234, 0.1)', padding: '1rem', borderRadius: '8px' }}>
        Cada entregador com cadastro ativo na <strong>EntreGô Sumarezinho</strong> pode enviar <strong>1 palpite por jogo</strong> e <strong>acumular pontos</strong> no ranking geral.
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
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#0F1849' }}>Regras Gerais</h2>
        <ul style={{ listStylePosition: 'inside', opacity: 0.9, paddingLeft: '1rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>Apenas entregadores ativos poderão participar;</li>
          <li style={{ marginBottom: '0.5rem' }}>Será permitido apenas 1 palpite por jogo por E-mail cadastrado;</li>
          <li style={{ marginBottom: '0.5rem' }}>Os palpites devem ser enviados antes do início da partida;</li>
          <li style={{ marginBottom: '0.5rem' }}>Não será permitido alterar palpites após o fechamento.</li>
        </ul>
        <p style={{ marginTop: '1.5rem', fontWeight: 'bold', color: '#333' }}>
          Ao final da Copa, os entregadores com maior pontuação no ranking geral serão premiados.
        </p>
      </section>

      <section style={{ backgroundColor: '#f9f9fa', padding: '2rem', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#d97706' }}>🏆 Premiação</h2>
        <p style={{ opacity: 0.9, marginBottom: '1rem' }}>Os prêmios serão distribuídos separadamente para os líderes do grupo dos <strong>Entregadores</strong> e do grupo dos <strong>Colaboradores</strong>.</p>
        <ul style={{ listStylePosition: 'inside', opacity: 0.9, fontWeight: 'bold' }}>
          <li style={{ marginBottom: '0.5rem' }}>1º Lugar: Surpresa a ser definida pela gerência</li>
          <li style={{ marginBottom: '0.5rem' }}>2º Lugar: Surpresa a ser definida pela gerência</li>
          <li>3º Lugar: Surpresa a ser definida pela gerência</li>
        </ul>
      </section>

    </div>
  );
}
