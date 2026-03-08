-- Drop the existing workouts table if it has wrong schema
DROP TABLE IF EXISTS public.workouts CASCADE;

-- Recreate with correct schema
CREATE TABLE public.workouts (
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
  sets jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);
CREATE INDEX idx_workouts_user_exercise ON workouts(user_id, exercise_id);
CREATE INDEX idx_workouts_user_timestamp ON workouts(user_id, timestamp DESC);

-- Enable RLS
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Workouts viewable by everyone" ON public.workouts FOR SELECT USING (true);
CREATE POLICY "Users can insert own workouts" ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workouts" ON public.workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workouts" ON public.workouts FOR DELETE USING (auth.uid() = user_id);
