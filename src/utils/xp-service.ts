import { stepsToXp } from './xp';

export type XpEvent =
  | { type: 'steps'; value: number }
  | { type: 'sleep'; value: number }
  | { type: 'water'; value: number }
  | { type: 'nutrition'; entryCount: number }
  | { type: 'workout'; level: number; volumeXp: number }
  | { type: 'meal_prep' }
  | { type: 'habit_binary' }
  | { type: 'habit_other' };

export function calculateXp(event: XpEvent): number {
  switch (event.type) {
    case 'steps': return stepsToXp(event.value);
    case 'sleep': return Math.round(event.value * 2);
    case 'water': return Math.round(event.value * 0.25);
    case 'nutrition': return Math.min(event.entryCount * 2, 30);
    case 'workout': return (Math.min(event.level, 5) > 0 ? event.level * 20 + 30 : 0) + event.volumeXp;
    case 'meal_prep': return 20;
    case 'habit_binary': return 10;
    case 'habit_other': return 15;
  }
}

/** Award XP and write to xp_ledger. Returns actual XP awarded. */
export async function awardXp(
  supabase: any,
  userId: string,
  event: XpEvent,
  label: string,
  isBackground: boolean = false
): Promise<number> {
  const xp = calculateXp(event);
  if (xp <= 0) return 0;

  try {
    // Upsert to xp_ledger (delete old entry for same label today, insert new)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    await supabase.from('xp_ledger').delete()
      .eq('user_id', userId)
      .eq('source_label', label)
      .eq('source_type', event.type === 'workout' ? 'workout' : event.type === 'nutrition' ? 'nutrition' : 'habit')
      .gte('created_at', todayStart.toISOString());

    await supabase.from('xp_ledger').insert({
      user_id: userId,
      amount: xp,
      source_type: event.type === 'workout' ? 'workout' : event.type === 'nutrition' ? 'nutrition' : 'habit',
      source_label: label,
      is_background: isBackground,
    });

    // Check for level-up
    if (!isBackground) {
      const { data: ledger } = await supabase.from('xp_ledger').select('amount').eq('user_id', userId);
      const totalXp = (ledger || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
      const prevXp = totalXp - xp;
      const getLevel = (xp: number) => { let lv = 1, needed = 1500, acc = 0; while (acc + needed <= xp) { acc += needed; lv++; needed = Math.round(1500 * Math.pow(1.15, lv - 1)); } return lv; };
      const prevLevel = getLevel(prevXp);
      const newLevel = getLevel(totalXp);
      if (newLevel > prevLevel) {
        await supabase.from('users').update({ pending_level_up: { from: prevLevel, to: newLevel } }).eq('id', userId);
      }
    }
  } catch {}

  return xp;
}
