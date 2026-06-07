'use client';

import { useState, useEffect, useRef } from 'react';
import { getUserStats, getActiveDuels } from '@/services/api';
import { getWorkouts } from '@/services/workoutApi';
import type { UserStats, DuelResponse, Workout } from '@/types';
import DashboardHeader from './DashboardHeader';
import DashboardTabs from './DashboardTabs';
import DashboardSkeleton from './DashboardSkeleton';
import QuickActionButton from './QuickActionButton';
import FirstSessionView from './FirstSessionView';
import FirstVisitTooltip from '../common/FirstVisitTooltip';
import LevelUpCelebration from '../LevelUpCelebration';
import DailyWrapUp from '../DailyWrapUp';
import { Plus } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useExperienceMode } from '@/context/ExperienceModeContext';

interface DashboardClientProps {
    userId: string;
}

export default function DashboardClient({ userId }: DashboardClientProps) {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [activeDuels, setActiveDuels] = useState<DuelResponse[]>([]);
    const [programs, setPrograms] = useState<Workout[]>([]);
    const [loading, setLoading] = useState(true);
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [yesterdayDismissed, setYesterdayDismissed] = useState(() => {
        if (typeof window === 'undefined') return true;
        const seen = localStorage.getItem('wrapup_seen_date');
        return seen === new Date().toLocaleDateString('en-CA');
    });

    const dismissYesterday = () => {
        localStorage.setItem('wrapup_seen_date', new Date().toLocaleDateString('en-CA'));
        setYesterdayDismissed(true);
    };
    const [refreshing, setRefreshing] = useState(false);
    const [firstSessionDismissed, setFirstSessionDismissed] = useState(false);
    const [starterProgress, setStarterProgress] = useState<any[]>([]);
    const { setMode } = useExperienceMode();
    
    // Pull to refresh state
    const [pullDistance, setPullDistance] = useState(0);
    const touchStartY = useRef(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const loadData = async () => {
        try {
            const supabase = createClient();
            const [statsData, duelsData, programsData, profileData] = await Promise.all([
                getUserStats(userId).catch(e => { console.error('Stats error:', e); return null; }),
                getActiveDuels(userId).catch(e => { console.error('Duels error:', e); return []; }),
                getWorkouts(userId).catch(e => { console.error('Programs error:', e); return []; }),
                supabase.from('users').select('experience_mode, starter_quest_progress').eq('id', userId).single(),
            ]);
            const dbMode = profileData?.data?.experience_mode;
            if (dbMode === 'rpg' || dbMode === 'classic') setMode(dbMode);
            setStarterProgress(profileData?.data?.starter_quest_progress || []);
            setStats(statsData);
            setActiveDuels(duelsData || []);
            setPrograms(programsData || []);
            // Update Android widget with full data
            if (statsData) {
                (async () => {
                    try {
                        const { updateWidget } = await import('@/services/widgetBridge');
                        const { getTodayXp } = await import('@/utils/getTodayXp');
                        const { getHabitProgress } = await import('@/services/api');
                        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
                        const startTs = Math.floor(startOfDay.getTime() / 1000);
                        const [{ totalXp }, habitData] = await Promise.all([
                            getTodayXp(userId),
                            getHabitProgress(userId, startTs),
                        ]);
                        const totals = habitData?.totals || {};
                        // Count quests met (simplified: steps, sleep, protein, workout, water)
                        const questChecks = [
                            (totals['habit_steps'] || 0) >= 7500,
                            (totals['habit_sleep'] || 0) >= 7,
                            (totals['macro_protein'] || 0) >= 100,
                            (totals['habit_water'] || 0) >= 64,
                            totalXp >= 50,
                        ];
                        // Streak from habit_logs
                        const dateStr = startOfDay.toLocaleDateString('en-CA');
                        const { data: recentDays } = await supabase.from('habit_logs')
                            .select('date').eq('user_id', userId).lte('date', dateStr)
                            .order('date', { ascending: false }).limit(90);
                        let streak = 0;
                        if (recentDays?.length) {
                            const activeDates = new Set(recentDays.map((r: any) => r.date));
                            const d = new Date(startOfDay);
                            while (activeDates.has(d.toLocaleDateString('en-CA'))) { streak++; d.setDate(d.getDate() - 1); }
                        }
                        await updateWidget({
                            streak,
                            level: statsData.player_level || 1,
                            xp: totalXp,
                            questsDone: questChecks.filter(Boolean).length,
                            questsTotal: questChecks.length,
                            steps: totals['habit_steps'] || 0,
                            sleep: totals['habit_sleep'] || 0,
                            protein: totals['macro_protein'] || 0,
                        });
                    } catch {}
                })();
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
        // Background sync WHOOP/Google data if connected, then refresh
        fetch('/api/whoop/sync', { method: 'POST' })
            .then(r => r.json())
            .then(d => { if (d.synced?.length) { loadData(); localStorage.setItem('last_health_sync', new Date().toISOString()); } })
            .catch(() => {});

        // Native HealthKit/Health Connect sync (iOS/Android via Capacitor)
        (async () => {
            try {
                const { isHealthAvailable, requestPermissions, syncTodayHealth } = await import('@/services/nativeHealth');
                if (!(await isHealthAvailable())) return;
                // Request permissions if not yet granted
                const granted = await requestPermissions();
                if (!granted) {
                    // Store denial so onboarding/settings can show guidance
                    localStorage.setItem('health_permission_denied', 'true');
                    return;
                }
                localStorage.removeItem('health_permission_denied');
                const data = await syncTodayHealth();
                const { logHabitAction } = await import('@/app/actions');
                const promises = [];
                if (data.steps > 0) promises.push(logHabitAction(userId, 'habit_steps', data.steps, undefined, 'Steps'));
                if (data.caloriesBurned > 0) promises.push(logHabitAction(userId, 'macro_calories_burned', data.caloriesBurned, undefined, 'Calories Burned'));
                if (data.sleep > 0) promises.push(logHabitAction(userId, 'habit_sleep', data.sleep, undefined, 'Sleep'));
                if (data.hrv) promises.push(logHabitAction(userId, 'habit_hrv', data.hrv, undefined, 'HRV'));
                if (data.restingHR) promises.push(logHabitAction(userId, 'habit_resting_hr', data.restingHR, undefined, 'Resting HR'));
                if (promises.length > 0) {
                    await Promise.all(promises);
                    localStorage.setItem('last_health_sync', new Date().toISOString());
                    loadData();
                }
                // Sync exercise sessions via session-authenticated endpoint
                if (data.exercises?.length) {
                    const lastExSync = localStorage.getItem('last_exercise_sync_ts');
                    const newExercises = data.exercises.filter((ex: any) => {
                        if (!lastExSync) return true;
                        const t = ex.startDate || ex.start || ex.startTime;
                        return t && new Date(t).getTime() > parseInt(lastExSync);
                    });
                    if (newExercises.length > 0) {
                        await fetch('/api/sync/exercises', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ exercises: newExercises }),
                        }).catch(() => {});
                        localStorage.setItem('last_exercise_sync_ts', String(Date.now()));
                    }
                }
            } catch {}
        })();
    }, [userId]);

    useEffect(() => {
        setFirstSessionDismissed(localStorage.getItem('first_session_dismissed') === 'true');
    }, []);

    // Pull to refresh handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0) {
            touchStartY.current = e.touches[0].clientY;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartY.current === 0) return;
        
        const touchY = e.touches[0].clientY;
        const distance = touchY - touchStartY.current;
        
        if (distance > 0 && scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0) {
            setPullDistance(Math.min(distance, 100));
        }
    };

    const handleTouchEnd = () => {
        if (pullDistance > 60) {
            setRefreshing(true);
            loadData();
        }
        setPullDistance(0);
        touchStartY.current = 0;
    };

    const hasActiveDuels = activeDuels.length > 0;

    if (loading) {
        return <DashboardSkeleton />;
    }

    // Show focused first-session view for brand new users
    // Note: disabled conditional return to prevent hook ordering issues
    // FirstSessionView renders as a section within the dashboard instead
    const isFirstSession = stats && stats.exercises_tracked === 0 && (stats.total_career_xp || 0) === 0 && !firstSessionDismissed;

    return (
        <div 
            ref={scrollContainerRef}
            className="min-h-screen bg-black pb-24 overflow-y-auto"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <LevelUpCelebration userId={userId} />
            {/* Pull to refresh indicator */}
            {pullDistance > 0 && (
                <div 
                    className="fixed top-0 left-0 right-0 flex items-center justify-center z-50 transition-opacity"
                    style={{ 
                        height: `${pullDistance}px`,
                        opacity: pullDistance / 100 
                    }}
                >
                    <div className="text-orange-500 text-sm font-bold">
                        {pullDistance > 60 ? '↓ Release to refresh' : '↓ Pull to refresh'}
                    </div>
                </div>
            )}
            
            {/* Refreshing indicator */}
            {refreshing && (
                <div className="fixed top-4 left-0 right-0 flex items-center justify-center z-50">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-zinc-400">Refreshing...</span>
                    </div>
                </div>
            )}

            {/* Yesterday's Wrap-Up (collapsible card, not blocking) */}
            {!yesterdayDismissed && !isFirstSession && stats && (stats.total_career_xp || 0) > 0 && (
                <div className="px-4 mb-4 animate-fade-in-up stagger-1">
                    <details open>
                        <summary className="list-none cursor-pointer">
                            <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 hover:border-zinc-700 transition">
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">📋 Yesterday&apos;s Recap</span>
                                <span className="text-[10px] text-zinc-600">tap to expand</span>
                            </div>
                        </summary>
                        <div className="mt-2">
                            <DailyWrapUp userId={userId} mode="yesterday" onDismiss={dismissYesterday} stats={stats} />
                        </div>
                    </details>
                </div>
            )}
            {!isFirstSession && <div className="animate-fade-in-up stagger-2"><DashboardHeader stats={stats} userId={userId} /></div>}

            {!isFirstSession && <FirstVisitTooltip id="dashboard" message="This is your home base. Your Power Level grows as you train and hit new ranks." />}

            {/* Content: First Session or Tabbed Dashboard */}
            {isFirstSession ? (
                <FirstSessionView
                    todayWorkoutName={programs.find((p: any) => p.day_of_week === new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase())?.name}
                />
            ) : (
                <div className="animate-fade-in-up stagger-3">
                    <DashboardTabs 
                        userId={userId}
                        stats={stats}
                        hasActiveDuels={hasActiveDuels}
                        activeDuels={activeDuels}
                        programs={programs}
                        starterQuestProgress={starterProgress}
                    />
                </div>
            )}

            {/* Floating Action Button */}
            <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-orange-600 to-red-600 rounded-full shadow-lg flex items-center justify-center z-50 hover:scale-110 transition-transform"
                aria-label="Quick Actions"
            >
                <Plus size={24} className="text-white" />
            </button>

            {/* Quick Actions Menu */}
            {showQuickActions && (
                <>
                    <div 
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setShowQuickActions(false)}
                    />
                    <div className="fixed bottom-24 right-6 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden min-w-[180px]">
                        <QuickActionButton 
                            label="🏋️ Start Workout"
                            href="/train"
                            onClick={() => setShowQuickActions(false)}
                        />
                        <QuickActionButton 
                            label="🥗 Log Meal"
                            href="/track"
                            onClick={() => setShowQuickActions(false)}
                        />
                        <QuickActionButton 
                            label="💧 Log Water (+8oz)"
                            href="/track"
                            onClick={() => setShowQuickActions(false)}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
