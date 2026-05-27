'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { UserStats } from '@/types';
import { Zap } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { TIER_THRESHOLDS } from '@/utils/calculations';
import { useExperienceMode } from '@/context/ExperienceModeContext';
import { THEMES } from '@/data/themes';
import { createClient } from '@/utils/supabase/client';

interface DashboardHeaderProps {
    stats: UserStats | null;
    userId: string;
}

export default function DashboardHeader({ stats, userId }: DashboardHeaderProps) {
    const [mounted, setMounted] = useState(false);
    const [streak, setStreak] = useState(0);
    const [streakAtRisk, setStreakAtRisk] = useState(false);
    const [todayProgram, setTodayProgram] = useState<string | null>(null);
    const { currentTheme } = useTheme();
    const { isClassic } = useExperienceMode();
    const theme = THEMES[currentTheme] || THEMES['athlete'];
    const progressGradient = theme.progressGradient || 'from-orange-600 to-red-600';
    
    useEffect(() => {
        setMounted(true);
        if (userId) {
            const supabase = createClient();
            Promise.all([
                supabase.from('workouts').select('date').eq('user_id', userId).gte('date', new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]),
                supabase.from('habit_logs').select('date').eq('user_id', userId).gte('date', new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]),
            ]).then(([workouts, habits]) => {
                const dates = new Set<string>();
                (workouts.data || []).forEach((w: any) => dates.add(w.date));
                (habits.data || []).forEach((h: any) => dates.add(h.date));
                let count = 0;
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                const todayStr = d.toISOString().split('T')[0];
                const todayActive = dates.has(todayStr);
                if (!todayActive) d.setDate(d.getDate() - 1);
                while (dates.has(d.toISOString().split('T')[0])) {
                    count++;
                    d.setDate(d.getDate() - 1);
                }
                setStreak(count);
                setStreakAtRisk(count > 0 && !todayActive && new Date().getHours() >= 17);
            });

            // Get today's scheduled program name
            fetch('/api/workouts/schedule').then(r => r.json()).then(data => {
                const today = new Date().getDay();
                const dayMap: Record<number, string> = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
                const todayEntry = (data || []).find((s: any) => s.day === dayMap[today]);
                if (todayEntry?.program_name) setTodayProgram(todayEntry.program_name);
            }).catch(() => {});
        }
    }, [userId]);
    
    const powerLevel = stats?.power_level || 0;
    const playerLevel = stats?.player_level || 1;
    const xpToNext = stats?.xp_to_next_level || 0;
    const xpPercent = stats?.level_progress_percent || 0;

    const tier = useMemo(() => {
        for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
            if (powerLevel >= TIER_THRESHOLDS[i]) return i;
        }
        return 0;
    }, [powerLevel]);

    // Greeting based on time of day
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }, []);

    return (
        <div className="bg-zinc-900 border-b border-zinc-800 px-6 pt-5 pb-4">
            <div className="max-w-6xl mx-auto">
                {/* Greeting + Streak */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-400">{greeting}</span>
                        {streak > 0 && (
                            <span className="text-xs font-bold text-orange-400">🔥 {streak}d</span>
                        )}
                        {streakAtRisk && (
                            <span className="text-[10px] text-amber-400 animate-pulse">⚠️</span>
                        )}
                    </div>
                    {todayProgram && (
                        <span className="text-[11px] text-zinc-500 font-medium">{todayProgram}</span>
                    )}
                </div>

                {/* Power Level — Hero Metric */}
                <Link href="/power-level" className="block mb-3">
                    <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r ${progressGradient}`}>
                            {powerLevel}
                        </span>
                        {stats?.max_expertise && (
                            <span className="text-sm text-zinc-600 font-bold">/ {stats.max_expertise}</span>
                        )}
                        <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider ml-1">
                            {isClassic ? 'Fitness Score' : 'Power Level'}
                        </span>
                    </div>
                </Link>

                {/* XP Bar — Compact */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <Zap size={12} className="text-blue-500" />
                        <span className="text-[11px] font-bold text-zinc-500">Lv {playerLevel}</span>
                    </div>
                    <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className={`h-full bg-gradient-to-r ${progressGradient} transition-all duration-500`}
                            style={{ width: `${xpPercent}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-zinc-600">{xpToNext} to next</span>
                </div>
            </div>
        </div>
    );
}
