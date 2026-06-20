# Epic 12: Power Level Badge Redesign — Theme-Specific Tiers + Hero Progression

**Status:** planned (thinking phase)
**Priority:** High — core identity, seen daily
**Created:** 2026-06-20

---

## Vision

The Power Level badge should be the user's **identity**, not a scoreboard. Replace generic "Bronze/Silver/Gold" with theme-specific tier names that carry meaning in the world. The tier drives future hero sprite evolution and class-specific weapon visuals.

---

## Tier System (5 tiers × 12 levels each = 60 max)

| Tier | PL Range | Athlete | Draconic | Samurai | Apex Predator | Viking |
|------|----------|---------|----------|---------|---------------|--------|
| 1 | 0-11 | Rookie | Hatchling | Ronin | Fossil | Thrall |
| 2 | 12-23 | Varsity | Whelp | Samurai | Compy | Warrior |
| 3 | 24-35 | All-Star | Drake | Daimyo | Raptor | Berserker |
| 4 | 36-47 | Pro | Wyrm | Shogun | Allosaurus | Jarl |
| 5 | 48-60 | Hall of Fame | Ancient Dragon | Legendary Warrior | T-Rex | Einherjar |

---

## Display Redesign

**Current (demoralizing):**
```
POWER LV 9
▸ BRONZE ◂
PWR 9/60
```

**Proposed (motivational):**
```
POWER LV 9
▸ RONIN ◂

████████████████░░░░░░░
3 more to SAMURAI
```

**Key changes:**
- Kill /60 — never show the global max
- Show progress within current tier (9/12 toward next tier)
- Name the next tier explicitly ("3 more to Samurai")
- The tier name IS the hero text

---

## Future: Hero Sprite Evolution (driven by tier)

| Tier | Samurai Sprite | Weapon (Warden class) |
|------|---------------|----------------------|
| Ronin | Tattered robes, basic katana | Dual tanto |
| Samurai | Full armor, forged blade | Wakizashi pair |
| Daimyo | Ornate armor, legendary weapon | Katana + tanto |
| Shogun | Commanding presence, dual blades | Named blade set |
| Legendary Warrior | God-tier, glowing, divine | Celestial weapon |

---

## Future: Class-Specific Weapons (driven by path)

| Class | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
|-------|--------|--------|--------|--------|--------|
| Vanguard (Strength) | Iron mace | War hammer | Great axe | Volcanic blade | Divine crusher |
| Ranger (Endurance) | Short bow | Longbow | Storm bow | Wind runner | Celestial arc |
| Monk (Mobility) | Wooden staff | Bo | Shakujo | Void staff | Spirit weapon |
| Warden (Hybrid) | Dual tanto | Wakizashi | Katana set | Named blades | Legendary set |

---

## Stories (when ready to build)

### 12-1: Theme-Specific Tier Names
Replace "Bronze/Silver/Gold/Platinum/Diamond" with the theme-specific names from the table above. Display the user's tier name in pixel font on the Power Level hero box.

### 12-2: Tier-Relative Progress Bar
Replace "9/60" with progress within current tier toward next. Show: bar filling (9/12), "3 more to [NEXT TIER NAME]". Kill the global max display.

### 12-3: Tier-Up Celebration
When user crosses a tier threshold (e.g., PL 12 = Samurai), show a full-screen celebration with the new tier name, new identity. Pokémon evolution style.

### 12-4: Hero Sprite (future — depends on character creation)
The tier drives which version of the hero sprite renders. Higher tier = more impressive character. This requires the character creation system (Epic TBD).

### 12-5: Class Weapon Display (future)
Show the user's current class weapon on their profile/hero. Evolves with tier.

---

## Open Questions — RESOLVED

1. ~~Should sub-tiers (divisions) exist?~~ **No.** Too noisy. One tier name per band.
2. ~~Should the frame/border change per tier?~~ **Yes.** Let's see what it looks like.
3. ~~When should the user first learn their tier name?~~ **Onboarding.** Part of the Awakening — "You begin as a Ronin."
4. ~~Should the tier ladder be visible?~~ **Yes, on expand.** Current tier prominent. Tap into ranked exercises → see the ladder with upper tiers grayed out but descriptions visible. Makes it clear the tier is an aggregation of ranked exercises.

---

## Additional Design Decisions

### Lore Integration
When you tap into the ranked exercises grid, the tier ladder should be visible WITH lore:

```
⛩️ YOUR PATH

▸ RONIN (current)
  "A wanderer with a blade. Untested, but willing."

  SAMURAI — PL 12
  "Armor earned through discipline. The rift begins to notice."

  DAIMYO — PL 24
  "A lord of war. Creatures hesitate before engaging."

  SHOGUN — PL 36
  "Commander of the rift. Others follow your path."

  LEGENDARY WARRIOR — PL 48
  "The rift itself bends to your will."
```

Upper tiers: visible but dimmed. Current: highlighted with accent border. This makes it obvious that tier = aggregation of the 12 exercises below.

### Story Reason
*"Your tier reflects the total mastery of your 12 Disciplines. Each exercise you rank up strengthens your standing in the rift. A Ronin has barely begun forging their weapons. A Shogun has forged them all to a terrifying edge."*

This connects: rank exercises → Power Level rises → tier name changes → sprite evolves (future).
