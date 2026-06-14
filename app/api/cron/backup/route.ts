import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 segundos de limite no Vercel (Hobby)

function toCsv(items: any[]) {
  if (!items || items.length === 0) return '';
  const header = Object.keys(items[0]).join(',');
  const rows = items.map(obj => 
    Object.values(obj).map(v => {
      if (v === null || v === undefined) return '""';
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const bypass = url.searchParams.get('bypass');
    const authHeader = request.headers.get('authorization');
    
    // Autenticação (via Vercel Cron Secret ou bypass na URL)
    if (
      bypass !== process.env.CRON_PASS && 
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Extrair os dados
    const { data: profiles } = await supabaseAdmin.from('profiles').select('*');
    const { data: guesses } = await supabaseAdmin.from('guesses').select('*');
    const { data: matches } = await supabaseAdmin.from('matches').select('*');

    // 2. Converter para CSV
    const profilesCsv = toCsv(profiles || []);
    const guessesCsv = toCsv(guesses || []);
    const matchesCsv = toCsv(matches || []);

    // 3. Preparar o E-mail
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('Credenciais SMTP não configuradas.');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    await transporter.sendMail({
      from: `"Bolão Backup" <${process.env.SMTP_USER}>`,
      to: 'charlejvaz@gmail.com', // Enviando apenas para o admin, conforme solicitado
      subject: `📦 Backup Automático do Bolão - ${dataHora}`,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Backup Concluído com Sucesso!</h2>
          <p>Data e Hora: <strong>${dataHora}</strong></p>
          <p>O sistema extraiu automaticamente os dados do banco de dados.</p>
          <p>As planilhas (formato CSV) estão anexadas a este e-mail. Elas podem ser abertas diretamente no Excel ou importadas no Google Sheets.</p>
          <ul>
            <li>Usuários: ${profiles?.length || 0} registros</li>
            <li>Palpites: ${guesses?.length || 0} registros</li>
            <li>Jogos: ${matches?.length || 0} registros</li>
          </ul>
        </div>
      `,
      attachments: [
        {
          filename: `usuarios_backup.csv`,
          content: profilesCsv
        },
        {
          filename: `palpites_backup.csv`,
          content: guessesCsv
        },
        {
          filename: `jogos_backup.csv`,
          content: matchesCsv
        }
      ]
    });

    return NextResponse.json({ success: true, message: 'Backup enviado com sucesso!' });
  } catch (error: any) {
    console.error('[Backup Cron] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
