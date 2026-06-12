# Current State (June 12, 2026)

## Project Location
- Active project: /Users/ryancontino/Documents/projects/refactor-athletics
- Branch: main

## Working Agreement
- Chino wants to understand and code more, AI guides and assists
- AI asks clarifying questions before building (see skills.md Section 0)
- Don't push to prod without Chino confirming locally first
- Prefer plan mode for multi-file changes; just code for simple fixes
- No duplicate utility functions — always check existing before creating new

## v2 Direction — "The Focused Product"
- **North Star Document:** `docs/GAME_DESIGN_V2.md`
- v1 had feature sprawl; v2 strips to 3 screens (Power Level, Arena, Train)
- Radical simplification: cut habits, streaks, heatmaps, Refactor Score, Daily Rites, complex nutrition
- Power Level is the home screen hero metric
- Arena is the social/retention engine
- Train is the daily action screen

## Key Decisions (June 12 — v2 Game Design Session)

### Game Economy
- Power Level decays: validity windows (L1-2: 90 days, L3-4: 60 days, L5: 45 days)
- Best within window counts (not most recent) — prevents "afraid to log" perverse incentive
- Window refreshes on any log of that exercise
- Player Level = engagement badge on profile, gates cosmetic unlocks, never decays
- XP from: workouts, cardio (8/min), rank-ups (200, re-earnable), steps (1/1000, excluded during workouts), nutrition (50/day binary), bounties, duels, challenges
- No XP from: sleep, water, HRV, recovery, strain, passive existence

### Weekly Bounties
- 3 per week, 1 from each pillar (Training, Consistency, Social/Meta)
- 8 bounty types rotating through the 3 pillars
- Targets personalized: trailing 4-week average × difficulty modifier
- Difficulty selector (Easy −25%/100XP, Normal/150XP, Hard +25%/225XP) locked after first progress
- Sweep bonus (25/50/100 XP)
- Monday–Sunday cadence, user's local timezone

### Challenge System (Arena Cohesion)
- Custom Challenges: daily boolean checklist, configurable duration (default 75 days), strict all-metrics-daily, shared fate or individual failure mode
- Habit tracking ONLY exists inside custom challenges (not in main UI)
- Group Challenges: weekly, leader-set, collaborative or competitive
- Duels: 1v1, time-boxed (24h/7d/30d) or race-to-target, accept or ignore
- Limits: 1 custom challenge, 1 group challenge/group, 3 duels, bounties always present
- Visibility: passive (check the board), active notifications only on completions

### Ranked Exercises (Simplified)
- 12 per path (8 universal core + 4 specialty) — down from 12-16 ad-hoc
- Max Power Level = 60 (12 × Level 5) — balanced across all paths
- Universal core: Back Squat, Deadlift, Bench Press, Pull-up, Overhead Press, Run 1 Mile, Plank, Push-ups
- Path renamed: Mobility → "Mobility & Calisthenics"
- Removed from ranked: barbell_bicep_curl, calf_raises, wall_slide, shoulder_dislocate, kettlebell_halo/windmill/turkish_get_up, body_weight_squat, goblet_squat, active_hang, burpees
- New exercise needed: L-Sit Hold (standards TBD)

### Visual Direction — "Polished Retro"
- Two layers: modern data UI + pixel art identity layer
- Theme = app-wide color palette (Draconic: red/gold, Samurai: indigo/pink, Viking: blue/ice, Apex: green/amber, Athlete: navy/white)
- Typography: pixel font for Power Level number + headers (24px+), Inter for body
- Classic mode = Athlete theme (same system, neutral flavor)
- Assets: AI-generated pixel art + open-source sprite packs
- Power Level visual tiers (Bronze → Diamond) with evolving frames

## Previous Decisions (June 8-11, still valid)
- Preferred cardio equipment: user picks treadmill/rower/bike/elliptical in Settings
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
