-- ==============================================================================
-- SPT - Saladillo Padel Tour: Supabase Database Migration
-- Complete Schema with RLS, Triggers, Views, and Business Logic
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 0. CLEANUP PREVIOUS / CONFLICTING OBJECTS (Dynamic Safe Migration Reset)
-- ==============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop triggers and functions first
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
  DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

  -- Dynamically drop views and tables regardless of their current relkind (table vs view)
  FOR r IN (
    SELECT c.relname, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname IN (
        'users', 'pairs', 'view_zone_standings', 'rankings', 
        'tournament_rankings', 'global_rankings', 'zone_standings', 
        'matches', 'zone_couples', 'zones', 'couples', 
        'tournaments', 'players', 'admin_emails', 'profiles'
      )
  ) LOOP
    IF r.relkind = 'v' THEN
      EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', r.relname);
    ELSIF r.relkind IN ('r', 'p') THEN
      EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.relname);
    END IF;
  END LOOP;
END $$;

-- ==============================================================================
-- 2. TABLE: profiles (extends auth.users)
-- ==============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. TABLE: players (jugadores)
-- ==============================================================================
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  gender TEXT NOT NULL DEFAULT 'Masculino' CHECK (gender IN ('Masculino', 'Femenino')),
  category TEXT NOT NULL DEFAULT '5ta',
  is_observed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. TABLE: tournaments (torneos)
-- ==============================================================================
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL DEFAULT '4ta',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'zones', 'playoffs', 'finished')),
  game_mode TEXT NOT NULL DEFAULT 'american_9games' CHECK (game_mode IN (
    'round_robin_diff', -- Todos contra todos por diferencia de games
    'american_9games',  -- Americano 9 games (empate 8-8 -> TB a 7 "muere en 7")
    'american_2sets'    -- 2 sets a 3 games + Super TB a 10 "muere en 11"
  )),
  zone_size INT NOT NULL DEFAULT 3 CHECK (zone_size IN (3, 4)),
  num_zones INT NOT NULL DEFAULT 2 CHECK (num_zones >= 1 AND num_zones <= 32),
  golden_point BOOLEAN NOT NULL DEFAULT TRUE, -- Siempre punto de oro en 40-40
  location TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. TABLE: couples (parejas inscritas por torneo)
-- ==============================================================================
CREATE TABLE public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player1_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  player2_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  couple_number INT, -- Numeración correlativa ("Pareja 1", "Pareja 2", etc.)
  seed INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_different_players CHECK (player1_id <> player2_id),
  CONSTRAINT uq_tournament_players UNIQUE (tournament_id, player1_id, player2_id)
);

ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS couple_number INT;

-- Trigger: Un jugador no podrá integrar más de una pareja en el mismo torneo
CREATE OR REPLACE FUNCTION public.check_couple_player_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.player1_id = NEW.player2_id THEN
    RAISE EXCEPTION 'El Jugador 1 y el Jugador 2 deben ser diferentes personas';
  END IF;

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

-- Compatibility view for existing code that queries 'pairs'
CREATE VIEW public.pairs AS
  SELECT id, tournament_id, player1_id, player2_id, seed, created_at
  FROM public.couples;

-- ==============================================================================
-- 6. TABLE: zones (zonas)
-- ==============================================================================
CREATE TABLE public.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- ej. "Zona A", "Zona B"
  zone_number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tournament_zone_number UNIQUE (tournament_id, zone_number)
);

-- ==============================================================================
-- 7. TABLE: zone_couples (asignación de parejas a zonas)
-- ==============================================================================
CREATE TABLE public.zone_couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_zone_couple UNIQUE (zone_id, couple_id)
);

