import { createClient } from '@/utils/supabase/client';
import type { Group, GroupMember, GroupChallenge, UserBadge, ChallengeMetric } from '@/types';
import { BADGE_TYPES } from '@/types';

function generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ── Group CRUD ──

export async function createGroup(userId: string, name: string): Promise<Group> {
    const supabase = createClient();
    const invite_code = generateInviteCode();

    const { data, error } = await supabase
        .from('groups')
        .insert({ name, leader_id: userId, invite_code })
        .select()
        .single();

    if (error) throw error;

    // Auto-join the creator
    await supabase.from('group_members').insert({ group_id: data.id, user_id: userId });

    return data;
}

export async function joinGroup(userId: string, inviteCode: string): Promise<Group> {
    const supabase = createClient();

    const { data: group, error: findError } = await supabase
        .from('groups')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .single();

    if (findError || !group) throw new Error('Invalid invite code');

    const { error: joinError } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: userId });

    if (joinError) {
        if (joinError.code === '23505') throw new Error('Already a member');
        throw joinError;
    }

    // Award recruit reward (+100 XP) to the group leader
    try {
        const { awardXp } = await import('@/utils/xp-service');
        await awardXp(supabase, group.leader_id, { type: 'workout', level: 0, volumeXp: 100 } as any, `Party Recruit: new member joined`);
    } catch {}

    return group;
}

export async function leaveGroup(userId: string, groupId: string): Promise<void> {
    const supabase = createClient();
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
}

// ── Multi-Group Support ──

export interface GroupWithDetails {
    group: Group;
    members: GroupMember[];
    activeChallenge: GroupChallenge | null;
}

export async function getUserGroups(userId: string): Promise<GroupWithDetails[]> {
    const supabase = createClient();

    // Get all groups user belongs to
    const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

    if (!memberships || memberships.length === 0) return [];

    const groupIds = memberships.map(m => m.group_id);
    // Use local date minus 1 day buffer so challenges stay visible through end_date in all US timezones
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const cutoff = yesterday.toLocaleDateString('en-CA');

    // Fetch groups, all members, and active challenges in parallel
    const [groupsRes, membersRes, challengesRes] = await Promise.all([
        supabase.from('groups').select('*').in('id', groupIds),
        supabase.from('group_members').select('group_id, user_id, joined_at').in('group_id', groupIds),
        supabase.from('group_challenges').select('*').in('group_id', groupIds).gte('end_date', cutoff).eq('completed', false).order('created_at', { ascending: false }),
    ]);

    // Get display names for all members
    const allMemberIds = [...new Set((membersRes.data || []).map(m => m.user_id))];
    const { data: profiles } = await supabase
        .from('users')
        .select('id, display_name')
        .in('id', allMemberIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p.display_name]));

    const groups = groupsRes.data || [];
    const allMembers = (membersRes.data || []).map(m => ({
        ...m,
        display_name: profileMap.get(m.user_id) || 'Unknown',
    }));
    const challenges = challengesRes.data || [];

    return groups.map(group => ({
        group,
        members: allMembers.filter(m => m.group_id === group.id),
        activeChallenge: challenges.find(c => c.group_id === group.id) || null,
    }));
}

// Backward compat — returns first group
export async function getUserGroup(userId: string): Promise<{ group: Group; members: GroupMember[]; challenge: GroupChallenge | null } | null> {
    const groups = await getUserGroups(userId);
    if (groups.length === 0) return null;
    const first = groups[0];
    return { group: first.group, members: first.members, challenge: first.activeChallenge };
}

// ── Group Challenges ──

export interface CreateGroupChallengeParams {
    groupId: string;
    createdBy: string;
    metric: ChallengeMetric;
    target: number;
    name: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
}

