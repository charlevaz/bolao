import Link from 'next/link';

export default function Regras() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
      <Link href="/" style={{ color: '#2C67EA', marginBottom: '2rem', display: 'inline-block' }}>← Voltar para a Home</Link>
      
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: '#2C67EA' }}>Regras e Prêmios</h1>
      
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Como funciona a Pontuação?</h2>
        <ul style={{ listStylePosition: 'inside', opacity: 0.9 }}>
          <li style={{ marginBottom: '0.5rem' }}><strong>5 Pontos:</strong> Acerto exato do placar (Ex: apostou 2x1 e o jogo foi 2x1).</li>
          <li style={{ marginBottom: '0.5rem' }}><strong>3 Pontos:</strong> Acertou o vencedor e a diferença de gols (Ex: apostou 2x0 e o jogo foi 3x1).</li>
          <li style={{ marginBottom: '0.5rem' }}><strong>2 Pontos:</strong> Acertou apenas quem venceu ou acertou que seria empate (sem acertar o placar exato).</li>
          <li><strong>0 Pontos:</strong> Errou o resultado da partida.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Critérios de Desempate</h2>
        <ol style={{ listStylePosition: 'inside', opacity: 0.9 }}>
          <li style={{ marginBottom: '0.5rem' }}>Maior número de placares exatos (cravadas).</li>
          <li style={{ marginBottom: '0.5rem' }}>Maior número de acertos de time vencedor.</li>
          <li>Data e hora do cadastro no sistema (quem chegou primeiro leva vantagem).</li>
        </ol>
      </section>

      <section style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#ffd700' }}>🏆 Premiação</h2>
        <p style={{ opacity: 0.9, marginBottom: '1rem' }}>Os prêmios serão distribuídos separadamente para os líderes do grupo dos <strong>Entregadores</strong> e do grupo dos <strong>Colaboradores</strong>.</p>
        <ul style={{ listStylePosition: 'inside', opacity: 0.9 }}>
          <li style={{ marginBottom: '0.5rem' }}><strong>1º Lugar:</strong> [Prêmio a ser definido pela gerência]</li>
          <li style={{ marginBottom: '0.5rem' }}><strong>2º Lugar:</strong> [Prêmio a ser definido pela gerência]</li>
          <li><strong>3º Lugar:</strong> [Prêmio a ser definido pela gerência]</li>
        </ul>
      </section>

    </div>
  );
}
