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
    .select('challenge_id').eq('user_id', user.id).in('status', ['joined', 'failed', 'completed']);

  const memberIds = (memberships || []).map(m => m.challenge_id);

  // Also find group challenges user can join (in user's groups but not yet a member)
  const { data: userGroups } = await service.from('group_members').select('group_id').eq('user_id', user.id);
  const groupIds = (userGroups || []).map(g => g.group_id);
  let joinable: any[] = [];
  if (groupIds.length > 0) {
    const { data: groupChallenges } = await service.from('challenges_75')
      .select('*, challenge_75_metrics(*), challenge_75_members(id, user_id, status, failed_on, failed_metric)')
      .in('group_id', groupIds)
      .eq('status', 'active');
    joinable = (groupChallenges || []).filter(c => !memberIds.includes(c.id));
  }

  if (!memberships?.length && !joinable.length) return NextResponse.json({ challenges: [], joinable: [] });

  let challenges: any[] = [];
  if (memberIds.length > 0) {
    const { data } = await service.from('challenges_75')
      .select('*, challenge_75_metrics(*), challenge_75_members(id, user_id, status, failed_on, failed_metric)')
      .in('id', memberIds)
      .order('created_at', { ascending: false });
    challenges = data || [];
  }

  // Evaluate yesterday for each active challenge (on-demand)
  const today = new Date().toLocaleDateString('en-CA');
  for (const c of (challenges || []).filter(c => c.status === 'active')) {
    await evaluateChallenge(service, c, user.id, today);
  }

  // Re-fetch after evaluation
  let updated: any[] = [];
  if (memberIds.length > 0) {
    const { data } = await service.from('challenges_75')
      .select('*, challenge_75_metrics(*), challenge_75_members(id, user_id, status, failed_on, failed_metric), challenge_75_days(user_id, date, status, metrics_snapshot, custom_checks)')
      .in('id', memberIds)
      .order('created_at', { ascending: false });
    updated = data || [];
  }

  return NextResponse.json({ challenges: updated, joinable });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { action } = body;
  const service = createServiceClient();

  if (action === 'create') {
    const { title, metrics, start_date, group_id, shared_failure } = body;
    // Create challenge
    const { data: challenge, error } = await service.from('challenges_75').insert({
      creator_id: user.id,
      title: title || '75 Day Challenge',
      start_date: start_date || new Date().toLocaleDateString('en-CA'),
      group_id: group_id || null,
      shared_failure: shared_failure || false,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Creator auto-joins
    const { data: membership } = await service.from('challenge_75_members').insert({
      challenge_id: challenge.id, user_id: user.id,
    }).select().single();

    // Insert metrics linked to creator's membership
    if (metrics?.length && membership) {
      await service.from('challenge_75_metrics').insert(
        metrics.map((m: any, i: number) => ({
          challenge_id: challenge.id,
          member_id: membership.id,
          metric_type: m.type,
          metric_id: m.id,
          label: m.label,
          minimum: m.minimum || null,
          sort_order: i,
        }))
      );
    }

    return NextResponse.json({ challenge });
  }

  if (action === 'join') {
    const { challenge_id, metrics } = body;
    const { data: membership } = await service.from('challenge_75_members').upsert({
      challenge_id, user_id: user.id, status: 'joined',
    }, { onConflict: 'challenge_id,user_id' }).select().single();

    if (membership) {
      if (metrics?.length) {
        // Use provided metrics
        await service.from('challenge_75_metrics').insert(
          metrics.map((m: any, i: number) => ({
            challenge_id,
            member_id: membership.id,
            metric_type: m.type,
            metric_id: m.id,
            label: m.label,
            minimum: m.minimum || null,
            sort_order: i,
          }))
        );
      } else {
        // Copy creator's metrics as defaults
        const { data: creatorMember } = await service.from('challenge_75_members')
          .select('id').eq('challenge_id', challenge_id).neq('user_id', user.id).limit(1).single();
        if (creatorMember) {
          const { data: creatorMetrics } = await service.from('challenge_75_metrics')
            .select('*').eq('challenge_id', challenge_id).eq('member_id', creatorMember.id);
          if (creatorMetrics?.length) {
            await service.from('challenge_75_metrics').insert(
              creatorMetrics.map((m: any) => ({
                challenge_id,
                member_id: membership.id,
                metric_type: m.metric_type,
                metric_id: m.metric_id,
                label: m.label,
                minimum: m.minimum,
                sort_order: m.sort_order,
              }))
            );
          }
        }
      }
    }
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

    // Reset only this user's membership status
    await service.from('challenge_75_members').update({
      status: 'joined', failed_on: null, failed_metric: null,
    }).eq('challenge_id', challenge_id).eq('user_id', user.id);

    // Clear only this user's day records
    await service.from('challenge_75_days').delete().eq('challenge_id', challenge_id).eq('user_id', user.id);

    // Update challenge start_date to today (for this user's fresh start)
    await service.from('challenges_75').update({
      start_date: today, status: 'active', failed_on: null, failed_by: null, failed_metric: null, completed_at: null,
    }).eq('id', challenge_id);

    return NextResponse.json({ success: true });
  }

  if (action === 'nudge') {
    // For beta: just return success (visual indicator handled client-side)
    return NextResponse.json({ success: true });
  }

  if (action === 'update_target') {
    const { metric_db_id, minimum } = body;
    await service.from('challenge_75_metrics').update({ minimum }).eq('id', metric_db_id);
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

  // Get this member's metrics (per-member first, fall back to shared/challenge-level)
  const { data: membership } = await service.from('challenge_75_members')
    .select('id, status, failed_on')
    .eq('challenge_id', challenge.id).eq('user_id', userId).single();

  if (!membership || membership.status === 'failed') return;

  let metrics = [];
  if (membership) {
    const { data: memberMetrics } = await service.from('challenge_75_metrics')
      .select('*').eq('challenge_id', challenge.id).eq('member_id', membership.id);
    if (memberMetrics?.length) {
      metrics = memberMetrics;
    } else {
      // Fall back to shared metrics (legacy: member_id is null)
      const { data: sharedMetrics } = await service.from('challenge_75_metrics')
        .select('*').eq('challenge_id', challenge.id).is('member_id', null);
      metrics = sharedMetrics || [];
    }
  }

  if (metrics.length === 0) return;

  let d = new Date(startDate);

  while (d <= yesterday) {
    const dateStr = d.toLocaleDateString('en-CA');
    if (!evaluatedDates.has(dateStr)) {
      const result = await evaluateDay(service, challenge.id, userId, dateStr, metrics);
      if (!result.passed) {
        // Mark this member as failed
        await service.from('challenge_75_members').update({
          status: 'failed', failed_on: dateStr, failed_metric: result.failedMetric,
        }).eq('id', membership.id);

        // If shared_failure enabled, fail ALL members
        if (challenge.shared_failure) {
          await service.from('challenge_75_members').update({
            status: 'failed', failed_on: dateStr, failed_metric: `${result.failedMetric} (by group member)`,
          }).eq('challenge_id', challenge.id).neq('id', membership.id);
          await service.from('challenges_75').update({
            status: 'failed', failed_on: dateStr, failed_by: userId, failed_metric: result.failedMetric,
          }).eq('id', challenge.id);
        }
        return;
      }
    }
    d.setDate(d.getDate() + 1);
  }

  // Check if 75 days completed for this member
  const dayCount = Math.floor((todayDate.getTime() - startDate.getTime()) / 86400000);
  if (dayCount >= 75) {
    await service.from('challenge_75_members').update({
      status: 'completed',
    }).eq('id', membership.id);
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
