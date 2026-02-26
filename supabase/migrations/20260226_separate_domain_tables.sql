-- MIGRATION: Separate Domain Tables
-- Created: 2026-02-26
-- Purpose: Split history table into domain-specific tables for better performance and maintainability

-- ============================================================================
-- WORKOUTS TABLE
-- ============================================================================
CREATE TABLE public.workouts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) NOT NULL,
  exercise_id text REFERENCES public.catalog(id) NOT NULL,
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

-- ============================================================================
-- NUTRITION_LOGS TABLE
-- ============================================================================
CREATE TABLE public.nutrition_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) NOT NULL,
  date text NOT NULL,
  timestamp bigint NOT NULL,
  macro_type text NOT NULL, -- 'protein', 'carbs', 'fat', 'calories', 'water'
  amount numeric NOT NULL,
  xp integer DEFAULT 0,
  label text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_nutrition_user_date ON nutrition_logs(user_id, date);
CREATE INDEX idx_nutrition_user_date_type ON nutrition_logs(user_id, date, macro_type);
CREATE INDEX idx_nutrition_user_timestamp ON nutrition_logs(user_id, timestamp DESC);

-- ============================================================================
-- HABIT_LOGS TABLE
-- ============================================================================
CREATE TABLE public.habit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) NOT NULL,
  habit_id text NOT NULL, -- 'habit_steps', 'habit_sleep', etc.
  date text NOT NULL,
  timestamp bigint NOT NULL,
  value numeric NOT NULL,
  xp integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_habits_user_date ON habit_logs(user_id, date);
CREATE INDEX idx_habits_user_habit ON habit_logs(user_id, habit_id);
CREATE INDEX idx_habits_user_timestamp ON habit_logs(user_id, timestamp DESC);

-- ============================================================================
-- BODY_MEASUREMENTS TABLE
-- ============================================================================
CREATE TABLE public.body_measurements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) NOT NULL,
  date text NOT NULL,
  timestamp bigint NOT NULL,
  weight numeric,
  waist numeric,
  arms numeric,
  chest numeric,
  legs numeric,
  shoulders numeric,
  body_fat_percentage numeric,
  xp integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_body_user_date ON body_measurements(user_id, date);
CREATE INDEX idx_body_user_timestamp ON body_measurements(user_id, timestamp DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

-- Workouts
CREATE POLICY "Workouts viewable by everyone" ON public.workouts FOR SELECT USING (true);
CREATE POLICY "Users can insert own workouts" ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workouts" ON public.workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workouts" ON public.workouts FOR DELETE USING (auth.uid() = user_id);

-- Nutrition
CREATE POLICY "Nutrition viewable by everyone" ON public.nutrition_logs FOR SELECT USING (true);
CREATE POLICY "Users can insert own nutrition" ON public.nutrition_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own nutrition" ON public.nutrition_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own nutrition" ON public.nutrition_logs FOR DELETE USING (auth.uid() = user_id);

-- Habits
CREATE POLICY "Habits viewable by everyone" ON public.habit_logs FOR SELECT USING (true);
CREATE POLICY "Users can insert own habits" ON public.habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON public.habit_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON public.habit_logs FOR DELETE USING (auth.uid() = user_id);

-- Body Measurements
CREATE POLICY "Body measurements viewable by everyone" ON public.body_measurements FOR SELECT USING (true);
CREATE POLICY "Users can insert own measurements" ON public.body_measurements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own measurements" ON public.body_measurements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own measurements" ON public.body_measurements FOR DELETE USING (auth.uid() = user_id);
