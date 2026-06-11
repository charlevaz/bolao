"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { getTheme } from '@/utils/theme';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [rankPos, setRankPos] = useState<number | null>(null);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  
  const [matches, setMatches] = useState<any[]>([]);
  const [guesses, setGuesses] = useState<any[]>([]);
  
  // Controle de formulários
  const [inputScores, setInputScores] = useState<{[key: string]: {a: number | null, b: number | null}}>({});
  const [message, setMessage] = useState<{[key: string]: string}>({});

  // Filtro por dia
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [uniqueDays, setUniqueDays] = useState<{date: string, label: string, short: string}[]>([]);

  // Atualização de Nome
  const [showNameModal, setShowNameModal] = useState(false);
  const [newName, setNewName] = useState('');

  // Dicionário de Traduções
  const [translations, setTranslations] = useState<Record<string, {pt_name: string, flag_code: string}>>({});

  const [showRulesModal, setShowRulesModal] = useState(false);

  // Fases liberadas pelo admin
  const [phaseSettings, setPhaseSettings] = useState<Record<string, boolean>>({});

  const supabase = createClient();
  const theme = getTheme();

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      // 1. Carregar Perfil
      let { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileData) {
        // Garantir sincronia de elegibilidade com allowed_emails
        const { data: emailData } = await supabase.from('allowed_emails').select('eligible').eq('email', profileData.email).single();
        if (emailData && emailData.eligible !== profileData.eligible) {
          await supabase.from('profiles').update({ eligible: emailData.eligible }).eq('id', profileData.id);
          profileData.eligible = emailData.eligible;
        }
      }
      
      setProfile(profileData);
      
      // Verifica se o nome ainda é nulo, vazio, igual ao e-mail ou a parte antes do @
      if (profileData && (!profileData.name || profileData.name === profileData.email || profileData.name === profileData.email.split('@')[0])) {
        setShowNameModal(true);
      }

      // 2. Carregar Ranking (Top 10 do mesmo grupo apenas Elegíveis)
      if (profileData) {
        if (profileData.eligible !== false) {
          let countQuery = supabase
            .from('public_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('eligible', true)
            .or(`points.gt.${profileData.points},and(points.eq.${profileData.points},exact_scores.gt.${profileData.exact_scores}),and(points.eq.${profileData.points},exact_scores.eq.${profileData.exact_scores},winner_scores.gt.${profileData.winner_scores}),and(points.eq.${profileData.points},exact_scores.eq.${profileData.exact_scores},winner_scores.eq.${profileData.winner_scores},participations.gt.${profileData.participations})`);
            
          if (theme.hasTwoPools) {
            countQuery = countQuery.eq('user_group', profileData.user_group);
          }
            
          const { count } = await countQuery;
            
          setRankPos((count || 0) + 1);
        } else {
          setRankPos(null);
        }

        let topQuery = supabase
          .from('public_profiles')
          .select('*')
          .eq('eligible', true)
          .order('points', { ascending: false })
          .order('exact_scores', { ascending: false })
          .order('winner_scores', { ascending: false })
          .order('participations', { ascending: false })
          .limit(10);
          
        if (theme.hasTwoPools) {
          topQuery = topQuery.eq('user_group', profileData.user_group);
        }
        
        const { data: topData } = await topQuery;
        
        if (topData) setTopUsers(topData);
      }

      // 3-6. Carregar Jogos, Palpites, Traduções e Fases em PARALELO (otimização de performance)
      const [matchesRes, guessesRes, transRes, phasesRes] = await Promise.all([
        supabase.from('matches').select('*').order('match_date', { ascending: true }),
        supabase.from('guesses').select('*').eq('user_id', user.id),
        supabase.from('team_translations').select('*'),
        supabase.from('phase_settings').select('*'),
      ]);

      // Processar Jogos
      const matchesData = matchesRes.data;
      if (matchesData && matchesData.length > 0) {
        setMatches(matchesData);
        
        const daysMap = new Map();
        const daysFormat: any[] = [];
        
        matchesData.forEach(m => {
          const d = new Date(m.match_date);
          // Usar data LOCAL de São Paulo para evitar duplicatas por fuso UTC
          const localDateStr = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
          if (!daysMap.has(localDateStr)) {
            daysMap.set(localDateStr, true);
            const diasSemana = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
            const dSP = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
            daysFormat.push({
              date: localDateStr,
              label: `${dSP.getDate()} ${dSP.toLocaleString('pt-BR', {month: 'short'}).toUpperCase()}`,
              short: diasSemana[dSP.getDay()]
            });
          }
        });
        
        setUniqueDays(daysFormat);
        if (daysFormat.length > 0) setSelectedDay(daysFormat[0].date);
      }

      // Processar Palpites
      const guessesData = guessesRes.data;
      if (guessesData) {
        setGuesses(guessesData);
        const initialInputs: any = {};
        guessesData.forEach(g => {
          initialInputs[g.match_id] = { a: g.guess_score_a, b: g.guess_score_b };
        });
        setInputScores(initialInputs);
      }

      // Processar Traduções
      const transData = transRes.data;
      if (transData) {
        const tMap: any = {};
        transData.forEach(t => {
          tMap[t.api_name] = { pt_name: t.pt_name, flag_code: t.flag_code };
        });
        setTranslations(tMap);
      }

      // Processar Fases
      const phasesData = phasesRes.data;
      if (phasesData) {
        const pMap: any = {};
        phasesData.forEach((p: any) => { pMap[p.phase_key] = p.is_open; });
        setPhaseSettings(pMap);
      }
      
      setLoading(false);
    }
    loadDashboard();
  }, []);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !profile) return;
    
    await supabase.from('profiles').update({ name: newName.trim() }).eq('id', profile.id);
    setProfile({...profile, name: newName.trim()});
    setShowNameModal(false);
  };

  const handleScoreChange = (matchId: string, team: 'a'|'b', delta: number) => {
    setInputScores(prev => {
      const current = prev[matchId] || { a: null, b: null };
      const currentVal = current[team] ?? 0;
      const newVal = Math.min(99, Math.max(0, currentVal + delta));
      return { ...prev, [matchId]: { ...current, [team]: newVal } };
    });
  };

  const handleSaveGuess = async (matchId: string) => {
    if (!profile) return;
    
    const scoreA = inputScores[matchId]?.a;
    const scoreB = inputScores[matchId]?.b;
    
    if (scoreA === null || scoreA === undefined || scoreB === null || scoreB === undefined) {
      setMessage({...message, [matchId]: 'Preencha os dois gols!'});
      return;
    }

    setMessage({...message, [matchId]: 'Salvando...'});

    const existingGuess = guesses.find(g => g.match_id === matchId);

    let error;
    if (existingGuess) {
      const res = await supabase.from('guesses').update({
        guess_score_a: scoreA,
        guess_score_b: scoreB
      }).eq('id', existingGuess.id);
      error = res.error;
    } else {
      const res = await supabase.from('guesses').insert([{
        user_id: profile.id,
        match_id: matchId,
        guess_score_a: scoreA,
        guess_score_b: scoreB
      }]);
      error = res.error;
    }

    if (error) {
      if (error.message.includes('Acesso Negado')) {
        setMessage({...message, [matchId]: '❌ Palpite bloqueado (Falta menos de 1h)'});
      } else if (error.message.includes('guesses_user_match_unique') || error.message.includes('duplicate key')) {
        // Constraint UNIQUE violada — palpite já existe (ex: duas abas abertas). Forçar UPDATE.
        const { data: existingData } = await supabase.from('guesses').select('id').eq('user_id', profile.id).eq('match_id', matchId).single();
        if (existingData) {
          await supabase.from('guesses').update({ guess_score_a: scoreA, guess_score_b: scoreB }).eq('id', existingData.id);
          setMessage({...message, [matchId]: '✅ Salvo!'});
          const { data } = await supabase.from('guesses').select('*').eq('user_id', profile.id);
          if (data) setGuesses(data);
          setTimeout(() => setMessage(prev => ({...prev, [matchId]: ''})), 2000);
          return;
        }
        setMessage({...message, [matchId]: `Erro: ${error.message}`});
      } else {
        setMessage({...message, [matchId]: `Erro: ${error.message}`});
      }
    } else {
      setMessage({...message, [matchId]: '✅ Salvo!'});
      const { data } = await supabase.from('guesses').select('*').eq('user_id', profile.id);
      if (data) setGuesses(data);
      setTimeout(() => setMessage(prev => ({...prev, [matchId]: ''})), 2000);
    }
  };

  const isLocked = (match: any) => {
    if (match.is_locked) return true;
    const matchDate = new Date(match.match_date).getTime();
    const now = new Date().getTime();
    return now > (matchDate - 60 * 60 * 1000); // 1 hora
  };

  // Traduz nomes das fases do inglês para português
  // Valores exatos do JSON openfootball 2026:
  // Grupos: "Group A"..."Group L"
  // Eliminatórias: "Round of 32", "Round of 16", "Quarter-final", "Semi-final", "Match for third place", "Final"
  const translatePhaseName = (name: string): string => {
    if (!name) return 'Fase Eliminatória';
    const g = name.toLowerCase().trim();
    if (g.startsWith('group') || g.startsWith('grupo')) return name; // Group A, B... mantém original
    if (g === 'round of 32') return '16-avos de Final (Fase de 32)';
    if (g === 'round of 16') return 'Oitavas de Final';
    if (g === 'quarter-final' || g === 'quarter-finals' || g === 'quarterfinal') return 'Quartas de Final';
    if (g === 'semi-final' || g === 'semi-finals' || g === 'semifinal') return 'Semifinal';
    if (g === 'match for third place' || g.includes('third place') || g.includes('terceiro')) return '3º Lugar';
    if (g === 'final') return 'Final';
    // Fallback genérico para não exibir texto em inglês desconhecido
    if (g.includes('round of 32')) return '16-avos de Final (Fase de 32)';
    if (g.includes('round of 16')) return 'Oitavas de Final';
    if (g.includes('quarter')) return 'Quartas de Final';
    if (g.includes('semi')) return 'Semifinal';
    if (g.includes('final')) return 'Final';
    return name;
  };

  // Formata hora no fuso de São Paulo
  const formatTimeBrasilia = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  const formatDateBrasilia = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo'
    });
  };

  // Detecta se o jogo é de fase eliminatória (não é fase de grupo)
  const getMatchPhaseKey = (groupName: string): string | null => {
    if (!groupName) return null;
    const g = groupName.toLowerCase();
    if (g.startsWith('group') || g.startsWith('grupo')) return null; // fase de grupos = sempre aberta
    if (g.includes('round of 32') || g.includes('oitavas')) return 'round_of_32';
    if (g.includes('round of 16')) return 'round_of_16';
    if (g.includes('third place') || g.includes('terceiro')) return 'semi'; // 3º lugar abre junto com semi
    if (g.includes('semi')) return 'semi';
    if (g.includes('quarter') || g.includes('quartas')) return 'quarter';
    if (g.includes('final')) return 'final';
    return 'final'; // qualquer fase não reconhecida = trata como eliminatória bloqueada
  };

  const isPhaseBlocked = (match: any): boolean => {
    const phaseKey = getMatchPhaseKey(match.group_name || '');
    if (!phaseKey) return false; // fase de grupos: nunca bloqueia
    return !(phaseSettings[phaseKey] === true); // bloqueia se não estiver explicitamente aberta
  };

  const calculateDaysLeft = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    if (diff < 0) return 'Encerrado';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    if (days > 0) return `Fecha em ${days} dias`;
    if (hours > 0) return `Fecha em ${hours} horas`;
    return 'Fecha em minutos';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#f0f4f8', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#0F1849' }}>Carregando sua área...</div>;
  }

  if (profile?.user_group === 'pendente' || profile?.user_group === 'rejeitado') {
    const isRejected = profile.user_group === 'rejeitado';
    
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f0f4f8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#0F1849', padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: '2rem', color: isRejected ? '#ef4444' : theme.primaryColor, marginBottom: '1rem' }}>
          {isRejected ? 'Cadastro Recusado ❌' : 'Pré-cadastro em Análise ⏳'}
        </h1>
        <p style={{ fontSize: '1.2rem', maxWidth: '600px', lineHeight: '1.6', marginBottom: '1rem', color: '#475569' }}>
          {isRejected 
            ? 'Infelizmente o seu cadastro não foi aprovado para participar do bolão.' 
            : 'Recebemos o seu cadastro, mas ele ainda precisa ser liberado.'}
        </p>
        <p style={{ fontSize: '1rem', maxWidth: '600px', lineHeight: '1.6', marginBottom: '2rem', color: '#ef4444', backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '8px' }}>
          <strong>Aviso:</strong> {isRejected 
            ? 'Os administradores revisaram seus dados e o acesso foi negado.' 
            : `Não foi possível validar seus dados automaticamente como ${theme.id === 'barbearia' ? 'cliente parceiro' : 'entregador autônomo parceiro ativo'}.`}
        </p>
        <p style={{ fontSize: '1rem', maxWidth: '600px', lineHeight: '1.6', marginBottom: '2rem', color: '#475569' }}>
          Caso tenha dúvidas ou acredite que isso seja um engano, entre em contato pelo nosso WhatsApp.
        </p>
        <a href={`https://wa.me/${theme.rules.whatsapp}`} target="_blank" rel="noreferrer" style={{ padding: '1rem 2rem', backgroundColor: '#25D366', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 10px rgba(37, 211, 102, 0.3)' }}>
          <span>💬</span> Falar no WhatsApp
        </a>
        <button onClick={handleLogout} style={{ marginTop: '3rem', padding: '0.8rem 1.5rem', background: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          Sair da Conta
        </button>
      </div>
    );
  }

  const filteredMatches = matches.filter(m => {
    const spDate = new Date(m.match_date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
    return spDate === selectedDay;
  });
  const progressPercent = matches.length > 0 ? Math.round((guesses.length / matches.length) * 100) : 0;

  return (
    <div style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', color: '#333', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {showNameModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h2 style={{ color: '#0F1849', marginTop: 0, marginBottom: '1rem' }}>Alterar Nome</h2>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Informe o nome que será exibido no ranking para os outros participantes.</p>
            <form onSubmit={handleSaveName} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="text" 
                placeholder="Seu nome" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                required 
                style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }}
              />

              <button type="submit" style={{ padding: '0.8rem', backgroundColor: theme.primaryColor, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
                Salvar Nome
              </button>
              <button type="button" onClick={() => setShowNameModal(false)} style={{ padding: '0.8rem', backgroundColor: 'transparent', color: '#666', border: '1px solid #ccc', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}



      {/* HEADER TOP */}
      <header style={{ backgroundColor: theme.primaryColor, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: theme.secondaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>
            {profile?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {profile?.name}
              <button 
                onClick={() => { setNewName(profile?.name || ''); setShowNameModal(true); }} 
                title="Alterar nome" 
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontSize: '0.85rem', opacity: 0.7, lineHeight: 1 }}
              >✏️</button>
            </h1>
            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>
              {profile?.email} • {theme.documentType}: {
                profile?.cpf 
                ? (theme.documentType === 'CPF' 
                  ? profile.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                  : profile.cpf.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')) 
                : 'Não informado'
              }
            </p>
            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>
              {profile?.points} pts • {profile?.exact_scores} Placares Exatos
              {profile?.eligible === false ? (
                <span style={{ marginLeft: '0.5rem', backgroundColor: '#ef4444', color: '#fff', padding: '1px 8px', borderRadius: '10px', fontWeight: 'bold' }}>Não Elegível</span>
              ) : rankPos ? (
                <span style={{ marginLeft: '0.5rem', backgroundColor: '#eab308', color: '#000', padding: '1px 8px', borderRadius: '10px', fontWeight: 'bold' }}>🏅 {rankPos}º lugar</span>
              ) : null}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href={!theme.hasTwoPools ? '/regras' : (profile?.user_group === 'colaborador' ? '/regras-colaborador' : '/regras')} style={{ padding: '0.4rem 0.8rem', backgroundColor: 'transparent', border: '1px solid #fff', color: '#fff', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'none' }}>Regras e Prêmios</a>
          {profile?.role === 'admin' && (
            <a href="/admin" style={{ padding: '0.4rem 0.8rem', backgroundColor: '#eab308', color: '#000', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>Admin</a>
          )}
          <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>Sair</button>
        </div>
      </header>

      <main style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* RANKING BOXES */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ backgroundColor: theme.primaryColor, color: '#fff', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Seus Pontos</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0.5rem 0' }}>{profile?.points || 0}</div>
          </div>
          
          <div style={{ backgroundColor: theme.secondaryColor, color: theme.id === 'barbearia' ? '#000' : '#fff', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.9, fontWeight: 'bold' }}>Sua Posição</div>
            <div style={{ fontSize: '2rem', fontWeight: '900', margin: '0.5rem 0' }}>
              {rankPos ? `${rankPos}º` : '-'}
            </div>
            {!theme.hasTwoPools ? (
              <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 'bold' }}>Posição Geral</div>
            ) : (
              <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 'bold' }}>entre {theme.groups.find(g => g.dbValue === profile?.user_group)?.plural || profile?.user_group}</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {/* LADO ESQUERDO: PALPITES */}
          <section style={{ flex: '1 1 600px', minWidth: '300px' }}>
            
            {/* CARROSSEL DE DIAS */}
            <div style={{ display: 'flex', overflowX: 'auto', gap: '0.5rem', paddingBottom: '1rem', marginBottom: '1rem', scrollbarWidth: 'thin' }}>
              {uniqueDays.map((d) => (
                <button 
                  key={d.date}
                  onClick={() => setSelectedDay(d.date)}
                  style={{ 
                    flexShrink: 0,
                    padding: '0.8rem 1.2rem', 
                    backgroundColor: selectedDay === d.date ? theme.primaryColor : '#fff', 
                    border: selectedDay === d.date ? `2px solid ${theme.primaryColor}` : '1px solid #ddd',
                    borderRadius: '12px',
                    color: selectedDay === d.date ? '#fff' : '#666',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: '80px',
                    boxShadow: selectedDay === d.date ? `0 4px 10px rgba(44, 103, 234, 0.3)` : 'none'
                  }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{d.short}</span>
                  <span style={{ fontSize: '1rem', fontWeight: '900' }}>{d.label}</span>
                </button>
              ))}
            </div>

            {/* BARRA DE PROGRESSO */}
            <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: 'bold' }}>{guesses.length} de {matches.length} palpites feitos</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '50%' }}>
                <div style={{ flex: 1, height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: theme.primaryColor }}></div>
                </div>
                <span style={{ fontSize: '0.9rem', color: theme.primaryColor, fontWeight: 'bold' }}>{progressPercent}%</span>
              </div>
            </div>

            {/* LISTA DE JOGOS DO DIA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {filteredMatches.length === 0 ? (
                <p style={{ color: '#888', textAlign: 'center' }}>Nenhum jogo neste dia.</p>
              ) : filteredMatches.map(match => {
                  const locked = isLocked(match);
                  const phaseBlocked = isPhaseBlocked(match);
                const myGuess = guesses.find(g => g.match_id === match.id);

                // Helper para bandeiras e traduções
                const transA = translations[match.team_a];
                const transB = translations[match.team_b];
                
                const flagA = (transA?.flag_code && transA.flag_code !== 'un') ? transA.flag_code : (match.flag_a !== 'un' ? match.flag_a : null);
                const flagB = (transB?.flag_code && transB.flag_code !== 'un') ? transB.flag_code : (match.flag_b !== 'un' ? match.flag_b : null);
                
                const nameA = transA?.pt_name || match.team_a;
                const nameB = transB?.pt_name || match.team_b;

                return (
                  <div key={match.id} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                    
                    {/* BADGES SUPERIORES */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {phaseBlocked && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.3rem 0.8rem', borderRadius: '20px', border: '1px solid #7c3aed', color: '#7c3aed', backgroundColor: '#f5f3ff' }}>
                            🔒 Fase não liberada
                          </span>
                        )}
                        {!myGuess && !locked && !phaseBlocked && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.3rem 0.8rem', borderRadius: '20px', border: '1px solid #eab308', color: '#b45309', backgroundColor: '#fefce8' }}>
                            ⚠️ Sem palpite
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.3rem 0.8rem', borderRadius: '20px', border: locked ? '1px solid #ef4444' : `1px solid ${theme.primaryColor}`, color: locked ? '#ef4444' : theme.primaryColor, backgroundColor: locked ? '#fef2f2' : '#eff6ff' }}>
                          {locked ? '🔒 Encerrado' : `🕒 ${calculateDaysLeft(match.match_date)}`}
                        </span>
                      </div>
                      {myGuess && <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '0.3rem 0.8rem', borderRadius: '20px', backgroundColor: '#10b981', color: '#fff' }}>✅ Palpitado</span>}
                    </div>

                    {/* INFO DO JOGO */}
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: theme.primaryColor, fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: '900' }}>{translatePhaseName(match.group_name)}</span> • {formatTimeBrasilia(match.match_date)} • {match.venue || 'Estádio A Definir'}
                    </div>

                    {/* PLACARES */}
                    <div className="match-score-row">
                      
                      {/* Time A */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        {flagA ? (
                          <img src={`https://flagcdn.com/w40/${flagA}.png`} alt={nameA} style={{ borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                        ) : (
                          <div style={{ width: '40px', height: '30px', backgroundColor: '#e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#888' }}>?</div>
                        )}
                        <span className="match-team-name">{nameA}</span>
                      </div>

                      {/* Controles Time A */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <button disabled={locked} onClick={() => handleScoreChange(match.id, 'a', -1)} className="score-btn" style={{ cursor: locked ? 'not-allowed' : 'pointer' }}>-</button>
                        <div className="score-input">
                          {inputScores[match.id]?.a ?? '-'}
                        </div>
                        <button disabled={locked} onClick={() => handleScoreChange(match.id, 'a', 1)} className="score-btn" style={{ cursor: locked ? 'not-allowed' : 'pointer' }}>+</button>
                      </div>

                      <span style={{ color: '#aaa', fontWeight: 'bold', fontSize: '1.2rem', padding: '0 0.2rem' }}>X</span>

                      {/* Controles Time B */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <button disabled={locked} onClick={() => handleScoreChange(match.id, 'b', -1)} className="score-btn" style={{ cursor: locked ? 'not-allowed' : 'pointer' }}>-</button>
                        <div className="score-input">
                          {inputScores[match.id]?.b ?? '-'}
                        </div>
                        <button disabled={locked} onClick={() => handleScoreChange(match.id, 'b', 1)} className="score-btn" style={{ cursor: locked ? 'not-allowed' : 'pointer' }}>+</button>
                      </div>

                      {/* Time B */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        {flagB ? (
                          <img src={`https://flagcdn.com/w40/${flagB}.png`} alt={nameB} style={{ borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                        ) : (
                          <div style={{ width: '40px', height: '30px', backgroundColor: '#e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#888' }}>?</div>
                        )}
                        <span className="match-team-name">{nameB}</span>
                      </div>

                    </div>

                    {/* Botão Salvar */}
                    {!locked && !phaseBlocked && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', flexDirection: 'column', alignItems: 'center' }}>
                        <button 
                          onClick={() => handleSaveGuess(match.id)}
                          style={{ padding: '0.8rem 2rem', backgroundColor: theme.primaryColor, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', maxWidth: '300px', boxShadow: `0 4px 10px rgba(44, 103, 234, 0.3)` }}
                        >
                          {myGuess ? 'Atualizar Palpite' : 'Confirmar Palpite'}
                        </button>
                        {message[match.id] && (
                          <span style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', color: message[match.id].includes('Erro') || message[match.id].includes('bloqueado') ? '#ef4444' : '#10b981' }}>
                            {message[match.id]}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Resultado Real */}
                    {match.status === 'finished' && (
                      <div style={{ marginTop: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>Resultado Oficial: <strong style={{ color: '#0F1849' }}>{match.score_a} x {match.score_b}</strong></p>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#10b981', fontWeight: 'bold' }}>Você ganhou +{myGuess?.points_earned || 0} pontos</p>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </section>

          {/* LADO DIREITO: RANKING */}
          <aside style={{ flex: '1 1 300px', maxWidth: '400px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #eee', position: 'sticky', top: '2rem' }}>
              <h2 style={{ fontSize: '1.3rem', margin: '0 0 1.5rem 0', color: '#0F1849', borderBottom: '2px solid #f0f4f8', paddingBottom: '0.5rem' }}>
                🏆 Top 10 do Ranking
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {topUsers.map((user, index) => {
                  let icon = '🏅';
                  let color = '#64748b';
                  if (index === 0) { icon = '🏆'; color = '#eab308'; }
                  else if (index === 1) { icon = '🥈'; color = '#94a3b8'; }
                  else if (index === 2) { icon = '🥉'; color = '#b45309'; }

                  const isMe = user.id === profile?.id;

                  return (
                    <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: isMe ? '#eff6ff' : '#f8fafc', borderRadius: '12px', border: isMe ? '2px solid #2C67EA' : '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#0F1849' }}>
                            {user.name} {isMe && <span style={{ fontSize: '0.65rem', backgroundColor: '#2C67EA', color: '#fff', padding: '2px 6px', borderRadius: '10px', marginLeft: '0.5rem', verticalAlign: 'middle' }}>Você</span>}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {user.exact_scores || 0} Exatos | {user.winner_scores || 0} Vencedores | {user.participations || 0} Palpites
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '1.2rem', fontWeight: '900', color }}>{user.points}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>

      </main>
    </div>
  );
}
