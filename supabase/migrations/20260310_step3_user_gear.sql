-- Step 3: Create user_gear table
CREATE TABLE IF NOT EXISTS user_gear (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  gear_id text REFERENCES gear_catalog(id) ON DELETE CASCADE,
  unlocked_at timestamp DEFAULT now(),
  PRIMARY KEY (user_id, gear_id)
);

CREATE INDEX IF NOT EXISTS idx_user_gear_user_id ON user_gear(user_id);
