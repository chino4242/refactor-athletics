-- Evolve group_challenges: flexible date windows, MVP tracking, results history
-- Drop the weekly constraint to allow multiple challenges per group
ALTER TABLE group_challenges DROP CONSTRAINT IF EXISTS group_challenges_group_id_week_start_key;

-- Add new columns
ALTER TABLE group_challenges ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE group_challenges ADD COLUMN IF NOT EXISTS end_date date;
ALTER TABLE group_challenges ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
ALTER TABLE group_challenges ADD COLUMN IF NOT EXISTS mvp_user_id uuid REFERENCES users(id);
ALTER TABLE group_challenges ADD COLUMN IF NOT EXISTS results jsonb DEFAULT '{}'::jsonb;
ALTER TABLE group_challenges ADD COLUMN IF NOT EXISTS name text;

-- Backfill: set start_date/end_date from week_start for existing rows
UPDATE group_challenges
SET start_date = week_start,
    end_date = week_start + INTERVAL '6 days'
WHERE start_date IS NULL;

-- Index for active challenges lookup
CREATE INDEX IF NOT EXISTS idx_group_challenges_active
  ON group_challenges(group_id, end_date DESC);

-- Allow group MEMBERS (not just leaders) to create challenges
DROP POLICY IF EXISTS "Leaders can create challenges" ON group_challenges;
CREATE POLICY "Members can create challenges" ON group_challenges FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM group_members WHERE group_id = group_challenges.group_id)
);

-- Allow members to update challenges (for lazy completion)
DROP POLICY IF EXISTS "Leaders can update challenges" ON group_challenges;
CREATE POLICY "Members can update challenges" ON group_challenges FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM group_members WHERE group_id = group_challenges.group_id)
);

-- User badges table (foundation for badge system)
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  badge_type text NOT NULL,
  challenge_id uuid REFERENCES group_challenges(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  earned_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_type ON user_badges(user_id, badge_type);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges are viewable by everyone" ON user_badges FOR SELECT USING (true);
CREATE POLICY "System can insert badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
