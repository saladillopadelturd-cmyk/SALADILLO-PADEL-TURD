-- ==============================================================================
-- SPT - Saladillo Padel Tour
-- Migración: Incorporación del campo localidad (lugar de origen) en Jugadores
-- ==============================================================================

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS localidad TEXT;

COMMENT ON COLUMN public.players.localidad IS 'Lugar de origen o localidad del jugador (ej. Saladillo, 25 de Mayo, etc.)';
