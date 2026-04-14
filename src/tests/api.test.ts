import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveProfile, getHabitProgress, getUserStats } from '@/services/api';

// Mock Supabase client
const mockOrder = vi.fn();
const mockGte = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
    createClient: vi.fn(() => ({
        from: mockFrom,
    })),
}));

describe('API Functions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Setup default chain for queries
        mockOrder.mockResolvedValue({ data: [], error: null });
        mockGte.mockReturnValue({ order: mockOrder });
        mockEq.mockReturnValue({ gte: mockGte });
        mockSelect.mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({
            select: mockSelect,
            upsert: mockUpsert,
        });
    });

    describe('saveProfile', () => {
        it('saves profile with all fields', async () => {
            const profile = {
                user_id: 'user-123',
                age: 30,
                sex: 'M',
                bodyweight: 185,
                is_onboarded: true,
                selected_theme: 'dark',
                timezone: 'America/New_York',
                display_name: 'Test User',
            };

            await saveProfile(profile);

            expect(mockFrom).toHaveBeenCalledWith('users');
            expect(mockUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'user-123',
                    age: 30,
                    sex: 'M',
                    bodyweight: 185,
                    is_onboarded: true,
                    selected_theme: 'dark',
                    timezone: 'America/New_York',
                    display_name: 'Test User',
                })
            );
        });

        it('only includes defined fields', async () => {
            const profile = {
                user_id: 'user-123',
                age: 30,
            };

            await saveProfile(profile);

            expect(mockUpsert).toHaveBeenCalledWith({
                id: 'user-123',
                age: 30,
            });
        });

        it('saves nutrition targets', async () => {
            const profile = {
                user_id: 'user-123',
                nutrition_targets: {
                    macro_protein: 150,
                    macro_carbs: 200,
                    macro_fat: 60,
                },
            };

            await saveProfile(profile);

            expect(mockUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    nutrition_targets: {
                        macro_protein: 150,
                        macro_carbs: 200,
                        macro_fat: 60,
                    },
                })
            );
        });

        it('saves body composition goals', async () => {
            const profile = {
                user_id: 'user-123',
                body_composition_goals: {
                    target_weight: '180',
                },
            };

            await saveProfile(profile);

            expect(mockUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    body_composition_goals: {
                        target_weight: '180',
                    },
                })
            );
        });

        it('saves hidden habits', async () => {
            const profile = {
                user_id: 'user-123',
                hidden_habits: ['habit_steps', 'habit_water'],
            };

            await saveProfile(profile);

            expect(mockUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    hidden_habits: ['habit_steps', 'habit_water'],
                })
            );
        });

        it('saves selected_path', async () => {
            const profile = {
                user_id: 'user-123',
                selected_path: 'strength',
            };

            await saveProfile(profile);

            expect(mockUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    selected_path: 'strength',
                })
            );
        });

        it('saves waiver_accepted_at', async () => {
            const ts = '2026-03-13T21:00:00.000Z';
            const profile = {
                user_id: 'user-123',
                waiver_accepted_at: ts,
            };

            await saveProfile(profile);

            expect(mockUpsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    waiver_accepted_at: ts,
                })
            );
        });

        it('throws error when upsert fails', async () => {
            mockUpsert.mockResolvedValueOnce({ error: { message: 'Database error' } });

            await expect(
                saveProfile({ user_id: 'user-123', age: 30 })
            ).rejects.toThrow();
        });
    });

    describe('getHabitProgress', () => {
        it('returns totals from nutrition and habit logs', async () => {
            let callCount = 0;
            mockSelect.mockImplementation(() => {
                callCount++;
                const chain = {
                    eq: vi.fn().mockReturnValue({
                        gte: vi.fn().mockReturnValue({
                            order: vi.fn().mockResolvedValue(
                                callCount === 1
                                    ? {
                                          data: [
                                              { macro_type: 'protein', amount: 150 },
                                              { macro_type: 'protein', amount: 50 },
                                          ],
                                          error: null,
                                      }
                                    : {
                                          data: [
                                              { habit_id: 'habit_steps', value: 10000 },
                                              { habit_id: 'habit_steps', value: 5000 },
                                          ],
                                          error: null,
                                      }
                            ),
                        }),
                    }),
                };
                return chain;
            });

            const result = await getHabitProgress('user-123', 1234567890);

            expect(result.totals.macro_protein).toBe(200);
            expect(result.totals.habit_steps).toBe(15000);
            expect(result.status).toBe('success');
        });

        it('handles empty results', async () => {
            mockSelect.mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    gte: vi.fn().mockReturnValue({
                        order: vi.fn().mockResolvedValue({ data: [], error: null }),
                    }),
                }),
            });

            const result = await getHabitProgress('user-123', 1234567890);

            expect(result.totals).toEqual({});
            expect(result.status).toBe('success');
        });
    });

    describe('getUserStats', () => {
        const catalogData = [
            { id: 'back_squat', standards: { brackets: { male: [{ levels: [100,200,300,400,500] }], female: [] } } },
            { id: 'deadlift', standards: { brackets: { male: [{ levels: [100,200,300,400,500] }], female: [] } } },
            { id: 'squat', standards: { brackets: { male: [{ levels: [100,200,300,400,500] }], female: [] } } },
        ];

        const mockNotChain = (resolvedData: any) => vi.fn().mockResolvedValue({ data: resolvedData, error: null });

        // Chainable eq mock that supports .eq().eq().order().limit() patterns
        const chainableEq = (data: any) => {
            const chain: any = {};
            chain.eq = vi.fn().mockReturnValue(chain);
            chain.gte = vi.fn().mockResolvedValue({ data, error: null });
            chain.order = vi.fn().mockReturnValue(chain);
            chain.limit = vi.fn().mockResolvedValue({ data, error: null });
            chain.then = (resolve: any) => resolve({ data, error: null });
            return chain;
        };

        const makeSelectMock = (workoutsData: any[], xpSources?: { nutrition?: any[]; habits?: any[]; measurements?: any[] }) => {
            let callCount = 0;
            return () => {
                callCount++;
                if (callCount === 1) {
                    // workouts
                    return { eq: vi.fn().mockResolvedValue({ data: workoutsData, error: null }) };
                } else if (callCount === 2) {
                    // catalog
                    return { not: mockNotChain(catalogData) };
                } else if (callCount <= 5) {
                    // nutrition (3), habits (4), measurements (5)
                    const sources = [xpSources?.nutrition || [], xpSources?.habits || [], xpSources?.measurements || []];
                    return { eq: vi.fn().mockResolvedValue({ data: sources[callCount - 3], error: null }) };
                } else {
                    // alcohol/vice streak queries - chainable .eq().eq().gte()
                    return { eq: vi.fn().mockReturnValue(chainableEq([])) };
                }
            };
        };

        it('calculates power level from max exercise levels', async () => {
            mockSelect.mockImplementation(makeSelectMock([
                { exercise_id: 'back_squat', level: 3, xp: 150 },
                { exercise_id: 'back_squat', level: 4, xp: 200 },
                { exercise_id: 'deadlift', level: 2, xp: 100 },
            ]));

            const result = await getUserStats('user-123');

            expect(result?.power_level).toBe(6); // max(3,4) + max(2) = 4 + 2
            expect(result?.highest_level_achieved).toBe(4);
            expect(result?.total_career_xp).toBe(450);
        });

        it('calculates player level from total XP', async () => {
            mockSelect.mockImplementation(makeSelectMock([
                { exercise_id: 'squat', level: 1, xp: 2500 },
            ]));

            const result = await getUserStats('user-123');

            expect(result?.player_level).toBe(3); // 2500 XP: L1=1080, L2=1166 (cum 2246), working on L3
            expect(result?.level_progress_percent).toBeCloseTo(20.17, 0);
            expect(result?.xp_to_next_level).toBe(1005);
        });

        it('includes XP from all sources', async () => {
            mockSelect.mockImplementation(makeSelectMock(
                [{ exercise_id: 'squat', level: 1, xp: 100 }],
                { nutrition: [{ xp: 50 }], habits: [{ xp: 30 }], measurements: [{ xp: 20 }] }
            ));

            const result = await getUserStats('user-123');

            expect(result?.total_career_xp).toBe(200); // 100 + 50 + 30 + 20
        });

        it('returns minimum power level of 1', async () => {
            mockSelect.mockImplementation(makeSelectMock([]));

            const result = await getUserStats('user-123');

            expect(result?.power_level).toBe(0);
        });
    });
});
