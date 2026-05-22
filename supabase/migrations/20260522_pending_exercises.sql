-- Pending exercises: synced from Health Connect, awaiting user classification
CREATE TABLE IF NOT EXISTS pending_exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date text NOT NULL,
  timestamp integer NOT NULL,
  duration_seconds integer NOT NULL,
  distance_meters numeric,
  steps integer,
  avg_cadence numeric,
  stride_length numeric,
  suggested_type text NOT NULL, -- 'run', 'bike', 'walk', 'other'
  confirmed_type text, -- null until user confirms
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_pending_exercises_user ON pending_exercises(user_id, date);
