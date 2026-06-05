# Starter Quests — Feature Spec

## Problem
Beta tester feedback: "This is complicated, I don't feel welcomed or onboarded. It's hard to know where to start." After the onboarding wizard, the dashboard shows everything at once with no guidance on what to do first or how systems connect.

## Solution
A progressive quest chain that teaches one system at a time through action. The dashboard starts focused (one active quest) and expands as the user earns access to features. Completed quests persist as achievements.

---

## Onboarding Wizard (Revised — 6 steps)

| Step | Content | Stored |
|------|---------|--------|
| 1 | Liability waiver | `waiver_accepted_at` |
| 2 | Experience mode (RPG / Classic) | `experience_mode` |
| 3 | Personal info: age, sex, current weight | `age`, `sex`, `bodyweight` |
| 4 | **Goals & motivation** (new): Why are you here? (multi-select: lose weight, build muscle, get stronger, stay consistent, compete with friends, general health). Free-text optional: "What does success look like in 75 days?" | `goals` (jsonb) |
| 5 | Equipment checklist | `available_equipment` |
| 6 | Health sync (WHOOP / Health Connect / Apple Health) | OAuth tokens / sync_token |

**Removed from wizard (moved to quest chain):**
- Theme selection → Quest 2
- Training path → Quest 5
- Target weight → folded into Goals step
- Habit/quest targets → Quest 4
- Nutrition plan/macros → Quest 3 completion triggers macro calc

---

## Starter Quest Chain

### Quest 1: "First Strike"
- **Objective:** Log 1 set of any exercise (any weight, any reps)
- **Teaches:** How to log a workout, what a rank is
- **Trigger:** Available immediately after onboarding
- **Completion condition:** `workouts` table has ≥1 row for this user
- **Unlocks:** Power Level in dashboard header, Rank reveal celebration
- **Reward:** +50 XP, first rank badge displayed

### Quest 2: "Choose Your Identity"
- **Objective:** Select a theme
- **Teaches:** Themes personalize rank names and visuals
- **Trigger:** Unlocks after Quest 1
- **Completion condition:** `selected_theme` is set (not default 'athlete' unless explicitly chosen)
- **UI:** Theme picker presented inline as the quest card content
- **Unlocks:** Themed rank names, banner image on Arena/Profile
- **Reward:** Theme applied immediately

### Quest 3: "Fuel Up"
- **Objective:** Log 1 meal or macro entry
- **Teaches:** Nutrition tracking exists and earns XP
- **Trigger:** Unlocks after Quest 2
- **Completion condition:** `nutrition_logs` has ≥1 row for this user
- **Unlocks:** Nutrition card on Today tab, macro calculator runs (using goals from onboarding)
- **Reward:** +25 XP, nutrition targets set

### Quest 4: "Daily Discipline"
- **Objective:** Log 1 daily habit (steps, water, sleep, or any)
- **Teaches:** Daily Quests / habits system
- **Trigger:** Unlocks after Quest 3
- **Completion condition:** `habit_logs` has ≥1 row for this user
- **UI:** Shows habit configuration (choose targets, hide irrelevant ones)
- **Unlocks:** Full Daily Quests panel on Today tab
- **Reward:** +25 XP, habit targets saved

### Quest 5: "Find Your Path"
- **Objective:** Choose a training path (Hybrid, Strength, Endurance, Mobility)
- **Teaches:** Paths determine which exercises count toward Power Level
- **Trigger:** Unlocks after Quest 4
- **Completion condition:** `selected_path` is set
- **UI:** Path picker with descriptions, inline in quest card
- **Unlocks:** Path exercises shown on Power Level page, workout programs assigned
- **Reward:** +50 XP, `assignDefaultProgram` runs

### Quest 6: "Full Session"
- **Objective:** Complete an entire scheduled workout (all sections)
- **Teaches:** How programs/scheduling works
- **Trigger:** Unlocks after Quest 5
- **Completion condition:** A workout session where `completedIndices.length === workoutData.length`
- **Unlocks:** "Today's Workout" card prominent on Today tab, Workout Report
- **Reward:** +100 XP

### Quest 7: "Perfect Day"
- **Objective:** Hit all visible daily targets in one day
- **Teaches:** Consistency, the daily rhythm
- **Trigger:** Unlocks after Quest 6
- **Completion condition:** All non-hidden habits meet their target on a single date
- **Unlocks:** Streak tracking, consistency heatmaps
- **Reward:** +100 XP, streak counter appears

### Quest 8: "Join the Arena"
- **Objective:** Join a group OR start/accept a challenge
- **Teaches:** Social features
- **Trigger:** Unlocks after Quest 7
- **Completion condition:** Row in `group_members` or `challenge_75_members` or `duels`
- **Unlocks:** Arena tab fully active (no longer dimmed)
- **Reward:** +100 XP

