"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [rankPos, setRankPos] = useState<number | null>(null);
  
  const [matches, setMatches] = useState<any[]>([]);
  const [guesses, setGuesses] = useState<any[]>([]);
  
  // Controle de formulários (scores sendo digitados)
  const [inputScores, setInputScores] = useState<{[key: string]: {a: string, b: string}}>({});
  const [message, setMessage] = useState<{[key: string]: string}>({});

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

      // 2. Calcular Posição no Ranking (Dentro do mesmo Grupo)
      if (profileData) {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('user_group', profileData.user_group)
          .gt('points', profileData.points);
          
        setRankPos((count || 0) + 1);
      }

      // 3. Carregar Jogos Pendentes e Finalizados
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: true });
        
      if (matchesData) setMatches(matchesData);

      // 4. Carregar Palpites deste Usuário
      const { data: guessesData } = await supabase
        .from('guesses')
        .select('*')
        .eq('user_id', user.id);
        
      if (guessesData) {
        setGuesses(guessesData);
        
        // Preencher inputs com palpites já feitos
        const initialInputs: any = {};
        guessesData.forEach(g => {
          initialInputs[g.match_id] = { a: String(g.guess_score_a), b: String(g.guess_score_b) };
        });
        setInputScores(initialInputs);
      }
      
      setLoading(false);
    }
    loadDashboard();
  }, []);

  const handleSaveGuess = async (matchId: string) => {
    if (!profile) return;
    
    const scoreA = inputScores[matchId]?.a;
    const scoreB = inputScores[matchId]?.b;
    
    if (!scoreA || !scoreB) {
      setMessage({...message, [matchId]: 'Preencha os dois gols!'});
      return;
    }

    setMessage({...message, [matchId]: 'Salvando...'});

    const existingGuess = guesses.find(g => g.match_id === matchId);

    let error;
    if (existingGuess) {
      // Atualizar palpite
      const res = await supabase.from('guesses').update({
        guess_score_a: parseInt(scoreA),
        guess_score_b: parseInt(scoreB)
      }).eq('id', existingGuess.id);
      error = res.error;
    } else {
      // Criar palpite
      const res = await supabase.from('guesses').insert([{
        user_id: profile.id,
        match_id: matchId,
        guess_score_a: parseInt(scoreA),
        guess_score_b: parseInt(scoreB)
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
      setMessage({...message, [matchId]: '✅ Palpite Salvo!'});
      // Atualiza lista local
      const { data } = await supabase.from('guesses').select('*').eq('user_id', profile.id);
      if (data) setGuesses(data);
      
      // Limpa a mensagem de sucesso após 3 segundos
      setTimeout(() => {
        setMessage(prev => ({...prev, [matchId]: ''}));
      }, 3000);
    }
  };

  const isLocked = (dateStr: string) => {
    const matchDate = new Date(dateStr).getTime();
    const now = new Date().getTime();
    // 1 hora de antecedência (em milissegundos)
    return now > (matchDate - 60 * 60 * 1000);
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' }}>Carregando sua área...</div>;
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', color: '#333' }}>
      
      {/* HEADER DO JOGADOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#fff', margin: 0 }}>Olá, {profile?.name}</h1>
          <p style={{ color: '#2C67EA', margin: 0, textTransform: 'uppercase', fontSize: '0.9rem', fontWeight: 'bold' }}>
            Grupo: {profile?.user_group}
          </p>
        </div>
        
        {profile?.role === 'admin' && (
          <Link href="/admin" style={{ padding: '0.6rem 1rem', backgroundColor: '#eab308', color: '#000', borderRadius: '6px', fontWeight: 'bold', textDecoration: 'none' }}>
            Painel Admin
          </Link>
        )}
      </div>

      {/* PLACAR E RANKING DO JOGADOR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        <div style={{ backgroundColor: '#2C67EA', padding: '1.5rem', borderRadius: '12px', color: '#fff', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', opacity: 0.8 }}>Sua Posição</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{rankPos}º</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>no ranking</div>
        </div>
        <div style={{ backgroundColor: '#0F1849', padding: '1.5rem', borderRadius: '12px', color: '#fff', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', opacity: 0.8 }}>Total de Pontos</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#4ade80' }}>{profile?.points}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>pontos</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', color: '#0F1849', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', opacity: 0.6, fontWeight: 'bold' }}>Cravadas</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>{profile?.exact_scores}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 'bold' }}>placares exatos</div>
        </div>
      </div>

      {/* LISTA DE JOGOS */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#0F1849', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem' }}>
          Meus Palpites
        </h2>

        {matches.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '2rem 0' }}>Nenhum jogo disponível ainda.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {matches.map(match => {
              const locked = isLocked(match.match_date) || match.status === 'finished';
              const myGuess = guesses.find(g => g.match_id === match.id);

              return (
                <div key={match.id} style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '8px', backgroundColor: locked ? '#f9f9fa' : '#fff', opacity: locked ? 0.8 : 1 }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#888', marginBottom: '1rem', fontWeight: 'bold' }}>
                    <span>{new Date(match.match_date).toLocaleString('pt-BR')}</span>
                    {locked && <span style={{ color: '#ef4444' }}>🔒 FECHADO</span>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    
                    {/* Time A */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '120px', justifyContent: 'flex-end' }}>
                      <span style={{ fontWeight: 'bold', textAlign: 'right' }}>{match.team_a}</span>
                      {match.flag_a && match.flag_a.startsWith('http') ? (
                         <img src={match.flag_a} alt={match.team_a} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                      ) : match.flag_a && (
                         <img src={`https://flagcdn.com/24x18/${match.flag_a}.png`} alt={match.team_a} />
                      )}
                    </div>
                    
                    {/* Placar Input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input 
                        type="number" 
                        min="0"
                        value={inputScores[match.id]?.a ?? ''}
                        onChange={(e) => setInputScores({...inputScores, [match.id]: {...inputScores[match.id], a: e.target.value}})}
                        disabled={locked}
                        style={{ width: '50px', padding: '0.8rem 0.5rem', textAlign: 'center', borderRadius: '6px', border: '2px solid #ccc', fontSize: '1.2rem', fontWeight: 'bold', backgroundColor: locked ? '#eee' : '#fff' }} 
                      />
                      <span style={{ color: '#888', fontWeight: 'bold' }}>X</span>
                      <input 
                        type="number" 
                        min="0"
                        value={inputScores[match.id]?.b ?? ''}
                        onChange={(e) => setInputScores({...inputScores, [match.id]: {...inputScores[match.id], b: e.target.value}})}
                        disabled={locked}
                        style={{ width: '50px', padding: '0.8rem 0.5rem', textAlign: 'center', borderRadius: '6px', border: '2px solid #ccc', fontSize: '1.2rem', fontWeight: 'bold', backgroundColor: locked ? '#eee' : '#fff' }} 
                      />
                    </div>
                    
                    {/* Time B */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '120px', justifyContent: 'flex-start' }}>
                      {match.flag_b && match.flag_b.startsWith('http') ? (
                         <img src={match.flag_b} alt={match.team_b} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                      ) : match.flag_b && (
                         <img src={`https://flagcdn.com/24x18/${match.flag_b}.png`} alt={match.team_b} />
                      )}
                      <span style={{ fontWeight: 'bold', textAlign: 'left' }}>{match.team_b}</span>
                    </div>

                  </div>

                  {/* Área do Botão e Mensagens */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', flexDirection: 'column', alignItems: 'center' }}>
                    {!locked && (
                      <button 
                        onClick={() => handleSaveGuess(match.id)}
                        style={{ padding: '0.6rem 2rem', backgroundColor: '#2C67EA', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                      >
                        {myGuess ? 'Atualizar Palpite' : 'Enviar Palpite'}
                      </button>
                    )}
                    
                    {message[match.id] && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: message[match.id].includes('Erro') || message[match.id].includes('bloqueado') ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                        {message[match.id]}
                      </div>
                    )}

                    {/* Exibir o Placar Real e Pontos se finalizado */}
                    {match.status === 'finished' && (
                      <div style={{ marginTop: '1rem', backgroundColor: '#0F1849', color: '#fff', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.9rem', textAlign: 'center', width: '100%' }}>
                        Placar Real: <strong>{match.score_a} x {match.score_b}</strong> <br/>
                        Você ganhou: <strong style={{ color: '#4ade80' }}>+{myGuess?.points_earned || 0} pontos</strong>
                      </div>
                    )}

                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
      
    </div>
  );
}
