# Refactor Athletics
A comprehensive fitness tracking, ranking, and RPG-lite progression web application built with Next.js, React, Tailwind CSS, and Supabase.

## Overview
Refactor Athletics gamifies physical training. The application parses a standardized catalog of 240+ functional fitness exercises, scales user performance against demographic brackets to assign "Ranks," and tracks their total XP and "Power Level" over time.

Recent architectural changes migrated from a monolithic `history` table to domain-specific tables (`workouts`, `nutrition_logs`, `habit_logs`, `body_measurements`) for better performance and maintainability.

### Core Features
- **Dynamic Training Catalog**: Exercises (`catalog`) are fetched via Supabase, complete with XP factors, categories (e.g., Metcon, Gymnastics), and standards thresholds.
- **Rank Calculator**: Computes performance (e.g., Lbs, Sec, Reps) against Age, Sex, and Bodyweight, converting raw results into themed tier rankings (e.g., Rookie, Contender, Legend).
- **Power Level System**: Aggregates the `max_level_achieved` across all historic exercises, multiplying each by 100 to generate a holistic player strength score.
- **Attribute Balance**: A specialized radar chart categorizes logged exercises into four cardinal points: Strength (STR), Endurance (END), Power (PWR), and Mobility (MOB).
- **Daily Quests**: Track habits (steps, water, sleep, etc.) and nutrition (macros) with customizable targets and visibility settings.
- **Workout Programs**: Create custom workout programs with exercises and treadmill blocks, schedule them to specific days.
- **Arena**: Challenge other users to duels and compete in weekly challenges.

## Database Schema

### Core Tables
- **users**: User profiles with age, sex, bodyweight, nutrition targets, habit targets, hidden habits
- **catalog**: Exercise library with standards, categories, XP factors (242 exercises ingested)
  - Added columns: `standards` (jsonb), `xp_factor` (numeric)
- **workouts**: Exercise logs with sets, rank, level, XP (replaces old `history` table for workouts)
- **nutrition_logs**: Macro tracking (protein, carbs, fat, calories, water) with XP
- **habit_logs**: Daily habits (steps, sleep, etc.) with XP
- **body_measurements**: Body composition tracking (weight, waist, body fat %, etc.)
- **workout_programs**: Custom workout templates
- **program_blocks**: Exercises and treadmill intervals within programs
- **program_schedule**: Assigns programs to calendar days
- **duels**: User vs user challenges
- **challenges**: Weekly community challenges

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

### Rank Calculation
Uses Epley formula for weight exercises: `weight * (1 + reps/30)`
Compares against standards from catalog (age/sex brackets)
Calculates level (0-6) and rank name ("Peasant" to "Legend")
XP = `level * 50` + set volume XP

### Power Level Calculation
Queries ONLY `workouts` table (not habits/macros)
Finds max level per exercise
Sum of (max_level × 100) for each exercise

## Development Resources
- **Developer Guardrails**: Please review `skills.md` for strict architectural guidelines, specifically relating to the math behind Ranks, Power Levels, and Z-Index Stacking Contexts for the mobile UI.
- **Database Rules**: All data inserts involving the `catalog` table require bypassing RLS using the `SUPABASE_SERVICE_ROLE_KEY`.
- **Migration Guides**: See `SCHEMA_MIGRATION_GUIDE.md`, `DEPLOYMENT_CHECKLIST.md`, and `MIGRATION_COMPLETE.md` for detailed migration instructions.

## Deployment
This project is optimized for deployment on [Vercel](https://vercel.com/new). Ensure all environment variables are securely mapped before triggering a production build.

## Recent Changes (Feb 2026)
- Migrated from monolithic `history` table to domain-specific tables
- Fixed macro logging to use Server Actions
- Added habit visibility toggles
- Fixed nutrition bar rendering issues
- Prevented theme banner flash on page load
- Added workout program builder with exercise selection and category filtering
