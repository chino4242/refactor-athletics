# Trophy Case & Power Level Troubleshooting

## 🔍 Issue
Trophy case is empty and Power Level is not updating after logging workouts.

## 🎯 Root Cause Analysis

### Possible Causes:

1. **Workouts not saving to new `workouts` table**
   - Check if migration was applied
   - Check if `logTrainingAction()` is being called

2. **Data in old `history` table, not new tables**
   - Old workouts are in `history` table
   - New code reads from `workouts` table
   - They won't show up until you log NEW workouts

3. **Rank calculation not working**
   - `logTrainingAction()` might not be calculating rank correctly
   - Check if `level` and `rank_name` are being saved

## 🧪 Diagnostic Steps

### Step 1: Check if migration was applied
Run in Supabase SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('workouts', 'nutrition_logs', 'habit_logs', 'body_measurements');
```
**Expected:** 4 rows

### Step 2: Check if workouts are being saved
Run in Supabase SQL Editor:
```sql
SELECT exercise_id, level, xp, rank_name, date, value, timestamp
FROM workouts 
ORDER BY timestamp DESC 
LIMIT 10;
```
**Expected:** Your recent workouts with `level > 0`

### Step 3: Check old history table
Run in Supabase SQL Editor:
```sql
SELECT exercise_id, level, xp, rank_name, date, value, timestamp
FROM history 
WHERE exercise_id NOT LIKE 'macro_%' 
AND exercise_id NOT LIKE 'habit_%'
ORDER BY timestamp DESC 
LIMIT 10;
```
**Expected:** Your old workouts (before migration)

### Step 4: Check Power Level calculation
Run in Supabase SQL Editor:
```sql
-- This should show max level per exercise
SELECT exercise_id, MAX(level) as max_level
FROM workouts
WHERE user_id = 'YOUR_USER_ID'
GROUP BY exercise_id
ORDER BY max_level DESC;
```
**Expected:** Your exercises with their max levels

## ✅ Solutions

### Solution 1: Data is in old `history` table
**Problem:** You logged workouts BEFORE the migration, so they're in the old table.

**Fix:** Log a NEW workout after deployment. The new workout will:
- Save to `workouts` table
- Show up in trophy case
- Update Power Level

### Solution 2: Migration not applied
**Problem:** The new tables don't exist yet.

**Fix:** Apply the migration SQL in Supabase dashboard (you already did this).

### Solution 3: Rank calculation broken
**Problem:** `logTrainingAction()` is saving `level: 0` or `level: null`.

**Fix:** Check the workout you just logged:
```sql
SELECT * FROM workouts ORDER BY timestamp DESC LIMIT 1;
```

If `level` is 0 or null, the rank calculation is broken.

## 🔧 Quick Fix: Migrate Old Data (Optional)

If you want your old workouts to show up, run this migration:
```sql
-- Copy workouts from history to workouts table
INSERT INTO workouts (user_id, exercise_id, timestamp, date, value, raw_value, rank_name, level, xp, sets, created_at)
SELECT 
    user_id,
    exercise_id,
    timestamp,
    date,
    value,
    raw_value,
    rank_name,
    level,
    xp,
    details as sets,
    created_at
FROM history
WHERE exercise_id NOT LIKE 'macro_%'
  AND exercise_id NOT LIKE 'habit_%'
  AND exercise_id != 'body_weight'
  AND level > 0;
```

**Warning:** Only run this ONCE or you'll get duplicates!

## 📊 Expected Behavior

### After logging a workout:
1. **Workouts table:** New row with `level > 0`
2. **Trophy Case:** Exercise appears with rank badge
3. **Power Level:** Increases by `level × 100`

### Example:
- Log Bench Press at Level 2
- Trophy Case: Shows "Bench Press - Level 2 - Rookie"
- Power Level: Increases by 200

## 🎯 Next Steps

1. **Check Supabase:** Run diagnostic queries above
2. **Log a new workout:** After deployment completes
3. **Refresh page:** Check if trophy case updates
4. **Report back:** Share results of diagnostic queries

## 📝 Notes

- Old workouts in `history` table won't show up automatically
- You need to either:
  - A) Log new workouts (they'll save to new tables)
  - B) Run migration script to copy old data
- Power Level only counts workouts with `level > 0`
