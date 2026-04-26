-- Add kettlebell exercises to mobility category
INSERT INTO catalog (id, name, category, type, xp_factor, required_equipment, swap_group, standards)
VALUES
    ('turkish_get_up', 'Turkish Get-Up', 'Mobility', 'weight_reps', 1.2, '["kettlebell"]', 'mobility_kb',
     '{"unit": "lbs", "scoring": "higher_is_better", "brackets": {"male": [], "female": []}, "has_age_brackets": false}'),
    ('kettlebell_halo', 'Kettlebell Halo', 'Mobility', 'weight_reps', 0.8, '["kettlebell"]', 'mobility_kb',
     '{"unit": "lbs", "scoring": "higher_is_better", "brackets": {"male": [], "female": []}, "has_age_brackets": false}'),
    ('kettlebell_windmill', 'Kettlebell Windmill', 'Mobility', 'weight_reps', 1.0, '["kettlebell"]', 'mobility_kb',
     '{"unit": "lbs", "scoring": "higher_is_better", "brackets": {"male": [], "female": []}, "has_age_brackets": false}')
ON CONFLICT (id) DO NOTHING;

-- Recategorize kettlebell swing to Mobility
UPDATE catalog SET category = 'Mobility' WHERE id = 'kettlebell_swing';
