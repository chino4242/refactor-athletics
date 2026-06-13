-- v2 Weekly Bounties

CREATE TABLE IF NOT EXISTS weekly_bounties (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  week_start text NOT NULL, -- '2026-06-09' (Monday)
  pillar text NOT NULL, -- 'training', 'consistency', 'social'
  bounty_type text NOT NULL, -- 'volume', 'distance', 'sessions', 'rank_chase', 'consistency', 'nutrition', 'arena'
  target numeric NOT NULL,
  difficulty text DEFAULT 'normal', -- 'easy', 'normal', 'hard'
  difficulty_locked boolean DEFAULT false,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  xp_awarded integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_bounties_user_week_pillar ON weekly_bounties(user_id, week_start, pillar);
CREATE INDEX idx_bounties_user_week ON weekly_bounties(user_id, week_start);

ALTER TABLE weekly_bounties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own bounties" ON weekly_bounties FOR ALL USING (auth.uid() = user_id);
