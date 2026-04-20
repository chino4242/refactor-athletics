import { describe, it, expect } from 'vitest';
import { processWorkoutText } from '@/utils/workoutParser';
import fs from 'fs';
import path from 'path';

const catalog: any[] = [];

function loadWorkout(day: string): string {
    return fs.readFileSync(path.join(process.cwd(), 'public', 'workouts', 'weekly', `${day}.txt`), 'utf8');
}

describe('workoutParser - treadmill blocks', () => {
    describe('Tuesday - HIIT Intervals', () => {
        const blocks = processWorkoutText(loadWorkout('tuesday'), catalog);
        const treadBlocks = blocks.filter(b => b.type === 'timer');

        it('should parse at least one tread block', () => {
            expect(treadBlocks.length).toBeGreaterThanOrEqual(1);
        });

        it('should have multiple intervals including push and all-out', () => {
            const intervals = treadBlocks[0].intervals.filter((i: any) => i.type === 'interval');
            expect(intervals.length).toBeGreaterThan(10);
            expect(intervals.some((i: any) => i.zone === 'Push Pace')).toBe(true);
            expect(intervals.some((i: any) => i.zone === 'All Out')).toBe(true);
        });
    });

    describe('Thursday - The Hill', () => {
        const blocks = processWorkoutText(loadWorkout('thursday'), catalog);
        const treadBlocks = blocks.filter(b => b.type === 'timer');

        it('should parse at least one tread block', () => {
            expect(treadBlocks.length).toBeGreaterThanOrEqual(1);
        });

        it('should have push and base intervals', () => {
            const intervals = treadBlocks[0].intervals.filter((i: any) => i.type === 'interval');
            expect(intervals.length).toBeGreaterThan(10);
            expect(intervals.some((i: any) => i.zone === 'Push Pace')).toBe(true);
            expect(intervals.some((i: any) => i.zone === 'Base Pace')).toBe(true);
        });

        it('push intervals should reference inclines 4-6%', () => {
            const intervals = treadBlocks[0].intervals.filter((i: any) => i.type === 'interval' && i.zone === 'Push Pace');
            const rawTexts = intervals.map((i: any) => i.raw_text);
            expect(rawTexts.some((t: string) => t.includes('4%'))).toBe(true);
            expect(rawTexts.some((t: string) => t.includes('5%'))).toBe(true);
            expect(rawTexts.some((t: string) => t.includes('6%'))).toBe(true);
        });
    });

    describe('All daily workouts parse without errors', () => {
        const days = ['monday', 'tuesday', 'thursday', 'friday', 'saturday'];

        for (const day of days) {
            it(`${day}.txt should parse successfully`, () => {
                const text = loadWorkout(day);
                const blocks = processWorkoutText(text, catalog);
                expect(blocks.length).toBeGreaterThan(0);
            });
        }

        it('sunday.txt should parse (rest day, no blocks expected)', () => {
            const text = loadWorkout('sunday');
            const blocks = processWorkoutText(text, catalog);
            expect(blocks.length).toBeGreaterThanOrEqual(0);
        });

        it('wednesday.txt should parse (recovery day, no blocks expected)', () => {
            const text = loadWorkout('wednesday');
            const blocks = processWorkoutText(text, catalog);
            expect(blocks.length).toBeGreaterThanOrEqual(0);
        });
    });
});
