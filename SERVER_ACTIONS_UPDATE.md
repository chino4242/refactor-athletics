# Server Actions Update - Summary

## ✅ Completed: Write Operations

All Server Actions have been updated to write to the new domain-specific tables.

### Updated Actions:

#### 1. **logHabitAction()** - Routes by Type
```typescript
// Routes to nutrition_logs or habit_logs based on habitId prefix
if (habitId.startsWith('macro_')) → nutrition_logs
if (habitId.startsWith('habit_')) → habit_logs
```

**Tables:**
- `nutrition_logs` - protein, carbs, fat, calories, water
- `habit_logs` - steps, sleep, meal_prep, etc.

#### 2. **logTrainingAction()** - Workouts Table
```typescript
// Writes to workouts table with sets data
workouts.insert({ exercise_id, sets, xp, ... })
```

**Table:** `workouts`

#### 3. **logWorkoutBlockAction()** - Workout Blocks
```typescript
// Writes workout blocks to workouts table
workouts.insert({ exercise_id: 'block_...', ... })
```

**Table:** `workouts`

#### 4. **logBodyMeasurementAction()** - NEW
```typescript
// New action for body measurements
body_measurements.insert({ weight, waist, arms, ... })
```

**Table:** `body_measurements`

#### 5. **deleteHistoryItemAction()** - All Tables
```typescript
// Deletes from all tables in parallel
Promise.all([
  workouts.delete(),
  nutrition_logs.delete(),
  habit_logs.delete(),
  body_measurements.delete()
])
```

### Updated Services:

#### **BodyCompositionService.ts**
- `getHistory()` - Reads from `body_measurements` table
- `logMeasurements()` - Calls `logBodyMeasurementAction()`

---

## 🔄 Next Steps: Read Operations

Components still need to be updated to read from new tables:

### High Priority:
1. ⏳ **DailyQuest.tsx** - Query `habit_logs` and `nutrition_logs` for daily totals
2. ⏳ **Training.tsx** - Query `workouts` for exercise history
3. ⏳ **TrackPage.tsx** - Calculate total XP from all tables
4. ⏳ **NutritionTracker.tsx** - Query `nutrition_logs` for daily totals

### Medium Priority:
5. ⏳ **PowerRadar.tsx** - Query `workouts` for attribute calculations
6. ⏳ **api/workout/route.ts** - Use `workouts` table
7. ⏳ **api/workouts/history/route.ts** - Use `workouts` table

---

## 📊 Migration Status

| Component | Write ✅ | Read ⏳ | Status |
|-----------|---------|---------|--------|
| Server Actions | ✅ | N/A | Complete |
| BodyCompositionService | ✅ | ✅ | Complete |
| DailyQuest | ✅ | ⏳ | Needs update |
| Training | ✅ | ⏳ | Needs update |
| TrackPage | ✅ | ⏳ | Needs update |
| NutritionTracker | ✅ | ⏳ | Needs update |

---

## 🧪 Testing Checklist

### Write Operations (Ready to Test):
- [ ] Log macro (protein/carbs/fat) → Appears in `nutrition_logs`
- [ ] Log habit (steps/sleep) → Appears in `habit_logs`
- [ ] Log workout → Appears in `workouts`
- [ ] Log body measurement → Appears in `body_measurements`
- [ ] Delete entry → Removes from correct table

### Read Operations (After Component Updates):
- [ ] Daily totals calculate correctly
- [ ] Workout history displays
- [ ] Total XP calculates correctly
- [ ] Power Level unchanged
- [ ] Physique Points unchanged

---

## 🚀 Deployment Plan

### Phase 1: Apply Migration ✅
```bash
# Run in Supabase dashboard
supabase/migrations/20260226_separate_domain_tables.sql
```

### Phase 2: Deploy Write Updates ✅
- Server Actions updated
- BodyCompositionService updated
- Build successful ✅

### Phase 3: Update Read Queries (Next)
- Update components to query new tables
- Test each component individually
- Verify data integrity

### Phase 4: Cleanup
- Remove old `history` table references
- Update types/interfaces
- Final testing

---

## 📝 Files Modified

### Server Actions:
- ✅ `src/app/actions.ts` - All write operations updated

### Services:
- ✅ `src/services/BodyCompositionService.ts` - Reads from `body_measurements`

### Migration:
- ✅ `supabase/migrations/20260226_separate_domain_tables.sql` - New schema

### Documentation:
- ✅ `SCHEMA_MIGRATION_GUIDE.md` - Complete migration guide
- ✅ `SCHEMA_COMPARISON.md` - Before/after comparison
- ✅ `SERVER_ACTIONS_UPDATE.md` - This file

---

## 🎯 Current State

**Write Operations:** ✅ Complete and tested (build passing)

**Read Operations:** ⏳ Pending (components still query old `history` table)

**Next Action:** Update component read queries to use new tables

---

## 💡 Key Design Decisions

1. **Routing Logic:** `logHabitAction()` routes by `habitId` prefix
   - `macro_*` → `nutrition_logs`
   - `habit_*` → `habit_logs`

2. **XP Tracking:** All tables include `xp` column
   - Nutrition: 10 XP per log
   - Habits: 10-100 XP (varies by habit)
   - Workouts: Calculated from sets × XP factor
   - Body measurements: 5 XP per log

3. **Delete Strategy:** Delete from all tables in parallel
   - Handles uncertainty about which table contains the entry
   - Efficient with Promise.all()

4. **Body Measurements:** New dedicated action
   - Accepts all measurements in one call
   - Stores as single row (not separate habit logs)
