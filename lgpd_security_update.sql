-- =========================================================================
-- ATUALIZAÇÃO DE SEGURANÇA E PRIVACIDADE (LGPD)
-- Rode este script inteiramente no SQL Editor do Supabase
-- =========================================================================

-- 1. Criação de uma VIEW pública e segura para o Ranking (esconde CPF e E-mail)
-- O Supabase (Postgres) permite que Views criadas pelo admin leiam a tabela base
-- e exponham apenas as colunas desejadas para o público (Security Definer implícito por ser dono).
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
    id, 
    name, 
    points, 
    exact_scores, 
    user_group, 
    eligible
FROM public.profiles;

-- Libera o acesso de leitura à VIEW para qualquer pessoa (anon ou autenticada)
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2. Fechar as portas da tabela original de Perfis (que contém PII: CPF e Email)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove políticas anteriores que deixavam tudo aberto
DROP POLICY IF EXISTS "Enable all for all" ON public.profiles;

-- Política A: Usuário só pode ler seu próprio perfil (onde o ID dele bate com o Auth)
CREATE POLICY "Users can read own profile" ON public.profiles 
FOR SELECT USING (auth.uid() = id);

-- Política B: Usuário só pode atualizar seu próprio perfil
CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE USING (auth.uid() = id);

-- Política C: Administradores podem ler TODOS os perfis (necessário para o painel de Admin)
CREATE POLICY "Admins can read all profiles" ON public.profiles 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Política D: Administradores podem atualizar TODOS os perfis (necessário para o painel de Admin)
CREATE POLICY "Admins can update all profiles" ON public.profiles 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. Fechar as portas da tabela de Emails Autorizados (contém E-mail e CPF)
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for all" ON public.allowed_emails;

-- Política E: Usuários podem ler sua própria linha (para sincronia de elegibilidade)
CREATE POLICY "Users can read own allowed email" ON public.allowed_emails
FOR SELECT USING (email = auth.jwt()->>'email');

-- Política F: Apenas administradores podem gerenciar tudo
CREATE POLICY "Admins can manage allowed emails" ON public.allowed_emails
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- FIM. O seu sistema agora está em conformidade básica com a LGPD em relação ao acesso ao banco de dados!
