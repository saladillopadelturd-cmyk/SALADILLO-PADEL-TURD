-- ==============================================================================
-- SPT - Saladillo Padel Tour
-- Migración: Permitir etapa round_of_32 (16vos de final) en tabla matches
-- ==============================================================================

ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_stage_check;

ALTER TABLE public.matches ADD CONSTRAINT matches_stage_check CHECK (stage IN (
  'zone',         -- Fase de grupos
  'round_of_32',  -- 16vos de final
  'round_of_16',  -- Octavos de final
  'quarter',      -- Cuartos de final
  'semi',         -- Semifinal
  'final',        -- Gran Final
  'third_place'   -- 3er puesto
));

COMMENT ON CONSTRAINT matches_stage_check ON public.matches IS 
'Restringe las etapas válidas de partidos incluyendo round_of_32 para torneos con llaves de 16vos.';
