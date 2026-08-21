import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({ select: mockSelect }));
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ from: mockFrom }),
}));

// We'll test the decay logic by importing and testing the internal calculation
// Since getPowerLevelV2 is tightly coupled to Supabase, we test via mocked responses

describe('Power Level V2', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // Helper: set up mocked Supabase responses
  function setupMocks(workouts: any[], catalog: any[], profile: any) {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workouts') return {
        select: () => ({ eq: () => ({ gte: () => ({ data: workouts, error: null }) }) }),
      };
      if (table === 'catalog') return {
        select: () => ({ not: () => ({ data: catalog, error: null }) }),
      };
      if (table === 'users') return {
        select: () => ({ eq: () => ({ single: () => ({ data: profile, error: null }) }) }),
      };
      return { select: () => ({ data: [], error: null }) };
    });
  }

  describe('Decay Windows', () => {
    it('L1-L2 exercises are valid for 90 days', async () => {
      const today = new Date();
      const daysAgo = (n: number) => {
        const d = new Date(today); d.setDate(d.getDate() - n);
        return d.toLocaleDateString('en-CA');
      };

      // L2 logged 89 days ago — should still be valid
      const workouts = [
        { exercise_id: 'back_squat', level: 2, raw_value: 200, date: daysAgo(89), timestamp: 0 },
      ];
      const catalog = [{ id: 'back_squat', name: 'Back Squat', standards: { brackets: {} } }];
      const profile = { selected_path: 'hybrid', age: 28, sex: 'male', bodyweight: 180 };

      setupMocks(workouts, catalog, profile);
      const { getPowerLevelV2 } = await import('@/services/powerLevelV2');
      const result = await getPowerLevelV2('user1');

      const squat = result.exercises.find(e => e.exerciseId === 'back_squat');
      expect(squat?.level).toBe(2);
      expect(squat?.expired).toBe(false);
    });

    it('L2 exercise expires after 90 days', async () => {
      const today = new Date();
      const daysAgo = (n: number) => {
        const d = new Date(today); d.setDate(d.getDate() - n);
        return d.toLocaleDateString('en-CA');
      };

      const workouts = [
        { exercise_id: 'back_squat', level: 2, raw_value: 200, date: daysAgo(91), timestamp: 0 },
      ];
      const catalog = [{ id: 'back_squat', name: 'Back Squat', standards: { brackets: {} } }];
      const profile = { selected_path: 'hybrid', age: 28, sex: 'male', bodyweight: 180 };

      setupMocks(workouts, catalog, profile);
      const { getPowerLevelV2 } = await import('@/services/powerLevelV2');
      const result = await getPowerLevelV2('user1');

      // 91 days > 90 window → expired, level should be 0
      const squat = result.exercises.find(e => e.exerciseId === 'back_squat');
      expect(squat?.level).toBe(0);
      expect(squat?.expired).toBe(true);
    });

    it('L5 exercise expires after 45 days', async () => {
      const today = new Date();
      const daysAgo = (n: number) => {
        const d = new Date(today); d.setDate(d.getDate() - n);
        return d.toLocaleDateString('en-CA');
      };

      const workouts = [
        { exercise_id: 'back_squat', level: 5, raw_value: 400, date: daysAgo(46), timestamp: 0 },
      ];
      const catalog = [{ id: 'back_squat', name: 'Back Squat', standards: { brackets: {} } }];
      const profile = { selected_path: 'hybrid', age: 28, sex: 'male', bodyweight: 180 };

      setupMocks(workouts, catalog, profile);
      const { getPowerLevelV2 } = await import('@/services/powerLevelV2');
      const result = await getPowerLevelV2('user1');

      const squat = result.exercises.find(e => e.exerciseId === 'back_squat');
      expect(squat?.level).toBe(0);
      expect(squat?.expired).toBe(true);
    });

    it('L3-L4 exercises are valid for 60 days', async () => {
      const today = new Date();
      const daysAgo = (n: number) => {
        const d = new Date(today); d.setDate(d.getDate() - n);
        return d.toLocaleDateString('en-CA');
      };

      const workouts = [
        { exercise_id: 'back_squat', level: 4, raw_value: 350, date: daysAgo(59), timestamp: 0 },
      ];
      const catalog = [{ id: 'back_squat', name: 'Back Squat', standards: { brackets: {} } }];
      const profile = { selected_path: 'hybrid', age: 28, sex: 'male', bodyweight: 180 };

      setupMocks(workouts, catalog, profile);
      const { getPowerLevelV2 } = await import('@/services/powerLevelV2');
      const result = await getPowerLevelV2('user1');

      const squat = result.exercises.find(e => e.exerciseId === 'back_squat');
      expect(squat?.level).toBe(4);
      expect(squat?.expired).toBe(false);
    });
  });

  describe('Best-within-window logic', () => {
    it('picks the highest valid level when multiple entries exist', async () => {
      const today = new Date();
      const daysAgo = (n: number) => {
        const d = new Date(today); d.setDate(d.getDate() - n);
        return d.toLocaleDateString('en-CA');
      };

      const workouts = [
        { exercise_id: 'back_squat', level: 3, raw_value: 250, date: daysAgo(10), timestamp: 0 },
        { exercise_id: 'back_squat', level: 1, raw_value: 150, date: daysAgo(5), timestamp: 0 },
        { exercise_id: 'back_squat', level: 4, raw_value: 350, date: daysAgo(30), timestamp: 0 },
      ];
      const catalog = [{ id: 'back_squat', name: 'Back Squat', standards: { brackets: {} } }];
      const profile = { selected_path: 'hybrid', age: 28, sex: 'male', bodyweight: 180 };

      setupMocks(workouts, catalog, profile);
      const { getPowerLevelV2 } = await import('@/services/powerLevelV2');
      const result = await getPowerLevelV2('user1');

      // L4 at 30 days is within 60-day window, L3 at 10 days within 60-day window
      // Best = L4
      const squat = result.exercises.find(e => e.exerciseId === 'back_squat');
      expect(squat?.level).toBe(4);
    });

    it('ignores expired high level and uses valid lower level', async () => {
      const today = new Date();
      const daysAgo = (n: number) => {
        const d = new Date(today); d.setDate(d.getDate() - n);
        return d.toLocaleDateString('en-CA');
      };

      const workouts = [
        { exercise_id: 'back_squat', level: 5, raw_value: 400, date: daysAgo(50), timestamp: 0 }, // L5 expired (>45d)
        { exercise_id: 'back_squat', level: 2, raw_value: 200, date: daysAgo(10), timestamp: 0 }, // L2 valid (<90d)
      ];
      const catalog = [{ id: 'back_squat', name: 'Back Squat', standards: { brackets: {} } }];
      const profile = { selected_path: 'hybrid', age: 28, sex: 'male', bodyweight: 180 };

      setupMocks(workouts, catalog, profile);
      const { getPowerLevelV2 } = await import('@/services/powerLevelV2');
      const result = await getPowerLevelV2('user1');

      const squat = result.exercises.find(e => e.exerciseId === 'back_squat');
      expect(squat?.level).toBe(2); // L5 expired, falls to L2
    });
  });

  describe('Power Level sum', () => {
    it('sums valid levels across exercises', async () => {
      const today = new Date();
      const daysAgo = (n: number) => {
        const d = new Date(today); d.setDate(d.getDate() - n);
        return d.toLocaleDateString('en-CA');
      };

      const workouts = [
        { exercise_id: 'back_squat', level: 3, raw_value: 250, date: daysAgo(5), timestamp: 0 },
        { exercise_id: 'deadlift', level: 4, raw_value: 350, date: daysAgo(10), timestamp: 0 },
        { exercise_id: 'bench_press', level: 2, raw_value: 200, date: daysAgo(20), timestamp: 0 },
      ];
      const catalog = [
        { id: 'back_squat', name: 'Back Squat', standards: { brackets: {} } },
        { id: 'deadlift', name: 'Deadlift', standards: { brackets: {} } },
        { id: 'bench_press', name: 'Bench Press', standards: { brackets: {} } },
      ];
      const profile = { selected_path: 'hybrid', age: 28, sex: 'male', bodyweight: 180 };

      setupMocks(workouts, catalog, profile);
      const { getPowerLevelV2 } = await import('@/services/powerLevelV2');
      const result = await getPowerLevelV2('user1');

      expect(result.powerLevel).toBe(3 + 4 + 2); // 9
      expect(result.maxPossible).toBe(60);
    });
  });

  describe('Expiring exercises', () => {
    it('flags exercises within 14 days of expiry', async () => {
      const today = new Date();
      const daysAgo = (n: number) => {
        const d = new Date(today); d.setDate(d.getDate() - n);
        return d.toLocaleDateString('en-CA');
      };

      // L2 logged 80 days ago → 90-80=10 days until expiry → should be flagged
      const workouts = [
        { exercise_id: 'back_squat', level: 2, raw_value: 200, date: daysAgo(80), timestamp: 0 },
      ];
      const catalog = [{ id: 'back_squat', name: 'Back Squat', standards: { brackets: {} } }];
      const profile = { selected_path: 'hybrid', age: 28, sex: 'male', bodyweight: 180 };

      setupMocks(workouts, catalog, profile);
      const { getPowerLevelV2 } = await import('@/services/powerLevelV2');
      const result = await getPowerLevelV2('user1');

      expect(result.expiringExercises.length).toBe(1);
      expect(result.expiringExercises[0].daysUntilExpiry).toBeGreaterThanOrEqual(10);
      expect(result.expiringExercises[0].daysUntilExpiry).toBeLessThanOrEqual(11);
    });
  });

  describe('Window refresh on any log', () => {
    it('recent lower-level log refreshes the decay window (not just best level date)', async () => {
      const today = new Date();
      const daysAgo = (n: number) => {
        const d = new Date(today); d.setDate(d.getDate() - n);
        return d.toLocaleDateString('en-CA');
      };

      // L3 logged 58 days ago (almost expired at 60d window)
      // L2 logged 3 days ago (recent log should refresh window)
      const workouts = [
        { exercise_id: 'bench_press', level: 3, raw_value: 250, date: daysAgo(58), timestamp: 0 },
        { exercise_id: 'bench_press', level: 2, raw_value: 200, date: daysAgo(3), timestamp: 0 },
      ];
      const catalog = [{ id: 'bench_press', name: 'Bench Press', standards: { brackets: {} } }];
      const profile = { selected_path: 'hybrid', age: 28, sex: 'male', bodyweight: 180 };

      setupMocks(workouts, catalog, profile);
      const { getPowerLevelV2 } = await import('@/services/powerLevelV2');
      const result = await getPowerLevelV2('user1');

      const bench = result.exercises.find(e => e.exerciseId === 'bench_press');
      // Best level is 3 (still within 60-day window from the L3 workout)
      expect(bench?.level).toBe(3);
      // BUT expiry should be calculated from the MOST RECENT log (3 days ago)
      // Window for L3 = 60 days. So daysUntilExpiry ≈ 60 - 3 = 57 (±1 due to time-of-day rounding)
      expect(bench?.daysUntilExpiry).toBeGreaterThanOrEqual(56);
      expect(bench?.daysUntilExpiry).toBeLessThanOrEqual(58);
      expect(bench?.expired).toBe(false);
      // Should NOT be flagged as expiring (>14 days)
      expect(result.expiringExercises.find(e => e.exerciseId === 'bench_press')).toBeUndefined();
    });

    it('level-0 log still refreshes the decay window', async () => {
      const today = new Date();
      const daysAgo = (n: number) => {
        const d = new Date(today); d.setDate(d.getDate() - n);
        return d.toLocaleDateString('en-CA');
      };

      // L3 logged 55 days ago
      // Level 0 log 2 days ago (didn't pass threshold but still refreshes window)
      const workouts = [
        { exercise_id: 'bench_press', level: 3, raw_value: 250, date: daysAgo(55), timestamp: 0 },
        { exercise_id: 'bench_press', level: 0, raw_value: 100, date: daysAgo(2), timestamp: 0 },
      ];
      const catalog = [{ id: 'bench_press', name: 'Bench Press', standards: { brackets: {} } }];
      const profile = { selected_path: 'hybrid', age: 28, sex: 'male', bodyweight: 180 };

      setupMocks(workouts, catalog, profile);
      const { getPowerLevelV2 } = await import('@/services/powerLevelV2');
      const result = await getPowerLevelV2('user1');

      const bench = result.exercises.find(e => e.exerciseId === 'bench_press');
      // Best level = 3 (still valid within 60-day window)
      expect(bench?.level).toBe(3);
      // Expiry from most recent log (2 days ago): 60 - 2 ≈ 58 (±1 due to time-of-day rounding)
      expect(bench?.daysUntilExpiry).toBeGreaterThanOrEqual(57);
      expect(bench?.daysUntilExpiry).toBeLessThanOrEqual(59);
      expect(bench?.expired).toBe(false);
    });
  });

  describe('Path filtering', () => {
    it('only counts exercises for the selected path', async () => {
      const today = new Date();
      const daysAgo = (n: number) => {
        const d = new Date(today); d.setDate(d.getDate() - n);
        return d.toLocaleDateString('en-CA');
      };

      // barbell_row is Strength/Hybrid specialty, NOT in mobility path
      const workouts = [
        { exercise_id: 'back_squat', level: 3, raw_value: 250, date: daysAgo(5), timestamp: 0 },
        { exercise_id: 'barbell_row', level: 5, raw_value: 400, date: daysAgo(5), timestamp: 0 },
      ];
      const catalog = [
        { id: 'back_squat', name: 'Back Squat', standards: { brackets: {} } },
        { id: 'barbell_row', name: 'Barbell Row', standards: { brackets: {} } },
      ];
      const profile = { selected_path: 'mobility', age: 28, sex: 'male', bodyweight: 180 };

      setupMocks(workouts, catalog, profile);
      const { getPowerLevelV2 } = await import('@/services/powerLevelV2');
      const result = await getPowerLevelV2('user1');

      // Back squat is universal (counts for all paths), barbell_row is NOT in mobility
      expect(result.powerLevel).toBe(3); // Only back_squat counts
    });
  });
});
