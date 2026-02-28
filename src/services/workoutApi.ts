import { createClient } from '@/utils/supabase/client';
import type { Workout, WorkoutBlock } from '@/types';

// ============================================================================
// WORKOUTS
// ============================================================================

export const getWorkouts = async (userId: string): Promise<Workout[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('workout_programs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const createWorkout = async (userId: string, name: string, description?: string): Promise<Workout> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('workout_programs')
        .insert({ user_id: userId, name, description })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteWorkout = async (workoutId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
        .from('workout_programs')
        .delete()
        .eq('id', workoutId);

    if (error) throw error;
};

// ============================================================================
// WORKOUT BLOCKS
// ============================================================================

export const getWorkoutBlocks = async (workoutId: string): Promise<WorkoutBlock[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('program_blocks')
        .select('*')
        .eq('program_id', workoutId)
        .order('block_order', { ascending: true });

    if (error) throw error;
    return (data || []).map((b: any) => ({ ...b, workout_id: b.program_id }));
};

export const addWorkoutBlock = async (block: Partial<WorkoutBlock>): Promise<WorkoutBlock> => {
    const supabase = createClient();
    const dbBlock: any = { ...block, program_id: block.workout_id };
    delete dbBlock.workout_id;

    const { data, error } = await supabase
        .from('program_blocks')
        .insert(dbBlock)
        .select()
        .single();

    if (error) throw error;
    return { ...data, workout_id: data.program_id };
};

export const deleteWorkoutBlock = async (blockId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
        .from('program_blocks')
        .delete()
        .eq('id', blockId);

    if (error) throw error;
};

export const updateWorkoutBlock = async (blockId: string, updates: Partial<WorkoutBlock>): Promise<WorkoutBlock> => {
    const supabase = createClient();
    const dbUpdates: any = { ...updates };
    if (dbUpdates.workout_id) {
        dbUpdates.program_id = dbUpdates.workout_id;
        delete dbUpdates.workout_id;
    }

    const { data, error } = await supabase
        .from('program_blocks')
        .update(dbUpdates)
        .eq('id', blockId)
        .select()
        .single();

    if (error) throw error;
    return { ...data, workout_id: data.program_id };
};

// ============================================================================
// WORKOUT SCHEDULES
// ============================================================================

export const scheduleWorkout = async (userId: string, workoutId: string, date: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
        .from('program_schedule')
        .insert({
            user_id: userId,
            program_id: workoutId,
            scheduled_date: date,
            completed: false
        });

    if (error) throw error;
};
