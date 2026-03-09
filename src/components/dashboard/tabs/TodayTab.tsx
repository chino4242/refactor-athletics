'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Dumbbell, ChevronRight } from 'lucide-react';
import type { Workout } from '@/types';
import { getHistory, getHabitProgress } from '@/services/api';
import { createClient } from '@/utils/supabase/client';

interface TodayTabProps {
    userId: string;
    programs: Workout[];
}

export default function TodayTab({ userId, programs }: TodayTabProps) {
    const [profile, setProfile] = useState<any>(null);
    const [todayScheduled, setTodayScheduled] = useState<any>(null);
    const [lastWorkout, setLastWorkout] = useState<any>(null);
    const [todayProgress, setTodayProgress] = useState<any>({
        calories: 0,
        water: 0,
        steps: 0,
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
                const scheduleResponse = await fetch('/api/workouts/schedule');
                if (scheduleResponse.ok) {
                    const weeklySchedule = await scheduleResponse.json();
                    const today = new Date();
                    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                    const todayName = dayNames[today.getDay()];
                    
                    const todayWorkout = weeklySchedule.find((day: any) => day.day === todayName);
                    console.log('Today workout from schedule:', todayWorkout);
                    
                    if (todayWorkout) {
                        setTodayScheduled({
                            name: todayWorkout.title,
                            type: todayWorkout.type,
                            xp: todayWorkout.xp,
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
                
                // Get last completed workout from history
                const history = await getHistory(userId);
                const workouts = history.filter(item => item.type === 'workout');
                if (workouts.length > 0) {
                    setLastWorkout(workouts[0]);
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

    const handleXpEarned = () => {
        router.refresh();
    };

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
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Daily Quests</h3>
                        </div>
                        <ChevronRight size={16} className="text-zinc-500" />
                    </div>
                    
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                            <div className="text-2xl mb-1">🍽️</div>
                            <div className="text-xs text-zinc-500 mb-1">Calories</div>
                            <div className="text-sm font-bold text-white">{Math.round(todayProgress.calories)}</div>
                            <div className="text-xs text-zinc-600">/ {profile.nutrition_targets?.calories || 2000}</div>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                            <div className="text-2xl mb-1">💧</div>
                            <div className="text-xs text-zinc-500 mb-1">Water</div>
                            <div className="text-sm font-bold text-white">{Math.round(todayProgress.water)}</div>
                            <div className="text-xs text-zinc-600">/ {profile.habit_targets?.water || 100} oz</div>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                            <div className="text-2xl mb-1">👟</div>
                            <div className="text-xs text-zinc-500 mb-1">Steps</div>
                            <div className="text-sm font-bold text-white">{Math.round(todayProgress.steps)}</div>
                            <div className="text-xs text-zinc-600">/ {profile.habit_targets?.steps || 10000}</div>
                        </div>
                    </div>
                    
                    <div className="mt-3 text-xs text-center text-zinc-500">
                        Tap to log progress →
                    </div>
                </Link>
            )}

            {/* Today's Scheduled Workout */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">📅</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Today's Workout</h3>
                    </div>
                    <Link href="/programs" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1">
                        View All
                        <ChevronRight size={14} />
                    </Link>
                </div>
                {todayScheduled ? (
                    <Link href="/train" className="block">
                        <div className="bg-zinc-800/50 rounded-lg p-3 hover:bg-zinc-800 transition-colors">
                            <p className="text-sm font-bold text-white mb-1">{todayScheduled.name}</p>
                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                                <span className={`px-2 py-0.5 rounded font-bold ${
                                    todayScheduled.type === 'Strength' ? 'bg-blue-950/50 text-blue-400' :
                                    todayScheduled.type === 'Cardio' ? 'bg-red-950/50 text-red-400' :
                                    todayScheduled.type === 'Hybrid' ? 'bg-purple-950/50 text-purple-400' :
                                    'bg-zinc-800 text-zinc-400'
                                }`}>
                                    {todayScheduled.type}
                                </span>
                                <span>⚡ {todayScheduled.xp} XP</span>
                            </div>
                        </div>
                    </Link>
                ) : (
                    <p className="text-sm text-zinc-500">No workout scheduled for today</p>
                )}
            </div>

            {/* Last Completed Workout */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">💪</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Last Workout</h3>
                    </div>
                    <Link href="/track" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1">
                        View History
                        <ChevronRight size={14} />
                    </Link>
                </div>
                {lastWorkout ? (
                    <div className="text-sm text-zinc-300">
                        <p className="font-bold">{lastWorkout.exercise_name || lastWorkout.exercise_id}</p>
                        <p className="text-xs text-zinc-500">
                            {new Date((lastWorkout.timestamp > 10000000000 ? lastWorkout.timestamp : lastWorkout.timestamp * 1000)).toLocaleDateString()}
                        </p>
                    </div>
                ) : (
                    <p className="text-sm text-zinc-500">No workouts logged yet</p>
                )}
            </div>
        </div>
    );
}
