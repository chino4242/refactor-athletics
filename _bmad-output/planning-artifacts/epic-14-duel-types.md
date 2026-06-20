# Epic 14: Duel Types — Beyond XP

**Status:** planned
**Priority:** Medium — adds variety and replayability to duels
**Created:** 2026-06-20

---

## Vision

Duels become more interesting when you can choose WHAT you're competing on. XP remains the default (inherently fair — everyone earns it from every activity), but challengers can pick a specific metric to make duels targeted and strategic.

---

## Duel Types

| Type | Metric | Default? | Description |
|------|--------|----------|-------------|
| **XP Race** | Total XP earned during duel | ✅ Default | Fair for everyone — all activity counts |
| **Volume War** | Total weight lifted (sets × reps × weight) | | Favors Vanguards/lifters |
| **Distance Race** | Total miles logged (run/bike/swim) | | Favors Rangers/cardio |
| **Session Grind** | Number of workout days | | Pure consistency — most fair after XP |
| **Rank Race** | Number of rank-ups during duel | | Favors those near thresholds |
| **PR Hunt** | Number of personal records set | | Favors active improvers |
| **Time Under Tension** | Total active minutes | | Favors volume of any kind |

### Specific Challenges (future):
| Type | Metric | Description |
|------|--------|-------------|
| Push-Up Showdown | Total push-up reps | Direct competition |
| Mile Time Trial | Best mile time | Head-to-head speed |
| Plank-Off | Longest plank hold | Endurance duel |
| Nutrition Discipline | Days hitting protein target | Lifestyle duel |

---

## UX Flow

**Challenger picks type when creating:**
```
CHALLENGE [friend]

Pick your arena:
  ⚡ XP Race (default)
  🏋️ Volume War
  🏃 Distance Race
  📅 Session Grind
  ⬆ Rank Race
  ★ PR Hunt

Duration: [3 days / 7 days / 14 days]
```

**Opponent sees the type when accepting:**
```
[Friend] challenges you to a VOLUME WAR!
7 days — who lifts more total weight?
[Accept] [Decline]
```

---

## Lore Connection

*"The rift has many arenas. Some test raw power. Others test endurance. Choose your battleground wisely — or let your opponent choose it for you."*

Class-based taunts when challenging outside your strength:
- Vanguard challenging Ranger to Distance Race: *"Brave. Foolish, but brave."*
- Ranger challenging Vanguard to Volume War: *"You want to play their game? Interesting."*

---

## Stories

### 14-1: Duel Type Selector on Challenge Creation
Add type picker to duel creation flow. XP Race pre-selected as default. Other types available as options.

### 14-2: Duel Progress by Type
Update duel progress tracking to query the correct metric based on duel type (not just XP).

### 14-3: Duel Display — Show Type + Metric
Arena duel cards show the duel type icon + current score in the relevant metric.

### 14-4: Specific Challenge Duels (future)
Single-exercise duels (push-up showdown, plank-off) — requires exercise-specific tracking during duel period.

---

## Technical Notes

- `duels` table needs a `duel_type` column (text, default 'xp')
- Progress calculation switches based on type:
  - XP: sum from xp_ledger during duel period
  - Volume: sum from workouts (raw_value × sets math)
  - Distance: sum from workouts WHERE exercise_id LIKE 'synced_run%' or distance > 0
  - Sessions: COUNT DISTINCT date from workouts
  - Rank-ups: COUNT from workouts WHERE level > previous_level during period
  - PRs: COUNT where raw_value > historical max during period
