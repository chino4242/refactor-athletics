-- Food diary: proper meal tracking with food names and meal categories
CREATE TABLE IF NOT EXISTS meal_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date text NOT NULL,
  meal_type text NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snack'
  food_name text NOT NULL,
  protein numeric DEFAULT 0,
  carbs numeric DEFAULT 0,
  fat numeric DEFAULT 0,
  calories numeric DEFAULT 0,
  serving_size text,
  timestamp integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_meal_entries_user_date ON meal_entries (user_id, date);

ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own meals" ON meal_entries FOR ALL USING (auth.uid() = user_id);
