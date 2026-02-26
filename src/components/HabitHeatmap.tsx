"use client";

import { useMemo } from 'react';
import type { HistoryItem } from '@/types';

interface HabitHeatmapProps {
    history: HistoryItem[];
    habitId: string;
    label: string;
    colorClass: string; // e.g. "bg-green-500"
    daysBack?: number;
    year?: number;
    goal?: number; // 🟢 NEW: Goal for gradient
}

export default function HabitHeatmap({ history, habitId, label, colorClass, daysBack = 365, year, goal }: HabitHeatmapProps) {

    // 1. Process Data (Map Date -> Value)
    const heatmapData = useMemo(() => {
        const relevant = history.filter(h => h.exercise_id === habitId);
        const dateMap = new Map<string, number>();

        relevant.forEach(item => {
            const date = new Date(item.timestamp * 1000);
            const str = date.toISOString().split('T')[0];
            const current = dateMap.get(str) || 0;
            // Sum raw_value (default to 1 if missing/binary)
            const value = item.raw_value !== undefined ? item.raw_value : 1;
            dateMap.set(str, current + value);
        });

        return dateMap;
    }, [history, habitId]);

    // 2. Generate Grid
    const weeks = useMemo(() => {
        const result = [];

        let start: Date;
        let end: Date;

        if (year) {
            start = new Date(year, 0, 1);
            end = new Date(year, 11, 31);
        } else {
            const today = new Date();
            end = today;
            start = new Date(today);
            start.setDate(today.getDate() - daysBack);
        }

        const dayOfWeek = start.getDay();
        const gridStart = new Date(start);
        gridStart.setDate(start.getDate() - dayOfWeek);

        let current = new Date(gridStart);

        while (current <= end || (current.getDay() !== 0 && result.length > 0)) {
            if (current > end && current.getDay() === 0) break;

            const week = [];
            for (let i = 0; i < 7; i++) {
                const dayDate = new Date(current);
                const dayStr = dayDate.toISOString().split('T')[0];

                const val = heatmapData.get(dayStr) || 0;
                const isDone = val > 0;

                // Calculate Intensity
                let opacity = 1;
                if (goal && val > 0) {
                    const pct = Math.min(val / goal, 1);
                    // Scale opacity: 0.3 (min visible) to 1.0 (goal met)
                    opacity = 0.3 + (pct * 0.7);
                }

                // Visibility Logic
                let isHidden = false;
                if (year) {
                    if (dayDate.getFullYear() !== year) isHidden = true;
                } else {
                    if (dayDate > end) isHidden = true;
                }

                week.push({
                    date: dayDate,
                    dateStr: dayStr,
                    isDone,
                    isHidden,
                    opacity
                });

                current.setDate(current.getDate() + 1);
            }
            result.push(week);
        }
        return result;
    }, [daysBack, heatmapData, year, goal]);

    return (
        <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 mb-4 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{label}</h4>
                {/* Legend - Simplified for now */}
                {goal && (
                    <div className="text-[10px] text-zinc-600 font-mono">
                        Goal: {goal}
                    </div>
                )}
            </div>

            <div className="flex items-end gap-2">
                {/* Day Labels */}
                <div className="flex flex-col justify-between pb-[6px] text-[9px] text-zinc-600 font-medium h-[82px] leading-none text-right">
                    <span className="opacity-0">Sun</span>
                    <span>Mon</span>
                    <span className="opacity-0">Tue</span>
                    <span>Wed</span>
                    <span className="opacity-0">Thu</span>
                    <span>Fri</span>
                    <span className="opacity-0">Sat</span>
                </div>

                <div className="flex gap-[2px] overflow-x-auto pb-2 scrollbar-hide">
                    {weeks.map((week, wIndex) => (
                        <div key={wIndex} className="flex flex-col gap-[2px]">
                            {week.map((day) => (
                                <div
                                    key={day.dateStr}
                                    style={{ opacity: day.isDone ? day.opacity : 1 }}
                                    title={`${day.dateStr}: ${day.isDone ? 'Logged' : 'Missed'}`}
                                    className={`w-2.5 h-2.5 rounded-[2px] transition-all ${day.isHidden
                                        ? 'opacity-0'
                                        : day.isDone
                                            ? colorClass
                                            : 'bg-zinc-800/80 hover:bg-zinc-700'
                                        }`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
