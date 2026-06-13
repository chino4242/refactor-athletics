-- v2 Group Challenges: add status flow and challenge type

ALTER TABLE group_challenges ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
-- values: 'proposed', 'active', 'completed', 'expired'

ALTER TABLE group_challenges ADD COLUMN IF NOT EXISTS challenge_type text DEFAULT 'collaborative';
-- values: 'collaborative', 'competitive'

-- Backfill existing rows
UPDATE group_challenges SET status = 'completed' WHERE completed = true;
UPDATE group_challenges SET status = 'active' WHERE completed = false AND status IS NULL;

-- Index for quick lookup of active/proposed challenges per group
CREATE INDEX IF NOT EXISTS idx_group_challenges_status ON group_challenges(group_id, status);
