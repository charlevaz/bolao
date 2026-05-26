"use client";

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const supabase = createClient();

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isLogin) {
      // FLUXO DE ENTRAR (LOGIN)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(`Erro ao entrar: ${error.message}. Verifique seu e-mail e senha.`);
        setLoading(false);
      } else {
        window.location.href = '/'; // Redireciona para a home
      }
      
    } else {
      // FLUXO DE CADASTRAR (SIGNUP)
      // 1. Verificar se o e-mail está autorizado pelo Admin
      const { data: allowedData, error: allowedError } = await supabase
        .from('allowed_emails')
        .select('user_group')
        .eq('email', email)
        .single();

      if (allowedError || !allowedData) {
        setMessage('Desculpe, este E-mail não está autorizado pelo Administrador.');
        setLoading(false);
        return;
      }

      // 2. Criar a conta de autenticação
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setMessage(`Erro no cadastro: ${authError.message}`);
        setLoading(false);
        return;
      }

      // 3. Criar o Perfil do usuário (já que agora ele tem um auth.user.id)
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: email,
            name: name,
            user_group: allowedData.user_group,
            role: 'user'
          });
        
        if (profileError && profileError.code !== '23505') { // ignora erro se já existir
          setMessage(`Conta criada, mas houve um erro ao criar o perfil: ${profileError.message}`);
        } else {
          setMessage('Cadastro realizado com sucesso! Você já pode participar do bolão.');
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        }
      }
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <Link href="/" style={{ color: '#2C67EA', marginBottom: '2rem' }}>← Voltar</Link>

      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', textAlign: 'center' }}>
        {isLogin ? 'Entrar no Bolão' : 'Criar Nova Senha'}
      </h1>
      <p style={{ marginBottom: '2rem', textAlign: 'center', opacity: 0.8, maxWidth: '400px' }}>
        {isLogin 
          ? 'Insira seu e-mail e senha cadastrados.' 
          : 'Seu e-mail já deve ter sido autorizado pela Gestão para você conseguir criar sua senha.'}
      </p>
      
      <form onSubmit={handleAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '300px' }}>
        {!isLogin && (
          <input 
            type="text" 
            placeholder="Seu Nome e Sobrenome" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ padding: '1rem', borderRadius: '8px', border: 'none', color: '#333', fontSize: '1rem', outline: 'none' }}
          />
        )}
        
        <input 
          type="email" 
          placeholder="E-mail" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '1rem', borderRadius: '8px', border: 'none', color: '#333', fontSize: '1rem', outline: 'none' }}
        />

        <input 
          type="password" 
          placeholder="Senha" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '1rem', borderRadius: '8px', border: 'none', color: '#333', fontSize: '1rem', outline: 'none' }}
        />
        
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '1rem', backgroundColor: '#2C67EA', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '0.5rem' }}
        >
          {loading ? 'Aguarde...' : (isLogin ? 'Entrar' : 'Cadastrar e Entrar')}
        </button>
      </form>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button 
          onClick={() => { setIsLogin(!isLogin); setMessage(''); }}
          style={{ background: 'none', border: 'none', color: '#2C67EA', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {isLogin ? 'Ainda não tem senha? Cadastre-se aqui' : 'Já tem uma senha? Faça login'}
        </button>
      </div>

      {message && (
        <div style={{ marginTop: '2rem', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', maxWidth: '400px', lineHeight: '1.5' }}>
          {message}
        </div>
      )}
    </div>
  );
}
