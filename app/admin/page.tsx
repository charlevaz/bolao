"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function AdminPanel() {
  // Emails State
  const [emailToAdd, setEmailToAdd] = useState('');
  const [group, setGroup] = useState('entregador');
  const [message, setMessage] = useState('');
  const [allowedEmails, setAllowedEmails] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [translations, setTranslations] = useState<any[]>([]);
  
  // CSV Upload State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvMessage, setCsvMessage] = useState('');
  
  // Match Management State
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [flagA, setFlagA] = useState('un');
  const [flagB, setFlagB] = useState('un');
  const [matchDate, setMatchDate] = useState('');
  const [matchMessage, setMatchMessage] = useState('');
  
  // Matches List
  const [matches, setMatches] = useState<any[]>([]);
  const [scores, setScores] = useState<{[key: string]: {a: string, b: string}}>({});

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
        loadMatches();
        loadEmails();
        loadProfiles();
        loadTranslations();
      }
      setChecking(false);
    }
    checkAdmin();
  }, []);

  const loadTranslations = async () => {
    let { data } = await supabase.from('team_translations').select('*').order('api_name', { ascending: true });
    
    // Se o dicionário estiver vazio, vamos tentar puxar dos jogos que já estão no banco!
    if (!data || data.length === 0) {
      const { data: matchesData } = await supabase.from('matches').select('team_a, team_b');
      if (matchesData && matchesData.length > 0) {
        const uniqueTeams = new Set<string>();
        matchesData.forEach((m: any) => {
          if (m.team_a) uniqueTeams.add(m.team_a);
          if (m.team_b) uniqueTeams.add(m.team_b);
        });
        
        const newTranslations = Array.from(uniqueTeams).map(team => ({
          api_name: team,
          pt_name: team,
          flag_code: 'un'
        }));
        
        if (newTranslations.length > 0) {
          await supabase.from('team_translations').upsert(newTranslations, { onConflict: 'api_name', ignoreDuplicates: true });
          const { data: newData } = await supabase.from('team_translations').select('*').order('api_name', { ascending: true });
          if (newData) data = newData;
        }
      }
    }
    
    if (data) setTranslations(data);
  };

  const loadProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('points', { ascending: false });
    if (data) setProfiles(data);
  };

  const handleToggleAdmin = async (id: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const confirmed = window.confirm(`Deseja alterar o usuário para ${newRole}?`);
    if (!confirmed) return;

    await supabase.from('profiles').update({ role: newRole }).eq('id', id);
    loadProfiles();
  };

  const loadMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: true });
    
    if (data) {
      setMatches(data);
      const initialScores: any = {};
      data.forEach(m => {
        initialScores[m.id] = { a: '', b: '' };
      });
      setScores(initialScores);
    }
  };

  const loadEmails = async () => {
    const { data } = await supabase
      .from('allowed_emails')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAllowedEmails(data);
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Adicionando...');
    
    const { error } = await supabase
      .from('allowed_emails')
      .insert([{ email: emailToAdd, user_group: group }]);
      
    if (error) {
      setMessage(`Erro: ${error.message}`);
    } else {
      setMessage(`E-mail autorizado com sucesso!`);
      setEmailToAdd('');
      loadEmails();
    }
  };

  const handleDeleteEmail = async (id: string, email: string) => {
    const confirmed = window.confirm(`Certeza que deseja remover a autorização de ${email}?`);
    if (!confirmed) return;

    await supabase.from('allowed_emails').delete().eq('id', id);
    loadEmails();
  };

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;

    setCsvMessage('Lendo planilha...');
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      const toInsert = lines.map(line => {
        const parts = line.split(',');
        const email = parts[0]?.trim();
        let userGroup = parts[1]?.trim().toLowerCase();
        
        if (userGroup !== 'entregador' && userGroup !== 'colaborador') {
          userGroup = 'colaborador';
        }

        return { email, user_group: userGroup };
      }).filter(item => item.email && item.email.includes('@'));

      const { error } = await supabase.from('allowed_emails').insert(toInsert);
      
      if (error) {
        setCsvMessage(`Erro: ${error.message}`);
      } else {
        setCsvMessage(`🎉 ${toInsert.length} e-mails cadastrados!`);
        setCsvFile(null);
        loadEmails();
      }
    };
    reader.readAsText(csvFile);
  };

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMatchMessage('Salvando...');
    
    const { error } = await supabase
      .from('matches')
      .insert([{
        team_a: teamA,
        team_b: teamB,
        flag_a: flagA,
        flag_b: flagB,
        match_date: new Date(matchDate).toISOString(),
        status: 'pending'
      }]);
      
    if (error) {
      setMatchMessage(`Erro: ${error.message}`);
    } else {
      setMatchMessage(`Jogo cadastrado com sucesso!`);
      setTeamA(''); setTeamB(''); setMatchDate('');
      loadMatches();
    }
  };

  const handleDeleteMatch = async (id: string) => {
    const confirmed = window.confirm("Excluir este jogo permanentemente?");
    if (!confirmed) return;
    await supabase.from('matches').delete().eq('id', id);
    loadMatches();
  };

  const handleDownloadAudit = async () => {
    setMatchMessage('Gerando planilha de auditoria...');
    try {
      const { data, error } = await supabase
        .from('guesses')
        .select(`
          guess_score_a,
          guess_score_b,
          points_earned,
          created_at,
          profiles (name, email, user_group),
          matches (team_a, team_b, match_date, score_a, score_b)
        `);
      
      if (error) {
        setMatchMessage(`Erro ao baixar: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        setMatchMessage('Nenhum palpite foi feito ainda.');
        return;
      }

      const headers = ["Nome", "E-mail", "Grupo", "Data do Jogo", "Jogo", "Palpite A", "Palpite B", "Placar Real", "Pontos Ganhos", "Data e Hora do Palpite"];
      const rows = data.map((g: any) => [
        `"${g.profiles?.name || 'Desconhecido'}"`,
        `"${g.profiles?.email || ''}"`,
        `"${g.profiles?.user_group || ''}"`,
        `"${g.matches?.match_date ? new Date(g.matches.match_date).toLocaleDateString('pt-BR') : ''}"`,
        `"${g.matches?.team_a} x ${g.matches?.team_b}"`,
        g.guess_score_a,
        g.guess_score_b,
        g.matches?.score_a !== null ? `"${g.matches?.score_a} x ${g.matches?.score_b}"` : '"Pendente"',
        g.points_earned,
        `"${new Date(g.created_at).toLocaleString('pt-BR')}"`
      ]);

      const csvContent = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
      
      // Criar o arquivo e baixar automaticamente (bom suporte para Excel em português)
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `auditoria_palpites_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMatchMessage('Planilha gerada com sucesso!');
    } catch (err: any) {
      setMatchMessage(`Erro na exportação: ${err.message}`);
    }
  };

  const handleSyncApi = async () => {
    const confirmed = window.confirm("Isso vai buscar todos os 104 jogos oficiais da Copa do Mundo 2026. Continuar?");
    if (!confirmed) return;
    
    setMatchMessage('Baixando Tabela da Copa 2026...');
    try {
      const res = await fetch('/api/sync-matches');
      const data = await res.json();
      
      if (data.error) {
        setMatchMessage(`Erro: ${data.error}`);
        return;
      }

      setMatchMessage(`Processando ${data.matches.length} jogos...`);
      
      // 1. Extrair seleções únicas para o Dicionário
      const uniqueTeams = new Set<string>();
      data.matches.forEach((m: any) => {
        uniqueTeams.add(m.team_a);
        uniqueTeams.add(m.team_b);
      });
      
      const newTranslations = Array.from(uniqueTeams).map(team => ({
        api_name: team,
        pt_name: team,
        flag_code: 'un'
      }));

      // 2. Inserir no Dicionário ignorando os que já existem (upsert na mão)
      await supabase.from('team_translations').upsert(newTranslations, { onConflict: 'api_name', ignoreDuplicates: true });
      loadTranslations();

      // 3. Salvar os jogos
      const { error } = await supabase.from('matches').insert(data.matches);
      
      if (error) {
        setMatchMessage(`Erro ao salvar jogos: ${error.message}`);
      } else {
        setMatchMessage(`🎉 Sincronização concluída! ${data.matches.length} jogos e traduções importados com sucesso!`);
        loadMatches();
      }
    } catch (err: any) {
      setMatchMessage(`Erro de conexão: ${err.message}`);
    }
  };

  const handleClearAll = async () => {
    const confirmed = window.confirm("CUIDADO: Isso vai excluir TODOS os jogos e palpites do sistema. Tem certeza?");
    if (!confirmed) return;
    setMatchMessage('Excluindo banco de dados...');
    await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setMatchMessage('Todos os jogos foram apagados!');
    loadMatches();
  };

  const handleFinishMatch = async (matchId: string) => {
    const scoreA = scores[matchId]?.a;
    const scoreB = scores[matchId]?.b;
    
    if (scoreA === '' || scoreB === '') {
      alert("Digite o placar completo antes de finalizar!");
      return;
    }

    const confirmAction = window.confirm(`Isso vai encerrar o jogo e dar os pontos. Confirmar?`);
    if (!confirmAction) return;

    const { error } = await supabase.rpc('finish_match', {
      p_match_id: matchId,
      p_real_score_a: parseInt(scoreA),
      p_real_score_b: parseInt(scoreB)
    });

    if (error) {
      alert(`Erro ao finalizar jogo: ${error.message}`);
    } else {
      alert("Pontos calculados e distribuídos com sucesso!");
      loadMatches();
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
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', color: '#333' }}>
      <Link href="/" style={{ color: '#2C67EA', marginBottom: '1rem', display: 'inline-block' }}>← Voltar para a Home</Link>
      
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#fff' }}>Painel do Administrador</h1>
      
      {/* SEÇÃO USUÁRIOS E PERMISSÕES */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#0F1849', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem' }}>👑 Gestão de Usuários (Tornar Admin)</h2>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px' }}>
          {profiles.map(user => (
            <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #eee', backgroundColor: user.role === 'admin' ? '#eff6ff' : '#fff' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#0F1849' }}>
                  {user.name} {user.role === 'admin' && <span style={{ fontSize: '0.7rem', backgroundColor: '#eab308', color: '#000', padding: '2px 6px', borderRadius: '10px', marginLeft: '0.5rem' }}>Admin</span>}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>{user.email || 'Usuário'}</span>
              </div>
              <button 
                onClick={() => handleToggleAdmin(user.id, user.role)} 
                style={{ 
                  padding: '0.5rem 1rem', 
                  backgroundColor: user.role === 'admin' ? '#ef4444' : '#2C67EA', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}
              >
                {user.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
              </button>
            </div>
          ))}
          {profiles.length === 0 && <p style={{ padding: '1rem', color: '#888' }}>Nenhum usuário cadastrado ainda.</p>}
        </div>
      </div>

      {/* SEÇÃO E-MAILS */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#0F1849', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem' }}>👥 Cadastro de Participantes</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#666' }}>Adicionar E-mail</h3>
            <form onSubmit={handleAddEmail} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input type="email" placeholder="E-mail" value={emailToAdd} onChange={(e) => setEmailToAdd(e.target.value)} required style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }} />
              <select value={group} onChange={(e) => setGroup(e.target.value)} style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }}>
                <option value="entregador">Entregador</option>
                <option value="colaborador">Colaborador</option>
              </select>
              <button type="submit" style={{ padding: '0.8rem', backgroundColor: '#2C67EA', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar Individual</button>
            </form>
            {message && <div style={{ marginTop: '0.5rem', color: '#16a34a', fontSize: '0.9rem' }}>{message}</div>}
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#666' }}>Subir CSV</h3>
            <form onSubmit={handleCsvUpload} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)} style={{ padding: '0.5rem' }} />
              <button type="submit" disabled={!csvFile} style={{ padding: '0.8rem', backgroundColor: csvFile ? '#16a34a' : '#ccc', color: 'white', border: 'none', borderRadius: '6px', cursor: csvFile ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
                Enviar Planilha
              </button>
            </form>
            {csvMessage && <div style={{ marginTop: '0.5rem', color: '#2C67EA', fontSize: '0.9rem', fontWeight: 'bold' }}>{csvMessage}</div>}
          </div>
        </div>

        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#666' }}>E-mails Autorizados ({allowedEmails.length})</h3>
        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px' }}>
          {allowedEmails.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', borderBottom: '1px solid #eee' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{item.email}</span>
                <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>{item.user_group}</span>
              </div>
              <button onClick={() => handleDeleteEmail(item.id, item.email)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} title="Excluir">🗑️</button>
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO DICIONÁRIO DE SELEÇÕES */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#0F1849', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem' }}>🌍 Dicionário de Seleções</h2>
        <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>Sempre que a API baixar os jogos, ela usará este dicionário para traduzir os nomes e exibir as bandeiras corretas.</p>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f9f9fa', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '0.8rem', borderBottom: '1px solid #ddd', color: '#666' }}>Nome API (Original)</th>
                <th style={{ padding: '0.8rem', borderBottom: '1px solid #ddd', color: '#666' }}>Nome em Português</th>
                <th style={{ padding: '0.8rem', borderBottom: '1px solid #ddd', color: '#666' }}>Sigla (2 letras)</th>
                <th style={{ padding: '0.8rem', borderBottom: '1px solid #ddd', color: '#666' }}>Salvar</th>
              </tr>
            </thead>
            <tbody>
              {translations.map((t, index) => (
                <tr key={t.api_name} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.8rem', color: '#888', fontWeight: 'bold' }}>{t.api_name}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <input 
                      type="text" 
                      value={t.pt_name} 
                      onChange={(e) => {
                        const newArr = [...translations];
                        newArr[index] = { ...newArr[index], pt_name: e.target.value };
                        setTranslations(newArr);
                      }}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <input 
                      type="text" 
                      maxLength={6}
                      value={t.flag_code} 
                      onChange={(e) => {
                        const newArr = [...translations];
                        newArr[index] = { ...newArr[index], flag_code: e.target.value.toLowerCase() };
                        setTranslations(newArr);
                      }}
                      style={{ width: '60px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center' }}
                    />
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <button 
                      onClick={async () => {
                        await supabase.from('team_translations').update({ pt_name: t.pt_name, flag_code: t.flag_code }).eq('api_name', t.api_name);
                        alert(`Tradução de ${t.api_name} salva!`);
                      }}
                      style={{ padding: '0.5rem 1rem', backgroundColor: '#2C67EA', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Salvar
                    </button>
                  </td>
                </tr>
              ))}
              {translations.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: '#888' }}>
                    Nenhuma seleção encontrada. Sincronize a tabela de jogos para preencher automaticamente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEÇÃO JOGOS */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#0F1849', margin: 0 }}>⚽ Gestão de Jogos</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={handleDownloadAudit} style={{ padding: '0.6rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              📊 Auditoria
            </button>
            <button onClick={handleSyncApi} style={{ padding: '0.6rem 1rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              🔄 Tabela 2026 Completa
            </button>
            <button onClick={handleClearAll} style={{ padding: '0.6rem 1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              🗑 Limpar Todos
            </button>
          </div>
        </div>
        
        {/* ADD JOGO */}
        <div style={{ backgroundColor: '#f9f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#666' }}>Agendar Nova Partida</h3>
          <form onSubmit={handleAddMatch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Time A</label>
              <input type="text" value={teamA} onChange={e => setTeamA(e.target.value)} required style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Sigla A (ex: br)</label>
              <input type="text" value={flagA} onChange={e => setFlagA(e.target.value.toLowerCase())} required style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Time B</label>
              <input type="text" value={teamB} onChange={e => setTeamB(e.target.value)} required style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Sigla B (ex: ar)</label>
              <input type="text" value={flagB} onChange={e => setFlagB(e.target.value.toLowerCase())} required style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Data e Hora</label>
              <input type="datetime-local" value={matchDate} onChange={e => setMatchDate(e.target.value)} required style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }} />
            </div>
            <button type="submit" style={{ gridColumn: '1 / -1', padding: '0.8rem', backgroundColor: '#0F1849', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Salvar Jogo</button>
          </form>
          {matchMessage && <div style={{ marginTop: '0.5rem', color: '#16a34a', fontSize: '0.9rem' }}>{matchMessage}</div>}
        </div>

        {/* LISTA JOGOS */}
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#666' }}>Partidas Cadastradas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {matches.map(match => (
              <div key={match.id} style={{ display: 'flex', flexDirection: 'column', padding: '1rem', border: '1px solid #eee', borderRadius: '8px', position: 'relative' }}>
                <button onClick={() => handleDeleteMatch(match.id)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} title="Excluir Jogo">🗑️</button>
                
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#888', marginBottom: '1rem' }}>
                  {new Date(match.match_date).toLocaleString('pt-BR')} | Status: {match.status === 'pending' ? 'Pendente' : 'Encerrado'}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 'bold' }}>{match.team_a}</span>
                  {match.status === 'pending' ? (
                    <>
                      <input type="number" min="0" value={scores[match.id]?.a || ''} onChange={(e) => setScores({...scores, [match.id]: {...scores[match.id], a: e.target.value}})} style={{ width: '40px', padding: '0.4rem', textAlign: 'center', borderRadius: '4px', border: '1px solid #ccc' }} />
                      <span style={{ color: '#888' }}>X</span>
                      <input type="number" min="0" value={scores[match.id]?.b || ''} onChange={(e) => setScores({...scores, [match.id]: {...scores[match.id], b: e.target.value}})} style={{ width: '40px', padding: '0.4rem', textAlign: 'center', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </>
                  ) : (
                    <span style={{ fontSize: '1.5rem', margin: '0 1rem' }}>{match.score_a} X {match.score_b}</span>
                  )}
                  <span style={{ fontWeight: 'bold' }}>{match.team_b}</span>
                </div>

                {match.status === 'pending' && (
                  <button onClick={() => handleFinishMatch(match.id)} style={{ marginTop: '1.5rem', padding: '0.6rem', backgroundColor: '#eab308', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Encerrar e Dar Pontos
                  </button>
                )}
              </div>
            ))}
            {matches.length === 0 && <p style={{ color: '#888', fontSize: '0.9rem' }}>Nenhum jogo na lista.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
