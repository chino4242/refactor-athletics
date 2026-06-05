'use client';

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface StarterQuest {
  id: string;
  title: string;
  description: string;
  cta: string;
  ctaHref?: string;
  emoji: string;
  xpReward: number;
  unlocks: string;
}

export interface QuestProgress {
  id: string;
  completed_at: string;
}

const QUEST_DEFINITIONS: StarterQuest[] = [
  { id: 'first_strike', title: 'First Strike', description: 'Log 1 set of any exercise to discover your rank.', cta: 'Start Workout', ctaHref: '/train', emoji: '⚔️', xpReward: 50, unlocks: 'Power Level + Rank system' },
  { id: 'choose_identity', title: 'Choose Your Identity', description: 'Pick a theme that shapes your rank names and visuals.', cta: 'Pick a Theme', emoji: '🎭', xpReward: 0, unlocks: 'Themed ranks + banner' },
  { id: 'fuel_up', title: 'Fuel Up', description: 'Log one meal to start tracking your nutrition.', cta: 'Log a Meal', ctaHref: '/track', emoji: '🍽️', xpReward: 25, unlocks: 'Nutrition tracking' },
  { id: 'daily_discipline', title: 'Daily Discipline', description: 'Log one daily habit — steps, water, sleep, or anything you track.', cta: 'Log a Habit', ctaHref: '/track', emoji: '🎯', xpReward: 25, unlocks: 'Daily Quests panel' },
  { id: 'find_your_path', title: 'Find Your Path', description: 'Choose a training path that determines which exercises build your Power Level.', cta: 'Choose Path', emoji: '🧭', xpReward: 50, unlocks: 'Training path + scheduled programs' },
  { id: 'full_session', title: 'Full Session', description: 'Complete an entire scheduled workout from start to finish.', cta: 'Start Workout', ctaHref: '/train', emoji: '💪', xpReward: 100, unlocks: "Today's Workout card" },
  { id: 'perfect_day', title: 'Perfect Day', description: 'Hit all your daily targets in a single day.', cta: 'View Targets', ctaHref: '/track', emoji: '✨', xpReward: 100, unlocks: 'Streaks + heatmaps' },
  { id: 'join_the_arena', title: 'Join the Arena', description: 'Join a group or start a challenge to compete with others.', cta: 'Open Arena', ctaHref: '/arena', emoji: '🏟️', xpReward: 100, unlocks: 'Arena (full access)' },
];

// Map: feature → quest that unlocks it
const UNLOCK_MAP: Record<string, string> = {
  power_level_header: 'first_strike',
  theme_banner: 'choose_identity',
  nutrition_card: 'fuel_up',
  daily_quests: 'daily_discipline',
  training_path: 'find_your_path',
  today_workout: 'full_session',
  streaks_heatmaps: 'perfect_day',
  arena_tab: 'join_the_arena',
};

export function useStarterQuests(userId: string, initialProgress: QuestProgress[] = []) {
  const [progress, setProgress] = useState<QuestProgress[]>(initialProgress);

  const completedIds = useMemo(() => new Set(progress.map(p => p.id)), [progress]);

  const activeQuest = useMemo(() => {
    return QUEST_DEFINITIONS.find(q => !completedIds.has(q.id)) || null;
  }, [completedIds]);

  const allComplete = completedIds.size >= QUEST_DEFINITIONS.length;

  const isFeatureUnlocked = useCallback((feature: string): boolean => {
    if (allComplete) return true;
    const requiredQuest = UNLOCK_MAP[feature];
    if (!requiredQuest) return true; // no gate
    return completedIds.has(requiredQuest);
  }, [completedIds, allComplete]);

  const isQuestComplete = useCallback((questId: string): boolean => {
    return completedIds.has(questId);
  }, [completedIds]);

  const completeQuest = useCallback(async (questId: string) => {
    if (completedIds.has(questId)) return;
    const newEntry: QuestProgress = { id: questId, completed_at: new Date().toISOString() };
    const updated = [...progress, newEntry];
    setProgress(updated);

    // Persist to DB
    const supabase = createClient();
    await supabase.from('users').update({ starter_quest_progress: updated }).eq('id', userId);
  }, [userId, progress, completedIds]);

  const quests = useMemo(() => {
    return QUEST_DEFINITIONS.map(q => ({
      ...q,
      isComplete: completedIds.has(q.id),
      isActive: activeQuest?.id === q.id,
      completedAt: progress.find(p => p.id === q.id)?.completed_at,
    }));
  }, [completedIds, activeQuest, progress]);

  return { quests, activeQuest, allComplete, isFeatureUnlocked, isQuestComplete, completeQuest };
}

export { QUEST_DEFINITIONS, UNLOCK_MAP };
