import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const userId = user.id;

  // Delete all user data from all tables
  await Promise.all([
    service.from('workouts').delete().eq('user_id', userId),
    service.from('nutrition_logs').delete().eq('user_id', userId),
    service.from('habit_logs').delete().eq('user_id', userId),
    service.from('body_measurements').delete().eq('user_id', userId),
    service.from('program_blocks').delete().in('workout_id',
      (await service.from('workout_programs').select('id').eq('user_id', userId)).data?.map(p => p.id) || []
    ),
    service.from('workout_programs').delete().eq('user_id', userId),
    service.from('group_members').delete().eq('user_id', userId),
    service.from('duels').delete().or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`),
  ]);

  // Delete user profile
  await service.from('users').delete().eq('id', userId);

  // Delete auth user
  await service.auth.admin.deleteUser(userId);

  return NextResponse.json({ status: 'deleted' });
}
