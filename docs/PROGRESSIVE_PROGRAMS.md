# Progressive Programs — Design Brief

## Concept
Structured programs that take a user from Point A to Point B over weeks. Clear promise, clear endpoint, creature-narrated progression.

## Opportunities

### Running / Cardio
- **Couch to 5K** — walk/run intervals → continuous 5K (8 weeks)
- **5K to 10K** — build from 30 min to 60 min continuous
- **First Mile** — can't run → 1 mile without stopping (4 weeks)

### Rowing
- **Row Your First 2K** — technique + endurance → complete 2K test
- **Sub-8 2K** — structured plan to break 8:00

### Heart Health / Zone 2
- **Zone 2 Foundation** ★ — build aerobic base from 0 → 150 min/week of Zone 2 (6 weeks)
- **Zone 2 Maintenance** — sustain 150-180 min/week with progressive duration increases
- Uses heart rate data from HealthKit/Health Connect to validate effort
- Any modality: walk, bike, row, elliptical, easy run — user picks
- Key metric: time-in-zone (HR 60-70% of max, or "can hold a conversation" cue)

### Lifting / Strength
- **First Plate** (135lb squat in 8 weeks)
- **First Pull-Up** ★ PROTOTYPE — negatives, band assist, dead hangs → 1 strict pull-up (4 weeks)
- **Bench Your Bodyweight** — systematic progression to 1x BW bench
- **First Muscle-Up** — pull-up mastery → transition → muscle-up

### Bodyweight / Calisthenics
- **Push-Up Progression** — can't do 1 → 20 consecutive
- **Plank to 3 Minutes** — 30s → 3:00 hold
- **Handstand Journey** — wall walks → freestanding hold

### Mobility
- **Touch Your Toes** — hamstring + posterior chain (4 weeks)
- **Full Squat Depth** — ankle + hip mobility → ass-to-grass

### Hybrid
- **Ready for Anything** — run a mile, 10 pull-ups, squat bodyweight
- **Return from Injury** — deload → rebuild baseline (6 weeks)

---

## Why It Fits the App

1. **Rank-up integration** — program endpoint = achieving a rank threshold (First Pull-Up = Level 1 in pull_up)
2. **Creature narrative** — creature goes Unmet → Allied when goal is reached
3. **Daily engagement** — structured reason to open the app
4. **Social** — "I'm on Week 4 of First Pull-Up" is shareable / duel-able
5. **Monetization** — premium programs behind paywall

---

## Prototype: "First Pull-Up" (4 Weeks)

### Structure
- 3 sessions/week, ~15 min each
- Designed to slot INTO an existing training day (supplement, not replace)
- Binary endpoint: 1 strict pull-up

### Week-by-Week

| Week | Focus | Key Exercises |
|------|-------|---------------|
| 1 | Dead hangs + scapular pulls | Dead hang (build to 30s), scapular pull-ups, band-assisted pull-ups |
| 2 | Negatives + rows | Slow negatives (5s descent), inverted rows, band-assisted × 5 |
| 3 | Assisted volume | Lighter band × 8, negatives × 5, dead hang 45s |
| 4 | The attempt | Band singles, negative singles, TEST: 1 strict pull-up |

### Data Model (TBD)
- `type: 'progressive'` on workout_programs
- Week-by-week blocks that auto-advance
- Train screen shows "Week 3 of First Pull-Up"
- Completion triggers creature recruitment celebration

---

## Status
- [ ] Data model design
- [ ] First Pull-Up content
- [ ] Train screen integration
- [ ] Completion → rank/creature trigger
