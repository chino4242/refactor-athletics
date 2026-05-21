-- Party activity feed: auto-generated events visible to all party members
CREATE TABLE IF NOT EXISTS party_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL, -- 'workout', 'run', 'habit', 'level_up', 'streak', 'rank_up'
  summary text NOT NULL, -- "completed Push Day", "ran 5.2 km · 28:04", "hit 10k steps"
  xp_value integer DEFAULT 0, -- party XP contributed
  metadata jsonb, -- optional: {distance, time, rank, level, exercise}
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_party_events_group ON party_events (group_id, created_at DESC);

ALTER TABLE party_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read party events" ON party_events FOR SELECT
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own events" ON party_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Party level: accumulated XP for the group
ALTER TABLE groups ADD COLUMN IF NOT EXISTS party_xp integer DEFAULT 0;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS party_level integer DEFAULT 1;
