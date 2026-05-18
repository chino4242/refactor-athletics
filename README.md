# Refactor Athletics
A comprehensive fitness tracking, ranking, and RPG-lite progression web application built with Next.js, React, Tailwind CSS, and Supabase.

## Overview
Refactor Athletics gamifies physical training. The application parses a standardized catalog of 240+ functional fitness exercises, scales user performance against demographic brackets to assign "Ranks," and tracks their total XP and "Power Level" over time.

Recent architectural changes migrated from a monolithic `history` table to domain-specific tables (`workouts`, `nutrition_logs`, `habit_logs`, `body_measurements`) for better performance and maintainability.

### Core Features
- **Dynamic Training Catalog**: Exercises (`catalog`) are fetched via Supabase, complete with XP factors, categories (e.g., Metcon, Gymnastics), and standards thresholds.
- **Rank Calculator**: Computes performance (e.g., Lbs, Sec, Reps) against Age, Sex, and Bodyweight, converting raw results into themed tier rankings (e.g., Rookie, Contender, Legend).
- **Power Level System**: Aggregates the highest rank level achieved across all ranked exercises to generate a holistic player strength score.
- **Dashboard**: Mobile-first home screen with Today, Progress, and Arena tabs featuring:
  - Pull-to-refresh gesture
  - Skeleton loaders
  - Daily goals with green highlights when met
  - Power Level Contributors with rank images
  - Physique Points tracking
  - Current and target weight display
  - Today's scheduled workout
  - Improved empty states with CTAs
- **Onboarding Wizard**: 10-step guided setup for new users:
  - Liability waiver acceptance (required before proceeding)
  - Experience mode selection (RPG or Classic)
  - Introduction to Refactor Athletics (adapts to chosen mode)
  - Theme selection (RPG only: Athlete, Draconic, Samurai, Apex Predator, Viking)
  - Training path selection (RPG) or General Wellness overview (Classic)
  - Personal info (age, sex with "prefer not to say" option, current weight)
  - Goal setting (target weight)
  - Equipment checklist (barbell, dumbbells, kettlebells, smith machine, etc.)
  - Quest settings (habit visibility and targets)
  - Health Sync (connect WHOOP, Google Health, or Health Connect webhook)
- **Attribute Balance**: A specialized radar chart categorizes logged exercises into four cardinal points: Strength (STR), Endurance (END), Power (PWR), and Mobility (MOB).
- **Daily Quests**: Track habits (steps, water, sleep, day strain, recovery, HRV, resting HR, etc.) and nutrition (macros, calories burned, net calories) with customizable targets, visibility settings, and consistency heatmaps with streak tracking.
- **Workout Programs**: Create custom workout programs with exercises and treadmill blocks, schedule them to specific days.
- **Health Sync & Integrations**: Connect wearables and health apps for automatic data sync:
  - WHOOP OAuth integration (strain, recovery, HRV, sleep, calories burned, weight)
  - Health Connect webhook for Android (12 data types including steps, sleep, body composition)
  - Google Health Connect OAuth
  - Manual sync via Apple Shortcuts / HTTP webhook
  - Auto-sync on dashboard load + daily Vercel cron job (6 AM UTC)
  - Data priority: WHOOP for sleep/calories/HRV/resting HR; Health Connect for steps/weight/body composition
- **Active Workout UX**: Enhanced workout tracking with day-level progress ('Block X of Y'), prescribed rep targets in superset headers, live rank nudge during sets, rank-up celebrations, plate calculator for barbell exercises, and reps-only mode for bodyweight exercises.
- **Arena**: Challenge other users to duels and compete in weekly challenges.

## Experience Modes
The app supports two experience modes, selected during onboarding:
- **RPG Mode**: Full gamification — themes, rank names, XP, character system, "Daily Quests", "Arena", "Party" terminology
- **Classic Mode**: Clean, minimal UI — "Fitness Score" instead of "Expertise", "Today's Targets" instead of "Daily Quests", "Social" instead of "Arena", no theme banner

All labels are driven by `ExperienceModeContext`. The underlying data, math, and progression systems are identical — only the presentation layer changes. Users can be in the same group regardless of mode.

## Equipment Normalization
Exercise variants (dumbbell, smith machine) normalize to barbell-equivalent values before rank comparison:
- **Barbell**: factor 1.0 (baseline)
- **Dumbbells**: factor 1.15 (harder due to stabilization — `weight × 2 × 1.15`)
- **Smith Machine**: factor 0.85 (easier due to guided path)

Each catalog entry has `normalization_factor` and `normalizes_to` (base exercise ID for standards lookup). The rank engine applies `bestValue × normalization_factor` before comparing against thresholds.

## Database Schema

