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
  } catch {}

  return xp;
}
