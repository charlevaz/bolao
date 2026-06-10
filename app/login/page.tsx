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
  const [isPrecadastro, setIsPrecadastro] = useState(false);

  useEffect(() => {
    // 1. Ler mensagens de erro da URL e hash fragment (caso de link expirado do Supabase)
    const params = new URLSearchParams(window.location.search);
    const messageParam = params.get('message');
    if (messageParam) {
      setErrorMsg(messageParam);
    }

    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const errorCode = hashParams.get('error_code');
      const errorDesc = hashParams.get('error_description');
      
      if (errorCode === 'otp_expired' || errorDesc?.toLowerCase().includes('expired') || errorDesc?.toLowerCase().includes('invalid')) {
        setErrorMsg('O link de recuperação de senha expirou ou já foi utilizado. Por favor, solicite a redefinição novamente.');
      } else if (errorDesc) {
        setErrorMsg(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
      }
    }

    // 2. Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('user_group').eq('id', session.user.id).single();
        if (profile?.user_group === 'pendente') {
          setIsPrecadastro(true);
          await supabase.auth.signOut();
        } else if (event === 'SIGNED_IN') {
          router.push('/');
        }
      }
    });

    // 3. Checar se já está logado
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('user_group').eq('id', session.user.id).single();
        if (profile?.user_group === 'pendente') {
          setIsPrecadastro(true);
          await supabase.auth.signOut();
          setChecking(false);
        } else {
          router.push('/');
        }
      } else {
        setChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  const translateAuthError = (message: string): string => {
    const msg = message.toLowerCase();
    // Erros vindos do trigger do banco de dados (Supabase encapsula com prefixo)
    if (message.includes('A chave informada')) {
      // Remove prefixo do Supabase Auth para mostrar a mensagem do trigger limpa
      return message.replace(/^.*?: /, '');
    }
    if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) return 'E-mail ou senha inválidos.';
    if (msg.includes('email not confirmed')) return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
    if (msg.includes('user already registered')) return 'Este e-mail já está cadastrado. Tente fazer login.';
    if (msg.includes('password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
    if (msg.includes('signup requires a valid email')) return 'Por favor, insira um e-mail válido.';
    if (msg.includes('database error') || msg.includes('unexpected_failure')) return 'Erro ao processar o seu cadastro. Verifique os dados e tente novamente.';
    return message;
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg('Por favor, digite seu e-mail no campo acima para redefinir a senha.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const result = await res.json();
      
      if (!res.ok || !result.success) {
        setErrorMsg(result.error || 'Erro ao enviar e-mail de recuperação.');
      } else {
        setSuccessMsg('Enviamos um e-mail com as instruções para redefinir sua senha. Verifique sua caixa de entrada e spam.');
      }
    } catch (err: any) {
      setErrorMsg('Erro de conexão. Tente novamente.');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (view === 'sign_up') {
      const cleanDoc = documentVal ? documentVal.replace(/\D/g, '') : '';
      if (!cleanDoc) {
        setErrorMsg(`Por favor, insira o seu ${theme.documentType}. Ele é obrigatório para liberar o seu acesso.`);
        setLoading(false);
        return;
      }
      
      // Validação prévia para evitar que o erro seja mascarado pelo Supabase Auth
      if (cleanDoc) {
        const { data: maskedEmail } = await supabase.rpc('check_existing_cpf', { p_cpf: cleanDoc, p_email: email });
        if (maskedEmail && typeof maskedEmail === 'string') {
          setErrorMsg(`A chave informada já está vinculada ao e-mail ${maskedEmail}. Por favor, faça login com ele.`);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            document: documentVal
          }
        }
      });
      
      if (error) {
        const translated = translateAuthError(error.message);
        // Se o erro for "database error" genérico, significa que o trigger falhou
        // O usuário será informado que o pré-cadastro foi registrado
        if (error.message.toLowerCase().includes('database error') || error.message.toLowerCase().includes('unexpected_failure')) {
          setIsPrecadastro(true);
          setErrorMsg('');
        } else {
          setErrorMsg(translated);
        }
      } else if (data?.user) {
        if (data.session) {
          const { data: profile } = await supabase.from('profiles').select('user_group').eq('id', data.user.id).single();
          if (profile?.user_group === 'pendente') {
            setIsPrecadastro(true);
            setEmail('');
            setPassword('');
            setDocumentVal('');
            await supabase.auth.signOut();
          } else {
            window.location.href = '/dashboard';
            return;
          }
        } else {
          setIsPrecadastro(true);
          setEmail('');
          setPassword('');
          setDocumentVal('');
          setView('sign_in');
        }
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

        {isPrecadastro && (
          <div style={{ padding: '1.2rem', backgroundColor: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', color: '#92400e' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
            <strong>Seu e-mail não está na lista de acesso.</strong><br/><br/>
            Seus dados foram encaminhados para análise. Caso você seja um {theme.id === 'barbearia' ? 'parceiro ativo' : 'entregador autônomo parceiro ativo'}, <strong>você receberá um e-mail com o retorno da gestão assim que seu cadastro for avaliado.</strong>
            <br/><br/>
            <span style={{ fontSize: '0.85rem' }}>Dúvidas? Fale pelo <a href="https://wa.me/5511917050962" target="_blank" style={{ color: '#16a34a', fontWeight: 'bold' }}>WhatsApp</a></span>
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
            {view === 'sign_in' && (
              <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                <button type="button" onClick={handleResetPassword} style={{ background: 'none', border: 'none', color: theme.primaryColor, fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>
                  Esqueci minha senha
                </button>
              </div>
            )}
          </div>

          {view === 'sign_up' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.4rem', color: '#475569' }}>
                {theme.documentType} (Chave de Autorização)
              </label>
              <input 
                type="text" 
                required={true}
                value={documentVal}
                onChange={e => setDocumentVal(e.target.value)}
                placeholder="000.000.000-00"
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
