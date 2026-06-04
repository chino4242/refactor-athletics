/**
 * Canonical XP calculation for workout sets.
 * Used by logTrainingAction (server) and useWorkoutSession (client fallback).
 */

interface SetData {
  weight?: number;
  reps?: number;
  duration?: number;
  distance?: number;
}

interface XpOptions {
  bodyweight?: number;
  xpFactor?: number;
  isDuration?: boolean;
}

/** Calculate XP for a single set */
export function calculateSetXp(set: SetData, options: XpOptions = {}): number {
  const { bodyweight = 180, xpFactor = 1, isDuration = false } = options;

  if (isDuration || (set.duration && set.duration > 0)) {
    const durationMins = (set.duration || 0) / 60;
    return Math.floor(durationMins * 8 * xpFactor);
  }

  if (set.distance && set.distance > 0) {
    const estMinutes = (set.distance / 1609.34) * 10;
    return Math.floor(estMinutes * 8 * xpFactor);
  }

  if (set.weight && set.weight > 0 && bodyweight > 0) {
    return Math.floor((set.weight / bodyweight) * (set.reps || 10) * 10 * xpFactor);
  }

  // Bodyweight / reps-only exercises
  return Math.floor((set.reps || 10) * xpFactor);
}

/** Calculate total XP for an array of sets */
export function calculateTotalSetXp(sets: SetData[], options: XpOptions = {}): number {
  return sets.reduce((sum, set) => sum + calculateSetXp(set, options), 0);
}
