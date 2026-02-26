"use client";

import { startOfWeek, addDays, format } from 'date-fns';
import { CheckCircle } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { getWeeklySchedule } from '../services/api';

interface WeeklyScheduleProps {
    onSelectDay: (date: string) => void;
    completedDates?: string[]; // List of YYYY-MM-DD strings
}

export default function WeeklySchedule({ onSelectDay, completedDates = [] }: WeeklyScheduleProps) {
    const [weekDays, setWeekDays] = useState<{ date: Date, dateStr: string, plan: any }[]>([]);

    useEffect(() => {
        const loadSchedule = async () => {
            const apiData = await getWeeklySchedule();

            // Generate current week (Monday start)
            const today = new Date();
            const start = startOfWeek(today, { weekStartsOn: 1 }); // 1 = Monday

            // Map API data (order 0=Monday)
            const scheduleMap = new Map();
            if (apiData && Array.isArray(apiData)) {
                apiData.forEach((day: any) => scheduleMap.set(day.order, day));
            }

            const days = Array.from({ length: 7 }).map((_, index) => {
                const date = addDays(start, index);
                const apiDay = scheduleMap.get(index);

                // Construct Plan
                const plan = apiDay ? {
                    title: apiDay.title || "Unknown Protocol",
                    type: apiDay.type || "Training",
                    xp: apiDay.xp || 0
                } : {
                    title: "Active Recovery",
                    type: "Recovery",
                    xp: 0
                };

                return {
                    date,
                    dateStr: format(date, 'yyyy-MM-dd'),
                    plan
                };
            });
            setWeekDays(days);
        };

        loadSchedule();
    }, []);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const [selectedDayStr, setSelectedDayStr] = useState<string>("");

    // Ensure we select today on mount or when weekDays populate
    useEffect(() => {
        if (!selectedDayStr && weekDays.length > 0) {
            setSelectedDayStr(todayStr);
        }
    }, [weekDays, selectedDayStr, todayStr]);

    const activeDay = weekDays.find(d => d.dateStr === selectedDayStr) || weekDays[0];

    return (
        <div className="w-full bg-zinc-900/50 rounded-2xl border border-zinc-800 p-4 mb-8">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Current Week</h3>
                <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-1 rounded">Week 1 of 8</span>
            </div>

            {/* 1. Horizontal Day Strip */}
            <div className="flex justify-between items-center gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
                {weekDays.map((day) => {
                    const isSelected = day.dateStr === selectedDayStr;
                    const isToday = day.dateStr === todayStr;
                    const isCompleted = completedDates.includes(day.dateStr);

                    return (
                        <button
                            key={day.dateStr}
                            onClick={() => setSelectedDayStr(day.dateStr)}
                            className={`flex flex-col items-center justify-center min-w-[44px] h-[60px] rounded-full border transition-all duration-300 relative
                                ${isSelected
                                    ? 'bg-orange-500 text-white border-orange-400 scale-110 shadow-lg shadow-orange-500/20 z-10'
                                    : isToday
                                        ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                        : 'bg-transparent text-zinc-500 border-transparent hover:bg-zinc-800/50'
                                }
                            `}
                        >
                            {isCompleted && (
                                <div className="absolute -top-1 -right-1 bg-zinc-900 rounded-full">
                                    <CheckCircle size={12} className="text-emerald-500 fill-emerald-500/20" />
                                </div>
                            )}

                            <span className="text-[9px] font-bold uppercase tracking-wider mb-0.5">{format(day.date, 'EEE')}</span>
                            <span className={`text-base font-black leading-none ${isSelected ? 'text-white' : 'text-current'} `}>
                                {format(day.date, 'd')}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* 2. Selected Day Detail View */}
            {activeDay && (
                <div className="animate-fade-in">
                    <div className={`relative p-5 rounded-2xl border overflow-hidden group
                        ${activeDay.dateStr === todayStr
                            ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 border-orange-500/50 shadow-2xl shadow-orange-900/10'
                            : 'bg-zinc-900 border-zinc-800'
                        }
                    `}>
                        {/* Background Title Faded */}
                        <div className="absolute -right-4 -bottom-6 text-8xl font-black text-white/5 pointer-events-none select-none uppercase truncate max-w-full">
                            {format(activeDay.date, 'EEEE')}
                        </div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className={`text-xs font-bold uppercase tracking-widest mb-1 ${activeDay.dateStr === todayStr ? 'text-orange-400' : 'text-zinc-500'} `}>
                                        {activeDay.dateStr === todayStr ? "Today's Focus" : format(activeDay.date, 'EEEE, MMM d')}
                                    </h4>
                                    <h2 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter uppercase">
                                        {activeDay.plan.title}
                                    </h2>
                                </div>
                                <div className={`px-3 py-1 rounded-lg font-bold text-xs border uppercase tracking-wider
                                    ${activeDay.plan.type === 'Strength' ? 'bg-blue-950/50 text-blue-400 border-blue-900' :
                                        activeDay.plan.type === 'Cardio' ? 'bg-red-950/50 text-red-400 border-red-900' :
                                            activeDay.plan.type === 'Conditioning' ? 'bg-purple-950/50 text-purple-400 border-purple-900' :
                                                activeDay.plan.type === 'Recovery' ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900' :
                                                    'bg-zinc-800 text-zinc-400 border-zinc-700'
                                    }
                                `}>
                                    {activeDay.plan.type}
                                </div>
                            </div>

                            <div className="flex gap-4 items-center">
                                <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium bg-zinc-950/50 px-3 py-1.5 rounded-lg border border-zinc-800">
                                    <span>⚡</span>
                                    <span>{activeDay.plan.xp} XP POTENTIAL</span>
                                </div>

                                <button
                                    onClick={() => onSelectDay(activeDay.dateStr)}
                                    className="ml-auto bg-white text-black hover:bg-zinc-200 px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
                                >
                                    <span>View Details</span>
                                    <span>→</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
