/** Returns date as YYYY-MM-DD in the given timezone (or system local if omitted) */
export function getLocalDateStr(date: Date = new Date(), timeZone?: string): string {
    return timeZone
        ? date.toLocaleDateString('en-CA', { timeZone })
        : date.toLocaleDateString('en-CA');
}

/** Converts a unix timestamp (seconds) to YYYY-MM-DD */
export function tsToLocalDate(ts: number, timeZone?: string): string {
    return getLocalDateStr(new Date(ts * 1000), timeZone);
}
