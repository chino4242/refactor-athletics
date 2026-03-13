#!/bin/bash

# Script to create GitHub issues from STORY_MAP.md
# Organizes by milestones (MVP, V2, Future) and labels (backbone activities)

REPO="chino4242/refactor-athletics"

echo "Creating milestones..."
gh milestone create "MVP - Core Experience" --repo $REPO --description "Functional tracker with basic RPG elements" 2>/dev/null || echo "MVP milestone exists"
gh milestone create "V2 - Enhanced RPG" --repo $REPO --description "Richer story and deeper social features" 2>/dev/null || echo "V2 milestone exists"
gh milestone create "Future - Full RPG" --repo $REPO --description "Deep immersion and community features" 2>/dev/null || echo "Future milestone exists"

echo "Creating labels..."
gh label create "onboard" --color "0E8A16" --description "Discover & Onboard" --repo $REPO 2>/dev/null || echo "onboard label exists"
gh label create "character" --color "1D76DB" --description "Build Character" --repo $REPO 2>/dev/null || echo "character label exists"
gh label create "training" --color "5319E7" --description "Program Training" --repo $REPO 2>/dev/null || echo "training label exists"
gh label create "tracking" --color "D93F0B" --description "Track Daily" --repo $REPO 2>/dev/null || echo "tracking label exists"
gh label create "progression" --color "FBCA04" --description "Grow Stronger" --repo $REPO 2>/dev/null || echo "progression label exists"
gh label create "party" --color "0052CC" --description "Join Party" --repo $REPO 2>/dev/null || echo "party label exists"
gh label create "story" --color "C5DEF5" --description "Experience Story" --repo $REPO 2>/dev/null || echo "story label exists"
gh label create "combat" --color "B60205" --description "Battle Together" --repo $REPO 2>/dev/null || echo "combat label exists"
gh label create "compete" --color "F9D0C4" --description "Compete" --repo $REPO 2>/dev/null || echo "compete label exists"

echo ""
echo "Creating MVP issues..."

# 1. Discover & Onboard
gh issue create --repo $REPO --title "Display and track waiver acceptance" --body "Users must view and sign a waiver during onboarding. Track acceptance in database." --label "onboard" --milestone "MVP - Core Experience"

# 2. Build Character
gh issue create --repo $REPO --title "Implement preset path selection (Hybrid, Strength, Endurance, Mobility)" --body "Allow users to choose from 4 preset training paths during character creation. Each path determines which exercises contribute to Power Level." --label "character" --milestone "MVP - Core Experience"

gh issue create --repo $REPO --title "Display exercises that contribute to Power Level for chosen path" --body "Show users which exercises will count toward their Power Level based on their selected path." --label "character" --milestone "MVP - Core Experience"

gh issue create --repo $REPO --title "Basic avatar customization" --body "Allow users to customize their character's appearance (basic options)." --label "character" --milestone "MVP - Core Experience"

# 4. Track Daily
gh issue create --repo $REPO --title "Track personal records (PRs) per exercise" --body "Automatically detect and store personal records for each exercise. Show PR indicators when logging workouts." --label "tracking" --milestone "MVP - Core Experience"

gh issue create --repo $REPO --title "Track habit streaks (no alcohol, no vice, etc.)" --body "Calculate and display consecutive days for positive habits like avoiding alcohol and vice." --label "tracking" --milestone "MVP - Core Experience"

# 5. Grow Stronger
gh issue create --repo $REPO --title "Create PRs dashboard" --body "Build a view showing all personal records with dates achieved and progress over time." --label "progression" --milestone "MVP - Core Experience"

gh issue create --repo $REPO --title "Implement organic stat growth (STR/END/PWR/MOB)" --body "Calculate character stats based on exercise types performed and muscle groups targeted. Display on attribute balance radar." --label "progression" --milestone "MVP - Core Experience"

# 6. Join Party
gh issue create --repo $REPO --title "Create party system - database schema" --body "Design and implement database tables for parties (party, party_members, party_invites)." --label "party" --milestone "MVP - Core Experience"

