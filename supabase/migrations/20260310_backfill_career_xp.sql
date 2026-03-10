-- Backfill career_xp for existing users based on their logged activities
UPDATE users
SET career_xp = (
  SELECT COALESCE(SUM(xp), 0)
  FROM (
    SELECT xp FROM workouts WHERE user_id = users.id
    UNION ALL
    SELECT xp FROM habit_logs WHERE user_id = users.id
    UNION ALL
    SELECT xp FROM nutrition_logs WHERE user_id = users.id
  ) AS all_xp
)
WHERE career_xp IS NULL OR career_xp = 0;