### Core Tables
- **users**: User profiles with age, sex, bodyweight, nutrition targets, habit targets, hidden habits
  - Added columns: `body_composition_goals` (jsonb) for storing target weight and other goals
  - Added columns: `experience_mode` (text, 'rpg' or 'classic'), `available_equipment` (jsonb array)
  - Added columns: `whoop_access_token`, `whoop_refresh_token`, `whoop_user_id`, `whoop_token_expires_at`, `whoop_connected_at` (WHOOP OAuth)
  - Added columns: `google_health_*` (Google Health Connect OAuth)
  - Added columns: `sync_token` (Health Connect webhook auth), `timezone` (IANA timezone for sync endpoints)
- **catalog**: Exercise library with standards, categories, XP factors (242+ exercises ingested)
  - Added columns: `standards` (jsonb), `xp_factor` (numeric)
  - Added columns: `required_equipment` (jsonb array), `normalization_factor` (numeric), `normalizes_to` (text)
- **workouts**: Exercise logs with sets, rank, level, XP (replaces old `history` table for workouts)
- **nutrition_logs**: Macro tracking (protein, carbs, fat, calories, water, calories_burned) with XP
  - Calories automatically calculated from macros: protein × 4 + carbs × 4 + fat × 9
- **habit_logs**: Daily habits (steps, sleep, etc.) with XP
- **body_measurements**: Body composition tracking (weight, waist, body fat %, per-region muscle mass and fat %)
  - Tape mode: weight, waist, arms, chest, legs, shoulders (inches)
  - Scale mode: weight, body_fat_percentage, per-region muscle (lbs) and fat (%) for left arm, right arm, trunk, left leg, right leg
  - Health metrics: lean_body_mass, vo2_max, bmr, height (synced from Health Connect / WHOOP)
  - Supports delete individual measurements and reset all
- **workout_programs**: Custom workout templates
- **program_blocks**: Exercises and treadmill intervals within programs
- **program_schedule**: Assigns programs to calendar days
- **duels**: User vs user challenges
- **challenges**: Weekly community challenges
- **groups**: Party/group system with invite codes
- **group_members**: Group membership (many-to-many)
- **group_challenges**: Weekly collaborative challenges per group
- **public_challenges**: Community-wide challenges with join pages
- **screenshot_examples**: Few-shot examples for Claude screenshot parsing

### Key Indexes
- `(user_id, date)` on all log tables for fast daily queries
- `(user_id, timestamp DESC)` for history/feed queries
- `(program_id, block_order)` for program block ordering

## Getting Started

### Prerequisites 
- Node.js (v18+)
- A Supabase project (for Authentication & PostgreSQL)

