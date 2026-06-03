-- =========================================================================
-- ATUALIZAÇÃO DO GATILHO DE SEGURANÇA: REPARO DE CPF (ENTREGÔ E BARBEARIA)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_eligible BOOLEAN;
    v_user_group TEXT;
    v_identifier TEXT;
    v_clean_doc TEXT;
    v_cpf_from_db TEXT;
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

    -- 2. Procura a autorização na tabela allowed_emails e puxa também o CPF cadastrado lá
    SELECT eligible, user_group, cpf INTO v_eligible, v_user_group, v_cpf_from_db
    FROM public.allowed_emails 
    WHERE email = v_identifier 
       OR email = v_clean_doc 
       OR cpf = v_clean_doc;

    -- Se não encontrar, barra o cadastro e retorna erro
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Acesso Negado: Chave não autorizada pela Gestão.';
    END IF;

    -- 3. Cria o perfil do usuário conectando a chave, o e-mail real e o grupo
    -- A prioridade do CPF será: o que está no banco > o que ele digitou (caso seja celular)
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
