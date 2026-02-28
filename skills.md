# Refactor Athletics: Developer Guardrails (skills.md)

This document contains core logic rules, architectural decisions, and critical information for engineers and AI assistants working on **Refactor Athletics**. 

## 1. Database Architecture: Supabase
The application uses **Supabase** (PostgreSQL) as its primary backend.

### 1.1 Core Tables
- **users**: User profiles with age, sex, bodyweight, nutrition targets, habit targets, hidden habits
- **catalog**: Exercise library with standards, categories, and XP factors
  - **standards** (jsonb): Contains `brackets` (age/sex-based thresholds), `scoring` (higher_is_better/lower_is_better), and `unit` (lbs, sec, reps, xBW)
  - **xp_factor** (numeric): Multiplier for XP calculation (default: 1)
  - **242 exercises ingested** from activity_catalog.json
- **workouts**: Exercise logs with sets, rank, level, XP (domain-specific table)
- **nutrition_logs**: Macro tracking (protein, carbs, fat, calories, water) with XP
- **habit_logs**: Daily habits (steps, sleep, etc.) with XP
- **body_measurements**: Body composition tracking
- **workout_programs**: Custom workout templates
- **program_blocks**: Exercises and treadmill intervals within programs
- **program_schedule**: Assigns programs to calendar days
- **duels**: User vs user challenges
- **challenges**: Weekly community challenges

### 1.2 Row Level Security (RLS)
RLS is active on all tables:
- The `catalog` table is readable by everyone `(true)` but requires the `SUPABASE_SERVICE_ROLE_KEY` to insert/update metadata.
  - **Important**: The `standards` and `xp_factor` columns were added via migration `20260228120000_add_catalog_columns.sql`
  - After adding columns, you must restart the Supabase project or wait ~10 minutes for PostgREST schema cache to refresh
- User data tables require authenticated `auth.uid()` checks to mutate data.
- Program tables allow viewing all programs (for sharing) but only owners can edit.

### 1.3 Migration History
1. `20260225203508_init_schema.sql` - Initial schema
2. `20260226_separate_domain_tables.sql` - Migrated from monolithic `history` table to domain-specific tables
3. `20260226_remove_workout_fkey.sql` - Removed foreign key constraint on workouts.exercise_id for dynamic blocks
4. `20260226_workout_programs_standalone.sql` - Added workout program builder tables
5. `20260228120000_add_catalog_columns.sql` - Added `standards` (jsonb) and `xp_factor` (numeric) columns to catalog table

**Note**: After running migrations that modify table schemas, Supabase's PostgREST API server caches the old schema. You must either:
- Restart the Supabase project (Settings → General → Restart project)
- Wait ~10 minutes for automatic cache refresh
- Pause and unpause the project to force all services to reload

## 2. Core Mechanics

### 2.1 Rank Calculation Logic
The application calculates a user's fitness "Rank" based on their age, sex, bodyweight, and result value on specific exercises.
- **Standards Format**: Use the `standards.brackets` JSONB structure (not the legacy `standards.tiers`).
- **xBW (Times Bodyweight) Calculation**:
  - If `unit === 'xBW'`, the user's `resultValue` is divided by their `bodyweight` before comparing it to the threshold.
  - *Exception*: For `weighted_pullup` and `five_rm_weighted_pull_up`, the `bodyweight` must be ADDED to the `resultValue` first, then divided by `bodyweight`.
- **Rank Levels**: Map levels `0` through `5` onto Theme Names (e.g., Peasant, Rookie, Amateur, Contender, Pro, Champion, Legend).

### 2.2 Power Level & Player Stats (`src/services/api.ts`)
There are two distinct progression metrics for a user:
1. **Player Level**: Driven purely by raw participation. Calculated as `Math.floor(totalXp / 1000) + 1`. Every time a user logs *any* exercise (or habit), they gain XP.
2. **Power Level (Aggregate Score)**: Driven by *performance*. Calculated by querying ONLY the `workouts` table (not habits/macros), finding the **highest rank level achieved** for *each unique exercise*, and summing `100 * max_level` across all of them.

**Important**: Power Level only counts ranked exercises from the `workouts` table. Habits and nutrition do not contribute to Power Level, only to Player Level (XP).

### 2.3 Data Architecture Patterns
- **Server Actions** (`src/app/actions.ts`): All write operations (logging workouts, habits, macros)
- **API Functions** (`src/services/api.ts`): All read operations (getHistory, getHabitProgress, getUserStats)
- **Program API** (`src/services/programApi.ts`): Workout program CRUD operations

### 2.4 Attribute Balance Radar
The Radar chart in `PowerRadar.tsx` requires exactly 4 cardinal points: **STR**, **END**, **PWR**, **MOB**.
Since the `catalog` ingested over 240 specific exercise sub-categories, `src/hooks/useTrophies.ts` maps them explicitly to ensure visual balance:
- `"Cardio"` / `"Endurance"` -> **Endurance & Speed**
- `"Metcon"` / `"Power"` -> **Power & Capacity**
- `"Mobility"` / `"Flexibility"` -> **Mobility**
- `"Strength"` / `"Gymnastics"` / `"Weightlifting"` -> **Strength**

### 2.4 Attribute Balance Radar
The Radar chart in `PowerRadar.tsx` requires exactly 4 cardinal points: **STR**, **END**, **PWR**, **MOB**.
Since the `catalog` ingested over 240 specific exercise sub-categories, `src/hooks/useTrophies.ts` maps them explicitly to ensure visual balance:
- `"Cardio"` / `"Endurance"` -> **Endurance & Speed**
- `"Metcon"` / `"Power"` -> **Power & Capacity**
- `"Mobility"` / `"Flexibility"` -> **Mobility**
- `"Strength"` / `"Gymnastics"` / `"Weightlifting"` -> **Strength**

## 3. Workout Program Builder
Users can create custom workout programs with exercises and treadmill blocks, then schedule them to specific calendar days.

### 3.1 Program Structure
- **workout_programs**: Program templates (name, description)
- **program_blocks**: Ordered list of exercises or treadmill intervals
  - Exercise blocks: exercise_id, target_sets, target_reps, target_weight, superset_group
  - Treadmill blocks: duration_seconds, incline, intensity (zone2/base/push/all_out)
- **program_schedule**: Assigns programs to calendar days (one per day)

### 3.2 Implementation Phases
- **Phase 1** ✅: Database schema, basic CRUD, program list UI
- **Phase 2** ✅: Program editor with exercise selection and category filtering
- **Phase 3** (Planned): Edit sets/reps/weight, treadmill blocks, reordering, supersets
- **Phase 4** (Planned): Calendar scheduling, week/month copying, execution with timer

See `WORKOUT_PROGRAMS.md` for detailed documentation.

## 4. UI Guidelines & Component Guardrails
- **Mobile First**: All layouts must be responsive, defaulting to stacked views on mobile (`flex-col`) before applying `md:` modifiers.
- **Z-Index Stacking Contexts**: Be careful with sibling `relative z-10` containers. If a dropdown menu (e.g., App Settings on the Profile Card) is placed inside a `z-10` container, the sibling container must have a lower z-index (or the parent must be elevated to `z-20`) so floating elements can escape the bounding box and remain clickable on mobile.
- **Styling**: Tailwind CSS is used globally. Favor dark, premium gradients (`bg-zinc-900`, `from-orange-600 to-red-600`) and glowing accents (`drop-shadow-[0_0_30px_rgba(249,115,22,0.4)]`).
