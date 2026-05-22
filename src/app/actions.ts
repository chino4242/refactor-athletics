"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { stepsToXp, checkLevelUp } from "@/utils/xp";
import { calculateXp, awardXp } from "@/utils/xp-service";

/** After granting XP, check if user leveled up and set pending flag */
async function maybeSetLevelUp(supabase: any, userId: string, xpEarned: number, sourceType: string) {
    try {
        const [{ data: w }, { data: n }, { data: h }, { data: m }] = await Promise.all([
            supabase.from('workouts').select('xp').eq('user_id', userId),
            supabase.from('nutrition_logs').select('xp').eq('user_id', userId),
            supabase.from('habit_logs').select('xp').eq('user_id', userId),
            supabase.from('body_measurements').select('xp').eq('user_id', userId),
        ]);
        const totalXp = [...(w || []), ...(n || []), ...(h || []), ...(m || [])].reduce((s, r) => s + (r.xp || 0), 0);
        const result = checkLevelUp(totalXp - xpEarned, xpEarned);
        if (result) {
            await supabase.from('users').update({
                pending_level_up: { level: result.newLevel, timestamp: Math.floor(Date.now() / 1000), source: sourceType },
                unseen_xp: 0,
            }).eq('id', userId);
        }
    } catch {}
}

function getLocalDate(ts?: number): string {
    const d = ts ? new Date(ts * 1000) : new Date();
    // Read user's timezone from cookie (set by client), fallback to America/New_York
    let tz = 'America/New_York';
    try {
        const cookieStore = cookies();
        tz = (cookieStore as any).get?.('timezone')?.value || 'America/New_York';
    } catch {}
    return d.toLocaleDateString('en-CA', { timeZone: tz });
}

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
    const dateStr = getLocalDate(ts);

    // Route to appropriate table based on habitId
    if (habitId.startsWith('macro_')) {
        // Nutrition logging
        const macroType = habitId.replace('macro_', ''); // 'protein', 'carbs', 'fat', 'calories'

        // XP: from centralized service, skip for Auto-Cal
        const isAutoCal = label?.startsWith('Auto-Cal');
        const xp = isAutoCal ? 0 : calculateXp({ type: 'nutrition', entryCount: 1 });

        // "Set" mode for calories_burned: replace today's entries instead of adding
        if (macroType === 'calories_burned') {
            await supabase
                .from('nutrition_logs')
                .delete()
                .eq('user_id', userId)
                .eq('date', dateStr)
                .eq('macro_type', macroType);
        }

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

        await maybeSetLevelUp(supabase, userId, xp, 'nutrition');

        // Write to XP ledger via service
        if (!isAutoCal && xp > 0) {
            await awardXp(supabase, userId, { type: 'nutrition', entryCount: 1 }, label || macroType, false);
        }

        revalidatePath('/');
        return { xp_earned: xp, timestamp: ts };
    } else if (habitId.startsWith('habit_')) {
        // Habit logging — XP from centralized service
        let event: any;
        if (habitId === 'habit_steps') event = { type: 'steps', value };
        else if (habitId === 'habit_water') event = { type: 'water', value };
        else if (habitId === 'habit_sleep') event = { type: 'sleep', value };
        else if (habitId === 'habit_meal_prep') event = { type: 'meal_prep' };
        else if (habitId === 'habit_exercise_minutes') event = null;
        else if (habitId === 'habit_no_alcohol' || habitId === 'habit_no_vice' || habitId === 'habit_creatine') event = { type: 'habit_binary' };
        else event = { type: 'habit_other' };

        const xp = event ? calculateXp(event) : 0;

        // If this is a "Set" (sync) operation, delete existing entries for this habit today first
        if (label?.includes('(Sync)')) {
            await supabase
                .from('habit_logs')
                .delete()
                .eq('user_id', userId)
                .eq('habit_id', habitId)
                .eq('date', dateStr);
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

        await maybeSetLevelUp(supabase, userId, xp, 'habit');

        // Write to XP ledger via service
        await awardXp(supabase, userId, event || { type: 'habit_other' }, label || habitId.replace('habit_', ''), label?.includes('(Sync)') || false);

        revalidatePath('/');
        return { xp_earned: xp, timestamp: ts };
    } else {
        throw new Error(`Unknown habit type: ${habitId}`);
    }
}