-- ==============================================================================
-- 8. TABLE: matches (partidos)
-- ==============================================================================
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN (
    'zone',         -- Fase de grupos
    'round_of_16',  -- Octavos de final
    'quarter',      -- Cuartos de final
    'semi',         -- Semifinal
    'final',        -- Final
    'third_place'   -- 3er puesto
  )),
  zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  couple1_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
  couple2_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
  court_name TEXT,
  scheduled_time TIMESTAMPTZ,
  score_set1 TEXT,     -- e.g. "6-4" o "9-7"
  score_set2 TEXT,     -- e.g. "3-6"
  score_super_tb TEXT, -- e.g. "11-9"
  winner_couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  match_number INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_different_match_couples CHECK (couple1_id IS NULL OR couple2_id IS NULL OR couple1_id <> couple2_id)
);

-- ==============================================================================
-- 9. TABLE: rankings (Rankings individuales y de parejas)
-- ==============================================================================
CREATE TABLE public.rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ranking_type TEXT NOT NULL CHECK (ranking_type IN ('individual', 'couple')),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  player1_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  couple_key TEXT, -- Llave única ordenada "uuid1:uuid2"
  category TEXT NOT NULL DEFAULT 'General',
  points INT NOT NULL DEFAULT 0,
  tournaments_played INT NOT NULL DEFAULT 0,
  matches_won INT NOT NULL DEFAULT 0,
  matches_lost INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_individual_player_category UNIQUE (ranking_type, player_id, category),
  CONSTRAINT uq_couple_key_category UNIQUE (ranking_type, couple_key, category)
);

-- ==============================================================================
-- 10. INDEXES (Optimización de consultas frecuentes)
-- ==============================================================================
CREATE INDEX idx_couples_tournament ON public.couples(tournament_id);
CREATE INDEX idx_zones_tournament ON public.zones(tournament_id);
CREATE INDEX idx_zone_couples_zone ON public.zone_couples(zone_id);
CREATE INDEX idx_zone_couples_couple ON public.zone_couples(couple_id);
CREATE INDEX idx_matches_tournament ON public.matches(tournament_id);
CREATE INDEX idx_matches_zone ON public.matches(zone_id);
CREATE INDEX idx_matches_stage ON public.matches(stage);
CREATE INDEX idx_matches_scheduled ON public.matches(scheduled_time);
CREATE INDEX idx_rankings_type_points ON public.rankings(ranking_type, points DESC);

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) & HELPER FUNCTIONS
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;

-- Función de seguridad para comprobar rol admin evitando recursión infinita
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 11.1 PROFILES POLICIES
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile and Admins can update any" ON public.profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- 11.2 PLAYERS POLICIES (Public read, Admin write)
CREATE POLICY "Public read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Admins can insert players" ON public.players FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update players" ON public.players FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete players" ON public.players FOR DELETE USING (public.is_admin());

-- 11.3 TOURNAMENTS POLICIES (Public read, Admin write)
CREATE POLICY "Public read tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Admins can insert tournaments" ON public.tournaments FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update tournaments" ON public.tournaments FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete tournaments" ON public.tournaments FOR DELETE USING (public.is_admin());

-- 11.4 COUPLES POLICIES (Public read, Admin write)
CREATE POLICY "Public read couples" ON public.couples FOR SELECT USING (true);
CREATE POLICY "Admins can insert couples" ON public.couples FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update couples" ON public.couples FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete couples" ON public.couples FOR DELETE USING (public.is_admin());

-- 11.5 ZONES POLICIES (Public read, Admin write)
CREATE POLICY "Public read zones" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Admins can insert zones" ON public.zones FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update zones" ON public.zones FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete zones" ON public.zones FOR DELETE USING (public.is_admin());

-- 11.6 ZONE COUPLES POLICIES (Public read, Admin write)
CREATE POLICY "Public read zone_couples" ON public.zone_couples FOR SELECT USING (true);
CREATE POLICY "Admins can insert zone_couples" ON public.zone_couples FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update zone_couples" ON public.zone_couples FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete zone_couples" ON public.zone_couples FOR DELETE USING (public.is_admin());

-- 11.7 MATCHES POLICIES (Public read, Admin write)
CREATE POLICY "Public read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admins can insert matches" ON public.matches FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update matches" ON public.matches FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete matches" ON public.matches FOR DELETE USING (public.is_admin());

