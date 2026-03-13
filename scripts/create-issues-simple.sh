#!/bin/bash

# Script to create GitHub issues from STORY_MAP.md (without milestones)
# You can add milestones manually in GitHub UI after

REPO="chino4242/refactor-athletics"

echo "Creating labels..."
gh label create "onboard" --color "0E8A16" --description "Epic: Discover & Onboard" --repo $REPO 2>/dev/null || echo "✓ onboard"
gh label create "character" --color "1D76DB" --description "Epic: Build Character" --repo $REPO 2>/dev/null || echo "✓ character"
gh label create "training" --color "5319E7" --description "Epic: Program Training" --repo $REPO 2>/dev/null || echo "✓ training"
gh label create "tracking" --color "D93F0B" --description "Epic: Track Daily" --repo $REPO 2>/dev/null || echo "✓ tracking"
gh label create "progression" --color "FBCA04" --description "Epic: Grow Stronger" --repo $REPO 2>/dev/null || echo "✓ progression"
gh label create "party" --color "0052CC" --description "Epic: Join Party" --repo $REPO 2>/dev/null || echo "✓ party"
gh label create "story" --color "C5DEF5" --description "Epic: Experience Story" --repo $REPO 2>/dev/null || echo "✓ story"
gh label create "combat" --color "B60205" --description "Epic: Battle Together" --repo $REPO 2>/dev/null || echo "✓ combat"
gh label create "compete" --color "F9D0C4" --description "Epic: Compete" --repo $REPO 2>/dev/null || echo "✓ compete"

gh label create "mvp" --color "0E8A16" --description "Release: MVP" --repo $REPO 2>/dev/null || echo "✓ mvp"
gh label create "v2" --color "1D76DB" --description "Release: V2" --repo $REPO 2>/dev/null || echo "✓ v2"
gh label create "future" --color "5319E7" --description "Release: Future" --repo $REPO 2>/dev/null || echo "✓ future"

echo ""
echo "Creating MVP issues..."

# 1. Discover & Onboard
gh issue create --repo $REPO --title "Display and track waiver acceptance" \
  --body "Users must view and sign a waiver during onboarding. Track acceptance in database." \
  --label "onboard,mvp"

# 2. Build Character
gh issue create --repo $REPO --title "Implement preset path selection" \
  --body "Allow users to choose from 4 preset training paths during character creation: Hybrid, Strength, Endurance, Mobility. Each path determines which exercises contribute to Power Level." \
  --label "character,mvp"

gh issue create --repo $REPO --title "Display exercises for chosen path" \
  --body "Show users which exercises will count toward their Power Level based on their selected path." \
  --label "character,mvp"

gh issue create --repo $REPO --title "Basic avatar customization" \
  --body "Allow users to customize their character's appearance (basic options)." \
  --label "character,mvp"

# 4. Track Daily
gh issue create --repo $REPO --title "Track personal records (PRs) per exercise" \
  --body "Automatically detect and store personal records for each exercise. Show PR indicators when logging workouts." \
  --label "tracking,mvp"

gh issue create --repo $REPO --title "Track habit streaks" \
  --body "Calculate and display consecutive days for positive habits like avoiding alcohol and vice." \
  --label "tracking,mvp"

# 5. Grow Stronger
gh issue create --repo $REPO --title "Create PRs dashboard" \
  --body "Build a view showing all personal records with dates achieved and progress over time." \
  --label "progression,mvp"

gh issue create --repo $REPO --title "Implement organic stat growth" \
  --body "Calculate character stats (STR/END/PWR/MOB) based on exercise types performed and muscle groups targeted. Display on attribute balance radar." \
  --label "progression,mvp"

# 6. Join Party
gh issue create --repo $REPO --title "Create party system - database schema" \
  --body "Design and implement database tables for parties (party, party_members, party_invites)." \
  --label "party,mvp"

gh issue create --repo $REPO --title "Create party UI" \
  --body "Build interface to create a party, set party name, and view party details." \
  --label "party,mvp"

gh issue create --repo $REPO --title "Implement party invitations" \
  --body "Allow users to invite friends to party and accept/decline invitations." \
  --label "party,mvp"

gh issue create --repo $REPO --title "Display party members and stats" \
  --body "Show list of party members with their levels, Power Levels, and combined party stats." \
  --label "party,mvp"

# 7. Experience Story
gh issue create --repo $REPO --title "Design story structure and chapters" \
  --body "Plan the linear narrative structure, chapter progression, and story content." \
  --label "story,mvp"

gh issue create --repo $REPO --title "Build story viewer UI" \
  --body "Create interface to display story chapters with text-based narrative." \
  --label "story,mvp"

gh issue create --repo $REPO --title "Implement story progression system" \
  --body "Track user's current chapter and unlock next chapters based on level or completion." \
  --label "story,mvp"

# 8. Battle Together
gh issue create --repo $REPO --title "Design weekly encounter system" \
  --body "Plan encounter structure, enemy types, rewards, and scheduling (weekly reset)." \
  --label "combat,mvp"

gh issue create --repo $REPO --title "Build encounter UI" \
  --body "Create interface to view available encounters and join with party." \
  --label "combat,mvp"

gh issue create --repo $REPO --title "Implement basic combat mechanics" \
  --body "Build simple combat system (turn-based or auto-resolve) with character stats affecting outcomes." \
  --label "combat,mvp"

gh issue create --repo $REPO --title "Add encounter rewards system" \
  --body "Award bonus XP and special items for completing encounters. Track in database." \
  --label "combat,mvp"

echo ""
echo "Creating V2 issues..."

# 2. Build Character
gh issue create --repo $REPO --title "Implement custom path creation" \
  --body "Allow users to create custom paths by selecting which exercises contribute to their Power Level." \
  --label "character,v2"

