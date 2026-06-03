-- Correção de Segurança (RLS Infinita)
-- Rode isto no SQL Editor do Supabase (Barbearia e EntreGô)

-- 1. Cria uma função segura que contorna o RLS temporariamente para checar se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recria as políticas da tabela Profiles usando a função segura
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can read all profiles" ON public.profiles 
FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update all profiles" ON public.profiles 
FOR UPDATE USING (public.is_admin());

-- 3. Recria a política da tabela allowed_emails usando a função segura
DROP POLICY IF EXISTS "Admins can manage allowed emails" ON public.allowed_emails;

CREATE POLICY "Admins can manage allowed emails" ON public.allowed_emails 
FOR ALL USING (public.is_admin());

-- FIM DA CORREÇÃO!
