CREATE OR REPLACE FUNCTION check_match_time()
RETURNS TRIGGER AS $$
DECLARE
  v_match_date TIMESTAMPTZ;
  v_is_locked BOOLEAN;
BEGIN
  -- Ignora a validação se a atualização NÃO estiver alterando o placar apostado (score_a ou score_b)
  -- Isso permite que o sistema (finish_match) atualize a coluna points_earned livremente!
  IF TG_OP = 'UPDATE' THEN
    IF OLD.score_a = NEW.score_a AND OLD.score_b = NEW.score_b THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Obtem a data e o status de travamento do jogo associado ao palpite
  SELECT match_date, is_locked INTO v_match_date, v_is_locked
  FROM matches
  WHERE id = NEW.match_id;

  -- Regra 1: Se o admin travou manualmente o jogo
  IF v_is_locked THEN
    RAISE EXCEPTION 'Acesso Negado: O jogo já foi travado pelo administrador.';
  END IF;

  -- Regra 2: Bloqueio automático 1 hora antes do jogo
  IF NOW() > (v_match_date - INTERVAL '1 hour') THEN
    RAISE EXCEPTION 'Acesso Negado: O palpite foi bloqueado pois falta menos de 1 hora para o jogo.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
