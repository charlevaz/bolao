import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'E-mail é obrigatório.' }, { status: 400 });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json(
        { success: false, error: 'Credenciais SMTP não configuradas.' },
        { status: 500 }
      );
    }

    // Usa a service_role key para gerar o link de reset
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bolao.crmasterdelivery.online';

    // Gera o link de recuperação de senha via Supabase Admin API
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${siteUrl}/reset-password`,
      },
    });

    if (error) {
      // Se o e-mail não existe, não revelamos isso por segurança
      if (error.message.includes('User not found') || error.message.includes('Unable to validate')) {
        return NextResponse.json({ success: true }); // Responde como se tivesse enviado
      }
      console.error('Supabase generateLink error:', error.message);
      return NextResponse.json({ success: false, error: 'Erro ao gerar link de recuperação.' }, { status: 500 });
    }

    // O Supabase retorna o link completo com token
    const resetLink = data?.properties?.action_link;

    if (!resetLink) {
      return NextResponse.json({ success: false, error: 'Não foi possível gerar o link.' }, { status: 500 });
    }

    // Envia o e-mail via Gmail (mesmo transporter do relatório diário)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const htmlEmail = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 2rem;">
        <div style="background: linear-gradient(135deg, #0F1849 0%, #2C67EA 100%); border-radius: 12px; padding: 2rem; text-align: center; margin-bottom: 1.5rem;">
          <h1 style="color: #fff; margin: 0; font-size: 1.5rem;">🔒 Redefinir Senha</h1>
          <p style="color: #cbd5e1; margin: 0.5rem 0 0 0; font-size: 0.9rem;">Bolão EntreGô</p>
        </div>
        <div style="background-color: #fff; border-radius: 12px; padding: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <p style="color: #334155; font-size: 1rem; line-height: 1.6;">
            Olá! Recebemos uma solicitação para redefinir a senha da sua conta.
          </p>
          <p style="color: #334155; font-size: 1rem; line-height: 1.6;">
            Clique no botão abaixo para criar uma nova senha:
          </p>
          <div style="text-align: center; margin: 2rem 0;">
            <a href="${resetLink}" style="display: inline-block; background-color: #2C67EA; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 1rem;">
              Redefinir Minha Senha
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 0.85rem; line-height: 1.5;">
            Se você não solicitou a redefinição de senha, ignore este e-mail. O link expira em 24 horas.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0;" />
          <p style="color: #94a3b8; font-size: 0.75rem; text-align: center;">
            Se o botão não funcionar, copie e cole este link no navegador:<br/>
            <a href="${resetLink}" style="color: #2C67EA; word-break: break-all;">${resetLink}</a>
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Bolão EntreGô" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🔒 Redefinir sua senha - Bolão EntreGô',
      html: htmlEmail,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
