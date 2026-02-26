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

    // Track highest level achieved per exercise for Power Level calculation
    const maxLevelPerExercise: Record<string, number> = {};

    for (const item of history) {
        totalXp += item.xp || 0;

        // Track the highest level for this exercise
        if (item.level > 0 && item.exercise_id) {
            if (!maxLevelPerExercise[item.exercise_id] || item.level > maxLevelPerExercise[item.exercise_id]) {
                maxLevelPerExercise[item.exercise_id] = item.level;
            }
        }
    }

    // Power Level = Sum of (100 * max_level) for each ranked exercise
    let powerLevelScore = 0;
    for (const exId in maxLevelPerExercise) {
        powerLevelScore += (maxLevelPerExercise[exId] * 100);
    }

    // If no ranked exercises, floor it to 1, or just use the calculated score
    const finalPowerLevel = powerLevelScore > 0 ? powerLevelScore : 1;

    // Calculate player level based on total XP (every 1000 XP = 1 Level)
    const playerLevel = Math.floor(totalXp / 1000) + 1;
    const level_progress_percent = ((totalXp % 1000) / 1000) * 100;

    return {
        power_level: finalPowerLevel,
        exercises_tracked: history.length,
        highest_level_achieved: Math.max(0, ...Object.values(maxLevelPerExercise)),
        total_career_xp: totalXp,
        player_level: playerLevel,
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
    const scoring = standards.scoring || 'higher_is_better';
    const isXBW = standards.unit === 'xBW';

    // 1. Calculate the comparison value based on xBW and special cases
    let finalValue = value;
    if (exerciseId === 'weighted_pullup' || exerciseId === 'five_rm_weighted_pull_up') {
        finalValue = value + bodyweight;
    }
    const comparisonValue = isXBW ? finalValue / bodyweight : finalValue;

    // 2. Find the correct brackets (age + sex)
    const sexKey = (sex || 'male').toLowerCase() === 'female' ? 'female' : 'male';
    const brackets = standards.brackets?.[sexKey] || [];

    const userAge = age > 0 ? age : 25;
    let ageBracket = brackets.find((b: any) => userAge >= b.min && userAge <= b.max);
    if (!ageBracket && brackets.length > 0) {
        if (userAge > 99) ageBracket = brackets[brackets.length - 1];
        else ageBracket = brackets[0];
    }
    const levels = ageBracket ? ageBracket.levels : [];

    // 3. Find current level
    let currentLevelIndex = -1; // -1 means Level 0 (Peasant)
    for (let i = 0; i < levels.length; i++) {
        const threshold = levels[i];
        const passes = scoring === 'lower_is_better' ? comparisonValue <= threshold : comparisonValue >= threshold;
        if (passes) {
            currentLevelIndex = i;
        }
    }

    const rankLevel = `level${currentLevelIndex + 1}`;

    const rankNames = ["Peasant", "Rookie", "Amateur", "Contender", "Pro", "Champion", "Legend"];
    const rankName = rankNames[currentLevelIndex + 1] || "Vikingur";

    let nextMilestone: string | null = null;
    const nextLevelIndex = currentLevelIndex + 1;
    if (nextLevelIndex < levels.length) {
        let rawNextThreshold = levels[nextLevelIndex];
        if (isXBW) {
            rawNextThreshold *= bodyweight;
        }
        rawNextThreshold = Math.round(rawNextThreshold);
        nextMilestone = `${rawNextThreshold} ${isXBW ? 'lbs' : (standards.unit || '')} to reach Level ${nextLevelIndex + 1}`;
    } else {
        nextMilestone = 'MAX RANK ACHIEVED';
    }

    const ts = Math.floor(Date.now() / 1000);
    const dateStr = new Date(ts * 1000).toISOString().split('T')[0];
    const userLevelNum = currentLevelIndex + 1;
    const xpEarned = userLevelNum > 0 ? userLevelNum * 50 : 0;

    await supabase.from('history').insert({
        user_id: userId,
        exercise_id: exerciseId,
        timestamp: ts,
        date: dateStr,
        value: `${value}`,
        raw_value: value,
        level: userLevelNum,
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
    const scoring = standards.scoring || 'higher_is_better';
    const isXBW = standards.unit === 'xBW';

    let finalValue = currentValue;
    if (exerciseId === 'weighted_pullup' || exerciseId === 'five_rm_weighted_pull_up') {
        finalValue = currentValue + bodyweight;
    }
    const comparisonValue = isXBW ? finalValue / bodyweight : finalValue;

    const sexKey = (sex || 'male').toLowerCase() === 'female' ? 'female' : 'male';
    const brackets = standards.brackets?.[sexKey] || [];

    const userAge = age > 0 ? age : 25;
    let ageBracket = brackets.find((b: any) => userAge >= b.min && userAge <= b.max);
    if (!ageBracket && brackets.length > 0) {
        if (userAge > 99) ageBracket = brackets[brackets.length - 1];
        else ageBracket = brackets[0];
    }
    const levels = ageBracket ? ageBracket.levels : [];

    let userLevelIndex = -1;
    for (let i = 0; i < levels.length; i++) {
        const threshold = levels[i];
        const passes = scoring === 'lower_is_better' ? comparisonValue <= threshold : comparisonValue >= threshold;
        if (passes) {
            userLevelIndex = i;
        }
    }

    const nextIndex = userLevelIndex + 1;
    if (nextIndex < levels.length) {
        let rawNextThreshold = levels[nextIndex];
        if (isXBW) {
            rawNextThreshold *= bodyweight;
        }
        rawNextThreshold = Math.round(rawNextThreshold);
        return { next_milestone: `${rawNextThreshold} ${isXBW ? 'lbs' : (standards.unit || '')} to reach Level ${nextIndex + 1}` };
    }

    return { next_milestone: null };
};

