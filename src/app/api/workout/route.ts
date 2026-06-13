import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { processWorkoutText } from '@/utils/workoutParser';
import { createClient } from '@/utils/supabase/server';

function dateToDayName(dateStr: string): string {
    if (!dateStr) return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (/^[a-zA-Z]+$/.test(dateStr)) return dateStr.toLowerCase();
    try {
        const dt = new Date(`${dateStr}T12:00:00Z`);
        if (isNaN(dt.getTime())) return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        return dt.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    } catch {
        return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    }
}

function intensityToZone(intensity: string | null): [string, string] {
    switch (intensity) {
        case 'all_out': return ['Full Send', 'bg-red-600'];
        case 'push': return ['Challenging', 'bg-orange-500'];
        case 'zone2': return ['Comfortable', 'bg-green-500'];
        case 'base': return ['Comfortable', 'bg-green-500'];
        default: return ['Comfortable', 'bg-green-500'];
    }
}

function applyEquipmentSwaps(blocks: any[], userEquipment: Set<string>): any[] {
    return blocks.map(b => {
        if (b.block_type !== 'exercise' || !b.alt_exercise_id || !b.alt_equipment?.length) return b;
        const needsSwap = b.alt_equipment.some((eq: string) => !userEquipment.has(eq));
        if (needsSwap) return { ...b, exercise_id: b.alt_exercise_id };
        return b;
    });
}

function dbBlocksToWorkoutBlocks(blocks: any[], catalog: any[], cardioType: string = 'treadmill'): any[] {
    const catalogMap = new Map(catalog.map((c: any) => [c.id, c]));
    const result: any[] = [];
    const cardioLabel = cardioType === 'rower' ? 'Row' : cardioType === 'bike' ? 'Bike' : cardioType === 'elliptical' ? 'Elliptical' : 'Tread';

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
            const effortNote = incline > 0
              ? cardioType === 'rower' ? 'push the pace' : cardioType === 'bike' ? 'add resistance' : `${incline}% incline`
              : null;
            return {
                type: 'interval',
                seconds: secs,
                zone,
                color,
                note: effortNote,
                raw_text: secs % 60 === 0 ? `${secs / 60} min ${zone}${effortNote ? ` — ${effortNote}` : ''}` : `${secs}s ${zone}${effortNote ? ` — ${effortNote}` : ''}`,
                outdoor_alternative: b.outdoor_alternative || null,
            };
        });

        let xp = 0;
        for (const b of treadmillGroup) {
            const secs = b.duration_seconds || 0;
            const factor = b.intensity === 'all_out' ? 0.4 : b.intensity === 'push' ? 0.2 : 0.1;
            xp += Math.floor(secs * factor);
        }

        // Inject 5-min Zone 2 warmup and cooldown if not already present
        const warmup = { type: 'interval' as const, seconds: 300, zone: 'Comfortable', color: 'bg-green-500', note: 'Easy pace — warm up', raw_text: '5 min Comfortable (Warm-Up)' };
        const cooldown = { type: 'interval' as const, seconds: 300, zone: 'Comfortable', color: 'bg-green-500', note: 'Easy pace — cool down', raw_text: '5 min Comfortable (Cool Down)' };

        const firstInterval = intervals[0];
        const lastInterval = intervals[intervals.length - 1];
        const hasWarmup = firstInterval && /(comfortable|base)/i.test(firstInterval.zone || '');
        const hasCooldown = lastInterval && /(comfortable|base|recovery)/i.test(lastInterval.zone || '');
        const finalIntervals = [
            ...(hasWarmup ? [] : [warmup]),
            ...intervals,
            ...(hasCooldown ? [] : [cooldown]),
        ];

        result.push({
            name: `${cardioLabel} Block - ${Math.round(finalIntervals.reduce((s, i) => s + (i.seconds || 0), 0) / 60)} min`,
            type: 'timer',
            intervals: finalIntervals,
            section: treadmillSection,
            xp_value: xp,
        });
        treadmillGroup = [];
    };

    for (const block of blocks) {
        if (block.block_type === 'treadmill') {
            treadmillSection = (block.section === 'warmup' || block.section === 'cardio') ? 'Engine' : (block.section || 'Engine');
            treadmillGroup.push(block);
            continue;
        }

        if (block.block_type === 'exercise') {
            const cat = catalogMap.get(block.exercise_id);
            const name = cat?.name || (block.exercise_id || 'Exercise').replace(/_/g, ' ');
            const xpFactor = cat?.xp_factor || 1;
            const sets = block.target_sets || 1;
            const reps = block.target_reps || 10;
            const xp = Math.floor(sets * reps * xpFactor);

            const sectionMap: Record<string, string> = {
                warmup: 'Warmup',
                main: 'Armor',
                core: 'Core Work',
                cooldown: 'Cooldown',
            };

            // Recovery selector — first warmup block in a recovery workout
            if (block.section === 'warmup' && block.exercise_id === 'foam_rolling') {
                result.push({
                    name: 'Active Recovery',
                    type: 'recovery_selector',
                    section: 'Recovery',
                    xp_value: 20,
                });
                continue;
            }

            // Mobility/recovery exercises with duration → collect into timer block
            const catCategory = cat?.category || '';
            const isMobilityExercise = ['Mobility', 'Flexibility', 'Recovery'].includes(catCategory) || 
                ['stretch', 'hang', 'hold', 'opener', 'foam', 'dislocate'].some(k => (block.exercise_id || '').includes(k));
            const isMobilityTimer = block.target_duration_seconds && !block.target_reps && isMobilityExercise;

            if (isMobilityTimer) {
                // Check if last result block is already a mobility timer we can append to
                const lastResult = result[result.length - 1];
                if (lastResult?.type === 'timer' && lastResult?._isMobility) {
                    for (let s = 0; s < sets; s++) {
                        lastResult.intervals.push({
                            type: 'interval',
                            seconds: block.target_duration_seconds,
                            zone: name,
                            color: 'bg-emerald-500',
                            note: sets > 1 ? `Round ${s + 1}` : null,
                            raw_text: `${name} — ${block.target_duration_seconds}s`,
                        });
                    }
                    lastResult.xp_value += Math.floor(sets * block.target_duration_seconds * 0.05);
                } else {
                    const intervals = [];
                    for (let s = 0; s < sets; s++) {
                        intervals.push({
                            type: 'interval',
                            seconds: block.target_duration_seconds,
                            zone: name,
                            color: 'bg-emerald-500',
                            note: sets > 1 ? `Round ${s + 1}` : null,
                            raw_text: `${name} — ${block.target_duration_seconds}s`,
                        });
                    }
                    result.push({
                        name: 'Mobility Circuit',
                        type: 'timer',
                        _isMobility: true,
                        intervals,
                        section: 'Mobility',
                        xp_value: Math.floor(sets * block.target_duration_seconds * 0.05),
                    });
                }
                continue;
            }

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
                const repsStr = ex.reps || '10';
                const reps_list = repsStr.includes(',')
                    ? repsStr.split(',').map((r: string) => parseInt(r.trim(), 10) || 10)
                    : null;
                return {
                    name: cat?.name || ex.name || 'Exercise',
                    exercise_id: ex.exercise_id || null,
                    reps: repsStr,
                    reps_list,
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

    // Use shared resolver for program lookup
    if (user) {
        const { resolveProgramBlocks } = await import('@/services/programResolver');
        const resolved = await resolveProgramBlocks(supabase, user.id, targetDay);

        if (resolved) {
            return NextResponse.json(dbBlocksToWorkoutBlocks(resolved.blocks, catalog || [], resolved.cardioType));
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
