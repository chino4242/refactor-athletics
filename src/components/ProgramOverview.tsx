'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Dumbbell, Timer, Flame } from 'lucide-react';
import { PATHS, type PathKey } from '@/data/paths';
import { createClient } from '@/utils/supabase/client';

interface DayOverview {
    day: string;
    name: string;
    type: string;
    exercises: { name: string; detail: string; section: string }[];
}

export default function ProgramOverview({ userId, path }: { userId: string; path: string }) {
    const [expanded, setExpanded] = useState(false);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);
    const [days, setDays] = useState<DayOverview[]>([]);

    const pathData = PATHS[path as PathKey] || PATHS.hybrid;

    useEffect(() => {
        loadProgram();
    }, [userId, path]);

    const loadProgram = async () => {
        const supabase = createClient();
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const overviews: DayOverview[] = [];

        for (const day of dayNames) {
            const { data: prog } = await supabase
                .from('workout_programs')
                .select('id, name')
                .eq('is_default', true)
                .eq('training_path', path)
                .ilike('day_of_week', day)
                .eq('variant', 'A')
                .single();

            if (!prog) {
                overviews.push({ day, name: day === 'sunday' ? 'Rest Day' : 'Rest', type: 'Rest', exercises: [] });
                continue;
            }

            const { data: blocks } = await supabase
                .from('program_blocks')
                .select('*')
                .eq('workout_id', prog.id)
                .order('block_order');

            const exercises: { name: string; detail: string; section: string }[] = [];
            let hasTreadmill = false;

            for (const b of (blocks || [])) {
                if (b.block_type === 'superset' && b.exercises) {
                    const exNames = (b.exercises as any[]).map(e => e.name || e.exercise_id).join(' + ');
                    const reps = (b.exercises as any[])[0]?.reps || '?';
                    exercises.push({
                        name: exNames,
                        detail: `${b.target_sets} sets x ${reps} reps`,
                        section: b.section === 'main' ? 'Strength' : b.section,
                    });
                } else if (b.block_type === 'exercise') {
                    const name = b.exercise_id?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Exercise';
                    let detail = '';
                    if (b.target_duration_seconds) {
                        detail = `${b.target_sets} sets x ${b.target_duration_seconds}s`;
                    } else if (b.target_reps) {
                        detail = `${b.target_sets} sets x ${b.target_reps} reps`;
                    }
                    const sectionMap: Record<string, string> = { main: 'Strength', core: 'Core', warmup: 'Warmup', cooldown: 'Cooldown' };
                    exercises.push({ name, detail, section: sectionMap[b.section] || b.section });
                } else if (b.block_type === 'treadmill') {
                    hasTreadmill = true;
                }
            }

            if (hasTreadmill) {
                exercises.push({ name: 'Cardio Block', detail: 'HIIT or Zone 2 (your choice)', section: 'Cardio' });
            }

            // Determine type from exercises
            const hasStrength = exercises.some(e => e.section === 'Strength');
            const hasExercises = exercises.length > 0;
            const type = !hasExercises ? 'Rest' : prog.name.includes('Recovery') || day === 'sunday' ? 'Recovery' : hasStrength ? 'Strength + Cardio' : 'Cardio + Core';

            overviews.push({ day, name: hasExercises ? prog.name.replace(/ - hybrid.*/, '').replace(/Active /, '') : 'Rest Day', type, exercises });
        }

        setDays(overviews);
    };

    const dayLabels: Record<string, string> = {
        monday: 'MON', tuesday: 'TUE', wednesday: 'WED', thursday: 'THU', friday: 'FRI', saturday: 'SAT', sunday: 'SUN'
    };

    const typeColors: Record<string, string> = {
        'Strength + Cardio': 'text-blue-400',
        'Cardio + Core': 'text-red-400',
        'Recovery': 'text-emerald-400',
        'Rest': 'text-zinc-600',
    };

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <button onClick={() => setExpanded(!expanded)} className="w-full p-4 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{pathData.emoji}</span>
                    <div>
                        <h3 className="text-base font-bold text-white uppercase tracking-wider">{pathData.name} Program</h3>
                        <p className="text-xs text-zinc-500">{pathData.description}</p>
                    </div>
                </div>
                {expanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Philosophy */}
                    <p className="text-xs text-zinc-400 leading-relaxed border-l-2 border-orange-500/30 pl-3">
                        {pathData.philosophy}
                    </p>

                    {/* Weekly Overview */}
                    <div className="space-y-1.5">
                        {days.map(day => (
                            <div key={day.day} className="bg-zinc-800/50 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                                    className="w-full px-3 py-2.5 flex items-center justify-between text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-zinc-500 w-8">{dayLabels[day.day]}</span>
                                        <span className="text-sm font-bold text-white">{day.name}</span>
                                    </div>
                                    <span className={`text-xs font-bold uppercase ${typeColors[day.type] || 'text-zinc-500'}`}>{day.type}</span>
                                </button>

                                {expandedDay === day.day && day.exercises.length > 0 && (
                                    <div className="px-3 pb-3 space-y-1">
                                        {(() => {
                                            const sections = [...new Set(day.exercises.map(e => e.section))];
                                            return sections.map(section => (
                                                <div key={section}>
                                                    <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider mt-2 mb-1">{section}</div>
                                                    {day.exercises.filter(e => e.section === section).map((ex, i) => (
                                                        <div key={i} className="flex items-center justify-between py-1">
                                                            <span className="text-xs text-zinc-300">{ex.name}</span>
                                                            <span className="text-xs text-zinc-500 font-mono">{ex.detail}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
