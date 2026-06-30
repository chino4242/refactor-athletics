-- Meal Favorites: saved parsed meals for instant re-logging
CREATE TABLE meal_favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  total_protein numeric NOT NULL DEFAULT 0,
  total_carbs numeric NOT NULL DEFAULT 0,
  total_fat numeric NOT NULL DEFAULT 0,
  total_calories numeric NOT NULL DEFAULT 0,
  meal_tag text,
  use_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE meal_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own favorites" ON meal_favorites
  FOR ALL USING (auth.uid() = user_id);

-- Index for fast retrieval sorted by frequency
CREATE INDEX idx_meal_favorites_user ON meal_favorites(user_id, use_count DESC);
