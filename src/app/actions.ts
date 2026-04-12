"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function logHabitAction(
    userId: string,
    habitId: string,
    value: number,
    bodyweight?: number,
    label?: string,
    timestamp?: number
) {
    const supabase = await createClient();
    const ts = timestamp || Math.floor(Date.now() / 1000);
    const dateStr = new Date(ts * 1000).toISOString().split('T')[0];

    // Route to appropriate table based on habitId
    if (habitId.startsWith('macro_')) {
        // Nutrition logging
        const macroType = habitId.replace('macro_', ''); // 'protein', 'carbs', 'fat', 'calories'
        const xp = 10;

        const { error } = await supabase
            .from('nutrition_logs')
            .insert({
                user_id: userId,
                date: dateStr,
                timestamp: ts,
                macro_type: macroType,
                amount: value,
                xp: xp,
                label: label
            });

        if (error) {
            console.error("Error logging nutrition:", error);
            throw error;
        }

        revalidatePath('/');
        return { xp_earned: xp };
    } else if (habitId.startsWith('habit_')) {
        // Habit logging - scaled XP
        let xp = 10;
        if (habitId === 'habit_steps') {
            xp = Math.round(value * 0.015); // 10,000 steps = 150 XP
        } else if (habitId === 'habit_water') {
            xp = Math.round(value * 0.25); // 64 oz = 16 XP
        } else if (habitId === 'habit_sleep') {
            xp = Math.round(value * 2); // 8 hours = 16 XP
        } else if (habitId === 'habit_meal_prep') {
            xp = 100;
        } else {
            xp = 25; // creatine, no_alcohol, no_vice, etc.
        }

        const { error } = await supabase
            .from('habit_logs')
            .insert({
                user_id: userId,
                habit_id: habitId,
                date: dateStr,
                timestamp: ts,
                value: value,
                xp: xp
            });

        if (error) {
            console.error("Error logging habit:", error);
            throw error;
        }

        revalidatePath('/');
        return { xp_earned: xp };
    } else {
        throw new Error(`Unknown habit type: ${habitId}`);
    }
}

export async function deleteHistoryItemAction(userId: string, timestamp: number) {
    const supabase = await createClient();
    
    // Delete from all tables (we don't know which one it's in)
    const [workoutsResult, nutritionResult, habitsResult, measurementsResult] = await Promise.all([
        supabase.from('workouts').delete().match({ user_id: userId, timestamp }),
        supabase.from('nutrition_logs').delete().match({ user_id: userId, timestamp }),
        supabase.from('habit_logs').delete().match({ user_id: userId, timestamp }),
        supabase.from('body_measurements').delete().match({ user_id: userId, timestamp })
    ]);

    // Check if any had errors
    const errors = [workoutsResult.error, nutritionResult.error, habitsResult.error, measurementsResult.error].filter(Boolean);
    if (errors.length > 0) {
        console.error("Error deleting history item:", errors);
        throw errors[0];
    }

    revalidatePath('/', 'layout');
    return { status: 'success' };
}

