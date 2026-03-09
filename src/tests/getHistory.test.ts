import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHistory } from '@/services/api';

// Mock Supabase client
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
    createClient: vi.fn(() => ({
        from: mockFrom,
    })),
}));

describe('getHistory', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default: return empty arrays
        mockOrder.mockResolvedValue({ data: [], error: null });
        mockEq.mockReturnValue({ order: mockOrder });
        mockSelect.mockReturnValue({ eq: mockEq });
        mockFrom.mockReturnValue({ select: mockSelect });
    });

    it('aggregates data from all 4 tables', async () => {
        let callCount = 0;
        mockOrder.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                // workouts
                return Promise.resolve({
                    data: [
                        {
                            id: 1,
                            user_id: 'user-123',
                            exercise_id: 'back_squat',
                            timestamp: 1000,
                            date: '2026-01-01',
                            value: '300 lbs',
                            raw_value: 300,
                            rank_name: 'Pro',
                            level: 4,
                            xp: 200,
                            sets: [{ weight: 300, reps: 5 }],
                            created_at: '2026-01-01T10:00:00Z',
                        },
                    ],
                    error: null,
                });
            } else if (callCount === 2) {
                // nutrition_logs
                return Promise.resolve({
                    data: [
                        {
                            id: 2,
                            user_id: 'user-123',
                            macro_type: 'protein',
                            timestamp: 2000,
                            date: '2026-01-02',
                            amount: 150,
                            xp: 10,
                            label: 'Chicken',
                            created_at: '2026-01-02T12:00:00Z',
                        },
                    ],
                    error: null,
                });
            } else if (callCount === 3) {
                // habit_logs
                return Promise.resolve({
                    data: [
                        {
                            id: 3,
                            user_id: 'user-123',
                            habit_id: 'habit_steps',
                            timestamp: 3000,
                            date: '2026-01-03',
                            value: 10000,
                            xp: 10,
                            created_at: '2026-01-03T14:00:00Z',
                        },
                    ],
                    error: null,
                });
            } else {
                // body_measurements
                return Promise.resolve({
                    data: [
                        {
                            id: 4,
                            user_id: 'user-123',
                            timestamp: 4000,
                            date: '2026-01-04',
                            weight: 180,
                            waist: 32,
                            xp: 5,
                            created_at: '2026-01-04T08:00:00Z',
                        },
                    ],
                    error: null,
                });
            }
        });

        const result = await getHistory('user-123');

        expect(result).toHaveLength(4);
        expect(result[0].exercise_id).toBe('back_squat');
        expect(result[1].exercise_id).toBe('macro_protein');
        expect(result[2].exercise_id).toBe('habit_steps');
        expect(result[3].exercise_id).toBe('body_measurement');
    });

    it('sorts by timestamp ascending', async () => {
        let callCount = 0;
        mockOrder.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                return Promise.resolve({
                    data: [
                        {
                            id: 1,
                            user_id: 'user-123',
                            exercise_id: 'squat',
                            timestamp: 3000,
                            date: '2026-01-03',
                            value: '300 lbs',
                            raw_value: 300,
                            rank_name: 'Pro',
                            level: 4,
                            xp: 200,
                            sets: [],
                            created_at: '2026-01-03T10:00:00Z',
                        },
                    ],
                    error: null,
                });
            } else if (callCount === 2) {
                return Promise.resolve({
                    data: [
                        {
                            id: 2,
                            user_id: 'user-123',
                            macro_type: 'protein',
                            timestamp: 1000,
                            date: '2026-01-01',
                            amount: 150,
                            xp: 10,
                            created_at: '2026-01-01T12:00:00Z',
                        },
                    ],
                    error: null,
                });
            } else {
                return Promise.resolve({ data: [], error: null });
            }
        });

        const result = await getHistory('user-123');

        expect(result).toHaveLength(2);
        expect(result[0].timestamp).toBe(1000); // nutrition first
        expect(result[1].timestamp).toBe(3000); // workout second
    });

    it('normalizes nutrition logs to HistoryItem format', async () => {
        let callCount = 0;
        mockOrder.mockImplementation(() => {
            callCount++;
            if (callCount === 2) {
                return Promise.resolve({
                    data: [
                        {
                            id: 5,
                            user_id: 'user-123',
                            macro_type: 'carbs',
                            timestamp: 5000,
                            date: '2026-01-05',
                            amount: 200,
                            xp: 10,
                            label: 'Rice',
                            created_at: '2026-01-05T12:00:00Z',
                        },
                    ],
                    error: null,
                });
            } else {
                return Promise.resolve({ data: [], error: null });
            }
        });

        const result = await getHistory('user-123');

        expect(result[0]).toMatchObject({
            exercise_id: 'macro_carbs',
            value: 'Rice',
            raw_value: 200,
            rank_name: null,
            level: 0,
            xp: 10,
        });
    });

    it('normalizes habit logs to HistoryItem format', async () => {
        let callCount = 0;
        mockOrder.mockImplementation(() => {
            callCount++;
            if (callCount === 3) {
                return Promise.resolve({
                    data: [
                        {
                            id: 6,
                            user_id: 'user-123',
                            habit_id: 'habit_sleep',
                            timestamp: 6000,
                            date: '2026-01-06',
                            value: 8,
                            xp: 15,
                            created_at: '2026-01-06T08:00:00Z',
                        },
                    ],
                    error: null,
                });
            } else {
                return Promise.resolve({ data: [], error: null });
            }
        });

        const result = await getHistory('user-123');

        expect(result[0]).toMatchObject({
            exercise_id: 'habit_sleep',
            value: '8',
            raw_value: 8,
            rank_name: null,
            level: 0,
            xp: 15,
        });
    });

    it('normalizes body measurements to HistoryItem format', async () => {
        let callCount = 0;
        mockOrder.mockImplementation(() => {
            callCount++;
            if (callCount === 4) {
                return Promise.resolve({
                    data: [
                        {
                            id: 7,
                            user_id: 'user-123',
                            timestamp: 7000,
                            date: '2026-01-07',
                            weight: 185,
                            waist: 34,
                            arms: 16,
                            chest: 42,
                            legs: 24,
                            shoulders: 48,
                            xp: 5,
                            created_at: '2026-01-07T08:00:00Z',
                        },
                    ],
                    error: null,
                });
            } else {
                return Promise.resolve({ data: [], error: null });
            }
        });

        const result = await getHistory('user-123');

        expect(result[0]).toMatchObject({
            exercise_id: 'body_measurement',
            value: 'Body Measurement',
            raw_value: 185,
            rank_name: null,
            level: 0,
            xp: 5,
            details: {
                weight: 185,
                waist: 34,
                arms: 16,
                chest: 42,
                legs: 24,
                shoulders: 48,
            },
        });
    });

    it('handles empty results from all tables', async () => {
        mockOrder.mockResolvedValue({ data: [], error: null });

        const result = await getHistory('user-123');

        expect(result).toEqual([]);
    });

    it('handles null data from tables', async () => {
        mockOrder.mockResolvedValue({ data: null, error: null });

        const result = await getHistory('user-123');

        expect(result).toEqual([]);
    });
});
