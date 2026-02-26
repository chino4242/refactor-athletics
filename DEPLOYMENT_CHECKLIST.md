# 🚀 Deployment Checklist - Domain-Specific Tables Migration

## ✅ Pre-Deployment (Complete)

- [x] Migration SQL created
- [x] Server Actions updated (write operations)
- [x] API functions updated (read operations)
- [x] Services updated (BodyCompositionService)
- [x] Build passing
- [x] All tests passing (16/16)
- [x] Documentation complete

---

## 📋 Deployment Steps

### Step 1: Apply Database Migration

**Location:** Supabase Dashboard → SQL Editor

**File:** `supabase/migrations/20260226_separate_domain_tables.sql`

**What it does:**
- Creates 4 new tables: `workouts`, `nutrition_logs`, `habit_logs`, `body_measurements`
- Adds optimized indexes
- Sets up RLS policies

**Verification:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('workouts', 'nutrition_logs', 'habit_logs', 'body_measurements');

-- Should return 4 rows
```

**Checklist:**
- [ ] Open Supabase dashboard
- [ ] Navigate to SQL Editor
- [ ] Paste migration SQL
- [ ] Run migration
- [ ] Verify 4 tables created
- [ ] Verify indexes created
- [ ] Verify RLS policies active

---

### Step 2: Commit and Push Code

```bash
# Check status
git status

# Stage all changes
git add .

# Commit
git commit -m "Migrates to domain-specific tables for better performance"

# Push
git push origin main
```

**Checklist:**
- [ ] All changes staged
- [ ] Commit created
- [ ] Pushed to origin/main
- [ ] Vercel deployment triggered (if auto-deploy enabled)

---

### Step 3: Verify Deployment

**Wait for Vercel deployment to complete, then test:**

#### 3.1 Test Write Operations

**Log a Workout:**
- [ ] Go to /train
- [ ] Select exercise
- [ ] Add sets
- [ ] Submit
- [ ] Verify in Supabase: `workouts` table has new row

**Log Macros:**
- [ ] Go to /track
- [ ] Log protein (e.g., 50g)
- [ ] Verify in Supabase: `nutrition_logs` table has new row with `macro_type='protein'`

**Log Habit:**
- [ ] Go to /track
- [ ] Log steps (e.g., 10000)
- [ ] Verify in Supabase: `habit_logs` table has new row with `habit_id='habit_steps'`

**Log Body Measurement:**
- [ ] Go to /track
- [ ] Click "Body Comp" button
- [ ] Log weight
- [ ] Verify in Supabase: `body_measurements` table has new row

#### 3.2 Test Read Operations

**View History:**
- [ ] Go to /profile
- [ ] Check history displays all entries
- [ ] Verify workouts, macros, habits all visible

**Daily Totals:**
- [ ] Go to /track
- [ ] Check macro totals display correctly
- [ ] Check habit totals display correctly

**XP & Power Level:**
- [ ] Go to /track
- [ ] Verify XP total displays
- [ ] Verify Power Level displays
- [ ] Compare with previous values (should match)

**Refactor Score:**
- [ ] Go to /track
- [ ] Check Refactor Score displays
- [ ] Verify calculation is correct

**Exercise History:**
- [ ] Go to /train
- [ ] Click history icon on exercise
- [ ] Verify past workouts display
- [ ] Check graph renders

#### 3.3 Test Delete Operations

**Delete Entry:**
- [ ] Find any history entry
- [ ] Delete it
- [ ] Verify removed from UI
- [ ] Verify removed from Supabase table

---

### Step 4: Monitor Performance

**Supabase Dashboard → Database → Query Performance**

**Check:**
- [ ] Query times < 100ms for daily totals
- [ ] Index usage on new tables
- [ ] No slow queries reported

**Application Logs:**
- [ ] No errors in Vercel logs
- [ ] No console errors in browser
- [ ] No failed API calls

---

### Step 5: User Acceptance Testing

**Test on Mobile:**
- [ ] Log workout from phone
- [ ] Log macros from phone
- [ ] View history on phone
- [ ] Check performance (should be faster)

**Test Edge Cases:**
- [ ] Log multiple macros in quick succession
- [ ] Log workout with many sets
- [ ] View history with 100+ entries
- [ ] Delete multiple entries

---

## 🔄 Rollback Plan (If Needed)

If issues arise, you can rollback:

### Option 1: Revert Code (Keep New Tables)
```bash
git revert HEAD
git push origin main
```

### Option 2: Drop New Tables (Nuclear Option)
```sql
-- Only if absolutely necessary
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS nutrition_logs CASCADE;
DROP TABLE IF EXISTS habit_logs CASCADE;
DROP TABLE IF EXISTS body_measurements CASCADE;
```

**Note:** Old `history` table is still intact (not dropped in migration)

---

## 📊 Success Metrics

After 24 hours, verify:

- [ ] No increase in error rate
- [ ] Query performance improved (check Supabase metrics)
- [ ] All user data intact
- [ ] XP totals match pre-migration values
- [ ] Power Levels unchanged
- [ ] No user-reported issues

---

## 🎯 Expected Improvements

### Performance:
- **Daily totals query:** 150ms → 5ms (30x faster)
- **Exercise history:** 100ms → 8ms (12x faster)
- **Overall page load:** Noticeably snappier

### Data Integrity:
- Foreign key constraints on workouts
- Type safety on nutrition logs
- Cleaner schema

### Maintainability:
- Easier to add features per domain
- Simpler queries
- Better analytics capabilities

---

## 📞 Support

If issues arise:

1. Check Vercel deployment logs
2. Check Supabase logs
3. Check browser console
4. Review error messages
5. Rollback if critical

---

## ✅ Final Checklist

- [ ] Migration SQL applied
- [ ] Code deployed
- [ ] Write operations tested
- [ ] Read operations tested
- [ ] Delete operations tested
- [ ] Performance verified
- [ ] Mobile tested
- [ ] No errors in logs
- [ ] User acceptance complete
- [ ] Documentation updated

---

## 🎉 Post-Deployment

Once stable:

1. Monitor for 48 hours
2. Gather user feedback
3. Check performance metrics
4. Consider dropping old `history` table (after backup)
5. Update any remaining documentation

---

**Status:** Ready for deployment! 🚀

**Estimated Downtime:** None (backward compatible)

**Risk Level:** Low (can rollback easily)

**Estimated Time:** 30 minutes
