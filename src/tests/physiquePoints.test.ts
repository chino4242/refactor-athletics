import { describe, it, expect } from 'vitest';
import { calculatePhysiquePoints } from '@/utils/physiquePoints';

describe('calculatePhysiquePoints', () => {
    it('returns No Data when fewer than 2 entries', () => {
        expect(calculatePhysiquePoints([], {})).toEqual({ score: 0, status: 'No Data', color: 'text-zinc-400' });
        expect(calculatePhysiquePoints([{ waist: 38 }], { waist: 'Shrink' })).toEqual({ score: 0, status: 'No Data', color: 'text-zinc-400' });
    });

    it('calculates positive score for shrink goal when metric decreases', () => {
        const history = [{ waist: 38 }, { waist: 36 }];
        const result = calculatePhysiquePoints(history, { waist: 'Shrink' });
        expect(result.score).toBe(2);
    });

    it('calculates positive score for grow goal when metric increases', () => {
        const history = [{ arms: 14 }, { arms: 15.5 }];
        const result = calculatePhysiquePoints(history, { arms: 'Grow' });
        expect(result.score).toBe(1.5);
    });

    it('calculates negative score when moving away from goal', () => {
        const history = [{ waist: 36 }, { waist: 38 }];
        const result = calculatePhysiquePoints(history, { waist: 'Shrink' });
        expect(result.score).toBe(-2);
    });

    it('ignores metrics with no goal set', () => {
        const history = [{ waist: 38, arms: 14 }, { waist: 36, arms: 16 }];
        const result = calculatePhysiquePoints(history, { waist: 'Shrink' });
        expect(result.score).toBe(2); // only waist counted
    });

    it('ignores metrics with Maintain goal', () => {
        const history = [{ weight: 200 }, { weight: 190 }];
        const result = calculatePhysiquePoints(history, { weight: 'Maintain' });
        expect(result.score).toBe(0);
        expect(result.status).toBe('Maintaining');
    });

    it('sums multiple metrics together', () => {
        const history = [
            { waist: 38, arms: 14, chest: 40 },
            { waist: 36, arms: 15, chest: 42 },
        ];
        const goals = { waist: 'Shrink', arms: 'Grow', chest: 'Grow' };
        // waist: -(36-38) = +2, arms: +(15-14) = +1, chest: +(42-40) = +2
        const result = calculatePhysiquePoints(history, goals);
        expect(result.score).toBe(5);
    });

    it('skips null values and finds earliest/latest non-null per metric', () => {
        const history = [
            { waist: null, arms: 14 },
            { waist: 38, arms: null },
            { waist: 36, arms: null },
            { waist: null, arms: 15 },
        ];
        const goals = { waist: 'Shrink', arms: 'Grow' };
        // waist: earliest=38, latest=36, -(36-38) = +2
        // arms: earliest=14, latest=15, +(15-14) = +1
        const result = calculatePhysiquePoints(history, goals);
        expect(result.score).toBe(3);
    });

    it('skips metric when only one non-null value exists', () => {
        const history = [
            { waist: 38, arms: null },
            { waist: null, arms: 14 },
        ];
        const goals = { waist: 'Shrink', arms: 'Grow' };
        // waist: only one value (38), skipped (base === curr)
        // arms: only one value (14), skipped
        const result = calculatePhysiquePoints(history, goals);
        expect(result.score).toBe(0);
    });

    it('rounds to 1 decimal place', () => {
        const history = [{ waist: 38 }, { waist: 37.75 }];
        const result = calculatePhysiquePoints(history, { waist: 'Shrink' });
        expect(result.score).toBe(0.3); // -(37.75-38) = 0.25, rounded to 0.3
    });

    it('is case-insensitive for goal values', () => {
        const history = [{ arms: 14 }, { arms: 16 }];
        expect(calculatePhysiquePoints(history, { arms: 'GROW' }).score).toBe(2);
        expect(calculatePhysiquePoints(history, { arms: 'grow' }).score).toBe(2);
        expect(calculatePhysiquePoints(history, { arms: 'Grow' }).score).toBe(2);
    });

    // Status thresholds
    it('returns Crushing It when score > 10', () => {
        const history = [{ weight: 200 }, { weight: 185 }];
        const result = calculatePhysiquePoints(history, { weight: 'Shrink' });
        expect(result.score).toBe(15);
        expect(result.status).toBe('🔥 Crushing It');
        expect(result.color).toBe('text-emerald-400');
    });

    it('returns On Track when score > 5 and <= 10', () => {
        const history = [{ weight: 200 }, { weight: 192 }];
        const result = calculatePhysiquePoints(history, { weight: 'Shrink' });
        expect(result.score).toBe(8);
        expect(result.status).toBe('🎯 On Track');
    });

    it('returns Progressing when score > 0 and <= 5', () => {
        const history = [{ waist: 38 }, { waist: 36 }];
        const result = calculatePhysiquePoints(history, { waist: 'Shrink' });
        expect(result.score).toBe(2);
        expect(result.status).toBe('✓ Progressing');
        expect(result.color).toBe('text-green-400');
    });

    it('returns Slipping when score < 0 and >= -5', () => {
        const history = [{ waist: 36 }, { waist: 38 }];
        const result = calculatePhysiquePoints(history, { waist: 'Shrink' });
        expect(result.score).toBe(-2);
        expect(result.status).toBe('⚠️ Slipping');
        expect(result.color).toBe('text-yellow-400');
    });

    it('returns Off Track when score < -5', () => {
        const history = [{ weight: 185 }, { weight: 200 }];
        const result = calculatePhysiquePoints(history, { weight: 'Shrink' });
        expect(result.score).toBe(-15);
        expect(result.status).toBe('🚨 Off Track');
        expect(result.color).toBe('text-rose-400');
    });

    it('returns Maintaining when score is exactly 0', () => {
        const history = [{ waist: 38 }, { waist: 38 }];
        const result = calculatePhysiquePoints(history, { waist: 'Shrink' });
        expect(result.score).toBe(0);
        expect(result.status).toBe('Maintaining');
    });
});
