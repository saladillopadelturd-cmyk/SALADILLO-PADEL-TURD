-- ==============================================================================
-- Migración: Incorporación de Género/Modalidad en Torneos
-- Permite especificar si el torneo es 'Masculino' o 'Femenino'
-- ==============================================================================

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT 'Masculino' CHECK (gender IN ('Masculino', 'Femenino'));

COMMENT ON COLUMN public.tournaments.gender IS 'Modalidad del torneo: Masculino o Femenino';
