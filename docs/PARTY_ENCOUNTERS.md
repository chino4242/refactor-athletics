# Party Encounters — Group Challenges in the Rift

**Created:** 2026-06-20
**Status:** design phase

---

## Philosophy

- The party CHOOSES what to engage with — nothing is mandatory
- Encounters create opportunities for group accountability, not obligations
- Visibility into who did what (traceability), but not framed as competition
- Automatic spawning based on party level — no admin burden on the leader
- The rift offers; the party decides

---

## Encounter Tiers

### 1. Daily Rift Activity (Passive — always running)

**What:** The rift has a "rift energy" meter that fills based on party activity. Every member who trains that day contributes. It's a shared vitality indicator, not a goal to hit.

**Lore:** *"The rift responds to collective will. Today, your company generated [X] combined energy."*

**Mechanic:**
- Sum of party members' daily XP shown on Arena
- No pass/fail — just visibility
- "4/5 members active today" with individual names
- Creates gentle social pressure without demanding anything

**Implementation:** Already partially exists (partner status in campaigns). Extend to show on Arena as a party activity feed.

---

### 2. Weekly Raid (Optional — party chooses to engage)

**What:** A rift creature spawns each Monday, scaled to the party's average Power Level. The party can choose to engage or ignore it.

**Lore:** *"A [creature] has emerged from the rift. It challenges your company. Do you accept?"*

**Mechanic:**
- Auto-spawns Monday based on party avg PL (determines difficulty)
- Party leader (or any member) taps "Accept Challenge" to start
- If NOT accepted: creature lingers, no penalty, disappears Sunday
- If accepted: party has until Sunday to collectively hit the target
- Target types (rotates): total volume, combined distance, collective sessions, combined XP
- Each member's contribution is visible: "Ryan: 40%, Amanda: 35%, Alex: 25%"
- On success: party XP, celebration, raid counter increments ("Raids completed: 7")
- On failure: "The creature retreats. It will return stronger." (no penalty, just narrative)

**Key:** NOT mandatory. The creature appears. The party decides. No guilt for ignoring it.

---

### 3. Monthly Boss (Automatic — spawns, party engages at will)

**What:** A larger entity appears on the 1st of each month. It has multiple "phases" (sub-targets) that the party chips away at over the month.

**Lore:** *"The rift shudders. Something massive stirs. Your company has one moon to weaken it."*

**Mechanic:**
- Auto-spawns based on highest party PL (scales difficulty)
- 2-3 phases, each with a different target type:
  - Phase 1 (Week 1-2): "Weaken" — collective volume target
  - Phase 2 (Week 3): "Expose" — X members must hit a personal PR
  - Phase 3 (Week 4): "Strike" — collective XP target
- Progress visible on Arena with phase indicators
- Each member's contribution tracked and visible
- On completion: meaningful celebration, party milestone badge, bonus XP (200 per member)
- On failure: "It retreats into the deep rift. Another awaits next month."

**Key:** Phases give varied targets so different class types contribute at different times. Vanguards dominate volume, Rangers dominate distance phases, etc.

---

### 4. Seasonal Expedition (Currently: 75-day Campaigns — lore reframe)

**What:** The party embarks on a multi-week journey into unknown rift territory. Daily check-ins keep the expedition moving. This is the existing campaign system with narrative framing.

**Lore:** *"Your company ventures beyond the mapped rift. Every day you train, you push deeper. Fall behind, and the rift reclaims the ground."*

**Mechanic:** Existing campaign system. Daily metrics, shared fate option, milestone celebrations at 25%/50%/75%.

**Reframe only:** No mechanical changes needed. Just wrap existing campaigns in expedition narrative.

---

## Accountability Without Competition

### What's Visible:

- **Party Activity Feed:** "[Ryan] trained today · [Amanda] hasn't yet · [Alex] logged a run"
- **Raid Contributions:** Pie chart or simple percentage breakdown per member
- **Boss Phase Progress:** Who contributed what toward each phase
- **Streak visibility:** Each member's streak shown on party card

### What's NOT Visible / Not Done:

- ❌ No "MVP" or "top contributor" callouts
- ❌ No ranking members against each other
- ❌ No rewards for individual contribution within a group challenge
- ❌ No shaming for low contribution

### The Tone:

Accountability is knowing your party can see whether you showed up. Not being called out.

- "4/5 active today" tells the 5th person everything they need to know
- The nudge button exists for direct, private prompts
- Contribution visibility is informational: "Ryan contributed 820 lbs to the raid" — not "Ryan contributed MORE THAN you"

---

## Spawn Logic

| Encounter | Spawns | Based On | Duration |
|-----------|--------|----------|----------|
| Daily Activity | Always | N/A | Resets daily |
| Weekly Raid | Monday | Party avg PL | Mon-Sun |
| Monthly Boss | 1st of month | Highest party PL | Full month |
| Expedition | Player-created | User choice | 30-75 days |

### Difficulty Scaling (Weekly Raid example):

| Party Avg PL | Raid Target (Volume) |
|-------------|---------------------|
| 0-10 | 5,000 lbs combined |
| 11-20 | 15,000 lbs |
| 21-35 | 35,000 lbs |
| 36-50 | 60,000 lbs |
| 51-60 | 100,000 lbs |

Scales so it's always achievable with full party participation but not trivial.

---

## Creature Design for Raids/Bosses

Weekly raids and monthly bosses have their OWN creatures — distinct from the 12 personal spirits. These are rift-specific threats:

**Weekly Raid Creatures (rotating pool):**
- Theme-generic or theme-specific
- Named: "Rift Warden," "Shadow Gate," "Echo Titan," etc.
- Simple single sprite (no tier variants needed — they only appear once)

**Monthly Bosses:**
- Larger, more dramatic art
- Named with gravitas: "The Hollow King," "Abyssal Serpent," "Stormweaver"
- 3-phase art (one per phase showing damage accumulation)

These are NOT bindable (you don't recruit them). They're environmental threats the party overcomes together. The reward is collective pride + party progress.

---

## Connection to Existing Systems

| Existing Feature | Encounter Integration |
|-----------------|----------------------|
| Guild Quests | → Becomes Weekly Raid |
| Campaigns | → Becomes Seasonal Expedition |
| Bounties | → Personal (unchanged), Raid contributes to bounty "sessions" and "volume" |
| Party Status Strip | → Shows daily activity + current raid progress |
| Nudge | → Directly supports accountability |
| Duel Types | → Separate (1v1 remains personal competition) |

---

## What the Party Decides

The party is never forced into anything:

- **Daily Activity:** Passive. Always visible. No opt-in needed.
- **Weekly Raid:** Must be "Accepted" by someone. Can be ignored.
- **Monthly Boss:** Automatically present. Party engages by training (no explicit accept needed — just shows progress).
- **Expedition:** Created deliberately by a member. Others choose to join.

This means a casual party that just wants accountability gets: daily activity feed + mutual visibility. An engaged party that wants challenge gets: raids + bosses + expeditions.

---

## Open Questions

1. Should raid completion unlock anything beyond XP? (Cosmetic party badge? "Raids survived: 12"?)
2. Should the monthly boss have a name/narrative that connects to the overarching Tournament lore?
3. Should there be a "party level" that increments with completed raids/bosses? (Creates long-term group progression)
4. At what party SIZE do raids unlock? (2 members? 3? Any size?)
