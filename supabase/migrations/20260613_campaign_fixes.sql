-- Fix campaign gaps: shared_failure, duration_days, per-member join date

ALTER TABLE challenges_75 ADD COLUMN IF NOT EXISTS shared_failure BOOLEAN DEFAULT false;
ALTER TABLE challenges_75 ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 75;

-- Per-member start date (for mid-campaign joiners)
ALTER TABLE challenge_75_members ADD COLUMN IF NOT EXISTS start_date DATE;

-- Backfill: set member start_date from challenge start_date for existing members
UPDATE challenge_75_members m
SET start_date = c.start_date
FROM challenges_75 c
WHERE m.challenge_id = c.id AND m.start_date IS NULL;
