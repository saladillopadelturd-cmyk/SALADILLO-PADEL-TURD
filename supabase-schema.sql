-- ============================================
-- SPT - Saladillo Padel Tour
-- Schema de Base de Datos para Supabase
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: users (extends auth.users)
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'public' CHECK (role IN ('public', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: admin_emails
-- ============================================
CREATE TABLE public.admin_emails (
  email TEXT PRIMARY KEY,
  added_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: players (jugadores)
-- ============================================
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: tournaments (torneos)
-- ============================================
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT,
  game_mode TEXT NOT NULL CHECK (game_mode IN (
    'round_robin_diff',
    'american_9games',
    'american_2sets'
  )),
  zone_size INT NOT NULL CHECK (zone_size IN (3, 4)),
  num_zones INT NOT NULL CHECK (num_zones >= 1 AND num_zones <= 16),
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'registration', 'active', 'completed', 'cancelled'
  )),
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: zones (zonas)
-- ============================================
CREATE TABLE public.zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  zone_number INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, zone_number)
);

-- ============================================
-- TABLA: pairs (parejas)
-- ============================================
CREATE TABLE public.pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player1_id UUID NOT NULL REFERENCES public.players(id),
  player2_id UUID NOT NULL REFERENCES public.players(id),
  zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  seed INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (player1_id != player2_id),
  UNIQUE(tournament_id, player1_id, player2_id)
);

-- ============================================
-- TABLA: matches (partidos)
-- ============================================
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
  round TEXT NOT NULL CHECK (round IN (
    'zones', 'octavos', 'cuartos', 'semifinal', 'final', 'tercer_puesto'
  )),
  match_number INT NOT NULL,
  pair1_id UUID NOT NULL REFERENCES public.pairs(id),
  pair2_id UUID NOT NULL REFERENCES public.pairs(id),
  winner_id UUID REFERENCES public.pairs(id),
  score_pair1 JSONB,
  score_pair2 JSONB,
  court TEXT,
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'scheduled', 'in_progress', 'completed'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (pair1_id != pair2_id)
);

-- ============================================
-- TABLA: zone_standings (tabla de posiciones)
-- ============================================
CREATE TABLE public.zone_standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  pair_id UUID NOT NULL REFERENCES public.pairs(id),
  matches_played INT DEFAULT 0,
  matches_won INT DEFAULT 0,
  matches_lost INT DEFAULT 0,
  sets_won INT DEFAULT 0,
  sets_lost INT DEFAULT 0,
  games_won INT DEFAULT 0,
  games_lost INT DEFAULT 0,
  points INT DEFAULT 0,
  position INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zone_id, pair_id)
);

-- ============================================
-- TABLA: tournament_rankings
-- ============================================
CREATE TABLE public.tournament_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  pair_id UUID REFERENCES public.pairs(id),
  player_id UUID NOT NULL REFERENCES public.players(id),
  points_earned INT NOT NULL DEFAULT 0,
  final_position INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: global_rankings
-- ============================================
CREATE TABLE public.global_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID UNIQUE NOT NULL REFERENCES public.players(id),
  total_points INT DEFAULT 0,
  tournaments_played INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_pairs_tournament ON public.pairs(tournament_id);
CREATE INDEX idx_pairs_zone ON public.pairs(zone_id);
CREATE INDEX idx_matches_tournament ON public.matches(tournament_id);
CREATE INDEX idx_matches_zone ON public.matches(zone_id);
CREATE INDEX idx_zone_standings_zone ON public.zone_standings(zone_id);
CREATE INDEX idx_tournament_rankings_tournament ON public.tournament_rankings(tournament_id);
CREATE INDEX idx_global_rankings_points ON public.global_rankings(total_points DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (lectura)
CREATE POLICY "Public read tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Public read zones" ON public.zones FOR SELECT USING (true);
CREATE POLICY "Public read pairs" ON public.pairs FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Public read zone_standings" ON public.zone_standings FOR SELECT USING (true);
CREATE POLICY "Public read tournament_rankings" ON public.tournament_rankings FOR SELECT USING (true);
CREATE POLICY "Public read global_rankings" ON public.global_rankings FOR SELECT USING (true);
CREATE POLICY "Public read players" ON public.players FOR SELECT USING (true);

-- Políticas admin (escritura)
CREATE POLICY "Admins can manage tournaments" ON public.tournaments
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin')));

CREATE POLICY "Admins can manage zones" ON public.zones
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin')));

CREATE POLICY "Admins can manage pairs" ON public.pairs
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin')));

CREATE POLICY "Admins can manage matches" ON public.matches
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin')));

CREATE POLICY "Admins can manage zone_standings" ON public.zone_standings
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin')));

CREATE POLICY "Admins can manage players" ON public.players
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin')));

CREATE POLICY "Admins can manage admin_emails" ON public.admin_emails
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin'));

-- ============================================
-- TRIGGER: Auto-crear perfil al registrarse
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  IF NEW.email = 'matiasvidal11972@gmail.com' THEN
    UPDATE public.users SET role = 'super_admin' WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
