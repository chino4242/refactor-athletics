# Refactor Athletics: Developer Guardrails (skills.md)

This document contains core logic rules, architectural decisions, and critical information for engineers and AI assistants working on **Refactor Athletics**. 

## 1. Database Architecture: Supabase
The application uses **Supabase** (PostgreSQL) as its primary backend, moving away from legacy JSON files (`activity_catalog.json`) and DynamoDB infrastructure.
- **Tables**: `users`, `catalog`, `history`, `duels`, `challenges`.
- **Row Level Security (RLS)**: RLS is active on all tables. 
  - The `catalog` table is readable by everyone `(true)` but requires the `SUPABASE_SERVICE_ROLE_KEY` to insert/update metadata.
  - The `users` and `history` tables require authenticated `auth.uid()` checks to mutate data.

### 1.1 `users` Table Schema Requirements
When saving or updating user profiles, ensure the `users` table has:
- `goal_weight` (numeric)
- `timezone` (text)
- `bodyweight` (numeric)
*(These columns were added via direct SQL migrations to support the `saveProfile` payload).*

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
2. **Power Level (Aggregate Score)**: Driven by *performance*. Calculated by iterating through the user's entire history, finding the **highest rank level achieved** for *each unique exercise*, and summing `100 * max_level` across all of them.

### 2.3 Attribute Balance Radar
The Radar chart in `PowerRadar.tsx` requires exactly 4 cardinal points: **STR**, **END**, **PWR**, **MOB**.
Since the `catalog` ingested over 240 specific exercise sub-categories, `src/hooks/useTrophies.ts` maps them explicitly to ensure visual balance:
- `"Cardio"` / `"Endurance"` -> **Endurance & Speed**
- `"Metcon"` / `"Power"` -> **Power & Capacity**
- `"Mobility"` / `"Flexibility"` -> **Mobility**
- `"Strength"` / `"Gymnastics"` / `"Weightlifting"` -> **Strength**

## 3. UI Guidelines & Component Guardrails
- **Mobile First**: All layouts must be responsive, defaulting to stacked views on mobile (`flex-col`) before applying `md:` modifiers.
- **Z-Index Stacking Contexts**: Be careful with sibling `relative z-10` containers. If a dropdown menu (e.g., App Settings on the Profile Card) is placed inside a `z-10` container, the sibling container must have a lower z-index (or the parent must be elevated to `z-20`) so floating elements can escape the bounding box and remain clickable on mobile.
- **Styling**: Tailwind CSS is used globally. Favor dark, premium gradients (`bg-zinc-900`, `from-orange-600 to-red-600`) and glowing accents (`drop-shadow-[0_0_30px_rgba(249,115,22,0.4)]`).
