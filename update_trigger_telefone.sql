-- =========================================================================
-- ATUALIZAÇÃO DO GATILHO DE SEGURANÇA: AUTORIZAÇÃO POR CELULAR
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_eligible BOOLEAN;
    v_user_group TEXT;
    v_identifier TEXT;
    v_clean_doc TEXT;
BEGIN
    -- 1. Pega o documento digitado pelo usuário na tela de cadastro (ex: celular)
    v_identifier := NEW.raw_user_meta_data->>'document';
    
    -- Limpa a formatação (remove tudo que não for número) para facilitar a comparação
    v_clean_doc := regexp_replace(v_identifier, '\D', '', 'g');

    -- Se ele não digitou nada, voltamos ao comportamento antigo usando o email
    IF v_identifier IS NULL OR v_identifier = '' THEN
        v_identifier := NEW.email;
        v_clean_doc := NEW.email;
    END IF;

    -- 2. Procura a autorização na tabela allowed_emails usando:
    --    - O E-mail exato OR
    --    - A chave exata que você cadastrou no Admin OR
    --    - O CPF/Celular que você cadastrou
    SELECT eligible, user_group INTO v_eligible, v_user_group 
    FROM public.allowed_emails 
    WHERE email = v_identifier 
       OR email = v_clean_doc 
       OR cpf = v_clean_doc;

    -- Se não encontrar, barra o cadastro e retorna erro
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Acesso Negado: Celular ou E-mail não autorizado pela Gestão.';
    END IF;

    -- 3. Cria o perfil do usuário conectando a chave, o e-mail real e o grupo
    INSERT INTO public.profiles (id, email, name, cpf, eligible, user_group)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.email,
        v_identifier,
        v_eligible,
        v_user_group
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
