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
