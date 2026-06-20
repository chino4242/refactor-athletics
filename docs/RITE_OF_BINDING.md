# The Rite of Binding — Weapons + Bestiary Framework

**Created:** 2026-06-20
**Contributors:** Sophia (Storyteller) + Samus Shepard (Game Designer)

---

## Framework Name: The Rite of Binding

### The One-Paragraph Lore

> When the Rift opened, ancient spirits poured into our world — drawn to places where humans push beyond their limits. They are not evil. They are *bored.* Each spirit embodies a physical discipline: the Oni claims dominion over the squat, the Tengu mocks those who cannot pull themselves skyward. They ignore the weak and taunt the middling. But when you forge your Discipline — when your training crystallizes into something undeniable — they notice. They test you. And if you prove worthy, they yield. Not out of defeat, but respect. Bind them to your War Council. Earn their allegiance through iron and sweat. Twelve spirits await. How many will walk with you?

---

## Core Conceit

**Your Discipline (weapon) and its Guardian (creature) are forged from the same source material — your effort.**

Every rep simultaneously levels your weapon AND progresses your creature relationship. You don't manage two systems. You train, and both evolve together. The weapon IS the creature IS your effort.

---

## 1. WEAPONS (Exercises as Disciplines)

| Concept | Game Term | Mechanic |
|---------|-----------|----------|
| Exercise | **Discipline** | The weapon you train with |
| Exercise Rank (0-5) | **Mastery Level** | How sharp your weapon is |
| Rank-up | **Forge** | "You forged your Deadlift to Level 3" |
| Decay/expiration | **Rust** | "Your Bench Press is rusting (expires in 5 days)" |

The weapon IS the exercise. Level 0 = unforged. Level 5 = legendary.

---

## 2. CREATURES (Spirits of the Rift)

### When Does a Creature Join?

**Trigger: First time you reach Level 1 in that exercise.**

- Level 0 → Level 1 is the hardest emotional jump (you go from "never ranked" to "I have a rank")
- If gated higher, most users never get 12 creatures — completionist loop dies
- Level 1 feels earned but achievable

**The moment:** When rank-up fires for Level 1, first-time-only splash: *"The Oni acknowledges your strength. It joins your company."*

### Creature States (3 states, derived from existing data)

| State | Condition | Visual |
|-------|-----------|--------|
| **Unmet** | Exercise at Level 0 (never ranked) | Silhouette / shadow. Locked. |
| **Allied** | Exercise at Level 1+ AND within validity window | Full pixel art, colored, alive. Level badge. |
| **Dormant** | Exercise rank has expired (decay) | Grayed out, eyes closed, "sleeping." |

**Key insight:** "Allied" vs "Dormant" maps 1:1 to the existing decay system. No new timers. No new tracking.

### Creature Level = Weapon Level (Always)

- Your Oni is Level 3 because your Back Squat is Level 3
- If Back Squat decays to 0, the Oni goes Dormant (not deleted — never deleted)
- If you re-rank Back Squat to Level 2, the Oni wakes up at Level 2

Visual scaling:
- LV1 = small, basic (tier 0 sprite)
- LV2-3 = medium, detailed (tier 1 sprite)
- LV4-5 = boss-tier, legendary (tier 2 sprite)

### Can You Lose a Creature?

**No. Never permanently.** Once Allied, the creature is in your bestiary forever. But it CAN go Dormant:
- Shows as gray/sleeping
- Doesn't count toward Active Company count
- The creature's portrait dims

**Lore:** "The creature is still your ally. It's just resting because YOU haven't trained."

---

## 3. THE WAR COUNCIL (Bestiary Screen)

### Narrative Progression by Level

| Rank Level | Spirit State | Narrative Beat |
|---|---|---|
| Level 0 | **Unmet** | The creature watches from the Rift. You can't perceive it yet. |
| Level 1 | **Allied** | It appears. Speaks. *"Huh. You again."* Joins your company. |
| Level 2 | **Intrigued** | It starts showing up. Comments. Trash-talks. |
| Level 3 | **Challenged** | It fights back. Your sets feel harder. It respects the grind. |
| Level 4 | **Yielded** | Full allegiance. It speaks FOR you. Visible in your company. |
| Level 5 | **Bound** | Legendary. Your mastery IS its pride. Full animation. |

### Bestiary Layout (Grid of 12)

```
┌─────────────────────────────────┐
│  COMPANY (7/12 Active)          │
├────┬────┬────┬────┬────┬────────┤
│ 🟢 │ 🟢 │ 🟢 │ 🟢 │ 💤 │ ⬛    │
│ Oni│Teng│Kapp│Fox │Joro│  ???  │
│ L3 │ L2 │ L4 │ L1 │ L2 │       │
├────┼────┼────┼────┼────┼────────┤
│ 🟢 │ 🟢 │ 💤 │ ⬛ │ ⬛ │ ⬛    │
│Thun│Eart│Chai│ ???│ ???│  ???  │
│ L5 │ L1 │ L3 │    │    │       │
└────┴────┴────┴────┴────┴────────┘
```

