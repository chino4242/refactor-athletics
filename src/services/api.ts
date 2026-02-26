import type { UserProfileData, NutritionTargets, HistoryItem, UserStats, Challenge, ChallengeGoal, DuelResponse, MilestoneResponse } from '@/types';
export type { HistoryItem, CatalogItem } from '@/types';
import { createClient } from '@/utils/supabase/client';


export const getProfile = async (userId: string): Promise<UserProfileData | null> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error("Error fetching profile:", error);
        return null;
    }

    return {
        user_id: data.id,
        age: data.age,
        sex: data.sex,
        bodyweight: data.bodyweight,
        goal_weight: data.goal_weight,
        is_onboarded: data.is_onboarded,
        selected_theme: data.selected_theme,
        timezone: data.timezone,
        display_name: data.display_name,
        nutrition_targets: data.nutrition_targets,
        hidden_habits: data.hidden_habits,
        habit_targets: data.habit_targets,
        body_composition_goals: data.body_composition_goals,
    };
};

export const saveProfile = async (profile: UserProfileData): Promise<any> => {
    const supabase = createClient();
    const payload = {
        id: profile.user_id,
        age: profile.age,
        sex: profile.sex,
        bodyweight: profile.bodyweight,
        goal_weight: profile.goal_weight,
        is_onboarded: profile.is_onboarded,
        selected_theme: profile.selected_theme,
        timezone: profile.timezone,
        display_name: profile.display_name,
        nutrition_targets: profile.nutrition_targets,
        hidden_habits: profile.hidden_habits,
        habit_targets: profile.habit_targets,
        body_composition_goals: profile.body_composition_goals,
    };

    const { error } = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'id' });

    if (error) {
        console.error("Error saving profile:", error);
        throw error;
    }
    return { status: 'success' };
};

export const logHabit = async (userId: string, habitId: string, value: number, bodyweight?: number, label?: string, timestamp?: number): Promise<any> => {
    const supabase = createClient();
    const ts = timestamp || Math.floor(Date.now() / 1000);
    const dateStr = new Date(ts * 1000).toISOString().split('T')[0];

    // Assign generic XP
    const xp = habitId.includes('meal_prep') ? 100 : (habitId.includes('sleep') ? 15 : 10);

    const { data, error } = await supabase
        .from('history')
        .insert({
            user_id: userId,
            exercise_id: habitId,
            timestamp: ts,
            date: dateStr,
            raw_value: value,
            value: label || habitId,
            level: 1,
            xp: xp,
            rank_name: 'Novice'
        })
        .select()
        .single();

    if (error) {
        console.error("Error logging habit:", error);
        throw error;
    }
    return { xp_earned: xp };
};

export const deleteHistoryItem = async (userId: string, timestamp: number): Promise<any> => {
    const supabase = createClient();
    const { error } = await supabase
        .from('history')
        .delete()
        .match({ user_id: userId, timestamp });

    if (error) {
        console.error("Error deleting history item:", error);
        throw error;
    }
    return { status: 'success' };
};

export const getHistory = async (userId: string): Promise<HistoryItem[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: true });

    if (error) {
        console.error("Error fetching history:", error);
        return [];
    }
    return data as HistoryItem[];
};

export const getHabitProgress = async (userId: string, startTs: number): Promise<any> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startTs);

    if (error) {
        console.error("Error fetching progress:", error);
        return { totals: {} };
    }

    const totals: Record<string, number> = {};
    for (const item of data) {
        const key = item.exercise_id;
        totals[key] = (totals[key] || 0) + Number(item.raw_value || 1);

        // Accumulate macros
        if (key === 'calories') totals['macro_calories'] = (totals['macro_calories'] || 0) + Number(item.raw_value);
        if (key === 'protein') totals['macro_protein'] = (totals['macro_protein'] || 0) + Number(item.raw_value);
        if (key === 'carbs') totals['macro_carbs'] = (totals['macro_carbs'] || 0) + Number(item.raw_value);
        if (key === 'fat') totals['macro_fat'] = (totals['macro_fat'] || 0) + Number(item.raw_value);
    }

    return { totals };
};

export const getWeeklyProgress = async (userId: string, startTs: number): Promise<any> => {
    return getHabitProgress(userId, startTs);
};

export const getUserStats = async (userId: string): Promise<UserStats | null> => {
    const history = await getHistory(userId);
    let totalXp = 0;
    for (const item of history) {
        totalXp += item.xp || 0;
    }

    const power_level = Math.floor(totalXp / 1000) + 1;
    const level_progress_percent = ((totalXp % 1000) / 1000) * 100;

    return {
        power_level: power_level,
        exercises_tracked: history.length,
        highest_level_achieved: 0,
        total_career_xp: totalXp,
        player_level: power_level,
        level_progress_percent: level_progress_percent,
        xp_to_next_level: 1000 - (totalXp % 1000),
        no_alcohol_streak: 0,
        no_vice_streak: 0,
    };
};

