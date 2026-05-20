-- XP Ledger: tracks every XP grant for attribution and "while you were away" breakdowns
CREATE TABLE IF NOT EXISTS xp_ledger (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  source_type text NOT NULL, -- 'workout', 'habit', 'nutrition', 'measurement'
  source_label text NOT NULL, -- 'Bench Press', '8,400 steps', 'Protein logged'
  is_background boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_xp_ledger_user_created ON xp_ledger (user_id, created_at DESC);

ALTER TABLE xp_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own ledger" ON xp_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ledger" ON xp_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);