### Installation
1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd refactor-athletics
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Variables
For local development, create a `.env.local` file at the root of the project:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key-for-admin-scripts
WHOOP_CLIENT_ID=your-whoop-client-id
WHOOP_CLIENT_SECRET=your-whoop-client-secret
CRON_SECRET=your-vercel-cron-secret
```

### Database Initialization
Apply migrations in order:
1. `20260225203508_init_schema.sql` - Initial schema
2. `20260226_separate_domain_tables.sql` - Domain-specific tables
3. `20260226_remove_workout_fkey.sql` - Remove foreign key constraint
4. `20260226_workout_programs_standalone.sql` - Workout programs
5. `20260228120000_add_catalog_columns.sql` - Add catalog columns (standards, xp_factor)
6. `20260313_waiver_acceptance.sql` - Add waiver acceptance tracking
7. `20260313_selected_path.sql` - Add training path selection
8. `20260330_experience_mode.sql` - Add experience mode (rpg/classic)
9. `20260330_available_equipment.sql` - Add user equipment preferences
10. `20260330_groups.sql` - Groups, members, and group challenges
11. `20260330_catalog_equipment.sql` - Add required_equipment to catalog
12. `20260330_normalization_factors.sql` - Equipment normalization and smith machine variants
13. `20260405_group_challenges_v2.sql` - Group challenges v2 with improved schema
14. `20260405_workout_session_id.sql` - Add session IDs to workouts
15. `20260406_hume_pod_muscle_mass.sql` - Per-region muscle mass columns and measurement_mode
16. `20260406_public_challenges.sql` - Public challenges table
17. `20260406_screenshot_examples.sql` - Screenshot examples for Claude few-shot parsing
18. `20260413_scale_fat_columns.sql` - Per-region fat % columns, rename muscle→scale
19. `20260422_whoop_oauth.sql` - WHOOP OAuth fields on users
20. `20260422_sync_token.sql` - Sync token for Health Connect webhook auth
21. `20260422_google_health.sql` - Google Health Connect OAuth fields
22. `20260503_health_metrics.sql` - Health metrics on body_measurements (lean_body_mass, vo2_max, bmr, height)
23. `20260503_user_timezone.sql` - User timezone for sync endpoints
24. `20260503_merge_duplicate_catalog.sql` - Merged 7 duplicate catalog entries

Run in Supabase SQL Editor or via CLI:
```bash
supabase db push
```

**After migrations, ingest the exercise catalog:**
```bash
npx tsx scripts/ingest-catalog.ts
```

This will populate the `catalog` table with 242 exercises including standards/thresholds for rank calculations.

### Running the App
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Architecture

### Server Actions vs API Routes
- **Server Actions** (`src/app/actions.ts`): All write operations (logging workouts, habits, macros)
- **API Functions** (`src/services/api.ts`): All read operations (getHistory, getHabitProgress, getUserStats)
- **Program API** (`src/services/programApi.ts`): Workout program CRUD operations
- **Sync API Routes**: WHOOP (`/api/whoop/*`), Google Health (`/api/google-health/*`), Health Connect webhook (`/api/sync/health-connect`), manual sync (`/api/sync/token`)
- **Cron Routes**: `/api/cron/whoop-sync` (daily WHOOP sync, secured by `CRON_SECRET`)

### Profile Management
- **Target Weight**: Stored in `body_composition_goals.target_weight` as a string
- **Profile Updates**: Use `router.refresh()` after saving to reload server-rendered data
- **Nutrition Targets**: Calories are auto-calculated from macros and displayed as read-only

### Rank Calculation
Uses Epley formula for weight exercises: `weight * (1 + reps/30)`
Compares against standards from catalog (age/sex brackets)
Calculates level (0-5) and rank name ("Rookie" to "Legend")
XP = `level * 50` + set volume XP

### Power Level Calculation
Queries ONLY `workouts` table (not habits/macros)
Finds max level per exercise
Sum of max_level for each ranked exercise

## Development Resources
- **Developer Guardrails**: Please review `skills.md` for strict architectural guidelines, specifically relating to the math behind Ranks, Power Levels, and Z-Index Stacking Contexts for the mobile UI.
- **Database Rules**: All data inserts involving the `catalog` table require bypassing RLS using the `SUPABASE_SERVICE_ROLE_KEY`.

## Deployment
This project is optimized for deployment on [Vercel](https://vercel.com/new). Ensure all environment variables are securely mapped before triggering a production build.

## Changelog
See [CHANGELOG.md](./CHANGELOG.md) for detailed release history.

## Testing
The project uses **Vitest** and **React Testing Library** for testing.

### Running Tests
```bash
npm test                    # Run all tests
npm test -- <filename>      # Run specific test file
npm test -- --coverage      # Run with coverage report
```

### Test Coverage (182 tests)
- **Server Actions**: logHabitAction, logTrainingAction, deleteHistoryItemAction
- **API Functions**: saveProfile, getHabitProgress, getUserStats, getHistory
- **API Routes**: parse-screenshot (Claude AI integration)
- **Components**: MacroLogModal, ScreenshotUploader, DailyQuest, HabitCard, ProfileCard, WorkoutBuilder
- **Business Logic**: Rank calculation (Epley formula, xBW comparison, level assignment)
- **Utility Functions**: Time formatting, data aggregation

### Test Files
- `src/tests/actions.test.ts` - Server action tests
- `src/tests/api.test.ts` - API function tests
- `src/tests/parse-screenshot.test.ts` - Screenshot parsing with Claude
- `src/tests/logTrainingAction.test.ts` - Rank calculation logic
- `src/tests/getHistory.test.ts` - Data aggregation from 4 tables
- `src/tests/MacroLogModal.test.tsx` - Macro logging UI
- `src/tests/ScreenshotUploader.test.tsx` - Screenshot upload flow
- `src/tests/DailyQuest.test.tsx` - Habit tracking UI
- `src/tests/HabitCard.test.tsx` - Individual habit cards
- `src/tests/ProfileCard.test.tsx` - Profile management
- `src/tests/WorkoutBuilder.test.tsx` - Workout program builder
- `src/tests/time.test.ts` - Time utility functions
- `src/tests/physiquePoints.test.ts` - Physique Points calculation
- `src/tests/logBodyMeasurement.test.ts` - Body measurement upsert logic
- `src/tests/BodyCompositionModal.test.tsx` - Body composition modal UI
- `src/tests/workoutParser.test.ts` - Workout text parser

## Progressive Web App (PWA)
The application is a fully functional PWA with offline support.

### PWA Features
- **Service Worker** (`public/sw.js`): Network-first caching strategy
- **Web App Manifest** (`public/manifest.json`): App metadata and icons
- **Offline Fallback** (`src/app/offline/page.tsx`): Graceful offline experience
- **Install Prompt** (`src/components/InstallPrompt.tsx`): Custom install banner with 7-day dismissal
- **Auto-registration** (`src/components/ServiceWorkerRegistration.tsx`): Automatic service worker setup

### Testing PWA
```bash
npm run build && npm start   # Production build required for PWA
```
- Open Chrome DevTools → Application → Service Workers
- Test offline mode by checking "Offline" in Network tab
- Run Lighthouse audit for PWA score (target: 90+)
