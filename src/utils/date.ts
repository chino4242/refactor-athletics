/** Returns date as YYYY-MM-DD in the given timezone (or user's local if omitted) */
export function getLocalDateStr(date: Date = new Date(), timeZone?: string): string {
    return date.toLocaleDateString('en-CA', { timeZone: timeZone || getUserTimezone() });
}

/** Converts a unix timestamp (seconds) to YYYY-MM-DD */
export function tsToLocalDate(ts: number, timeZone?: string): string {
    return getLocalDateStr(new Date(ts * 1000), timeZone);
}

/** Returns today's date as YYYY-MM-DD in the user's timezone. Use this everywhere instead of new Date().toLocaleDateString('en-CA'). */
export function getToday(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: getUserTimezone() });
}

/** Gets the user's timezone from the browser. Falls back to America/New_York. */
function getUserTimezone(): string {
    if (typeof window !== 'undefined') {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return 'America/New_York';
}

/**
 * Parse a YYYY-MM-DD date string into a Date object anchored at noon local time.
 * Prevents timezone offsets from shifting the calendar day.
 * Use ONLY when you need a Date object (display formatting, day-of-week, arithmetic).
 * For filtering/comparisons, prefer string comparison directly: row.date >= weekStartStr
 */
export function parseLocalDate(dateStr: string): Date {
    return new Date(dateStr + 'T12:00:00');
}

/**
 * Get today's YYYY-MM-DD in a specific timezone (for server-side use).
 * On Vercel/Node, new Date() is UTC — this converts to the user's local day.
 */
export function getServerToday(timezone: string): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}

/**
 * Get Monday of the current week as YYYY-MM-DD in the specified timezone.
 */
export function getServerWeekStart(timezone: string): string {
    const todayStr = getServerToday(timezone);
    const [y, m, d] = todayStr.split('-').map(Number);
    const local = new Date(y, m - 1, d, 12);
    const day = local.getDay();
    local.setDate(local.getDate() - ((day + 6) % 7));
    return local.toLocaleDateString('en-CA');
}
