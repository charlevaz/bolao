"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function AdminPanel() {
  const [emailToAdd, setEmailToAdd] = useState('');
  const [group, setGroup] = useState('entregador');
  const [message, setMessage] = useState('');
  
  // CSV Upload State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvMessage, setCsvMessage] = useState('');
  
  // Match Management State
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [flagA, setFlagA] = useState('br');
  const [flagB, setFlagB] = useState('ar');
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
      }
      setChecking(false);
    }
    checkAdmin();
  }, []);

  const loadMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'pending')
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
        
        // Tratar caso a planilha não tenha grupo
        if (userGroup !== 'entregador' && userGroup !== 'colaborador') {
          userGroup = 'colaborador'; // fallback default
        }

        return { email, user_group: userGroup };
      }).filter(item => item.email && item.email.includes('@'));

      setCsvMessage(`Planilha processada! Inserindo ${toInsert.length} e-mails...`);

      const { error } = await supabase.from('allowed_emails').insert(toInsert);
      
      if (error) {
        setCsvMessage(`Erro ao inserir lote: ${error.message}`);
      } else {
        setCsvMessage(`🎉 ${toInsert.length} e-mails cadastrados com sucesso!`);
        setCsvFile(null);
      }
    };
    reader.readAsText(csvFile);
  };

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMatchMessage('Salvando jogo...');
    
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
      setMatchMessage(`Jogo ${teamA} x ${teamB} cadastrado com sucesso!`);
      setTeamA('');
      setTeamB('');
      setMatchDate('');
      loadMatches();
    }
  };

  const handleFinishMatch = async (matchId: string) => {
    const scoreA = scores[matchId]?.a;
    const scoreB = scores[matchId]?.b;
    
    if (scoreA === '' || scoreB === '') {
      alert("Digite o placar completo antes de finalizar!");
      return;
    }

    const confirmAction = window.confirm(`Você tem certeza? Isso vai finalizar o jogo e distribuir os pontos para todos que palpitaram!`);
    if (!confirmAction) return;

    // Chamar a função SQL (Stored Procedure) que finaliza o jogo e calcula os pontos
    const { error } = await supabase.rpc('finish_match', {
      p_match_id: matchId,
      p_real_score_a: parseInt(scoreA),
      p_real_score_b: parseInt(scoreB)
    });

    if (error) {
      alert(`Erro ao finalizar jogo: ${error.message}`);
    } else {
      alert("Jogo encerrado com sucesso! Os pontos foram distribuídos no Ranking.");
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
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#333' }}>
      <Link href="/" style={{ color: '#2C67EA', marginBottom: '2rem', display: 'inline-block' }}>← Voltar para a Home</Link>
      
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: '#fff' }}>Painel do Administrador</h1>
      
      {/* SEÇÃO 1: E-MAILS */}
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', marginBottom: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#0F1849', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem' }}>👥 Cadastro de Participantes</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* Unitário */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#666' }}>Adicionar Individual</h3>
            <form onSubmit={handleAddEmail} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="email" 
                placeholder="E-mail"
                value={emailToAdd}
                onChange={(e) => setEmailToAdd(e.target.value)}
                required
                style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }}
              />
              <select 
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }}
              >
                <option value="entregador">Entregador</option>
                <option value="colaborador">Colaborador</option>
              </select>
              <button type="submit" style={{ padding: '0.8rem', backgroundColor: '#2C67EA', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Autorizar Único
              </button>
            </form>
            {message && <div style={{ marginTop: '0.5rem', color: '#16a34a', fontSize: '0.9rem' }}>{message}</div>}
          </div>

          {/* Em Lote (Planilha CSV) */}
          <div style={{ borderLeft: '1px solid #eee', paddingLeft: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#666' }}>Subir Planilha (.csv)</h3>
            <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1rem' }}>
              Formato: Coluna 1 = E-mail, Coluna 2 = Grupo (entregador ou colaborador). Sem cabeçalho.
            </p>
            <form onSubmit={handleCsvUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="file" 
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                required
                style={{ padding: '0.5rem' }}
              />
              <button type="submit" disabled={!csvFile} style={{ padding: '0.8rem', backgroundColor: csvFile ? '#16a34a' : '#ccc', color: 'white', border: 'none', borderRadius: '6px', cursor: csvFile ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
                Enviar Planilha
              </button>
            </form>
            {csvMessage && <div style={{ marginTop: '0.5rem', color: '#2C67EA', fontSize: '0.9rem', fontWeight: 'bold' }}>{csvMessage}</div>}
          </div>

        </div>
      </div>

      {/* SEÇÃO 2: JOGOS */}
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#0F1849', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem' }}>⚽ Gestão de Jogos</h2>
        
        {/* Adicionar Jogo */}
        <div style={{ marginBottom: '3rem', backgroundColor: '#f9f9fa', padding: '1.5rem', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#666' }}>Agendar Nova Partida</h3>
          <form onSubmit={handleAddMatch} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Time A (Ex: Brasil)</label>
              <input type="text" value={teamA} onChange={e => setTeamA(e.target.value)} required style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }} />
            </div>
            <div style={{ flex: '0 0 80px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Sigla A</label>
              <input type="text" placeholder="br" value={flagA} onChange={e => setFlagA(e.target.value.toLowerCase())} required style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }} />
            </div>
            
            <div style={{ padding: '0.8rem', color: '#888' }}>X</div>
            
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Time B (Ex: Argentina)</label>
              <input type="text" value={teamB} onChange={e => setTeamB(e.target.value)} required style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }} />
            </div>
            <div style={{ flex: '0 0 80px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Sigla B</label>
              <input type="text" placeholder="ar" value={flagB} onChange={e => setFlagB(e.target.value.toLowerCase())} required style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }} />
            </div>

            <div style={{ flex: '1 1 250px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Data e Hora</label>
              <input type="datetime-local" value={matchDate} onChange={e => setMatchDate(e.target.value)} required style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }} />
            </div>

            <button type="submit" style={{ padding: '0.8rem 1.5rem', backgroundColor: '#0F1849', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Salvar
            </button>
          </form>
          {matchMessage && <div style={{ marginTop: '0.5rem', color: '#16a34a', fontSize: '0.9rem' }}>{matchMessage}</div>}
        </div>

        {/* Lista de Jogos Abertos */}
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#666' }}>Lançar Placar e Encerrar Jogos Pendentes</h3>
          {matches.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic' }}>Nenhum jogo pendente encontrado.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {matches.map(match => (
                <div key={match.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid #eee', borderRadius: '8px' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div style={{ width: '120px', textAlign: 'right', fontWeight: 'bold' }}>{match.team_a}</div>
                    
                    <input 
                      type="number" 
                      min="0"
                      value={scores[match.id]?.a || ''}
                      onChange={(e) => setScores({...scores, [match.id]: {...scores[match.id], a: e.target.value}})}
                      style={{ width: '50px', padding: '0.5rem', textAlign: 'center', borderRadius: '4px', border: '1px solid #ccc' }} 
                    />
                    
                    <span style={{ color: '#888' }}>X</span>
                    
                    <input 
                      type="number" 
                      min="0"
                      value={scores[match.id]?.b || ''}
                      onChange={(e) => setScores({...scores, [match.id]: {...scores[match.id], b: e.target.value}})}
                      style={{ width: '50px', padding: '0.5rem', textAlign: 'center', borderRadius: '4px', border: '1px solid #ccc' }} 
                    />
                    
                    <div style={{ width: '120px', fontWeight: 'bold' }}>{match.team_b}</div>
                  </div>

                  <div style={{ color: '#888', fontSize: '0.8rem', width: '150px', textAlign: 'center' }}>
                    {new Date(match.match_date).toLocaleString('pt-BR')}
                  </div>

                  <button 
                    onClick={() => handleFinishMatch(match.id)}
                    style={{ padding: '0.6rem 1rem', backgroundColor: '#eab308', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Encerrar e Pontuar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
