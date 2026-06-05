-- Recuperar CPFs apagados acidentalmente da tabela allowed_emails
UPDATE public.allowed_emails ae
SET cpf = p.cpf
FROM public.profiles p
WHERE ae.email = p.email
AND ae.cpf IS NULL
AND p.cpf IS NOT NULL;
