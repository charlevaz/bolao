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
  
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // 1. Verificar se existe erro no hash fragment (ex: otp_expired)
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const errorCode = hashParams.get('error_code');
      const errorDesc = hashParams.get('error_description');
      
      if (errorCode === 'otp_expired' || errorDesc?.toLowerCase().includes('expired') || errorDesc?.toLowerCase().includes('invalid')) {
        setError('O link de recuperação de senha expirou ou já foi utilizado. Por favor, solicite a redefinição de senha novamente na tela de login.');
        setIsCheckingSession(false);
        return;
      } else if (errorDesc) {
        setError(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
        setIsCheckingSession(false);
        return;
      }
    }

    // 2. Verificar se existe um code na URL (PKCE) e trocar por sessão
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

      supabase.auth.exchangeCodeForSession(code)
        .then(({ data, error }) => {
          if (error) {
            setError(`Erro ao autenticar código: ${error.message}`);
          } else {
            setHasSession(true);
            setMessage('Autenticado com sucesso. Digite sua nova senha abaixo.');
            // Remove o código da URL para limpar
            router.replace('/reset-password');
          }
        })
        .catch(err => {
          setError(`Erro na troca de código: ${err.message || err}`);
        })
        .finally(() => {
          setIsCheckingSession(false);
        });
      return;
    }

    // 3. Verificar se já existe uma sessão ativa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
        setMessage('Sessão de recuperação ativa. Digite sua nova senha abaixo.');
      } else {
        setError('Acesso inválido ou sessão expirada. Por favor, solicite a redefinição de senha na tela de login.');
      }
      setIsCheckingSession(false);
    });

    // 4. Escutar alterações no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setHasSession(true);
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

        {error && <div style={{ color: 'white', backgroundColor: '#ef4444', padding: '0.8rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}
        {message && <div style={{ color: '#047857', backgroundColor: '#d1fae5', padding: '0.8rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{message}</div>}

        {isCheckingSession ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>Validando sua sessão de recuperação...</div>
        ) : hasSession ? (
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
        ) : (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link href="/login" style={{ display: 'inline-block', backgroundColor: '#2C67EA', color: 'white', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }}>
              Solicitar Novo Link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
