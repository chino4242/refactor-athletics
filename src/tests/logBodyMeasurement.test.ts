import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logBodyMeasurementAction } from '@/app/actions';

let mockExistingRow: any = null;
let mockInsertError: any = null;
let mockUpdateError: any = null;
const insertSpy = vi.fn();
const updateSpy = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve({
        from: vi.fn((table: string) => {
            if (table !== 'body_measurements') throw new Error(`Unexpected table: ${table}`);
            return {
                // select chain for existence check
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            limit: vi.fn(() => ({
                                single: vi.fn(() => Promise.resolve({ data: mockExistingRow, error: null }))
                            }))
                        }))
                    }))
                })),
                // insert
                insert: vi.fn((data) => {
                    insertSpy(data);
                    return Promise.resolve({ error: mockInsertError });
                }),
                // update chain
                update: vi.fn((data) => {
                    updateSpy(data);
                    return {
                        eq: vi.fn(() => Promise.resolve({ error: mockUpdateError }))
                    };
                }),
            };
        }),
    })),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ get: () => ({ value: 'America/New_York' }) })) }));

describe('logBodyMeasurementAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockExistingRow = null;
        mockInsertError = null;
        mockUpdateError = null;
    });

    it('inserts a new row when no entry exists for that date', async () => {
        const result = await logBodyMeasurementAction('user-1', { waist: 38 }, undefined, 1774342426);

        expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
            user_id: 'user-1',
            date: '2026-03-24',
            waist: 38,
            xp: 5,
        }));
        expect(updateSpy).not.toHaveBeenCalled();
        expect(result).toEqual({ xp_earned: 5 });
    });

    it('updates existing row when entry exists for same date', async () => {
        mockExistingRow = { id: 'existing-row-id', source: {} };

        const result = await logBodyMeasurementAction('user-1', { arms: 14 }, undefined, 1774342446);

        expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
            arms: 14,
            timestamp: 1774342446,
        }));
        expect(insertSpy).not.toHaveBeenCalled();
        expect(result).toEqual({ xp_earned: 5 });
    });

    it('merges multiple metrics into existing row', async () => {
        mockExistingRow = { id: 'existing-row-id', source: {} };

        await logBodyMeasurementAction('user-1', { chest: 40, shoulders: 48 }, undefined, 1774342500);

        expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
            chest: 40,
            shoulders: 48,
        }));
    });

    it('throws error when insert fails', async () => {
        mockInsertError = { message: 'insert failed' };

        await expect(
            logBodyMeasurementAction('user-1', { weight: 185 }, undefined, 1774342426)
        ).rejects.toEqual({ message: 'insert failed' });
    });

    it('throws error when update fails', async () => {
        mockExistingRow = { id: 'existing-row-id', source: {} };
        mockUpdateError = { message: 'update failed' };

        await expect(
            logBodyMeasurementAction('user-1', { weight: 185 }, undefined, 1774342426)
        ).rejects.toEqual({ message: 'update failed' });
    });

    it('generates timestamp and date when not provided', async () => {
        const before = Math.floor(Date.now() / 1000);
        await logBodyMeasurementAction('user-1', { weight: 185 });
        const after = Math.floor(Date.now() / 1000);

        const insertedData = insertSpy.mock.calls[0][0];
        expect(insertedData.timestamp).toBeGreaterThanOrEqual(before);
        expect(insertedData.timestamp).toBeLessThanOrEqual(after);
        expect(insertedData.date).toBe(new Date(insertedData.timestamp * 1000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }));
    });
});
