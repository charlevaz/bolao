import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // O ideal é usar o SERVICE_ROLE_KEY para ignorar o RLS de segurança (pois o cron não está logado)
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate Today and Yesterday in BRT (UTC-3)
    const now = new Date();
    const brtOffset = -3 * 60 * 60 * 1000;
    const nowBrt = new Date(now.getTime() + brtOffset);
    
    const todayStr = nowBrt.toISOString().split('T')[0];
    
    const yesterdayBrt = new Date(nowBrt.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterdayBrt.toISOString().split('T')[0];

    // 1. Fetch all eligible profiles
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('eligible', true);
    
    if (profErr || !profiles) throw new Error(profErr?.message || 'Error fetching profiles');

    // 2. Fetch Today's matches
    const { data: todayMatches } = await supabase
      .from('matches')
      .select('*')
      .like('match_date', `${todayStr}%`);

    // 3. Fetch Yesterday's matches
    const { data: yesterdayMatches } = await supabase
      .from('matches')
      .select('*')
      .like('match_date', `${yesterdayStr}%`);

    // 4. Fetch Guesses
    const matchIds = [...(todayMatches || []), ...(yesterdayMatches || [])].map(m => m.id);
    let allGuesses: any[] = [];
    
    if (matchIds.length > 0) {
      // Loop pagination for guesses just in case there are many users
      let from = 0;
      const step = 1000;
      while (true) {
        const { data: guesses, error } = await supabase
          .from('guesses')
          .select('*')
          .in('match_id', matchIds)
          .range(from, from + step - 1);
          
        if (error || !guesses || guesses.length === 0) break;
        allGuesses = [...allGuesses, ...guesses];
        if (guesses.length < step) break;
        from += step;
      }
    }

    const SITE_URL = 'https://bolao.crmasterdelivery.online';
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const emailsToSend = [];

    for (const profile of profiles) {
      const userGuesses = allGuesses.filter(g => g.user_id === profile.id);
      
      const todayMatchCount = todayMatches?.length || 0;
      const userTodayGuesses = userGuesses.filter(g => todayMatches?.some(m => m.id === g.match_id)).length;
      const missingToday = todayMatchCount - userTodayGuesses;

      let yesterdayHtml = '';
      
      if (yesterdayMatches && yesterdayMatches.length > 0) {
        yesterdayHtml = yesterdayMatches.map(m => {
          const guess = userGuesses.find(g => g.match_id === m.id);
          const points = guess?.points_earned || 0;
          
          let guessText = guess ? `${guess.guess_score_a} x ${guess.guess_score_b}` : 'Não palpitou';
          let realScore = (m.score_a !== null && m.score_b !== null) ? `${m.score_a} x ${m.score_b}` : 'Pendente';
          
          return `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 10px;">
              <div style="font-weight: bold; color: #1e3a8a; font-size: 1.1em; margin-bottom: 5px;">${m.team_a} x ${m.team_b}</div>
              <div style="display: flex; justify-content: space-between; align-items: center; background-color: #fff; padding: 8px; border-radius: 4px;">
                <span style="font-size: 0.9em; color: #475569;">Placar Real: <strong>${realScore}</strong></span>
                <span style="font-size: 0.9em; color: #475569;">Seu Palpite: <strong>${guessText}</strong></span>
                <span style="font-size: 1em; color: #eab308; font-weight: bold; padding: 4px 8px; background-color: #fef9c3; border-radius: 4px;">+${points} pts</span>
              </div>
            </div>
          `;
        }).join('');
      } else {
        yesterdayHtml = '<p style="color: #64748b; font-style: italic;">Nenhum jogo ocorreu ontem.</p>';
      }

      let todayHtml = '';
      if (todayMatchCount > 0) {
        if (missingToday > 0) {
          todayHtml = `
            <div style="background-color: #fef2f2; border-left: 5px solid #ef4444; padding: 15px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <div style="color: #b91c1c; font-size: 1.1em; margin-bottom: 8px;">⚠️ <strong>Atenção! Faltam palpites!</strong></div>
              Você ainda tem <strong>${missingToday} jogo(s)</strong> para palpitar hoje. Não perca a chance de pontuar!<br/><br/>
              <a href="${SITE_URL}" style="display: inline-block; background-color: #ef4444; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold;">Corra e faça seus palpites!</a>
            </div>
          `;
        } else {
          todayHtml = `
            <div style="background-color: #ecfdf5; border-left: 5px solid #10b981; padding: 15px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <div style="color: #047857; font-size: 1.1em; margin-bottom: 8px;">✅ <strong>Tudo certo!</strong></div>
              Você já preencheu todos os <strong>${todayMatchCount} palpites</strong> de hoje. Boa sorte e bom jogo!
            </div>
          `;
        }
      } else {
        todayHtml = '<p style="color: #64748b; font-style: italic;">Nenhum jogo programado para hoje. Aproveite o descanso!</p>';
      }

      const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #334155; line-height: 1.6; background-color: #f1f5f9; padding: 20px; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 25px; background-color: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
            <img src="${SITE_URL}/logo-aldeota.png" style="height: 45px; margin: 0 15px; vertical-align: middle;" alt="Aldeota"/>
            <img src="${SITE_URL}/logo-recreio.png" style="height: 45px; margin: 0 15px; vertical-align: middle;" alt="Recreio"/>
            <img src="${SITE_URL}/logo-sumarezinho.png" style="height: 45px; margin: 0 15px; vertical-align: middle;" alt="Sumarezinho"/>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h2 style="color: #1e3a8a; text-align: center; font-size: 1.8em; margin-top: 0;">Resumo Diário - Bolão</h2>
            
            <p style="font-size: 1.1em;">Olá, <strong>${profile.name}</strong>!</p>
            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 1.1em;">Sua pontuação atual:</span><br/>
              <span style="font-size: 2.5em; font-weight: bold; color: #eab308;">${profile.points || 0} pts</span>
            </div>
            
            <h3 style="color: #1e3a8a; border-bottom: 2px solid #eab308; padding-bottom: 5px; margin-top: 30px; display: inline-block;">📅 O que rola Hoje</h3>
            ${todayHtml}

            <h3 style="color: #1e3a8a; border-bottom: 2px solid #eab308; padding-bottom: 5px; margin-top: 40px; display: inline-block;">🔙 Resumo de Ontem</h3>
            ${yesterdayHtml}
            
            <div style="margin-top: 40px; text-align: center;">
              <a href="${SITE_URL}" style="background-color: #1e3a8a; color: #eab308; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 1.1em; display: inline-block; box-shadow: 0 4px 6px rgba(30, 58, 138, 0.3);">Acessar o Painel do Bolão</a>
            </div>
          </div>
          
          <p style="text-align: center; font-size: 0.85em; color: #94a3b8; margin-top: 25px;">
            Este é um e-mail automático enviado pelo sistema do Bolão EntreGô.<br/>
            Por favor, não responda a esta mensagem.
          </p>
        </div>
      `;

      emailsToSend.push({
        to: profile.email,
        subject: `[Bolão] Seu resumo diário: ${profile.points || 0} pts ⚽`,
        html
      });
    }

    let sentCount = 0;
    for (const email of emailsToSend) {
      try {
        await transporter.sendMail({
          from: `"Equipe Bolão" <${process.env.SMTP_USER}>`,
          to: email.to,
          subject: email.subject,
          html: email.html,
        });
        sentCount++;
      } catch (err) {
        console.error(`Failed to send email to ${email.to}:`, err);
      }
    }

    return NextResponse.json({ success: true, totalSent: sentCount, totalUsers: profiles.length });

  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
