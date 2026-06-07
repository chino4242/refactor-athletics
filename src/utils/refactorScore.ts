/**
 * Refactor Score — composite fitness score (0-100)
 * 
 * Components:
 * - Consistency (30%): % of daily targets hit over rolling 14 days
 * - Training (25%): weekly volume trend + workout frequency
 * - Recovery (20%): sleep + HRV trend + rest days
 * - Nutrition (15%): protein adherence + calorie target adherence
 * - Body Recomp (10%): trending in the right direction
 */

export interface SubScore {
  label: string;
  score: number; // 0-100
  weight: number;
  emoji: string;
  trend: 'up' | 'down' | 'flat';
}

export interface RefactorScoreResult {
  total: number; // 0-100
  subScores: SubScore[];
}

export interface ScoreInputs {
  // Consistency: last 14 days of habit data
  habitDays: { date: string; targetsMet: number; targetsTotal: number }[];
  // Training: this week vs last week
  weeklyVolume: number; // sets × reps × weight
  prevWeekVolume: number;
  workoutsThisWeek: number;
  // Recovery: recent values
  avgSleep: number; // hours, last 7 days
  sleepTarget: number;
  hrvTrend: 'up' | 'down' | 'flat'; // 7-day HRV direction
  restDaysThisWeek: number;
  // Nutrition: last 7 days
  proteinDaysHit: number; // days hitting protein target out of 7
  calorieDaysOnTarget: number; // days within net calorie target
  // Body Recomp: direction
  recompDirection: 'positive' | 'negative' | 'flat'; // are body metrics moving toward goals?
  recompWeeksTracked: number;
}

export function calculateRefactorScore(inputs: ScoreInputs): RefactorScoreResult {
  const consistency = calcConsistency(inputs);
  const training = calcTraining(inputs);
  const recovery = calcRecovery(inputs);
  const nutrition = calcNutrition(inputs);
  const recomp = calcRecomp(inputs);

  const subScores: SubScore[] = [
    { label: 'Consistency', score: consistency.score, weight: 0.30, emoji: '🎯', trend: consistency.trend },
    { label: 'Training', score: training.score, weight: 0.25, emoji: '🏋️', trend: training.trend },
    { label: 'Recovery', score: recovery.score, weight: 0.20, emoji: '😴', trend: recovery.trend },
    { label: 'Nutrition', score: nutrition.score, weight: 0.15, emoji: '🥩', trend: nutrition.trend },
    { label: 'Body Recomp', score: recomp.score, weight: 0.10, emoji: '📐', trend: recomp.trend },
  ];

  const total = Math.round(subScores.reduce((s, sub) => s + sub.score * sub.weight, 0));

  return { total, subScores };
}

function calcConsistency(inputs: ScoreInputs): { score: number; trend: 'up' | 'down' | 'flat' } {
  if (inputs.habitDays.length === 0) return { score: 50, trend: 'flat' };
  const totalMet = inputs.habitDays.reduce((s, d) => s + d.targetsMet, 0);
  const totalPossible = inputs.habitDays.reduce((s, d) => s + d.targetsTotal, 0);
  const pct = totalPossible > 0 ? totalMet / totalPossible : 0;
  // Trend: compare first 7 days vs last 7 days
  const half = Math.floor(inputs.habitDays.length / 2);
  const firstHalf = inputs.habitDays.slice(0, half);
  const secondHalf = inputs.habitDays.slice(half);
  const firstPct = firstHalf.reduce((s, d) => s + d.targetsMet, 0) / Math.max(firstHalf.reduce((s, d) => s + d.targetsTotal, 0), 1);
  const secondPct = secondHalf.reduce((s, d) => s + d.targetsMet, 0) / Math.max(secondHalf.reduce((s, d) => s + d.targetsTotal, 0), 1);
  const trend = secondPct > firstPct + 0.05 ? 'up' : secondPct < firstPct - 0.05 ? 'down' : 'flat';
  return { score: Math.round(pct * 100), trend };
}

