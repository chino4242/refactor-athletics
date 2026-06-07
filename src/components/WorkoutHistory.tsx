'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ExerciseHistoryModal from './ExerciseHistoryModal';
import type { HistoryItem, CatalogItem } from '@/types';

interface WorkoutDay {
    date: string;
    exercises: {
        exercise_id: string;
        name: string;
        sets: any[];
        raw_value: number;
        rank_name: string | null;
        level: number;
        xp: number;
    }[];
    totalXp: number;
}

export default function WorkoutHistory({ userId }: { userId: string }) {
    const [days, setDays] = useState<WorkoutDay[]>([]);
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [fullHistory, setFullHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [selectedExercise, setSelectedExercise] = useState<CatalogItem | null>(null);
    const [monthOffset, setMonthOffset] = useState(0);

    useEffect(() => {
        const load = async () => {
            const supabase = createClient();
            const [{ data: workouts }, { data: cat }] = await Promise.all([
                supabase.from('workouts').select('*').eq('user_id', userId)
                    .order('date', { ascending: false }).limit(500),
                supabase.from('catalog').select('*'),
            ]);

            setCatalog(cat || []);
            setFullHistory((workouts || []).map(w => ({
                id: w.id, user_id: w.user_id, exercise_id: w.exercise_id,
                timestamp: w.timestamp, date: w.date, value: w.value,
                raw_value: w.raw_value, rank_name: w.rank_name, level: w.level,
                xp: w.xp, data: w.sets, details: w.sets, created_at: w.created_at,
            })));

            // Group by date
            const catalogMap = new Map((cat || []).map((c: any) => [c.id, c]));
            const byDate: Record<string, WorkoutDay> = {};
            for (const w of workouts || []) {
                if (!w.date || w.exercise_id?.startsWith('block_')) continue;
                if (!byDate[w.date]) byDate[w.date] = { date: w.date, exercises: [], totalXp: 0 };
                const catItem = catalogMap.get(w.exercise_id);
                byDate[w.date].exercises.push({
                    exercise_id: w.exercise_id,
                    name: catItem?.name || w.exercise_id?.replace(/_/g, ' ') || 'Unknown',
                    sets: w.sets || [],
                    raw_value: w.raw_value || 0,
                    rank_name: w.rank_name,
                    level: w.level || 0,
                    xp: w.xp || 0,
                });
                byDate[w.date].totalXp += w.xp || 0;
            }

            const sorted = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));
            setDays(sorted);
            if (sorted.length > 0) setSelectedDay(sorted[0].date);
            setLoading(false);
        };
        load();
    }, [userId]);

    // Calendar data
    const now = new Date();
    const viewMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const monthName = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const firstDayOfWeek = viewMonth.getDay();
    const workoutDates = useMemo(() => new Set(days.map(d => d.date)), [days]);

    const selectedDayData = days.find(d => d.date === selectedDay);

    if (loading) {
        return (
            <div className="max-w-lg mx-auto p-4 space-y-4 animate-pulse">
                <div className="h-8 bg-zinc-800 rounded w-48" />
                <div className="h-64 bg-zinc-800 rounded-xl" />
                <div className="h-40 bg-zinc-800 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto p-4">
            <h1 className="text-xl font-black text-white mb-4">Workout History</h1>

            {/* Calendar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <button onClick={() => setMonthOffset(m => m - 1)} className="p-1 text-zinc-400 hover:text-white"><ChevronLeft size={18} /></button>
                    <span className="text-sm font-bold text-white">{monthName}</span>
                    <button onClick={() => setMonthOffset(m => Math.min(m + 1, 0))} className="p-1 text-zinc-400 hover:text-white" disabled={monthOffset >= 0}><ChevronRight size={18} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                    {['S','M','T','W','T','F','S'].map((d, i) => (
                        <div key={i} className="text-[9px] text-zinc-600 font-bold py-1">{d}</div>
                    ))}
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const hasWorkout = workoutDates.has(dateStr);
                        const isSelected = dateStr === selectedDay;
                        return (
                            <button
                                key={day}
                                onClick={() => hasWorkout && setSelectedDay(dateStr)}
                                className={`text-xs py-1.5 rounded-lg transition ${
                                    isSelected ? 'bg-orange-600 text-white font-bold' :
                                    hasWorkout ? 'bg-zinc-800 text-white font-medium hover:bg-zinc-700' :
                                    'text-zinc-600'
                                }`}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day Detail */}
            {selectedDayData && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1 mb-2">
                        <h2 className="text-sm font-bold text-white">
                            {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </h2>
                        <span className="text-[10px] text-amber-400 font-bold">+{selectedDayData.totalXp} XP</span>
                    </div>
                    {selectedDayData.exercises.map((ex, i) => {
                        const catItem = catalog.find(c => c.id === ex.exercise_id);
                        const bestSet = ex.sets.length > 0
                            ? ex.sets.reduce((best: any, s: any) => {
                                const v = (s.weight || 0) * (1 + (s.reps || 1) / 30);
                                return v > (best.v || 0) ? { ...s, v } : best;
                              }, { v: 0 })
                            : null;
                        const rankColors: Record<string, string> = {
                            'Champion': 'text-yellow-400', 'Pro': 'text-orange-400',
                            'Contender': 'text-blue-400', 'Amateur': 'text-zinc-300',
                            'Rookie': 'text-zinc-400', 'Peasant': 'text-zinc-600',
                        };
                        return (
                            <button
                                key={i}
                                onClick={() => catItem && setSelectedExercise(catItem)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-left hover:border-zinc-700 transition active:scale-[0.98]"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-bold text-white capitalize">{ex.name}</span>
                                    {ex.rank_name && (
                                        <span className={`text-[10px] font-bold ${rankColors[ex.rank_name] || 'text-zinc-500'}`}>{ex.rank_name}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                                    {bestSet && bestSet.weight > 0 && (
                                        <span>Best: {bestSet.weight} × {bestSet.reps}</span>
                                    )}
                                    <span>{ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}</span>
                                    <span className="text-amber-400/70">+{ex.xp} XP</span>
                                </div>
                                {ex.sets.length > 0 && ex.sets[0]?.weight > 0 && (
                                    <div className="flex gap-1.5 mt-2 flex-wrap">
                                        {ex.sets.map((s: any, si: number) => (
                                            <span key={si} className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                                                {s.weight}×{s.reps}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {days.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-3xl mb-2">🏋️</div>
                    <p className="text-sm text-zinc-500">No workout history yet</p>
                </div>
            )}

            {/* Exercise History Modal */}
            {selectedExercise && (
                <ExerciseHistoryModal
                    exercise={selectedExercise}
                    history={fullHistory}
                    onClose={() => setSelectedExercise(null)}
                />
            )}
        </div>
    );
}
