# Epic 15: Party Invitations — Grow Your Adventuring Company

**Status:** planned
**Priority:** High — social growth is the retention engine
**Created:** 2026-06-20

---

## Vision

Growing your party should feel easy and exciting. The invitation flow needs to work across platforms (share link, text, QR), feel on-brand (the rift is calling them), and give the inviter something to gain from growing the party.

---

## Current State

- Groups exist with invite codes
- `/join/[code]` page exists for web join
- No native share flow
- No in-app invite UI that feels integrated
- No reward for successful invitations

---

## Stories

### 15-1: Share Invite Link (Native Share Sheet)

**As a** user who wants to invite a friend,
**I want** to share a link via text/WhatsApp/etc using the native share sheet,
**So that** they can join with one tap.

**Acceptance Criteria:**
- "Invite to Party" button on Arena screen (near party section) and Profile
- Tapping opens native share sheet (Capacitor Share API)
- Share content:
  - Text: "Join my party in Refactor Athletics — the rift needs more warriors. [link]"
  - URL: `https://refactorathletics.com/join/[code]`
- The message adapts per theme:
  - Samurai: "The dojo has an opening. Join the company."
  - Draconic: "The hoard grows. We need another flame."
  - Viking: "The longship has room. Join the raid."
  - Apex: "The pack hunts better in numbers."
  - Athlete: "Join my training group on Refactor Athletics."

### 15-2: QR Code Invite

**As a** user standing next to a friend at the gym,
**I want** to show them a QR code they can scan to join my party,
**So that** we can connect instantly without typing URLs.

**Acceptance Criteria:**
- "Show QR" option on the invite screen or Profile
- Generates a QR code for `https://refactorathletics.com/join/[code]`
- Full-screen display with dark background (easy to scan in any lighting)
- Party name + member count shown above QR
- QR regenerates if invite code changes

### 15-3: Invite Landing Page Polish

**As a** new user arriving via invite link,
**I want** to understand what I'm joining and feel welcomed,
**So that** I'm motivated to sign up and join the party.

**Acceptance Criteria:**
- `/join/[code]` page shows:
  - Party name
  - Inviter's name + tier (e.g., "Ryan · Ronin · PL 9")
  - Number of current members
  - Theme-specific welcome line: "The rift awaits another awakened."
- If not logged in: sign up flow → auto-join party on complete
- If logged in but not in party: one-tap join
- If already in a party: "You're already in a party. Leave to join this one?"

### 15-4: Invite Reward (XP for Growing the Party)

**As a** user who successfully recruited a friend,
**I want** to earn a reward when they join and complete their first workout,
**So that** I'm motivated to grow the party.

**Acceptance Criteria:**
- When an invited user joins the party: +100 XP for the inviter
- When an invited user completes their first workout: +200 XP for the inviter
- Notification to inviter: "[Name] joined your party! +100 XP"
- XP logged to xp_ledger with label "Party Recruit: [name]"
- Max 10 recruit rewards (prevent farming)

### 15-5: Party Size & Composition Display

**As a** party leader or member,
**I want** to see my party's composition (classes/paths represented),
**So that** I know what roles we have and what we're missing.

**Acceptance Criteria:**
- Party section on Arena shows:
  - Member list with: name, tier, path/class, last active
  - Party composition summary: "2 Vanguards, 1 Ranger, 0 Monks"
  - "Invite a Monk to balance your party" prompt if a role is empty
- This ties into the lore: "A Party with a Vanguard + Ranger + Monk covers different rift zones"

---

## Lore Connection

> "The rift responds to collective will. A lone Adventurer can push back one creature at a time. A Party? A Party can challenge the rift itself."

- Solo users see: "Your company has 1 member. The rift is strongest against those who fight alone."
- 2-person party: "Two awakened. The creatures notice."
- 3+: "The company grows. The rift trembles."
- Full composition (all classes): "A balanced company. The rift has no blind spots to exploit."

---

## Technical Notes

- Native share: `@capacitor/share` plugin (already in the project)
- QR generation: lightweight client-side lib (`qrcode` npm package or canvas-based)
- Invite tracking: add `invited_by` column to `group_members` to track who recruited whom
- Reward trigger: server-side check on group_members insert + first workout detection
