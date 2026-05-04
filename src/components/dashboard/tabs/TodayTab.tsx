'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Dumbbell, ChevronRight, Share2 } from 'lucide-react';
import type { Workout } from '@/types';
import { getHabitProgress } from '@/services/api';
import { createClient } from '@/utils/supabase/client';
import { useExperienceMode } from '@/context/ExperienceModeContext';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/data/themes';
import { useToast } from '@/context/ToastContext';

interface TodayTabProps {
    userId: string;
    programs: Workout[];
}

export default function TodayTab({ userId, programs }: TodayTabProps) {
    const { isClassic } = useExperienceMode();
    const { theme: _theme } = useTheme();
    const theme = _theme || THEMES.athlete;
    const toast = useToast();
    const [profile, setProfile] = useState<any>(null);
    const [todayScheduled, setTodayScheduled] = useState<any>(null);
    const [lastWorkout, setLastWorkout] = useState<{ date: string; totalXp: number; lifts: { name: string; volume: number }[]; treadmillSets: number } | null>(null);
    const [weeklySummary, setWeeklySummary] = useState<{ workouts: number; xp: number; habitsHit: number; habitsTotal: number; weightChange: number | null } | null>(null);
    const [recentPRs, setRecentPRs] = useState<{ name: string; value: string; date: string }[]>([]);
    const [todayProgress, setTodayProgress] = useState<any>({
        calories: 0,
        caloriesBurned: 0,
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

                // Weekly summary — last 7 days
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                const weekStr = weekAgo.toISOString().split('T')[0];
                const [weekWorkouts, weekHabits, weekMeasurements] = await Promise.all([
                    supabase.from('workouts').select('xp, date').eq('user_id', userId).gte('date', weekStr),
                    supabase.from('habit_logs').select('date, habit_id').eq('user_id', userId).gte('date', weekStr),
                    supabase.from('body_measurements').select('weight, date').eq('user_id', userId).order('date', { ascending: true }).limit(100),
                ]);
                const wDates = new Set((weekWorkouts.data || []).map((w: any) => w.date));
                const totalXpWeek = (weekWorkouts.data || []).reduce((s: number, w: any) => s + (w.xp || 0), 0);
                const habitDays = new Set((weekHabits.data || []).map((h: any) => h.date));
                const measurements = weekMeasurements.data || [];
                const recentWeights = measurements.filter((m: any) => m.weight).slice(-2);
                const weightChange = recentWeights.length >= 2 ? Math.round((recentWeights[recentWeights.length - 1].weight - recentWeights[recentWeights.length - 2].weight) * 10) / 10 : null;
                setWeeklySummary({ workouts: wDates.size, xp: totalXpWeek, habitsHit: habitDays.size, habitsTotal: 7, weightChange });

                // Recent PRs — find exercises where a log in last 14 days is the all-time best
                const twoWeeksAgo = new Date();
                twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                const { data: allWorkouts } = await supabase.from('workouts').select('exercise_id, raw_value, value, date').eq('user_id', userId).order('date', { ascending: false });
                if (allWorkouts?.length) {
                    const bestByExercise = new Map<string, { raw_value: number; value: string; date: string }>();
                    for (const w of allWorkouts) {
                        if (!w.raw_value || !w.exercise_id) continue;
                        const prev = bestByExercise.get(w.exercise_id);
                        if (!prev || w.raw_value > prev.raw_value) {
                            bestByExercise.set(w.exercise_id, { raw_value: w.raw_value, value: w.value, date: w.date });
                        }
                    }
                    const cutoff = twoWeeksAgo.toISOString().split('T')[0];
                    const prs = Array.from(bestByExercise.entries())
                        .filter(([, v]) => v.date >= cutoff)
                        .map(([id, v]) => ({ name: id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), value: v.value, date: v.date }))
                        .slice(0, 5);
                    setRecentPRs(prs);
                }
                
                // Get today's workout from weekly schedule API (same as Train page)
                const today = new Date();
                const scheduleResponse = await fetch('/api/workouts/schedule');
                if (scheduleResponse.ok) {
                    const weeklySchedule = await scheduleResponse.json();
                    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                    const todayName = dayNames[today.getDay()];
                    
                    const todayWorkout = weeklySchedule.find((day: any) => day.day === todayName);
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
                setTodayProgress({
                    calories: habitProgress?.totals?.macro_calories || 0,
                    caloriesBurned: habitProgress?.totals?.macro_calories_burned || 0,
                    water: habitProgress?.totals?.habit_water || 0,
                    steps: habitProgress?.totals?.habit_steps || 0,
                });
                
                // Get today's XP from all tables
                const todayDate = new Date().toLocaleDateString('en-CA');
                const [{ data: wXp }, { data: nXp }, { data: hXp }] = await Promise.all([
                    supabase.from('workouts').select('xp').eq('user_id', userId).eq('date', todayDate),
                    supabase.from('nutrition_logs').select('xp').eq('user_id', userId).gte('timestamp', startOfDay),
                    supabase.from('habit_logs').select('xp').eq('user_id', userId).gte('timestamp', startOfDay),
                ]);
                const totalXp = [...(wXp || []), ...(nXp || []), ...(hXp || [])].reduce((s, r) => s + (r.xp || 0), 0);
                
                // Get max daily XP (best day in last 30 days — good enough for the progress bar)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const cutoffDate = thirtyDaysAgo.toLocaleDateString('en-CA');
                const [{ data: allW }, { data: allN }, { data: allH }] = await Promise.all([
                    supabase.from('workouts').select('date, xp').eq('user_id', userId).gte('date', cutoffDate),
                    supabase.from('nutrition_logs').select('date, xp').eq('user_id', userId).gte('date', cutoffDate),
                    supabase.from('habit_logs').select('date, xp').eq('user_id', userId).gte('date', cutoffDate),
                ]);
                const dailyTotals: Record<string, number> = {};
                for (const r of [...(allW || []), ...(allN || []), ...(allH || [])]) {
                    if (r.date) dailyTotals[r.date] = (dailyTotals[r.date] || 0) + (r.xp || 0);
                }
                const maxDailyXp = Math.max(0, ...Object.values(dailyTotals));
                
                setTodayProgress((prev: any) => ({ ...prev, xp: totalXp, maxDailyXp }));
                
                // Get last completed workout (recent only)
                const { data: recentWorkouts } = await supabase
                    .from('workouts')
                    .select('*')
                    .eq('user_id', userId)
                    .order('date', { ascending: false })
                    .limit(30);
                const workouts = (recentWorkouts || []).filter(item => item.rank_name);
                if (workouts.length > 0) {
                    const latest = workouts[workouts.length - 1];
                    const sessionItems = workouts.filter(w => w.date === latest.date);
                    
                    // Group lifts by exercise, sum volume (weight × reps per set)
                    const liftMap: Record<string, number> = {};
                    let treadmillSets = 0;
                    
                    for (const w of sessionItems) {
                        const id = w.exercise_id || '';
                        if (id.toLowerCase().includes('tread')) {
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
                        .filter(l => l.volume > 0)
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

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-32" />
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-40" />
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-24" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Weekly Summary */}
            {weeklySummary && (weeklySummary.workouts > 0 || weeklySummary.habitsHit > 0) && (
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">📊</span>
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Last 7 Days</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <div className="text-2xl font-black text-white">{weeklySummary.workouts}</div>
                            <div className="text-[10px] text-zinc-500">Workouts</div>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-orange-400">+{weeklySummary.xp.toLocaleString()}</div>
                            <div className="text-[10px] text-zinc-500">{isClassic ? 'Points' : 'XP'}</div>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-emerald-400">{weeklySummary.habitsHit}/{weeklySummary.habitsTotal}</div>
                            <div className="text-[10px] text-zinc-500">Active Days</div>
                        </div>
                    </div>
                    {weeklySummary.weightChange !== null && (
                        <div className="mt-3 pt-3 border-t border-zinc-800 text-center">
                            <span className={`text-xs font-bold ${weeklySummary.weightChange < 0 ? 'text-emerald-400' : weeklySummary.weightChange > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                                {weeklySummary.weightChange > 0 ? '+' : ''}{weeklySummary.weightChange} lbs this week
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Recent PRs */}
            {recentPRs.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🏆</span>
                        <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Recent PRs</h3>
                    </div>
                    <div className="space-y-2">
                        {recentPRs.map((pr, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="text-sm text-white font-medium truncate flex-1">{pr.name}</span>
                                <div className="text-right shrink-0 ml-2">
                                    <span className="text-sm font-bold text-yellow-400">{pr.value}</span>
                                    <span className="text-[9px] text-zinc-600 ml-1.5">{new Date(pr.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Daily Quest Summary */}
            {profile && (
                <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🎯</span>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{isClassic ? 'Today\'s Targets' : 'Daily Quests'}</h3>
                        </div>
                        <button
                            onClick={async (e) => {
                                e.preventDefault();
                                try {
                                    const supabase = createClient();
                                    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
                                    const startTs = Math.floor(todayStart.getTime() / 1000);
                                    const [habitRes, nutritionRes, workoutRes, profileRes] = await Promise.all([
                                        supabase.from('habit_logs').select('habit_id, value').eq('user_id', userId).gte('timestamp', startTs),
                                        supabase.from('nutrition_logs').select('macro_type, amount').eq('user_id', userId).gte('timestamp', startTs),
                                        supabase.from('workouts').select('exercise_id, sets, xp').eq('user_id', userId).gte('timestamp', startTs),
                                        supabase.from('users').select('nutrition_targets, habit_targets').eq('id', userId).single(),
                                    ]);
                                    const habits: Record<string, number> = {};
                                    (habitRes.data || []).forEach((h: any) => { habits[h.habit_id] = (habits[h.habit_id] || 0) + (h.value || 0); });
                                    const macros: Record<string, number> = {};
                                    (nutritionRes.data || []).forEach((n: any) => { macros[n.macro_type] = (macros[n.macro_type] || 0) + (n.amount || 0); });
                                    const protein = Math.round(macros['protein'] || 0), carbs = Math.round(macros['carbs'] || 0), fat = Math.round(macros['fat'] || 0);
                                    const water = Math.round(habits['habit_water'] || 0), burned = Math.round(macros['calories_burned'] || 0);
                                    const cal = Math.round(protein * 4 + carbs * 4 + fat * 9);
                                    const net = cal - burned;
                                    let totalVolume = 0, exerciseCount = 0;
                                    const totalXp = (workoutRes.data || []).reduce((sum: number, w: any) => {
                                        exerciseCount++;
                                        if (w.sets && Array.isArray(w.sets)) w.sets.forEach((s: any) => { totalVolume += (s.weight || 0) * (s.reps || 0); });
                                        return sum + (w.xp || 0);
                                    }, 0);
                                    const nt = profileRes.data?.nutrition_targets || {};
                                    const lines = [
                                        `📅 ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`, '',
                                        '🏃 ACTIVITY',
                                        `👣 Steps: ${(habits['habit_steps'] || 0).toLocaleString()}`,
                                        `💪 Exercise: ${habits['habit_exercise_minutes'] || 0} min`,
                                        `💤 Sleep: ${habits['habit_sleep'] || 0} hrs`,
                                        habits['habit_day_strain'] ? `🔥 Day Strain: ${habits['habit_day_strain']}` : '',
                                        habits['habit_recovery'] ? `💚 Recovery: ${habits['habit_recovery']}%` : '',
                                        habits['habit_hrv'] ? `💓 HRV: ${habits['habit_hrv']}ms` : '',
                                        exerciseCount > 0 ? `🏋️ Volume: ${totalVolume.toLocaleString()} lbs | +${totalXp} XP` : '', '',
                                        '🥗 NUTRITION',
                                        `🥩 Protein: ${protein}/${nt.protein || 150}g`,
                                        `🍞 Carbs: ${carbs}/${nt.carbs || 150}g`,
                                        `🥑 Fat: ${fat}/${nt.fat || 60}g`,
                                        `🔥 Calories: ${cal}/${nt.calories || 2000}`,
                                        `💧 Water: ${water}/${profileRes.data?.habit_targets?.habit_water || nt.water || 100} oz`,
                                        burned > 0 ? `📊 Net: ${net > 0 ? '+' : ''}${net} kcal` : '',
                                    ].filter(Boolean);
                                    await navigator.clipboard.writeText(lines.join('\n'));
                                    toast.success('Daily report copied!');
                                } catch { toast.error('Failed to generate report'); }
                            }}
                            className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-700/50 transition"
                            title="Share Daily Report"
                        >
                            <Share2 size={16} />
                        </button>
                    </div>
                <Link
                    href="/track"
                    className="block bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-xl p-4 hover:border-orange-500 transition-colors"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] text-zinc-500">Tap to view details →</span>
                    </div>
                    
                    {/* Quick Stats Grid */}
                    <p className="text-[10px] text-zinc-600 mb-2">Green = goal met today</p>
                    <div className="grid grid-cols-4 gap-2">
                        {(() => {
                            const net = Math.round(todayProgress.calories - todayProgress.caloriesBurned);
                            const netTarget = profile.nutrition_targets?.net_calorie_target || -500;
                            // For deficit (negative target): net must be <= target. For surplus (positive): net must be >= target.
                            const netMet = netTarget < 0 ? net <= netTarget : net >= netTarget;
                            return (
                        <div className={`rounded-lg p-2.5 text-center transition-colors ${
                            netMet
                                ? 'bg-emerald-500/10 border border-emerald-500/20'
                                : 'bg-zinc-800/50'
                        }`}>
                            <div className="text-xl mb-0.5">🍽️</div>
                            <div className="text-[10px] text-zinc-500 mb-0.5">Calories</div>
                            <div className={`text-sm font-bold ${netMet ? 'text-emerald-400' : 'text-white'}`}>
                                {Math.round(todayProgress.calories)}
                            </div>
                            <div className="text-[10px] text-zinc-600">/ {profile.nutrition_targets?.calories || 2000}</div>
                            <div className={`text-[9px] font-bold mt-0.5 ${netMet ? 'text-emerald-400' : net < 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                                Net: {net > 0 ? '+' : ''}{net}
                            </div>
                        </div>
                            );
                        })()}
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
                </div>
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