function calcTraining(inputs: ScoreInputs): { score: number; trend: 'up' | 'down' | 'flat' } {
  // Score based on workout frequency (3-5/week ideal) + volume trend
  let freqScore = Math.min(inputs.workoutsThisWeek / 4, 1) * 60; // up to 60 pts for frequency
  // Volume trend adds up to 40 pts
  let volScore = 40; // baseline
  if (inputs.prevWeekVolume > 0) {
    const ratio = inputs.weeklyVolume / inputs.prevWeekVolume;
    if (ratio >= 1.0) volScore = 40; // maintaining or growing
    else volScore = Math.round(ratio * 40); // declining
  } else if (inputs.weeklyVolume > 0) {
    volScore = 40;
  } else {
    volScore = 0;
  }
  const score = Math.min(Math.round(freqScore + volScore), 100);
  const trend = inputs.weeklyVolume > inputs.prevWeekVolume * 1.05 ? 'up' : inputs.weeklyVolume < inputs.prevWeekVolume * 0.95 ? 'down' : 'flat';
  return { score, trend };
}

function calcRecovery(inputs: ScoreInputs): { score: number; trend: 'up' | 'down' | 'flat' } {
  // Sleep component (60 pts)
  const sleepPct = Math.min(inputs.avgSleep / inputs.sleepTarget, 1);
  const sleepScore = Math.round(sleepPct * 60);
  // HRV trend (25 pts)
  const hrvScore = inputs.hrvTrend === 'up' ? 25 : inputs.hrvTrend === 'flat' ? 15 : 5;
  // Rest days (15 pts) — 1-2 rest days is ideal
  const restScore = inputs.restDaysThisWeek >= 1 && inputs.restDaysThisWeek <= 3 ? 15 : inputs.restDaysThisWeek === 0 ? 5 : 10;
  return { score: Math.min(sleepScore + hrvScore + restScore, 100), trend: inputs.hrvTrend };
}

function calcNutrition(inputs: ScoreInputs): { score: number; trend: 'up' | 'down' | 'flat' } {
  // Protein adherence (60 pts)
  const proteinScore = Math.round((inputs.proteinDaysHit / 7) * 60);
  // Calorie target adherence (40 pts)
  const calorieScore = Math.round((inputs.calorieDaysOnTarget / 7) * 40);
  const score = Math.min(proteinScore + calorieScore, 100);
  const trend = inputs.proteinDaysHit >= 5 ? 'up' : inputs.proteinDaysHit >= 3 ? 'flat' : 'down';
  return { score, trend };
}

function calcRecomp(inputs: ScoreInputs): { score: number; trend: 'up' | 'down' | 'flat' } {
  if (inputs.recompWeeksTracked < 2) return { score: 50, trend: 'flat' }; // not enough data
  const score = inputs.recompDirection === 'positive' ? 80 : inputs.recompDirection === 'flat' ? 50 : 20;
  const trend = inputs.recompDirection === 'positive' ? 'up' : inputs.recompDirection === 'negative' ? 'down' : 'flat';
  return { score, trend };
}

/** Daily Power-Up: deterministic "random" habit gets 2x XP */
export function getDailyPowerUp(date: string): string {
  const POWER_UP_HABITS = ['habit_steps', 'habit_sleep', 'habit_water', 'macro_protein', 'habit_mobility', 'habit_exercise_minutes'];
  // Simple hash of date string
  let hash = 0;
  for (let i = 0; i < date.length; i++) hash = ((hash << 5) - hash) + date.charCodeAt(i);
  return POWER_UP_HABITS[Math.abs(hash) % POWER_UP_HABITS.length];
}

/** Map habit ID to display label for power-up */
export function getPowerUpLabel(habitId: string): { emoji: string; label: string } {
  const map: Record<string, { emoji: string; label: string }> = {
    habit_steps: { emoji: '👟', label: 'Steps' },
    habit_sleep: { emoji: '😴', label: 'Sleep' },
    habit_water: { emoji: '💧', label: 'Water' },
    macro_protein: { emoji: '🥩', label: 'Protein' },
    habit_mobility: { emoji: '🧘', label: 'Mobility' },
    habit_exercise_minutes: { emoji: '🏃', label: 'Active Minutes' },
  };
  return map[habitId] || { emoji: '⚡', label: habitId };
}
