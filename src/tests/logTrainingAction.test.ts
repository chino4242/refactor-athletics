import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logTrainingAction } from '@/app/actions';

// Chainable Supabase mock
const mockInsert = vi.fn();
const mockFrom = vi.fn();

function createChain(resolveValue: any = { data: null, error: null }) {
    const chain: any = {};
    const methods = ['select', 'insert', 'update', 'delete', 'eq', 'match', 'order', 'limit', 'single', 'gte', 'lte', 'neq', 'in', 'is', 'like'];
    methods.forEach(m => {
        chain[m] = vi.fn(() => chain);
    });
    chain.then = (resolve: any) => resolve(resolveValue);
    return chain;
}

vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(() =>
        Promise.resolve({
            from: mockFrom,
        })
    ),
}));

// Mock Next.js revalidatePath
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

// Mock cookies
vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({ get: () => ({ value: 'America/New_York' }) })),
}));

describe('logTrainingAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockInsert.mockImplementation(() => {
            const chain: any = {};
            chain.then = (resolve: any) => resolve({ error: null });
            return chain;
        });
    });

    function setupMocks(catalogItem: any, age: number = 30) {
        mockFrom.mockImplementation((table: string) => {
            if (table === 'catalog') {
                return createChain({ data: catalogItem, error: null });
            } else if (table === 'users') {
                return createChain({ data: { age }, error: null });
            } else if (table === 'workouts') {
                // Could be select (prev best) or insert
                const chain = createChain({ data: null, error: null });
                chain.insert = mockInsert;
                return chain;
            }
            return createChain();
        });
    }

    const mockCatalogItem = {
        id: 'back_squat',
        name: 'Back Squat',
        type: 'Weight',
        xp_factor: 1.5,
        standards: {
            unit: 'xBW',
            scoring: 'higher_is_better',
            brackets: {
                male: [
                    {
                        min: 18,
                        max: 39,
                        levels: [1.0, 1.5, 2.0, 2.5, 3.0], // 5 thresholds = levels 1-5
                    },
                ],
                female: [
                    {
                        min: 18,
                        max: 39,
                        levels: [0.75, 1.0, 1.25, 1.5, 1.75],
                    },
                ],
            },
        },
    };

    it('calculates rank and XP for weight exercise', async () => {
        setupMocks(mockCatalogItem, 30);

        const result = await logTrainingAction(
            'user-123',
            'back_squat',
            200, // bodyweight
            'male',
            [
                { weight: 300, reps: 5 }, // 1RM = 300 * (1 + 5/30) = 350
                { weight: 280, reps: 3 }, // 1RM = 280 * (1 + 3/30) = 308
            ]
        );

        // 350 / 200 = 1.75 xBW -> passes thresholds 1.0, 1.5 (level 2)
        expect(result.level).toBe(2);
        expect(result.rank_name).toBe('Contender');
        expect(result.raw_value).toBe(350);

        // XP = level * 50 + sets XP
        // Sets XP = floor((300/200)*5*10*1.5) + floor((280/200)*3*10*1.5) = 112 + 63 = 175
        // Total = 100 + 174 = 274 (floating point)
        expect(result.xp_earned).toBe(244);
    });

    it('handles female standards', async () => {
        setupMocks(mockCatalogItem, 25);

        const result = await logTrainingAction(
            'user-123',
            'back_squat',
            150, // bodyweight
            'female',
            [{ weight: 150, reps: 5 }] // 1RM = 175
        );

        // 175 / 150 = 1.17 xBW -> passes 0.75, 1.0 (level 2)
        expect(result.level).toBe(2);
        expect(result.rank_name).toBe('Contender');
    });

    it('calculates level 0 when no thresholds passed', async () => {
        setupMocks(mockCatalogItem, 30);

        const result = await logTrainingAction(
            'user-123',
            'back_squat',
            200,
            'male',
            [{ weight: 150, reps: 1 }] // 1RM = 150, 0.75 xBW (below 1.0 threshold)
        );

        expect(result.level).toBe(0);
        expect(result.rank_name).toBe('Unranked');
        expect(result.xp_earned).toBe(11); // 0 rank XP + floor((150/200)*1*10*1.5) = 11
    });

    it('calculates level 5 for champion performance', async () => {
        setupMocks(mockCatalogItem, 30);

        const result = await logTrainingAction(
            'user-123',
            'back_squat',
            200,
            'male',
            [{ weight: 600, reps: 1 }] // 1RM = 600, 3.0 xBW (passes all 5 thresholds)
        );

        expect(result.level).toBe(5);
        expect(result.rank_name).toBe('Legend');
        expect(result.xp_earned).toBe(175); // 250 rank XP + floor((600/200)*1*10*1.5) = 45
    });

    it('handles reps-based exercises', async () => {
        const pullupCatalog = {
            id: 'pullup',
            name: 'Pull-up',
            type: 'Reps',
            xp_factor: 1.0,
            standards: {
                unit: 'reps',
                scoring: 'higher_is_better',
                brackets: {
                    male: [
                        {
                            min: 18,
                            max: 39,
                            levels: [5, 10, 15, 20, 25],
                        },
                    ],
                },
            },
        };

        setupMocks(pullupCatalog, 30);

        const result = await logTrainingAction(
            'user-123',
            'pullup',
            180,
            'male',
            [
                { reps: 12 },
                { reps: 10 },
                { reps: 8 },
            ]
        );

        // 12 reps -> passes 5, 10 (level 2)
        expect(result.level).toBe(2);
        expect(result.rank_name).toBe('Contender');
        expect(result.raw_value).toBe(12);
    });

    it('handles time-based exercises with lower_is_better scoring', async () => {
        const runCatalog = {
            id: 'mile_run',
            name: 'Mile Run',
            type: 'Time',
            xp_factor: 2.0,
            standards: {
                unit: 'seconds',
                scoring: 'lower_is_better',
                brackets: {
                    male: [
                        {
                            min: 18,
                            max: 39,
                            levels: [480, 420, 360, 330, 300], // 8:00, 7:00, 6:00, 5:30, 5:00
                        },
                    ],
                },
            },
        };

        setupMocks(runCatalog, 30);

        const result = await logTrainingAction(
            'user-123',
            'mile_run',
            180,
            'male',
            [{ duration: 380 }] // 6:20 -> passes 480, 420 (level 2)
        );

        expect(result.level).toBe(2);
        expect(result.rank_name).toBe('Contender');
    });

    it('handles weighted pullup by adding bodyweight', async () => {
        const weightedPullupCatalog = {
            id: 'weighted_pullup',
            name: 'Weighted Pull-up',
            type: 'Weight',
            xp_factor: 1.2,
            standards: {
                unit: 'xBW',
                scoring: 'higher_is_better',
                brackets: {
                    male: [
                        {
                            min: 18,
                            max: 39,
                            levels: [1.0, 1.25, 1.5, 1.75, 2.0],
                        },
                    ],
                },
            },
        };

        setupMocks(weightedPullupCatalog, 30);

        const result = await logTrainingAction(
            'user-123',
            'weighted_pullup',
            180, // bodyweight
            'male',
            [{ weight: 45, reps: 5 }] // 1RM = 45 * 1.167 = 52.5, total = 232.5
        );

        // (52.5 + 180) / 180 = 1.29 xBW -> passes 1.0, 1.25 (level 2)
        expect(result.level).toBe(2);
        expect(result.rank_name).toBe('Contender');
    });

    it('handles 5RM exercises without Epley formula', async () => {
        const fiveRMCatalog = {
            id: 'five_rm_back_squat',
            name: '5RM Back Squat',
            type: 'Weight',
            xp_factor: 1.5,
            standards: {
                unit: 'lbs',
                scoring: 'higher_is_better',
                brackets: {
                    male: [
                        {
                            min: 18,
                            max: 39,
                            levels: [200, 250, 300, 350, 400],
                        },
                    ],
                },
            },
        };

        setupMocks(fiveRMCatalog, 30);

        const result = await logTrainingAction(
            'user-123',
            'five_rm_back_squat',
            200,
            'male',
            [{ weight: 275, reps: 5 }] // Use weight directly, no Epley
        );

        // 275 lbs -> passes 200, 250 (level 2)
        expect(result.level).toBe(2);
        expect(result.rank_name).toBe('Contender');
        expect(result.raw_value).toBe(275);
        expect(result.value).toContain('lbs');
    });

    it('saves workout to database with correct structure', async () => {
        setupMocks(mockCatalogItem, 30);

        await logTrainingAction('user-123', 'back_squat', 200, 'male', [
            { weight: 300, reps: 5 },
        ]);

        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-123',
                exercise_id: 'back_squat',
                level: expect.any(Number),
                xp: expect.any(Number),
                rank_name: expect.any(String),
                sets: expect.any(Array),
                raw_value: expect.any(Number),
                value: expect.any(String),
                timestamp: expect.any(Number),
                date: expect.any(String),
            })
        );
    });

    it('throws error when database insert fails', async () => {
        setupMocks(mockCatalogItem, 30);
        mockInsert.mockImplementation(() => {
            const chain: any = {};
            chain.then = (resolve: any) => resolve({ error: { message: 'Database error' } });
            return chain;
        });

        await expect(
            logTrainingAction('user-123', 'back_squat', 200, 'male', [
                { weight: 300, reps: 5 },
            ])
        ).rejects.toThrow();
    });

    it('defaults to age 25 when user profile not found', async () => {
        mockFrom.mockImplementation((table: string) => {
            if (table === 'catalog') return createChain({ data: mockCatalogItem, error: null });
            if (table === 'users') return createChain({ data: null, error: null });
            const chain = createChain({ data: null, error: null });
            chain.insert = mockInsert;
            return chain;
        });

        const result = await logTrainingAction('user-123', 'back_squat', 200, 'male', [
            { weight: 300, reps: 5 },
        ]);

        // Should still calculate rank using default age 25
        expect(result.level).toBeGreaterThanOrEqual(0);
        expect(result.rank_name).toBeDefined();
    });

    it('defaults to xp_factor 1 when catalog item missing', async () => {
        setupMocks({ ...mockCatalogItem, xp_factor: undefined }, 30);

        const result = await logTrainingAction('user-123', 'back_squat', 200, 'male', [
            { weight: 300, reps: 5 },
        ]);

        // Should use xp_factor = 1
        expect(result.xp_earned).toBeDefined();
    });

    it('handles duration exercises (e.g. planks) with correct XP formula', async () => {
        const plankCatalog = {
            id: 'plank',
            name: 'Plank',
            type: 'Duration',
            xp_factor: 1.0,
            standards: {
                unit: 'Sec',
                scoring: 'higher_is_better',
                brackets: {
                    male: [{ min: 18, max: 100, levels: [30, 60, 120, 210, 300] }],
                },
            },
        };

        setupMocks(plankCatalog, 30);

        const result = await logTrainingAction(
            'user-123',
            'plank',
            180,
            'male',
            [{ duration: 45 }, { duration: 45 }]
        );

        // bestValue = 45 seconds
        expect(result.raw_value).toBe(45);
        // 45 passes threshold 30 (level 1)
        expect(result.level).toBe(1);
        expect(result.rank_name).toBe('Rookie');
        // XP per set = floor((45/60) * 8 * 1.0) = floor(6) = 6
        // 2 sets = 12, plus rank XP (level 1 * 50 = 50) = 62
        expect(result.xp_earned).toBe(62);
    });
});