-- 11.8 RANKINGS POLICIES (Public read, Admin write)
CREATE POLICY "Public read rankings" ON public.rankings FOR SELECT USING (true);
CREATE POLICY "Admins can insert rankings" ON public.rankings FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update rankings" ON public.rankings FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete rankings" ON public.rankings FOR DELETE USING (public.is_admin());

-- ==============================================================================
-- 12. TRIGGER: Auto-create Profile on Auth Signup + Root Admin Initial Assignment
-- Root Admin: matiasvidal11972@gmail.com
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE 
      WHEN LOWER(NEW.email) = 'matiasvidal11972@gmail.com' THEN 'admin'
      ELSE 'user'
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    role = CASE 
      WHEN LOWER(EXCLUDED.email) = 'matiasvidal11972@gmail.com' THEN 'admin'
      ELSE public.profiles.role 
    END,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for any users already present in auth.users
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  CASE 
    WHEN LOWER(email) = 'matiasvidal11972@gmail.com' THEN 'admin'
    ELSE 'user'
  END
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET 
  email = EXCLUDED.email,
  role = CASE 
    WHEN LOWER(EXCLUDED.email) = 'matiasvidal11972@gmail.com' THEN 'admin' 
    ELSE public.profiles.role 
  END;

-- ==============================================================================
-- 13. VIEW: Standings per Zone (Calculado en tiempo real desde matches)
-- ==============================================================================
CREATE VIEW public.view_zone_standings AS
WITH matches_computed AS (
  SELECT 
    m.id,
    m.tournament_id,
    m.zone_id,
    m.couple1_id,
    m.couple2_id,
    m.winner_couple_id,
    m.status,
    m.score_set1,
    m.score_set2,
    m.score_super_tb
  FROM public.matches m
  WHERE m.stage = 'zone' AND m.status = 'completed'
)
SELECT
  zc.zone_id,
  zc.couple_id,
  COUNT(mc.id) FILTER (WHERE mc.couple1_id = zc.couple_id OR mc.couple2_id = zc.couple_id) AS matches_played,
  COUNT(mc.id) FILTER (WHERE mc.winner_couple_id = zc.couple_id) AS matches_won,
  COUNT(mc.id) FILTER (WHERE (mc.couple1_id = zc.couple_id OR mc.couple2_id = zc.couple_id) AND mc.winner_couple_id IS NOT NULL AND mc.winner_couple_id <> zc.couple_id) AS matches_lost,
  (COUNT(mc.id) FILTER (WHERE mc.winner_couple_id = zc.couple_id) * 2 + 
   COUNT(mc.id) FILTER (WHERE (mc.couple1_id = zc.couple_id OR mc.couple2_id = zc.couple_id) AND mc.winner_couple_id IS NOT NULL AND mc.winner_couple_id <> zc.couple_id)) AS points
FROM public.zone_couples zc
LEFT JOIN matches_computed mc ON (mc.zone_id = zc.zone_id AND (mc.couple1_id = zc.couple_id OR mc.couple2_id = zc.couple_id))
GROUP BY zc.zone_id, zc.couple_id;

-- Enable security invoker on views so underlying RLS policies apply
ALTER VIEW public.view_zone_standings SET (security_invoker = true);
ALTER VIEW public.pairs SET (security_invoker = true);

-- ==============================================================================
-- 14. REALTIME PUBLICATION & REPLICA IDENTITY
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tournaments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'zones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.zones;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'couples'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couples;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'zone_couples'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.zone_couples;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'rankings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rankings;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Replica Identity FULL enables complete row data in Realtime UPDATE/DELETE payloads
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.tournaments REPLICA IDENTITY FULL;
ALTER TABLE public.couples REPLICA IDENTITY FULL;
ALTER TABLE public.rankings REPLICA IDENTITY FULL;

-- Permissions for anon & authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ==============================================================================
-- 15. SEED DATA (Datos de prueba iniciales para Saladillo Padel Tour)
-- ==============================================================================
DO $$
DECLARE
  p1_id UUID;
  p2_id UUID;
  p3_id UUID;
  p4_id UUID;
  p5_id UUID;
  p6_id UUID;
  tour_id UUID;
  c1_id UUID;
  c2_id UUID;
  c3_id UUID;
  z1_id UUID;
