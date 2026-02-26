"use client";

import { useState, useEffect } from 'react';
import { getHistory, getProfile } from '../services/api';

interface WeeklyReviewProps {
    userId: string;
    onClose: () => void;
}

interface TrendData {
    value: number;
    prevValue: number;
    percentChange: number;
    direction: 'up' | 'down' | 'flat';
}

interface WeeklyStats {
    totalXp: TrendData;
    steps: TrendData;
    avgWeight: number;
    weightDelta: number;
    battles: number;
    victories: number;
    water: TrendData;
    sleep: TrendData;

    // New Metrics
    workouts: TrendData;
    nutritionAdherence: number;
    prCount: number;
    mvpHabit: string;
    noAlcoholStreak: boolean;
    refactorDelta: number;
}

export default function WeeklyReview({ userId, onClose }: WeeklyReviewProps) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<WeeklyStats | null>(null);
    const [prevWeekLabel, setPrevWeekLabel] = useState("");

    const calculateTrend = (current: number, prev: number): TrendData => {
        let percentChange = 0;
        if (prev > 0) {
            percentChange = ((current - prev) / prev) * 100;
        } else if (current > 0) {
            percentChange = 100; // 0 -> something is 100% increase effectively
        }

        return {
            value: current,
            prevValue: prev,
            percentChange,
            direction: percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'flat'
        };
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const now = new Date();
                const dayOfWeek = now.getDay();
                const daysToLastSat = dayOfWeek + 1;

                const endOfLastWeek = new Date(now);
                endOfLastWeek.setDate(now.getDate() - daysToLastSat);
                endOfLastWeek.setHours(23, 59, 59, 999);

                const startOfLastWeek = new Date(endOfLastWeek);
                startOfLastWeek.setDate(endOfLastWeek.getDate() - 6);
                startOfLastWeek.setHours(0, 0, 0, 0);

                const endOf2WeeksAgo = new Date(startOfLastWeek);
                endOf2WeeksAgo.setDate(startOfLastWeek.getDate() - 1);
                endOf2WeeksAgo.setHours(23, 59, 59, 999);

                const startOf2WeeksAgo = new Date(endOf2WeeksAgo);
                startOf2WeeksAgo.setDate(endOf2WeeksAgo.getDate() - 6);
                startOf2WeeksAgo.setHours(0, 0, 0, 0);

                setPrevWeekLabel(`${startOfLastWeek.toLocaleDateString()} - ${endOfLastWeek.toLocaleDateString()}`);

                const [history, profile] = await Promise.all([
                    getHistory(userId),
                    getProfile(userId)
                ]);

                // Filters
                const filterWeek = (start: Date, end: Date) =>
                    history.filter(item => item.timestamp * 1000 >= start.getTime() && item.timestamp * 1000 <= end.getTime());

                const lastWeekItems = filterWeek(startOfLastWeek, endOfLastWeek);
                const prevWeekItems = filterWeek(startOf2WeeksAgo, endOf2WeeksAgo);

                // --- HELPERS ---
                const sumXP = (items: any[]) => items.reduce((sum, i) => sum + (i.xp || 0), 0);
                const sumHabit = (items: any[], id: string) => items.filter(i => i.exercise_id === id).reduce((sum, i) => sum + parseFloat(i.value), 0);
                const avgHabit = (items: any[], id: string) => {
                    const logs = items.filter(i => i.exercise_id === id).map(i => parseFloat(i.value));
                    return logs.length ? logs.reduce((a, b) => a + b, 0) / logs.length : 0;
                };

                // --- METRICS ---

                // 1. XP
                const xpDetails = calculateTrend(sumXP(lastWeekItems), sumXP(prevWeekItems));

                // 2. Steps
                const stepsDetails = calculateTrend(sumHabit(lastWeekItems, 'habit_steps'), sumHabit(prevWeekItems, 'habit_steps'));

                // 3. Weight & Refactor Delta
                const currWeight = avgHabit(lastWeekItems, 'habit_weigh_in');
                const prevWeight = avgHabit(prevWeekItems, 'habit_weigh_in');
                const weightDelta = (currWeight && prevWeight) ? currWeight - prevWeight : 0;

                // Refactor Delta Calculation
                let refactorDelta = 0;
                const measurementKeys = [
                    { id: 'waist', habit: 'habit_measure_waist' },
                    { id: 'arms', habit: 'habit_measure_arms' },
                    { id: 'legs', habit: 'habit_measure_legs' },
                    { id: 'chest', habit: 'habit_measure_chest' },
                    { id: 'shoulders', habit: 'habit_measure_shoulders' }
                ];

                measurementKeys.forEach(m => {
                    const goal = profile?.body_composition_goals?.[m.id];
                    if (!goal || goal === 'Maintain') return;

                    const curr = avgHabit(lastWeekItems, m.habit);
                    const prev = avgHabit(prevWeekItems, m.habit);

                    if (curr > 0 && prev > 0) {
                        const diff = curr - prev;
                        if (goal === 'Grow') {
                            refactorDelta += diff;
                        } else if (goal === 'Shrink') {
                            refactorDelta -= diff; // Shrink means negative diff is good (e.g. -1 inch -> --1 = +1 score)
                        }
                    }
                });

                // 4. Water & Sleep
                const waterDetails = calculateTrend(sumHabit(lastWeekItems, 'habit_water'), sumHabit(prevWeekItems, 'habit_water'));
                const sleepDetails = calculateTrend(avgHabit(lastWeekItems, 'habit_sleep'), avgHabit(prevWeekItems, 'habit_sleep'));

                // 5. Workouts
                const countWorkouts = (items: any[]) => {
                    const workouts = items.filter(item =>
                        !item.exercise_id.startsWith('habit_') &&
                        !item.exercise_id.startsWith('macro_') &&
                        !item.rank_name?.includes('Duel')
                    );
                    return new Set(workouts.map(i => new Date(i.timestamp * 1000).toDateString())).size;
                };
                const workoutDetails = calculateTrend(countWorkouts(lastWeekItems), countWorkouts(prevWeekItems));

                // 6. Stats (One-off)
                const battles = lastWeekItems.filter(i => i.rank_name?.toLowerCase().includes('duel') || i.exercise_id.includes('duel')).length;
                const victories = lastWeekItems.filter(i => i.rank_name?.toLowerCase().includes('victory')).length;
                const prCount = lastWeekItems.filter(i => i.xp && i.xp > 200 && !i.exercise_id.startsWith('habit_')).length;

                // Nutrition
                let nutritionAdherence = 0;
                if (profile?.nutrition_targets) {
                    const targetPro = profile.nutrition_targets.protein;
                    const daysMap: Record<string, number> = {};
                    lastWeekItems
                        .filter(i => i.exercise_id === 'macro_protein')
                        .forEach(i => {
                            const d = new Date(i.timestamp * 1000).toDateString();
                            daysMap[d] = (daysMap[d] || 0) + parseFloat(i.value);
                        });
                    nutritionAdherence = Object.values(daysMap).filter(val => val >= targetPro).length;
                }

                // MVP
                const habitCounts: Record<string, number> = {};
                lastWeekItems
                    .filter(i => i.exercise_id.startsWith('habit_') && i.exercise_id !== 'habit_weigh_in')
                    .forEach(i => {
                        habitCounts[i.exercise_id] = (habitCounts[i.exercise_id] || 0) + 1;
                    });
                let mvpHabit = "None";
                let maxCount = 0;
                Object.entries(habitCounts).forEach(([id, count]) => {
                    if (count > maxCount) {
                        maxCount = count;
                        mvpHabit = id.replace('habit_', '').replace('_', ' ');
                    }
                });
                mvpHabit = mvpHabit.charAt(0).toUpperCase() + mvpHabit.slice(1);

                // Alcohol
                const noAlcoholDays = new Set(lastWeekItems.filter(i => i.exercise_id === 'habit_no_alcohol').map(i => new Date(i.timestamp * 1000).toDateString())).size;
                const noAlcoholStreak = noAlcoholDays >= 7;

                setStats({
                    totalXp: xpDetails,
                    steps: stepsDetails,
                    avgWeight: currWeight,
                    weightDelta,
                    battles,
                    victories,
                    water: waterDetails,
                    sleep: sleepDetails,
                    workouts: workoutDetails,
                    nutritionAdherence,
                    prCount,
                    mvpHabit,
                    noAlcoholStreak,
                    refactorDelta
                });

            } catch (e) {
                console.error("Failed to load review", e);
            } finally {
                setLoading(false);
            }
        };

        if (userId) fetchData();
    }, [userId]);

    const renderTrend = (trend: TrendData, inverse = false) => {
        if (trend.value === 0 && trend.prevValue === 0) return null;

        const isPositive = trend.direction === 'up';
        const isNegative = trend.direction === 'down';

        // Inverse: e.g. Weight (Up is usually "bad" if cutting, but generic logic usually implies Growth = Good).
        // Let's stick to Green = Up, Red = Down for XP/Workouts.

        let color = 'text-zinc-500';
        if (isPositive) color = inverse ? 'text-red-500' : 'text-green-500';
        if (isNegative) color = inverse ? 'text-green-500' : 'text-red-500';

        const symbol = isPositive ? '▲' : isNegative ? '▼' : '−';

        return (
            <div className={`text-[10px] font-bold ${color} flex items-center gap-1`}>
                <span>{symbol} {Math.abs(trend.percentChange).toFixed(0)}%</span>
            </div>
        );
    };

    if (!stats && !loading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div className="bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-800 shadow-2xl relative my-8">

                {/* Header */}
                <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 border-b border-zinc-800 text-center z-10">
                    <div className="inline-block text-4xl mb-2">🗓️</div>
                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Weekly Report</h2>
                    <p className="text-xs text-zinc-400 font-mono mt-1">{prevWeekLabel}</p>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-zinc-500 animate-pulse">Analyzing Protocol...</div>
                ) : stats && (
                    <div className="p-6 space-y-4">

                        {/* 1. XP (Big Card) */}
                        <div className="bg-zinc-800/50 rounded-xl p-4 flex justify-between items-center border border-zinc-700/50">
                            <div>
                                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total XP</div>
                                <div className="flex items-baseline gap-2">
                                    <div className="text-3xl font-black text-yellow-400">+{stats.totalXp.value.toLocaleString()}</div>
                                </div>
                                {renderTrend(stats.totalXp)}
                            </div>
                            <div className="text-4xl">⚡</div>
                        </div>

                        {/* 2. Steps & Workouts */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                                <span className="text-2xl block mb-1">👣</span>
                                <div className="text-[10px] font-bold text-zinc-500 uppercase">Steps</div>
                                <div className="text-xl font-bold text-white">{stats.steps.value.toLocaleString()}</div>
                                {renderTrend(stats.steps)}
                            </div>
                            <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                                <span className="text-2xl block mb-1">🏋️</span>
                                <div className="text-[10px] font-bold text-zinc-500 uppercase">Workouts</div>
                                <div className="text-xl font-bold text-white">{stats.workouts.value} <span className="text-xs text-zinc-600">Days</span></div>
                                {renderTrend(stats.workouts)}
                            </div>
                        </div>

                        {/* 3. Physique & Fuel */}
                        <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-800">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Physique & Fuel</h3>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div>
                                    <div className="text-lg font-bold text-white">{stats.avgWeight > 0 ? stats.avgWeight.toFixed(1) : '-'}</div>
                                    <div className="text-[9px] text-zinc-500 uppercase">Avg Lbs</div>
                                </div>
                                <div>
                                    <div className={`text-lg font-bold ${stats.weightDelta < 0 ? 'text-green-500' : 'text-zinc-400'}`}>
                                        {stats.weightDelta > 0 ? '+' : ''}{stats.weightDelta.toFixed(1)}
                                    </div>
                                    <div className="text-[9px] text-zinc-500 uppercase">Delta</div>
                                </div>
                                <div className="group relative" tabIndex={0}>
                                    <div className={`text-lg font-bold ${stats.refactorDelta > 0 ? 'text-emerald-400' : stats.refactorDelta < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                                        {stats.refactorDelta > 0 ? '+' : ''}{stats.refactorDelta.toFixed(1)}
                                    </div>
                                    <div className="text-[9px] text-zinc-500 uppercase border-b border-dotted border-zinc-700 inline-block cursor-help">Refactor</div>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-black text-[9px] text-zinc-300 p-2 rounded border border-zinc-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity pointer-events-none z-50">
                                        Net inches moved in target direction
                                    </div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-blue-400">{stats.nutritionAdherence}/7</div>
                                    <div className="text-[9px] text-zinc-500 uppercase">Protein Goal</div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Habit Trends (Water/Sleep/Arena) */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-zinc-800/30 p-2 rounded-lg text-center border border-zinc-800">
                                <span className="text-lg">💦</span>
                                <div className="text-xs font-bold text-white">{stats.water.value} oz</div>
                                <div className="flex justify-center">{renderTrend(stats.water)}</div>
                            </div>
                            <div className="bg-zinc-800/30 p-2 rounded-lg text-center border border-zinc-800">
                                <span className="text-lg">💤</span>
                                <div className="text-xs font-bold text-white">{stats.sleep.value.toFixed(1)} hrs</div>
                                <div className="flex justify-center">{renderTrend(stats.sleep)}</div>
                            </div>
                            <div className="bg-zinc-800/30 p-2 rounded-lg text-center border border-zinc-800">
                                <span className="text-lg">⚔️</span>
                                <div className="text-xs font-bold text-white">{stats.victories} Wins</div>
                            </div>
                        </div>

                        {/* 5. Highlights */}
                        <div className="space-y-2 mt-4">
                            {stats.prCount > 0 && (
                                <div className="bg-gradient-to-r from-yellow-900/20 to-zinc-900 p-3 rounded-lg border border-yellow-500/20 flex items-center gap-3">
                                    <span className="text-xl">🏆</span>
                                    <div>
                                        <div className="text-xs font-bold text-yellow-500 uppercase">Strong Week</div>
                                        <div className="text-sm text-zinc-300">You crushed <span className="text-white font-bold">{stats.prCount} heavy lifts</span>!</div>
                                    </div>
                                </div>
                            )}

                            {stats.mvpHabit !== "None" && (
                                <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700 flex items-center gap-3">
                                    <span className="text-xl">⭐</span>
                                    <div>
                                        <div className="text-xs font-bold text-zinc-500 uppercase">MVP Habit</div>
                                        <div className="text-sm text-white font-bold">{stats.mvpHabit}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                )}

                {/* Footer Action */}
                <div className="p-4 bg-zinc-900 border-t border-zinc-800 sticky bottom-0 z-10">
                    <button
                        onClick={onClose}
                        className="w-full bg-white text-black font-black py-4 rounded-xl uppercase tracking-widest hover:bg-zinc-200 transition active:scale-95"
                    >
                        Start Next Week
                    </button>
                    <p className="text-center text-[10px] text-zinc-600 mt-2 italic">Result is choice.</p>
                </div>

            </div>
        </div>
    );
}
