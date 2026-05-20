export interface LevelReward {
  level: number;
  title?: string;
  unlock_type?: 'feature' | 'slot' | 'theme' | 'preview';
  unlock_id?: string;
  unlock_label?: string;
  lore_text: string;
  version_gate?: 'v2' | 'v3';
}

export const LEVEL_REWARDS: LevelReward[] = [
  { level: 1, title: 'Recruit', lore_text: 'Every legend starts with a single rep.' },
  { level: 2, lore_text: 'The path reveals itself to those who move.' },
  { level: 3, title: 'Apprentice', unlock_type: 'slot', unlock_id: 'habit_slot_4', unlock_label: '4th habit slot', lore_text: 'Your discipline draws attention.' },
  { level: 4, lore_text: 'Small gains compound into something unstoppable.' },
  { level: 5, title: 'Warrior', unlock_type: 'feature', unlock_id: 'duels', unlock_label: 'Duels unlocked', lore_text: "You've earned the right to challenge others." },
  { level: 6, lore_text: 'The iron remembers your name.' },
  { level: 7, title: 'Proven', unlock_type: 'slot', unlock_id: 'habit_slot_5', unlock_label: '5th habit slot', lore_text: 'Consistency forged in iron.' },
  { level: 8, unlock_type: 'feature', unlock_id: 'custom_program_name', unlock_label: 'Custom workout naming', lore_text: 'Your training takes shape.' },
  { level: 9, lore_text: 'Others quit here. You did not.' },
  { level: 10, title: 'Veteran', unlock_type: 'feature', unlock_id: 'group_challenges', unlock_label: 'Group challenges unlocked', lore_text: 'Others look to you. Lead them.' },
  { level: 11, lore_text: 'The grind is invisible to everyone but you.' },
  { level: 12, unlock_type: 'slot', unlock_id: 'habit_slot_6', unlock_label: '6th habit slot', lore_text: 'The body adapts. The mind sharpens.' },
  { level: 13, lore_text: 'You are becoming something they cannot ignore.' },
  { level: 14, lore_text: 'Discipline is choosing between what you want now and what you want most.' },
  { level: 15, title: 'Champion', unlock_type: 'theme', unlock_id: 'theme_2', unlock_label: '2nd theme unlocked', lore_text: 'A new identity awaits the worthy.' },
  { level: 16, lore_text: 'Your reputation precedes you.' },
  { level: 17, lore_text: 'The weight feels lighter. You are not.' },
  { level: 18, unlock_type: 'feature', unlock_id: 'custom_challenges', unlock_label: 'Create custom challenges', lore_text: 'You write your own trials now.' },
  { level: 19, lore_text: 'They said it was impossible. You said nothing and kept going.' },
  { level: 20, title: 'Elite', unlock_type: 'theme', unlock_id: 'theme_3', unlock_label: '3rd theme unlocked', lore_text: 'Few reach this summit. Fewer stay.' },
  { level: 21, lore_text: 'Your presence changes the energy of the room.' },
  { level: 22, unlock_type: 'slot', unlock_id: 'habit_slot_7', unlock_label: '7th habit slot', lore_text: 'The grind is the glory.' },
  { level: 23, lore_text: 'You have outlasted doubt itself.' },
  { level: 24, lore_text: 'The old you would not recognize what you have become.' },
  { level: 25, title: 'Legendary', unlock_type: 'feature', unlock_id: 'group_creation', unlock_label: 'Group creation unlocked', lore_text: 'Your name echoes in the halls.' },
  { level: 26, lore_text: 'Legends are not born. They are forged, one day at a time.' },
  { level: 27, unlock_type: 'preview', unlock_id: 'gear_slot', unlock_label: 'Gear Slot', lore_text: 'Something stirs... a forge awaits.', version_gate: 'v2' },
  { level: 28, unlock_type: 'preview', unlock_id: 'story_chapter_1', unlock_label: 'Story Chapter 1', lore_text: 'The Game Master watches.', version_gate: 'v3' },
  { level: 29, lore_text: 'You stand at the threshold of myth.' },
  { level: 30, title: 'Mythic', unlock_type: 'theme', unlock_id: 'all_themes', unlock_label: 'All themes unlocked', lore_text: 'You are no longer a player. You are a legend.' },
];

/** Get the reward for a specific level */
export function getRewardForLevel(level: number): LevelReward | undefined {
  return LEVEL_REWARDS.find(r => r.level === level);
}

/** Get the current title for a given level (highest title earned) */
export function getTitleForLevel(level: number): string {
  for (let i = LEVEL_REWARDS.length - 1; i >= 0; i--) {
    if (LEVEL_REWARDS[i].level <= level && LEVEL_REWARDS[i].title) {
      return LEVEL_REWARDS[i].title!;
    }
  }
  return 'Recruit';
}

/** Get all unlocks earned up to a given level */
export function getUnlocksForLevel(level: number): LevelReward[] {
  return LEVEL_REWARDS.filter(r => r.level <= level && r.unlock_type && r.unlock_type !== 'preview');
}

/** Check if a feature is unlocked at the given player level */
export function isFeatureUnlocked(featureId: string, playerLevel: number): boolean {
  const reward = LEVEL_REWARDS.find(r => r.unlock_id === featureId);
  if (!reward) return true; // ungated features are always available
  return playerLevel >= reward.level;
}

/** Get the level required to unlock a feature */
export function getLevelRequirement(featureId: string): number | null {
  const reward = LEVEL_REWARDS.find(r => r.unlock_id === featureId);
  return reward ? reward.level : null;
}
