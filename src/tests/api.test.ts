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
        it('calculates power level from max exercise levels', async () => {
            let callCount = 0;
            mockSelect.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    // workouts query
                    return {
                        eq: vi.fn().mockResolvedValue({
                            data: [
                                { exercise_id: 'back_squat', level: 3, xp: 150 },
                                { exercise_id: 'back_squat', level: 4, xp: 200 },
                                { exercise_id: 'deadlift', level: 2, xp: 100 },
                            ],
                            error: null,
                        }),
                    };
                } else {
                    // nutrition/habits/measurements queries
                    return {
                        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                    };
                }
            });

            const result = await getUserStats('user-123');

            expect(result?.power_level).toBe(600); // (4 * 100) + (2 * 100)
            expect(result?.highest_level_achieved).toBe(4);
            expect(result?.total_career_xp).toBe(450);
        });

        it('calculates player level from total XP', async () => {
            let callCount = 0;
            mockSelect.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return {
                        eq: vi.fn().mockResolvedValue({
                            data: [{ exercise_id: 'squat', level: 1, xp: 2500 }],
                            error: null,
                        }),
                    };
                } else {
                    return {
                        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
                    };
                }
            });

            const result = await getUserStats('user-123');

            expect(result?.player_level).toBe(3); // floor(2500 / 1000) + 1
            expect(result?.level_progress_percent).toBe(50); // (500 / 1000) * 100
            expect(result?.xp_to_next_level).toBe(500); // 1000 - 500
        });

        it('includes XP from all sources', async () => {
            let callCount = 0;
            mockSelect.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    // workouts
                    return {
                        eq: vi.fn().mockResolvedValue({
                            data: [{ exercise_id: 'squat', level: 1, xp: 100 }],
                            error: null,
                        }),
                    };
                } else if (callCount === 2) {
                    // nutrition
                    return {
                        eq: vi.fn().mockResolvedValue({
                            data: [{ xp: 50 }],
                            error: null,
                        }),
                    };
                } else if (callCount === 3) {
                    // habits
                    return {
                        eq: vi.fn().mockResolvedValue({
                            data: [{ xp: 30 }],
                            error: null,
                        }),
                    };
                } else {
                    // measurements
                    return {
                        eq: vi.fn().mockResolvedValue({
                            data: [{ xp: 20 }],
                            error: null,
                        }),
                    };
                }
            });

            const result = await getUserStats('user-123');

            expect(result?.total_career_xp).toBe(200); // 100 + 50 + 30 + 20
        });

        it('returns minimum power level of 1', async () => {
            mockSelect.mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            });

            const result = await getUserStats('user-123');

            expect(result?.power_level).toBe(1);
        });
    });
});
