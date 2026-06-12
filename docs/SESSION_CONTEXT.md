# Current State (June 11, 2026)

## Project Location
- Active project: /Users/ryancontino/Documents/projects/refactor-athletics
- Branch: main

## Working Agreement
- Chino wants to understand and code more, AI guides and assists
- AI asks clarifying questions before building (see skills.md Section 0)
- Don't push to prod without Chino confirming locally first
- Prefer plan mode for multi-file changes; just code for simple fixes
- No duplicate utility functions — always check existing before creating new

## Key Decisions (June 8-11)
- Training paths unlocked: Strength, Endurance, Mobility all available
- Preferred cardio equipment: user picks treadmill/rower/bike/elliptical in Settings
- 75-day challenge: per-member customizable metrics, live table checklist, shared fate
- Nutrition: search picker (not auto-add), meal type selector, AI returns grams estimate
- Onboarding quests: non-sequential checklist (all visible at once)
- Daily Rites: quick-toggle habits on Today tab
- Refactor Score: 14-day composite on Today tab
- Date handling: parseLocalDate() / string comparison mandatory (skills.md Section 13)

## Known Resolved Issues
- UTC date bugs: systematic fix with utilities + ESLint rule + skills.md convention
- 75-day challenge false failure: getMetricValue had wrong metric IDs + snapshot updater was overwriting passed days
- Native health sync: isNative() function (not const), totalCalories data type, (Sync) labels for set-mode
- Workout path switching: schedule API has default programs fallback, filters by selected_path
- Empty program variants: workout API tries all variants, old empties cleaned from DB
- Steps duplicating: fixed with set-mode (Sync) label

## Active 75-Day Challenge
- Challenge ID: fb5cfcdd-65df-4b8b-9cbb-d9980f8fbafc
- Members: ryanj.contino (joined), apujol (not yet joined)
- Metrics: Active Minutes ≥30, Steps ≥7500, Workouts ≥1, Protein ≥100, Water ≥100
- Start: June 8, 2026

## User Accounts
- ryanj.contino@gmail.com (main dev) — Draconic theme, Mobility path
- apujol@outlook.com (beta tester) — TestFlight Build 1

## TestFlight Status
- Build 2 uploaded, compliance resolved, ready to add to test group
- Build 1 still active for beta tester

## Changes Made (June 7 Session)

### 75 Day Challenge
- Added "Active Minutes" (30 min default) as a daily metric option

### DailyWrapUp Redesign
- Hero stat (biggest accomplishment in bold)
- XP progress bar with level progress and "X to Lv Y"
- Theme-voiced reflections (5 themes × active/rest messages)
- Level-up celebration when XP crosses level boundary
- Streak callout (consecutive days with activity)
- Best day comparison / new personal best detection
- Personalized nudge targets from user's habit_targets
- Classic mode uses generic text and "pts" instead of "XP"
- Progressive disclosure (XP breakdown behind toggle)

### XP System
- Normalized XP labels: stripped "(Sync)" at write time and read time
- Sources below 5 XP rolled into "Other"
- Daily Power-Up: one habit gets 2x XP per day (deterministic by date)

### Nutrition Tracker Redesign
- New NutritionSection orchestrator with 4 sub-components:
  - NutritionInput: inline AI text + camera with smart routing
  - MealCart: inline cart with Log Meal button
  - RecentFoods: horizontal scroll chips, one-tap instant log
  - NutritionProgress: collapsed summary, daily/weekly toggle
- Camera permission request for native Android
- Old NutritionTracker/MacroLogModal preserved but no longer imported

### WHOOP Sync Fix
- Cycle data now written to cycle's start date (not today)
  - Prevents yesterday's 5,504 total burn from showing under today
- Native health sync skips calories_burned, sleep, HRV, resting HR when WHOOP connected
- getHabitProgress queries by date column (matches delete logic)

### Exercise Sync Architecture
- Extracted exerciseSyncService.ts (shared between native + webhook)
- New /api/sync/exercises route (Supabase session auth, no sync_token)
- Native app reads Health Connect exercise sessions (36h window)
- DashboardClient posts exercises to session-authenticated endpoint
- Running detection: type codes 46/47, distance matching (400m, 1mi, 2mi, 5K, 5mi)

### Android Widget
- DailyProgressWidget.kt: reads SharedPreferences, shows streak/level/XP/quests/habits
- widget_daily_progress.xml: dark 4×2 layout
- widgetBridge.ts: writes full data (streak, level, XP, quests, steps, sleep, protein)
- Registered in AndroidManifest
- @capacitor/preferences installed

### Refactor Score System
- refactorScore.ts: composite 0-100 score with 5 sub-scores
  - Consistency (30%): targets hit over 14 days
  - Training (25%): weekly volume + frequency
  - Recovery (20%): sleep + HRV trend + rest days
  - Nutrition (15%): protein + calorie adherence
  - Body Recomp (10%): weight/bf% direction vs goals
- Mood/Energy habit: 5-emoji scale (😫😐🙂😊🔥)
- Daily Power-Up banner on Today tab
- RefactorScoreCard: ring chart + sub-scores with trend arrows

### Power Level Improvements
- Partial progress within levels (% to next threshold per exercise)
- Easiest next level-up callout card
- Letter grade (S/A/B/C/D/F) based on % of max possible
- What-if projection on level-up card
- Power Level history table (weekly snapshots for trend chart)
- Bar chart trend on Power Level page

### Permissions (iOS + Android)
- iOS: HealthKit entitlement (App.entitlements), NSCameraUsageDescription
- Android: CAMERA permission in AndroidManifest
- Onboarding: success/failure feedback with platform-specific guidance
- Dashboard: tracks permission denial in localStorage

### Visual Design Overhaul
- XP text → amber-400 (was orange-400)
- Hover borders → zinc-600 (was orange-500) across 24+ components
- Links → zinc-300 hover:white (was orange-500)
- Focus rings → zinc-500 (was orange-500) across 21 components
- Nav active state → bg-zinc-800 text-white (was bg-orange-600)
- Tab active → text-white (was text-orange-500)
- Mobile nav active → text-white bg-zinc-800
- Starter Quest card → subtle zinc border, white CTA button
- Orange reserved for primary action buttons only

## Database Migrations Needed
1. `20260607_power_level_history.sql` — power_level_history table (NOT YET APPLIED)

## Known Issues
- Stale calories_burned rows from today (multiple duplicates from earlier sync races)
  - Fix deployed but existing rows need manual cleanup in Supabase
- TestFlight Build 2 needs to be added to test group
- Android widget progress bar uses default system colors (tint attributes removed)

## User Accounts
- ryanj.contino@gmail.com (main dev) — Draconic theme
- apujol@outlook.com (beta tester) — TestFlight Build 1
- test@test.com, test1234@test.com (test accounts)

## Next Steps (from today's discussions)
- Clean up stale calories_burned in Supabase
- Run power_level_history migration
- Add Build 2 to TestFlight test group
- Correlated insights (Phase 3, needs 30+ days data)
- Monthly report card
- Theme accent from themes.ts instead of hardcoded colors (medium-term)
- Background WorkManager for Android widget refresh
- Configurable widget habits
