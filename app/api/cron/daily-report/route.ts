import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    console.log('[Daily Report Cron] Job started');

    const authHeader = request.headers.get('authorization');
    const url = new URL(request.url);
    const bypassKey = url.searchParams.get('bypass');
    
    const cronSecret = process.env.CRON_SECRET;
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isBypassAuthorized = !!(bypassKey && cronSecret && bypassKey === cronSecret);

    if (!isDevelopment && !isBypassAuthorized && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Daily Report Cron] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseKey) {
      console.error('[Daily Report Cron] SUPABASE_SERVICE_ROLE_KEY is missing');
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Today and Yesterday date strings in America/Sao_Paulo timezone
    const getBrtDateStr = (date: Date) => {
      return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
    };

    const getMatchLocalDateStr = (matchDateStr: string) => {
      try {
        return new Date(matchDateStr).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
      } catch (e) {
        return '';
      }
    };

    const now = new Date();
    const todayStr = getBrtDateStr(now);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = getBrtDateStr(yesterday);

    console.log(`[Daily Report Cron] Date range - Today (BRT): ${todayStr}, Yesterday (BRT): ${yesterdayStr}`);

    // 1. Fetch all profiles
    console.log('[Daily Report Cron] Fetching profiles...');
    const { data: allProfiles, error: profErr } = await supabase
      .from('profiles')
      .select('*');
    
    if (profErr || !allProfiles) {
      console.error('[Daily Report Cron] Error fetching profiles:', profErr);
      throw new Error(profErr?.message || 'Error fetching profiles');
    }
    
    const profiles = allProfiles.filter(p => p.eligible !== false && p.user_group !== 'pendente' && p.user_group !== 'rejeitado');
    console.log(`[Daily Report Cron] Found ${profiles.length} eligible profiles (out of ${allProfiles.length} total)`);

    // 2. Fetch all matches
    console.log('[Daily Report Cron] Fetching matches...');
    const { data: allMatches, error: matchesErr } = await supabase
      .from('matches')
      .select('*');

    if (matchesErr || !allMatches) {
      console.error('[Daily Report Cron] Error fetching matches:', matchesErr);
      throw new Error(matchesErr?.message || 'Error fetching matches');
    }

    const todayMatches = allMatches.filter(m => getMatchLocalDateStr(m.match_date) === todayStr);
    const yesterdayMatches = allMatches.filter(m => getMatchLocalDateStr(m.match_date) === yesterdayStr);

    console.log(`[Daily Report Cron] Today matches: ${todayMatches.length}, Yesterday matches: ${yesterdayMatches.length}`);

    // 3. Fetch Guesses for these matches
    const matchIds = [...todayMatches, ...yesterdayMatches].map(m => m.id);
    let allGuesses: any[] = [];
    
    if (matchIds.length > 0) {
      console.log(`[Daily Report Cron] Fetching guesses for ${matchIds.length} matches...`);
      let from = 0;
      const step = 1000;
      while (true) {
        const { data: guesses, error: guessErr } = await supabase
          .from('guesses')
          .select('*')
          .in('match_id', matchIds)
          .range(from, from + step - 1);
          
        if (guessErr) {
          console.error('[Daily Report Cron] Error fetching guesses:', guessErr);
          break;
        }
        if (!guesses || guesses.length === 0) break;
        allGuesses = [...allGuesses, ...guesses];
        if (guesses.length < step) break;
        from += step;
      }
      console.log(`[Daily Report Cron] Fetched ${allGuesses.length} guesses`);
    }

    const SITE_URL = 'https://bolao.crmasterdelivery.online';
    
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('[Daily Report Cron] SMTP credentials are not configured');
      throw new Error('SMTP credentials are not configured');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      pool: true,
      maxConnections: 5,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const emailsToSend = [];

    for (const profile of profiles) {
      const userGuesses = allGuesses.filter(g => g.user_id === profile.id);
      
      const todayMatchCount = todayMatches.length;
      const userTodayGuesses = userGuesses.filter(g => todayMatches.some(m => m.id === g.match_id)).length;
      const missingToday = todayMatchCount - userTodayGuesses;

      let yesterdayHtml = '';
      
      if (yesterdayMatches.length > 0) {
        yesterdayHtml = yesterdayMatches.map(m => {
          const guess = userGuesses.find(g => g.match_id === m.id);
          const points = guess?.points_earned || 0;
          
          let guessText = guess ? `${guess.guess_score_a} x ${guess.guess_score_b}` : 'Não palpitou';
          let realScore = (m.score_a !== null && m.score_b !== null) ? `${m.score_a} x ${m.score_b}` : 'Pendente';
          
          return `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
              <div style="font-weight: bold; color: #1e3a8a; font-size: 1.1em; margin-bottom: 8px; text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">${m.team_a} x ${m.team_b}</div>
              <div style="background-color: #fff; padding: 12px; border-radius: 6px; text-align: center;">
                <div style="margin-bottom: 6px; font-size: 0.95em; color: #475569;">Oficial: <strong style="color: #0f172a; font-size: 1.1em;">${realScore}</strong></div>
                <div style="margin-bottom: 12px; font-size: 0.95em; color: #475569;">Seu Palpite: <strong style="color: #0f172a; font-size: 1.1em;">${guessText}</strong></div>
                <div><span style="font-size: 1.1em; color: #b45309; font-weight: bold; padding: 6px 12px; background-color: #fef9c3; border-radius: 6px; display: inline-block;">+${points} pts ganhos</span></div>
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
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #334155; line-height: 1.6; background-color: #f1f5f9; padding: 10px; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px; background-color: white; padding: 15px 5px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
            <img src="${SITE_URL}/logo-aldeota.png" style="max-width: 28%; height: auto; margin: 0 2%; vertical-align: middle;" alt="Aldeota"/>
            <img src="${SITE_URL}/logo-recreio.png" style="max-width: 28%; height: auto; margin: 0 2%; vertical-align: middle;" alt="Recreio"/>
            <img src="${SITE_URL}/logo-sumarezinho.png" style="max-width: 28%; height: auto; margin: 0 2%; vertical-align: middle;" alt="Sumarezinho"/>
          </div>
          
          <div style="background-color: white; padding: 20px 15px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
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

    console.log(`[Daily Report Cron] Ready to send ${emailsToSend.length} emails. Starting batched sending...`);

    let sentCount = 0;
    const batchSize = 10;
    for (let i = 0; i < emailsToSend.length; i += batchSize) {
      const batch = emailsToSend.slice(i, i + batchSize);
      console.log(`[Daily Report Cron] Sending batch ${Math.floor(i / batchSize) + 1} (${batch.length} emails)...`);
      
      await Promise.allSettled(
        batch.map(email => 
          transporter.sendMail({
            from: `"Equipe Bolão" <${process.env.SMTP_USER}>`,
            to: email.to,
            subject: email.subject,
            html: email.html,
          }).then(() => {
            sentCount++;
            console.log(`[Daily Report Cron] Email successfully sent to ${email.to}`);
          }).catch(err => {
            console.error(`[Daily Report Cron] Failed to send email to ${email.to}:`, err);
          })
        )
      );
    }

    console.log(`[Daily Report Cron] Finished sending emails. Total sent: ${sentCount}/${profiles.length}`);
    return NextResponse.json({ success: true, totalSent: sentCount, totalUsers: profiles.length });

  } catch (error: any) {
    console.error('[Daily Report Cron] Cron job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
