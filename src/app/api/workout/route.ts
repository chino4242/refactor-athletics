import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { processWorkoutText } from '@/utils/workoutParser';
import { createClient } from '@/utils/supabase/server';

function dateToDayName(dateStr: string): string {
    if (/^[a-zA-Z]+$/.test(dateStr)) return dateStr.toLowerCase();
    try {
        const dt = new Date(`${dateStr}T12:00:00Z`);
        return dt.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    } catch {
        return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    }
}

function intensityToZone(intensity: string | null): [string, string] {
    switch (intensity) {
        case 'all_out': return ['All Out', 'bg-red-600'];
        case 'push': return ['Push Pace', 'bg-orange-500'];
        case 'zone2': return ['Base Pace', 'bg-green-500'];
        case 'base': return ['Base Pace', 'bg-green-500'];
        default: return ['Base Pace', 'bg-green-500'];
    }
}

function dbBlocksToWorkoutBlocks(blocks: any[], catalog: any[]): any[] {
    const catalogMap = new Map(catalog.map((c: any) => [c.id, c]));
    const result: any[] = [];

    // Group consecutive treadmill blocks into timer blocks
    let treadmillGroup: any[] = [];
    let treadmillSection = 'Engine';

    const flushTreadmill = () => {
        if (treadmillGroup.length === 0) return;
        const totalSecs = treadmillGroup.reduce((s, b) => s + (b.duration_seconds || 0), 0);
        const totalMins = Math.round(totalSecs / 60);
        const intervals = treadmillGroup.map(b => {
            const [zone, color] = intensityToZone(b.intensity);
            const secs = b.duration_seconds || 60;
            const incline = b.incline || 0;
            return {
                type: 'interval',
                seconds: secs,
                zone,
                color,
                note: incline > 0 ? `${incline}% incline` : null,
                raw_text: `${Math.round(secs / 60)} min ${zone}${incline > 0 ? ` @ ${incline}%` : ''}`,
                outdoor_alternative: b.outdoor_alternative || null,
            };
        });

        let xp = 0;
        for (const b of treadmillGroup) {
            const secs = b.duration_seconds || 0;
            const factor = b.intensity === 'all_out' ? 0.4 : b.intensity === 'push' ? 0.2 : 0.1;
            xp += Math.floor(secs * factor);
        }

        result.push({
            name: `Tread Block - ${totalMins} min`,
            type: 'timer',
            intervals,
            section: treadmillSection,
            xp_value: xp,
        });
        treadmillGroup = [];
    };

    for (const block of blocks) {
        if (block.block_type === 'treadmill') {
            treadmillSection = block.section === 'warmup' ? 'Engine' : (block.section || 'Engine');
            treadmillGroup.push(block);
            continue;
        }

        // Flush any pending treadmill blocks before an exercise
        flushTreadmill();

        if (block.block_type === 'exercise') {
            const cat = catalogMap.get(block.exercise_id);
            const name = cat?.name || (block.exercise_id || 'Exercise').replace(/_/g, ' ');
            const xpFactor = cat?.xp_factor || 1;
            const sets = block.target_sets || 1;
            const reps = block.target_reps || 10;
            const xp = Math.floor(sets * reps * xpFactor);

            const sectionMap: Record<string, string> = {
                warmup: 'Engine',
                main: 'Armor',
                core: 'Core Work',
                cooldown: 'Cooldown',
            };

            result.push({
                name,
                exercise_id: block.exercise_id,
                type: 'checklist_exercise',
                sets,
                reps_per_set: block.target_duration_seconds ? `${block.target_duration_seconds}s` : String(reps),
                rest_seconds: block.rest_seconds || 90,
                xp_value: xp,
                section: sectionMap[block.section] || block.section || 'Armor',
                tips: block.notes ? [block.notes] : [],
                target_duration_seconds: block.target_duration_seconds || null,
                outdoor_alternative: block.outdoor_alternative || null,
            });
        } else if (block.block_type === 'superset' && block.exercises) {
            const exercises = (block.exercises as any[]).map(ex => {
                const cat = catalogMap.get(ex.exercise_id);
                return {
                    name: cat?.name || ex.name || 'Exercise',
                    exercise_id: ex.exercise_id || null,
                    reps: ex.reps || '10',
                    sets: block.target_sets || 3,
                };
            });
            const sets = block.target_sets || 3;
            const xp = sets * exercises.length * 15;

            const sectionMap: Record<string, string> = {
                warmup: 'Engine', main: 'Armor', core: 'Core Work', cooldown: 'Cooldown',
            };

            const nameList = exercises.map(e => e.name).join(' + ');
            result.push({
                name: `Superset (${nameList})`,
                type: 'superset',
                sets,
                rest_seconds: block.rest_seconds || 60,
                xp_value: xp,
                section: sectionMap[block.section] || block.section || 'Armor',
                tips: block.notes ? [block.notes] : [],
                exercises,
            });
        }
    }

    flushTreadmill();
    return result;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dateQuery = searchParams.get('date');
    const targetDay = dateToDayName(dateQuery || '');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: catalog } = await supabase.from('catalog').select('*');

    // Try DB programs first
    if (user) {
        const { data: program } = await supabase
            .from('workout_programs')
            .select('id, name')
            .eq('user_id', user.id)
            .eq('day_of_week', targetDay)
            .single();

        if (program) {
            const { data: blocks } = await supabase
                .from('program_blocks')
                .select('*')
                .eq('workout_id', program.id)
                .order('block_order');

            if (blocks && blocks.length > 0) {
                return NextResponse.json(dbBlocksToWorkoutBlocks(blocks, catalog || []));
            }
            // Rest day — no blocks
            return NextResponse.json([]);
        }
    }

    // Fallback: check default programs in DB for user's training path
    let userPath = 'hybrid';
    if (user) {
        const { data: profile } = await supabase.from('users').select('selected_path').eq('id', user.id).single();
        userPath = profile?.selected_path || 'hybrid';
    }

    const { data: defaultProg } = await supabase
        .from('workout_programs')
        .select('id')
        .eq('is_default', true)
        .eq('training_path', userPath)
        .eq('day_of_week', targetDay)
        .limit(1)
        .single();

    if (defaultProg) {
        const { data: blocks } = await supabase
            .from('program_blocks')
            .select('*')
            .eq('workout_id', defaultProg.id)
            .order('block_order');

        if (blocks && blocks.length > 0) {
            return NextResponse.json(dbBlocksToWorkoutBlocks(blocks, catalog || []));
        }
    }

    // Fallback: text file system
    const publicWorkoutsDir = path.join(process.cwd(), 'public', 'workouts', 'weekly');
    const templatePath = path.join(publicWorkoutsDir, `${targetDay}.txt`);

    if (!fs.existsSync(templatePath)) return NextResponse.json([]);

    try {
        const rawText = fs.readFileSync(templatePath, 'utf8');
        return NextResponse.json(processWorkoutText(rawText, catalog || []));
    } catch (e: any) {
        console.error(`Error parsing workout: ${e.message}`);
        return NextResponse.json([]);
    }
}
