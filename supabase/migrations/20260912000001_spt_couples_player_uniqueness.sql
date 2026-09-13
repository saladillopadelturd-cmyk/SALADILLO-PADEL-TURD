-- ==============================================================================
-- Migración: Restricción de Unicidad de Jugador por Pareja en Torneo
-- Un jugador no podrá integrar más de una pareja en el mismo torneo.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_couple_player_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar que player1_id y player2_id no sean la misma persona
  IF NEW.player1_id = NEW.player2_id THEN
    RAISE EXCEPTION 'El Jugador 1 y el Jugador 2 deben ser diferentes personas';
  END IF;

  -- Validar que ni player1_id ni player2_id integren ya otra pareja en el mismo torneo
  IF EXISTS (
    SELECT 1 FROM public.couples
    WHERE tournament_id = NEW.tournament_id
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        player1_id IN (NEW.player1_id, NEW.player2_id) OR
        player2_id IN (NEW.player1_id, NEW.player2_id)
      )
  ) THEN
    RAISE EXCEPTION 'Un jugador no puede integrar más de una pareja en el mismo torneo';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_couple_player_uniqueness ON public.couples;
CREATE TRIGGER trg_check_couple_player_uniqueness
BEFORE INSERT OR UPDATE ON public.couples
FOR EACH ROW EXECUTE FUNCTION public.check_couple_player_uniqueness();
