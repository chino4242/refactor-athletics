'use client';

import type { HistoryItem, CatalogItem } from '@/types';

export interface BlockResult {
  name: string;
  xp_earned: number;
  level: number;
  rank_name: string | null;
  raw_value?: number;
  value?: string;
  hasStandards: boolean;
  isPR: boolean;
  best_set?: string;
  e1rm?: number;
  next_threshold_lbs?: number;
  next_rank_name?: string;
}

export interface WorkoutBlock {
  name: string;
  type: string;
  section?: string;
  exercise_id?: string;
  sets?: number;
  reps_per_set?: number | string;
  reps_list?: (number | null)[];
  rest_seconds?: number;
  xp_value?: number;
  description?: string;
  exercises?: any[];
  intervals?: any[];
  [key: string]: any;
}

export interface Section {
  name: string;
  firstIndex: number;
  count: number;
  indices: number[];
  isDone: boolean;
  preview: string[];
}

export interface ExerciseViewProps {
  block: any;
  blockIndex: number;
  onComplete: (skipped: boolean, exercisesData?: any[], timerXp?: number, distance?: number) => void;
  fullHistory: HistoryItem[];
  catalog: CatalogItem[];
  exerciseSwaps: Record<string, { name: string; catalogItem: CatalogItem }>;
  onSwap: (target: { blockIdx: number; exIdx: number; name: string; swapGroup: string }) => void;
  userProfile: { bodyweight: number; sex: string } | null;
}

export interface TimerViewProps {
  block: any;
  blockIndex: number;
  onComplete: (skipped: boolean, exercisesData?: any[], timerXp?: number, distance?: number) => void;
  engineChoice?: 'hiit' | 'zone2' | null;
}

export interface SupersetViewProps {
  block: any;
  blockIndex: number;
  onComplete: (skipped: boolean, exercisesData?: any[], timerXp?: number, distance?: number) => void;
  fullHistory: HistoryItem[];
  catalog: CatalogItem[];
  exerciseSwaps: Record<string, { name: string; catalogItem: CatalogItem }>;
  onSwap: (target: { blockIdx: number; exIdx: number; name: string; swapGroup: string }) => void;
  userProfile: { bodyweight: number; sex: string } | null;
}

export interface RestTimerBarProps {
  restTime: number;
  totalRest: number;
  onSkip: () => void;
}
