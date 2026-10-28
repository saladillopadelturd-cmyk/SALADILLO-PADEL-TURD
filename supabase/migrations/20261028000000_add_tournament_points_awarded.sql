-- ==============================================================================
-- SPT - Saladillo Padel Tour
-- Migración: Agregar campo points_awarded a la tabla tournaments
-- Define los puntos totales (P) que otorga la categoría del torneo para distribuir
-- ==============================================================================

ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS points_awarded INTEGER NOT NULL DEFAULT 1000 CHECK (points_awarded > 0);

COMMENT ON COLUMN public.tournaments.points_awarded IS 
'Puntos totales (P) que otorga el torneo a distribuir porcentualmente según la ronda alcanzada y desempeño en fase de grupos.';
