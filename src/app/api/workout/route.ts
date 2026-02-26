import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { processWorkoutText } from '@/utils/workoutParser';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dateQuery = searchParams.get('date');

    // We fetch catalog locally here using the server-side Supabase client
    const supabase = await createClient();
    const { data: catalog } = await supabase.from('catalog').select('*');

    // 1. Determine Date or Day
    let targetDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    if (dateQuery) {
        if (/^[a-zA-Z]+$/.test(dateQuery)) {
            // Direct day name (e.g., "monday")
            targetDay = dateQuery.toLowerCase();
        } else {
            // It's a date string like "2026-02-25"
            try {
                // Adjusting for timezone discrepancies by appending time
                const dt = new Date(`${dateQuery}T12:00:00Z`);
                targetDay = dt.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            } catch (e) {
                // keep targetDay as current day
            }
        }
    }

    // 2. Find template path
    const publicWorkoutsDir = path.join(process.cwd(), 'public', 'workouts', 'weekly');
    const templatePath = path.join(publicWorkoutsDir, `${targetDay}.txt`);

    if (!fs.existsSync(templatePath)) {
        console.error(`❌ Template not found for ${targetDay} at ${templatePath}`);
        return NextResponse.json([]);
    }

    try {
        const rawText = fs.readFileSync(templatePath, 'utf8');
        const data = processWorkoutText(rawText, catalog || []);

        return NextResponse.json(data);
    } catch (e: any) {
        console.error(`❌ Error parsing workout: ${e.message}`);
        return NextResponse.json([]);
    }
}
