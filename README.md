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
- **Onboarding Wizard**: 8-step guided setup for new users:
  - Liability waiver acceptance (required before proceeding)
  - Experience mode selection (RPG or Classic)
  - Introduction to Refactor Athletics (adapts to chosen mode)
  - Theme selection (RPG only: Athlete, Draconic, Samurai, Apex Predator, Viking)
  - Training path selection (RPG) or General Wellness overview (Classic)
  - Personal info (age, sex with "prefer not to say" option, current weight)
  - Goal setting (target weight)
  - Equipment checklist (barbell, dumbbells, kettlebells, smith machine, etc.)
- **Attribute Balance**: A specialized radar chart categorizes logged exercises into four cardinal points: Strength (STR), Endurance (END), Power (PWR), and Mobility (MOB).
- **Daily Quests**: Track habits (steps, water, sleep, day strain, etc.) and nutrition (macros, calories burned, net calories) with customizable targets, visibility settings, and consistency heatmaps with streak tracking.
- **Workout Programs**: Create custom workout programs with exercises and treadmill blocks, schedule them to specific days.
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

## Recent Changes (Feb-Apr 2026)
- Migrated from monolithic `history` table to domain-specific tables
- Fixed macro logging to use Server Actions
- Added habit visibility toggles
- Fixed nutrition bar rendering issues
- Prevented theme banner flash on page load
- Added workout program builder with exercise selection and category filtering
- Fixed profile save to use correct database schema (removed non-existent goal_weight column)
- Implemented target weight storage in body_composition_goals JSON field
- Added automatic calorie calculation from macros (protein × 4 + carbs × 4 + fat × 9)
- Implemented router.refresh() for proper UI updates after profile changes
- **Implemented PWA functionality** (service worker, manifest, offline support, install prompt)
- **Added comprehensive test coverage** (168 tests covering critical business logic)
- **Dashboard as home screen** with pull-to-refresh, skeleton loaders, and improved UX
- **Onboarding wizard** for new user setup with waiver, theme, and path selection
- **Weight tracking** in dashboard header (current weight, target weight, progress)
- **Improved empty states** with motivational messages and CTAs throughout dashboard
- **Physique Points fix**: Body measurements now upsert per date (no duplicate rows), calculation uses per-metric non-null scanning via shared `calculatePhysiquePoints()` utility
- **Calorie deficit tracking**: Calories burned input, net calorie summary (daily/weekly), weekly bar chart with deficit target line
- **XP scaling**: Changed from flat 1000 XP/level to `1000 * 1.08^level` exponential curve
- **Fitness screenshot**: New screenshot type extracts calories burned, steps, and day strain via Claude
- **Profile page rebuild**: Three tabs (Settings, Trophies, Milestones) — removed redundant stats sections, added theme picker
- **Dashboard improvements**: Expertise/Physique Points/Weight cards are clickable links with CTAs, Last Workout shows per-exercise volume summary, Today's Workout shows exercise preview bullets
- **Consistency heatmaps**: Week/month/year toggle (persisted in localStorage), daily streak counter per habit
- **Day strain**: New habit for WHOOP-style intensity tracking
- **Body composition modes**: Tape Measure (inches) and Scale (muscle lbs + fat % per region) with toggle in modal
- **Scale mode batch logging**: Single "Log All" button for weight, body fat %, and per-region muscle/fat
- **Delete/reset measurements**: Delete individual body measurements or reset all composition data
- **Steps set-only mode**: Steps input uses "Set" mode only — type total, replaces previous value (no add/diff)
- **Workout session IDs**: Group sets logged in the same session
- **Public challenges**: Community-wide challenges with shareable join pages
- **Group challenge modal**: Create and manage group challenges with improved UI
- **Workout report**: Post-workout summary with exercise details
- **Active workout improvements**: Enhanced active workout tracking UI
- **Join pages**: `/join/[code]` for groups and `/challenges/[id]` for public challenges
- **Screenshot examples API**: Few-shot examples for Claude screenshot parsing
- **Workout text parser**: Parse workout descriptions into structured exercise data
- **Equipment variant picker**: Select equipment variant (barbell/dumbbell/smith) per exercise
- **Character system**: RPG character avatars with gear shop (in progress)
- **Cardio XP scaling**: Duration/distance exercises earn 8 XP per minute instead of flat reps-based XP

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
