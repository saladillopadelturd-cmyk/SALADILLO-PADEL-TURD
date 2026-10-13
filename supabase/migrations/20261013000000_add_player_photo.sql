-- ==============================================================================
-- Migración: Incorporación de foto de perfil (formato cuadrado) en Jugadores
-- ==============================================================================

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMENT ON COLUMN public.players.photo_url IS 'URL de la foto de perfil del jugador (formato cuadrado recortado)';

-- Asegurar políticas para almacenamiento en el bucket 'players' o 'avatars' si existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('players', 'players', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public Access to Player Photos'
  ) THEN
    CREATE POLICY "Public Access to Player Photos" ON storage.objects
      FOR SELECT USING (bucket_id = 'players');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can upload player photos'
  ) THEN
    CREATE POLICY "Admins can upload player photos" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'players' AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update player photos'
  ) THEN
    CREATE POLICY "Admins can update player photos" ON storage.objects
      FOR UPDATE USING (bucket_id = 'players' AND public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete player photos'
  ) THEN
    CREATE POLICY "Admins can delete player photos" ON storage.objects
      FOR DELETE USING (bucket_id = 'players' AND public.is_admin());
  END IF;
END $$;
