-- Adicionar coluna is_locked à tabela matches se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='is_locked') THEN
        ALTER TABLE public.matches ADD COLUMN is_locked BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Atualizar a função de bloqueio para considerar o bloqueio manual
CREATE OR REPLACE FUNCTION public.check_guess_deadline()
RETURNS TRIGGER AS $$
DECLARE
    v_match_date TIMESTAMP WITH TIME ZONE;
    v_is_locked BOOLEAN;
BEGIN
    -- Busca a data do jogo e o status de bloqueio manual
    SELECT match_date, is_locked INTO v_match_date, v_is_locked 
    FROM public.matches 
    WHERE id = NEW.match_id;

    -- 1. Checa se o admin bloqueou manualmente
    IF v_is_locked = true THEN
        RAISE EXCEPTION 'Acesso Negado: O envio de palpites para este jogo foi bloqueado manualmente pela administração.';
    END IF;

    -- 2. Checa o bloqueio automático de 1 hora
    IF now() > (v_match_date - interval '1 hour') THEN
        RAISE EXCEPTION 'Acesso Negado: O palpite foi bloqueado pois falta menos de 1 hora para o jogo.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
