import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Single source of truth for player level + XP.
 * Always reads from xp_ledger (the canonical XP store).
 */
export async function getPlayerLevel(supabase: SupabaseClient, userId: string): Promise<{
  level: number;
  totalXp: number;
  xpInLevel: number;
  xpForNext: number;
}> {
  const { data: ledger } = await supabase
    .from('xp_ledger')
    .select('amount')
    .eq('user_id', userId);

  const totalXp = (ledger || []).reduce((s, r: any) => s + (r.amount || 0), 0);

  // Exponential curve: 1500 × 1.15^level per level
  let level = 1;
  let xpAccum = 0;
  let xpNeeded = 1500;
  while (xpAccum + xpNeeded <= totalXp) {
    xpAccum += xpNeeded;
    level++;
    xpNeeded = Math.round(1500 * Math.pow(1.15, level - 1));
  }

  return {
    level,
    totalXp,
    xpInLevel: totalXp - xpAccum,
    xpForNext: xpNeeded,
  };
}
