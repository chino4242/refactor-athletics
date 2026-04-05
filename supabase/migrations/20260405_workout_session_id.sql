-- Add session_id to workouts for grouping exercises into a single workout session
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS session_id uuid;

CREATE INDEX IF NOT EXISTS idx_workouts_session_id ON workouts(session_id) WHERE session_id IS NOT NULL;
