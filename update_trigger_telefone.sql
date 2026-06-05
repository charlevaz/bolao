-- =========================================================================
-- ATUALIZAÇÃO DO GATILHO: PRÉ-CADASTRO E PROTEÇÃO DE CPF DUPLICADO
-- =========================================================================

-- Função auxiliar para mascarar o e-mail
CREATE OR REPLACE FUNCTION public.mask_email(email text) RETURNS text AS $$
DECLARE
  parts text[];
  name_part text;
  domain_part text;
BEGIN
  IF email IS NULL OR position('@' in email) = 0 THEN
    RETURN email;
  END IF;
  parts := string_to_array(email, '@');
  name_part := parts[1];
  domain_part := parts[2];
  IF length(name_part) <= 2 THEN
    RETURN name_part || '@' || domain_part;
  END IF;
  RETURN substr(name_part, 1, 1) || '***' || substr(name_part, length(name_part), 1) || '@' || domain_part;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Atualização do gatilho principal
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
    -- 1. Pega o documento digitado pelo usuário na tela de cadastro (ex: celular ou cpf)
    v_identifier := NEW.raw_user_meta_data->>'document';
    
    -- Limpa a formatação (remove tudo que não for número) para facilitar a comparação
    v_clean_doc := regexp_replace(v_identifier, '\D', '', 'g');

    -- Se ele não digitou nada, voltamos ao comportamento antigo usando o email
    IF v_identifier IS NULL OR v_identifier = '' THEN
        v_identifier := NEW.email;
        v_clean_doc := NEW.email;
    END IF;

    -- 2. Procura a autorização na tabela allowed_emails
    SELECT eligible, user_group, cpf, email INTO v_eligible, v_user_group, v_cpf_from_db, v_email_from_db
    FROM public.allowed_emails 
    WHERE email = v_identifier 
       OR email = v_clean_doc 
       OR cpf = v_clean_doc
    LIMIT 1;

    -- Cenário A: O CPF/Celular foi encontrado, mas está vinculado a um E-MAIL DIFERENTE!
    IF FOUND AND LOWER(v_email_from_db) != LOWER(NEW.email) THEN
        RAISE EXCEPTION 'A chave informada já está vinculada ao e-mail %. Por favor, faça login com ele.', public.mask_email(v_email_from_db);
    END IF;

    -- Cenário B: Não encontrou nada (Pré-Cadastro)
    IF NOT FOUND THEN
        v_eligible := false;
        v_user_group := 'pendente';
        v_cpf_from_db := v_identifier;
    END IF;

    -- 3. Cria o perfil do usuário
    INSERT INTO public.profiles (id, email, name, cpf, eligible, user_group)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.email,
        COALESCE(v_cpf_from_db, v_identifier),
        v_eligible,
        v_user_group
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