export async function logTrainingAction(
    userId: string,
    exerciseId: string,
    bodyweight: number,
    sex: string,
    sets: any[],
    sessionId?: string
) {
    console.log("logTrainingAction called with:", { userId, exerciseId, bodyweight, sex, sets });
    const supabase = await createClient();
    
    // Fetch catalog and user profile
    const [catalogResult, profileResult] = await Promise.all([
        supabase.from('catalog').select('*').eq('id', exerciseId).single(),
        supabase.from('users').select('age').eq('id', userId).single()
    ]);
    
    const catalogItem = catalogResult.data;
    const age = profileResult.data?.age || 25;
    const xpFactor = catalogItem ? (catalogItem.xp_factor || 1) : 1;
    const normalizationFactor = catalogItem?.normalization_factor || 1.0;
    const normalizesTo = catalogItem?.normalizes_to;

    // If this exercise normalizes to a base exercise, fetch that exercise's standards
    let standards = catalogItem?.standards || {};
    if (normalizesTo && (!standards.brackets || Object.keys(standards).length === 0)) {
        const { data: baseExercise } = await supabase.from('catalog').select('standards').eq('id', normalizesTo).single();
        if (baseExercise?.standards?.brackets) {
            standards = baseExercise.standards;
        }
    }

    // Find best set for rank calculation
    let bestValue = 0;
    const exerciseType = catalogItem?.type?.toLowerCase() || '';
    const exerciseName = catalogItem?.name?.toLowerCase() || '';
    const is5RM = exerciseName.includes('5rm') || exerciseName.includes('5 rm');
    
    if (exerciseType.includes('weight') || exerciseType === 'strength') {
        if (is5RM) {
            bestValue = Math.max(...sets.map(s => s.weight || 0));
        } else {
            bestValue = Math.max(...sets.map(s => (s.weight || 0) * (1 + (s.reps || 1) / 30)));
        }
    } else if (exerciseType.includes('reps') || exerciseType === 'bodyweight') {
        bestValue = Math.max(...sets.map(s => s.reps || 0));
    } else if (exerciseType.includes('time') || exerciseType === 'duration') {
        bestValue = Math.max(...sets.map(s => s.duration || 0));
    } else if (exerciseType.includes('distance') || exerciseType === 'cardio') {
        bestValue = Math.max(...sets.map(s => s.distance || 0));
    } else {
        // Fallback: if sets have weight, use Epley; if reps only, use reps
        const hasWeight = sets.some(s => s.weight > 0);
        if (hasWeight) {
            bestValue = Math.max(...sets.map(s => (s.weight || 0) * (1 + (s.reps || 1) / 30)));
        } else {
            bestValue = Math.max(...sets.map(s => s.reps || s.duration || s.distance || 0));
        }
    }

    // Calculate rank using standards (may come from base exercise via normalizes_to)
    const scoring = standards.scoring || 'higher_is_better';
    const isXBW = standards.unit === 'xBW';
    
    // Apply normalization factor (e.g., dumbbell 1.15x, smith 0.85x)
    let normalizedValue = bestValue * normalizationFactor;
    
    let finalValue = normalizedValue;
    if (exerciseId === 'weighted_pullup' || exerciseId === 'five_rm_weighted_pull_up') {
        finalValue = normalizedValue + bodyweight;
    }
    const comparisonValue = isXBW ? finalValue / bodyweight : finalValue;

    const sexKey = (sex || 'male').toLowerCase() === 'female' ? 'female' : 'male';
    
    const brackets = standards.brackets?.[sexKey] || [];
    let ageBracket = brackets.find((b: any) => age >= b.min && age <= b.max);
    if (!ageBracket && brackets.length > 0) {
        ageBracket = age > 99 ? brackets[brackets.length - 1] : brackets[0];
    }
    const levels = ageBracket ? ageBracket.levels : [];

    let currentLevelIndex = -1;
    for (let i = 0; i < levels.length; i++) {
        const threshold = levels[i];
        const passes = scoring === 'lower_is_better' ? comparisonValue <= threshold : comparisonValue >= threshold;
        if (passes) currentLevelIndex = i;
    }

    // currentLevelIndex represents the highest threshold passed (0-4 for 5 thresholds)
    // Level is currentLevelIndex + 1, where level 0 = failed all thresholds
    const userLevel = currentLevelIndex + 1;
    const rankNames = ["Peasant", "Rookie", "Amateur", "Contender", "Pro", "Champion", "Legend"];
    const rankName = rankNames[userLevel] || "Peasant";
    const xpEarned = userLevel > 0 ? userLevel * 50 : 0;

    // Calculate total XP from sets
    let totalXp = 0;
    for (const set of sets) {
        let setXp = 0;
        if (exerciseType.includes('time') || exerciseType.includes('duration') || exerciseType.includes('distance') || exerciseType === 'cardio') {
            if (set.duration && set.duration > 0) {
                setXp = Math.floor(set.duration * 8 * xpFactor);
            } else if (set.distance && set.distance > 0) {
                const estMinutes = (set.distance / 1609.34) * 10;
                setXp = Math.floor(estMinutes * 8 * xpFactor);
            } else {
                setXp = Math.floor(10 * xpFactor);
            }
        } else {
            setXp = Math.floor((set.reps || 10) * xpFactor);
        }
        totalXp += setXp;
    }
    totalXp += xpEarned; // Add rank XP

    const ts = Math.floor(Date.now() / 1000);
    const dateStr = new Date(ts * 1000).toISOString().split('T')[0];

    // For 5RM exercises, show lbs instead of xBW
    const displayUnit = is5RM ? 'lbs' : (standards.unit || '');
    
    const workoutData = {
        user_id: userId,
        exercise_id: exerciseId,
        timestamp: ts,
        date: dateStr,
        value: `${Math.round(bestValue)} ${displayUnit}`,
        raw_value: bestValue,
        sets: sets,
        level: userLevel,
        xp: totalXp,
        rank_name: rankName,
        ...(sessionId ? { session_id: sessionId } : {})
    };

    console.log("Saving workout:", workoutData);

    const { error } = await supabase
        .from('workouts')
        .insert(workoutData);

    if (error) {
        console.error("Error inserting workout:", error);
        throw error;
    }

    revalidatePath('/', 'layout');
    return { 
        xp_earned: totalXp,
        level: userLevel,
        rank_name: rankName,
        raw_value: bestValue,
        value: workoutData.value
    };
}

