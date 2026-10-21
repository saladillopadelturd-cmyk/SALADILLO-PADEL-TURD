-- Migración: Agregar modalidad 'two_sets_super_tb' a tournaments
-- Modalidad: 2 sets a 6 games, con tie-break a 7 puntos en 6-6 y Super Tie-Break a 11 puntos

ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_game_mode_check;

ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_game_mode_check CHECK (game_mode IN (
  'round_robin_diff',
  'american_9games',
  'american_2sets',
  'two_sets_super_tb'
));
