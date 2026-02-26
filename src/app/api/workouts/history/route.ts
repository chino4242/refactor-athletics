// Just return the next 7 days for the skeleton history route so that
// the UI doesn't crash before we convert it fully into User Tracking.
import { NextResponse } from 'next/server';

export async function GET() {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return NextResponse.json(dates);
}
