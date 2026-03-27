import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { processWorkoutText } from '@/utils/workoutParser';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    const publicWorkoutsDir = path.join(process.cwd(), 'public', 'workouts', 'weekly');

    if (!fs.existsSync(publicWorkoutsDir)) {
        return NextResponse.json([]);
    }

    const supabase = await createClient();
    const { data: catalog } = await supabase.from('catalog').select('*');

    const dayOrder: Record<string, number> = {
        "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
        "friday": 4, "saturday": 5, "sunday": 6
    };

    const schedule: any[] = [];
    const files = fs.readdirSync(publicWorkoutsDir);

    for (const filename of files) {
        if (!filename.endsWith('.txt')) continue;

        const dayName = filename.replace('.txt', '').toLowerCase();
        let title = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        let xpValue = 0;
        let wType = "Strength";
        let exerciseNames: string[] = [];
        let treadmillCount = 0;

        try {
            const content = fs.readFileSync(path.join(publicWorkoutsDir, filename), 'utf8');
            const lines = content.split('\n');
            const firstLine = lines.length > 0 ? lines[0].trim() : "";

            if (firstLine && !firstLine.startsWith("#") && !firstLine.startsWith("[")) {
                title = firstLine;
            } else if (firstLine.startsWith("#")) {
                title = firstLine.replace("#", "").trim();
            }

            const blocks = processWorkoutText(content, catalog || []);
            xpValue = blocks.reduce((acc, b) => acc + (b.xp_value || 0), 0);

            // Extract exercise names for preview
            exerciseNames = blocks
                .filter((b: any) => b.exercise_id || b.name)
                .map((b: any) => (b.name || b.exercise_id || '').replace(/_/g, ' '))
                .filter((n: string) => n && !n.toLowerCase().includes('treadmill'));
            treadmillCount = blocks.filter((b: any) => 
                (b.name || b.exercise_id || '').toLowerCase().includes('treadmill')
            ).length;

            const contentUpper = content.toUpperCase();
            const hasTread = contentUpper.includes("TREADMILL") || contentUpper.includes("ENGINE");
            const hasStrength = contentUpper.includes("STRENGTH") || contentUpper.includes("ARMOR");

            if (hasTread && !hasStrength) wType = "Cardio";
            else if (hasTread && hasStrength) wType = "Hybrid";
            else if (contentUpper.includes("RECOVERY")) wType = "Recovery";

        } catch (e: any) {
            console.error(`Error parsing schedule ${filename}: ${e.message}`);
        }

        schedule.push({
            day: dayName,
            title: title,
            order: dayOrder[dayName] !== undefined ? dayOrder[dayName] : 99,
            xp: xpValue,
            type: wType,
            exercises: exerciseNames,
            treadmillBlocks: treadmillCount
        });
    }

    schedule.sort((a, b) => a.order - b.order);
    return NextResponse.json(schedule);
}