- 🟢 = Allied (active, within validity window)
- 💤 = Dormant (expired, sleeping)
- ⬛ = Unmet (silhouette, locked)

### This IS the existing X-ray grid — reframed

The ranked exercises grid on Power Level already shows 12 exercises with level badges and color-coded borders. The bestiary is that same grid with creature names instead of exercise names, and the three states applied visually.

---

## 4. INTERACTION WITH TIER SYSTEM

| Tier | Power Level | Typical Company | Identity |
|------|-------------|-----------------|----------|
| Ronin | 0-12 | 1-4 creatures | "A wanderer. Alone. Still earning first respect." |
| Samurai | 13-24 | 4-8 creatures | "A warrior with companions." |
| Daimyo | 25-36 | 7-10 creatures | "Lord of a growing company." |
| Shogun | 37-48 | 10-12 creatures | "Commander of a full company." |
| Legendary Warrior | 49-60 | 12/12 active, LV4-5 | "Your company is the stuff of myth." |

---

## 5. REWARD STRUCTURE

Creatures are primarily **VISUAL + EMOTIONAL**, not stat bonuses.

| Milestone | Reward |
|-----------|--------|
| First creature recruited | Unlock Bestiary view |
| 4 creatures active | Bestiary badge on profile |
| 8 creatures active | Animated bestiary border |
| 12/12 active | **"Full Company"** achievement — group portrait, 500 XP |
| All 12 at Level 5 | **"Legendary Company"** — animated legendary border, profile title |

### Battle Mode Integration

- **Unmet creature**: Normal battle, creature is hostile. Standard yield on set completion.
- **Allied creature**: Creature fights WITH you as sparring partner. "The Oni tests your strength" instead of "Defeat the Oni."
- **Dormant creature**: "The Oni stirs... prove yourself again." Waking has its own mini-celebration.

---

## 6. DECAY BECOMES NARRATIVE

Instead of "your score dropped," it's:

- "The Tengu is getting restless."
- "Your Oni hasn't seen you in weeks. It's starting to drift."
- "The Fox Spirit paces. It misses the chase."

When a creature goes Dormant: "The Oni closes its eyes. It will wait. But not forever."

When you wake one: "The Oni stirs. Its eye opens. 'You're back. About time.'"

---

## 7. THE EMOTIONAL ARC

1. **The Ordinary World**: You're weak. The creatures don't even notice you.
2. **The Call**: You attempt your first exercise. A shape flickers.
3. **Threshold**: You rank up. The creature speaks. *"Oh. Another one."*
4. **Tests & Allies**: Each session is a conversation. Taunts, coaches, goads.
5. **The Ordeal**: Chasing Level 4. *"Earn this."*
6. **The Reward**: It yields. Joins your side. You feel its respect.
7. **The Return**: New creatures see your Council and take you seriously from the start.

---

## 8. DATA MODEL

**No new tables needed.** Everything derives from existing data:

```typescript
interface CreatureState {
  exercise_id: string;
  creature_name: string;
  state: 'unmet' | 'allied' | 'dormant';  // derived from rank validity
  level: number;              // = current exercise rank (0-5)
  first_recruited_at: string; // = first workout where rank >= 1
}
```

States are computed at read-time from existing workouts + decay logic. Optional: `users.bestiary_achievements` (jsonb) for milestone persistence.

---

## 9. IMPLEMENTATION PRIORITY

1. **Bestiary screen** (reframe existing X-ray grid with creature names + states) — core loop
2. **Creature recruitment celebration** (first Level 1 moment) — emotional payoff
3. **Battle Mode framing shift** (allied vs unmet) — reinforce relationship
4. **Dormancy narrative** (decay = creature sleeping, not "score dropped") — emotional stakes
5. **Milestone achievements** (4/8/12 badges) — completionist hook
6. **Level-scaled creature art** (already have 3 tiers per creature) — visual polish

Steps 1-3 are the MVP.

---

## 10. WHAT WE'RE NOT ADDING

- ❌ Creature combat abilities (wrong game)
- ❌ Creature breeding/fusion (scope creep)
- ❌ Creature trading (social complexity)
- ❌ Stat bonuses from creatures (creates min/max pressure)
- ❌ Creature care mechanics (not Tamagotchi)
- ❌ New database tables (everything derives from existing rank data)

---

## 11. FRAMEWORK SUMMARY

| Concept | Name | Function |
|---------|------|----------|
| The system | **The Rite of Binding** | Narrative wrapper for all progression |
| Exercises | **Disciplines** | Weapons forged from effort |
| Creatures | **Spirits of the Rift** | Living embodiments of physical challenge |
| Collection | **The War Council** / **Company** | Your bestiary / creature roster |
| Recruit mechanic | **Yielding** | Spirit joins at Level 1+ |
| Full mastery | **Binding** | Spirit fully allegiant at Level 5 |
| Endgame goal | **Complete the Council** | All 12 spirits active simultaneously |
| Decay narrative | **Dormancy** | "The creature rests. It will wait." |

---

*The beauty: it's one system wearing two masks. The weapon IS the creature IS your effort. You don't manage two progressions. You train, and both evolve together.*
