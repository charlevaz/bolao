"use client";

import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTheme } from '@/utils/theme';

export default function Login() {
  const supabase = createClient();
  const router = useRouter();
  const theme = getTheme();

  const [checking, setChecking] = useState(true);
  const [view, setView] = useState<'sign_in' | 'sign_up'>('sign_in');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [documentVal, setDocumentVal] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/');
      }
    });

    // Checar se já está logado
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/');
      } else {
        setChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);

  const translateAuthError = (message: string): string => {
    const msg = message.toLowerCase();
    if (msg.includes('database error saving new user') || msg.includes('database error') || msg.includes('acesso negado')) {
      return `Acesso Negado: Seu ${theme.documentType} ou E-mail não está autorizado pela Gestão.`;
    }
    if (msg.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('user already registered')) return 'Este e-mail já está cadastrado.';
    if (msg.includes('email not confirmed')) return 'Por favor, confirme seu e-mail.';
    if (msg.includes('password should be at least 6 characters')) return 'A senha deve ter pelo menos 6 caracteres.';
    if (msg.includes('signup requires a valid email')) return 'Por favor, insira um e-mail válido.';
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (view === 'sign_up') {
      if (!documentVal && theme.id === 'barbearia') {
        setErrorMsg(`Por favor, insira o seu ${theme.documentType}. Ele é obrigatório para liberar o seu acesso.`);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            document: documentVal // Envia o documento (Celular) para o banco validar
          }
        }
      });
      
      if (error) {
        setErrorMsg(translateAuthError(error.message));
      } else if (data?.user && data?.session === null) {
        setSuccessMsg('Conta criada com sucesso! Verifique sua caixa de entrada para confirmar o e-mail.');
        setEmail('');
        setPassword('');
        setDocumentVal('');
        setView('sign_in');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        setErrorMsg(translateAuthError(error.message));
      } else if (data.session) {
        window.location.href = '/dashboard';
        return; // não desativa o loading
      }
    }
    setLoading(false);
  };

  if (checking) return <div style={{ padding: '4rem', textAlign: 'center' }}>Carregando...</div>;

  return (
    <div style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <Link href="/" style={{ color: '#2C67EA', marginBottom: '2rem' }}>← Voltar para Home</Link>

      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '2rem', borderRadius: '12px', color: '#333', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', textAlign: 'center', color: '#0F1849' }}>
          Identificação VIP
        </h1>
        <p style={{ textAlign: 'center', fontSize: '0.9rem', marginBottom: '1.5rem', color: '#666' }}>
          {view === 'sign_in' ? 'Faça login para acessar o bolão.' : `Apenas clientes convidados. Informe seu ${theme.documentType} para validação.`}
        </p>

        <div style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
          Ao continuar, você declara que leu e concorda com os <Link href="/privacidade" style={{ color: theme.primaryColor, textDecoration: 'underline', fontWeight: 'bold' }}>Termos de Uso e LGPD</Link>.
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0' }}>
          <button 
            type="button"
            onClick={() => { setView('sign_in'); setErrorMsg(''); setSuccessMsg(''); }}
            style={{ 
              flex: 1, 
              padding: '0.8rem', 
              background: 'none', 
              border: 'none', 
              borderBottom: view === 'sign_in' ? `3px solid ${theme.primaryColor}` : '3px solid transparent',
              color: view === 'sign_in' ? theme.primaryColor : '#64748b',
              fontWeight: view === 'sign_in' ? 'bold' : 'normal',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}>
            Entrar
          </button>
          <button 
            type="button"
            onClick={() => { setView('sign_up'); setErrorMsg(''); setSuccessMsg(''); }}
            style={{ 
              flex: 1, 
              padding: '0.8rem', 
              background: 'none', 
              border: 'none', 
              borderBottom: view === 'sign_up' ? `3px solid ${theme.primaryColor}` : '3px solid transparent',
              color: view === 'sign_up' ? theme.primaryColor : '#64748b',
              fontWeight: view === 'sign_up' ? 'bold' : 'normal',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 0.2s'
            }}>
            Cadastrar
          </button>
        </div>

        {errorMsg && (
          <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.4rem', color: '#475569' }}>E-mail</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.4rem', color: '#475569' }}>Senha</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
            />
          </div>

          {view === 'sign_up' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.4rem', color: '#475569' }}>
                {theme.documentType} (Chave de Autorização)
              </label>
              <input 
                type="text" 
                required={theme.id === 'barbearia'}
                value={documentVal}
                onChange={e => setDocumentVal(e.target.value)}
                placeholder={theme.id === 'barbearia' ? "(11) 99999-9999" : "Opcional"}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '1rem',
              padding: '1rem', 
              backgroundColor: theme.primaryColor, 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '1rem', 
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Aguarde...' : (view === 'sign_in' ? 'Entrar' : 'Criar Conta')}
          </button>
        </form>

      </div>
    </div>
  );
}
