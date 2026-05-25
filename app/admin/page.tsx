"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function AdminPanel() {
  const [emailToAdd, setEmailToAdd] = useState('');
  const [group, setGroup] = useState('entregador');
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setChecking(false);
        return;
      }
      
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (data?.role === 'admin') {
        setIsAdmin(true);
      }
      setChecking(false);
    }
    checkAdmin();
  }, []);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Adicionando...');
    
    const { error } = await supabase
      .from('allowed_emails')
      .insert([{ email: emailToAdd, user_group: group }]);
      
    if (error) {
      setMessage(`Erro: ${error.message}`);
    } else {
      setMessage(`E-mail ${emailToAdd} autorizado com sucesso como ${group}!`);
      setEmailToAdd('');
    }
  };

  if (checking) return <div style={{ padding: '2rem', textAlign: 'center' }}>Verificando credenciais...</div>;

  if (!isAdmin) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h1 style={{ color: '#ff4444', marginBottom: '1rem' }}>Acesso Negado</h1>
        <p>Apenas administradores podem acessar esta página.</p>
        <Link href="/" style={{ display: 'inline-block', marginTop: '2rem', color: '#2C67EA' }}>Voltar para a Home</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <Link href="/" style={{ color: '#2C67EA', marginBottom: '2rem', display: 'inline-block' }}>← Voltar para a Home</Link>
      
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Painel do Administrador</h1>
      
      <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Autorizar Novo Participante</h2>
        <form onSubmit={handleAddEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>E-mail do Participante</label>
            <input 
              type="email" 
              value={emailToAdd}
              onChange={(e) => setEmailToAdd(e.target.value)}
              required
              style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: 'none', color: '#333' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Grupo do Bolão</label>
            <select 
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: 'none', color: '#333' }}
            >
              <option value="entregador">Entregadores</option>
              <option value="colaborador">Colaboradores</option>
            </select>
          </div>
          
          <button type="submit" style={{ padding: '1rem', backgroundColor: '#2C67EA', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '1rem' }}>
            Autorizar E-mail
          </button>
        </form>
        
        {message && <div style={{ marginTop: '1rem', color: '#4ade80' }}>{message}</div>}
      </div>

      <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Gestão de Jogos</h2>
        <p style={{ opacity: 0.8 }}>A área de cadastro e atualização de placares das partidas será liberada na próxima atualização!</p>
      </div>

    </div>
  );
}
