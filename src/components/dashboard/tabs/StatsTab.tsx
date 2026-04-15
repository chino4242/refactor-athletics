'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import type { UserStats } from '@/types';
import { getHistory } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { useExperienceMode } from '@/context/ExperienceModeContext';
import { THEMES } from '@/data/themes';

interface StatsTabProps {
    userId: string;
    stats: UserStats | null;
}

// Same tier thresholds as PowerLevelPage
const TIER_THRESHOLDS = [0, 1, 13, 25, 49, 97];
function getTier(pl: number) {
    for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
        if (pl >= TIER_THRESHOLDS[i]) return i;
    }
    return 0;
}

export default function StatsTab({ userId, stats }: StatsTabProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { currentTheme } = useTheme();
    const { isClassic } = useExperienceMode();
    const theme = THEMES[currentTheme] || THEMES['athlete'];

    useEffect(() => {
        getHistory(userId).then(h => { setHistory(h); setLoading(false); }).catch(() => setLoading(false));
    }, [userId]);

    // Weekly stats
    const weekly = useMemo(() => {
        const now = new Date();
        const startOfThisWeek = new Date(now);
        startOfThisWeek.setHours(0, 0, 0, 0);
        startOfThisWeek.setDate(now.getDate() - now.getDay()); // Sunday
        const thisWeekTs = Math.floor(startOfThisWeek.getTime() / 1000);

        const startOfLastWeek = new Date(startOfThisWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        const lastWeekTs = Math.floor(startOfLastWeek.getTime() / 1000);

        const thisWeek = history.filter(h => h.timestamp >= thisWeekTs);
        const lastWeek = history.filter(h => h.timestamp >= lastWeekTs && h.timestamp < thisWeekTs);

        const xpThis = thisWeek.reduce((s, h) => s + (h.xp || 0), 0);
        const xpLast = lastWeek.reduce((s, h) => s + (h.xp || 0), 0);
        const workoutsThis = new Set(thisWeek.filter(h => h.rank_name).map(h => h.date)).size;
        const workoutsLast = new Set(lastWeek.filter(h => h.rank_name).map(h => h.date)).size;

        // Volume (weight × reps)
        const calcVolume = (items: any[]) => items.filter(h => h.rank_name).reduce((sum, h) => {
            const sets = h.details || h.data || [];
            return sum + (Array.isArray(sets) ? sets.reduce((s: number, set: any) => s + (set.weight || 0) * (set.reps || 0), 0) : 0);
        }, 0);
        const volThis = calcVolume(thisWeek);
        const volLast = calcVolume(lastWeek);

        return { xpThis, xpLast, workoutsThis, workoutsLast, volThis, volLast };
    }, [history]);

    // Recent activity
    const recent = useMemo(() => [...history].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5), [history]);

    // Power Level preview
    const powerLevel = stats?.power_level || 0;
    const maxPower = stats?.max_expertise || 0;
    const tier = getTier(powerLevel);
    const rankKey = `level${tier}` as keyof typeof theme.ranks;
    const rank = theme.ranks[rankKey];
    const rankName = rank?.name?.split(': ')[1] || 'Unranked';
    const rankImage = rank?.image;

    const delta = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? '↑' : '';
        const pct = Math.round(((current - previous) / previous) * 100);
        if (pct > 0) return `↑${pct}%`;
        if (pct < 0) return `↓${Math.abs(pct)}%`;
        return '—';
    };

    return (
        <div className="space-y-4">
            {/* Weekly Summary */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">This Week</h3>
                <p className="text-[10px] text-zinc-600 mb-3">Compared to last week</p>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: isClassic ? 'Points' : 'XP', value: weekly.xpThis.toLocaleString(), prev: weekly.xpLast, current: weekly.xpThis },
                        { label: 'Workouts', value: String(weekly.workoutsThis), prev: weekly.workoutsLast, current: weekly.workoutsThis },
                        { label: 'Volume', value: weekly.volThis >= 1000 ? `${(weekly.volThis / 1000).toFixed(1)}k` : String(weekly.volThis), prev: weekly.volLast, current: weekly.volThis },
                    ].map(s => {
                        const d = delta(s.current, s.prev);
                        const isUp = d.startsWith('↑');
                        const isDown = d.startsWith('↓');
                        return (
                            <div key={s.label} className="bg-zinc-800/50 rounded-lg p-3 text-center">
                                <div className="text-[10px] text-zinc-500 uppercase mb-1">{s.label}</div>
                                <div className="text-xl font-black text-white">{s.value}</div>
                                {d && <div className={`text-[10px] font-bold mt-0.5 ${isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-zinc-600'}`}>{d}</div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Power Level Preview */}
            <Link href="/power-level" className="block bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {rankImage && <Image src={rankImage} alt={rankName} width={48} height={48} className="object-contain" />}
                        <div>
                            <div className="text-[10px] text-zinc-500 uppercase">Power Level</div>
                            <div className={`text-2xl font-black italic bg-gradient-to-r ${theme.progressGradient || 'from-orange-500 to-red-500'} bg-clip-text text-transparent leading-none`}>
                                {powerLevel} <span className="text-sm text-zinc-500 font-bold">/ {maxPower}</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">{rankName}</div>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-600" />
                </div>
            </Link>

            {/* Recent Activity */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Activity</h3>
                    <Link href="/track" className="text-[10px] text-orange-500 hover:text-orange-400 font-bold flex items-center gap-0.5">
                        View All <ChevronRight size={12} />
                    </Link>
                </div>
                {loading ? (
                    <p className="text-sm text-zinc-500">Loading...</p>
                ) : recent.length > 0 ? (
                    <div className="space-y-2">
                        {recent.map((item, idx) => {
                            const ts = item.timestamp > 1e10 ? item.timestamp : item.timestamp * 1000;
                            const name = item.exercise_name || item.exercise_id.replace(/^(habit_|macro_)/, '').replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                            return (
                                <div key={idx} className="flex items-center justify-between py-1.5">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{name}</p>
                                        {item.xp > 0 && <span className="text-[10px] text-zinc-600">+{item.xp} {isClassic ? 'pts' : 'XP'}</span>}
                                    </div>
                                    <span className="text-[10px] text-zinc-600 flex-shrink-0 ml-2">{new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-xs text-zinc-500">No activity yet — start logging to see your history here</p>
                )}
            </div>

            {/* Lifetime Stats */}
            {stats && (
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Lifetime</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                            <div className="text-[10px] text-zinc-500 uppercase mb-0.5">Exercises Logged</div>
                            <div className="text-2xl font-black text-white">{(stats.exercises_tracked || 0).toLocaleString()}</div>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                            <div className="text-[10px] text-zinc-500 uppercase mb-0.5">Total {isClassic ? 'Points' : 'XP'}</div>
                            <div className="text-2xl font-black text-white">{(stats.total_career_xp || 0).toLocaleString()}</div>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                            <div className="text-[10px] text-zinc-500 uppercase mb-0.5">Player Level</div>
                            <div className="text-2xl font-black text-white">{stats.player_level || 1}</div>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                            <div className="text-[10px] text-zinc-500 uppercase mb-0.5">Best Rank</div>
                            <div className="text-2xl font-black text-white">Lv.{stats.highest_level_achieved || 0}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
