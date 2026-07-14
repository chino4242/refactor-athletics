-- Push notification device registry (replaces single push_token on users table)
CREATE TABLE IF NOT EXISTS user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL, -- 'ios' or 'android'
  push_token text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now(),
  UNIQUE (user_id, platform)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_active ON user_devices(last_active_at);

-- Notification preference on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT false;

-- RLS
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view own devices" ON user_devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can register own devices" ON user_devices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own devices" ON user_devices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own devices" ON user_devices FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass for cron cleanup of stale tokens
CREATE POLICY "Service role full access" ON user_devices FOR ALL USING (auth.role() = 'service_role');
