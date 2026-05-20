-- XP feedback loop: level-up detection and background XP tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_level_up jsonb;
-- Example: {"level": 18, "timestamp": 1716100000, "breakdown": {"workouts": 40, "habits": 35, "nutrition": 25}}
ALTER TABLE users ADD COLUMN IF NOT EXISTS unseen_xp integer DEFAULT 0;