gh issue create --repo $REPO --title "Create party UI" --body "Build interface to create a party, set party name, and view party details." --label "party" --milestone "MVP - Core Experience"

gh issue create --repo $REPO --title "Implement party invitations" --body "Allow users to invite friends to party and accept/decline invitations." --label "party" --milestone "MVP - Core Experience"

gh issue create --repo $REPO --title "Display party members and stats" --body "Show list of party members with their levels, Power Levels, and combined party stats." --label "party" --milestone "MVP - Core Experience"

# 7. Experience Story
gh issue create --repo $REPO --title "Design story structure and chapters" --body "Plan the linear narrative structure, chapter progression, and story content." --label "story" --milestone "MVP - Core Experience"

gh issue create --repo $REPO --title "Build story viewer UI" --body "Create interface to display story chapters with text-based narrative." --label "story" --milestone "MVP - Core Experience"

gh issue create --repo $REPO --title "Implement story progression system" --body "Track user's current chapter and unlock next chapters based on level or completion." --label "story" --milestone "MVP - Core Experience"

# 8. Battle Together
gh issue create --repo $REPO --title "Design weekly encounter system" --body "Plan encounter structure, enemy types, rewards, and scheduling (weekly reset)." --label "combat" --milestone "MVP - Core Experience"

gh issue create --repo $REPO --title "Build encounter UI" --body "Create interface to view available encounters and join with party." --label "combat" --milestone "MVP - Core Experience"

gh issue create --repo $REPO --title "Implement basic combat mechanics" --body "Build simple combat system (turn-based or auto-resolve) with character stats affecting outcomes." --label "combat" --milestone "MVP - Core Experience"

gh issue create --repo $REPO --title "Add encounter rewards system" --body "Award bonus XP and special items for completing encounters. Track in database." --label "combat" --milestone "MVP - Core Experience"

echo ""
echo "Creating V2 issues..."

# 2. Build Character
gh issue create --repo $REPO --title "Implement custom path creation" --body "Allow users to create custom paths by selecting which exercises contribute to their Power Level." --label "character" --milestone "V2 - Enhanced RPG"

gh issue create --repo $REPO --title "Advanced avatar customization" --body "Expand character customization with more options (gear, colors, accessories)." --label "character" --milestone "V2 - Enhanced RPG"

gh issue create --repo $REPO --title "Add character naming" --body "Allow users to name their character during creation." --label "character" --milestone "V2 - Enhanced RPG"

# 4. Track Daily
gh issue create --repo $REPO --title "Build active workout timer" --body "Create in-workout timer with exercise list, rest timers, and set tracking." --label "tracking" --milestone "V2 - Enhanced RPG"

gh issue create --repo $REPO --title "Improve screenshot auto-log" --body "Enhance Claude AI integration for better workout parsing from screenshots." --label "tracking" --milestone "V2 - Enhanced RPG"

# 5. Grow Stronger
gh issue create --repo $REPO --title "Implement ability unlock system" --body "Create abilities that unlock at certain levels and can be used in combat." --label "progression" --milestone "V2 - Enhanced RPG"

gh issue create --repo $REPO --title "Build gear unlock system" --body "Allow users to unlock cosmetic gear through achievements and progression." --label "progression" --milestone "V2 - Enhanced RPG"

gh issue create --repo $REPO --title "Add PR celebration animations" --body "Create visual celebrations when users achieve new personal records." --label "progression" --milestone "V2 - Enhanced RPG"

# 6. Join Party
gh issue create --repo $REPO --title "Add party chat/messaging" --body "Implement in-app messaging for party members." --label "party" --milestone "V2 - Enhanced RPG"

gh issue create --repo $REPO --title "Display combined party stats" --body "Show aggregated stats for the entire party (total Power Level, combined XP, etc.)." --label "party" --milestone "V2 - Enhanced RPG"

gh issue create --repo $REPO --title "Implement party achievements" --body "Create achievements that parties can earn together." --label "party" --milestone "V2 - Enhanced RPG"

