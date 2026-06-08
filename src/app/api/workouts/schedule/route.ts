import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { processWorkoutText } from '@/utils/workoutParser';
import { createClient } from '@/utils/supabase/server';

const DAY_ORDER: Record<string, number> = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6
};

function inferType(blocks: any[]): string {
    const hasTreadmill = blocks.some(b => b.block_type === 'treadmill');
    const hasExercise = blocks.some(b => (b.block_type === 'exercise' || b.block_type === 'superset') && b.section !== 'warmup' && b.section !== 'cooldown');
    if (hasTreadmill && hasExercise) return 'Strength + Cardio';
    if (hasTreadmill && !hasExercise) return 'Cardio';
    if (!hasTreadmill && hasExercise) return 'Strength';
    return 'Recovery';
}

function generateTitle(blocks: any[], catalogMap: Map<string, any>): string {
    const mainBlocks = blocks.filter(b => (b.block_type === 'exercise' || b.block_type === 'superset') && b.section !== 'warmup' && b.section !== 'cooldown');
    const hasTreadmill = blocks.some(b => b.block_type === 'treadmill');

    if (mainBlocks.length === 0 && !hasTreadmill) return 'Active Recovery';
    if (mainBlocks.length === 0 && hasTreadmill) return 'Cardio Day';

    // Identify muscle groups from exercise categories
    const muscles = new Set<string>();
    for (const b of mainBlocks) {
        const cat = catalogMap.get(b.exercise_id);
        const category = (cat?.category || '').toLowerCase();
        const name = (cat?.name || b.exercise_id || '').toLowerCase();

        if (category.includes('chest') || name.includes('bench') || name.includes('push_up') || name.includes('chest')) muscles.add('Chest');
        else if (category.includes('back') || name.includes('row') || name.includes('pull') || name.includes('lat')) muscles.add('Back');
        else if (category.includes('leg') || name.includes('squat') || name.includes('deadlift') || name.includes('lunge') || name.includes('leg')) muscles.add('Legs');
        else if (category.includes('shoulder') || name.includes('press') || name.includes('shoulder') || name.includes('lateral')) muscles.add('Shoulders');
        else if (category.includes('arm') || name.includes('curl') || name.includes('tricep') || name.includes('bicep')) muscles.add('Arms');
        else if (category.includes('core') || name.includes('plank') || name.includes('crunch') || name.includes('ab')) muscles.add('Core');
        else if (category.includes('cardio') || category.includes('endurance')) muscles.add('Cardio');
        else muscles.add('Strength');
    }

    const parts = [...muscles].slice(0, 3);
    const title = parts.join(' + ');
    if (hasTreadmill) return parts.length > 0 ? `${title} + Cardio` : 'Cardio Day';
    return title || 'Strength';
}

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: catalog } = await supabase.from('catalog').select('*');

    // Try DB programs first (user's assigned programs matching their selected path)
    if (user) {
        const { data: userProfile } = await supabase.from('users').select('selected_path').eq('id', user.id).single();
        const selectedPath = userProfile?.selected_path || 'hybrid';

        const { data: dbPrograms } = await supabase
            .from('workout_programs')
            .select('id, name, description, day_of_week, training_path')
            .eq('user_id', user.id)
            .eq('training_path', selectedPath)
            .not('day_of_week', 'is', null);

        if (dbPrograms && dbPrograms.length > 0) {
            // Fetch all blocks for these programs in one query
            const programIds = dbPrograms.map(p => p.id);
            const { data: allBlocks } = await supabase
                .from('program_blocks')
                .select('*, workout_id')
                .in('workout_id', programIds)
                .order('block_order');

            const blocksByProgram = new Map<string, any[]>();
            (allBlocks || []).forEach(b => {
                const list = blocksByProgram.get(b.workout_id) || [];
                list.push(b);
                blocksByProgram.set(b.workout_id, list);
            });

            const catalogMap = new Map((catalog || []).map((c: any) => [c.id, c]));

            const schedule = dbPrograms.map(prog => {
                const blocks = blocksByProgram.get(prog.id) || [];
                const exerciseNames = blocks
                    .filter(b => b.block_type === 'exercise' && b.exercise_id)
                    .map(b => {
                        const cat = catalogMap.get(b.exercise_id);
                        return cat?.name || b.exercise_id.replace(/_/g, ' ');
                    })
                    .filter(n => !n.toLowerCase().includes('stretching') && !n.toLowerCase().includes('foam'));
                const treadmillCount = blocks.filter(b => b.block_type === 'treadmill').length;

                // Estimate XP
                let xp = 0;
                for (const b of blocks) {
                    if (b.block_type === 'treadmill') {
                        const secs = b.duration_seconds || 0;
                        const factor = b.intensity === 'all_out' ? 0.4 : b.intensity === 'push' ? 0.2 : 0.1;
                        xp += Math.floor(secs * factor);
                    } else if (b.block_type === 'exercise' && b.exercise_id) {
                        const cat = catalogMap.get(b.exercise_id);
                        const xpFactor = cat?.xp_factor || 1;
                        xp += Math.floor((b.target_sets || 3) * (b.target_reps || 10) * xpFactor);
                    }
                }

                const dayLower = (prog.day_of_week || '').toLowerCase();
                return {
                    day: dayLower,
                    title: generateTitle(blocks, catalogMap),
                    order: DAY_ORDER[dayLower] ?? 99,
                    xp,
                    type: blocks.length === 0 ? 'Recovery' : inferType(blocks),
                    exercises: exerciseNames,
                    treadmillBlocks: treadmillCount,
                };
            });

            schedule.sort((a, b) => a.order - b.order);
            return NextResponse.json(schedule);
        }

        // Fallback: check default programs for user's selected path
        const { data: defaultPrograms } = await supabase
            .from('workout_programs')
            .select('id, name, description, day_of_week, training_path')
            .eq('is_default', true)
            .eq('training_path', selectedPath)
            .not('day_of_week', 'is', null);

        if (defaultPrograms && defaultPrograms.length > 0) {
            const programIds = defaultPrograms.map(p => p.id);
            const { data: allBlocks } = await supabase
                .from('program_blocks')
                .select('*, workout_id')
                .in('workout_id', programIds)
                .order('block_order');

            const blocksByProgram = new Map<string, any[]>();
            (allBlocks || []).forEach(b => {
                const list = blocksByProgram.get(b.workout_id) || [];
                list.push(b);
                blocksByProgram.set(b.workout_id, list);
            });

            const catalogMap = new Map((catalog || []).map((c: any) => [c.id, c]));

            const schedule = defaultPrograms.map(prog => {
                const blocks = blocksByProgram.get(prog.id) || [];
                const exerciseNames = blocks
                    .filter(b => b.block_type === 'exercise' && b.exercise_id)
                    .map(b => {
                        const cat = catalogMap.get(b.exercise_id);
                        return cat?.name || b.exercise_id.replace(/_/g, ' ');
                    })
                    .filter(n => !n.toLowerCase().includes('stretching') && !n.toLowerCase().includes('foam'));
                const treadmillCount = blocks.filter(b => b.block_type === 'treadmill').length;

                let xp = 0;
                for (const b of blocks) {
                    if (b.block_type === 'treadmill') {
                        const secs = b.duration_seconds || 0;
                        const factor = b.intensity === 'all_out' ? 0.4 : b.intensity === 'push' ? 0.2 : 0.1;
                        xp += Math.floor(secs * factor);
                    } else if (b.block_type === 'exercise' && b.exercise_id) {
                        const cat = catalogMap.get(b.exercise_id);
                        const xpFactor = cat?.xp_factor || 1;
                        xp += Math.floor((b.target_sets || 3) * (b.target_reps || 10) * xpFactor);
                    }
                }

                const dayLower = (prog.day_of_week || '').toLowerCase();
                return {
                    day: dayLower,
                    title: generateTitle(blocks, catalogMap),
                    order: DAY_ORDER[dayLower] ?? 99,
                    xp,
                    type: blocks.length === 0 ? 'Recovery' : selectedPath.charAt(0).toUpperCase() + selectedPath.slice(1),
                    exercises: exerciseNames,
                    treadmillBlocks: treadmillCount,
                };
            });

            schedule.sort((a, b) => a.order - b.order);
            return NextResponse.json(schedule);
        }
    }

    // Fallback: text file system
    const publicWorkoutsDir = path.join(process.cwd(), 'public', 'workouts', 'weekly');
    if (!fs.existsSync(publicWorkoutsDir)) return NextResponse.json([]);

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
            const firstLine = lines[0]?.trim() || "";
            if (firstLine && !firstLine.startsWith("#") && !firstLine.startsWith("[")) title = firstLine;
            else if (firstLine.startsWith("#")) title = firstLine.replace("#", "").trim();

            const blocks = processWorkoutText(content, catalog || []);
            xpValue = blocks.reduce((acc: number, b: any) => acc + (b.xp_value || 0), 0);
            exerciseNames = blocks
                .filter((b: any) => b.exercise_id || b.name)
                .map((b: any) => (b.name || b.exercise_id || '').replace(/_/g, ' '))
                .filter((n: string) => n && !n.toLowerCase().includes('treadmill'));
            treadmillCount = blocks.filter((b: any) => (b.name || b.exercise_id || '').toLowerCase().includes('treadmill')).length;

            const contentUpper = content.toUpperCase();
            const hasTread = contentUpper.includes("TREADMILL") || contentUpper.includes("ENGINE");
            const hasStrength = contentUpper.includes("STRENGTH") || contentUpper.includes("ARMOR");
            if (hasTread && !hasStrength) wType = "Cardio";
            else if (hasTread && hasStrength) wType = "Hybrid";
            else if (contentUpper.includes("RECOVERY")) wType = "Recovery";
        } catch (e: any) {
            console.error(`Error parsing schedule ${filename}: ${e.message}`);
        }

        schedule.push({ day: dayName, title, order: DAY_ORDER[dayName] ?? 99, xp: xpValue, type: wType, exercises: exerciseNames, treadmillBlocks: treadmillCount });
    }

    schedule.sort((a, b) => a.order - b.order);
    return NextResponse.json(schedule);
}
