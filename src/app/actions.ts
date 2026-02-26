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
        // Habit logging
        const xp = habitId.includes('meal_prep') ? 100 : (habitId.includes('sleep') ? 15 : 10);

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
    sets: any[]
) {
    const supabase = await createClient();
    let totalXp = 0;

    // Fetch catalog to get XP factor
    const { data: catalogItem } = await supabase.from('catalog').select('*').eq('id', exerciseId).single();
    const xpFactor = catalogItem ? (catalogItem.xp_factor || 1) : 1;

    // Calculate XP
    for (const set of sets) {
        const setXp = Math.floor((set.reps || 10) * xpFactor);
        totalXp += setXp;
    }

    const ts = Math.floor(Date.now() / 1000);
    const dateStr = new Date(ts * 1000).toISOString().split('T')[0];

    const { error } = await supabase
        .from('workouts')
        .insert({
            user_id: userId,
            exercise_id: exerciseId,
            timestamp: ts,
            date: dateStr,
            value: sets.length > 0 ? `${sets.length} sets` : 'Completed',
            raw_value: sets.length,
            sets: sets,
            level: 1,
            xp: totalXp,
            rank_name: 'Novice'
        });

    if (error) throw error;

    revalidatePath('/', 'layout');
    return { xp_earned: totalXp };
}

export async function logWorkoutBlockAction(
    userId: string,
    blockName: string,
    details: string,
    xp: number,
    activityType: string = "Strength",
    exercises?: any[]
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
            level: 1,
            xp: xp,
            rank_name: activityType
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

    const { error } = await supabase
        .from('body_measurements')
        .insert({
            user_id: userId,
            date: dateStr,
            timestamp: ts,
            ...measurements,
            xp: xp
        });

    if (error) {
        console.error("Error logging body measurement:", error);
        throw error;
    }

    revalidatePath('/');
    return { xp_earned: xp };
}
