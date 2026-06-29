# Legacy System — Player Level Design
**Version:** 1.0 — June 29, 2026
**Author:** Samus Shepard (Game Designer)

---

## Overview

Legacy is the **commitment/engagement metric** — how much you've shown up. It measures total XP earned across all sources and NEVER decays. It is distinct from Power Level (current fitness capability, decays).

**Core metaphor:** Power Level is a MIRROR (reflects current you). Legacy is a MONUMENT (records everything you've ever done). Mirrors can crack. Monuments only grow.

---

## 1. Naming

The underlying system is `player_level`. The display name is themed:

| Theme | Display Name | Level-up toast | Icon |
|-------|-------------|----------------|------|
| Draconic | **Hoard** | "Your hoard grows" | 🔥 |
| Samurai | **Legacy** | "Your legacy deepens" | ⚔️ |
| Viking | **Saga** | "Another verse in your saga" | ᚱ |
| Apex Predator | **Lineage** | "The lineage strengthens" | 🐾 |
| Athlete | **Legacy** | "Your legacy grows" | ★ |
| **Classic mode** | **Consistency** | "Consistency Level X" | ★ |

Spoken as "Hoard 12" or "Saga 7" — the theme word IS the rank type.

---

## 2. Visual Presentation — The Footer Strip

Lives as a compact horizontal row at the BOTTOM of the Power Level PixelBox, separated by a themed accent divider:

```
┌───────────────────────────────────┐
│      [avatar]                     │
│     POWER LV                      │
│       42                          │
│    ▸ PLATINUM ◂                   │
│   ████████░░░  3 to Diamond       │
├────────── accent divider ─────────┤
│ 🔥 Flame 12    ████████░░  67%   │
└───────────────────────────────────┘
```

**Visual rules:**
- Power Level: VERTICAL (stacked, pixel font, big number)
- Devotion: HORIZONTAL (icon + label + level + inline bar, one row)
- Divider uses theme accent color (gold, cherry, ice, amber, white)
- Devotion bar uses WARM amber color (not the tier bar's theme tint)
- Text is `text-[9px]` — smaller than PL. It's a badge, not the hero metric.

---

## 3. XP Curve

`1500 × 1.15^(level-1)` per level (exponential).

Target cadence:
- 1 week: LV 2–3
- 1 month: LV 5–7
- 3 months: LV 10–12
- 1 year: LV 20–25

---

## 4. Motivational Mechanics

### 4a. The Approach (within 15% of leveling)
- Progress bar **pulses** (subtle glow, 2s cycle)
- Text changes from "67%" to **"138 XP to Flame 13"**
- Creature Narrator teases: *"The flame flickers at the edge of eruption..."*
- If one activity would level up → nudge dot on Train tab

### 4b. Level-Up Celebration (full-screen, 1.5s, tap to dismiss)
- Screen darkens
- Pixel emblem grows (small → large animation)
- Theme-colored particles burst
- Haptic bump (native)
- Themed level-up text
- Unlock reveal (if applicable at this level)
- "✨ NEW" shimmer on strip for 24h after

### 4c. XP Micro-feedback
- +XP flyup near Devotion strip on every earn
- Bar fills in real-time with eased animation
- If fill crosses boundary → immediately triggers celebration

### 4d. Daily Ember
First XP earned each day → theme icon "lights up":
- Draconic: flame ignites
- Samurai: blade unsheathes
- Viking: rune glows
- Apex: eye opens
- Athlete: checkmark fills

NOT a streak (no punishment). Just daily acknowledgment: "I showed up."

---

## 5. Milestone Unlocks

Never gate core fitness tracking. Social features gate progressively. Cosmetics are the primary carrot.

| Level | Title | Unlock |
|-------|-------|--------|
| 1 | Recruit | — |
| 3 | Apprentice | 2nd workout program slot |
| 5 | Warrior | Duels unlocked |
| 8 | Proven | Custom workout naming |
| 10 | Veteran | Group challenges |
| 13 | Forged | 2nd theme unlocked |
| 16 | Relentless | Custom challenge creation |
| 20 | Elite | 3rd theme unlocked |
| 25 | Legendary | Group creation + 4th theme |
| 30 | Mythic | All themes + prestige badge |

Every 5 levels = major (title + unlock). In-between levels get lore text only.

Classic mode: same gates, neutral labels ("Consistency 5" not "Warrior"), no lore text.

---

## 6. Implementation Phases

1. **Phase 1 (NOW):** Footer strip + themed naming (solves confusion)
2. **Phase 2:** Level-up celebration screen
3. **Phase 3:** Daily Ember + Narrator hooks
4. **Phase 4:** Milestone restructuring + unlock gates

---

## 7. Technical Notes

- Code: `player_level` remains the field name
- Display name from `themes.ts` or `v2themes.ts`
- XP source: `xp_ledger` table (canonical)
- Level calc: `src/utils/xp.ts` → `xpToLevel()`
- Existing: `src/utils/getPlayerLevel.ts` reads from `xp_ledger`
