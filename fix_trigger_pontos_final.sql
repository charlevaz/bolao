CREATE OR REPLACE FUNCTION check_match_time()
RETURNS TRIGGER AS $$
DECLARE
  v_match_date TIMESTAMPTZ;
  v_is_locked BOOLEAN;
BEGIN
  -- 1. Libera UPDATE se o usuário não mudou o placar (sistema atualizando pontos)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.score_a IS NOT DISTINCT FROM NEW.score_a AND OLD.score_b IS NOT DISTINCT FROM NEW.score_b THEN
      RETURN NEW;
    END IF;
  END IF;

  -- 2. Libera INSERT se o sistema estiver criando um palpite vazio (para preencher usuários que esqueceram de palpitar)
  IF TG_OP = 'INSERT' THEN
    IF NEW.score_a IS NULL AND NEW.score_b IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Obtem a data e o status de travamento do jogo
  SELECT match_date, is_locked INTO v_match_date, v_is_locked
  FROM matches
  WHERE id = NEW.match_id;

  -- Regra 1: Travamento manual
  IF v_is_locked THEN
    RAISE EXCEPTION 'Acesso Negado: O jogo já foi travado pelo administrador.';
  END IF;

  -- Regra 2: Bloqueio automático de 1 hora
  IF NOW() > (v_match_date - INTERVAL '1 hour') THEN
    RAISE EXCEPTION 'Acesso Negado: O palpite foi bloqueado pois falta menos de 1 hora para o jogo.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
