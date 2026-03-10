# Refactor Athletics: Developer Guardrails (skills.md)

This document contains core logic rules, architectural decisions, and critical information for engineers and AI assistants working on **Refactor Athletics**. 

## 1. Database Architecture: Supabase
The application uses **Supabase** (PostgreSQL) as its primary backend.

### 1.1 Core Tables
- **users**: User profiles with age, sex, bodyweight, nutrition targets, habit targets, hidden habits
  - **body_composition_goals** (jsonb): Stores user goals including `target_weight` (stored as string)
- **catalog**: Exercise library with standards, categories, and XP factors
  - **standards** (jsonb): Contains `brackets` (age/sex-based thresholds), `scoring` (higher_is_better/lower_is_better), and `unit` (lbs, sec, reps, xBW)
  - **xp_factor** (numeric): Multiplier for XP calculation (default: 1)
  - **242 exercises ingested** from activity_catalog.json
- **workouts**: Exercise logs with sets, rank, level, XP (domain-specific table)
- **nutrition_logs**: Macro tracking (protein, carbs, fat, calories, water) with XP
  - **Calories auto-calculated**: protein × 4 + carbs × 4 + fat × 9
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
  - **Profile Updates**: Use `router.refresh()` after saving to reload server-rendered data
  - **Target Weight**: Stored in `body_composition_goals.target_weight` (string format)
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

### 3.2 Implementation Status
- **Phase 1** ✅: Database schema, basic CRUD, program list UI
- **Phase 2** ✅: Program editor with exercise selection and category filtering
- **Phase 3** ✅: Edit sets/reps/weight, treadmill blocks, reordering, supersets
- **Phase 4** (Planned): Calendar scheduling, week/month copying, execution with timer

See `WORKOUT_PROGRAMS.md` for detailed documentation.

## 4. Dashboard & User Experience

### 4.1 Dashboard as Home Screen
The dashboard (`/dashboard`) is the default landing page after login, featuring three tabs:

**Today Tab:**
- Daily goals (calories, water, steps) with green highlights when met
- Today's scheduled workout from weekly schedule
- Last completed workout
- Improved empty states with motivational CTAs

**Progress Tab:**
- Power Level Contributors showing all exercises with rank images
- Grouped by category (Strength, Endurance & Speed, Power & Capacity, Mobility)
- Shows current level or Level 1 target for unattempted exercises
- Refactor Score tracking (body composition changes vs goals)

**Arena Tab:**
- Active duels display
- Weekly challenge status
- Challenge a friend CTA

### 4.2 Dashboard Features
- **Pull-to-Refresh**: Touch gesture to reload all dashboard data (mobile-first)
- **Skeleton Loaders**: Animated placeholders instead of "Loading..." text
- **Weight Tracking**: Current weight, target weight, and progress in header
- **Refactor Score**: Calculated from body composition changes vs goals (color-coded)
- **Empty States**: Motivational messages with CTAs for all empty sections

### 4.3 Onboarding Wizard
New users see a 4-step wizard before accessing the dashboard:
1. **Introduction**: Explains Refactor Athletics concept (fitness RPG, Power Level, ranked standards)
2. **Theme Selection**: Choose from 5 themes (Athlete, Draconic, Samurai, Apex Predator, Viking)
3. **Personal Info**: Age, sex, current weight
4. **Goal Setting**: Target weight

After completion, `is_onboarded` flag is set to true and user sees normal dashboard.

### 4.4 Empty State Design Pattern
All empty states follow this pattern:
- Large emoji for visual interest (🚀, 📅, ⚔️, 🏆)
- Friendly, motivational messaging
- Clear call-to-action link with arrow icon
- Centered layout with proper spacing

Example:
```tsx
<div className="text-center py-6">
  <div className="text-4xl mb-3">🚀</div>
  <p className="text-sm text-zinc-400 mb-3">Start your fitness journey!</p>
  <Link href="/train" className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400 font-semibold">
    Log Your First Workout
    <ChevronRight size={14} />
  </Link>
</div>
```

