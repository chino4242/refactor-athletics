import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logHabitAction, deleteHistoryItemAction } from '@/app/actions';

// Mock Supabase client
const mockInsert = vi.fn().mockReturnThis();
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
const mockDelete = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve({
        from: mockFrom,
    })),
}));

// Mock Next.js revalidatePath
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

describe('Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockInsert.mockReturnThis();
        mockDelete.mockReturnThis();
        mockEq.mockResolvedValue({ error: null });
    });

    describe('logHabitAction', () => {
        it('logs a habit to habit_logs table', async () => {
            const result = await logHabitAction('user-123', 'habit_steps', 10000, 185, 'Steps');

            expect(mockFrom).toHaveBeenCalledWith('habit_logs');
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: 'user-123',
                    habit_id: 'habit_steps',
                    value: 10000,
                    xp: 10,
                })
            );
            expect(result).toEqual({ xp_earned: 10 });
        });

        it('logs nutrition to nutrition_logs table', async () => {
            const result = await logHabitAction('user-123', 'macro_protein', 150, 185, 'Protein');

            expect(mockFrom).toHaveBeenCalledWith('nutrition_logs');
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: 'user-123',
                    macro_type: 'protein',
                    amount: 150,
                    xp: 10,
                })
            );
            expect(result).toEqual({ xp_earned: 10 });
        });

        it('awards 15 XP for sleep habit', async () => {
            const result = await logHabitAction('user-123', 'habit_sleep', 8, 185, 'Sleep');

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    habit_id: 'habit_sleep',
                    xp: 15,
                })
            );
            expect(result).toEqual({ xp_earned: 15 });
        });

        it('awards 100 XP for meal prep habit', async () => {
            const result = await logHabitAction('user-123', 'habit_meal_prep', 1, 185, 'Meal Prep');

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    habit_id: 'habit_meal_prep',
                    xp: 100,
                })
            );
            expect(result).toEqual({ xp_earned: 100 });
        });

        it('uses custom timestamp if provided', async () => {
            const customTimestamp = 1234567890;
            await logHabitAction('user-123', 'habit_steps', 10000, 185, 'Steps', customTimestamp);

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    timestamp: customTimestamp,
                })
            );
        });

        it('generates date string from timestamp', async () => {
            const timestamp = 1709971200; // 2024-03-09 00:00:00 UTC
            await logHabitAction('user-123', 'habit_steps', 10000, 185, 'Steps', timestamp);

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
                })
            );
        });

        it('throws error for unknown habit type', async () => {
            await expect(
                logHabitAction('user-123', 'unknown_type', 100, 185, 'Unknown')
            ).rejects.toThrow('Unknown habit type: unknown_type');
        });

        it('throws error when database insert fails', async () => {
            mockEq.mockResolvedValueOnce({ error: { message: 'Database error' } });
            mockInsert.mockResolvedValueOnce({ error: { message: 'Database error' } });

            await expect(
                logHabitAction('user-123', 'habit_steps', 10000, 185, 'Steps')
            ).rejects.toThrow();
        });

        it('logs exercise minutes habit', async () => {
            const result = await logHabitAction('user-123', 'habit_exercise_minutes', 45, 185, 'Exercise');

            expect(mockFrom).toHaveBeenCalledWith('habit_logs');
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    habit_id: 'habit_exercise_minutes',
                    value: 45,
                    xp: 10,
                })
            );
            expect(result).toEqual({ xp_earned: 10 });
        });

        it('logs stand hours habit', async () => {
            const result = await logHabitAction('user-123', 'habit_stand_hours', 12, 185, 'Stand');

            expect(mockFrom).toHaveBeenCalledWith('habit_logs');
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    habit_id: 'habit_stand_hours',
                    value: 12,
                    xp: 10,
                })
            );
            expect(result).toEqual({ xp_earned: 10 });
        });
    });

    describe('deleteHistoryItemAction', () => {
        it('deletes from all tables by timestamp', async () => {
            const mockMatch = vi.fn().mockResolvedValue({ error: null });
            mockFrom.mockReturnValue({
                delete: vi.fn().mockReturnValue({
                    match: mockMatch,
                }),
            });

            await deleteHistoryItemAction('user-123', 1234567890);

            expect(mockFrom).toHaveBeenCalledWith('workouts');
            expect(mockFrom).toHaveBeenCalledWith('nutrition_logs');
            expect(mockFrom).toHaveBeenCalledWith('habit_logs');
            expect(mockFrom).toHaveBeenCalledWith('body_measurements');
            expect(mockMatch).toHaveBeenCalledWith({ user_id: 'user-123', timestamp: 1234567890 });
        });

        it('throws error when delete fails', async () => {
            const mockMatch = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
            mockFrom.mockReturnValue({
                delete: vi.fn().mockReturnValue({
                    match: mockMatch,
                }),
            });

            await expect(
                deleteHistoryItemAction('user-123', 1234567890)
            ).rejects.toThrow();
        });
    });
});
