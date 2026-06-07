import type { UserProfileData, NutritionTargets, HistoryItem, UserStats, Challenge, ChallengeGoal, DuelResponse, MilestoneResponse } from '@/types';
export type { UserStats, MilestoneResponse };
export type { HistoryItem, CatalogItem } from '@/types';
import { createClient } from '@/utils/supabase/client';
import { getLocalDateStr } from '@/utils/date';


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
        experience_mode: data.experience_mode,
        timezone: data.timezone,
        display_name: data.display_name,
        nutrition_targets: data.nutrition_targets,
        hidden_habits: data.hidden_habits,
        habit_targets: data.habit_targets,
        body_composition_goals: data.body_composition_goals,
        measurement_mode: data.measurement_mode,
        sync_token: data.sync_token,
        whoop_connected_at: data.whoop_connected_at,
        google_health_connected_at: data.google_health_connected_at,
    };
};

export const saveProfile = async (profile: UserProfileData): Promise<any> => {
    const supabase = createClient();
    const payload: any = {
        id: profile.user_id,
    };
    
    // Only include defined fields
    if (profile.age !== undefined) payload.age = profile.age;
    if (profile.sex !== undefined) payload.sex = profile.sex;
    if (profile.bodyweight !== undefined) payload.bodyweight = profile.bodyweight;
    if (profile.is_onboarded !== undefined) payload.is_onboarded = profile.is_onboarded;
    if (profile.selected_theme !== undefined) payload.selected_theme = profile.selected_theme;
    if (profile.selected_path !== undefined) payload.selected_path = profile.selected_path;
    if (profile.experience_mode !== undefined) payload.experience_mode = profile.experience_mode;
    if (profile.waiver_accepted_at !== undefined) payload.waiver_accepted_at = profile.waiver_accepted_at;
    if (profile.timezone !== undefined) payload.timezone = profile.timezone;
    if (profile.display_name !== undefined) payload.display_name = profile.display_name;
    if (profile.nutrition_targets !== undefined) payload.nutrition_targets = profile.nutrition_targets;
    if (profile.hidden_habits !== undefined) payload.hidden_habits = profile.hidden_habits;
    if (profile.habit_targets !== undefined) payload.habit_targets = profile.habit_targets;
    if (profile.body_composition_goals !== undefined) payload.body_composition_goals = profile.body_composition_goals;
    if (profile.available_equipment !== undefined) payload.available_equipment = profile.available_equipment;
    if (profile.measurement_mode !== undefined) payload.measurement_mode = profile.measurement_mode;

    const { error } = await supabase
        .from('users')
        .upsert(payload);

    if (error) {
        console.error("Error saving profile:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;
    }
    return { status: 'success' };
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
    
    // Query all tables in parallel
    const [workouts, nutrition, habits, measurements] = await Promise.all([
        supabase.from('workouts').select('*').eq('user_id', userId).order('timestamp', { ascending: true }),
        supabase.from('nutrition_logs').select('*').eq('user_id', userId).order('timestamp', { ascending: true }),
        supabase.from('habit_logs').select('*').eq('user_id', userId).order('timestamp', { ascending: true }),
        supabase.from('body_measurements').select('*').eq('user_id', userId).order('timestamp', { ascending: true })
    ]);

    // Combine and normalize to HistoryItem format
    const combined: HistoryItem[] = [
        ...(workouts.data || []).map(w => ({
            id: w.id,
            user_id: w.user_id,
            exercise_id: w.exercise_id,
            timestamp: w.timestamp,
            date: w.date,
            value: w.value,
            raw_value: w.raw_value,
            rank_name: w.rank_name,
            level: w.level,
            xp: w.xp,
            details: w.sets,
            created_at: w.created_at
        })),
        ...(nutrition.data || []).map(n => ({
            id: n.id,
            user_id: n.user_id,
            exercise_id: `macro_${n.macro_type}`,
            timestamp: n.timestamp,
            date: n.date,
            value: n.label || n.macro_type,
            raw_value: n.amount,
            rank_name: null,
            level: 0,
            xp: n.xp,
            details: null,
            created_at: n.created_at
        })),
        ...(habits.data || []).map(h => ({
            id: h.id,
            user_id: h.user_id,
            exercise_id: h.habit_id,
            timestamp: h.timestamp,
            date: h.date,
            value: String(h.value),
            raw_value: h.value,
            rank_name: null,
            level: 0,
            xp: h.xp,
            details: null,
            created_at: h.created_at
        })),
        ...(measurements.data || []).map(m => ({
            id: m.id,
            user_id: m.user_id,
            exercise_id: 'body_measurement',
            timestamp: m.timestamp,
            date: m.date,
            value: 'Body Measurement',
            raw_value: m.weight || 0,
            rank_name: null,
            level: 0,
            xp: m.xp,
            details: { weight: m.weight, waist: m.waist, arms: m.arms, chest: m.chest, legs: m.legs, shoulders: m.shoulders },
            created_at: m.created_at
        }))
    ];

    return combined.sort((a, b) => a.timestamp - b.timestamp);
};

export const getHabitProgress = async (userId: string, startTs: number): Promise<any> => {
    const supabase = createClient();
    const endTs = startTs + 86400; // end of day (24 hours)
    const todayDate = new Date(startTs * 1000).toLocaleDateString('en-CA');
    
    // Query nutrition by date (matches delete logic), habits by timestamp
    const [nutrition, habits] = await Promise.all([
        supabase.from('nutrition_logs').select('*').eq('user_id', userId).eq('date', todayDate).order('timestamp', { ascending: false }),
        supabase.from('habit_logs').select('*').eq('user_id', userId).eq('date', todayDate).order('timestamp', { ascending: false })
    ]);

    const totals: Record<string, number> = {};
    
    // Sum nutrition logs
    for (const item of nutrition.data || []) {
        const key = `macro_${item.macro_type}`;
        totals[key] = (totals[key] || 0) + Number(item.amount);
    }

    // Derive macros from meal_entries if available (source of truth for food logs)
    let mealEntries: any[] | null = null;
    try {
        const { data } = await supabase.from('meal_entries')
            .select('calories, protein, carbs, fat')
            .eq('user_id', userId).eq('date', todayDate);
        mealEntries = data;
    } catch {}

    if (mealEntries?.length) {
        totals['macro_protein'] = Math.round(mealEntries.reduce((s: number, m: any) => s + (m.protein || 0), 0));
        totals['macro_carbs'] = Math.round(mealEntries.reduce((s: number, m: any) => s + (m.carbs || 0), 0));
        totals['macro_fat'] = Math.round(mealEntries.reduce((s: number, m: any) => s + (m.fat || 0), 0));
        totals['macro_calories'] = Math.round(mealEntries.reduce((s: number, m: any) =>
            s + (m.calories || ((m.protein || 0) * 4 + (m.carbs || 0) * 4 + (m.fat || 0) * 9)), 0));
    } else {
        totals['macro_calories'] = Math.round(
            ((totals['macro_protein'] || 0) * 4) +
            ((totals['macro_carbs'] || 0) * 4) +
            ((totals['macro_fat'] || 0) * 9)
        );
    }
    
    // Sum habit logs
    for (const item of habits.data || []) {
        const key = item.habit_id;
        totals[key] = (totals[key] || 0) + Number(item.value);
    }

    return { totals, status: 'success' };
};

export const getWeeklyProgress = async (userId: string, startTs: number): Promise<any> => {
    const supabase = createClient();
    const endTs = startTs + 86400 * 7;

    const [nutrition, habits] = await Promise.all([
        supabase.from('nutrition_logs').select('macro_type, amount, timestamp').eq('user_id', userId).gte('timestamp', startTs).lt('timestamp', endTs),
        supabase.from('habit_logs').select('habit_id, value, timestamp').eq('user_id', userId).gte('timestamp', startTs).lt('timestamp', endTs),
    ]);

    const items: any[] = [];
    for (const n of nutrition.data || []) {
        items.push({ exercise_id: `macro_${n.macro_type}`, value: String(n.amount), timestamp: n.timestamp });
    }
    for (const h of habits.data || []) {
        items.push({ exercise_id: h.habit_id, value: String(h.value), timestamp: h.timestamp });
    }

    return { items };
};

export const getUserStats = async (userId: string): Promise<UserStats | null> => {
    const supabase = createClient();
    
    // Query workouts, catalog, and user profile in parallel
    const [{ data: workouts }, { data: catalog }, { data: profile }] = await Promise.all([
        supabase.from('workouts').select('exercise_id, level, xp, raw_value, timestamp').eq('user_id', userId),
        supabase.from('catalog').select('id, name, standards').not('standards', 'is', null),
        supabase.from('users').select('selected_path, age, sex, bodyweight').eq('id', userId).single(),
    ]);

    // Get user's path key exercises
    const { PATH_KEY_EXERCISES } = await import('@/data/pathExercises');
    const userPath = profile?.selected_path || 'hybrid';
    const keyExerciseIds = new Set(PATH_KEY_EXERCISES[userPath] || PATH_KEY_EXERCISES['hybrid']);

    // Query all tables for total XP
    const [nutrition, habits, measurements] = await Promise.all([
        supabase.from('nutrition_logs').select('xp').eq('user_id', userId),
        supabase.from('habit_logs').select('xp').eq('user_id', userId),
        supabase.from('body_measurements').select('xp').eq('user_id', userId)
    ]);

    // Build set of ranked catalog exercise IDs — only those with actual bracket thresholds
    const rankedIds = new Set(
        (catalog || [])
            .filter((c: any) => {
                const b = c.standards?.brackets;
                if (!b) return false;
                const male = b.male || [];
                const female = b.female || [];
                return (male.length > 0 && male[0]?.levels?.length > 0) ||
                       (female.length > 0 && female[0]?.levels?.length > 0);
            })
            .map((c: any) => c.id)
    );

    let totalXp = 0;
    const maxLevelPerExercise: Record<string, number> = {};

    // Calculate Expertise from path key exercises only
    for (const item of workouts || []) {
        totalXp += item.xp || 0;
        
        const normalizedId = item.exercise_id?.replace(/^(five_rm_|one_rm_|est_1rm_)/, '');
        const matchesKey = keyExerciseIds.has(item.exercise_id) || keyExerciseIds.has(normalizedId);
        if (item.exercise_id && item.level > 0 && matchesKey) {
            if (!maxLevelPerExercise[item.exercise_id] || item.level > maxLevelPerExercise[item.exercise_id]) {
                maxLevelPerExercise[item.exercise_id] = item.level;
            }
        }
    }

    // Add XP from other sources
    for (const item of [...(nutrition.data || []), ...(habits.data || []), ...(measurements.data || [])]) {
        totalXp += item.xp || 0;
    }

    // Expertise = Sum of max_level for each ranked exercise the user has tested
    let expertiseScore = 0;
    const testedCount = Object.keys(maxLevelPerExercise).length;
    for (const exId in maxLevelPerExercise) {
        expertiseScore += maxLevelPerExercise[exId];
    }

    const finalExpertise = expertiseScore > 0 ? expertiseScore : 0;

    // XP scaling: 1000 * 1.08^level (fibonacci-ish curve)
    const { xpToLevel } = await import('@/utils/xp');
    const levelData = xpToLevel(totalXp);
    const playerLevel = levelData.level;
    const level_progress_percent = levelData.progress * 100;
    const xpForLevel = (lvl: number) => Math.floor(1000 * Math.pow(1.08, lvl));
    const xpNeeded = xpForLevel(playerLevel);
    const xpIntoLevel = Math.round(levelData.progress * xpNeeded);

    // Streak calculation: walk backwards from today counting consecutive days with virtue logged
    const streakFor = async (virtueId: string, viceId: string): Promise<number> => {
        // Get all virtue and vice logs, ordered by date descending
        const { data: virtueLogs } = await supabase
            .from('habit_logs')
            .select('date')
            .eq('user_id', userId)
            .eq('habit_id', virtueId)
            .order('date', { ascending: false })
            .limit(365);

        const { data: viceLogs } = await supabase
            .from('habit_logs')
            .select('date')
            .eq('user_id', userId)
            .eq('habit_id', viceId)
            .order('date', { ascending: false })
            .limit(365);

        const virtueDates = new Set((virtueLogs || []).map(l => l.date));
        const viceDates = new Set((viceLogs || []).map(l => l.date));

        let streak = 0;
        const d = new Date();
        d.setHours(0, 0, 0, 0);

        for (let i = 0; i < 365; i++) {
            const dateStr = getLocalDateStr(d);
            if (viceDates.has(dateStr)) break; // Failed this day
            if (virtueDates.has(dateStr)) streak++; // Logged success
            else if (i === 0) {} // Today not logged yet, keep going
            else break; // Past day with no log = streak broken
            d.setDate(d.getDate() - 1);
        }
        return streak;
    };

    const [alcoholStreak, viceStreak] = await Promise.all([
        streakFor('habit_no_alcohol', 'habit_alcohol'),
        streakFor('habit_no_vice', 'habit_bad_habit'),
    ]);

    // Compute next-level quests (closest exercises to leveling up)
    const nextLevelQuests: { name: string; target: string; current: string; level: number; nextLevel: number; pct: number }[] = [];
    const userAge = profile?.age || 25;
    const userSex = (profile?.sex || 'male').toLowerCase();
    const userBw = profile?.bodyweight || 180;

    // Build best raw_value per exercise from workouts
    const bestValuePerExercise: Record<string, number> = {};
    for (const w of (workouts || [])) {
        const id = w.exercise_id;
        const val = w.raw_value || 0;
        if (val > (bestValuePerExercise[id] || 0)) bestValuePerExercise[id] = val;
    }

    for (const id of keyExerciseIds) {
        const catItem = (catalog || []).find((c: any) => c.id === id);
        if (!catItem?.standards?.brackets) continue;
        const sexKey = userSex === 'female' ? 'female' : 'male';
        const brackets = catItem.standards.brackets[sexKey];
        if (!brackets?.length) continue;
        const bracket = brackets.find((b: any) => userAge >= b.min && userAge <= b.max) || brackets[0];
        if (!bracket?.levels) continue;
        const currentLevel = maxLevelPerExercise[id] || 0;
        if (currentLevel >= 5) continue;
        const nextThreshold = bracket.levels[currentLevel];
        const unit = (catItem.standards.unit || '').toLowerCase();
        let target: string;
        let currentDisplay: string;
        let rawBest = bestValuePerExercise[id] || 0;
        let pct = 0;

        if (unit === 'sec' || unit === 'seconds' || unit === 'time') {
            const min = Math.floor(nextThreshold / 60);
            const sec = Math.round(nextThreshold % 60);
            target = `${min}:${String(sec).padStart(2, '0')}`;
            currentDisplay = rawBest > 0 ? `${Math.floor(rawBest / 60)}:${String(Math.round(rawBest % 60)).padStart(2, '0')}` : '—';
            if (nextThreshold > 0) pct = Math.min(100, (rawBest / nextThreshold) * 100);
        } else if (unit === 'xbw') {
            const targetLbs = Math.round(nextThreshold * userBw);
            target = `${targetLbs} lbs`;
            currentDisplay = rawBest > 0 ? `${Math.round(rawBest)} lbs` : '—';
            if (targetLbs > 0) pct = Math.min(100, (rawBest / targetLbs) * 100);
        } else {
            target = `${nextThreshold} ${unit === 'reps' ? 'reps' : unit}`;
            currentDisplay = rawBest > 0 ? `${Math.round(rawBest)} ${unit === 'reps' ? 'reps' : unit}` : '—';
            if (nextThreshold > 0) pct = Math.min(100, (rawBest / nextThreshold) * 100);
        }

        // Fallback: if no raw_value but we have a level, estimate progress from previous threshold
        if (pct === 0 && currentLevel > 0) {
            const prevThreshold = currentLevel >= 2 ? bracket.levels[currentLevel - 2] : 0;
            // User passed currentLevel-1 threshold, working toward currentLevel threshold
            // Estimate ~halfway between previous and next
            pct = Math.round(((bracket.levels[currentLevel - 1] || 0) / nextThreshold) * 100);
            if (unit === 'xbw') {
                currentDisplay = `≥${Math.round((bracket.levels[currentLevel - 1] || 0) * userBw)} lbs`;
            } else {
                currentDisplay = `≥${bracket.levels[currentLevel - 1] || 0} ${unit === 'reps' ? 'reps' : unit}`;
            }
        }

        nextLevelQuests.push({ name: catItem.name, target, current: currentDisplay, level: currentLevel, nextLevel: currentLevel + 1, pct });
    }
    // Sort by proximity: highest percentage first (closest to leveling up), tested before untested
    nextLevelQuests.sort((a, b) => {
        if (a.pct > 0 && b.pct === 0) return -1;
        if (a.pct === 0 && b.pct > 0) return 1;
        return b.pct - a.pct;
    });

    return {
        power_level: finalExpertise,
        max_expertise: keyExerciseIds.size * 5,
        exercises_tracked: (workouts || []).length,
        highest_level_achieved: Math.max(0, ...Object.values(maxLevelPerExercise)),
        total_career_xp: totalXp,
        player_level: playerLevel,
        level_progress_percent: level_progress_percent,
        xp_to_next_level: xpNeeded - xpIntoLevel,
        no_alcohol_streak: alcoholStreak,
        no_vice_streak: viceStreak,
        nextLevelQuests,
        power_level_week_delta: (() => {
            const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
            const oldMax: Record<string, number> = {};
            for (const item of workouts || []) {
                if ((item.timestamp || 0) >= weekAgo) continue;
                const normalizedId = item.exercise_id?.replace(/^(five_rm_|one_rm_|est_1rm_)/, '');
                const matchesKey = keyExerciseIds.has(item.exercise_id) || keyExerciseIds.has(normalizedId);
                if (item.exercise_id && item.level > 0 && matchesKey) {
                    if (!oldMax[item.exercise_id] || item.level > oldMax[item.exercise_id]) {
                        oldMax[item.exercise_id] = item.level;
                    }
                }
            }
            const oldPL = Object.values(oldMax).reduce((s, v) => s + v, 0);
            return finalExpertise - oldPL;
        })(),
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

export const getActiveChallenge = async (userId: string): Promise<Challenge | null> => null;

// --- Workout Session ---

export interface SessionWorkout {
    exercise_id: string;
    value: string;
    raw_value: number;
    sets: any[];
    level: number;
    xp: number;
    rank_name: string | null;
}

export const getSessionWorkouts = async (sessionId: string): Promise<SessionWorkout[]> => {
    const supabase = createClient();
    const { data } = await supabase
        .from('workouts')
        .select('exercise_id, value, raw_value, sets, level, xp, rank_name')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });
    return data || [];
};

export const getExercisePRs = async (userId: string, exerciseIds: string[]): Promise<Record<string, number>> => {
    if (exerciseIds.length === 0) return {};
    const supabase = createClient();
    const { data } = await supabase
        .from('workouts')
        .select('exercise_id, sets')
        .eq('user_id', userId)
        .in('exercise_id', exerciseIds);

    const prs: Record<string, number> = {};
    (data || []).forEach(row => {
        const maxWeight = (row.sets || []).reduce((best: number, s: any) => Math.max(best, s.weight || 0), 0);
        if (maxWeight > (prs[row.exercise_id] || 0)) prs[row.exercise_id] = maxWeight;
    });
    return prs;
};

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

export const createChallenge = async (userId: string, opponentId: string | null, durationDays: number, mode?: string | null, startDate?: string | null, endDate?: string | null, includedMetrics?: string[]): Promise<DuelResponse | null> => {
    const supabase = createClient();
    const startAt = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : Math.floor(Date.now() / 1000);
    const endAt = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : startAt + (durationDays * 86400);

    const { data, error } = await supabase.from('duels').insert([{
        challenger_id: userId,
        opponent_id: opponentId,
        status: 'PENDING',
        start_at: startAt,
        end_at: endAt,
        ...(mode ? { mode } : {}),
        ...(includedMetrics ? { included_metrics: includedMetrics } : {}),
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
    const dateStr = getLocalDateStr(new Date(ts * 1000));
    const userLevelNum = currentLevelIndex + 1;
    const xpEarned = userLevelNum > 0 ? userLevelNum * 20 + 30 : 0; // matches logTrainingAction formula

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

