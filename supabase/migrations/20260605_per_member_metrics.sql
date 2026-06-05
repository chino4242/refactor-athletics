-- Per-member metrics for 75 Day Challenge
-- Each member can have their own metric targets

ALTER TABLE challenge_75_metrics ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES challenge_75_members(id) ON DELETE CASCADE;

-- Change failure from group-wide to per-member
ALTER TABLE challenge_75_members ADD COLUMN IF NOT EXISTS failed_on DATE;
ALTER TABLE challenge_75_members ADD COLUMN IF NOT EXISTS failed_metric TEXT;