---

## UI Behavior

### Today Tab Layout (during quest phase)
```
┌─────────────────────────────────┐
│  ⚡ ACTIVE QUEST                │  ← Full color, prominent
│  "Log 1 set to discover your   │
│   rank"                         │
│  [Start Workout →]              │
└─────────────────────────────────┘

┌─────────────────────────────────┐  ← Dimmed (opacity-40)
│  🔒 Daily Quests                │
│  Complete "Daily Discipline"    │
│  to unlock                      │
└─────────────────────────────────┘

┌─────────────────────────────────┐  ← Dimmed
│  🔒 Today's Workout             │
│  Complete "Find Your Path"      │
│  to unlock                      │
└─────────────────────────────────┘
```

### After quest completion:
```
┌─────────────────────────────────┐
│  ✅ First Strike        +50 XP  │  ← Collapsed, achievement style
│  ⚡ Choose Your Identity         │  ← New active quest
│  [Pick a theme →]               │
└─────────────────────────────────┘

│  (unlocked content renders      │
│   normally below)               │
```

### Completed state (all 8 done):
- No quest card shown
- All features visible and active
- Achievements accessible from Profile → "Starter Quests" section (8/8 ✅)

### Dimming behavior:
- Locked sections show at `opacity-40` with a `pointer-events-none` overlay
- Small lock icon + "Complete [quest name] to unlock" text
- Content is VISIBLE so user knows what's coming — just not interactive

---

## Database Changes

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS starter_quest_progress JSONB DEFAULT '[]';
-- Format: [{ "id": "first_strike", "completed_at": "2026-06-05T..." }, ...]

ALTER TABLE users ADD COLUMN IF NOT EXISTS goals JSONB DEFAULT '{}';
-- Format: { "motivations": ["lose_weight", "get_stronger"], "success_statement": "..." }
```

No new tables needed. The quest state is lightweight enough for a jsonb column.

---

## Hook: `useStarterQuests`

```typescript
// src/hooks/useStarterQuests.ts
interface StarterQuest {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
  isActive: boolean;  // first incomplete quest
  completedAt?: string;
}

interface UseStarterQuestsReturn {
  quests: StarterQuest[];
  activeQuest: StarterQuest | null;
  isFeatureUnlocked: (feature: string) => boolean;
  completeQuest: (questId: string) => Promise<void>;
  allComplete: boolean;
}
```

### Feature gating map:
```typescript
const UNLOCK_MAP: Record<string, string> = {
  'power_level_header': 'first_strike',
  'nutrition_card': 'fuel_up',
  'daily_quests': 'daily_discipline',
  'training_path': 'find_your_path',
  'today_workout': 'full_session',
  'streaks_heatmaps': 'perfect_day',
  'arena_tab': 'join_the_arena',
};
```

---

## Quest Completion Detection

| Quest | Auto-detected | Manual |
|-------|--------------|--------|
| first_strike | ✅ After `logTrainingAction` succeeds | — |
| choose_identity | — | ✅ User picks theme in quest card |
| fuel_up | ✅ After `logHabitAction` with macro type | — |
| daily_discipline | ✅ After `logHabitAction` with habit type | — |
| find_your_path | — | ✅ User picks path in quest card |
| full_session | ✅ When `isComplete` fires in useWorkoutSession | — |
| perfect_day | ✅ Checked on dashboard load (all targets met) | — |
| join_the_arena | ✅ After joining group/challenge/duel | — |

Auto-detected quests fire a celebration immediately after the triggering action. No need for the user to "claim" them.

---

## Migration Path for Existing Users

- Existing users with `is_onboarded = true` get `starter_quest_progress` pre-filled with all 8 quests marked complete (they've already done these things)
- The beta tester gets reset (`starter_quest_progress = []`) so they experience it fresh
- New users start with empty progress

---

## Scope Estimate

| Component | Effort |
|-----------|--------|
| DB migration (2 columns) | 5 min |
| `useStarterQuests` hook | 1 hr |
| Quest card component | 1 hr |
| Today tab integration (gating + dimming) | 1 hr |
| Onboarding wizard revision (remove 4 steps, add goals) | 1 hr |
| Quest completion detection (wire into actions) | 1 hr |
| Profile achievements display | 30 min |
| **Total** | ~6 hrs |

---

## Out of Scope (Future)
- Time-gating between quests (letting users blaze through for now)
- Custom quest cards with animations per theme
- Seasonal/recurring quest chains post-starter
- Quest notifications/reminders
