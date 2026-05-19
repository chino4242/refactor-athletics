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
