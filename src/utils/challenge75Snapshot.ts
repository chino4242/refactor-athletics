/**
 * Updates today's metrics_snapshot for the user's active 75-day challenge(s).
 * Called fire-and-forget after habit/workout/nutrition logs.
 */
export async function updateChallenge75Snapshot(supabase: any, userId: string) {
  const today = new Date().toLocaleDateString('en-CA');

  // Find active challenge memberships for this user
  const { data: memberships } = await supabase.from('challenge_75_members')
    .select('id, challenge_id, status')
    .eq('user_id', userId).eq('status', 'joined');

  if (!memberships?.length) return;

  for (const membership of memberships) {
    // Get this member's metrics
    const { data: metrics } = await supabase.from('challenge_75_metrics')
      .select('metric_id, metric_type, label, minimum')
      .eq('challenge_id', membership.challenge_id).eq('member_id', membership.id);

    if (!metrics?.length) continue;

    // Evaluate each metric for today
    const snapshot: Record<string, { value: number; met: boolean }> = {};
    const { data: dayRecord } = await supabase.from('challenge_75_days')
      .select('custom_checks').eq('challenge_id', membership.challenge_id).eq('user_id', userId).eq('date', today).single();
    const customChecks = dayRecord?.custom_checks || {};

    for (const metric of metrics) {
      if (metric.metric_type === 'custom') {
        const checked = customChecks[metric.metric_id] === true;
        snapshot[metric.metric_id] = { value: checked ? 1 : 0, met: checked };
      } else {
        const value = await getMetricValue(supabase, userId, today, metric.metric_id);
        snapshot[metric.metric_id] = { value, met: value >= (metric.minimum || 0) };
      }
    }

    // Only update if row doesn't exist or is still pending (never overwrite passed/failed)
    const { data: existingDay } = await supabase.from('challenge_75_days')
      .select('status').eq('challenge_id', membership.challenge_id).eq('user_id', userId).eq('date', today).single();

    if (!existingDay || existingDay.status === 'pending') {
      await supabase.from('challenge_75_days').upsert({
        challenge_id: membership.challenge_id, user_id: userId, date: today,
        status: 'pending',
        metrics_snapshot: snapshot,
        custom_checks: customChecks,
      }, { onConflict: 'challenge_id,user_id,date' });
    }
  }
}

async function getMetricValue(supabase: any, userId: string, date: string, metricId: string): Promise<number> {
  if (metricId === 'workout_count') {
    const { count } = await supabase.from('workouts').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('date', date);
    return count || 0;
  }
  if (metricId === 'habit_exercise_minutes' || metricId === 'habit_active_minutes' || metricId === 'active_minutes') {
    const { data } = await supabase.from('habit_logs').select('value')
      .eq('user_id', userId).eq('habit_id', 'habit_exercise_minutes').eq('date', date);
    return (data || []).reduce((s: number, r: any) => s + (r.value || 0), 0);
  }
  if (metricId.startsWith('macro_')) {
    const macroType = metricId.replace('macro_', '');
    const { data } = await supabase.from('nutrition_logs').select('amount')
      .eq('user_id', userId).eq('macro_type', macroType).eq('date', date)
      .order('timestamp', { ascending: false }).limit(1);
    return data?.[0]?.amount || 0;
  }
  // Habit metrics
  const { data } = await supabase.from('habit_logs').select('value')
    .eq('user_id', userId).eq('habit_id', metricId).eq('date', date);
  return (data || []).reduce((s: number, r: any) => s + (r.value || 0), 0);
}
