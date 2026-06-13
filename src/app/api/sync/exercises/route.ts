import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { processExerciseSessions } from '@/services/exerciseSyncService';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users')
    .select('bodyweight, sex, timezone').eq('id', user.id).single();

  const { exercises } = await request.json();
  if (!exercises?.length) return NextResponse.json({ synced: [] });

  const result = await processExerciseSessions(
    supabase, user.id,
    profile?.bodyweight || 180,
    profile?.sex || 'male',
    profile?.timezone || 'America/New_York',
    exercises
  );

  return NextResponse.json(result);
}
