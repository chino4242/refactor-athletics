import { createClient } from '@/utils/supabase/client';
import type { Group, GroupMember, GroupChallenge } from '@/types';

function generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

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

    return group;
}

export async function leaveGroup(userId: string, groupId: string): Promise<void> {
    const supabase = createClient();
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
}

export async function getUserGroup(userId: string): Promise<{ group: Group; members: GroupMember[]; challenge: GroupChallenge | null } | null> {
    const supabase = createClient();

    // Find user's group
    const { data: membership } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .limit(1)
        .single();

    if (!membership) return null;

    // Get group, members, and current week's challenge in parallel
    const weekStart = getWeekStart();
    const [groupRes, membersRes, challengeRes] = await Promise.all([
        supabase.from('groups').select('*').eq('id', membership.group_id).single(),
        supabase.from('group_members').select('group_id, user_id, joined_at').eq('group_id', membership.group_id),
        supabase.from('group_challenges').select('*').eq('group_id', membership.group_id).eq('week_start', weekStart).single(),
    ]);

    if (!groupRes.data) return null;

    // Get display names for members
    const memberIds = (membersRes.data || []).map(m => m.user_id);
    const { data: profiles } = await supabase
        .from('users')
        .select('id, display_name')
        .in('id', memberIds);

    const profileMap = new Map((profiles || []).map(p => [p.id, p.display_name]));
    const members = (membersRes.data || []).map(m => ({
        ...m,
        display_name: profileMap.get(m.user_id) || 'Unknown',
    }));

    return {
        group: groupRes.data,
        members,
        challenge: challengeRes.data || null,
    };
}

export async function createChallenge(groupId: string, metric: string, target: number): Promise<GroupChallenge> {
    const supabase = createClient();
    const weekStart = getWeekStart();

    const { data, error } = await supabase
        .from('group_challenges')
        .upsert({ group_id: groupId, metric, target, week_start: weekStart })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getGroupChallengeProgress(groupId: string): Promise<Record<string, number>> {
    const supabase = createClient();
    const weekStart = getWeekStart();
    const weekStartTs = Math.floor(new Date(weekStart).getTime() / 1000);

    // Get challenge
    const { data: challenge } = await supabase
        .from('group_challenges')
        .select('*')
        .eq('group_id', groupId)
        .eq('week_start', weekStart)
        .single();

    if (!challenge) return {};

    // Get all members
    const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

    if (!members || members.length === 0) return {};

    const memberIds = members.map(m => m.user_id);
    const progress: Record<string, number> = {};

    if (challenge.metric === 'steps') {
        const { data } = await supabase
            .from('habit_logs')
            .select('user_id, value')
            .in('user_id', memberIds)
            .eq('habit_id', 'habit_steps')
            .gte('timestamp', weekStartTs);

        (data || []).forEach(row => {
            progress[row.user_id] = (progress[row.user_id] || 0) + (row.value || 0);
        });
    } else if (challenge.metric === 'workouts') {
        const { data } = await supabase
            .from('workouts')
            .select('user_id')
            .in('user_id', memberIds)
            .gte('timestamp', weekStartTs);

        (data || []).forEach(row => {
            progress[row.user_id] = (progress[row.user_id] || 0) + 1;
        });
    } else if (challenge.metric === 'active_minutes') {
        // Count workouts × 30 min as a rough estimate
        const { data } = await supabase
            .from('workouts')
            .select('user_id')
            .in('user_id', memberIds)
            .gte('timestamp', weekStartTs);

        (data || []).forEach(row => {
            progress[row.user_id] = (progress[row.user_id] || 0) + 30;
        });
    } else if (challenge.metric === 'water_days') {
        const { data } = await supabase
            .from('habit_logs')
            .select('user_id, date')
            .in('user_id', memberIds)
            .eq('habit_id', 'habit_water')
            .gte('timestamp', weekStartTs);

        // Count unique days per user
        const daysSeen = new Map<string, Set<string>>();
        (data || []).forEach(row => {
            if (!daysSeen.has(row.user_id)) daysSeen.set(row.user_id, new Set());
            daysSeen.get(row.user_id)!.add(row.date);
        });
        daysSeen.forEach((days, userId) => { progress[userId] = days.size; });
    }

    return progress;
}

function getWeekStart(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
}