# 7. Experience Story
gh issue create --repo $REPO --title "Integrate AI Game Master (Anthropic)" --body "Use Anthropic API to generate dynamic narrative content and responses." --label "story" --milestone "V2 - Enhanced RPG"

gh issue create --repo $REPO --title "Expand narrative content" --body "Write richer story chapters with more detail and character development." --label "story" --milestone "V2 - Enhanced RPG"

gh issue create --repo $REPO --title "Add light story branching" --body "Implement simple story choices that affect narrative flavor (not major outcomes)." --label "story" --milestone "V2 - Enhanced RPG"

# 8. Battle Together
gh issue create --repo $REPO --title "Implement D&D-style combat mechanics" --body "Add dice rolls, character stats, and tactical combat system." --label "combat" --milestone "V2 - Enhanced RPG"

gh issue create --repo $REPO --title "Add character abilities to combat" --body "Allow users to use unlocked abilities during encounters." --label "combat" --milestone "V2 - Enhanced RPG"

gh issue create --repo $REPO --title "Build encounter history view" --body "Display past encounters with results, rewards earned, and party performance." --label "combat" --milestone "V2 - Enhanced RPG"

# 9. Compete
gh issue create --repo $REPO --title "Build leaderboards" --body "Create global and friend leaderboards for Power Level, XP, and other metrics." --label "compete" --milestone "V2 - Enhanced RPG"

gh issue create --repo $REPO --title "Implement badges and achievements" --body "Create achievement system with badges for milestones and accomplishments." --label "compete" --milestone "V2 - Enhanced RPG"

gh issue create --repo $REPO --title "Add party vs party battles" --body "Allow parties to challenge each other in competitive encounters." --label "compete" --milestone "V2 - Enhanced RPG"

echo ""
echo "Creating Future issues..."

# 2. Build Character
gh issue create --repo $REPO --title "Full D&D character sheet" --body "Implement complete character sheet with all D&D stats, skills, and attributes." --label "character" --milestone "Future - Full RPG"

gh issue create --repo $REPO --title "Skill trees" --body "Create skill trees for character progression and specialization." --label "character" --milestone "Future - Full RPG"

# 5. Grow Stronger
gh issue create --repo $REPO --title "Equipment with stats" --body "Add gear that provides stat bonuses and affects combat performance." --label "progression" --milestone "Future - Full RPG"

gh issue create --repo $REPO --title "Crafting system" --body "Allow users to craft items and gear using materials earned from encounters." --label "progression" --milestone "Future - Full RPG"

# 7. Experience Story
gh issue create --repo $REPO --title "Branching narratives" --body "Implement major story branches where player choices significantly affect outcomes." --label "story" --milestone "Future - Full RPG"

gh issue create --repo $REPO --title "Multiple story arcs" --body "Create multiple parallel story lines that users can experience." --label "story" --milestone "Future - Full RPG"

gh issue create --repo $REPO --title "Player choices affect outcomes" --body "Build system where choices have lasting consequences on story and character." --label "story" --milestone "Future - Full RPG"

# 8. Battle Together
gh issue create --repo $REPO --title "Boss battles" --body "Create epic boss encounters with unique mechanics and high rewards." --label "combat" --milestone "Future - Full RPG"

gh issue create --repo $REPO --title "Raid-style encounters" --body "Build large-scale encounters requiring multiple parties to complete." --label "combat" --milestone "Future - Full RPG"

gh issue create --repo $REPO --title "Special events" --body "Create limited-time events with unique encounters and exclusive rewards." --label "combat" --milestone "Future - Full RPG"

# 9. Compete
gh issue create --repo $REPO --title "Tournaments" --body "Implement tournament system with brackets and prizes." --label "compete" --milestone "Future - Full RPG"

gh issue create --repo $REPO --title "Seasonal rankings" --body "Create seasonal leaderboards that reset and award special rewards." --label "compete" --milestone "Future - Full RPG"

gh issue create --repo $REPO --title "Guild wars" --body "Build large-scale party vs party competition system." --label "compete" --milestone "Future - Full RPG"

echo ""
echo "✅ All issues created successfully!"
echo "Visit https://github.com/$REPO/issues to view them"
