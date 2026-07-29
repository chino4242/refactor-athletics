-- Training Grounds: timed workout templates
CREATE TABLE IF NOT EXISTS workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  format text NOT NULL CHECK (format IN ('amrap', 'for_time', 'timed_rounds', 'emom')),
  duration_seconds integer NOT NULL,
  time_cap_seconds integer,
  rounds integer,
  exercises jsonb NOT NULL DEFAULT '[]',
  equipment jsonb NOT NULL DEFAULT '[]',
  difficulty integer NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  tags jsonb NOT NULL DEFAULT '[]',
  benchmark_score text,
  created_at timestamptz DEFAULT now()
);

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_workout_templates_format ON workout_templates(format);

-- No RLS (public read)

-- ============================================
-- SEED DATA
-- ============================================

-- 1. Kettlebell Complex (AMRAP 15 min)
INSERT INTO workout_templates (name, description, format, duration_seconds, exercises, equipment, difficulty, tags, benchmark_score) VALUES (
  'Kettlebell Complex',
  'One bell, that''s it. Rest when you need to, the clock doesn''t stop.',
  'amrap',
  900,
  '[{"name": "Deadlifts", "reps": 5}, {"name": "Rows", "reps": 5}, {"name": "Swings", "reps": 5}, {"name": "Goblet Squats", "reps": 5}, {"name": "Cleans", "reps": 5}]',
  '["kettlebell"]',
  3,
  '["kettlebell", "full_body"]',
  '10 rounds'
);

-- 2. Kettlebell Burner (4 Rounds for Time, 30 min cap)
INSERT INTO workout_templates (name, description, format, duration_seconds, time_cap_seconds, rounds, exercises, equipment, difficulty, tags) VALUES (
  'Kettlebell Burner',
  '4 rounds of heavy KB work. Push the pace but respect the movements.',
  'for_time',
  1800,
  1800,
  4,
  '[{"name": "KB Swings", "reps": 20}, {"name": "Goblet Squats", "reps": 20}, {"name": "Farmers Carry", "reps": 1, "distance": "100m"}, {"name": "KB Reverse Lunges", "reps": 30, "note": "15R/15L"}, {"name": "Row", "reps": 1, "distance": "400m"}]',
  '["kettlebell", "rower"]',
  4,
  '["kettlebell", "full_body", "conditioning"]'
);

-- 3. Lunge Press Circuit (4-5 Rounds, timed)
INSERT INTO workout_templates (name, description, format, duration_seconds, rounds, exercises, equipment, difficulty, tags) VALUES (
  'Lunge Press Circuit',
  'Single KB flow. 2-3 min rest between rounds.',
  'timed_rounds',
  1200,
  5,
  '[{"name": "Squat Pullover", "reps": 10}, {"name": "Lunge Press", "reps": 8, "per_side": true}, {"name": "Deadlift Row", "reps": 8, "per_side": true}, {"name": "Curl Halo", "reps": 5, "per_side": true}, {"name": "Push-Up Side Plank", "reps": 10, "per_side": true}]',
  '["kettlebell"]',
  3,
  '["kettlebell", "upper_body", "core"]'
);

-- 4. Hyrox Prep (2 Rounds for Time)
INSERT INTO workout_templates (name, description, format, duration_seconds, rounds, exercises, equipment, difficulty, tags) VALUES (
  'Hyrox Prep',
  'Run/station pairs. Simulate race conditions.',
  'for_time',
  2400,
  2,
  '[{"name": "Run", "distance": "400m", "segment": "run"}, {"name": "Wall Balls", "reps": 25, "weight": "14 lb", "segment": "station"}, {"name": "Run", "distance": "400m", "segment": "run"}, {"name": "Reverse Lunges", "reps": 25, "weight": "44 lb", "segment": "station"}, {"name": "Run", "distance": "400m", "segment": "run"}, {"name": "KB Deadlift", "reps": 25, "weight": "53 lb", "segment": "station"}, {"name": "Run", "distance": "400m", "segment": "run"}, {"name": "DB Squat", "reps": 25, "segment": "station"}]',
  '["kettlebell", "dumbbell", "wall_ball"]',
  5,
  '["hyrox", "running", "conditioning"]'
);

