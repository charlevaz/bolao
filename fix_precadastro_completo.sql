-- =========================================================================
-- DIAGNÓSTICO E CORREÇÃO COMPLETA DO PRÉ-CADASTRO
-- Execute TUDO isso de uma vez no SQL Editor do Supabase
-- =========================================================================

-- PASSO 1: Remover qualquer CHECK CONSTRAINT que bloqueia o valor 'pendente'
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND contype = 'c'
    LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        RAISE NOTICE 'Removida: %', r.conname;
    END LOOP;
END;
$$;

-- PASSO 2: Função de mascarar e-mail
CREATE OR REPLACE FUNCTION public.mask_email(email text) RETURNS text AS $$
DECLARE
  parts text[];
  name_part text;
  domain_part text;
BEGIN
  IF email IS NULL OR position('@' in email) = 0 THEN RETURN email; END IF;
  parts := string_to_array(email, '@');
  name_part := parts[1];
  domain_part := parts[2];
  IF length(name_part) <= 2 THEN RETURN name_part || '@' || domain_part; END IF;
  RETURN substr(name_part, 1, 1) || '***' || substr(name_part, length(name_part), 1) || '@' || domain_part;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- PASSO 3: Trigger com suporte a pré-cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_eligible BOOLEAN;
    v_user_group TEXT;
    v_identifier TEXT;
    v_clean_doc TEXT;
    v_cpf_from_db TEXT;
    v_email_from_db TEXT;
BEGIN
    v_identifier := NEW.raw_user_meta_data->>'document';
    v_clean_doc := regexp_replace(COALESCE(v_identifier, ''), '\D', '', 'g');
    IF v_identifier IS NULL OR v_identifier = '' THEN
        v_identifier := NEW.email;
        v_clean_doc  := NEW.email;
    END IF;

    SELECT eligible, user_group, cpf, email
      INTO v_eligible, v_user_group, v_cpf_from_db, v_email_from_db
    FROM public.allowed_emails
    WHERE email = v_identifier OR email = v_clean_doc OR cpf = v_clean_doc
    LIMIT 1;

    IF FOUND AND LOWER(v_email_from_db) != LOWER(NEW.email) THEN
        RAISE EXCEPTION 'A chave informada já está vinculada ao e-mail %. Por favor, faça login com ele.',
            public.mask_email(v_email_from_db);
    END IF;

    IF NOT FOUND THEN
        v_eligible   := false;
        v_user_group := 'pendente';
        v_cpf_from_db := v_clean_doc;
    END IF;

    INSERT INTO public.profiles (id, email, name, cpf, eligible, user_group)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.email,
        COALESCE(NULLIF(v_cpf_from_db, ''), NULL),
        COALESCE(v_eligible, false),
        COALESCE(v_user_group, 'pendente')
    )
    ON CONFLICT (id) DO UPDATE SET
        user_group = EXCLUDED.user_group,
        eligible   = EXCLUDED.eligible;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASSO 4: Recriar o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PASSO 5: Função de verificação prévia de CPF
CREATE OR REPLACE FUNCTION public.check_existing_cpf(p_cpf text, p_email text)
RETURNS text AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM public.allowed_emails WHERE cpf = p_cpf LIMIT 1;
  IF FOUND AND v_email IS NOT NULL AND LOWER(v_email) != LOWER(p_email) THEN
    RETURN public.mask_email(v_email);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_existing_cpf(text, text) TO anon, authenticated;

-- PASSO 6: Inserir manualmente os pré-cadastros que falharam
-- (Busca usuários do Auth que não têm perfil e cria como pendente)
INSERT INTO public.profiles (id, email, name, cpf, eligible, user_group)
SELECT
    u.id,
    u.email,
    u.email,
    NULL,
    false,
    'pendente'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verificação: mostra os pré-cadastros criados
SELECT id, email, user_group, created_at
FROM public.profiles
WHERE user_group = 'pendente'
ORDER BY created_at DESC;
