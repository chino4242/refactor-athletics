import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logTrainingAction } from '@/app/actions';

// Chainable Supabase mock
const mockInsert = vi.fn();
const mockFrom = vi.fn();

function createChain(resolveValue: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ['select', 'insert', 'delete', 'eq', 'match', 'order', 'limit', 'single', 'gte', 'lte', 'neq', 'in', 'is', 'like'];
    methods.forEach(m => { chain[m] = vi.fn(() => chain); });
    chain.then = (resolve: any) => resolve(resolveValue);
    return chain;
}

vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ get: () => ({ value: 'America/New_York' }) })) }));

describe('Workout Completion Flow — Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockInsert.mockImplementation(() => {
            const chain: any = {};
            chain.then = (resolve: any) => resolve({ error: null });
            return chain;
        });
    });

    const backSquatCatalog = {
        id: 'back_squat',
        name: 'Back Squat',
        type: 'Weight',
        xp_factor: 1.5,
        normalization_factor: 1.0,
        normalizes_to: null,
        standards: {
            unit: 'xBW',
            scoring: 'higher_is_better',
            brackets: {
                male: [{ min: 18, max: 39, levels: [1.0, 1.5, 2.0, 2.5, 3.0] }],
                female: [{ min: 18, max: 39, levels: [0.75, 1.0, 1.25, 1.5, 1.75] }],
            },
        },
    };

    function setupMocks(catalogItem: any, age: number = 30) {
        mockFrom.mockImplementation((table: string) => {
            if (table === 'catalog') return createChain({ data: catalogItem, error: null });
            if (table === 'users') return createChain({ data: { age }, error: null });
            const chain = createChain({ data: null, error: null });
            chain.insert = mockInsert;
            return chain;
        });
    }

    it('full flow: sets → Epley e1RM → xBW comparison → rank + XP', async () => {
        setupMocks(backSquatCatalog, 28);

        // Simulate: 200lb user squats 315x5, 295x3
        const result = await logTrainingAction(
            'user-123', 'back_squat', 200, 'male',
            [{ weight: 315, reps: 5 }, { weight: 295, reps: 3 }]
        );

        // 315 * (1 + 5/30) = 367.5 e1RM
        // 367.5 / 200 = 1.8375 xBW → passes 1.0, 1.5 (level 2)
        expect(result.level).toBe(2);
        expect(result.rank_name).toBe('Amateur');
        expect(result.raw_value).toBe(367.5);

        // XP = level*50 + set volume XP
        // Set 1: floor((315/200)*5*10*1.5) = floor(118.125) = 118
        // Set 2: floor((295/200)*3*10*1.5) = floor(66.375) = 66
        // Total = 100 + 118 + 66 = 284
        expect(result.xp_earned).toBe(244);

        // Verify workout was saved to DB
        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-123',
                exercise_id: 'back_squat',
                level: 2,
                rank_name: 'Amateur',
                raw_value: 367.5,
            })
        );
    });

    it('full flow: progression from level 2 to level 3 (rank up scenario)', async () => {
        setupMocks(backSquatCatalog, 28);

        // 200lb user squats 405x3 → e1RM = 405 * (1 + 3/30) = 445.5
        // 445.5 / 200 = 2.2275 xBW → passes 1.0, 1.5, 2.0 (level 3)
        const result = await logTrainingAction(
            'user-123', 'back_squat', 200, 'male',
            [{ weight: 405, reps: 3 }]
        );

        expect(result.level).toBe(3);
        expect(result.rank_name).toBe('Contender');
        expect(result.raw_value).toBeCloseTo(445.5, 1);
    });

    it('full flow: bodyweight exercise (reps-based, no Epley)', async () => {
        const pullupCatalog = {
            id: 'pullup', name: 'Pull-up', type: 'Reps', xp_factor: 1.0,
            normalization_factor: 1.0, normalizes_to: null,
            standards: {
                unit: 'reps', scoring: 'higher_is_better',
                brackets: { male: [{ min: 18, max: 39, levels: [5, 10, 15, 20, 25] }] },
            },
        };
        setupMocks(pullupCatalog, 28);

        const result = await logTrainingAction(
            'user-123', 'pullup', 180, 'male',
            [{ reps: 18 }, { reps: 15 }, { reps: 12 }]
        );

        // Best reps = 18 → passes 5, 10, 15 (level 3)
        expect(result.level).toBe(3);
        expect(result.rank_name).toBe('Contender');
        expect(result.raw_value).toBe(18);
    });

    it('full flow: dumbbell normalization (1.15x factor)', async () => {
        const dbBenchCatalog = {
            id: 'dumbbell_bench_press', name: 'Dumbbell Bench Press', type: 'Weight', xp_factor: 1.5,
            normalization_factor: 1.15, normalizes_to: 'bench_press',
            standards: {
                unit: 'xBW', scoring: 'higher_is_better',
                brackets: { male: [{ min: 18, max: 39, levels: [0.75, 1.0, 1.25, 1.5, 1.75] }] },
            },
        };
        setupMocks(dbBenchCatalog, 28);

        // 180lb user presses 70lb DBs x 8
        // Weight per hand = 70, total = 70 (logged as single DB weight)
        // e1RM = 70 * (1 + 8/30) = 88.67
        // Normalized = 88.67 * 1.15 = 101.97
        // xBW = 101.97 / 180 = 0.566 → passes nothing (level 0)
        const result = await logTrainingAction(
            'user-123', 'dumbbell_bench_press', 180, 'male',
            [{ weight: 70, reps: 8 }]
        );

        expect(result.level).toBe(0);
        expect(result.rank_name).toBe('Peasant');
    });

    it('full flow: time-based exercise (lower is better)', async () => {
        const mileRunCatalog = {
            id: 'mile_run', name: 'Mile Run', type: 'Time', xp_factor: 2.0,
            normalization_factor: 1.0, normalizes_to: null,
            standards: {
                unit: 'seconds', scoring: 'lower_is_better',
                brackets: { male: [{ min: 18, max: 39, levels: [480, 420, 360, 330, 300] }] },
            },
        };
        setupMocks(mileRunCatalog, 28);

        // 6:30 mile = 390 seconds → passes 480, 420 (level 2)
        const result = await logTrainingAction(
            'user-123', 'mile_run', 180, 'male',
            [{ duration: 390 }]
        );

        expect(result.level).toBe(2);
        expect(result.rank_name).toBe('Amateur');
    });

    it('full flow: weighted pullup adds bodyweight before xBW comparison', async () => {
        const weightedPullupCatalog = {
            id: 'weighted_pullup', name: 'Weighted Pull-up', type: 'Weight', xp_factor: 1.2,
            normalization_factor: 1.0, normalizes_to: null,
            standards: {
                unit: 'xBW', scoring: 'higher_is_better',
                brackets: { male: [{ min: 18, max: 39, levels: [1.0, 1.25, 1.5, 1.75, 2.0] }] },
            },
        };
        setupMocks(weightedPullupCatalog, 28);

        // 180lb user, +90lb weighted pullup x 3
        // e1RM = 90 * (1 + 3/30) = 99
        // Total = 99 + 180 = 279
        // xBW = 279 / 180 = 1.55 → passes 1.0, 1.25, 1.5 (level 3)
        const result = await logTrainingAction(
            'user-123', 'weighted_pullup', 180, 'male',
            [{ weight: 90, reps: 3 }]
        );

        expect(result.level).toBe(3);
        expect(result.rank_name).toBe('Contender');
    });
});