gh issue create --repo $REPO --title "Advanced avatar customization" \
  --body "Expand character customization with more options (gear, colors, accessories)." \
  --label "character,v2"

gh issue create --repo $REPO --title "Add character naming" \
  --body "Allow users to name their character during creation." \
  --label "character,v2"

# 4. Track Daily
gh issue create --repo $REPO --title "Build active workout timer" \
  --body "Create in-workout timer with exercise list, rest timers, and set tracking." \
  --label "tracking,v2"

gh issue create --repo $REPO --title "Improve screenshot auto-log" \
  --body "Enhance Claude AI integration for better workout parsing from screenshots." \
  --label "tracking,v2"

# 5. Grow Stronger
gh issue create --repo $REPO --title "Implement ability unlock system" \
  --body "Create abilities that unlock at certain levels and can be used in combat." \
  --label "progression,v2"

gh issue create --repo $REPO --title "Build gear unlock system" \
  --body "Allow users to unlock cosmetic gear through achievements and progression." \
  --label "progression,v2"

gh issue create --repo $REPO --title "Add PR celebration animations" \
  --body "Create visual celebrations when users achieve new personal records." \
  --label "progression,v2"

# 6. Join Party
gh issue create --repo $REPO --title "Add party chat/messaging" \
  --body "Implement in-app messaging for party members." \
  --label "party,v2"

gh issue create --repo $REPO --title "Display combined party stats" \
  --body "Show aggregated stats for the entire party (total Power Level, combined XP, etc.)." \
  --label "party,v2"

gh issue create --repo $REPO --title "Implement party achievements" \
  --body "Create achievements that parties can earn together." \
  --label "party,v2"

# 7. Experience Story
gh issue create --repo $REPO --title "Integrate AI Game Master (Anthropic)" \
  --body "Use Anthropic API to generate dynamic narrative content and responses." \
  --label "story,v2"

gh issue create --repo $REPO --title "Expand narrative content" \
  --body "Write richer story chapters with more detail and character development." \
  --label "story,v2"

gh issue create --repo $REPO --title "Add light story branching" \
  --body "Implement simple story choices that affect narrative flavor (not major outcomes)." \
  --label "story,v2"

# 8. Battle Together
gh issue create --repo $REPO --title "Implement D&D-style combat mechanics" \
  --body "Add dice rolls, character stats, and tactical combat system." \
  --label "combat,v2"

gh issue create --repo $REPO --title "Add character abilities to combat" \
  --body "Allow users to use unlocked abilities during encounters." \
  --label "combat,v2"

gh issue create --repo $REPO --title "Build encounter history view" \
  --body "Display past encounters with results, rewards earned, and party performance." \
  --label "combat,v2"

# 9. Compete
gh issue create --repo $REPO --title "Build leaderboards" \
  --body "Create global and friend leaderboards for Power Level, XP, and other metrics." \
  --label "compete,v2"

gh issue create --repo $REPO --title "Implement badges and achievements" \
  --body "Create achievement system with badges for milestones and accomplishments." \
  --label "compete,v2"

gh issue create --repo $REPO --title "Add party vs party battles" \
  --body "Allow parties to challenge each other in competitive encounters." \
  --label "compete,v2"

echo ""
echo "Creating Future issues..."

# 2. Build Character
gh issue create --repo $REPO --title "Full D&D character sheet" \
  --body "Implement complete character sheet with all D&D stats, skills, and attributes." \
  --label "character,future"

gh issue create --repo $REPO --title "Skill trees" \
  --body "Create skill trees for character progression and specialization." \
  --label "character,future"

# 5. Grow Stronger
gh issue create --repo $REPO --title "Equipment with stats" \
  --body "Add gear that provides stat bonuses and affects combat performance." \
  --label "progression,future"

gh issue create --repo $REPO --title "Crafting system" \
  --body "Allow users to craft items and gear using materials earned from encounters." \
  --label "progression,future"

# 7. Experience Story
gh issue create --repo $REPO --title "Branching narratives" \
  --body "Implement major story branches where player choices significantly affect outcomes." \
  --label "story,future"

gh issue create --repo $REPO --title "Multiple story arcs" \
  --body "Create multiple parallel story lines that users can experience." \
  --label "story,future"

gh issue create --repo $REPO --title "Player choices affect outcomes" \
  --body "Build system where choices have lasting consequences on story and character." \
  --label "story,future"

# 8. Battle Together
gh issue create --repo $REPO --title "Boss battles" \
  --body "Create epic boss encounters with unique mechanics and high rewards." \
  --label "combat,future"

gh issue create --repo $REPO --title "Raid-style encounters" \
  --body "Build large-scale encounters requiring multiple parties to complete." \
  --label "combat,future"

gh issue create --repo $REPO --title "Special events" \
  --body "Create limited-time events with unique encounters and exclusive rewards." \
  --label "combat,future"

# 9. Compete
gh issue create --repo $REPO --title "Tournaments" \
  --body "Implement tournament system with brackets and prizes." \
  --label "compete,future"

gh issue create --repo $REPO --title "Seasonal rankings" \
  --body "Create seasonal leaderboards that reset and award special rewards." \
  --label "compete,future"

gh issue create --repo $REPO --title "Guild wars" \
  --body "Build large-scale party vs party competition system." \
  --label "compete,future"

echo ""
echo "✅ All issues created successfully!"
echo ""
echo "Next steps:"
echo "1. Go to https://github.com/$REPO/milestones and create 3 milestones"
echo "2. Create a GitHub Project at https://github.com/chino4242?tab=projects"
echo "3. Add all issues to the project"
echo "4. Bulk assign milestones by filtering issues with 'label:mvp', 'label:v2', 'label:future'"
