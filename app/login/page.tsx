"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Verificar se o email está liberado
    const { data: allowedData, error: allowedError } = await supabase
      .from('allowed_emails')
      .select('user_group')
      .eq('email', email)
      .single();

    if (allowedError || !allowedData) {
      setMessage('Desculpe, este E-mail não está autorizado pelo Administrador para participar do Bolão.');
      setLoading(false);
      return;
    }

    // Se estiver liberado, envia o Link Mágico
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(`Erro: ${error.message}`);
    } else {
      setMessage('Sucesso! Um Link Mágico foi enviado para o seu E-mail. Verifique sua caixa de entrada ou Spam para acessar o bolão.');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <Link href="/" style={{ color: '#2C67EA', marginBottom: '2rem' }}>← Voltar</Link>

      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', textAlign: 'center' }}>Identificação VIP</h1>
      <p style={{ marginBottom: '2rem', textAlign: 'center', opacity: 0.8, maxWidth: '400px' }}>
        Para participar, você deve inserir o seu e-mail corporativo cadastrado pela equipe de Gestão.
      </p>
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '300px' }}>
        <input 
          type="email" 
          placeholder="Seu E-mail Profissional" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '1rem', borderRadius: '8px', border: 'none', color: '#333', fontSize: '1rem', outline: 'none' }}
        />
        
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '1rem', backgroundColor: '#2C67EA', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}
        >
          {loading ? 'Verificando...' : 'Acessar Bolão'}
        </button>
      </form>

      {message && (
        <div style={{ marginTop: '2rem', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', maxWidth: '400px', lineHeight: '1.5' }}>
          {message}
        </div>
      )}
    </div>
  );
}
