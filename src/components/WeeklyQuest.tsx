"use client";

import { useState, useEffect } from 'react';
import { getWeeklyProgress, logHabit } from '../services/api';
import type { UserProfileData } from '@/types';
import confetti from 'canvas-confetti';

interface WeeklyQuestProps {
    userId: string;
    userProfile: UserProfileData;
    onUpdate: () => void;
}

export default function WeeklyQuest({ userId, userProfile, onUpdate }: WeeklyQuestProps) {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<Record<string, number>>({});

    // Hardcoded Quest for now
    const TASKS = [
        { id: 'habit_meal_prep_recipes', label: 'Pick Recipes', xp: 10, icon: '📖' },
        { id: 'habit_meal_prep_shop', label: 'Grocery Shop', xp: 100, icon: '🛒' },
        { id: 'habit_meal_prep_cook', label: 'Meal Prep', xp: 200, icon: '🍱' }
    ];

    useEffect(() => {
        fetchWeekly();
    }, [userId]);

    const fetchWeekly = async () => {
        const now = new Date();
        const day = now.getDay(); // 0 (Sun) - 6 (Sat)

        // Calculate days to subtract to get to MONDAY (Start of Week)
        // If Mon (1) -> 0
        // If Sun (0) -> 6
        // If Tue (2) -> 1
        const diffToMonday = (day + 6) % 7;

        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - diffToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        try {
            const data = await getWeeklyProgress(userId, Math.floor(startOfWeek.getTime() / 1000));
            setProgress(data.totals || {});
        } catch (e) {
            console.error("Failed to load weekly quest data", e);
        }
    };

    const handleLog = async (taskId: string, label: string) => {
        setLoading(true);
        try {
            await logHabit(userId, taskId, 1, userProfile.bodyweight, label);

            // Optimistic update
            setProgress(prev => ({
                ...prev,
                [taskId]: (prev[taskId] || 0) + 1
            }));

            // Check if all complete for confetti
            const alreadyDone = TASKS.filter(t => t.id !== taskId).every(t => (progress[t.id] || 0) > 0);
            if (alreadyDone) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }

            onUpdate();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Completion
    const completedCount = TASKS.filter(t => (progress[t.id] || 0) > 0).length;
    const isFullComplete = completedCount === TASKS.length;

    return (
        <div className={`border rounded-xl p-4 mb-6 transition-all relative overflow-hidden group ${isFullComplete ? 'bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border-yellow-500/50' : 'bg-zinc-900 border-zinc-700'}`}>

            {/* Header */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <div className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <span>Weekly Quest</span>
                        {isFullComplete && <span>🏆</span>}
                    </div>
                    <h3 className="text-lg font-black text-white italic">MASTER CHEF</h3>
                    <p className="text-xs text-zinc-400">Prep your fuel for the week ahead.</p>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-black text-zinc-700 group-hover:text-zinc-600 transition-colors">
                        {completedCount} / {TASKS.length}
                    </span>
                </div>
            </div>

            {/* Tasks */}
            <div className="space-y-2 relative z-10">
                {TASKS.map(task => {
                    const isDone = (progress[task.id] || 0) > 0;
                    return (
                        <button
                            key={task.id}
                            disabled={loading || isDone}
                            onClick={() => handleLog(task.id, task.label)}
                            className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left ${isDone
                                ? 'bg-zinc-950/50 border-zinc-800 opacity-80'
                                : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-500'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`text-lg filter ${isDone ? 'grayscale' : ''}`}>{task.icon}</span>
                                <span className={`text-sm font-bold ${isDone ? 'text-zinc-500 line-through' : 'text-white'}`}>
                                    {task.label}
                                </span>
                            </div>

                            {isDone ? (
                                <span className="text-[10px] font-bold text-green-500 uppercase">Done</span>
                            ) : (
                                <span className="text-[10px] font-bold text-yellow-500">+{task.xp} XP</span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Background Decoration */}
            <div className="absolute -bottom-6 -right-6 text-[100px] opacity-5 pointer-events-none rotate-12">
                🍱
            </div>
        </div>
    );
}
