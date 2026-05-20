import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logHabitAction, deleteHistoryItemAction } from '@/app/actions';

// Chainable Supabase mock — every method returns the chain, terminal calls resolve
const mockInsert = vi.fn();
const mockFrom = vi.fn();

function createChain(terminal: any = { error: null, data: null, count: 0 }) {
    const chain: any = {};
    const methods = ['select', 'insert', 'delete', 'eq', 'match', 'order', 'limit', 'single', 'gte', 'lte', 'neq', 'in', 'is'];
    methods.forEach(m => {
        chain[m] = vi.fn(() => chain);
    });
    // Make chain thenable so await resolves to terminal value
    chain.then = (resolve: any) => resolve(terminal);
    // Override insert to track calls
    chain.insert = mockInsert;
    mockInsert.mockImplementation(() => {
        const insertChain: any = {};
        methods.forEach(m => { insertChain[m] = vi.fn(() => insertChain); });
        insertChain.then = (resolve: any) => resolve({ error: null });
        return insertChain;
    });
    return chain;
}

vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve({
        from: mockFrom,
    })),
}));

// Mock Next.js revalidatePath
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

// Mock cookies
vi.mock('next/headers', () => ({
    cookies: vi.fn(() => ({ get: () => ({ value: 'America/New_York' }) })),
}));

describe('Server Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFrom.mockImplementation(() => createChain());
        mockInsert.mockImplementation(() => {
            const chain: any = {};
            chain.then = (resolve: any) => resolve({ error: null });
            return chain;
        });
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
                    xp: 40,
                })
            );
            expect(result).toMatchObject({ xp_earned: 40 });
        });

        it('logs nutrition to nutrition_logs table', async () => {
            const result = await logHabitAction('user-123', 'macro_protein', 150, 185, 'Protein');

            expect(mockFrom).toHaveBeenCalledWith('nutrition_logs');
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: 'user-123',
                    macro_type: 'protein',
                    amount: 150,
                    xp: 2,
                })
            );
            expect(result).toMatchObject({ xp_earned: 2 });
        });

        it('awards 16 XP for sleep habit', async () => {
            const result = await logHabitAction('user-123', 'habit_sleep', 8, 185, 'Sleep');

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    habit_id: 'habit_sleep',
                    xp: 16,
                })
            );
            expect(result).toMatchObject({ xp_earned: 16 });
        });

        it('awards 100 XP for meal prep habit', async () => {
            const result = await logHabitAction('user-123', 'habit_meal_prep', 1, 185, 'Meal Prep');

            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    habit_id: 'habit_meal_prep',
                    xp: 100,
                })
            );
            expect(result).toMatchObject({ xp_earned: 100 });
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
            mockInsert.mockImplementationOnce(() => {
                const chain: any = {};
                chain.then = (resolve: any) => resolve({ error: { message: 'Database error' } });
                return chain;
            });

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
                    xp: 0,
                })
            );
            expect(result).toMatchObject({ xp_earned: 0 });
        });

        it('logs stand hours habit', async () => {
            const result = await logHabitAction('user-123', 'habit_stand_hours', 12, 185, 'Stand');

            expect(mockFrom).toHaveBeenCalledWith('habit_logs');
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    habit_id: 'habit_stand_hours',
                    value: 12,
                    xp: 25,
                })
            );
            expect(result).toMatchObject({ xp_earned: 25 });
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