export const getMilestones = async (userId: string, age: number, sex: string, bodyweight: number): Promise<MilestoneResponse[]> => {
    // Stub implementation until backend endpoints are migrated
    return [];
};

export const getTrainingCatalog = async (): Promise<any[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('catalog')
        .select('*');

    if (error) {
        console.error("Error fetching catalog:", error);
        return [];
    }
    return data;
};

// Next.js API route will handle the actual file reading and parsing,
// because fs is not available in browser Client Components.
export const getActiveWorkout = async (date?: string): Promise<any[]> => {
    const url = date ? `/api/workout?date=${date}` : `/api/workout`;
    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        console.error("Failed to fetch active workout:", e);
        return [];
    }
};

export const getWorkoutHistory = async (): Promise<string[]> => {
    try {
        const response = await fetch(`/api/workouts/history`);
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        return [];
    }
};

export const getWeeklySchedule = async (): Promise<any[]> => {
    try {
        const response = await fetch(`/api/workouts/schedule`);
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        return [];
    }
};

export const logTraining = async (
    userId: string,
    exerciseId: string,
    bodyweight: number,
    sex: string,
    sets: any[]
): Promise<any> => {
    const supabase = createClient();
    let totalXp = 0;

    // We fetch catalog locally to get XP factor (could also pass it in)
    const { data: catalogItem } = await supabase.from('catalog').select('*').eq('id', exerciseId).single();
    const xpFactor = catalogItem ? (catalogItem.xp_factor || 1) : 1;

    // Calculate XP
    for (const set of sets) {
        const setXp = Math.floor((set.reps || 10) * xpFactor);
        totalXp += setXp;
    }

    const ts = Math.floor(Date.now() / 1000);
    const dateStr = new Date(ts * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('history')
        .insert({
            user_id: userId,
            exercise_id: exerciseId,
            timestamp: ts,
            date: dateStr,
            value: sets.length > 0 ? `${sets.length} sets` : 'Completed',
            raw_value: sets.length,
            details: sets,
            level: 1,
            xp: totalXp,
            rank_name: 'Novice'
        })
        .select()
        .single();

    if (error) throw error;
    return { xp_earned: totalXp };
};

export const logWorkoutBlock = async (
    userId: string,
    blockName: string,
    details: string,
    xp: number,
    activityType: string = "Strength",
    exercises?: any[]
): Promise<any> => {
    const supabase = createClient();
    const ts = Math.floor(Date.now() / 1000);
    const dateStr = new Date(ts * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('history')
        .insert({
            user_id: userId,
            exercise_id: `block_${blockName.toLowerCase().replace(/\s+/g, '_')}`,
            timestamp: ts,
            date: dateStr,
            value: details,
            raw_value: xp,
            details: exercises || [],
            level: 1,
            xp: xp,
            rank_name: activityType
        })
        .select()
        .single();

    if (error) throw error;
    return { status: 'success' };
};

export const getActiveChallenge = async (userId: string): Promise<Challenge | null> => null;

// --- Arena / Duels ---
export type { DuelResponse, Challenge, ChallengeGoal } from '@/types';

export const getDuel = async (duelId: string): Promise<DuelResponse | null> => {
    const supabase = createClient();
    const { data, error } = await supabase.from('duels').select('*').eq('id', duelId).single();
    if (error) {
        console.error("Error fetching duel:", error);
        return null;
    }
    return data;
};

export const getActiveDuels = async (userId: string): Promise<DuelResponse[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('duels')
        .select('*')
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .in('status', ['PENDING', 'ACTIVE'])
        .order('start_at', { ascending: false });

    if (error) {
        console.error("Error fetching active duels:", error);
        return [];
    }
    return data || [];
};

export const getDuelHistory = async (userId: string): Promise<DuelResponse[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('duels')
        .select('*')
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .in('status', ['COMPLETED', 'CANCELLED'])
        .order('end_at', { ascending: false });

    if (error) {
        console.error("Error fetching duel history:", error);
        return [];
    }
    return data || [];
};

export const createChallenge = async (userId: string, durationDays: number): Promise<DuelResponse | null> => {
    const supabase = createClient();
    const startAt = Math.floor(Date.now() / 1000);
    const endAt = startAt + (durationDays * 86400);

    const { data, error } = await supabase.from('duels').insert([{
        challenger_id: userId,
        status: 'PENDING',
        start_at: startAt,
        end_at: endAt
    }]).select().single();

    if (error) {
        console.error("Error creating duel challenge:", error);
        return null;
    }
    return data;
};

export const acceptChallenge = async (duelId: string, opponentId: string): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase.from('duels').update({
        opponent_id: opponentId,
        status: 'ACTIVE'
    }).eq('id', duelId);

    if (error) {
        console.error("Error accepting challenge:", error);
        return false;
    }
    return true;
};

export const finalizeDuel = async (duelId: string, challengerXp: number, opponentXp: number, winnerId: string | null): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase.from('duels').update({
        challenger_xp: challengerXp,
        opponent_xp: opponentXp,
        winner_id: winnerId,
        status: 'COMPLETED'
    }).eq('id', duelId);

    if (error) {
        console.error("Error finalizing duel:", error);
        return false;
    }
    return true;
};

