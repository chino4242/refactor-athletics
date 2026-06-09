# Refactor Athletics: Developer Guardrails (skills.md)

This document contains core logic rules, architectural decisions, and critical information for engineers and AI assistants working on **Refactor Athletics**. 

## 0. Working Agreement — AI-Assisted Development

Chino is the developer and product owner. The AI assists. The following rules govern how we work together:

### 0.1 Before Writing Code — Ask These Questions

When Chino requests a feature or fix, the AI MUST clarify:

1. **What existing files/functions does this touch?** Identify them and read them before writing.
2. **Are there shared utilities this should use?** (date.ts, xp-service, challenge75Snapshot, etc.) Never duplicate logic.
3. **What are the edge cases?** Null data, wrong timezone, no auth, empty arrays, fresh user.
4. **Does this need to work on both web and native?** If so, test both paths mentally.
5. **What should happen on day/week boundaries?** Anything date-related gets the timezone treatment.

### 0.2 Before Pushing — Checklist

- [ ] `npm run build` passes (catches SSR/import issues)
- [ ] Tested locally if requested (don't push to prod without confirmation)
- [ ] No duplicate utility functions introduced — import from canonical sources
- [ ] Date handling uses `parseLocalDate()` / string comparison (Section 13)
- [ ] Null/empty states handled (what if the DB returns nothing?)

### 0.3 When to Stop and Plan vs Just Code

**Just code (small, reversible):**
- Bug fix with obvious cause (typo, wrong variable, missing import)
- Adding a CSS class, changing a label, adjusting a threshold

**Stop and plan first (ask Chino):**
- New feature touching multiple files
- Anything that changes data flow or DB schema
- Integration between systems (Health Connect, WHOOP, challenges)
- When unsure about the expected UX/behavior

### 0.4 Code Ownership

- **Chino writes:** Shared utilities, critical business logic, anything where correctness > speed
- **AI writes:** UI components, CRUD boilerplate, test scaffolding, repetitive wiring
- **Both review:** AI proposes, Chino confirms before push on anything non-trivial

### 0.5 Preventing Duplication

Before creating any new utility function, grep the codebase first. If similar logic exists:
- **Import it** — don't write a new version
- **Extend it** — add a parameter if needed
- **Centralize it** — if it exists in 2+ places, extract to a shared utility

Canonical utility locations:
- `src/utils/date.ts` — all date parsing, timezone, week calculations
- `src/utils/xp-service.ts` — XP award logic
- `src/utils/challenge75Snapshot.ts` — challenge metric evaluation
- `src/utils/refactorScore.ts` — composite score calculation
- `src/services/nativeHealth.ts` — all native Health Connect reads

## 1. Database Architecture: Supabase
The application uses **Supabase** (PostgreSQL) as its primary backend.

### 1.1 Core Tables
- **users**: User profiles with age, sex, bodyweight, nutrition targets, habit targets, hidden habits
  - **body_composition_goals** (jsonb): Stores user goals including `target_weight` (stored as string)
  - **waiver_accepted_at** (timestamptz): Timestamp of liability waiver acceptance
  - **selected_path** (text): Training path (hybrid, strength, endurance, mobility)
  - **experience_mode** (text): 'rpg' or 'classic' — drives UI label swaps via `ExperienceModeContext`
  - **available_equipment** (jsonb): Array of equipment IDs user has access to (e.g., `["barbell", "dumbbells", "treadmill"]`)
  - **whoop_access_token**, **whoop_refresh_token**, **whoop_user_id**, **whoop_token_expires_at**, **whoop_connected_at**: WHOOP OAuth integration fields
  - **google_health_*** : Google Health Connect OAuth fields
  - **sync_token** (text): Token for Health Connect webhook and Apple Shortcuts sync
  - **timezone** (text): User's IANA timezone (e.g., `America/New_York`), used by all sync endpoints to avoid duplicate entries
- **catalog**: Exercise library with standards, categories, and XP factors
  - **standards** (jsonb): Contains `brackets` (age/sex-based thresholds), `scoring` (higher_is_better/lower_is_better), and `unit` (lbs, sec, reps, xBW)
  - **xp_factor** (numeric): Multiplier for XP calculation (default: 1)
  - **required_equipment** (jsonb): Array of equipment IDs needed for this exercise
  - **normalization_factor** (numeric): Equipment conversion factor (default: 1.0). Dumbbells = 1.15, Smith = 0.85
  - **normalizes_to** (text): ID of the base exercise whose standards to use for rank comparison
  - **242+ exercises ingested** from activity_catalog.json (including smith machine variants)
- **workouts**: Exercise logs with sets, rank, level, XP (domain-specific table)
- **nutrition_logs**: Macro tracking (protein, carbs, fat, calories, water, calories_burned) with XP
  - **Calories auto-calculated**: protein × 4 + carbs × 4 + fat × 9
  - **Calorie deficit tracking**: calories_burned as a new macro_type, net calories = in - burned
  - **NutritionTargets** includes `calories_burned` (daily burn goal) and `net_calorie_target` (deficit target, e.g. -500)
- **habit_logs**: Daily habits (steps, sleep, etc.) with XP
- **body_measurements**: Body composition tracking
  - Tape mode: weight, waist, arms, chest, legs, shoulders (inches)
  - Scale mode: weight, body_fat_percentage, per-region muscle (lbs) and fat (%) — left_arm_muscle, right_arm_muscle, trunk_muscle, left_leg_muscle, right_leg_muscle, left_arm_fat, right_arm_fat, trunk_fat, left_leg_fat, right_leg_fat
  - Additional health metrics: **lean_body_mass**, **vo2_max**, **bmr**, **height** (synced from Health Connect / WHOOP)
  - `measurement_mode` column: 'tape' or 'scale'
  - Supports delete individual measurements (`deleteBodyMeasurementAction`) and reset all (`deleteAllBodyMeasurementsAction`)
- **workout_programs**: Custom workout templates
- **program_blocks**: Exercises and treadmill intervals within programs
- **program_schedule**: Assigns programs to calendar days
- **duels**: User vs user challenges
- **challenges**: Weekly community challenges
- **groups**: Party/group system with invite codes and leader management
- **group_members**: Group membership (many-to-many, user_id + group_id)
- **group_challenges**: Weekly collaborative challenges per group (metric, target, week_start)
- **public_challenges**: Community-wide challenges with shareable join pages
- **screenshot_examples**: Few-shot examples for Claude screenshot parsing (type, image_url, expected_output)

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
6. `20260313_waiver_acceptance.sql` - Added `waiver_accepted_at` (timestamptz) to users table
7. `20260313_selected_path.sql` - Added `selected_path` (text, default 'hybrid') to users table
8. `20260330_experience_mode.sql` - Added `experience_mode` (text, default 'rpg') to users table
9. `20260330_available_equipment.sql` - Added `available_equipment` (jsonb, default '[]') to users table
10. `20260330_groups.sql` - Groups, group_members, group_challenges tables with RLS
11. `20260330_catalog_equipment.sql` - Added `required_equipment` (jsonb) to catalog, populated mappings
12. `20260330_normalization_factors.sql` - Added `normalization_factor`, `normalizes_to` to catalog; smith machine variants
13. `20260405_group_challenges_v2.sql` - Group challenges v2 with improved schema
14. `20260405_workout_session_id.sql` - Add session IDs to workouts
15. `20260406_hume_pod_muscle_mass.sql` - Per-region muscle mass columns and measurement_mode
16. `20260406_public_challenges.sql` - Public challenges table
17. `20260406_screenshot_examples.sql` - Screenshot examples for Claude few-shot parsing
18. `20260413_scale_fat_columns.sql` - Per-region fat % columns, rename muscle→scale
19. `20260422_whoop_oauth.sql` - WHOOP OAuth fields on users (access_token, refresh_token, user_id, expires_at, connected_at)
20. `20260422_sync_token.sql` - Sync token column on users for Health Connect webhook auth
21. `20260422_google_health.sql` - Google Health Connect OAuth fields on users
22. `20260503_health_metrics.sql` - Added lean_body_mass, vo2_max, bmr, height to body_measurements
23. `20260503_user_timezone.sql` - Added timezone column to users
24. `20260503_merge_duplicate_catalog.sql` - Merged 7 duplicate catalog entries (push_up/push_ups, dip/dips, etc.)

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
- **Rank Levels**: Map levels `0` through `5` onto Theme Names. Level 0 = unranked ("Peasant" fallback), Levels 1-5 map to theme-specific rank names (e.g., Rookie, Amateur, Contender, Pro, Champion/Legend). The `levels` array in standards contains 5 thresholds (indices 0-4), producing `userLevel` 0-5.

### 2.1.1 Equipment Normalization
Exercise variants (dumbbell, smith machine) normalize to barbell-equivalent values before rank comparison:
- **Barbell**: `normalization_factor` = 1.0 (baseline — thresholds are written for barbell)
- **Dumbbells**: `normalization_factor` = 1.15 (harder due to stabilization; `weight × 2 × 1.15`)
- **Smith Machine**: `normalization_factor` = 0.85 (easier due to guided path)

When an exercise has `normalizes_to` set (e.g., `smith_bench_press` → `bench_press`), the rank engine:
1. Fetches the base exercise's standards (brackets/thresholds)
2. Multiplies `bestValue × normalization_factor` to get barbell-equivalent
3. Compares the normalized value against the base exercise's thresholds

This allows users to log their actual weight on any equipment variant and get a fair rank comparison.

### 2.2 Power Level & Player Stats (`src/services/api.ts`)
There are two distinct progression metrics for a user:
1. **Player Level**: Driven purely by raw participation. Uses exponential scaling: each level requires `1000 * 1.08^level` XP (fibonacci-ish curve). Early levels come fast, later levels require sustained commitment. Every time a user logs *any* exercise (or habit), they gain XP.
2. **Power Level (Aggregate Score)**: Driven by *performance*. Calculated by querying ONLY the `workouts` table (not habits/macros), finding the **highest rank level achieved** for *each unique ranked exercise*, and summing `max_level` across all of them.

**Important**: Power Level only counts ranked exercises from the `workouts` table. Habits and nutrition do not contribute to Power Level, only to Player Level (XP).

### 2.3 Data Architecture Patterns
- **Server Actions** (`src/app/actions.ts`): All write operations (logging workouts, habits, macros)
  - **Body Measurements**: `logBodyMeasurementAction` upserts per date — if a row exists for that date, it merges new metrics into it rather than creating duplicate rows
  - **Steps Set Mode**: When label contains "(Sync)", deletes existing rows for that habit+date before inserting the full value (no diff accumulation)
  - **Body Measurement Deletion**: `deleteBodyMeasurementAction` (single by ID), `deleteAllBodyMeasurementsAction` (reset all for user)
- **API Functions** (`src/services/api.ts`): All read operations (getHistory, getHabitProgress, getUserStats)
  - **Profile Updates**: Use `router.refresh()` after saving to reload server-rendered data
  - **Target Weight**: Stored in `body_composition_goals.target_weight` (string format)
- **Program API** (`src/services/programApi.ts`): Workout program CRUD operations
- **Shared Utilities** (`src/utils/physiquePoints.ts`): `calculatePhysiquePoints()` — used by TrackPage, ProgressMetrics, DashboardHeader, and BodyCompositionModal
- **Workout Parser** (`src/utils/workoutParser.ts`): Parses workout text descriptions into structured exercise data
- **parseReps** (`src/utils/parseReps.ts`): Utility for parsing rep schemes from text (e.g., "3x10", "5-5-5-3-3")
- **WHOOP Client** (`src/lib/whoop.ts`): WHOOP API client (token exchange, refresh, cycle/recovery/sleep/body measurement endpoints)
- **Google Health Client** (`src/lib/google-health.ts`): Google Health API client
- **Service Role Client** (`src/utils/supabase/service.ts`): Service role Supabase client for sync/cron endpoints that bypass RLS
- **EquipmentVariantPicker** (`src/components/EquipmentVariantPicker.tsx`): Select equipment variant (barbell/dumbbell/smith) per exercise during logging
- **EngineSelector** (`src/components/EngineSelector.tsx`): Engine/mode selector component

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
- Physique Points tracking (body composition changes vs goals)

**Arena Tab:**
- Active duels display
- Weekly challenge status
- Challenge a friend CTA

### 4.2 Dashboard Features
- **Pull-to-Refresh**: Touch gesture to reload all dashboard data (mobile-first)
- **Skeleton Loaders**: Animated placeholders instead of "Loading..." text
- **Weight Tracking**: Current weight, target weight, and progress in header
- **Physique Points**: Calculated from body composition changes vs goals (color-coded). Uses shared `calculatePhysiquePoints()` utility from `src/utils/physiquePoints.ts`. For each metric, finds the earliest and latest non-null values across all `body_measurements` rows, then sums deltas aligned with goals (shrink = points for decrease, grow = points for increase). Rounded to 1 decimal place. Requires 2+ entries to calculate.
  - **Tape mode metrics**: weight, waist, arms, legs, chest, shoulders
  - **Scale mode metrics**: weight, body_fat_percentage, left/right arm muscle+fat, trunk muscle+fat, left/right leg muscle+fat
  - Fat metrics default to "Shrink" goal, muscle metrics default to "Grow", users can change to "Maintain"
- **Empty States**: Motivational messages with CTAs for all empty sections

### 4.3 Onboarding Wizard
New users see a 10-step wizard before accessing the dashboard:
1. **Liability Waiver**: Assumption of risk and waiver of liability (must accept to proceed)
2. **Experience Mode**: "What brings you here?" — choose RPG ("Compete & Level Up") or Classic ("Track & Improve")
3. **Introduction**: Explains Refactor Athletics concept (adapts text based on chosen mode)
4. **Theme Selection**: Choose from 5 themes (RPG only — skipped for Classic users)
5. **Path Selection**: Choose training path (RPG) or view General Wellness overview (Classic)
6. **Personal Info**: Age, sex (with "prefer not to say" option), current weight
7. **Goal Setting**: Target weight
8. **Equipment Checklist**: Select available equipment (barbell, dumbbells, kettlebells, smith machine, pull-up bar, bench, squat rack, cables, treadmill, rower, assault bike, ski erg, resistance bands, yoga mat, rings, plyo box, outdoor running, bodyweight only)
9. **Quest Settings**: Configure habit visibility and targets
10. **Health Sync**: Connect WHOOP, Google Health, or Health Connect webhook for automatic data sync

After completion, `is_onboarded` flag is set to true, `waiver_accepted_at` timestamp is saved, `experience_mode` is stored in both the database and localStorage, and user sees normal dashboard.

Classic mode skips step 4 (theme selection). The step flow is dynamic based on `experienceMode` state.

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

### 5.1 Test Framework
- **Vitest** for unit and integration tests
- **React Testing Library** for component tests
- **182 tests** covering critical business logic and user flows

### 5.2 Test Coverage Areas
- **Server Actions**: logHabitAction, logTrainingAction, deleteHistoryItemAction
- **API Functions**: saveProfile, getHabitProgress, getUserStats, getHistory
- **API Routes**: parse-screenshot (Claude AI integration)
- **Components**: MacroLogModal, ScreenshotUploader, DailyQuest, HabitCard, ProfileCard, WorkoutBuilder
- **Business Logic**: Rank calculation (Epley formula, xBW comparison, level assignment)
- **Data Aggregation**: History from 4 domain-specific tables

### 5.3 Testing Patterns
- Mock Supabase client with proper method chaining
- Use `vi.hoisted()` for external SDK mocks (e.g., Anthropic)
- Test business logic separately from UI interactions
- Use `waitFor()` for async operations
- Mock `window.confirm` and `window.alert` for user interactions

### 5.4 Running Tests
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

## 7. UI Guidelines & Component Guardrails
- **Mobile First**: All layouts must be responsive, defaulting to stacked views on mobile (`flex-col`) before applying `md:` modifiers.
- **Z-Index Stacking Contexts**: Be careful with sibling `relative z-10` containers. If a dropdown menu (e.g., App Settings on the Profile Card) is placed inside a `z-10` container, the sibling container must have a lower z-index (or the parent must be elevated to `z-20`) so floating elements can escape the bounding box and remain clickable on mobile.
- **Styling**: Tailwind CSS is used globally. Favor dark, premium gradients (`bg-zinc-900`, `from-orange-600 to-red-600`) and glowing accents (`drop-shadow-[0_0_30px_rgba(249,115,22,0.4)]`).

## 8. Experience Modes

### 8.1 RPG vs Classic
The app supports two experience modes, selected during onboarding and stored in `users.experience_mode`:
- **RPG Mode** (`'rpg'`): Full gamification — themes, rank names, XP, "Daily Quests", "Arena", "Party", theme banner
- **Classic Mode** (`'classic'`): Clean, minimal UI — no theme banner, neutral labels throughout

### 8.2 Label Mapping
All mode-aware labels are driven by `ExperienceModeContext` (`src/context/ExperienceModeContext.tsx`):

| RPG Mode | Classic Mode | Component |
|---|---|---|
| Expertise | Fitness Score | DashboardHeader |
| Physique Points | Body Composition Progress | DashboardHeader |
| XP | pts | DashboardHeader, TodayTab |
| Daily Quests | Today's Targets | TodayTab |
| ⚔️ Arena | 👥 Social | MobileNav, DashboardTabs |
| Expertise Contributors | Performance Breakdown | ProgressTab |
| Trophy Case | View All | ProgressTab |
| Total XP | Total Points | ProgressTab |
| Aggregate Score / EXPERTISE | Overall / FITNESS SCORE | PowerRadar |
| Join Your Party | Join a Group | GroupCard |
| Party Quest | Weekly Challenge | GroupCard |

### 8.3 Context Hydration
`ExperienceModeProvider` checks localStorage first for instant render, then falls back to a database query. `DashboardClient` also fetches `experience_mode` from the users table and syncs it to the context on load.

## 9. Groups & Weekly Challenges

### 9.1 Group System
- **Groups** (`src/services/groupApi.ts`): Create/join/leave groups via invite codes
- **Group Card** (`src/components/GroupCard.tsx`): Full UI for group management and challenge tracking
- Leaders can set weekly challenges from 4 presets: Steps, Active Minutes, Workouts, Hydration Days
- Progress is aggregated from `habit_logs` and `workouts` tables across all group members
- RPG and Classic users can be in the same group — only labels differ

### 9.2 Challenge Presets
| Metric | Default Target | Data Source |
|---|---|---|
| Steps | 500,000 | `habit_logs` (habit_steps) |
| Active Minutes | 600 | `workouts` count × 30 |
| Workouts | 20 | `workouts` count |
| Hydration Days | 35 | `habit_logs` (habit_water) unique days |

## 10. Health Sync & Integrations

### 10.1 WHOOP Integration
- **Full OAuth flow**: Auth (`/api/whoop/auth`), callback (`/api/whoop/callback`), token refresh
- **WHOOP API client** (`src/lib/whoop.ts`): Token exchange, refresh, cycle/recovery/sleep/body measurement endpoints
- **Auto-sync on dashboard load**: Background sync refreshes if new WHOOP data available
- **Vercel cron job** (`/api/cron/whoop-sync`): Runs at 6 AM UTC daily for all connected users; configured in `vercel.json`
- **Data synced**: Strain, recovery, HRV, sleep, calories burned, weight, resting HR

### 10.2 Health Connect Webhook
- **Endpoint**: `/api/sync/health-connect` — accepts HC Webhook app's native JSON format
- **Token-in-URL auth**: No headers needed (e.g., `/api/sync/health-connect?token=xxx`) for easy HC Webhook app setup
- **12 supported data types**: Steps, sleep, active calories, weight, hydration, body fat, HRV, resting HR, lean body mass, VO2 max, BMR, height, exercise minutes
- **Exercise minutes**: Auto-synced from Health Connect exercise sessions

### 10.3 Google Health Connect
- **Google Health API client** (`src/lib/google-health.ts`): OAuth flow and data sync
- **Routes**: `/api/google-health/auth`, `/api/google-health/callback`, `/api/google-health/sync`

### 10.4 Data Priority
When WHOOP is connected, sleep/calories burned/HRV/resting HR come from WHOOP. Steps/weight/body composition come from Health Connect. This prevents conflicting data from multiple sources.

### 10.5 Manual Sync & Setup
- **Manual sync token endpoint** (`/api/sync/token`): Generates a token for Apple Shortcuts / HTTP webhook integration
- **Sync setup page** (`/sync/setup`): Instructions for iOS (Apple Shortcuts) and Android (HC Webhook app)
- **Settings page**: Integrations section with WHOOP connect/disconnect, Google Health connect, Health Connect webhook URL with copy button

### 10.6 Auth & Timezone
- **Auth middleware** excludes `/api/sync` and `/api/cron` endpoints (they use token-based or cron secret auth)
- **Per-user timezone** stored in DB (`users.timezone`), read by all sync endpoints to avoid duplicate entries (previously UTC caused duplicates after 8 PM ET)
- **TimezoneSync component** saves timezone to DB (not just cookie)
- **Service role client** (`src/utils/supabase/service.ts`): Used by sync/cron endpoints that bypass RLS

### 10.7 Wearable Habits
- New habits: `habit_day_strain`, `habit_recovery`, `habit_hrv`, `habit_resting_hr`
- **Wearable Sync** category added to Quest Settings (HabitSettings) with toggles
- Recovery and HRV cards shown on Track page and Dashboard summary

## 11. Active Workout UX

### 11.1 Workout Flow
- **Day-level progress**: 'Block X of Y · Today's Workout' header shows position in program
- **'Next Up' CTA** on HUB view to advance to next block
- **'End Workout' button** available from any active block (exercises, supersets, treadmill)
- **Workout-in-progress banner** (`ActiveWorkoutBanner.tsx`): Shows when workout is active, auto-clears on completion, dismiss (X) button

### 11.2 Superset & Exercise Display
- **Prescribed rep targets** shown in SupersetView header (per-exercise pills) and per-row labels
- **Reps-only exercises** (push-ups, dips, chin-ups): Weight input hidden, header shows 'Max Reps'
- **Plate Calculator**: Only shows for barbell/smith exercises, more prominent labeled button, fills all sets

### 11.3 Rest Timer
- **RestTimerBar redesigned**: Solid blue background with white text, more prominent and visible

### 11.4 Rank Progression During Workout
- **Live rank nudge**: After each completed set, shows gap to next rank (within 30 lbs shows target, threshold crossed shows celebration)
- **Rank-up celebration on block complete**: Shows before → after rank with themed names when crossing a threshold
- `logTrainingAction` now returns `previous_level` for rank-up detection

## 12. Future Features & Design Documents

### 12.1 Character Creation System
A comprehensive RPG-style character creation and customization system is planned. See `CHARACTER_CREATION_DESIGN.md` for full specifications including:
- SVG base bodies + PNG gear overlays approach
- Database schema for character config and gear catalog
- Unlock system (XP, achievements, themes)
- Component architecture and rendering logic
- 4-phase implementation plan
- Asset requirements and design guidelines

This feature will allow users to build visual avatars that evolve with their fitness journey, unlock cosmetic gear through achievements, and display their character throughout the app.

## 13. Date Handling — MANDATORY

All `date` columns store `YYYY-MM-DD` strings in the user's local timezone. These are **calendar labels**, not timestamps.

### 13.1 Rules

1. **Compare date strings directly:** `row.date >= weekStartStr` ✅
2. **Never parse bare:** `new Date(row.date)` ❌ — this creates UTC midnight which shifts to the previous day in US timezones
3. **Need a Date object?** Use `parseLocalDate(str)` from `@/utils/date` → appends `T12:00:00` ✅
4. **Server-side "today"?** Use `getServerToday(user.timezone)` ✅ — NOT `new Date()` (which is UTC on Vercel)
5. **Server-side "this week"?** Use `getServerWeekStart(user.timezone)` ✅
6. **Sort dates?** Use `a.date.localeCompare(b.date)` or `a.date >= b.date` ✅

### 13.2 Why Noon?

`parseLocalDate()` appends `T12:00:00` (noon). No timezone on Earth (max UTC±14) can shift noon into a different calendar day. Midnight (`T00:00:00`) fails for UTC+ timezones.

### 13.3 Anti-patterns (BANNED)

```typescript
new Date(row.date)                    // ❌ UTC midnight = wrong day
new Date(challenge.start_date)        // ❌ same problem
new Date(dateStr + 'T00:00:00')       // ❌ fails in UTC+ timezones
```

### 13.4 Correct Patterns

```typescript
import { parseLocalDate, getServerToday, getServerWeekStart } from '@/utils/date';

// Filtering (preferred — no Date object needed)
const thisWeek = workouts.filter(w => w.date >= weekStartStr);

// When you need a Date object for display/arithmetic
const d = parseLocalDate(row.start_date);
const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });

// Server-side today (API routes, server actions)
const today = getServerToday(user.timezone || 'America/New_York');
```

### 13.5 Enforcement

- ESLint `no-restricted-syntax` rule warns on `new Date(.date/.start_date/.end_date/.week_start)`
- Code review: any `new Date()` with a date-only string argument must use `parseLocalDate()`
