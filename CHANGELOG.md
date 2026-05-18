# Changelog

All notable changes to Refactor Athletics.

## [Unreleased] — May 2026

### Architecture
- Decomposed `ActiveWorkout.tsx` (2,400 lines → 339 lines + 7 sub-components)
- Created formal PRD and Architecture documents
- Unified monetization strategy (RevenueCat + Stripe)
- Updated Story Map with accurate MVP scope for iOS launch
- Added Capacitor iOS project (server URL approach)
- Fixed 17 failing tests (Supabase mock chaining)
- Added 11 integration tests (onboarding flow, workout completion)
- Removed dead V1 components, renamed V2 → canonical names
- Removed dev artifacts (SQL scripts, screenshots, tsc output)

## [0.1.0] — Feb–May 2026

### Core Features
- Migrated from monolithic `history` table to domain-specific tables
- Implemented PWA functionality (service worker, manifest, offline support, install prompt)
- Added comprehensive test coverage (189 tests covering critical business logic)
- Dashboard as home screen with pull-to-refresh, skeleton loaders, and improved UX
- Onboarding wizard for new user setup with waiver, theme, and path selection

### Workout System
- Workout program builder with exercise selection and category filtering
- Active workout UX overhaul: prescribed rep targets, 'Block X of Y' progress, reps-only mode
- Workout session IDs to group sets logged in the same session
- Workout report: post-workout summary with exercise details
- Workout text parser: parse descriptions into structured exercise data
- Equipment variant picker: select barbell/dumbbell/smith per exercise
- Plate calculator: only shows for barbell/smith exercises, fills all sets
- Live rank nudge: shows gap to next rank after each set
- Rank-up celebration: before → after rank display with themed names
- Workout-in-progress banner: auto-clears on completion
- Cardio XP scaling: duration/distance exercises earn 8 XP per minute
- RestTimerBar redesign: solid blue background with white text

### Nutrition & Habits
- Automatic calorie calculation from macros (protein × 4 + carbs × 4 + fat × 9)
- Calorie deficit tracking: calories burned input, net calorie summary, weekly bar chart
- Consistency heatmaps: week/month/year toggle, daily streak counter per habit
- Day strain: new habit for WHOOP-style intensity tracking
- Steps set-only mode: type total, replaces previous value
- Wearable habits: strain, recovery, HRV, resting HR with Wearable Sync category
- Habit visibility toggles

### Body Composition
- Body composition modes: Tape Measure (inches) and Scale (muscle lbs + fat % per region)
- Scale mode batch logging: single "Log All" button
- Delete/reset measurements: delete individual or reset all
- Physique Points fix: upsert per date, per-metric non-null scanning
- Health metrics: lean body mass, VO2 max, BMR, height (synced from wearables)

### Health Integrations
- WHOOP OAuth: full flow syncing strain, recovery, HRV, sleep, calories burned, weight
- Health Connect webhook: 12 data types with token-in-URL auth
- Google Health Connect: OAuth integration
- Data source priority: WHOOP for sleep/calories/HRV; Health Connect for steps/weight
- Manual sync token: endpoint for Apple Shortcuts / HTTP webhook
- Auto-sync on dashboard load + daily Vercel cron job (6 AM UTC)
- Timezone-aware sync: per-user timezone prevents duplicate entries
- Sync setup page with iOS and Android instructions
- Health Sync added as onboarding step 10

### Social & Competition
- Public challenges: community-wide with shareable join pages
- Group challenge modal: create and manage with improved UI
- Join pages: `/join/[code]` for groups, `/challenges/[id]` for challenges

### Progression & RPG
- XP scaling: changed from flat 1000 XP/level to exponential curve (1000 × 1.08^level)
- Character system: RPG character avatars with gear shop (in progress)
- Weight tracking in dashboard header (current weight, target weight, progress)

### Profile & Settings
- Profile page rebuild: three tabs (Settings, Trophies, Milestones)
- Settings integrations: WHOOP connect/disconnect, Google Health, Health Connect webhook URL
- Dashboard improvements: clickable cards with CTAs, exercise volume summary

### Screenshots & AI
- Fitness screenshot: extracts calories burned, steps, day strain via Claude
- Screenshot examples API: few-shot examples for Claude parsing

### Bug Fixes
- Fixed macro logging to use Server Actions
- Fixed nutrition bar rendering issues
- Prevented theme banner flash on page load
- Fixed profile save (removed non-existent goal_weight column)
- Dashboard weight showing oldest instead of latest
- HabitCard steps doubling
- Theme not syncing to power-level page
- Calories burned using add instead of set mode

### UX Improvements
- Improved empty states with motivational messages and CTAs
- Inline reset (X) on nutrition fields
- Today's Log defaults expanded with one-tap delete
- Sunday shows as Recovery for hybrid path
- Default nutrition view changed to weekly
- Recovery/HRV cards on Track page and Dashboard

### Database
- Merged 7 duplicate catalog entries
- Added health metrics columns to body_measurements
- 24 migrations total