## 5. Testing & Quality Assurance

### 4.1 Test Framework
- **Vitest** for unit and integration tests
- **React Testing Library** for component tests
- **138 tests** covering critical business logic and user flows

### 4.2 Test Coverage Areas
- **Server Actions**: logHabitAction, logTrainingAction, deleteHistoryItemAction
- **API Functions**: saveProfile, getHabitProgress, getUserStats, getHistory
- **API Routes**: parse-screenshot (Claude AI integration)
- **Components**: MacroLogModal, ScreenshotUploader, DailyQuest, HabitCard, ProfileCard, WorkoutBuilder
- **Business Logic**: Rank calculation (Epley formula, xBW comparison, level assignment)
- **Data Aggregation**: History from 4 domain-specific tables

### 4.3 Testing Patterns
- Mock Supabase client with proper method chaining
- Use `vi.hoisted()` for external SDK mocks (e.g., Anthropic)
- Test business logic separately from UI interactions
- Use `waitFor()` for async operations
- Mock `window.confirm` and `window.alert` for user interactions

### 4.4 Running Tests
```bash
npm test                    # Run all tests
npm test -- <filename>      # Run specific test file
npm test -- --coverage      # Run with coverage report
```

## 6. Progressive Web App (PWA)

### 6.1 PWA Implementation
The application is a fully functional PWA with offline support:
- **Service Worker** (`public/sw.js`): Network-first caching strategy
- **Web App Manifest** (`public/manifest.json`): App metadata and icons
- **Offline Fallback** (`src/app/offline/page.tsx`): Graceful offline experience
- **Install Prompt** (`src/components/InstallPrompt.tsx`): Custom install banner with 7-day dismissal
- **Auto-registration** (`src/components/ServiceWorkerRegistration.tsx`): Automatic service worker setup

### 6.2 PWA Configuration
- **Caching Strategy**: Network-first (always tries network, falls back to cache)
- **Cached Resources**: Successful responses (200 status) are automatically cached
- **Offline Detection**: Service worker intercepts failed requests and serves offline page
- **Install Prompt**: Shows on Android/Desktop Chrome/Edge, dismissible for 7 days

### 6.3 Testing PWA
```bash
npm run build && npm start   # Production build required
```
- Chrome DevTools → Application → Service Workers
- Test offline mode in Network tab
- Run Lighthouse audit (target: 90+ PWA score)

See `PWA_SETUP.md` for detailed implementation guide.

## 7. UI Guidelines & Component Guardrails
- **Mobile First**: All layouts must be responsive, defaulting to stacked views on mobile (`flex-col`) before applying `md:` modifiers.
- **Z-Index Stacking Contexts**: Be careful with sibling `relative z-10` containers. If a dropdown menu (e.g., App Settings on the Profile Card) is placed inside a `z-10` container, the sibling container must have a lower z-index (or the parent must be elevated to `z-20`) so floating elements can escape the bounding box and remain clickable on mobile.
- **Styling**: Tailwind CSS is used globally. Favor dark, premium gradients (`bg-zinc-900`, `from-orange-600 to-red-600`) and glowing accents (`drop-shadow-[0_0_30px_rgba(249,115,22,0.4)]`).

## 8. Future Features & Design Documents

### 8.1 Character Creation System
A comprehensive RPG-style character creation and customization system is planned. See `CHARACTER_CREATION_DESIGN.md` for full specifications including:
- SVG base bodies + PNG gear overlays approach
- Database schema for character config and gear catalog
- Unlock system (XP, achievements, themes)
- Component architecture and rendering logic
- 4-phase implementation plan
- Asset requirements and design guidelines

This feature will allow users to build visual avatars that evolve with their fitness journey, unlock cosmetic gear through achievements, and display their character throughout the app.
