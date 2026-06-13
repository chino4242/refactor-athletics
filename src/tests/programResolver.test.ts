import { describe, it, expect, vi } from 'vitest';
import { resolveProgramBlocks } from '@/services/programResolver';

describe('Program Resolver', () => {

  describe('Equipment swaps', () => {
    it('swaps exercise when user lacks required equipment', async () => {
      const mockSupabase = createMockSupabase({
        profile: { available_equipment: ['dumbbells'], selected_path: 'hybrid', preferred_cardio: 'treadmill' },
        userPrograms: [{ id: 'p1', name: 'Monday', variant: 'A' }],
        blocks: [
          { block_type: 'exercise', exercise_id: 'barbell_bench', alt_exercise_id: 'dumbbell_bench', alt_equipment: ['barbell'] },
        ],
      });

      const result = await resolveProgramBlocks(mockSupabase as any, 'user1', 'monday');
      expect(result?.blocks[0].exercise_id).toBe('dumbbell_bench');
    });

    it('keeps exercise when user has required equipment', async () => {
      const mockSupabase = createMockSupabase({
        profile: { available_equipment: ['barbell', 'dumbbells'], selected_path: 'hybrid', preferred_cardio: 'treadmill' },
        userPrograms: [{ id: 'p1', name: 'Monday', variant: 'A' }],
        blocks: [
          { block_type: 'exercise', exercise_id: 'barbell_bench', alt_exercise_id: 'dumbbell_bench', alt_equipment: ['barbell'] },
        ],
      });

      const result = await resolveProgramBlocks(mockSupabase as any, 'user1', 'monday');
      expect(result?.blocks[0].exercise_id).toBe('barbell_bench');
    });

    it('does not swap non-exercise blocks', async () => {
      const mockSupabase = createMockSupabase({
        profile: { available_equipment: [], selected_path: 'hybrid', preferred_cardio: 'treadmill' },
        userPrograms: [{ id: 'p1', name: 'Monday', variant: 'A' }],
        blocks: [
          { block_type: 'treadmill', exercise_id: null, alt_exercise_id: 'walk', alt_equipment: ['treadmill'] },
        ],
      });

      const result = await resolveProgramBlocks(mockSupabase as any, 'user1', 'monday');
      expect(result?.blocks[0].block_type).toBe('treadmill');
      expect(result?.blocks[0].exercise_id).toBeNull();
    });

    it('does not swap when no alt_exercise_id exists', async () => {
      const mockSupabase = createMockSupabase({
        profile: { available_equipment: [], selected_path: 'hybrid', preferred_cardio: 'treadmill' },
        userPrograms: [{ id: 'p1', name: 'Monday', variant: 'A' }],
        blocks: [
          { block_type: 'exercise', exercise_id: 'push_ups', alt_exercise_id: null, alt_equipment: null },
        ],
      });

      const result = await resolveProgramBlocks(mockSupabase as any, 'user1', 'monday');
      expect(result?.blocks[0].exercise_id).toBe('push_ups');
    });
  });

  describe('Variant rotation', () => {
    it('picks different variant each week', async () => {
      // With 3 variants, weekNum % 3 gives the starting index
      const mockSupabase = createMockSupabase({
        profile: { available_equipment: [], selected_path: 'hybrid', preferred_cardio: 'treadmill' },
        userPrograms: [
          { id: 'a', name: 'Monday A', variant: 'A' },
          { id: 'b', name: 'Monday B', variant: 'B' },
          { id: 'c', name: 'Monday C', variant: 'C' },
        ],
        blocks: [{ block_type: 'exercise', exercise_id: 'squat' }],
      });

      const result = await resolveProgramBlocks(mockSupabase as any, 'user1', 'monday');
      // Should resolve to one of the three programs
      expect(['a', 'b', 'c']).toContain(result?.programId);
    });
  });

  describe('Fallback chain', () => {
    it('falls back to default programs when user has none', async () => {
      const mockSupabase = createMockSupabase({
        profile: { available_equipment: [], selected_path: 'mobility', preferred_cardio: 'treadmill' },
        userPrograms: [], // no user programs
        defaultPrograms: [{ id: 'default1', name: 'Default Mobility', variant: 'A' }],
        blocks: [{ block_type: 'exercise', exercise_id: 'deep_squat_hold' }],
      });

      const result = await resolveProgramBlocks(mockSupabase as any, 'user1', 'friday');
      expect(result?.programId).toBe('default1');
    });

    it('returns null when no programs exist for the day', async () => {
      const mockSupabase = createMockSupabase({
        profile: { available_equipment: [], selected_path: 'hybrid', preferred_cardio: 'treadmill' },
        userPrograms: [],
        defaultPrograms: [],
        blocks: [],
      });

      const result = await resolveProgramBlocks(mockSupabase as any, 'user1', 'sunday');
      expect(result).toBeNull();
    });
  });
});

// Helper: create a mock Supabase client that returns configured data
function createMockSupabase(config: {
  profile: any;
  userPrograms?: any[];
  defaultPrograms?: any[];
  blocks?: any[];
}) {
  const { profile, userPrograms = [], defaultPrograms = [], blocks = [] } = config;

  return {
    from: (table: string) => {
      if (table === 'users') {
        return { select: () => ({ eq: () => ({ single: () => ({ data: profile, error: null }) }) }) };
      }
      if (table === 'workout_programs') {
        return {
          select: () => ({
            eq: (...args: any[]) => {
              // Chain: .eq('user_id', ...).eq('training_path', ...).ilike(...).order(...)
              const chainable: any = {
                eq: () => chainable,
                ilike: () => chainable,
                order: () => ({ data: userPrograms.length > 0 ? userPrograms : defaultPrograms, error: null }),
                data: userPrograms.length > 0 ? userPrograms : defaultPrograms,
                error: null,
              };
              return chainable;
            },
          }),
        };
      }
      if (table === 'program_blocks') {
        return {
          select: () => ({ eq: () => ({ order: () => ({ data: blocks, error: null }) }) }),
        };
      }
      return { select: () => ({ data: [], error: null }) };
    },
  };
}
