-- 75 Day Challenge tables

CREATE TABLE IF NOT EXISTS challenges_75 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES users(id),
  group_id UUID REFERENCES groups(id),
  title TEXT NOT NULL DEFAULT '75 Day Challenge',
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL,
  failed_on DATE,
  failed_by UUID REFERENCES users(id),
  failed_metric TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenge_75_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES challenges_75(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- 'app' or 'custom'
  metric_id TEXT NOT NULL,
  label TEXT NOT NULL,
  minimum NUMERIC,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS challenge_75_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES challenges_75(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'joined',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS challenge_75_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES challenges_75(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metrics_snapshot JSONB DEFAULT '{}',
  custom_checks JSONB DEFAULT '{}',
  evaluated_at TIMESTAMPTZ,
  UNIQUE(challenge_id, user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_c75_creator ON challenges_75(creator_id);
CREATE INDEX IF NOT EXISTS idx_c75_group ON challenges_75(group_id);
CREATE INDEX IF NOT EXISTS idx_c75_members_user ON challenge_75_members(user_id);
CREATE INDEX IF NOT EXISTS idx_c75_days_lookup ON challenge_75_days(challenge_id, user_id, date);
