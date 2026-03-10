import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type RouteContext = {
    params: Promise<{ day: string }>;
};

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    const { day } = await context.params;
    const dayLower = day.toLowerCase();
    const filePath = path.join(process.cwd(), 'public', 'workouts', 'weekly', `${dayLower}.txt`);

    if (!fs.existsSync(filePath)) {
        return new NextResponse('Workout not found', { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return new NextResponse(content, {
        headers: { 'Content-Type': 'text/plain' }
    });
}

export async function PUT(
    request: NextRequest,
    context: RouteContext
) {
    const { day } = await context.params;
    const dayLower = day.toLowerCase();
    const filePath = path.join(process.cwd(), 'public', 'workouts', 'weekly', `${dayLower}.txt`);
    
    const content = await request.text();
    
    try {
        fs.writeFileSync(filePath, content, 'utf8');
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save workout' }, { status: 500 });
    }
}
