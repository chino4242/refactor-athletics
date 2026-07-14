-- Notifications log: tracks notification delivery and engagement
CREATE TABLE IF NOT EXISTS notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL, -- 'streak_at_risk', 'quest_incomplete', 'rank_proximity', 'duel_received', 'workout_reminder'
  title text NOT NULL,
  body text NOT NULL,
  deep_link text, -- route to open on tap, e.g. '/dashboard'
  sent_at timestamptz DEFAULT now(),
  delivered boolean DEFAULT true, -- false if suppressed by cap/quiet hours
  tapped_at timestamptz, -- set when user taps the notification
  suppressed_reason text, -- null if delivered; 'daily_cap', 'category_disabled', or 'quiet_hours' if suppressed
  priority integer NOT NULL DEFAULT 0 -- higher = more important (5=duel, 4=streak, 3=rank, 2=quest, 1=workout)
);

-- Fast lookup for daily cap (how many sent today)
CREATE INDEX IF NOT EXISTS idx_notifications_log_user_sent
  ON notifications_log (user_id, sent_at DESC);

-- Fast lookup for category cooldowns (e.g., rank proximity once per week per exercise)
CREATE INDEX IF NOT EXISTS idx_notifications_log_user_category_sent
  ON notifications_log (user_id, category, sent_at DESC);

-- RLS
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON notifications_log FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access via bypassing RLS (default Supabase behavior)

-- Notification preference columns on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS quiet_hours jsonb DEFAULT NULL;
