-- ==============================================================================
-- Migración: Incorporación de Sexo, Categoría y Estado Observado en Jugadores
-- ==============================================================================

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT 'Masculino',
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '5ta',
  ADD COLUMN IF NOT EXISTS is_observed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.players.gender IS 'Sexo del jugador: Masculino o Femenino';
COMMENT ON COLUMN public.players.category IS 'Nivel de juego del jugador (1ra a 8va, donde 5ta es mejor que 6ta)';
COMMENT ON COLUMN public.players.is_observed IS 'Indicativo si el jugador está próximo a cambiar de categoría por una superior';
