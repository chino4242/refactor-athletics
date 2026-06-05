-- Starter Quests: progressive onboarding system
-- Adds quest progress tracking and user goals/motivation

ALTER TABLE users ADD COLUMN IF NOT EXISTS starter_quest_progress JSONB DEFAULT '[]';
-- Format: [{ "id": "first_strike", "completed_at": "2026-06-05T..." }, ...]

ALTER TABLE users ADD COLUMN IF NOT EXISTS goals JSONB DEFAULT '{}';
-- Format: { "motivations": ["lose_weight", "get_stronger"], "target_weight": "175", "success_statement": "..." }

-- Backfill: existing onboarded users get all quests marked as complete
UPDATE users 
SET starter_quest_progress = '[
  {"id": "first_strike", "completed_at": "2026-01-01T00:00:00Z"},
  {"id": "choose_identity", "completed_at": "2026-01-01T00:00:00Z"},
  {"id": "fuel_up", "completed_at": "2026-01-01T00:00:00Z"},
  {"id": "daily_discipline", "completed_at": "2026-01-01T00:00:00Z"},
  {"id": "find_your_path", "completed_at": "2026-01-01T00:00:00Z"},
  {"id": "full_session", "completed_at": "2026-01-01T00:00:00Z"},
  {"id": "perfect_day", "completed_at": "2026-01-01T00:00:00Z"},
  {"id": "join_the_arena", "completed_at": "2026-01-01T00:00:00Z"}
]'::jsonb
WHERE is_onboarded = true AND (starter_quest_progress IS NULL OR starter_quest_progress = '[]'::jsonb);
