/** Shared calculation utilities — single source of truth */

/** Epley e1RM formula (capped at 100 reps) */
export function epley(weight: number, reps: number): number {
  return weight * (1 + Math.min(reps, 100) / 30);
}

/** Power Level tier thresholds and tier calculation */
export const TIER_THRESHOLDS = [0, 1, 13, 25, 49, 97];

export function getTier(powerLevel: number): number {
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (powerLevel >= TIER_THRESHOLDS[i]) return i;
  }
  return 0;
}
