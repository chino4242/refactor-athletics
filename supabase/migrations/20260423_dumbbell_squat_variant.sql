-- Add dumbbell squat variant normalizing to back_squat
INSERT INTO catalog (id, name, category, type, xp_factor, required_equipment, normalization_factor, normalizes_to)
VALUES ('dumbbell_squat', 'Dumbbell Squat', 'Legs', 'weight_reps', 0.9, '["dumbbells"]', 1.15, 'back_squat')
ON CONFLICT (id) DO UPDATE SET normalization_factor = 1.15, normalizes_to = 'back_squat';

-- Also link goblet squat as a dumbbell variant of back squat
UPDATE catalog SET normalization_factor = 1.15, normalizes_to = 'back_squat'
WHERE id = 'goblet_squat' AND (normalizes_to IS NULL OR normalizes_to = '');
