import { createClient } from '@/utils/supabase/client';
import type { WorkoutProgram, ProgramBlock } from '@/types';

// ============================================================================
// WORKOUT PROGRAMS
// ============================================================================

export const getPrograms = async (userId: string): Promise<WorkoutProgram[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('workout_programs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const createProgram = async (userId: string, name: string, description?: string): Promise<WorkoutProgram> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('workout_programs')
        .insert({ user_id: userId, name, description })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteProgram = async (programId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
        .from('workout_programs')
        .delete()
        .eq('id', programId);

    if (error) throw error;
};

// ============================================================================
// PROGRAM BLOCKS
// ============================================================================

export const getProgramBlocks = async (programId: string): Promise<ProgramBlock[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('program_blocks')
        .select('*')
        .eq('program_id', programId)
        .order('block_order', { ascending: true });

    if (error) throw error;
    return data || [];
};

export const addProgramBlock = async (block: Partial<ProgramBlock>): Promise<ProgramBlock> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('program_blocks')
        .insert(block)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteProgramBlock = async (blockId: string): Promise<void> => {
    const supabase = createClient();
    const { error } = await supabase
        .from('program_blocks')
        .delete()
        .eq('id', blockId);

    if (error) throw error;
};
