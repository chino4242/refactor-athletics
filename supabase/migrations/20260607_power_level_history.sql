-- Weekly power level snapshots for trend tracking
CREATE TABLE IF NOT EXISTS power_level_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  power_level integer NOT NULL DEFAULT 0,
  exercises_tested integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- RLS
ALTER TABLE power_level_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own history" ON power_level_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON power_level_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_power_level_history_user_week ON power_level_history(user_id, week_start DESC);
