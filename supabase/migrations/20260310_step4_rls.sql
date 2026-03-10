-- Step 4: Enable RLS and create policies
ALTER TABLE gear_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gear ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gear catalog is viewable by everyone"
  ON gear_catalog FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own gear"
  ON user_gear FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock gear"
  ON user_gear FOR INSERT
  WITH CHECK (auth.uid() = user_id);