export const cancelDuel = async (duelId: string): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase.from('duels').update({
        status: 'CANCELLED'
    }).eq('id', duelId);

    if (error) {
        console.error("Error canceling duel:", error);
        return false;
    }
    return true;
};

// --- Custom Challenges ---
export const createCustomChallenge = async (challengeData: Partial<Challenge>): Promise<Challenge | null> => {
    const supabase = createClient();
    const { data, error } = await supabase.from('challenges').insert([{
        user_id: challengeData.user_id,
        name: challengeData.name,
        duration_days: challengeData.duration_days,
        start_date: challengeData.start_date,
        goals: challengeData.goals,
        status: 'alive',
        current_streak: 0,
        history: {}
    }]).select().single();

    if (error) {
        console.error("Error creating custom challenge:", error);
        return null;
    }
    return data;
};

export const checkChallengeStatus = async (id: string): Promise<Challenge | null> => {
    const supabase = createClient();
    const { data, error } = await supabase.from('challenges').select('*').eq('id', id).single();
    if (error) {
        console.error("Error checking challenge status:", error);
        return null;
    }
    return data;
};

export const cancelChallenge = async (id: string): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase.from('challenges').update({ status: 'failed' }).eq('id', id);
    if (error) {
        console.error("Error scaling challenge:", error);
        return false;
    }
    return true;
};

// --- Rank Calculation ---
export interface RankResponse {
    rank_level: string;
    rank_name: string;
    description: string;
    next_milestone: string | null;
    xp_earned?: number;
}

export const calculateRank = async (
    exerciseId: string,
    value: number,
    age: number,
    sex: string,
    bodyweight: number,
    userId: string
): Promise<RankResponse> => {
    const supabase = createClient();

    const { data: item } = await supabase
        .from('catalog')
        .select('*')
        .eq('id', exerciseId)
        .single();

    if (!item) throw new Error(`Exercise ${exerciseId} not found`);

    const standards = item.standards || {};
    const tiers: any[] = standards.tiers || [];
    const scoring = standards.scoring || 'higher_is_better';

    let rankLevel = 'level0';
    let rankName = 'Unranked';
    let nextMilestone: string | null = 'Complete more workouts';

    for (let i = tiers.length - 1; i >= 0; i--) {
        const tier = tiers[i];
        const threshold = tier.threshold_xbw ? tier.threshold_xbw * bodyweight : (tier.threshold ?? 0);
        const passes = scoring === 'lower_is_better' ? value <= threshold : value >= threshold;

        if (passes) {
            rankLevel = `level${i + 1}`;
            rankName = tier.name || `Level ${i + 1}`;
            const nextTier = tiers[i + 1];
            if (nextTier) {
                const nextThreshold = nextTier.threshold_xbw ? nextTier.threshold_xbw * bodyweight : (nextTier.threshold ?? 0);
                nextMilestone = `${nextThreshold} ${standards.unit || ''} to reach ${nextTier.name}`;
            } else {
                nextMilestone = 'MAX RANK ACHIEVED';
            }
            break;
        }
    }

    const ts = Math.floor(Date.now() / 1000);
    const dateStr = new Date(ts * 1000).toISOString().split('T')[0];
    const level = parseInt(rankLevel.replace('level', '')) || 0;
    const xpEarned = level * 50;

    await supabase.from('history').insert({
        user_id: userId,
        exercise_id: exerciseId,
        timestamp: ts,
        date: dateStr,
        value: `${value}`,
        raw_value: value,
        level,
        xp: xpEarned,
        rank_name: rankName,
    });

    return {
        rank_level: rankLevel,
        rank_name: rankName,
        description: `Your ${item.name} result: ${value}`,
        next_milestone: nextMilestone,
        xp_earned: xpEarned,
    };
};

export const getPreviewRank = async (
    exerciseId: string,
    currentValue: number,
    age: number,
    sex: string,
    bodyweight: number
): Promise<{ next_milestone: string | null }> => {
    const supabase = createClient();

    const { data: item } = await supabase
        .from('catalog')
        .select('*')
        .eq('id', exerciseId)
        .single();

    if (!item) return { next_milestone: null };

    const standards = item.standards || {};
    const tiers: any[] = standards.tiers || [];
    const scoring = standards.scoring || 'higher_is_better';

    for (const tier of tiers) {
        const threshold = tier.threshold_xbw ? tier.threshold_xbw * bodyweight : (tier.threshold ?? 0);
        const passes = scoring === 'lower_is_better' ? currentValue <= threshold : currentValue >= threshold;
        if (!passes) {
            return { next_milestone: `${threshold} ${standards.unit || ''} to reach ${tier.name}` };
        }
    }

    return { next_milestone: null };
};