BEGIN
  -- Insert sample players if none exist
  IF NOT EXISTS (SELECT 1 FROM public.players LIMIT 1) THEN
    INSERT INTO public.players (first_name, last_name, phone) VALUES
      ('Matías', 'Vidal', '2345-111111') RETURNING id INTO p1_id;
    INSERT INTO public.players (first_name, last_name, phone) VALUES
      ('Juan', 'Pérez', '2345-222222') RETURNING id INTO p2_id;
    INSERT INTO public.players (first_name, last_name, phone) VALUES
      ('Lucas', 'González', '2345-333333') RETURNING id INTO p3_id;
    INSERT INTO public.players (first_name, last_name, phone) VALUES
      ('Martín', 'Rodríguez', '2345-444444') RETURNING id INTO p4_id;
    INSERT INTO public.players (first_name, last_name, phone) VALUES
      ('Federico', 'Díaz', '2345-555555') RETURNING id INTO p5_id;
    INSERT INTO public.players (first_name, last_name, phone) VALUES
      ('Esteban', 'López', '2345-666666') RETURNING id INTO p6_id;

    -- Create default tournament
    INSERT INTO public.tournaments (name, date, category, status, game_mode, zone_size, num_zones, location)
    VALUES ('Torneo Apertura SPT Saladillo', CURRENT_DATE + INTERVAL '7 days', '5ta', 'zones', 'american_9games', 3, 2, 'Saladillo Padel Club')
    RETURNING id INTO tour_id;

    -- Create couples
    INSERT INTO public.couples (tournament_id, player1_id, player2_id, seed)
    VALUES (tour_id, p1_id, p2_id, 1) RETURNING id INTO c1_id;

    INSERT INTO public.couples (tournament_id, player1_id, player2_id, seed)
    VALUES (tour_id, p3_id, p4_id, 2) RETURNING id INTO c2_id;

    INSERT INTO public.couples (tournament_id, player1_id, player2_id, seed)
    VALUES (tour_id, p5_id, p6_id, 3) RETURNING id INTO c3_id;

    -- Create Zone A
    INSERT INTO public.zones (tournament_id, name, zone_number)
    VALUES (tour_id, 'Zona A', 1) RETURNING id INTO z1_id;

    -- Assign to Zone A
    INSERT INTO public.zone_couples (zone_id, couple_id) VALUES
      (z1_id, c1_id),
      (z1_id, c2_id),
      (z1_id, c3_id);

    -- Sample match
    INSERT INTO public.matches (tournament_id, stage, zone_id, couple1_id, couple2_id, court_name, scheduled_time, score_set1, winner_couple_id, status, match_number)
    VALUES (tour_id, 'zone', z1_id, c1_id, c2_id, 'Cancha Central', NOW() + INTERVAL '2 days', '9-6', c1_id, 'completed', 1);

    -- Sample rankings
    INSERT INTO public.rankings (ranking_type, player_id, category, points, tournaments_played, matches_won, matches_lost)
    VALUES 
      ('individual', p1_id, '5ta', 100, 1, 1, 0),
      ('individual', p2_id, '5ta', 100, 1, 1, 0),
      ('individual', p3_id, '5ta', 50, 1, 0, 1),
      ('individual', p4_id, '5ta', 50, 1, 0, 1);

    INSERT INTO public.rankings (ranking_type, player1_id, player2_id, couple_key, category, points, tournaments_played, matches_won, matches_lost)
    VALUES 
      ('couple', p1_id, p2_id, LEAST(p1_id::text, p2_id::text) || ':' || GREATEST(p1_id::text, p2_id::text), '5ta', 100, 1, 1, 0),
      ('couple', p3_id, p4_id, LEAST(p3_id::text, p4_id::text) || ':' || GREATEST(p3_id::text, p4_id::text), '5ta', 50, 1, 0, 1);
  END IF;
END $$;
