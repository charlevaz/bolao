import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getTheme } from '@/utils/theme';

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  const theme = getTheme();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', backgroundColor: theme.backgroundColor, color: '#FFFFFF' }}>
      
      {/* Logotipos */}
      <div style={{ 
        display: 'flex', 
        gap: '1.5rem', 
        marginBottom: '2rem', 
        flexWrap: 'wrap', 
        justifyContent: 'center'
      }}>
        {theme.logos.map((logo, idx) => (
          <img key={idx} src={logo} alt={theme.appName} style={{ height: '80px', width: '80px', borderRadius: '12px', objectFit: 'cover' }} />
        ))}
      </div>

      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' }}>
        {theme.homeTitlePrefix} <span style={{ color: theme.highlightColor }}>{theme.homeTitleHighlight}</span>
      </h1>
      
      <p style={{ fontSize: '1.2rem', marginBottom: '3rem', textAlign: 'center', maxWidth: '600px', opacity: 0.9 }}>
        {theme.homeSubtitle}
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', width: '100%', maxWidth: '300px' }}>
        <Link href="/login" style={{ 
          backgroundColor: theme.buttonColor, 
          color: theme.id === 'barbearia' ? '#000' : '#FFFFFF', 
          border: 'none', 
          padding: '1rem', 
          borderRadius: '8px', 
          fontSize: '1.1rem', 
          fontWeight: 'bold', 
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          textAlign: 'center',
          textDecoration: 'none'
        }}>
          Entrar / Cadastrar
        </Link>
        <Link href="/regras" style={{ 
          backgroundColor: 'transparent', 
          color: '#FFFFFF', 
          border: `2px solid ${theme.buttonColor}`, 
          padding: '1rem', 
          borderRadius: '8px', 
          fontSize: '1.1rem', 
          fontWeight: 'bold', 
          cursor: 'pointer',
          textAlign: 'center',
          textDecoration: 'none'
        }}>
          Ver Regras e Prêmios
        </Link>
      </div>

      <div style={{ marginTop: '4rem' }}>
        <Link href="/admin" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem', textDecoration: 'none' }}>Acesso Restrito</Link>
      </div>

    </div>
  );
}
