// Just return the next 7 days for the skeleton history route so that
// the UI doesn't crash before we convert it fully into User Tracking.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
    let tz = 'UTC';
    try { tz = (await cookies()).get('timezone')?.value || 'UTC'; } catch {}
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toLocaleDateString('en-CA', { timeZone: tz }));
    }
    return NextResponse.json(dates);
}
