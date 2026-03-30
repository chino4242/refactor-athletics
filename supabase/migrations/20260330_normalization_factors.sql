-- Add smith_machine to equipment options and normalization support

-- Add normalization columns to catalog
ALTER TABLE catalog ADD COLUMN IF NOT EXISTS normalization_factor numeric DEFAULT 1.0;
ALTER TABLE catalog ADD COLUMN IF NOT EXISTS normalizes_to text; -- references the "base" exercise id for display grouping

-- Smith machine exercise variants
INSERT INTO catalog (id, name, category, type, xp_factor, required_equipment, normalization_factor, normalizes_to) VALUES
  ('smith_bench_press',     'Smith Machine Bench Press',     'Chest',     'weight_reps', 0.9,  '["smith_machine"]', 0.85, 'bench_press'),
  ('smith_incline_press',   'Smith Machine Incline Press',   'Chest',     'weight_reps', 0.9,  '["smith_machine"]', 0.85, 'incline_bench'),
  ('smith_decline_press',   'Smith Machine Decline Press',   'Chest',     'weight_reps', 0.8,  '["smith_machine"]', 0.85, 'decline_bench_press'),
  ('smith_squat',           'Smith Machine Squat',           'Legs',      'weight_reps', 0.9,  '["smith_machine"]', 0.85, 'back_squat'),
  ('smith_overhead_press',  'Smith Machine Overhead Press',  'Shoulders', 'weight_reps', 0.9,  '["smith_machine"]', 0.85, 'overhead_press'),
  ('smith_rdl',             'Smith Machine RDL',             'Legs',      'weight_reps', 0.8,  '["smith_machine"]', 0.85, 'rdl'),
  ('smith_hip_thrust',      'Smith Machine Hip Thrust',      'Legs',      'weight_reps', 0.7,  '["smith_machine"]', 0.85, 'hip_thrusts'),
  ('smith_calf_raise',      'Smith Machine Calf Raise',      'Legs',      'weight_reps', 0.2,  '["smith_machine"]', 0.85, 'calf_raises'),
  ('smith_shrug',           'Smith Machine Shrug',           'Back',      'weight_reps', 0.4,  '["smith_machine"]', 0.85, 'shrugs'),
  ('smith_row',             'Smith Machine Row',             'Back',      'weight_reps', 0.8,  '["smith_machine"]', 0.85, 'barbell_row')
ON CONFLICT (id) DO NOTHING;

-- Set normalization factors for existing dumbbell variants
UPDATE catalog SET normalization_factor = 1.15, normalizes_to = 'bench_press' WHERE id = 'dumbbell_bench_press';
UPDATE catalog SET normalization_factor = 1.15, normalizes_to = 'incline_bench' WHERE id = 'incline_dumbbell_press';
UPDATE catalog SET normalization_factor = 1.15, normalizes_to = 'overhead_press' WHERE id = 'seated_dumbbell_press';
UPDATE catalog SET normalization_factor = 1.1, normalizes_to = 'barbell_row' WHERE id = 'dumbbell_row';
UPDATE catalog SET normalization_factor = 1.1, normalizes_to = 'barbell_bent_over_row' WHERE id = 'db_single_arm_row';
UPDATE catalog SET normalization_factor = 1.1, normalizes_to = 'shrugs' WHERE id = 'db_shrug';
