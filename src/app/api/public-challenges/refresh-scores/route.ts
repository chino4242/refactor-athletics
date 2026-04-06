import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const { challenge_id } = await request.json();
  if (!challenge_id) return NextResponse.json({ error: 'challenge_id required' }, { status: 400 });

  const supabase = await createClient();

  const { data: challenge } = await supabase
    .from('public_challenges')
    .select('*, public_challenge_participants(*)')
    .eq('id', challenge_id)
    .single();

  if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const participants = challenge.public_challenge_participants || [];
  if (!participants.length) return NextResponse.json({ success: true });

  const startDate = challenge.start_date;
  const endDate = challenge.end_date;
  // Convert dates to unix timestamps for habit_logs queries
  const startTs = Math.floor(new Date(startDate + 'T00:00:00').getTime() / 1000);
  const endTs = Math.floor(new Date(endDate + 'T23:59:59').getTime() / 1000);

  for (const p of participants) {
    let score = 0;

    if (challenge.metric === 'steps') {
      const { data } = await supabase
        .from('habit_logs')
        .select('value')
        .eq('user_id', p.user_id)
        .eq('habit_id', 'habit_steps')
        .gte('timestamp', startTs)
        .lte('timestamp', endTs);
      score = (data || []).reduce((sum: number, r: any) => sum + (Number(r.value) || 0), 0);

    } else if (challenge.metric === 'active_minutes') {
      const { data } = await supabase
        .from('habit_logs')
        .select('value')
        .eq('user_id', p.user_id)
        .eq('habit_id', 'habit_exercise_minutes')
        .gte('timestamp', startTs)
        .lte('timestamp', endTs);
      score = (data || []).reduce((sum: number, r: any) => sum + (Number(r.value) || 0), 0);

    } else if (challenge.metric === 'workouts') {
      const { count } = await supabase
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', p.user_id)
        .gte('date', startDate)
        .lte('date', endDate);
      score = count || 0;

    } else if (challenge.metric === 'water_days') {
      const { data } = await supabase
        .from('habit_logs')
        .select('date')
        .eq('user_id', p.user_id)
        .eq('habit_id', 'habit_water')
        .gte('timestamp', startTs)
        .lte('timestamp', endTs);
      // Count distinct dates where water was logged
      const uniqueDates = new Set((data || []).map((r: any) => r.date));
      score = uniqueDates.size;
    }

    // Update participant score
    await supabase
      .from('public_challenge_participants')
      .update({ score })
      .eq('id', p.id);
  }

  return NextResponse.json({ success: true });
}
