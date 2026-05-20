import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import { stepsToXp } from '@/utils/xp';

const VALID_TYPES = ['steps', 'sleep', 'calories_burned', 'weight', 'day_strain', 'water'] as const;
type SyncType = typeof VALID_TYPES[number];

const HABIT_MAP: Record<string, string> = {
  steps: 'habit_steps',
  sleep: 'habit_sleep',
  calories_burned: 'macro_calories_burned',
  day_strain: 'habit_day_strain',
  water: 'habit_water',
};

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Look up user by sync token
    const { data: user } = await supabase
      .from('users')
      .select('id, bodyweight, timezone')
      .eq('sync_token', token)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Invalid sync token' }, { status: 401 });
    }

    const body = await request.json();

    // Support single item or batch
    const items: { type: SyncType; value: number; date?: string }[] = Array.isArray(body) ? body : [body];

    const results: { type: string; status: string }[] = [];

    for (const item of items) {
      if (!VALID_TYPES.includes(item.type as SyncType)) {
        results.push({ type: item.type, status: `invalid type — use: ${VALID_TYPES.join(', ')}` });
        continue;
      }
      if (typeof item.value !== 'number' || isNaN(item.value)) {
        results.push({ type: item.type, status: 'invalid value — must be a number' });
        continue;
      }

      const dateStr = item.date || new Date().toLocaleDateString('en-CA', { timeZone: user.timezone || 'America/New_York' });
      const ts = Math.floor(new Date(`${dateStr}T12:00:00Z`).getTime() / 1000);

      if (item.type === 'weight') {
        // Upsert body measurement
        const { error } = await supabase
          .from('body_measurements')
          .upsert({
            user_id: user.id,
            date: dateStr,
            weight: item.value,
          }, { onConflict: 'user_id,date' });

        // Also update profile bodyweight
        if (!error) {
          await supabase.from('users').update({ bodyweight: item.value }).eq('id', user.id);
        }

        results.push({ type: 'weight', status: error ? error.message : 'ok' });
      } else if (item.type === 'calories_burned') {
        // Upsert nutrition log for calories_burned
        await supabase
          .from('nutrition_logs')
          .delete()
          .eq('user_id', user.id)
          .eq('date', dateStr)
          .eq('macro_type', 'calories_burned');

        const { error } = await supabase
          .from('nutrition_logs')
          .insert({
            user_id: user.id,
            date: dateStr,
            timestamp: ts,
            macro_type: 'calories_burned',
            amount: item.value,
            xp: 10,
            label: 'Health Sync',
          });

        results.push({ type: item.type, status: error ? error.message : 'ok' });
      } else {
        // Habit log — delete existing for today, then insert
        const habitId = HABIT_MAP[item.type];
        await supabase
          .from('habit_logs')
          .delete()
          .eq('user_id', user.id)
          .eq('habit_id', habitId)
          .eq('date', dateStr);

        let xp = 10;
        if (item.type === 'steps') xp = stepsToXp(item.value);
        else if (item.type === 'sleep') xp = Math.round(item.value * 2);
        else if (item.type === 'water') xp = Math.round(item.value * 0.25);
        else if (item.type === 'day_strain') xp = Math.round(item.value * 3);

        const { error } = await supabase
          .from('habit_logs')
          .insert({
            user_id: user.id,
            habit_id: habitId,
            date: dateStr,
            timestamp: ts,
            value: item.value,
            xp,
          });

        results.push({ type: item.type, status: error ? error.message : 'ok' });
      }
    }

    return NextResponse.json({ synced: results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
