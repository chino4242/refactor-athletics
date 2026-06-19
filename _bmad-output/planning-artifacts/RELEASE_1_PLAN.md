# Release 1: "The Complete Day"

**Target:** Build + test before Monday 2026-06-23
**Scope:** 12 stories — daily loop feels complete, all training earns credit

---

## Build Order

| # | Story | Description | Status |
|---|-------|-------------|--------|
| 1 | 11-4 | Daily streak counter | ○ |
| 2 | 11-5 | Campaign progress bar (day X/Y) | ○ |
| 3 | 11-2 | Auto-detect campaign metrics from app data | ○ |
| 4 | 11-3 | Partner status visibility | ○ |
| 5 | 9-3 | Train screen activity log (synced exercises) | ○ |
| 6 | 9-2 | Activity confirmation modal (claim XP) | ○ |
| 7 | 9-4 | Session group credit + bounty integration | ○ |
| 8 | 9-6 | Rank evaluation from synced runs | ○ |
| 9 | 4-8 | Battle narration (creature one-liners) | ○ |
| 10 | 11-10 | End-of-day summary | ○ |
| 11 | 11-6 | Mid-campaign milestones (day 25/50 celebrations) | ○ |
| 12 | 11-7 | Nudge notifications | ○ |

---

## Success Criteria

After this release, a user should:
- See their daily streak and feel motivated to not break it
- See campaign progress (day 34/75) with milestone markers
- Have campaign metrics auto-detect from app data (no redundant taps)
- See their partner's daily status and be able to nudge them
- See synced external activities on Train screen with XP earned
- Confirm and assign activities to session groups
- Get Power Level credit from synced runs (auto-rank evaluation)
- Hear creature personality during Battle Mode (one-liners)
- Get an end-of-day summary when all training is done
- Celebrate mid-campaign milestones (day 25, 50)
- Nudge their partner when they haven't checked in

---

## Dependencies

- Push notifications (story 11-7) may be limited without native infra (Epic 6)
  - Fallback: in-app nudge that shows on partner's next open
- Rank eval (9-6) builds on existing exerciseSyncService.ts
- Activity log (9-3) builds on Epic 7 session groups (just shipped)
- Battle narration (4-8) uses WORLD_LORE.md creature dialogue templates

---

## What's NOT in this release

- Nutrition edit/delete (Epic 10 — Release 2)
- Body composition (Epic 8 — Release 2)
- Bounty reveal animation (11-8 — Release 3)
- App Store submission (Epic 6 — Release 4)
- Background sync (9-7 — Release 4)
- Passive user flow (9-5 — Release 3)
