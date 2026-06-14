# Training Seasons — Design Spec (v2.1)

## North Star
Every 12 weeks, you're on a journey through a campaign. You train, you build, you peak, and then you TEST. The test is the boss fight. Everything before it is preparation.

---

## Structure: 12-Week Season

| Phase | Weeks | RPG Name | Training Focus | Rep Scheme |
|-------|-------|----------|---------------|-----------|
| Accumulation | 1-4 | The Forge | Volume, technique, base | 3-4×10-12 |
| Intensification | 5-8 | The Crucible | Strength, progressive overload | 4×6-8 |
| Peaking | 9-10 | The Summit | Max effort, neuromuscular | 5×3-5 |
| Deload | 11 | The Calm | Recovery, 75% volume | 2×8-10 |
| Test Week | 12 | The Arena | All 12 ranked exercises tested | 1RM attempts / max effort |

---

## How It Feels

### The Forge (Weeks 1-4)
- Programs prescribe moderate weight, high reps
- "Numbers going up" = volume PRs (total weight lifted this week > last week)
- The app shows weekly volume as the phase metric
- Exercises are practiced frequently but never maxed

### The Crucible (Weeks 5-8)
- Weight increases, reps decrease
- "Numbers going up" = estimated 1RM climbing (Epley projections shown)
- Rank nudges show "Based on today's set, you'd be Level 3 at max effort"
- Intensity feels harder — rest periods lengthen

### The Summit (Weeks 9-10)
- Low volume, heavy singles/triples
- "Numbers going up" = confidence (projected levels shown: "You're tracking for Level 4 on Bench")
- Programs taper — fewer exercises per day, more focus

### The Calm (Week 11)
- Deload: same exercises at 75% load, 50% volume
- Mental recovery. The app says "Sharpen the blade."
- Shows countdown to Rank Week: "3 DAYS UNTIL THE ARENA"

### The Arena (Week 12)
- 12 ranked exercises spread across 5-6 days
- Each test is a focused "boss fight" card in Battle Mode
- Victory screen at the end of the week shows ALL new ranks
- Season summary: total Power Level change, PRs set, XP earned

---

## Test Week Schedule (Hybrid Example)

| Day | Tests | Why |
|-----|-------|-----|
| Monday | Bench Press, Overhead Press, Push-Ups | Upper push, same family |
| Tuesday | Deadlift, Barbell Row, Pull-Ups | Upper/lower pull |
| Thursday | Back Squat, Dead Hang, Plank | Lower + static holds |
| Friday | Run 400m | Sprint (fresh legs from Wed rest) |
| Saturday | Run 1 Mile OR Run 5K | Distance (alternate each season) |

---

## Interaction with Existing Systems

### Power Level Decay
- **During a season:** Decay is paused conceptually. The user is on a guided path that WILL test them by Week 12.
- **Without a season (ad-hoc users):** Decay works as before — expiry warnings prompt retesting.
- **Between seasons:** If the user doesn't start a new season within 2 weeks of completing one, decay kicks back in.

### Weekly Bounties
- Bounties adjust per phase:
  - Forge: Volume bounties, session count bounties
  - Crucible: Intensity bounties ("Hit X lbs on Bench"), consistency
  - Summit: Reduced difficulty (don't over-fatigue before test week)
  - Arena: "Rank up X exercises" bounty

### Campaigns (75-Day)
- Campaigns and seasons are independent. A user can be in both.
- A campaign's "workout" metric auto-checks from season training.

### Group Features
- Party members can be on the same season (started together) or different ones.
- Rank Week becomes a social event — "Test Week starts Monday for the whole party."

---

## What We Build Toward NOW (v2.0)

Even before implementing seasons, every decision should assume seasons are coming:

1. **Programs include all 12 ranked exercises** — so when seasons arrive, the schedule is already correct.
2. **Programs have intensity intent** — even if just a text field (`target_intensity: 'moderate'`), the data model is ready for phase-based scaling.
3. **The weekly grid shows "what week am I on"** — even if it's just Week 1 forever right now.
4. **Rank attempts are always available** — organic breakthroughs count regardless of phase. Battle Mode never blocks a rank test.
5. **Victory/rank-up moments feel climactic** — they'll feel even bigger during Rank Week, but the celebration exists now.

---

## Schema (Future — Not Built Yet)

```sql
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  training_path TEXT NOT NULL,
  start_date DATE NOT NULL,
  status TEXT DEFAULT 'active', -- active, completed, abandoned
  current_week INTEGER DEFAULT 1,
  phase_config JSONB DEFAULT '{
    "phases": [
      {"name": "forge", "weeks": [1,2,3,4], "sets": 3, "reps": "10-12", "intensity": 0.70},
      {"name": "crucible", "weeks": [5,6,7,8], "sets": 4, "reps": "6-8", "intensity": 0.80},
      {"name": "summit", "weeks": [9,10], "sets": 5, "reps": "3-5", "intensity": 0.90},
      {"name": "deload", "weeks": [11], "sets": 2, "reps": "8-10", "intensity": 0.60},
      {"name": "arena", "weeks": [12], "sets": 1, "reps": "1-3", "intensity": 1.0}
    ]
  }',
  completed_at TIMESTAMPTZ,
  results JSONB -- {power_level_before, power_level_after, rank_ups: [...]}
);

-- Link workouts to seasons for tracking
ALTER TABLE workouts ADD COLUMN season_id UUID REFERENCES seasons(id);
ALTER TABLE workouts ADD COLUMN phase TEXT;
```

---

## Open Questions (Resolve Before Build)

1. Is season enrollment automatic (starts when you pick a path) or manual ("Start a Season" CTA)?
2. What if someone misses multiple weeks — does the season extend or fail?
3. Should the Rank Week schedule be auto-generated or editable?
4. Premium-only? Or free with premium getting "coached" phases?
5. How does this interact with path switching mid-season?

---

## Priority: Fix Programming First

Before seasons can work, the default programs must:
- [x] Include all 12 ranked exercises distributed across the week
- [ ] Have correct exercise IDs matching the catalog (pull_up not chin_up)
- [ ] Have appropriate sets/reps/duration prescriptions
- [ ] Have proper section labels (warmup/main/core/cooldown)
- [ ] Name each day clearly (no heuristic generation)

*This document is the vision. The immediate work is making the default programs correct and complete.*
