# Refactor Athletics
A comprehensive fitness tracking, ranking, and RPG-lite progression web application built with Next.js, React, Tailwind CSS, and Supabase.

## Overview
Refactor Athletics gamifies physical training. The application parses a standardized catalog of 240+ functional fitness exercises, scales user performance against demographic brackets to assign "Ranks," and tracks their total XP and "Power Level" over time.

Recent architectural changes migrated the canonical JSON exercise database into a fully relational PostgreSQL database hosted on Supabase, establishing a strong foundation for leaderboards, duels, and daily challenges.

### Core Features
- **Dynamic Training Catalog**: Exercises (`catalog`) are fetched via Supabase, complete with XP factors, categories (e.g., Metcon, Gymnastics), and standards thresholds.
- **Rank Calculator**: Computes performance (e.g., Lbs, Sec, Reps) against Age, Sex, and Bodyweight, converting raw results into themed tier rankings (e.g., Rookie, Contender, Legend).
- **Power Level System**: Aggregates the `max_level_achieved` across all historic exercises, multiplying each by 100 to generate a holistic player strength score.
- **Attribute Balance**: A specialized radar chart categorizes logged exercises into four cardinal points: Strength (STR), Endurance (END), Power (PWR), and Mobility (MOB).

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
The Supabase schema must be applied to ensure the correct tables (`users`, `catalog`, `history`, `duels`, `challenges`) are present, along with proper Row Level Security (RLS) policies.
- Ensure the `users` table has the `goal_weight` (numeric) and `timezone` (text) columns added, as they are required by the `saveProfile` payload.

### Running the App
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development Resources
- **Developer Guardrails**: Please review `skills.md` for strict architectural guidelines, specifically relating to the math behind Ranks, Power Levels, and Z-Index Stacking Contexts for the mobile UI.
- **Database Rules**: All data inserts involving the `catalog` table require bypassing RLS using the `SUPABASE_SERVICE_ROLE_KEY`.

## Deployment
This project is optimized for deployment on [Vercel](https://vercel.com/new). Ensure all environment variables are securely mapped before triggering a production build.