export async function createGroupChallenge(params: CreateGroupChallengeParams): Promise<GroupChallenge> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('group_challenges')
        .insert({
            group_id: params.groupId,
            created_by: params.createdBy,
            metric: params.metric,
            target: params.target,
            name: params.name,
            start_date: params.startDate,
            end_date: params.endDate,
            week_start: params.startDate, // backward compat
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getGroupChallengeProgress(groupId: string, challenge: GroupChallenge): Promise<Record<string, number>> {
    const supabase = createClient();

    // Get all members
    const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

    if (!members || members.length === 0) return {};

    const memberIds = members.map(m => m.user_id);
    const progress: Record<string, number> = {};

    // Initialize all members to 0
    memberIds.forEach(id => { progress[id] = 0; });

    if (challenge.metric === 'steps') {
        const { data } = await supabase
            .from('habit_logs')
            .select('user_id, value, date')
            .in('user_id', memberIds)
            .eq('habit_id', 'habit_steps')
            .gte('date', challenge.start_date)
            .lte('date', challenge.end_date);

        (data || []).forEach(row => {
            progress[row.user_id] = (progress[row.user_id] || 0) + (row.value || 0);
        });
    } else if (challenge.metric === 'workouts') {
        const { data } = await supabase
            .from('workouts')
            .select('user_id, date')
            .in('user_id', memberIds)
            .gte('date', challenge.start_date)
            .lte('date', challenge.end_date);

        (data || []).forEach(row => {
            progress[row.user_id] = (progress[row.user_id] || 0) + 1;
        });
    } else if (challenge.metric === 'active_minutes') {
        const { data } = await supabase
            .from('habit_logs')
            .select('user_id, value')
            .in('user_id', memberIds)
            .eq('habit_id', 'habit_exercise_minutes')
            .gte('date', challenge.start_date)
            .lte('date', challenge.end_date);

        (data || []).forEach(row => {
            progress[row.user_id] = (progress[row.user_id] || 0) + (Number(row.value) || 0);
        });
    } else if (challenge.metric === 'water_days') {
        const { data } = await supabase
            .from('habit_logs')
            .select('user_id, date')
            .in('user_id', memberIds)
            .eq('habit_id', 'habit_water')
            .gte('date', challenge.start_date)
            .lte('date', challenge.end_date);

        const daysSeen = new Map<string, Set<string>>();
        (data || []).forEach(row => {
            if (!daysSeen.has(row.user_id)) daysSeen.set(row.user_id, new Set());
            daysSeen.get(row.user_id)!.add(row.date);
        });
        daysSeen.forEach((days, userId) => { progress[userId] = days.size; });
    }

    return progress;
}

// ── Lazy Completion & MVP ──

export async function finalizeGroupChallenge(challenge: GroupChallenge, progress: Record<string, number>): Promise<GroupChallenge> {
    const supabase = createClient();

    const total = Object.values(progress).reduce((sum, v) => sum + v, 0);
    const success = total >= challenge.target;

    // Find MVP (highest individual contributor)
    let mvpUserId: string | null = null;
    let maxContribution = 0;
    for (const [userId, value] of Object.entries(progress)) {
        if (value > maxContribution) {
            maxContribution = value;
            mvpUserId = userId;
        }
    }

    const { data, error } = await supabase
        .from('group_challenges')
        .update({
            completed: true,
            completed_at: new Date().toISOString(),
            mvp_user_id: success ? mvpUserId : null,
            results: { ...progress, _success: success },
        })
        .eq('id', challenge.id)
        .select()
        .single();

    if (error) throw error;

    // Award MVP badge if challenge was completed successfully
    if (success && mvpUserId) {
        await awardBadge(mvpUserId, BADGE_TYPES.GROUP_CHALLENGE_MVP, challenge.id, {
            group_id: challenge.group_id,
            metric: challenge.metric,
            contribution: maxContribution,
            target: challenge.target,
        });
    }

    return data;
}

export function isChallengeExpired(challenge: GroupChallenge): boolean {
    const endOfDay = new Date(challenge.end_date + 'T23:59:59');
    return new Date() > endOfDay;
}

// ── Badges ──

export async function awardBadge(userId: string, badgeType: string, challengeId: string, metadata: Record<string, any> = {}): Promise<void> {
    const supabase = createClient();
    await supabase.from('user_badges').insert({
        user_id: userId,
        badge_type: badgeType,
        challenge_id: challengeId,
        metadata,
    });
}

export async function getUserBadges(userId: string): Promise<UserBadge[]> {
    const supabase = createClient();
    const { data } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });
    return data || [];
}

export async function getBadgeCount(userId: string, badgeType: string): Promise<number> {
    const supabase = createClient();
    const { count } = await supabase
        .from('user_badges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('badge_type', badgeType);
    return count || 0;
}

// ── Challenge History ──

export async function getGroupChallengeHistory(groupId: string): Promise<GroupChallenge[]> {
    const supabase = createClient();
    const { data } = await supabase
        .from('group_challenges')
        .select('*')
        .eq('group_id', groupId)
        .eq('completed', true)
        .order('end_date', { ascending: false })
        .limit(20);
    return data || [];
}

// Legacy compat
export async function createChallenge(groupId: string, metric: string, target: number): Promise<GroupChallenge> {
    const weekStart = getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    return createGroupChallenge({
        groupId,
        createdBy: '', // legacy — no created_by
        metric: metric as ChallengeMetric,
        target,
        name: `Weekly ${metric} challenge`,
        startDate: weekStart,
        endDate: weekEnd.toLocaleDateString('en-CA'),
    });
}

function getWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toLocaleDateString('en-CA');
}
