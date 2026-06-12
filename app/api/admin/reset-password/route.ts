import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // 1. Checa as credenciais de quem chamou (o admin)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      throw new Error('Chave de serviço (SUPABASE_SERVICE_ROLE_KEY) não configurada.');
    }

    // Cria o cliente Supabase com a chave MESTRA para podermos alterar a senha
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Pega o token do header de quem chamou e descobre quem é
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !adminUser) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    // Confirma se esse usuário realmente tem a ROLE de 'admin' no banco
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso Negado: Apenas administradores podem fazer isso.' }, { status: 403 });
    }

    // 2. Extrai os dados que o admin quer alterar
    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Faltam dados: userId ou nova senha.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
    }

    // 3. Executa a alteração na Auth do Supabase!
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, message: 'Senha redefinida com sucesso!' });

  } catch (err: any) {
    console.error('Erro ao redefinir senha:', err.message);
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 });
  }
}
