import Link from 'next/link';
import { getTheme } from '@/utils/theme';

export default function Regras() {
  const theme = getTheme();

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6', color: '#fff' }}>
      <Link href="/" style={{ color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa', marginBottom: '2rem', display: 'inline-block' }}>← Voltar para a Home</Link>
      
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#fff', fontWeight: '900', textTransform: 'uppercase', textAlign: 'center' }}>
        {theme.homeTitlePrefix} <span style={{ color: theme.highlightColor }}>{theme.homeTitleHighlight}</span>
      </h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa', textTransform: 'uppercase', textAlign: 'center' }}>
        Copa do Mundo 2026
      </h2>

      <p style={{ marginBottom: '2rem', fontSize: '1.2rem', textAlign: 'center' }}>
        <strong>{theme.rules?.description}</strong>
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        <section style={{ backgroundColor: theme.primaryColor, border: `1px solid ${theme.secondaryColor}`, padding: '2rem', borderRadius: '16px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa', textAlign: 'center' }}>Sistema de Pontuação</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
              Acertou o placar exato do jogo → <strong style={{ color: '#4ade80' }}>+10</strong>
            </li>
            <li style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
              Acertou apenas o vencedor da partida → <strong style={{ color: '#4ade80' }}>+3</strong>
            </li>
            <li style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
              Acertou que o jogo terminaria empatado → <strong style={{ color: '#4ade80' }}>+3</strong>
            </li>
            <li>
              Acertou apenas a quantidade de gols de uma das equipes → <strong style={{ color: '#4ade80' }}>+1</strong>
            </li>
          </ul>
        </section>

        <section style={{ backgroundColor: theme.primaryColor, border: `1px solid ${theme.secondaryColor}`, padding: '2rem', borderRadius: '16px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa', textAlign: 'center' }}>Prêmios</h2>
          <ul style={{ listStyle: 'none', padding: 0, fontWeight: 'bold' }}>
            {theme.rules?.prizes.map((prize, index) => (
              <li key={index} style={{ marginBottom: '0.5rem', color: prize.color }}>
                {prize.position} {prize.description}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: theme.id === 'barbearia' ? theme.secondaryColor : '#60a5fa' }}>Regras Gerais</h2>
        <ul style={{ listStylePosition: 'inside', opacity: 0.9, paddingLeft: '1rem', lineHeight: '1.8' }}>
          {theme.rules?.generalRules.map((rule, index) => (
            <li key={index}>{rule}</li>
          ))}
        </ul>
        <p style={{ marginTop: '1.5rem', opacity: 0.9 }}>
          {theme.rules?.footer}
        </p>
      </section>

    </div>
  );
}
