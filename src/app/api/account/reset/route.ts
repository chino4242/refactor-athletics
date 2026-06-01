import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const userId = user.id;

  // Delete all activity data
  await Promise.all([
    service.from('workouts').delete().eq('user_id', userId),
    service.from('nutrition_logs').delete().eq('user_id', userId),
    service.from('habit_logs').delete().eq('user_id', userId),
    service.from('body_measurements').delete().eq('user_id', userId),
    service.from('xp_ledger').delete().eq('user_id', userId),
    service.from('meal_entries').delete().eq('user_id', userId),
    service.from('pending_exercises').delete().eq('user_id', userId),
    service.from('quest_slate').delete().eq('user_id', userId),
    service.from('program_blocks').delete().in('workout_id',
      (await service.from('workout_programs').select('id').eq('user_id', userId)).data?.map(p => p.id) || []
    ),
    service.from('workout_programs').delete().eq('user_id', userId),
    service.from('group_members').delete().eq('user_id', userId),
    service.from('challenge_75_members').delete().eq('user_id', userId),
  ]);

  // Reset user profile to fresh state
  await service.from('users').update({
    is_onboarded: false,
    selected_theme: 'athlete',
    selected_path: null,
    experience_mode: 'rpg',
    available_equipment: [],
    nutrition_targets: {},
    habit_targets: {},
    hidden_habits: [],
    body_composition_goals: {},
    measurement_mode: null,
    bodyweight: null,
    age: null,
    sex: null,
  }).eq('id', userId);

  return NextResponse.json({ status: 'reset' });
}
