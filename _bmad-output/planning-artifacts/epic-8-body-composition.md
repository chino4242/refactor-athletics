# Epic 8: Body Composition — Physique Rank + Recomp Streak

**Status:** planned
**Priority:** Medium — adds depth to progression without blocking core loop
**Created:** 2026-06-19

---

## Vision

Body composition is a meaningful indicator of progress that goes beyond "is weight going down." For users with smart scales syncing via Health Connect/HealthKit, we passively track body fat % and lean mass — then gamify the trend.

Two features:
1. **Physique Rank** — a body composition rank (LV 0-5) displayed separately from Power Level, based on body fat % + lean mass
2. **Body Recomp Streak** — consecutive weeks where composition moved in the right direction, with escalating XP

**Design Principles:**
- Reward going in the right direction (most forgiving criteria)
- Zero manual entry — smart scale sync only (manual persona is a future story)
- Separate from Power Level (doesn't inflate the number, but visible alongside it)
- Motivate consistency (stepping on the scale regularly)

---

## Data Sources

- `body_measurements` table: already has `weight`, `body_fat_percentage`, `lean_body_mass`
- Health Connect/HealthKit sync: writes to `body_measurements` via nativeHealth + health-connect webhook
- Smart scales (Withings, Renpho, etc.) write to Health Connect → app reads

---

## Stories

### 8-1: Physique Rank Display

**As a** user with body composition data from my smart scale,
**I want** to see my Physique Rank on the Power Level screen,
**So that** I understand where I stand in terms of body composition.

**Rank Brackets (combined body fat % + lean mass factor):**

Base ranks from body fat % (male / female):
| Level | Male BF% | Female BF% |
|-------|----------|------------|
| 0 | No data | No data |
| 1 | >25% | >35% |
| 2 | 20-25% | 28-35% |
| 3 | 15-20% | 22-28% |
| 4 | 10-15% | 18-22% |
| 5 | <10% | <18% |

**Lean mass bonus:** If lean body mass (lbs) exceeds the 50th percentile for age/sex, bump rank by +1 (capped at 5). This rewards muscle gain, not just being skinny.

**Display:**
- Power Level screen, below the Power Level box (separate section)
- Shows: Physique Rank badge + body fat % + lean mass
- "Last measured: 3 days ago"
- Shows next threshold: "Drop to 19.5% for LV 4"

**Data requirement:** At least one body_measurement with body_fat_percentage in the last 30 days.

---

### 8-2: Body Recomp Streak

**As a** user tracking body composition weekly,
**I want** to see my streak of consecutive good weeks,
**So that** I feel motivated to keep the trend going.

**"Good Week" Definition (most forgiving — EITHER qualifies):**
- Body fat % decreased (any amount, even 0.1%)
- OR lean body mass increased (any amount)
- Compared to the previous week's measurement

**Streak Rules:**
- Evaluated weekly (Monday comparison: this week's latest vs last week's latest)
- Missed week (no scale data) = streak breaks
- Streak counter: consecutive good weeks

**XP (escalating):**
| Weeks | XP per week |
|-------|-------------|
| 1-2 | 25 XP |
| 3-4 | 50 XP |
| 5-8 | 75 XP |
| 9+ | 100 XP |

**Display:**
- Power Level screen or Arena, near the Physique Rank
- "🔥 4-week recomp streak · +50 XP this week"
- Or "○ Step on scale to continue streak" (nudge when no data this week)

---

### 8-3: Composition Trend Card

**As a** user,
**I want** to see my body composition trend at a glance,
**So that** I know if I'm moving in the right direction without digging into numbers.

**Display (on Power Level screen, compact):**
```
PHYSIQUE  LV 3
BF 18.2%  ↓0.4  |  LEAN 158 lbs  ↑1.2
🔥 4-week streak
```

One line. Shows current values + delta from last month. Streak below.

---

## Future (Not This Epic)

- Manual entry for users without smart scales
- Push notification nudge: "Step on scale to keep your streak"
- Physique milestones (e.g., drop below 20% BF → celebration)
- Integration with Nutrition: "At current deficit, you'll reach LV 4 in ~6 weeks"
- Per-region muscle mass tracking (for advanced users with Withings-level scales)

---

## Open Questions

1. What lean mass percentile data do we use for the bonus? (Could start with a simple threshold: >140 lbs lean for males, >100 lbs for females — and refine later with age brackets)
2. Should the streak show on Arena (bounty-like) or Power Level (progression-like)?
3. When do we evaluate the streak — on app open Monday morning, or when new scale data syncs?
