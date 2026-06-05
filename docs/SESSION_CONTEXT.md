# Current State (June 5, 2026)

## Project Location
- Active project: /Users/ryancontino/Documents/projects/refactor-athletics
- Branch: main (feature/starter-quests merged)

## TestFlight Status
- Build uploaded and APPROVED on App Store Connect
- Beta tester (apujol@outlook.com) experiencing black screen — likely needs delete + reinstall
- iOS fix: removed WKAppBoundDomains, added splash spinner, expanded allowNavigation
- Next TestFlight build needed after tester confirms delete+reinstall doesn't work

## Changes Made (June 2-5 Session)

### Bug Fixes Pushed to Main
- Rest timer: wall-clock based (survives backgrounding) + audio fires once/second (was 4x)
- Workout route: .single() → loop through all variants (fixes empty workout loading)
- Workout route: case-sensitivity fix (day_of_week normalization)
- Schedule route: generateTitle from exercises (not "Monday - hybrid")
- False completion: removed fuzzy substring matching (deadlift no longer matches RDL)
- Flexible mode: explicit targetIndex to handleBlockComplete (fixes stale closure)
- localStorage restore: requires >2 blocks to short-circuit
- Reset: no longer wipes workout programs
- Onboarding: WHOOP opens new tab, profile saves before step 10
- FirstSessionView: single focused CTA (removed decision paralysis)
- Yesterday's recap: hidden for new users (0 XP)
- Workout in progress banner: hidden on auth pages, auto-clears stale entries
- Profile: fixed tier calculation (was using wrong thresholds)
- Bogus calorie estimate removed from workout report
- Section XP label clarified as summary

### Features Pushed to Main
- 75 Day Challenge: template picker (Full Send / Foundation / Custom)
- 75 Day Challenge: per-member metrics (each person picks own targets)
- 75 Day Challenge: join flow with metric picker (pre-filled with creator's defaults)
- 75 Day Challenge: "Shared Fate" toggle (one fails = all fail, off by default)
- 75 Day Challenge: added to Arena tab on dashboard
- Rank transparency: show Estimated Strength + weight×reps targets throughout
- One-time rank-up education card
- Equipment editor in Settings with runtime swap (non-destructive)
- Settings link on Profile page
- Habit visibility toggles in Settings
- Power Level page: concrete targets per exercise
- XP consolidation: shared xpCalculator.ts utility
- Naming: "Expertise" → "Power Level", "Fitness Score" → "Training Level"
- Meta description updated for social sharing
- Theme descriptions added to onboarding
- Default activity level → moderate (macros were too high)

### Starter Quests (MERGED to main)
- DB: starter_quest_progress + goals columns (migration applied)
- useStarterQuests hook: 8-quest chain, feature gating, auto-detection
- StarterQuestCard + LockedFeatureOverlay components
- Today tab: quest card at top, nutrition row gated, weekly quests gated
- Onboarding wizard slimmed: 10 steps → 6 (waiver, mode, personal info, goals, equipment, health sync)
- Theme/path/nutrition moved to quest chain
- Goals & motivation step added to onboarding
- Tests updated and passing (207/207)
- Spec at docs/STARTER_QUESTS_SPEC.md

### Architecture Improvements
- Shared xpCalculator.ts (canonical formula)
- Shared getTier() used everywhere (was duplicated with different thresholds)
- Removed dead logTraining/logWorkoutBlock from api.ts
- Removed stale files (design docs, scripts, template SVGs)
- Updated .gitignore (allow ios/)

## Database Migrations Applied
1. 20260605_starter_quests.sql — starter_quest_progress + goals on users
2. 20260605_per_member_metrics.sql — member_id on challenge_75_metrics, failed_on/failed_metric on members
3. ALTER TABLE challenges_75 ADD COLUMN shared_failure BOOLEAN DEFAULT false

## Known Issues / Next Steps
- TestFlight black screen: tester needs to delete + reinstall
- Theme Voice System: discussed in party mode, ready to implement (15 P0 strings × 5 themes)
- Theme selection: decision to put back in onboarding (not gate as quest reward)
- 75 Day Challenge invite link: not built yet (currently requires same group)
- Cardio equipment swap (treadmill → rower/spin): discussed, not built
- Remaining duplicated business logic: rank name resolution (3 implementations), Epley formula (shared util exists but unused), getWeekStart (2 implementations)
- Starter quests: need to wire checkQuestTrigger into actual components (dashboard load detects activity)

## User Accounts
- ryanj.contino@gmail.com (main dev) — all quests backfilled as complete
- apujol@outlook.com (beta tester) — experiencing TestFlight black screen
- test@test.com, test1234@test.com (test accounts)

## Beta Plan
- 75-day challenge starting ASAP (once tester is online)
- Focus: stabilize, themed voice (week 2), starter quests UX refinement
- User name: Chino
