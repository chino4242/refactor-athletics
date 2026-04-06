/**
 * Parse a rep string into a per-set array of numbers.
 * Returns null entries for sets where the user should enter reps manually.
 *
 * Examples:
 *   parseReps("12", 4)           → [12, 12, 12, 12]
 *   parseReps("10, 8, 6, 4", 4) → [10, 8, 6, 4]
 *   parseReps("10-12", 3)       → [10, 10, 10]
 *   parseReps("Failure", 4)     → [null, null, null, null]
 *   parseReps("15 per leg", 3)  → [15, 15, 15]
 *   parseReps("Max Reps", 1)    → [null]
 */
export function parseReps(repsStr: string, sets: number): (number | null)[] {
    const s = repsStr.trim();

    // "Failure", "Max Reps", "Max", "AMRAP" → user enters
    if (/^(failure|max|amrap)/i.test(s)) {
        return Array(sets).fill(null);
    }

    // "10, 8, 6, 4" → descending/explicit per-set
    if (s.includes(',')) {
        const parts = s.split(',').map(p => parseInt(p.trim(), 10));
        return Array.from({ length: sets }, (_, i) => {
            const v = parts[i] ?? parts[parts.length - 1];
            return isNaN(v) ? null : v;
        });
    }

    // "10-12" → use lower bound
    const rangeMatch = s.match(/^(\d+)\s*-\s*\d+/);
    if (rangeMatch) {
        return Array(sets).fill(parseInt(rangeMatch[1], 10));
    }

    // "15 per leg" or "20 each" → strip suffix, use number
    const numMatch = s.match(/^(\d+)/);
    if (numMatch) {
        return Array(sets).fill(parseInt(numMatch[1], 10));
    }

    // Unparseable → user enters
    return Array(sets).fill(null);
}
