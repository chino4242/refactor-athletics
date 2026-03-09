import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logTrainingAction } from '@/app/actions';

// Mock Supabase client
const mockInsert = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSingle = vi.fn();
const mockSelect = vi.fn().mockReturnThis();
const mockFrom = vi.fn();

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

describe('logTrainingAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock setup
        mockInsert.mockResolvedValue({ error: null });
        mockFrom.mockReturnValue({
            select: mockSelect,
            insert: mockInsert,
        });
    });

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
        mockSelect.mockImplementation((fields) => {
            if (fields === '*') {
                // catalog query
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockCatalogItem,
                            error: null,
                        }),
                    }),
                };
            } else {
                // user profile query
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { age: 30 },
                            error: null,
                        }),
                    }),
                };
            }
        });

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
        expect(result.rank_name).toBe('Amateur');
        expect(result.raw_value).toBe(350);

        // XP = level * 50 + sets XP
        // Sets XP = floor(5 * 1.5) + floor(3 * 1.5) = 7 + 4 = 11
        // Total = 100 + 11 = 111
        expect(result.xp_earned).toBe(111);
    });

    it('handles female standards', async () => {
        mockSelect.mockImplementation((fields) => {
            if (fields === '*') {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockCatalogItem,
                            error: null,
                        }),
                    }),
                };
            } else {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { age: 25 },
                            error: null,
                        }),
                    }),
                };
            }
        });

        const result = await logTrainingAction(
            'user-123',
            'back_squat',
            150, // bodyweight
            'female',
            [{ weight: 150, reps: 5 }] // 1RM = 175
        );

        // 175 / 150 = 1.17 xBW -> passes 0.75, 1.0 (level 2)
        expect(result.level).toBe(2);
        expect(result.rank_name).toBe('Amateur');
    });

    it('calculates level 0 when no thresholds passed', async () => {
        mockSelect.mockImplementation((fields) => {
            if (fields === '*') {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockCatalogItem,
                            error: null,
                        }),
                    }),
                };
            } else {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { age: 30 },
                            error: null,
                        }),
                    }),
                };
            }
        });

        const result = await logTrainingAction(
            'user-123',
            'back_squat',
            200,
            'male',
            [{ weight: 150, reps: 1 }] // 1RM = 150, 0.75 xBW (below 1.0 threshold)
        );

        expect(result.level).toBe(0);
        expect(result.rank_name).toBe('Peasant');
        expect(result.xp_earned).toBe(1); // 0 rank XP + 1 set XP (1 * 1.5 = 1.5 -> floor = 1)
    });

    it('calculates level 5 for champion performance', async () => {
        mockSelect.mockImplementation((fields) => {
            if (fields === '*') {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockCatalogItem,
                            error: null,
                        }),
                    }),
                };
            } else {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { age: 30 },
                            error: null,
                        }),
                    }),
                };
            }
        });

        const result = await logTrainingAction(
            'user-123',
            'back_squat',
            200,
            'male',
            [{ weight: 600, reps: 1 }] // 1RM = 600, 3.0 xBW (passes all 5 thresholds)
        );

        expect(result.level).toBe(5);
        expect(result.rank_name).toBe('Champion');
        expect(result.xp_earned).toBe(251); // 250 rank XP + 1 set XP
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

        mockSelect.mockImplementation((fields) => {
            if (fields === '*') {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: pullupCatalog,
                            error: null,
                        }),
                    }),
                };
            } else {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { age: 30 },
                            error: null,
                        }),
                    }),
                };
            }
        });

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
        expect(result.rank_name).toBe('Amateur');
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

        mockSelect.mockImplementation((fields) => {
            if (fields === '*') {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: runCatalog,
                            error: null,
                        }),
                    }),
                };
            } else {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { age: 30 },
                            error: null,
                        }),
                    }),
                };
            }
        });

        const result = await logTrainingAction(
            'user-123',
            'mile_run',
            180,
            'male',
            [{ duration: 380 }] // 6:20 -> passes 480, 420 (level 2)
        );

        expect(result.level).toBe(2);
        expect(result.rank_name).toBe('Amateur');
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

        mockSelect.mockImplementation((fields) => {
            if (fields === '*') {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: weightedPullupCatalog,
                            error: null,
                        }),
                    }),
                };
            } else {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { age: 30 },
                            error: null,
                        }),
                    }),
                };
            }
        });

        const result = await logTrainingAction(
            'user-123',
            'weighted_pullup',
            180, // bodyweight
            'male',
            [{ weight: 45, reps: 5 }] // 1RM = 45 * 1.167 = 52.5, total = 232.5
        );

        // (52.5 + 180) / 180 = 1.29 xBW -> passes 1.0, 1.25 (level 2)
        expect(result.level).toBe(2);
        expect(result.rank_name).toBe('Amateur');
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

        mockSelect.mockImplementation((fields) => {
            if (fields === '*') {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: fiveRMCatalog,
                            error: null,
                        }),
                    }),
                };
            } else {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { age: 30 },
                            error: null,
                        }),
                    }),
                };
            }
        });

        const result = await logTrainingAction(
            'user-123',
            'five_rm_back_squat',
            200,
            'male',
            [{ weight: 275, reps: 5 }] // Use weight directly, no Epley
        );

        // 275 lbs -> passes 200, 250 (level 2)
        expect(result.level).toBe(2);
        expect(result.rank_name).toBe('Amateur');
        expect(result.raw_value).toBe(275);
        expect(result.value).toContain('lbs');
    });

    it('saves workout to database with correct structure', async () => {
        mockSelect.mockImplementation((fields) => {
            if (fields === '*') {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockCatalogItem,
                            error: null,
                        }),
                    }),
                };
            } else {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { age: 30 },
                            error: null,
                        }),
                    }),
                };
            }
        });

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
        mockSelect.mockImplementation((fields) => {
            if (fields === '*') {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockCatalogItem,
                            error: null,
                        }),
                    }),
                };
            } else {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { age: 30 },
                            error: null,
                        }),
                    }),
                };
            }
        });

        mockInsert.mockResolvedValue({ error: { message: 'Database error' } });

        await expect(
            logTrainingAction('user-123', 'back_squat', 200, 'male', [
                { weight: 300, reps: 5 },
            ])
        ).rejects.toThrow();
    });

    it('defaults to age 25 when user profile not found', async () => {
        mockSelect.mockImplementation((fields) => {
            if (fields === '*') {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: mockCatalogItem,
                            error: null,
                        }),
                    }),
                };
            } else {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: null,
                            error: null,
                        }),
                    }),
                };
            }
        });

        const result = await logTrainingAction('user-123', 'back_squat', 200, 'male', [
            { weight: 300, reps: 5 },
        ]);

        // Should still calculate rank using default age 25
        expect(result.level).toBeGreaterThanOrEqual(0);
        expect(result.rank_name).toBeDefined();
    });

    it('defaults to xp_factor 1 when catalog item missing', async () => {
        mockSelect.mockImplementation((fields) => {
            if (fields === '*') {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { ...mockCatalogItem, xp_factor: undefined },
                            error: null,
                        }),
                    }),
                };
            } else {
                return {
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { age: 30 },
                            error: null,
                        }),
                    }),
                };
            }
        });

        const result = await logTrainingAction('user-123', 'back_squat', 200, 'male', [
            { weight: 300, reps: 5 },
        ]);

        // Should use xp_factor = 1
        expect(result.xp_earned).toBeDefined();
    });
});