-- 5. Rev Lunge Complex (4-5 Rounds, timed)
INSERT INTO workout_templates (name, description, format, duration_seconds, rounds, exercises, equipment, difficulty, tags) VALUES (
  'Rev Lunge Complex',
  'Lower body focus. 2-3 min rest between rounds.',
  'timed_rounds',
  1200,
  5,
  '[{"name": "Reverse Lunges", "reps": 10, "per_side": true}, {"name": "Row to Deadlift", "reps": 10, "per_side": true}, {"name": "Thrusters", "reps": 8, "per_side": true}, {"name": "Marches", "reps": 30, "unit": "sec", "per_side": true}]',
  '["kettlebell"]',
  3,
  '["kettlebell", "lower_body"]'
);

-- 6. Bodyweight Blitz (AMRAP 12 min)
INSERT INTO workout_templates (name, description, format, duration_seconds, exercises, equipment, difficulty, tags, benchmark_score) VALUES (
  'Bodyweight Blitz',
  'No equipment needed. Pure grit.',
  'amrap',
  720,
  '[{"name": "Push-Ups", "reps": 10}, {"name": "Air Squats", "reps": 15}, {"name": "Burpees", "reps": 5}, {"name": "Sit-Ups", "reps": 10}]',
  '["bodyweight"]',
  2,
  '["bodyweight", "full_body", "no_equipment"]',
  '8 rounds'
);

-- 7. Pull-Up & Push-Up EMOM (10 min)
INSERT INTO workout_templates (name, description, format, duration_seconds, exercises, equipment, difficulty, tags) VALUES (
  'Pull-Up Push-Up EMOM',
  'Every minute on the minute. Finish the work, rest the remainder. Alternating movements.',
  'emom',
  600,
  '{"minutes": 10, "alternating": true, "odd_exercises": [{"name": "Pull-Ups", "reps": 5}], "even_exercises": [{"name": "Push-Ups", "reps": 12}]}',
  '["bodyweight", "pull_up_bar"]',
  3,
  '["bodyweight", "emom", "upper_body"]'
);

-- 8. Mobility Flow EMOM (12 min)
INSERT INTO workout_templates (name, description, format, duration_seconds, exercises, equipment, difficulty, tags) VALUES (
  'Mobility Flow EMOM',
  'Build stability and control. Each minute is a different hold or movement.',
  'emom',
  720,
  '{"minutes": 12, "alternating": false, "exercises": [{"name": "Cossack Squats", "reps": 5, "per_side": true}, {"name": "Deep Squat Hold", "reps": 1, "unit": "30 sec"}, {"name": "Pistol Squats (or assisted)", "reps": 3, "per_side": true}]}',
  '["bodyweight"]',
  3,
  '["bodyweight", "mobility", "emom", "no_equipment"]'
);

-- 9. KB Swing EMOM (10 min)
INSERT INTO workout_templates (name, description, format, duration_seconds, exercises, equipment, difficulty, tags) VALUES (
  'KB Swing EMOM',
  'Simple and brutal. 15 swings at the top of every minute. Rest what''s left.',
  'emom',
  600,
  '{"minutes": 10, "alternating": false, "exercises": [{"name": "KB Swings", "reps": 15}]}',
  '["kettlebell"]',
  2,
  '["kettlebell", "emom", "conditioning"]'
);

-- 10. Calisthenics AMRAP (20 min)
INSERT INTO workout_templates (name, description, format, duration_seconds, exercises, equipment, difficulty, tags, benchmark_score) VALUES (
  'Calisthenics AMRAP',
  'Gymnastics-inspired bodyweight work. Scale as needed.',
  'amrap',
  1200,
  '[{"name": "Pull-Ups", "reps": 5}, {"name": "Dips", "reps": 10}, {"name": "Pistol Squats", "reps": 6, "per_side": true}, {"name": "L-Sit Hold", "reps": 1, "unit": "15 sec"}, {"name": "Handstand Hold", "reps": 1, "unit": "20 sec"}]',
  '["bodyweight", "pull_up_bar", "dip_bars"]',
  4,
  '["bodyweight", "calisthenics", "gymnastics"]',
  '6 rounds'
);
