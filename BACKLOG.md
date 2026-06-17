# V2 Polish Backlog

> Priority: P0 = blocking daily use, P1 = degrades experience, P2 = nice to have

---

## 🐛 Bugs

| # | Issue | Priority | Epic | Status |
|---|-------|----------|------|--------|
| B1 | iOS HealthKit entitlement — new provisioning profile created, needs TestFlight upload + tester verification | P0 | 3 | In progress |
| B2 | Android APK needs rebuild — queryWorkouts fix + takeLast removal not in installed build | P0 | 3 | Ready to build |
| B3 | Exercise sync not firing if steps=0 and calories=0 early in day | P0 | 3 | ✅ Fixed |
| B4 | Exercise type detection wrong (iOS=strings, Android=numeric) | P0 | 3 | ✅ Fixed |
| B5 | Bounty progress 400 error (non-existent `reps` column) | P0 | 2 | ✅ Fixed |
| B6 | Group challenges 406 error (.single() on zero rows) | P1 | 2 | ✅ Fixed |
| B7 | Dead campaign still showing in Arena after failure | P1 | 2 | ✅ Fixed |
| B8 | Workout day title shows program name instead of actual day | P1 | 1 | ✅ Fixed |
| B9 | Anthropic model deprecated (claude-sonnet-4-20250514 → claude-sonnet-4-6) | P0 | 5 | ✅ Fixed |
| B10 | Synced exercises not writing to xp_ledger (invisible XP) | P1 | 3 | ✅ Fixed |
| B11 | HealthSync localStorage mutex could get permanently stuck on crash | P1 | 3 | ✅ Fixed (60s TTL) |

---

## 🔧 Polish & Reliability

| # | Item | Priority | Epic | Status |
|---|------|----------|------|--------|
| P1 | BattleView extraction — split 1200-line file into LiftingCard, CardioCard, DurationCard, VictoryScreen, EnemySprite | P1 | 4 | Open |
| P2 | Epic Boundary Checklist — verify cross-platform, E2E data flow, PostgREST queries before marking done | P1 | All | Open (process) |
| P3 | Integration spikes before building — log native plugin responses, verify schemas | P1 | All | Open (process) |
| P4 | Remove debug health link from ProfileScreen | P2 | 3 | Open |
| P5 | Exercise sync dedup across midnight boundary (start_time-based key) | P1 | 3 | ✅ Done |
| P6 | Permission revocation detection (3 zero-syncs → nudge) | P2 | 3 | ✅ Done |
| P7 | First-sync 7-day backfill for exercises | P2 | 3 | ✅ Done |
| P8 | Duplicate exercise dedup (>80% time overlap) | P2 | 3 | ✅ Done |
| P9 | Duration sanity check (values 0-60 assumed minutes) | P2 | 3 | ✅ Done |
| P10 | Workout day resolution — use computed day+type, not program.name | P1 | 1 | ✅ Done |

---

## ✨ Features — Game Feel

| # | Feature | Priority | Epic | Status |
|---|---------|----------|------|--------|
| F1 | Enemy sprites — complete all 12 Samurai exercises (10 remaining) | P1 | 4 | In progress (2/12) |
| F2 | Attack flash animation — sprite flashes white + shakes on STRIKE | P1 | 4 | Open |
| F3 | Defeat dissolve — sprite fades/shatters on final set | P1 | 4 | Open |
| F4 | Idle breathing animation — subtle scale pulse on sprite between sets | P2 | 4 | Open |
| F5 | Battle narration — one-line text ("The Oni staggers!") on attack/defeat | P2 | 4 | Open |
| F6 | Nutrition Combo — streak counter for consecutive 3+ meal days | P2 | 5 | Open |
| F7 | Bounty Reveal — Monday card-flip animation | P2 | 2 | Open |
| F8 | Rival Shadow — auto-assigned weekly rival from party on PL screen | P2 | 2 | Open |
| F9 | Athlete mode enemy sprites — abstract geometric challenges | P2 | 4 | Open |
| F10 | Other theme bestiaries (Draconic, Viking, Apex) | P2 | 4 | Open |
| F11 | Party crossover wandering encounters (20% chance) | P2 | 4 | Open |

---

## 📱 Native & Deployment

| # | Item | Priority | Epic | Status |
|---|------|----------|------|--------|
| N1 | Upload iOS TestFlight build (new provisioning profile with HealthKit) | P0 | 3 | Ready |
| N2 | Rebuild Android APK and install | P0 | 3 | Ready |
| N3 | Push notifications — streak reminders, challenge updates | P1 | 6 | Open |
| N4 | Haptic feedback — rank-ups, set completions | P2 | 6 | Open |
| N5 | Crash reporting (Sentry) | P1 | 6 | Open |
| N6 | App Store submission — screenshots, metadata, review | P1 | 6 | Open |
| N7 | RevenueCat payments — free vs premium gating | P1 | 6 | Open |

---

## 🏋️ Training & Programs

| # | Item | Priority | Epic | Status |
|---|------|----------|------|--------|
| T1 | Battle visuals for ALL exercise types (not just lifting — cardio, duration, supersets) | P1 | 4 | Open |
| T2 | Training Seasons (12-week periodization) — spec exists, not built | P2 | Future | Spec only |
| T3 | Character creation — spec exists, not building yet | P2 | Future | Spec only |

---

## 📊 XP & Progression Trust

| # | Item | Priority | Epic | Status |
|---|------|----------|------|--------|
| X1 | XP breakdown always traceable — every source visible in daily pill | P1 | 3 | ✅ Done |
| X2 | Sync status indicator — "Synced 2m ago, 3 exercises found" | P1 | 3 | ✅ Done |
| X3 | Synced exercises labeled human-readable ("55 min Yoga (synced)") | P1 | 3 | ✅ Done |
| X4 | Battle Mode XP flows to xp_ledger (currently only synced exercises do) | P2 | 4 | Open |
| X5 | Career XP total on Power Level matches sum of all ledger entries | P2 | 1 | Open |

---

## Next Actions (Immediate)

1. **N1** — Upload iOS TestFlight build (unblocks tester)
2. **N2** — Rebuild Android APK (unblocks your exercise sync)
3. **F1** — Generate remaining 10 Samurai sprites
4. **F2** — Attack flash animation (biggest game feel win for lowest effort)
5. **P1** — BattleView extraction (reduces future bug risk)

---

*Last updated: 2026-06-17*
