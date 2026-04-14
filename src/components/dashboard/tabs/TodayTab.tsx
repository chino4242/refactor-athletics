'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Dumbbell, ChevronRight } from 'lucide-react';
import type { Workout } from '@/types';
import { getHistory, getHabitProgress } from '@/services/api';
import { createClient } from '@/utils/supabase/client';
import { useExperienceMode } from '@/context/ExperienceModeContext';

interface TodayTabProps {
    userId: string;
    programs: Workout[];
}

export default function TodayTab({ userId, programs }: TodayTabProps) {
    const { isClassic } = useExperienceMode();
    const [profile, setProfile] = useState<any>(null);
    const [todayScheduled, setTodayScheduled] = useState<any>(null);
    const [lastWorkout, setLastWorkout] = useState<{ date: string; totalXp: number; lifts: { name: string; volume: number }[]; treadmillSets: number } | null>(null);
    const [todayProgress, setTodayProgress] = useState<any>({
        calories: 0,
        water: 0,
        steps: 0,
        xp: 0,
        maxDailyXp: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTodayData = async () => {
            try {
                // Get user profile
                const supabase = createClient();
                const { data: profileData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();
                setProfile(profileData);
                
                // Get today's workout from weekly schedule API (same as Train page)
                const today = new Date();
                const scheduleResponse = await fetch('/api/workouts/schedule');
                if (scheduleResponse.ok) {
                    const weeklySchedule = await scheduleResponse.json();
                    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                    const todayName = dayNames[today.getDay()];
                    
                    const todayWorkout = weeklySchedule.find((day: any) => day.day === todayName);
                    console.log('Today workout from schedule:', todayWorkout);
                    
                    if (todayWorkout) {
                        setTodayScheduled({
                            name: todayWorkout.title,
                            type: todayWorkout.type,
                            xp: todayWorkout.xp,
                            exercises: todayWorkout.exercises || [],
                            treadmillBlocks: todayWorkout.treadmillBlocks || 0,
                        });
                    }
                }
                
                // Get today's start timestamp (midnight)
                today.setHours(0, 0, 0, 0);
                const startOfDay = Math.floor(today.getTime() / 1000);
                
                // Get today's habit progress
                const habitProgress = await getHabitProgress(userId, startOfDay);
                console.log('Today progress loaded:', habitProgress);
                setTodayProgress({
                    calories: habitProgress?.totals?.macro_calories || 0,
                    water: habitProgress?.totals?.habit_water || 0,
                    steps: habitProgress?.totals?.habit_steps || 0,
                });
                
                // Get today's XP from all tables
                const todayDate = new Date().toISOString().split('T')[0];
                const [{ data: wXp }, { data: nXp }, { data: hXp }] = await Promise.all([
                    supabase.from('workouts').select('xp').eq('user_id', userId).eq('date', todayDate),
                    supabase.from('nutrition_logs').select('xp').eq('user_id', userId).gte('timestamp', startOfDay),
                    supabase.from('habit_logs').select('xp').eq('user_id', userId).gte('timestamp', startOfDay),
                ]);
                const totalXp = [...(wXp || []), ...(nXp || []), ...(hXp || [])].reduce((s, r) => s + (r.xp || 0), 0);
                
                // Get max daily XP (all-time best day)
                const [{ data: allW }, { data: allN }, { data: allH }] = await Promise.all([
                    supabase.from('workouts').select('date, xp').eq('user_id', userId),
                    supabase.from('nutrition_logs').select('date, xp').eq('user_id', userId),
                    supabase.from('habit_logs').select('date, xp').eq('user_id', userId),
                ]);
                const dailyTotals: Record<string, number> = {};
                for (const r of [...(allW || []), ...(allN || []), ...(allH || [])]) {
                    if (r.date) dailyTotals[r.date] = (dailyTotals[r.date] || 0) + (r.xp || 0);
                }
                const maxDailyXp = Math.max(0, ...Object.values(dailyTotals));
                
                setTodayProgress((prev: any) => ({ ...prev, xp: totalXp, maxDailyXp }));
                
                // Get last completed workout from history
                const history = await getHistory(userId);
                const workouts = history.filter(item => item.rank_name);
                if (workouts.length > 0) {
                    const latest = workouts[workouts.length - 1];
                    const sessionItems = workouts.filter(w => w.date === latest.date);
                    
                    // Group lifts by exercise, sum volume (weight × reps per set)
                    const liftMap: Record<string, number> = {};
                    let treadmillSets = 0;
                    
                    for (const w of sessionItems) {
                        const id = w.exercise_id || '';
                        if (id.includes('treadmill')) {
                            treadmillSets++;
                            continue;
                        }
                        const sets = (w as any).details || w.data || [];
                        const vol = Array.isArray(sets) 
                            ? sets.reduce((s: number, set: any) => s + (set.weight || 0) * (set.reps || 0), 0) 
                            : 0;
                        const name = id.replace(/^block_/, '').replace(/_/g, ' ');
                        liftMap[name] = (liftMap[name] || 0) + vol;
                    }
                    
                    const lifts = Object.entries(liftMap)
                        .map(([name, volume]) => ({ name, volume }))
                        .sort((a, b) => b.volume - a.volume);

                    setLastWorkout({
                        date: latest.date,
                        totalXp: sessionItems.reduce((sum, w) => sum + (w.xp || 0), 0),
                        lifts,
                        treadmillSets,
                    });
                }
            } catch (error) {
                console.error('Failed to load today data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadTodayData();
    }, [userId]);

    console.log('TodayTab render:', { loading, profile: !!profile });

    if (loading) {
        return <div className="text-zinc-400 text-center py-8">Loading...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Daily Quest Summary */}
            {profile && (
                <Link
                    href="/track"
                    className="block bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-xl p-4 hover:border-orange-500 transition-colors"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🎯</span>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{isClassic ? 'Today\'s Targets' : 'Daily Quests'}</h3>
                        </div>
                        <span className="text-[10px] text-zinc-500">Tap to log →</span>
                    </div>
                    
                    {/* Quick Stats Grid */}
                    <p className="text-[10px] text-zinc-600 mb-2">Green = goal met today</p>
                    <div className="grid grid-cols-4 gap-2">
                        <div className={`rounded-lg p-2.5 text-center transition-colors ${
                            todayProgress.calories >= (profile.nutrition_targets?.calories || 2000)
                                ? 'bg-emerald-500/10 border border-emerald-500/20'
                                : 'bg-zinc-800/50'
                        }`}>
                            <div className="text-xl mb-0.5">🍽️</div>
                            <div className="text-[10px] text-zinc-500 mb-0.5">Calories</div>
                            <div className={`text-sm font-bold ${
                                todayProgress.calories >= (profile.nutrition_targets?.calories || 2000)
                                    ? 'text-emerald-400'
                                    : 'text-white'
                            }`}>
                                {Math.round(todayProgress.calories)}
                            </div>
                            <div className="text-[10px] text-zinc-600">/ {profile.nutrition_targets?.calories || 2000}</div>
                        </div>
                        <div className={`rounded-lg p-2.5 text-center transition-colors ${
                            todayProgress.water >= (profile.habit_targets?.habit_water || 100)
                                ? 'bg-emerald-500/10 border border-emerald-500/20'
                                : 'bg-zinc-800/50'
                        }`}>
                            <div className="text-xl mb-0.5">💧</div>
                            <div className="text-[10px] text-zinc-500 mb-0.5">Water</div>
                            <div className={`text-sm font-bold ${
                                todayProgress.water >= (profile.habit_targets?.habit_water || 100)
                                    ? 'text-emerald-400'
                                    : 'text-white'
                            }`}>
                                {Math.round(todayProgress.water)}
                            </div>
                            <div className="text-[10px] text-zinc-600">/ {profile.habit_targets?.habit_water || 100} oz</div>
                        </div>
                        <div className={`rounded-lg p-2.5 text-center transition-colors ${
                            todayProgress.steps >= (profile.habit_targets?.habit_steps || 10000)
                                ? 'bg-emerald-500/10 border border-emerald-500/20'
                                : 'bg-zinc-800/50'
                        }`}>
                            <div className="text-xl mb-0.5">👟</div>
                            <div className="text-[10px] text-zinc-500 mb-0.5">Steps</div>
                            <div className={`text-sm font-bold ${
                                todayProgress.steps >= (profile.habit_targets?.habit_steps || 10000)
                                    ? 'text-emerald-400'
                                    : 'text-white'
                            }`}>
                                {Math.round(todayProgress.steps)}
                            </div>
                            <div className="text-[10px] text-zinc-600">/ {(profile.habit_targets?.habit_steps || 10000).toLocaleString()}</div>
                        </div>
                        <div className={`rounded-lg p-2.5 text-center transition-colors ${
                            todayProgress.xp > 0 && todayProgress.xp >= todayProgress.maxDailyXp
                                ? 'bg-emerald-500/10 border border-emerald-500/20'
                                : todayProgress.xp > 0
                                ? 'bg-orange-500/10 border border-orange-500/20'
                                : 'bg-zinc-800/50'
                        }`}>
                            <div className="relative">
                                <div className="text-xl mb-0.5">⚡</div>
                                {todayProgress.maxDailyXp > 0 && (
                                    <div className="absolute -top-1 -right-1 text-[8px] text-zinc-500 font-bold">🏆{(todayProgress.maxDailyXp || 0).toLocaleString()}</div>
                                )}
                            </div>
                            <div className="text-[10px] text-zinc-500 mb-0.5">{isClassic ? 'Points' : 'XP'}</div>
                            <div className={`text-sm font-bold ${
                                todayProgress.xp > 0 && todayProgress.xp >= todayProgress.maxDailyXp
                                    ? 'text-emerald-400'
                                    : todayProgress.xp > 0 ? 'text-orange-400' : 'text-white'
                            }`}>
                                {(todayProgress.xp || 0).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-zinc-600">today</div>
                        </div>
                    </div>
                    
                    <div className="mt-3 text-xs text-center text-zinc-500">
                        Tap to log progress →
                    </div>
                </Link>
            )}

            {/* Today's Workout + Last Workout - Side by Side */}
            <div className="grid grid-cols-2 gap-3">
                {/* Today's Scheduled Workout */}
                <Link href="/train" className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors block">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">📅</span>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Today</h3>
                    </div>
                    <p className="text-[10px] text-zinc-600 mb-2">From your weekly schedule</p>
                    {todayScheduled ? (
                        <div>
                            <p className="text-sm font-bold text-white mb-1 truncate">{todayScheduled.name}</p>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                                <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                    todayScheduled.type === 'Strength' ? 'bg-blue-950/50 text-blue-400' :
                                    todayScheduled.type === 'Cardio' ? 'bg-red-950/50 text-red-400' :
                                    todayScheduled.type === 'Hybrid' ? 'bg-purple-950/50 text-purple-400' :
                                    'bg-zinc-800 text-zinc-400'
                                }`}>
                                    {todayScheduled.type}
                                </span>
                                <span className="text-[10px]">⚡ {todayScheduled.xp} {isClassic ? 'pts' : 'XP'}</span>
                            </div>
                            {todayScheduled.exercises?.length > 0 && (
                                <div className="space-y-0.5 border-t border-zinc-800 pt-2">
                                    {todayScheduled.exercises.slice(0, 3).map((name: string, i: number) => (
                                        <div key={i} className="flex items-center gap-1.5 text-[10px] text-zinc-500 capitalize truncate">
                                            <span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
                                            {name}
                                        </div>
                                    ))}
                                    {todayScheduled.exercises.length > 3 && (
                                        <div className="text-[10px] text-zinc-600">+{todayScheduled.exercises.length - 3} more</div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-2">
                            <p className="text-xs text-zinc-500">Rest day 😴</p>
                        </div>
                    )}
                </Link>

                {/* Last Completed Workout */}
                <Link href="/track" className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors block">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">💪</span>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Last Workout</h3>
                    </div>
                    <p className="text-[10px] text-zinc-600 mb-2">Volume = weight × reps</p>
                    {lastWorkout ? (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] text-zinc-500">{lastWorkout.date}</span>
                                <span className="text-[10px] text-orange-500 font-bold">+{lastWorkout.totalXp} {isClassic ? 'pts' : 'XP'}</span>
                            </div>
                            <div className="space-y-0.5">
                                {lastWorkout.lifts.slice(0, 3).map(l => (
                                    <div key={l.name} className="flex justify-between text-[10px]">
                                        <span className="text-zinc-400 capitalize truncate mr-2">{l.name}</span>
                                        <span className="text-white font-bold shrink-0">{l.volume.toLocaleString()} lbs</span>
                                    </div>
                                ))}
                                {lastWorkout.lifts.length > 3 && (
                                    <div className="text-[10px] text-zinc-600">+{lastWorkout.lifts.length - 3} more</div>
                                )}
                                {lastWorkout.treadmillSets > 0 && (
                                    <div className="text-[10px] text-zinc-400">🏃 {lastWorkout.treadmillSets} intervals</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-2">
                            <p className="text-xs text-zinc-500">No workouts yet</p>
                            <p className="text-[10px] text-orange-500 mt-1">Log your first →</p>
                        </div>
                    )}
                </Link>
            </div>
        </div>
    );
}
