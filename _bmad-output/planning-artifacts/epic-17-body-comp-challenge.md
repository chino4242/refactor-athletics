# Epic 17: Party Body Composition Challenge

**Status:** planned
**Priority:** Medium — ties into body composition (Epic 8) + party accountability
**Created:** 2026-06-20

---

## Vision

A party can run a body composition challenge together — tracking not just weight loss, but RECOMPOSITION (losing fat while gaining/maintaining muscle). This prevents the "just starve yourself" approach to winning and rewards people who are actually getting healthier.

---

## Challenge Types

### 1. Body Fat % Drop Challenge
**Metric:** Biggest decrease in body fat % over the challenge period
**Why:** Directly measures fat loss regardless of weight changes. Someone who stays the same weight but drops 3% BF is winning.

### 2. Lean Mass Gain Challenge
**Metric:** Biggest increase in lean body mass (lbs) over the challenge period
**Why:** Rewards muscle building. Prevents people from just cutting calories.

### 3. Recomp Score Challenge (Recommended default)
**Metric:** Combined score = (BF% dropped × 2) + (lean mass gained in lbs)
**Why:** Rewards BOTH fat loss and muscle gain. The best outcome is losing fat AND gaining muscle simultaneously. The multiplier on BF% balances the scales (losing 1% BF is roughly equivalent to gaining 2 lbs lean mass in difficulty).

### 4. Weight Loss Challenge (Simple)
**Metric:** Total weight lost (lbs)
**Why:** The simplest metric. Some parties just want this. But it's the least nuanced.

---

## Stories

### 17-1: Create Body Comp Challenge

**As a** party leader,
**I want** to create a body composition challenge for my party,
**So that** we're all accountable for our physical transformation goals together.

**Acceptance Criteria:**
- New challenge type in campaign/challenge creation flow: "Body Composition"
- Pick metric type: BF% Drop / Lean Mass Gain / Recomp Score / Weight Loss
- Set duration: 4 weeks / 8 weeks / 12 weeks (body comp changes are slow)
- Set start date (allows time for everyone to get a baseline measurement)
- All members must have a "before" measurement within 3 days of start
- Challenge shows on Arena alongside campaigns

### 17-2: Baseline + Progress Measurements

**As a** challenge participant,
**I want** the system to track my starting and current body composition,
**So that** my progress is calculated automatically from smart scale data.

**Acceptance Criteria:**
- "Before" measurement = most recent body_measurements entry at or near challenge start
- "Current" measurement = most recent body_measurements entry
- Progress calculated as delta between the two
- If no measurement exists → prompt: "Step on your scale to get started"
- Measurements come from Health Connect / HealthKit sync (smart scale data)
- Manual entry fallback if no smart scale

### 17-3: Challenge Leaderboard (Non-Competitive Framing)

**As a** challenge participant,
**I want** to see everyone's progress,
**So that** I'm motivated by the group's collective transformation.

**Acceptance Criteria:**
- Shows each member's progress toward the metric:
  - "Ryan: -1.8% BF, +1.2 lbs lean"
  - "Amanda: -0.5% BF, +2.1 lbs lean"
- NOT framed as a leaderboard/ranking (per party design principles)
- Shows individual progress bars toward personal goals (if set)
- Shows group average: "Party average: -1.2% BF"
- Private by default — members opt in to share specific numbers

### 17-4: Weekly Check-In + Nudge

**As a** challenge participant,
**I want** weekly progress updates and reminders to measure,
**So that** I stay on track and don't forget to step on the scale.

**Acceptance Criteria:**
- Weekly summary (every Monday): "Week 3/8: You're down 1.2% BF. Keep going."
- Nudge if no measurement this week: "Step on the scale — your party is watching"
- Celebrate milestones: "Halfway there! Party has lost a combined 8% BF"
- Show weekly trend line (simple: week 1 → week 2 → week 3 values)

### 17-5: Challenge Completion + Results

**As a** challenge participant who completed the challenge duration,
**I want** to see final results and earn rewards,
**So that** I feel the accomplishment of the transformation.

**Acceptance Criteria:**
- Final results card: before vs after for each member
- Celebrate top improvements: "Most improved BF%: Ryan (-3.2%)"
- Group achievement: "Your party lost a combined 12% body fat"
- XP reward: scaled to duration (4wk = 500, 8wk = 1000, 12wk = 2000 per member)
- Ties into Recomp Streak (Epic 8) — completing a challenge extends your streak

---

## Privacy Considerations

Body composition is sensitive data. Design choices:
- Members choose what to share: weight? BF%? Lean mass? All? None (just show ✓/✕ for "measured this week")
- Default: show delta only ("+1.2 lbs lean") not absolute values ("158 lbs lean")
- No one sees your actual weight unless you choose to share
- The metric can be shown as % change rather than absolute

---

## Data Requirements

- `body_measurements` table (already exists): weight, body_fat_percentage, lean_body_mass
- New: challenge record linking to body_measurements at start/current
- Reuses campaign infrastructure (challenge_75 tables could be extended OR new table)

---

## Lore Connection

*"The rift doesn't just test your skills — it tests your vessel. A lighter, stronger body channels rift energy more efficiently. The party that transforms together binds more spirits."*

Optional tie-in: completing a body comp challenge could grant a small Power Level multiplier or a unique cosmetic badge.

---

## Open Questions — RESOLVED

1. ~~Use existing campaign tables or new?~~ **Use existing.** The challenge_75 system already supports custom metrics, per-member tracking, and daily evaluation. Body comp challenge is just a campaign with metric_type = 'body_comp' and longer evaluation windows (weekly not daily).
2. ~~Team goal?~~ **Yes.** Show collective target: "Party goal: lose a combined 10% BF" alongside individual progress.
3. ~~Members without smart scales?~~ **Covered in a separate epic** (non-wearable user persona).
4. ~~Different goals per member?~~ **Yes.** Each member picks their focus when joining: BF% drop OR lean mass gain OR recomp score. The challenge tracks everyone but each person's "success" is measured against their chosen goal. This uses the existing per-member metrics in challenge_75_metrics.
