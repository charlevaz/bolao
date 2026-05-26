"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

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

  const supabase = createClient();

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      // 1. Carregar Perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      // 2. Carregar Ranking (Top 10 do mesmo grupo)
      if (profileData) {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('user_group', profileData.user_group)
          .gt('points', profileData.points);
          
        setRankPos((count || 0) + 1);

        const { data: topData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_group', profileData.user_group)
          .order('points', { ascending: false })
          .limit(10);
        
        if (topData) setTopUsers(topData);
      }

      // 3. Carregar Jogos
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: true });
        
      if (matchesData && matchesData.length > 0) {
        setMatches(matchesData);
        
        // Extrair dias únicos
        const daysMap = new Map();
        const daysFormat: any[] = [];
        
        matchesData.forEach(m => {
          const d = new Date(m.match_date);
          const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
          if (!daysMap.has(dateStr)) {
            daysMap.set(dateStr, true);
            const diasSemana = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
            daysFormat.push({
              date: dateStr,
              label: `${d.getDate()} ${d.toLocaleString('pt-BR', {month: 'short'}).toUpperCase()}`,
              short: diasSemana[d.getDay()]
            });
          }
        });
        
        setUniqueDays(daysFormat);
        if (daysFormat.length > 0) setSelectedDay(daysFormat[0].date);
      }

      // 4. Carregar Palpites
      const { data: guessesData } = await supabase
        .from('guesses')
        .select('*')
        .eq('user_id', user.id);
        
      if (guessesData) {
        setGuesses(guessesData);
        const initialInputs: any = {};
        guessesData.forEach(g => {
          initialInputs[g.match_id] = { a: g.guess_score_a, b: g.guess_score_b };
        });
        setInputScores(initialInputs);
      }
      
      setLoading(false);
    }
    loadDashboard();
  }, []);

  const handleScoreChange = (matchId: string, team: 'a'|'b', delta: number) => {
    setInputScores(prev => {
      const current = prev[matchId] || { a: null, b: null };
      const currentVal = current[team] ?? 0;
      const newVal = Math.max(0, currentVal + delta);
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

  const isLocked = (dateStr: string) => {
    const matchDate = new Date(dateStr).getTime();
    const now = new Date().getTime();
    return now > (matchDate - 60 * 60 * 1000); // 1 hora
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
    return <div style={{ minHeight: '100vh', backgroundColor: '#111315', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#10b981' }}>Carregando sua área...</div>;
  }

  // Filtrar jogos do dia selecionado
  const filteredMatches = matches.filter(m => m.match_date.startsWith(selectedDay));
  const progressPercent = matches.length > 0 ? Math.round((guesses.length / matches.length) * 100) : 0;

  return (
    <div style={{ backgroundColor: '#111315', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* HEADER TOP */}
      <header style={{ backgroundColor: '#181a1f', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a2d35' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#000' }}>
            {profile?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 'bold' }}>{profile?.name}</h1>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>{profile?.points} pts • {profile?.exact_scores} cravadas</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {profile?.role === 'admin' && (
            <Link href="/admin" style={{ padding: '0.4rem 0.8rem', backgroundColor: '#eab308', color: '#000', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}>Admin</Link>
          )}
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.9rem' }}>Sair</button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        
        {/* LADO ESQUERDO: PALPITES (70%) */}
        <section style={{ flex: '1 1 600px' }}>
          
          {/* CARROSSEL DE DIAS */}
          <div style={{ display: 'flex', overflowX: 'auto', gap: '0.5rem', paddingBottom: '1rem', marginBottom: '1rem', scrollbarWidth: 'none' }}>
            {uniqueDays.map((d) => (
              <button 
                key={d.date}
                onClick={() => setSelectedDay(d.date)}
                style={{ 
                  flexShrink: 0,
                  padding: '0.8rem 1.2rem', 
                  backgroundColor: selectedDay === d.date ? '#181a1f' : 'transparent', 
                  border: selectedDay === d.date ? '1px solid #10b981' : '1px solid #2a2d35',
                  borderRadius: '12px',
                  color: selectedDay === d.date ? '#10b981' : '#888',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: '80px'
                }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{d.short}</span>
                <span style={{ fontSize: '1rem', fontWeight: '900', color: selectedDay === d.date ? '#fff' : '#aaa' }}>{d.label}</span>
              </button>
            ))}
          </div>

          {/* BARRA DE PROGRESSO */}
          <div style={{ backgroundColor: '#181a1f', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#aaa' }}>{guesses.length} de {matches.length} palpites feitos</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '50%' }}>
              <div style={{ flex: 1, height: '8px', backgroundColor: '#2a2d35', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#eab308' }}></div>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#eab308', fontWeight: 'bold' }}>{progressPercent}%</span>
            </div>
          </div>

          {/* LISTA DE JOGOS DO DIA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredMatches.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center' }}>Nenhum jogo neste dia.</p>
            ) : filteredMatches.map(match => {
              const locked = isLocked(match.match_date) || match.status === 'finished';
              const myGuess = guesses.find(g => g.match_id === match.id);

              return (
                <div key={match.id} style={{ backgroundColor: '#181a1f', borderRadius: '12px', padding: '1.5rem', border: '1px solid #2a2d35' }}>
                  
                  {/* BADGES SUPERIORES */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {!myGuess && !locked && (
                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid #eab308', color: '#eab308' }}>
                          ⚠️ Sem palpite
                        </span>
                      )}
                      <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '12px', border: locked ? '1px solid #ef4444' : '1px solid #10b981', color: locked ? '#ef4444' : '#10b981' }}>
                        {locked ? '🔒 Encerrado' : `🕒 ${calculateDaysLeft(match.match_date)}`}
                      </span>
                    </div>
                    {myGuess && <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '12px', backgroundColor: '#10b98120', color: '#10b981' }}>✅ Palpitado</span>}
                  </div>

                  {/* INFO DO JOGO */}
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#888', fontSize: '0.8rem' }}>
                    <span style={{ fontWeight: 'bold', color: '#aaa' }}>{match.group_name || 'Fase Final'}</span> • {match.venue || 'Estádio A Definir'}
                  </div>

                  {/* PLACARES */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem' }}>
                    
                    {/* Time A */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100px' }}>
                      {match.flag_a && match.flag_a !== 'un' ? (
                        <img src={`https://flagcdn.com/32x24/${match.flag_a}.png`} alt={match.team_a} style={{ borderRadius: '4px' }} />
                      ) : (
                        <div style={{ width: '32px', height: '24px', backgroundColor: '#2a2d35', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>?</div>
                      )}
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center' }}>{match.team_a}</span>
                    </div>

                    {/* Controles Time A */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button disabled={locked} onClick={() => handleScoreChange(match.id, 'a', -1)} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #2a2d35', backgroundColor: '#111315', color: '#fff', cursor: locked ? 'not-allowed' : 'pointer' }}>-</button>
                      <div style={{ width: '40px', height: '40px', backgroundColor: '#111315', borderRadius: '8px', border: '1px solid #2a2d35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {inputScores[match.id]?.a ?? '-'}
                      </div>
                      <button disabled={locked} onClick={() => handleScoreChange(match.id, 'a', 1)} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #2a2d35', backgroundColor: '#111315', color: '#fff', cursor: locked ? 'not-allowed' : 'pointer' }}>+</button>
                    </div>

                    <span style={{ color: '#555', fontWeight: 'bold' }}>X</span>

                    {/* Controles Time B */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button disabled={locked} onClick={() => handleScoreChange(match.id, 'b', -1)} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #2a2d35', backgroundColor: '#111315', color: '#fff', cursor: locked ? 'not-allowed' : 'pointer' }}>-</button>
                      <div style={{ width: '40px', height: '40px', backgroundColor: '#111315', borderRadius: '8px', border: '1px solid #2a2d35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {inputScores[match.id]?.b ?? '-'}
                      </div>
                      <button disabled={locked} onClick={() => handleScoreChange(match.id, 'b', 1)} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #2a2d35', backgroundColor: '#111315', color: '#fff', cursor: locked ? 'not-allowed' : 'pointer' }}>+</button>
                    </div>

                    {/* Time B */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100px' }}>
                      {match.flag_b && match.flag_b !== 'un' ? (
                        <img src={`https://flagcdn.com/32x24/${match.flag_b}.png`} alt={match.team_b} style={{ borderRadius: '4px' }} />
                      ) : (
                        <div style={{ width: '32px', height: '24px', backgroundColor: '#2a2d35', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>?</div>
                      )}
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center' }}>{match.team_b}</span>
                    </div>

                  </div>

                  {/* Botão Salvar */}
                  {!locked && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', flexDirection: 'column', alignItems: 'center' }}>
                      <button 
                        onClick={() => handleSaveGuess(match.id)}
                        style={{ padding: '0.6rem 2rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%', maxWidth: '300px' }}
                      >
                        {myGuess ? 'Atualizar Palpite' : 'Confirmar Palpite'}
                      </button>
                      {message[match.id] && (
                        <span style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: message[match.id].includes('Erro') || message[match.id].includes('bloqueado') ? '#ef4444' : '#10b981' }}>
                          {message[match.id]}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Resultado Real (se finalizado) */}
                  {match.status === 'finished' && (
                    <div style={{ marginTop: '1.5rem', backgroundColor: '#111315', padding: '1rem', borderRadius: '8px', textAlign: 'center', border: '1px solid #2a2d35' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#aaa' }}>Resultado Oficial: <strong>{match.score_a} x {match.score_b}</strong></p>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#10b981', fontWeight: 'bold' }}>Você ganhou +{myGuess?.points_earned || 0} pontos</p>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </section>

        {/* LADO DIREITO: RANKING (30%) */}
        <aside style={{ flex: '1 1 300px', maxWidth: '400px' }}>
          <div style={{ backgroundColor: '#181a1f', borderRadius: '12px', padding: '1.5rem', border: '1px solid #2a2d35', position: 'sticky', top: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🏆 Ranking ao Vivo
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {topUsers.map((user, index) => {
                let icon = '🏅';
                let color = '#888';
                if (index === 0) { icon = '🏆'; color = '#eab308'; }
                else if (index === 1) { icon = '🥈'; color = '#cbd5e1'; }
                else if (index === 2) { icon = '🥉'; color = '#b45309'; }

                const isMe = user.id === profile?.id;

                return (
                  <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem', backgroundColor: isMe ? '#10b98115' : '#111315', borderRadius: '8px', border: isMe ? '1px solid #10b98150' : '1px solid #2a2d35' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: isMe ? '#10b981' : '#fff' }}>
                          {user.name} {isMe && <span style={{ fontSize: '0.6rem', backgroundColor: '#10b981', color: '#000', padding: '2px 6px', borderRadius: '10px', marginLeft: '0.5rem' }}>Você</span>}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#666' }}>{user.exact_scores} cravadas</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '1.1rem', fontWeight: '900', color }}>{user.points}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

      </main>
    </div>
  );
}
