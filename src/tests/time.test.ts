import { describe, it, expect } from 'vitest';
import { formatTime } from '@/utils/time';

describe('Time Formatting Utility', () => {
    it('formats standard times correctly', () => {
        expect(formatTime(65)).toBe('01:05');
        expect(formatTime(120)).toBe('02:00');
        expect(formatTime(59)).toBe('00:59');
    });

    it('pads single digits with zero', () => {
        expect(formatTime(9)).toBe('00:09');
        expect(formatTime(0)).toBe('00:00');
    });

    it('handles negative numbers safely (returns 00:00)', () => {
        expect(formatTime(-5)).toBe('00:00');
    });

    it('handles large times (hour+)', () => {
        // 3605 seconds = 60 mins 5 sec -> "60:05"
        expect(formatTime(3605)).toBe('60:05');
    });
});
