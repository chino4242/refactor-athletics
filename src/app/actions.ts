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

    revalidatePath('/');
    return { xp_earned: xp };
}

export async function deleteHistoryItemAction(userId: string, timestamp: number) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('history')
        .delete()
        .match({ user_id: userId, timestamp });

    if (error) {
        console.error("Error deleting history item:", error);
        throw error;
    }

    revalidatePath('/', 'layout'); // revalidate layout to refresh ALL pages (track, train, profile)
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

    // We fetch catalog locally to get XP factor
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

    revalidatePath('/', 'layout');
    return { status: 'success' };
}
