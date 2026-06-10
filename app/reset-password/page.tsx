"use client";

import { createClient } from '@/utils/supabase/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPassword() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // 1. Verificar se já existe uma sessão ativa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setMessage('Sessão de recuperação ativa. Digite sua nova senha abaixo.');
      }
    });

    // 2. Verificar se existe um code na URL e trocar por sessão (caso caia direto aqui)
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      // Corrige cookies do PKCE se necessário
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.endsWith('-code-verifier')) {
          document.cookie = `${key}=${window.localStorage.getItem(key)}; path=/; max-age=3600; SameSite=Lax`;
        }
      }

      // Faz a troca do código por sessão de forma explícita
      setIsUpdating(true);
      supabase.auth.exchangeCodeForSession(code)
        .then(({ data, error }) => {
          if (error) {
            setError(`Erro ao autenticar código: ${error.message}`);
          } else {
            setMessage('Autenticado com sucesso. Digite sua nova senha abaixo.');
            // Remove o código da URL para limpar a barra de endereços
            router.replace('/reset-password');
          }
        })
        .catch(err => {
          setError(`Erro na troca de código: ${err.message || err}`);
        })
        .finally(() => {
          setIsUpdating(false);
        });
    }

    // 3. Escuta eventos de alteração de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setMessage('Autenticado com sucesso. Digite sua nova senha abaixo.');
        setError('');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError('');
    setMessage('');

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setError(`Erro ao atualizar senha: ${error.message}`);
      setIsUpdating(false);
    } else {
      setMessage('Senha atualizada com sucesso! Redirecionando para o painel...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    }
  };

  return (
    <div style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <Link href="/login" style={{ color: '#2C67EA', marginBottom: '2rem' }}>← Voltar para o Login</Link>

      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '2rem', borderRadius: '8px', color: '#333', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'center', color: '#0F1849' }}>
          Redefinir Senha
        </h1>

        {error && <div style={{ color: 'white', backgroundColor: '#ef4444', padding: '0.8rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
        {message && <div style={{ color: '#047857', backgroundColor: '#d1fae5', padding: '0.8rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>{message}</div>}

        <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Nova Senha</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="Digite sua nova senha"
              style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={isUpdating || !password}
            style={{ 
              width: '100%', 
              padding: '0.8rem', 
              backgroundColor: '#2C67EA', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '1rem', 
              fontWeight: 'bold',
              cursor: isUpdating ? 'not-allowed' : 'pointer',
              opacity: isUpdating ? 0.7 : 1
            }}
          >
            {isUpdating ? 'Atualizando...' : 'Atualizar Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
