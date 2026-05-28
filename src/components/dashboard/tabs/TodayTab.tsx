'use client';

import { useState, useEffect } from 'react';
import { getToday } from '@/utils/date';
import Link from 'next/link';
import { Calendar, Dumbbell, ChevronRight, Share2, X } from 'lucide-react';
import type { Workout } from '@/types';
import { getHabitProgress } from '@/services/api';
import { createClient } from '@/utils/supabase/client';
import { useExperienceMode } from '@/context/ExperienceModeContext';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/data/themes';
import { useToast } from '@/context/ToastContext';
import DailyWrapUp from '../../DailyWrapUp';
import TomorrowPreview from '../../TomorrowPreview';
import WeeklyQuestsCard from '../../WeeklyQuestsCard';

interface TodayTabProps {
    userId: string;
    programs: Workout[];
    stats?: any;
}

export default function TodayTab({ userId, programs, stats }: TodayTabProps) {
    const { isClassic } = useExperienceMode();
    const { theme: _theme } = useTheme();
    const theme = _theme || THEMES.athlete;
    const toast = useToast();
    const [profile, setProfile] = useState<any>(null);
    const [todayScheduled, setTodayScheduled] = useState<any>(null);
    const [showTodayWrapUp, setShowTodayWrapUp] = useState(false);
    const [lastWorkout, setLastWorkout] = useState<{ date: string; totalXp: number; lifts: { name: string; volume: number }[]; treadmillSets: number } | null>(null);
    const [todayProgress, setTodayProgress] = useState<any>({
        calories: 0,
        caloriesBurned: 0,
        water: 0,
        steps: 0,
        xp: 0,
        maxDailyXp: 0,
    });
    const [loading, setLoading] = useState(true);
    const [showWeeklySummary, setShowWeeklySummary] = useState(() => {
        if (typeof window === 'undefined') return false;
        const today = new Date();
        const weekKey = `weekly_summary_${today.getFullYear()}_${Math.ceil((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / 604800000)}`;
        if (localStorage.getItem(weekKey)) return false;
        return today.getDay() <= 1;
    });

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
                
                // Get today's XP from xp_ledger (matches DailyWrapUp breakdown)
                const todayDate = getToday();
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const { data: ledgerEntries } = await supabase.from('xp_ledger')
                    .select('amount, source_label, source_type')
                    .eq('user_id', userId)
                    .gte('created_at', todayStart.toISOString());

                // Deduplicate: highest per source_label
                const deduped = new Map<string, number>();
                for (const e of (ledgerEntries || [])) {
                    if (e.amount <= 0) continue;
                    if (e.source_label?.startsWith('Auto-Cal')) continue;
                    if (e.source_label === 'exercise_minutes' || e.source_label === 'Exercise Minutes') continue;
                    const existing = deduped.get(e.source_label) || 0;
                    if (e.amount > existing) deduped.set(e.source_label, e.amount);
                }
                let totalXp = [...deduped.values()].reduce((s, v) => s + v, 0);

                // Fallback: if ledger is empty, use habit/workout data directly
                if (totalXp === 0) {
                    const [{ data: wXp }, { data: hXp }] = await Promise.all([
                        supabase.from('workouts').select('xp').eq('user_id', userId).eq('date', todayDate),
                        supabase.from('habit_logs').select('xp, habit_id').eq('user_id', userId).eq('date', todayDate),
                    ]);
                    totalXp = (wXp || []).reduce((s, r) => s + Math.max(0, r.xp || 0), 0);
                    const habitByType = new Map<string, number>();
                    for (const r of (hXp || [])) {
                        const current = habitByType.get(r.habit_id) || 0;
                        if ((r.xp || 0) > current) habitByType.set(r.habit_id, r.xp || 0);
                    }
                    totalXp += [...habitByType.values()].reduce((s, v) => s + v, 0);
                }
                
                // Get max daily XP (best day in last 30 days — good enough for the progress bar)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const cutoffDate = thirtyDaysAgo.toLocaleDateString('en-CA', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
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
                    const latest = workouts[0];
                    const sessionItems = workouts.filter(w => w.session_id ? w.session_id === latest.session_id : w.date === latest.date);
                    
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

    // Show weekly summary on Monday or first open of the week
    const dismissWeeklySummary = () => {
        const today = new Date();
        const weekKey = `weekly_summary_${today.getFullYear()}_${Math.ceil((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / 604800000)}`;
        localStorage.setItem(weekKey, 'true');
        setShowWeeklySummary(false);
    };

    return (
        <div className="space-y-3">
            {/* Weekly Quests — collapsible pill */}
            <WeeklyQuestsCard userId={userId} />

            {/* Compact Stats Row */}
            {profile && (
                <Link href="/track" className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 hover:border-zinc-700 transition">
                    {[
                        { icon: '🍽️', val: Math.round(todayProgress.calories), target: profile.nutrition_targets?.calories || 2000, unit: 'cal' },
                        { icon: '💧', val: Math.round(todayProgress.water), target: profile.habit_targets?.habit_water || 100, unit: 'oz' },
                        { icon: '👟', val: Math.round(todayProgress.steps), target: profile.habit_targets?.habit_steps || 10000, unit: '' },
                        { icon: '⚡', val: todayProgress.xp || 0, target: null, unit: 'XP' },
                    ].map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <span className="text-sm">{s.icon}</span>
                            <span className={`text-xs font-bold ${s.target && s.val >= s.target ? 'text-emerald-400' : 'text-white'}`}>
                                {s.val >= 1000 ? `${(s.val / 1000).toFixed(1)}k` : s.val}
                            </span>
                            {s.unit && <span className="text-[10px] text-zinc-600">{s.unit}</span>}
                        </div>
                    ))}
                </Link>
            )}

            {/* Smart CTA — Primary Action */}
            {profile && (() => {
                const hour = new Date().getHours();
                const hasWorkout = lastWorkout?.date === getToday();
                const hasFood = todayProgress.calories > 0;
                const hasScheduled = !!todayScheduled;

                if (hasScheduled && !hasWorkout) return (
                    <Link href="/train" className="block w-full bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl px-4 py-4 flex items-center justify-between shadow-lg shadow-orange-900/20 active:scale-[0.98] transition">
                        <div>
                            <div className="text-[10px] text-white/60 uppercase font-bold">Today&apos;s Workout</div>
                            <div className="text-sm font-bold">{todayScheduled.title || 'Ready to train'}</div>
                        </div>
                        <span className="text-sm font-bold">Start →</span>
                    </Link>
                );
                if (!hasFood && hour >= 7 && hour < 11) return (
                    <Link href="/track" className="block w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 flex items-center justify-between hover:border-zinc-600 transition">
                        <div className="flex items-center gap-2"><span>🥗</span><span className="text-sm font-medium">Log Breakfast</span></div>
                        <span className="text-xs text-zinc-500">→</span>
                    </Link>
                );
                if (!hasFood && hour >= 11 && hour < 15) return (
                    <Link href="/track" className="block w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 flex items-center justify-between hover:border-zinc-600 transition">
                        <div className="flex items-center gap-2"><span>🥗</span><span className="text-sm font-medium">Log Lunch</span></div>
                        <span className="text-xs text-zinc-500">→</span>
                    </Link>
                );
                if (!hasFood && hour >= 17 && hour < 21) return (
                    <Link href="/track" className="block w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 flex items-center justify-between hover:border-zinc-600 transition">
                        <div className="flex items-center gap-2"><span>🥗</span><span className="text-sm font-medium">Log Dinner</span></div>
                        <span className="text-xs text-zinc-500">→</span>
                    </Link>
                );
                if (hasWorkout && todayProgress.steps < (profile.habit_targets?.habit_steps || 10000) * 0.5) return (
                    <div className="w-full bg-zinc-800/50 border border-zinc-700/50 text-white rounded-xl px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2"><span>👣</span><span className="text-sm font-medium text-zinc-400">{todayProgress.steps.toLocaleString()} / {(profile.habit_targets?.habit_steps || 10000).toLocaleString()} steps</span></div>
                        <span className="text-[10px] text-zinc-600">Keep moving</span>
                    </div>
                );
                return null;
            })()}

            {/* Today's XP — tappable to see breakdown */}
            <button onClick={() => setShowTodayWrapUp(!showTodayWrapUp)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 transition text-left">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">⚡</span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Today&apos;s XP</span>
                    </div>
                    <span className="text-sm font-black text-orange-400">+{todayProgress.xp || 0}</span>
                </div>
            </button>
            {showTodayWrapUp && (
                <DailyWrapUp userId={userId} mode="today" onDismiss={() => setShowTodayWrapUp(false)} />
            )}

            {/* Rank Up Nudge — single closest exercise */}
            {profile && (() => {
                const quests = (stats as any)?.nextLevelQuests;
                if (!quests?.length) return null;
                const q = quests.find((q: any) => q.pct > 0) || quests[0];
                if (!q) return null;
                return (
                    <Link href="/power-level" className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 hover:border-zinc-700 transition">
                        <span className="text-sm">🎯</span>
                        <div className="flex-1 min-w-0">
                            <span className="text-xs text-zinc-300 truncate block">{q.name}</span>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${q.pct >= 90 ? 'bg-orange-500 animate-pulse' : 'bg-orange-600'}`} style={{ width: `${q.pct}%` }} />
                                </div>
                                <span className="text-[10px] text-zinc-500 font-mono shrink-0">{q.current} → {q.target}</span>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-orange-400">Lv{q.nextLevel}</span>
                    </Link>
                );
            })()}

            {/* Today's Scheduled Workout */}
            <Link href="/train" className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors block">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📅</span>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Today</h3>
                </div>
                {todayScheduled ? (
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-white mb-1">{todayScheduled.name}</p>
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
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
                        </div>
                        <span className="text-orange-500 text-xs font-bold uppercase">Start →</span>
                    </div>
                ) : (
                    <p className="text-xs text-zinc-500">Rest day 😴</p>
                )}
            </Link>

            {/* Tomorrow Preview (after 8 PM) */}
            <TomorrowPreview userId={userId} />
        </div>
    );
}
