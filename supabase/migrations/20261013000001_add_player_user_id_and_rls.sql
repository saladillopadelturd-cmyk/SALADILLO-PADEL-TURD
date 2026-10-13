-- ==============================================================================
-- Migración: Soporte de Identidad de Jugador, Vinculación de Usuario y Búsqueda por Email
-- ==============================================================================

-- 1. Asegurar columna user_id en la tabla players
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.players.user_id IS 'ID de usuario en auth.users si el jugador tiene cuenta de acceso';

-- 2. Índices de optimización para búsqueda por email e identidad
CREATE INDEX IF NOT EXISTS idx_players_email_lower ON public.players (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_players_user_id ON public.players (user_id);

-- 3. Políticas RLS para lectura y actualización por parte del propio jugador
-- Nota: La lectura de jugadores ya es pública ("Public read players")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'players' AND policyname = 'Allow players to update their own record by email or uid'
  ) THEN
    CREATE POLICY "Allow players to update their own record by email or uid" ON public.players
      FOR UPDATE USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        (auth.jwt()->>'email' IS NOT NULL AND LOWER(email) = LOWER(auth.jwt()->>'email')) OR
        public.is_admin()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'players' AND policyname = 'Allow public player registration'
  ) THEN
    CREATE POLICY "Allow public player registration" ON public.players
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;
