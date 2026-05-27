import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();

  // Get all challenges user is a member of
  const { data: memberships } = await service.from('challenge_75_members')
    .select('challenge_id').eq('user_id', user.id).eq('status', 'joined');

  if (!memberships?.length) return NextResponse.json({ challenges: [] });

  const ids = memberships.map(m => m.challenge_id);
  const { data: challenges } = await service.from('challenges_75')
    .select('*, challenge_75_metrics(*), challenge_75_members(user_id, status)')
    .in('id', ids)
    .order('created_at', { ascending: false });

  // Evaluate yesterday for each active challenge (on-demand)
  const today = new Date().toLocaleDateString('en-CA');
  for (const c of (challenges || []).filter(c => c.status === 'active')) {
    await evaluateChallenge(service, c, user.id, today);
  }

  // Re-fetch after evaluation
  const { data: updated } = await service.from('challenges_75')
    .select('*, challenge_75_metrics(*), challenge_75_members(user_id, status), challenge_75_days(user_id, date, status, metrics_snapshot, custom_checks)')
    .in('id', ids)
    .order('created_at', { ascending: false });

  return NextResponse.json({ challenges: updated || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { action } = body;
  const service = createServiceClient();

  if (action === 'create') {
    const { title, metrics, start_date, group_id } = body;
    // Create challenge
    const { data: challenge, error } = await service.from('challenges_75').insert({
      creator_id: user.id,
      title: title || '75 Day Challenge',
      start_date: start_date || new Date().toLocaleDateString('en-CA'),
      group_id: group_id || null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Insert metrics
    if (metrics?.length) {
      await service.from('challenge_75_metrics').insert(
        metrics.map((m: any, i: number) => ({
          challenge_id: challenge.id,
          metric_type: m.type,
          metric_id: m.id,
          label: m.label,
          minimum: m.minimum || null,
          sort_order: i,
        }))
      );
    }

    // Creator auto-joins
    await service.from('challenge_75_members').insert({
      challenge_id: challenge.id, user_id: user.id,
    });

    return NextResponse.json({ challenge });
  }

  if (action === 'join') {
    const { challenge_id } = body;
    await service.from('challenge_75_members').upsert({
      challenge_id, user_id: user.id, status: 'joined',
    }, { onConflict: 'challenge_id,user_id' });
    return NextResponse.json({ success: true });
  }

  if (action === 'check_custom') {
    const { challenge_id, metric_id, checked } = body;
    const today = new Date().toLocaleDateString('en-CA');

    // Upsert today's day record with custom check
    const { data: existing } = await service.from('challenge_75_days')
      .select('id, custom_checks')
      .eq('challenge_id', challenge_id).eq('user_id', user.id).eq('date', today)
      .single();

    const checks = { ...(existing?.custom_checks || {}), [metric_id]: checked };

    if (existing) {
      await service.from('challenge_75_days').update({ custom_checks: checks }).eq('id', existing.id);
    } else {
      await service.from('challenge_75_days').insert({
        challenge_id, user_id: user.id, date: today, custom_checks: checks,
      });
    }
    return NextResponse.json({ success: true });
  }

  if (action === 'restart') {
    const { challenge_id } = body;
    const today = new Date().toLocaleDateString('en-CA');

    // Reset challenge
    await service.from('challenges_75').update({
      status: 'active', start_date: today, failed_on: null, failed_by: null, failed_metric: null, completed_at: null,
    }).eq('id', challenge_id);

    // Clear all day records
    await service.from('challenge_75_days').delete().eq('challenge_id', challenge_id);

    // Reset member statuses
    await service.from('challenge_75_members').update({ status: 'joined' }).eq('challenge_id', challenge_id);

    return NextResponse.json({ success: true });
  }

  if (action === 'nudge') {
    // For beta: just return success (visual indicator handled client-side)
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

async function evaluateChallenge(service: any, challenge: any, userId: string, today: string) {
  const startDate = new Date(challenge.start_date);
  const todayDate = new Date(today);

  // Only evaluate days that have passed (not today)
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);

  if (yesterday < startDate) return; // Challenge hasn't started yet or just started today

  // Check each day from start to yesterday that hasn't been evaluated
  const { data: existingDays } = await service.from('challenge_75_days')
    .select('date, status')
    .eq('challenge_id', challenge.id).eq('user_id', userId);

  const evaluatedDates = new Set((existingDays || []).filter((d: any) => d.status !== 'pending').map((d: any) => d.date));

  const metrics = challenge.challenge_75_metrics || [];
  let d = new Date(startDate);

  while (d <= yesterday) {
    const dateStr = d.toLocaleDateString('en-CA');
    if (!evaluatedDates.has(dateStr)) {
      const result = await evaluateDay(service, challenge.id, userId, dateStr, metrics);
      if (!result.passed) {
        // FAIL — mark challenge and all members as failed
        await service.from('challenges_75').update({
          status: 'failed', failed_on: dateStr, failed_by: userId, failed_metric: result.failedMetric,
        }).eq('id', challenge.id);
        return;
      }
    }
    d.setDate(d.getDate() + 1);
  }

  // Check if 75 days completed
  const dayCount = Math.floor((todayDate.getTime() - startDate.getTime()) / 86400000);
  if (dayCount >= 75 && challenge.status === 'active') {
    await service.from('challenges_75').update({
      status: 'completed', completed_at: new Date().toISOString(),
    }).eq('id', challenge.id);
  }
}

async function evaluateDay(service: any, challengeId: string, userId: string, date: string, metrics: any[]) {
  const snapshot: Record<string, { value: number; met: boolean }> = {};
  let passed = true;
  let failedMetric = '';

  // Get existing custom checks for this day
  const { data: dayRecord } = await service.from('challenge_75_days')
    .select('custom_checks').eq('challenge_id', challengeId).eq('user_id', userId).eq('date', date).single();

  const customChecks = dayRecord?.custom_checks || {};

  for (const metric of metrics) {
    if (metric.metric_type === 'custom') {
      const checked = customChecks[metric.metric_id] === true;
      snapshot[metric.metric_id] = { value: checked ? 1 : 0, met: checked };
      if (!checked) { passed = false; failedMetric = metric.label; }
    } else {
      // App metric — query from habit_logs, workouts, nutrition_logs
      const value = await getMetricValue(service, userId, date, metric.metric_id);
      const met = value >= (metric.minimum || 0);
      snapshot[metric.metric_id] = { value, met };
      if (!met) { passed = false; failedMetric = metric.label; }
    }
  }

  // Upsert day record
  await service.from('challenge_75_days').upsert({
    challenge_id: challengeId, user_id: userId, date,
    status: passed ? 'passed' : 'failed',
    metrics_snapshot: snapshot,
    custom_checks: customChecks,
    evaluated_at: new Date().toISOString(),
  }, { onConflict: 'challenge_id,user_id,date' });

  return { passed, failedMetric };
}

async function getMetricValue(service: any, userId: string, date: string, metricId: string): Promise<number> {
  const startTs = Math.floor(new Date(date + 'T00:00:00').getTime() / 1000);
  const endTs = startTs + 86400;

  if (metricId === 'workout_count') {
    const { count } = await service.from('workouts').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('date', date);
    return count || 0;
  }

  if (metricId.startsWith('macro_')) {
    const macroType = metricId.replace('macro_', '');
    const { data } = await service.from('nutrition_logs').select('amount')
      .eq('user_id', userId).eq('macro_type', macroType).gte('timestamp', startTs).lt('timestamp', endTs);
    return (data || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
  }

  // Habit metrics
  const { data } = await service.from('habit_logs').select('value')
    .eq('user_id', userId).eq('habit_id', metricId).eq('date', date);
  return (data || []).reduce((s: number, r: any) => s + (r.value || 0), 0);
}
