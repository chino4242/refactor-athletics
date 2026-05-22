-- Weekly Quests system

-- Quest templates (the pool of possible quests)
CREATE TABLE IF NOT EXISTS quest_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL, -- 'strength', 'cardio', 'nutrition', 'recovery', 'hybrid'
  name text NOT NULL,
  description text NOT NULL,
  metric text NOT NULL, -- 'workout_count', 'total_volume', 'steps', 'sleep_days', 'protein_days', 'streak'
  base_target numeric NOT NULL, -- baseline target (scaled per user)
  scaling_type text DEFAULT 'average', -- 'average' (use user's trailing avg), 'fixed', 'level_scaled'
  icon text DEFAULT '⚔️',
  is_party boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- User's weekly quest slate (offered + accepted quests)
CREATE TABLE IF NOT EXISTS quest_slate (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  quest_template_id uuid REFERENCES quest_templates(id) NOT NULL,
  week_start text NOT NULL, -- '2026-05-19' (Monday)
  target_value numeric NOT NULL,
  current_value numeric DEFAULT 0,
  status text DEFAULT 'offered', -- 'offered', 'accepted', 'completed', 'expired'
  accepted_at timestamptz,
  completed_at timestamptz,
  xp_awarded integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_quest_slate_user_week ON quest_slate(user_id, week_start);

-- Seed quest templates
INSERT INTO quest_templates (category, name, description, metric, base_target, icon, is_party) VALUES
  ('strength', 'Volume Warrior', 'Lift a total of {target} lbs this week', 'total_volume', 20000, '🏋️', false),
  ('strength', 'Consistency King', 'Complete {target} workouts this week', 'workout_count', 4, '👑', false),
  ('strength', 'Rank Hunter', 'Achieve a rank-up on any exercise', 'rank_up', 1, '⚡', false),
  ('cardio', 'Step Conqueror', 'Walk {target} steps this week', 'weekly_steps', 50000, '👟', false),
  ('cardio', 'Road Warrior', 'Log a run or cardio session 3 times', 'cardio_count', 3, '🏃', false),
  ('nutrition', 'Macro Master', 'Hit your protein target {target} days', 'protein_days', 5, '🥩', false),
  ('nutrition', 'Hydration Hero', 'Hit your water target {target} days', 'water_days', 5, '💧', false),
  ('recovery', 'Sleep Scholar', 'Get 7+ hours of sleep {target} nights', 'sleep_days', 5, '😴', false),
  ('recovery', 'Rest & Recover', 'Take at least 2 rest days this week', 'rest_days', 2, '🧘', false),
  ('hybrid', 'Iron Streak', 'Log activity every day for 7 days', 'streak_days', 7, '🔥', false),
  -- Party quests
  ('strength', 'Combined Arms', 'Your party logs {target} workouts combined', 'party_workout_count', 15, '⚔️', true),
  ('cardio', 'March Together', 'Your party walks {target} steps combined', 'party_steps', 200000, '🚶', true),
  ('hybrid', 'No One Left Behind', 'Every party member trains at least 3 days', 'party_min_days', 3, '🛡️', true),
  ('strength', 'Volume Battalion', 'Your party lifts {target} lbs combined', 'party_volume', 100000, '💪', true),
  ('recovery', 'Recovery Protocol', 'Party averages 7+ hours sleep', 'party_avg_sleep', 7, '🌙', true);
