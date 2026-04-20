import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
    const { day1, day2 } = await request.json();
    if (!day1 || !day2) return NextResponse.json({ error: 'Missing days' }, { status: 400 });

    const dir = path.join(process.cwd(), 'public', 'workouts', 'weekly');
    const file1 = path.join(dir, `${day1}.txt`);
    const file2 = path.join(dir, `${day2}.txt`);

    if (!fs.existsSync(file1) || !fs.existsSync(file2)) {
        return NextResponse.json({ error: 'Workout file not found' }, { status: 404 });
    }

    const content1 = fs.readFileSync(file1, 'utf8');
    const content2 = fs.readFileSync(file2, 'utf8');
    fs.writeFileSync(file1, content2, 'utf8');
    fs.writeFileSync(file2, content1, 'utf8');

    return NextResponse.json({ success: true });
}
