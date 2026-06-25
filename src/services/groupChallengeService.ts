import { createClient } from '@/utils/supabase/client';

export type ChallengeMetric = 'volume' | 'sessions' | 'steps' | 'active_minutes';
export type ChallengeStatus = 'proposed' | 'active' | 'completed' | 'expired';

export interface GroupChallengeWithProgress {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  metric: ChallengeMetric;
  target: number;
  current: number;
  status: ChallengeStatus;
  startDate: string;
  endDate: string;
  createdBy: string;
  members: { userId: string; displayName: string; contribution: number }[];
  daysLeft: number;
  justCompleted?: boolean;
}

const METRIC_LABELS: Record<ChallengeMetric, string> = {
  volume: 'lbs lifted',
  sessions: 'workouts',
  steps: 'steps',
  active_minutes: 'active minutes',
};

export function getMetricLabel(metric: ChallengeMetric): string {
  return METRIC_LABELS[metric] || metric;
}

/** Propose a challenge (any member). Status = 'proposed' until leader approves. */
export async function proposeChallenge(params: {
  groupId: string;
  createdBy: string;
  name: string;
  metric: ChallengeMetric;
  target: number;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;
}): Promise<{ id: string } | null> {
  const supabase = createClient();
  const today = new Date().toLocaleDateString('en-CA');

  // Auto-expire past challenges
  await supabase.from('group_challenges').update({ status: 'completed' })
    .eq('group_id', params.groupId).eq('status', 'active').lt('end_date', today);

  // Check no active/proposed challenge exists
  const { data: existing } = await supabase
    .from('group_challenges')
    .select('id')
    .eq('group_id', params.groupId)
    .in('status', ['active', 'proposed'])
    .limit(1);

  if (existing && existing.length > 0) {
    console.error('[proposeChallenge] blocked: active/proposed challenge already exists', existing[0].id);
    return null;
  }

  // Check if proposer is the leader (auto-approve)
  const { data: group } = await supabase
    .from('groups')
    .select('leader_id')
    .eq('id', params.groupId)
    .single();

  const isLeader = group?.leader_id === params.createdBy;

  const { data, error } = await supabase
    .from('group_challenges')
    .insert({
      group_id: params.groupId,
      created_by: params.createdBy,
      name: params.name,
      metric: params.metric,
      target: params.target,
      start_date: params.startDate,
      end_date: params.endDate,
      week_start: params.startDate,
      status: isLeader ? 'active' : 'proposed',
      challenge_type: 'collaborative',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[proposeChallenge] insert failed:', error.message, error.code, error.details);
    return null;
  }
  return { id: data.id };
}

/** Leader approves a proposed challenge → status becomes 'active' */
export async function approveChallenge(challengeId: string, leaderId: string): Promise<boolean> {
  const supabase = createClient();

  const { data: challenge } = await supabase
    .from('group_challenges')
    .select('group_id')
    .eq('id', challengeId)
    .eq('status', 'proposed')
    .single();

  if (!challenge) return false;

  const { data: group } = await supabase
    .from('groups')
    .select('leader_id')
    .eq('id', challenge.group_id)
    .single();

  if (group?.leader_id !== leaderId) return false;

  const { error } = await supabase
    .from('group_challenges')
    .update({ status: 'active' })
    .eq('id', challengeId);

  return !error;
}

/** Get the active/proposed group challenge with live progress */
export async function getGroupChallengeWithProgress(groupId: string): Promise<GroupChallengeWithProgress | null> {
  const supabase = createClient();

  // Get active or proposed challenge
  const { data: challenges } = await supabase
    .from('group_challenges')
    .select('*')
    .eq('group_id', groupId)
    .in('status', ['active', 'proposed'])
    .order('created_at', { ascending: false })
    .limit(1);

  const challenge = challenges?.[0];
  if (!challenge) return null;

  // Get group info + members
  const [{ data: group }, { data: members }] = await Promise.all([
    supabase.from('groups').select('name').eq('id', groupId).single(),
    supabase.from('group_members').select('user_id, users(display_name)').eq('group_id', groupId),
  ]);

  const memberIds = (members || []).map((m: any) => m.user_id);

  // Compute progress if active
  let memberContributions: { userId: string; displayName: string; contribution: number }[] = [];
  let total = 0;

  if (challenge.status === 'active' && memberIds.length > 0) {
    const contributions = await computeContributions(
      memberIds,
      challenge.metric as ChallengeMetric,
      challenge.start_date,
      challenge.end_date
    );

    memberContributions = (members || []).map((m: any) => ({
      userId: m.user_id,
      displayName: m.users?.display_name || 'Member',
      contribution: contributions[m.user_id] || 0,
    }));

    total = memberContributions.reduce((sum, m) => sum + m.contribution, 0);

    // Auto-complete if target reached
    let justCompleted = false;
    if (total >= challenge.target && challenge.status === 'active') {
      await supabase
        .from('group_challenges')
        .update({ status: 'completed', completed: true, completed_at: new Date().toISOString(), results: { contributions: memberContributions, total } })
        .eq('id', challenge.id);
      challenge.status = 'completed';
      justCompleted = true;

      // Award 150 XP to each member
      try {
        const { awardXp } = await import('@/utils/xp-service');
        for (const mid of memberIds) {
          await awardXp(supabase, mid, { type: 'workout', level: 3, volumeXp: 0 } as any, `Guild Quest: ${challenge.name}`);
        }
      } catch {}
    }
  }

  const today = new Date();
  const endDate = new Date(challenge.end_date + 'T23:59:59');
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  // Expire if past end date and not completed
  if (daysLeft === 0 && challenge.status === 'active' && total < challenge.target) {
    await supabase.from('group_challenges').update({ status: 'expired', results: { contributions: memberContributions, total } }).eq('id', challenge.id);
    challenge.status = 'expired';
  }

  return {
    id: challenge.id,
    groupId,
    groupName: group?.name || 'Party',
    name: challenge.name || `${getMetricLabel(challenge.metric)} Challenge`,
    metric: challenge.metric as ChallengeMetric,
    target: challenge.target,
    current: total,
    status: challenge.status as ChallengeStatus,
    startDate: challenge.start_date,
    endDate: challenge.end_date,
    createdBy: challenge.created_by,
    members: memberContributions.sort((a, b) => b.contribution - a.contribution),
    daysLeft,
    justCompleted,
  };
}

async function computeContributions(
  memberIds: string[],
  metric: ChallengeMetric,
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const supabase = createClient();
  const result: Record<string, number> = {};

  if (metric === 'volume') {
    const { data } = await supabase
      .from('workouts')
      .select('user_id, raw_value, sets')
      .in('user_id', memberIds)
      .gte('date', startDate)
      .lte('date', endDate);

    for (const w of data || []) {
      if (Array.isArray(w.sets)) {
        result[w.user_id] = (result[w.user_id] || 0) + w.sets.reduce((s: number, set: any) => s + ((set.weight || 0) * (set.reps || 1)), 0);
      } else {
        result[w.user_id] = (result[w.user_id] || 0) + (w.raw_value || 0);
      }
    }
  } else if (metric === 'sessions') {
    const { data } = await supabase
      .from('workouts')
      .select('user_id, date')
      .in('user_id', memberIds)
      .gte('date', startDate)
      .lte('date', endDate);

    const seen: Record<string, Set<string>> = {};
    for (const w of data || []) {
      if (!seen[w.user_id]) seen[w.user_id] = new Set();
      seen[w.user_id].add(w.date);
    }
    for (const [uid, dates] of Object.entries(seen)) {
      result[uid] = dates.size;
    }
  } else if (metric === 'steps') {
    const { data } = await supabase
      .from('habit_logs')
      .select('user_id, value')
      .in('user_id', memberIds)
      .eq('habit_id', 'habit_steps')
      .gte('date', startDate)
      .lte('date', endDate);

    for (const h of data || []) {
      result[h.user_id] = (result[h.user_id] || 0) + (h.value || 0);
    }
  } else if (metric === 'active_minutes') {
    const { data } = await supabase
      .from('habit_logs')
      .select('user_id, value')
      .in('user_id', memberIds)
      .eq('metric', 'active_minutes')
      .gte('date', startDate)
      .lte('date', endDate);

    for (const h of data || []) {
      result[h.user_id] = (result[h.user_id] || 0) + (h.value || 0);
    }
  }

  return result;
}
