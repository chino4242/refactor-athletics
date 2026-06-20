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

## Open Questions

1. Should sub-tiers (divisions) exist within each tier? (e.g., "Ronin III" at PL 9)
2. Should the tier frame/border on the Power Level box change color per tier?
3. When should the user first learn their tier name? (Onboarding? First rank-up? First PL screen visit?)
4. Should the tier ladder be visible (showing all 5 names) or just current + next?
