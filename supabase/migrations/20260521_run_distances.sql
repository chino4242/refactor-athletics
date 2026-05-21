-- Add 2-mile and 5K run exercises with time-based standards (lower is better)
INSERT INTO catalog (id, name, category, standards, xp_factor, required_equipment)
VALUES 
  ('run_2_mile', '2 Mile Run', 'Endurance', '{
    "unit": "sec",
    "scoring": "lower_is_better",
    "brackets": {
      "male": [
        {"min": 18, "max": 29, "levels": [1080, 960, 840, 750, 690]},
        {"min": 30, "max": 39, "levels": [1140, 1020, 900, 810, 720]},
        {"min": 40, "max": 49, "levels": [1200, 1080, 960, 870, 780]},
        {"min": 50, "max": 65, "levels": [1320, 1200, 1080, 960, 870]}
      ],
      "female": [
        {"min": 18, "max": 29, "levels": [1260, 1140, 1020, 900, 810]},
        {"min": 30, "max": 39, "levels": [1320, 1200, 1080, 960, 870]},
        {"min": 40, "max": 49, "levels": [1440, 1320, 1200, 1080, 960]},
        {"min": 50, "max": 65, "levels": [1560, 1440, 1320, 1200, 1080]}
      ]
    }
  }', 1.5, '["outdoor_running"]'),
  ('run_5k', '5K Run', 'Endurance', '{
    "unit": "sec",
    "scoring": "lower_is_better",
    "brackets": {
      "male": [
        {"min": 18, "max": 29, "levels": [1800, 1560, 1380, 1260, 1140]},
        {"min": 30, "max": 39, "levels": [1920, 1680, 1500, 1380, 1260]},
        {"min": 40, "max": 49, "levels": [2100, 1860, 1680, 1500, 1380]},
        {"min": 50, "max": 65, "levels": [2400, 2100, 1920, 1740, 1560]}
      ],
      "female": [
        {"min": 18, "max": 29, "levels": [2100, 1860, 1680, 1500, 1380]},
        {"min": 30, "max": 39, "levels": [2280, 2040, 1800, 1620, 1500]},
        {"min": 40, "max": 49, "levels": [2520, 2280, 2040, 1860, 1680]},
        {"min": 50, "max": 65, "levels": [2820, 2520, 2280, 2100, 1920]}
      ]
    }
  }', 2.0, '["outdoor_running"]')
ON CONFLICT (id) DO NOTHING;