export async function logWorkoutBlockAction(
    userId: string,
    blockName: string,
    details: string,
    xp: number,
    activityType: string = "Strength",
    exercises?: any[],
    sessionId?: string
) {
    const supabase = await createClient();
    const ts = Math.floor(Date.now() / 1000);
    const dateStr = new Date(ts * 1000).toISOString().split('T')[0];

    const { error } = await supabase
        .from('workouts')
        .insert({
            user_id: userId,
            exercise_id: `block_${blockName.toLowerCase().replace(/\s+/g, '_')}`,
            timestamp: ts,
            date: dateStr,
            value: details,
            raw_value: xp,
            sets: exercises || [],
            level: 0,
            xp: xp,
            rank_name: activityType,
            ...(sessionId ? { session_id: sessionId } : {})
        });

    if (error) throw error;

    revalidatePath('/', 'layout');
    return { status: 'success' };
}

export async function logBodyMeasurementAction(
    userId: string,
    measurements: {
        weight?: number;
        waist?: number;
        arms?: number;
        chest?: number;
        legs?: number;
        shoulders?: number;
        body_fat_percentage?: number;
    },
    timestamp?: number
) {
    const supabase = await createClient();
    const ts = timestamp || Math.floor(Date.now() / 1000);
    const dateStr = new Date(ts * 1000).toISOString().split('T')[0];
    const xp = 5;

    // Check for existing row on this date to merge measurements
    const { data: existing } = await supabase
        .from('body_measurements')
        .select('id')
        .eq('user_id', userId)
        .eq('date', dateStr)
        .limit(1)
        .single();

    let error;
    if (existing) {
        ({ error } = await supabase
            .from('body_measurements')
            .update({ ...measurements, timestamp: ts })
            .eq('id', existing.id));
    } else {
        ({ error } = await supabase
            .from('body_measurements')
            .insert({
                user_id: userId,
                date: dateStr,
                timestamp: ts,
                ...measurements,
                xp: xp
            }));
    }

    if (error) {
        console.error("Error logging body measurement:", error);
        throw error;
    }

    revalidatePath('/');
    return { xp_earned: xp };
}
