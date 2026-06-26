/** Tiered decay XP for steps — rewards baseline habit, diminishes at high volumes */
export function stepsToXp(steps: number): number {
  let xp = 0;
  if (steps <= 5000) return Math.round(steps * 0.005);
  xp += 25; // first 5k
  if (steps <= 10000) return xp + Math.round((steps - 5000) * 0.003);
  xp += 15; // 5k–10k
  if (steps <= 20000) return xp + Math.round((steps - 10000) * 0.001);
  xp += 10; // 10k–20k
  xp += Math.round((steps - 20000) * 0.0005); // 20k+
  return xp;
}

/** Calculate player level from total XP (exponential curve: 1500 × 1.15^level per level) */
export function xpToLevel(totalXp: number): { level: number; progress: number } {
  let cumulative = 0;
  let level = 1;
  while (true) {
    const needed = Math.round(1500 * Math.pow(1.15, level - 1));
    if (cumulative + needed > totalXp) {
      return { level, progress: (totalXp - cumulative) / needed };
    }
    cumulative += needed;
    level++;
  }
}

/** Check if adding xpEarned to current total crosses a level boundary */
export function checkLevelUp(currentTotalXp: number, xpEarned: number): { leveled: boolean; newLevel: number } | null {
  const before = xpToLevel(currentTotalXp);
  const after = xpToLevel(currentTotalXp + xpEarned);
  if (after.level > before.level) {
    return { leveled: true, newLevel: after.level };
  }
  return null;
}

