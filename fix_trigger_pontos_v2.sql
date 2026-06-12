CREATE OR REPLACE FUNCTION check_match_time()
RETURNS TRIGGER AS $$
DECLARE
  v_match_date TIMESTAMPTZ;
  v_is_locked BOOLEAN;
BEGIN
  -- Se for um UPDATE e o usuário NÃO alterou o placar apostado (score_a ou score_b),
  -- nós liberamos a atualização. Usamos "IS NOT DISTINCT FROM" porque se o valor for NULL, 
  -- o sinal de "=" falha no banco de dados e ele acaba bloqueando o sistema sem querer!
  IF TG_OP = 'UPDATE' THEN
    IF OLD.score_a IS NOT DISTINCT FROM NEW.score_a AND OLD.score_b IS NOT DISTINCT FROM NEW.score_b THEN
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
