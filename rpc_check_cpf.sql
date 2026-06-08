-- Criar uma função pública para consultar o e-mail mascarado
CREATE OR REPLACE FUNCTION public.check_existing_cpf(p_cpf text, p_email text)
RETURNS text AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email
  FROM public.allowed_emails
  WHERE cpf = p_cpf
  LIMIT 1;

  IF FOUND AND v_email IS NOT NULL THEN
    -- Se o e-mail que o usuário está tentando usar for DIFERENTE do e-mail salvo, mostra o erro.
    -- Se for igual, permite prosseguir (retorna NULL).
    IF LOWER(v_email) != LOWER(p_email) THEN
      RETURN public.mask_email(v_email);
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão para usuários anônimos (deslogados) executarem essa função
GRANT EXECUTE ON FUNCTION public.check_existing_cpf(text, text) TO anon, authenticated;