export async function resetHabitTodayAction(userId: string, habitId: string, date?: string) {
    const supabase = await createClient();
    const dateStr = date || new Date().toLocaleDateString('en-CA');

    if (habitId.startsWith('macro_')) {
        await supabase.from('nutrition_logs').delete().eq('user_id', userId).eq('date', dateStr).eq('macro_type', habitId.replace('macro_', ''));
    } else {
        await supabase.from('habit_logs').delete().eq('user_id', userId).eq('date', dateStr).eq('habit_id', habitId);
    }

    revalidatePath('/');
    return { status: 'ok' };
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
    const supabase = await createClient();
    
    // Fetch catalog and user profile
    const [catalogResult, profileResult] = await Promise.all([
        supabase.from('catalog').select('*').eq('id', exerciseId).single(),
        supabase.from('users').select('age').eq('id', userId).single()
    ]);

    // Get previous best level for this exercise
    const { data: prevBest } = await supabase.from('workouts').select('level').eq('user_id', userId).eq('exercise_id', exerciseId).order('level', { ascending: false }).limit(1).single();
    
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
            bestValue = Math.max(...sets.map(s => (s.weight || 0) * (1 + Math.min(s.reps || 1, 100) / 30)));
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
            bestValue = Math.max(...sets.map(s => (s.weight || 0) * (1 + Math.min(s.reps || 1, 100) / 30)));
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
    const xpEarned = userLevel > 0 ? userLevel * 20 + 30 : 0; // L1=50, L3=90, L5=130, scales but doesn't dominate

    // Calculate distance to next rank threshold
    let nextThresholdLbs: number | null = null;
    let nextRankName: string | null = null;
    const nextIdx = currentLevelIndex + 1;
    if (nextIdx < levels.length) {
        const nextThreshold = levels[nextIdx];
        const currentRaw = isXBW ? comparisonValue * bodyweight : comparisonValue;
        const targetRaw = isXBW ? nextThreshold * bodyweight : nextThreshold;
        const gap = Math.round(targetRaw / normalizationFactor - bestValue);
        if (gap > 0 && gap <= 10) {
            nextThresholdLbs = gap;
            nextRankName = rankNames[userLevel + 1] || null;
        }
    }

    // Calculate total XP from sets
    let totalXp = 0;
    for (const set of sets) {
        let setXp = 0;
        if (exerciseType.includes('time') || exerciseType.includes('duration') || exerciseType.includes('distance') || exerciseType === 'cardio') {
            if (set.duration && set.duration > 0) {
                // Duration may be in minutes or seconds — normalize to minutes
                const durationMins = set.duration > 300 ? set.duration / 60 : set.duration;
                setXp = Math.floor(durationMins * 8 * xpFactor);
            } else if (set.distance && set.distance > 0) {
                const estMinutes = (set.distance / 1609.34) * 10;
                setXp = Math.floor(estMinutes * 8 * xpFactor);
            } else {
                setXp = Math.floor(10 * xpFactor);
            }
        } else if (set.weight && set.weight > 0 && bodyweight > 0) {
            // Weight-based: heavier lifts earn more XP
            setXp = Math.floor((set.weight / bodyweight) * (set.reps || 10) * 10 * xpFactor);
        } else {
            // Bodyweight/reps-only exercises
            setXp = Math.floor((set.reps || 10) * xpFactor);
        }
        totalXp += setXp;
    }
    totalXp += xpEarned; // Add rank XP

    const ts = Math.floor(Date.now() / 1000);
    const dateStr = getLocalDate(ts);

    // For 5RM exercises, show lbs instead of xBW
    const displayUnit = is5RM ? 'lbs' : (standards.unit || '');
    
    // Best actual set (heaviest weight lifted)
    const actualBest = (exerciseType.includes('weight') || exerciseType === 'strength')
        ? Math.max(...sets.map(s => s.weight || 0))
        : null;
    // Best set description (e.g. "165 × 8")
    const bestSet = (exerciseType.includes('weight') || exerciseType === 'strength')
        ? sets.reduce((best, s) => {
            const e1rm = (s.weight || 0) * (1 + Math.min(s.reps || 1, 100) / 30);
            return e1rm > (best.e1rm || 0) ? { weight: s.weight, reps: s.reps, e1rm } : best;
          }, { weight: 0, reps: 0, e1rm: 0 })
        : null;

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


    const { error } = await supabase
        .from('workouts')
        .insert(workoutData);

    if (error) {
        console.error("Error inserting workout:", error);
        throw error;
    }

    revalidatePath('/', 'layout');

    // Post to party feed
    const { postPartyEvent } = await import('@/utils/partyEvents');
    const partyExName = exerciseId.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const partyXp = Math.round(totalXp * 0.5);
    await postPartyEvent(supabase, userId, {
        event_type: userLevel > (prevBest?.level || 0) ? 'rank_up' : 'workout',
        summary: userLevel > (prevBest?.level || 0)
            ? `ranked up on ${partyExName} → ${rankName}`
            : `logged ${partyExName} · ${workoutData.value}`,
        xp_value: partyXp,
        metadata: { exercise: exerciseId, level: userLevel, rank: rankName },
    });

    return { 
        xp_earned: totalXp,
        level: userLevel,
        previous_level: prevBest?.level || 0,
        rank_name: rankName,
        raw_value: bestValue,
        value: workoutData.value,
        best_set: bestSet ? `${bestSet.weight} × ${bestSet.reps}` : null,
        e1rm: (exerciseType.includes('weight') || exerciseType === 'strength') && !is5RM ? Math.round(bestValue) : null,
        next_threshold_lbs: nextThresholdLbs,
        next_rank_name: nextRankName,
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
    const dateStr = getLocalDate(ts);

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
        lean_body_mass?: number;
        left_arm_muscle?: number;
        right_arm_muscle?: number;
        trunk_muscle?: number;
        left_leg_muscle?: number;
        right_leg_muscle?: number;
        left_arm_fat?: number;
        right_arm_fat?: number;
        trunk_fat?: number;
        left_leg_fat?: number;
        right_leg_fat?: number;
        vo2_max?: number;
        bmr?: number;
        height?: number;
    },
    source?: string,
    timestamp?: number
) {
    const supabase = await createClient();
    const ts = timestamp || Math.floor(Date.now() / 1000);
    const dateStr = getLocalDate(ts);
    const xp = 5;

    // Build source metadata for each provided field
    const sourceLabel = source || 'manual';
    const sourceMap: Record<string, string> = {};
    for (const key of Object.keys(measurements)) {
        if ((measurements as any)[key] != null) sourceMap[key] = sourceLabel;
    }

    // Check for existing row on this date to merge measurements
    const { data: existing } = await supabase
        .from('body_measurements')
        .select('id, source')
        .eq('user_id', userId)
        .eq('date', dateStr)
        .limit(1)
        .single();

    // Filter out null/undefined values
    const cleanMeasurements: Record<string, any> = {};
    for (const [k, v] of Object.entries(measurements)) {
        if (v != null) cleanMeasurements[k] = v;
    }

    let error;
    if (existing) {
        const mergedSource = { ...(existing.source || {}), ...sourceMap };
        ({ error } = await supabase
            .from('body_measurements')
            .update({ ...cleanMeasurements, source: mergedSource, timestamp: ts })
            .eq('id', existing.id));
    } else {
        ({ error } = await supabase
            .from('body_measurements')
            .insert({
                user_id: userId,
                date: dateStr,
                timestamp: ts,
                ...cleanMeasurements,
                source: sourceMap,
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

export async function deleteBodyMeasurementAction(measurementId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('body_measurements').delete().eq('id', measurementId);
    if (error) throw error;
    revalidatePath('/');
}

export async function deleteAllBodyMeasurementsAction(userId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('body_measurements').delete().eq('user_id', userId);
    if (error) throw error;
    revalidatePath('/');
}

export async function assignDefaultProgram(userId: string, trainingPath: string, equipment: string[]) {
    const supabase = await createClient();
    const equipSet = new Set(equipment || []);

    // Fetch default program days for this path
    const { data: defaults } = await supabase
        .from('workout_programs')
        .select('id, name, description, day_of_week')
        .eq('is_default', true)
        .eq('training_path', trainingPath);

    if (!defaults?.length) return;

    // Delete any existing user programs for this path
    await supabase
        .from('workout_programs')
        .delete()
        .eq('user_id', userId)
        .eq('training_path', trainingPath);

    for (const day of defaults) {
        // Create user's copy of the program day
        const { data: userProg } = await supabase
            .from('workout_programs')
            .insert({
                user_id: userId,
                name: day.name,
                description: day.description,
                training_path: trainingPath,
                day_of_week: day.day_of_week,
                source_program_id: day.id,
            })
            .select('id')
            .single();

        if (!userProg) continue;

        // Fetch blocks for this default day
        const { data: blocks } = await supabase
            .from('program_blocks')
            .select('*')
            .eq('workout_id', day.id)
            .order('block_order');

        if (!blocks?.length) continue;

        // Copy blocks, swapping exercises based on equipment
        const userBlocks = blocks.map((b: any) => {
            let exerciseId = b.exercise_id;

            // If user lacks required equipment and an alt exists, swap
            if (b.alt_exercise_id && b.alt_equipment?.length) {
                const needsAlt = b.alt_equipment.some((eq: string) => !equipSet.has(eq));
                if (needsAlt) exerciseId = b.alt_exercise_id;
            }

            return {
                workout_id: userProg.id,
                block_order: b.block_order,
                block_type: b.block_type,
                exercise_id: exerciseId,
                target_sets: b.target_sets,
                target_reps: b.target_reps,
                target_weight: b.target_weight,
                duration_seconds: b.duration_seconds,
                incline: b.incline,
                intensity: b.intensity,
                notes: b.notes,
                alt_exercise_id: b.alt_exercise_id,
                alt_equipment: b.alt_equipment,
                outdoor_alternative: b.outdoor_alternative,
                section: b.section,
                target_duration_seconds: b.target_duration_seconds,
                rest_seconds: b.rest_seconds,
                is_superset: b.is_superset,
                superset_group: b.superset_group,
                exercises: b.exercises,
            };
        });

        await supabase.from('program_blocks').insert(userBlocks);
    }

    revalidatePath('/train');
}
