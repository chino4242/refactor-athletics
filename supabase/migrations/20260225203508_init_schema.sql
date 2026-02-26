-- CREATE TABLES

-- USERS TABLE
CREATE TABLE public.users (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  display_name text,
  age integer,
  sex text,
  bodyweight numeric,
  selected_theme text DEFAULT 'dark',
  is_onboarded boolean DEFAULT false,
  nutrition_targets jsonb DEFAULT '{}'::jsonb,
  habit_targets jsonb DEFAULT '{}'::jsonb,
  body_composition_goals jsonb DEFAULT '{}'::jsonb,
  hidden_habits jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CATALOG TABLE
CREATE TABLE public.catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  type text NOT NULL,
  description text,
  unit text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HISTORY TABLE
CREATE TABLE public.history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) NOT NULL,
  exercise_id text NOT NULL,
  timestamp bigint NOT NULL,
  date text NOT NULL,
  value text,
  raw_value numeric,
  rank_name text,
  level integer,
  xp integer DEFAULT 0,
  details jsonb, -- For workout sets data
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- DUELS TABLE
CREATE TABLE public.duels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id uuid REFERENCES public.users(id) NOT NULL,
  opponent_id uuid REFERENCES public.users(id),
  status text NOT NULL DEFAULT 'PENDING',
  start_at bigint NOT NULL,
  end_at bigint NOT NULL,
  challenger_score integer DEFAULT 0,
  opponent_score integer DEFAULT 0,
  winner_id uuid REFERENCES public.users(id),
  included_metrics jsonb DEFAULT '["ALL"]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CHALLENGES TABLE
CREATE TABLE public.challenges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) NOT NULL,
  name text NOT NULL,
  duration_days integer NOT NULL,
  start_date text NOT NULL,
  status text NOT NULL DEFAULT 'alive',
  current_streak integer DEFAULT 0,
  last_checked text,
  goals jsonb NOT NULL,
  history jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- CREATE POLICIES

-- Users can read and update their own profile. Anyone can read profiles for duels/leaderboards securely.
CREATE POLICY "Users can view any profile" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Catalog is readable by everyone, editable by none (handled via migrations or admins).
CREATE POLICY "Catalog is viewable by everyone" ON public.catalog FOR SELECT USING (true);

-- History is viewable by everyone (for duels/leaderboards), but only insertable/updatable by the owner.
CREATE POLICY "History is viewable by everyone" ON public.history FOR SELECT USING (true);
CREATE POLICY "Users can insert their own history" ON public.history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own history" ON public.history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own history" ON public.history FOR DELETE USING (auth.uid() = user_id);

-- Duels are viewable by everyone.
CREATE POLICY "Duels are viewable by everyone" ON public.duels FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create duels" ON public.duels FOR INSERT WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY "Participants can update duels" ON public.duels FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Challenges are private to the user.
CREATE POLICY "Users can view their own challenges" ON public.challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own challenges" ON public.challenges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own challenges" ON public.challenges FOR DELETE USING (auth.uid() = user_id);

-- AUTOMATIC UPDATED_AT TIMESTAMP FUNCTION
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
