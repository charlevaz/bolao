-- Recuperar CPFs apagados acidentalmente da tabela allowed_emails (Versão Forte)
UPDATE public.allowed_emails ae
SET cpf = p.cpf
FROM public.profiles p
WHERE LOWER(ae.email) = LOWER(p.email)
AND (ae.cpf IS NULL OR ae.cpf = '' OR ae.cpf = 'null')
AND p.cpf IS NOT NULL AND p.cpf != '' AND p.cpf != 'null';
