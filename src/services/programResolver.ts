import { SupabaseClient } from '@supabase/supabase-js';

export interface ResolvedProgram {
  programId: string;
  programName: string;
  dayType: string;
  blocks: any[];
  userEquipment: Set<string>;
  cardioType: string;
}

const WEEK_EPOCH = new Date('2026-01-05').getTime();

function getWeekNum(): number {
  return Math.floor((Date.now() - WEEK_EPOCH) / (7 * 24 * 60 * 60 * 1000));
}

function applyEquipmentSwaps(blocks: any[], userEquipment: Set<string>): any[] {
  return blocks.map(b => {
    if (b.block_type !== 'exercise' || !b.alt_exercise_id || !b.alt_equipment?.length) return b;
    const needsSwap = b.alt_equipment.some((eq: string) => !userEquipment.has(eq));
    if (needsSwap) return { ...b, exercise_id: b.alt_exercise_id };
    return b;
  });
}

/**
 * Resolves which program blocks to use for a given user + day.
 * Single source of truth for both /api/workout and /api/workouts/schedule.
 */
export async function resolveProgramBlocks(
  supabase: SupabaseClient,
  userId: string,
  day: string
): Promise<ResolvedProgram | null> {
  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('available_equipment, selected_path, preferred_cardio')
    .eq('id', userId)
    .single();

  const userEquipment = new Set<string>(profile?.available_equipment || []);
  const userPath = profile?.selected_path || 'hybrid';
  const cardioType = profile?.preferred_cardio || 'treadmill';
  const weekNum = getWeekNum();

  // 1. User-owned programs for this day (path-independent for user programs)
  const { data: userPrograms } = await supabase
    .from('workout_programs')
    .select('id, name, variant, day_type, muscle_focus')
    .eq('user_id', userId)
    .ilike('day_of_week', day)
    .order('variant');

  if (userPrograms && userPrograms.length > 0) {
    const startIdx = weekNum % userPrograms.length;
    const program = userPrograms[startIdx];
    const { data: blocks } = await supabase
      .from('program_blocks')
      .select('*')
      .eq('workout_id', program.id)
      .order('block_order');

    if (blocks && blocks.length > 0) {
      return {
        programId: program.id,
        programName: program.muscle_focus || program.name || 'Workout',
        dayType: program.day_type || 'training',
        blocks: applyEquipmentSwaps(blocks, userEquipment),
        userEquipment,
        cardioType,
      };
    }
  }

  // 2. Default programs for this path + day
  const { data: defaultPrograms } = await supabase
    .from('workout_programs')
    .select('id, name, variant, day_type, muscle_focus')
    .eq('is_default', true)
    .eq('training_path', userPath)
    .ilike('day_of_week', day)
    .order('variant');

  if (defaultPrograms && defaultPrograms.length > 0) {
    const startIdx = weekNum % defaultPrograms.length;
    const program = defaultPrograms[startIdx];
    const { data: blocks } = await supabase
      .from('program_blocks')
      .select('*')
      .eq('workout_id', program.id)
      .order('block_order');

    if (blocks && blocks.length > 0) {
      return {
        programId: program.id,
        programName: program.muscle_focus || program.name || 'Workout',
        dayType: program.day_type || 'training',
        blocks: applyEquipmentSwaps(blocks, userEquipment),
        userEquipment,
        cardioType,
      };
    }
  }

  return null;
}
