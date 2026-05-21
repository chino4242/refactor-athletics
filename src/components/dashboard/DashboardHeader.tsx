'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { UserStats } from '@/types';
import { Trophy, Zap } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useExperienceMode } from '@/context/ExperienceModeContext';
import { THEMES } from '@/data/themes';
import { createClient } from '@/utils/supabase/client';
import InfoTooltip from '@/components/common/InfoTooltip';
import { calculatePhysiquePoints } from '@/utils/physiquePoints';

interface DashboardHeaderProps {
    stats: UserStats | null;
    userId: string;
}

export default function DashboardHeader({ stats, userId }: DashboardHeaderProps) {
    const [mounted, setMounted] = useState(false);
    const [bodyCompHistory, setBodyCompHistory] = useState<any[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [streak, setStreak] = useState(0);
    const [streakAtRisk, setStreakAtRisk] = useState(false);
    const { currentTheme } = useTheme();
    const { isClassic } = useExperienceMode();
    const theme = THEMES[currentTheme] || THEMES['athlete'];
    const progressGradient = theme.progressGradient || 'from-orange-600 to-red-600';
    
    useEffect(() => {
        setMounted(true);
        if (userId) {
            const supabase = createClient();
            Promise.all([
                supabase.from('body_measurements').select('*').eq('user_id', userId).order('timestamp', { ascending: true }),
                supabase.from('users').select('body_composition_goals, bodyweight').eq('id', userId).single(),
                // Streak: get distinct dates with any activity in last 90 days
                supabase.from('workouts').select('date').eq('user_id', userId).gte('date', new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]),
                supabase.from('habit_logs').select('date').eq('user_id', userId).gte('date', new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]),
            ]).then(([measurement, profile, workouts, habits]) => {
                if (measurement.data && measurement.data.length > 0) {
                    setBodyCompHistory(measurement.data);
                }
                setUserProfile(profile.data);

                // Calculate streak from distinct active dates
                const dates = new Set<string>();
                (workouts.data || []).forEach((w: any) => dates.add(w.date));
                (habits.data || []).forEach((h: any) => dates.add(h.date));
                let count = 0;
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                // Check today first, if not active yet check from yesterday
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
        }
    }, [userId]);
    
    const powerLevel = stats?.power_level || 0;
    const totalXp = stats?.total_career_xp || stats?.total_xp || 0;
    const playerLevel = stats?.player_level || 1;
    const xpToNext = stats?.xp_to_next_level || 0;
    const xpPercent = stats?.level_progress_percent || 0;

    // Calculate refactor score
    const physiquePoints = useMemo(() => {
        return calculatePhysiquePoints(bodyCompHistory, userProfile?.body_composition_goals || {}, (userProfile?.measurement_mode as 'tape' | 'scale') || 'tape');
    }, [bodyCompHistory, userProfile]);

    // Tier-based rank from aggregate power level
    const TIER_THRESHOLDS = [0, 1, 13, 25, 49, 97];
    const tier = useMemo(() => {
        for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
            if (powerLevel >= TIER_THRESHOLDS[i]) return i;
        }
        return 0;
    }, [powerLevel]);
    const rankKey = `level${tier}`;
    const rankImage = theme.ranks?.[rankKey]?.image;
    const rankName = theme.ranks?.[rankKey]?.name?.split(': ')[1] || `Tier ${tier}`;

    return (
        <div className="relative">
            {/* Theme Banner Image */}
            {mounted && !isClassic && (
                <div className="relative overflow-hidden h-24 md:h-auto">
                    <img 
                        src={`/themes/${currentTheme}/banner.png`}
                        alt={`${theme.displayName} banner`}
                        className="w-full h-full md:h-auto object-cover block"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                </div>
            )}
            
            {/* Header Content */}
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border-b border-zinc-800 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        {/* Power Level */}
                        <Link href="/power-level" className="group text-center">
                            <div className="flex flex-col items-center mb-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{isClassic ? 'Fitness Score' : 'Power Level'}</span>
                                    <InfoTooltip text={isClassic
                                        ? `Your fitness score across ${stats?.max_expertise ? stats.max_expertise / 5 : 0} exercises. Test an exercise to see where you stand.`
                                        : `Your best rank level (1-5) across ${stats?.max_expertise ? stats.max_expertise / 5 : 0} ranked exercises. Max = ${stats?.max_expertise || 0} (${stats?.max_expertise ? stats.max_expertise / 5 : 0} exercises × 5 levels). Log your best result on an exercise to earn your rank!`} size={14} />
                                </div>
                            </div>
                            <div className={`text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r ${progressGradient}`}>
                                {powerLevel > 0 ? (
                                    <>{powerLevel}<span className="text-lg text-zinc-500">/{stats?.max_expertise || 0}</span></>
                                ) : (
                                    <span className="text-lg text-zinc-500 not-italic font-bold">Complete a workout to earn your first rank</span>
                                )}
                            </div>
                            {powerLevel > 0 && stats && stats.exercises_tracked && stats.exercises_tracked > 0 && (
                                <div className="text-[10px] text-zinc-500 mt-1">
                                    {stats.exercises_tracked} exercise{stats.exercises_tracked > 1 ? 's' : ''} ranked · avg Lv{(powerLevel / stats.exercises_tracked).toFixed(1)}
                                    {stats.power_level_week_delta && stats.power_level_week_delta > 0 && (
                                        <span className="ml-1.5 text-emerald-400 font-bold">+{(stats as any).power_level_week_delta} this week 🔥</span>
                                    )}
                                </div>
                            )}
                            {!isClassic && rankImage && (
                                <div className="flex flex-col items-center mt-2">
                                    <img src={rankImage} alt={rankName} className="w-14 h-14 object-contain" />
                                    <span className="text-[10px] font-bold mt-1" style={{ color: theme.accentHex }}>{rankName}</span>
                                    {tier < TIER_THRESHOLDS.length - 1 && (() => {
                                        const nextTierPL = TIER_THRESHOLDS[tier + 1];
                                        const currentTierPL = TIER_THRESHOLDS[tier];
                                        const progress = Math.round(((powerLevel - currentTierPL) / (nextTierPL - currentTierPL)) * 100);
                                        const nextRankName = theme.ranks?.[`level${tier + 1}`]?.name?.split(': ')[1] || `Tier ${tier + 1}`;
                                        return (
                                            <div className="w-full mt-1.5 max-w-[120px]">
                                                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-orange-500/70 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                                </div>
                                                <div className="text-[8px] text-zinc-600 mt-0.5 text-center">{nextTierPL - powerLevel} to {nextRankName}</div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                            <div className="text-[10px] text-orange-500/70 group-hover:text-orange-400 mt-1 transition">View Power Level →</div>
                        </Link>

                        {/* Body Composition */}
                        <Link href="/track#body-comp" className="group text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="text-xl">💪</span>
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider group-hover:text-emerald-400 transition">{isClassic ? 'Body Comp' : 'Physique'}</span>
                            </div>
                            {(() => {
                                const hasLean = physiquePoints.leanMassDelta !== undefined;
                                const hasFat = physiquePoints.fatPctDelta !== undefined;
                                if (!hasLean && !hasFat) return (
                                    <>
                                        <div className={`text-4xl font-black italic ${physiquePoints.color}`}>
                                            {physiquePoints.score > 0 ? '+' : ''}{physiquePoints.score}
                                        </div>
                                        <div className="text-[10px] text-zinc-600 mt-1">pts</div>
                                    </>
                                );
                                return (
                                    <div className="space-y-1 mt-1">
                                        {hasLean && (
                                            <div className={`text-sm font-black ${physiquePoints.leanMassDelta! > 0 ? 'text-emerald-400' : physiquePoints.leanMassDelta! < 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                                                {physiquePoints.leanMassDelta! > 0 ? '+' : ''}{physiquePoints.leanMassDelta} lbs
                                                <span className="text-[9px] text-zinc-500 font-medium ml-1">muscle</span>
                                            </div>
                                        )}
                                        {hasFat && (
                                            <div className={`text-sm font-black ${physiquePoints.fatPctDelta! < 0 ? 'text-emerald-400' : physiquePoints.fatPctDelta! > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                                                {physiquePoints.fatPctDelta! > 0 ? '+' : ''}{physiquePoints.fatPctDelta}%
                                                <span className="text-[9px] text-zinc-500 font-medium ml-1">body fat</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                            <div className="text-[10px] text-emerald-500/70 group-hover:text-emerald-400 mt-1 transition">Track body comp →</div>
                        </Link>

                        {/* Weight */}
                        <Link href="/track#body-comp" className="group text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="text-xl">⚖️</span>
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider group-hover:text-cyan-400 transition">Weight</span>
                            </div>
                            {(() => {
                                const target = userProfile?.body_composition_goals?.target_weight;
                                const currentWeight = bodyCompHistory[bodyCompHistory.length - 1]?.weight || userProfile?.bodyweight;
                                
                                if (currentWeight && target) {
                                    const targetNum = parseFloat(target);
                                    const diff = Math.abs(currentWeight - targetNum).toFixed(1);
                                    
                                    return (
                                        <>
                                            <div className="text-2xl font-black italic text-white">
                                                {currentWeight} lbs
                                            </div>
                                            <div className="text-xs text-zinc-500">
                                                Target: {target} lbs
                                            </div>
                                            <div className="text-xs text-zinc-400 font-semibold">
                                                {diff} lbs to go
                                            </div>
                                        </>
                                    );
                                }
                                return (
                                    <>
                                        <div className="text-4xl font-black italic text-zinc-600">—</div>
                                        <div className="text-xs text-zinc-500 mt-1">No data</div>
                                    </>
                                );
                            })()}
                            <div className="text-[10px] text-cyan-500/70 group-hover:text-cyan-400 mt-1 transition">Update weight →</div>
                        </Link>
                    </div>

                    {/* Streak */}
                    {streak > 0 && (
                        <div className="flex flex-col items-center mb-4 py-2">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🔥</span>
                                <span className="text-sm font-black text-white">{streak} Day Streak</span>
                                {streak >= 7 && <span className="text-[10px] bg-orange-500/15 text-orange-400 px-2 py-0.5 rounded-full font-bold border border-orange-500/20">{streak >= 30 ? 'Legendary' : streak >= 14 ? 'On Fire' : 'Rolling'}</span>}
                            </div>
                            {streakAtRisk && (
                                <span className="text-[10px] text-amber-400 mt-1 animate-pulse">⚠️ Log something today to keep your streak alive!</span>
                            )}
                        </div>
                    )}

                    {/* Sync staleness indicator */}
                    {mounted && (() => {
                        const lastSync = localStorage.getItem('last_health_sync');
                        if (!lastSync) return null;
                        const hoursAgo = Math.round((Date.now() - new Date(lastSync).getTime()) / 3600000);
                        if (hoursAgo < 2) return null;
                        return (
                            <div className="text-center mb-3">
                                <span className="text-[9px] text-zinc-600">Health data synced {hoursAgo}h ago</span>
                            </div>
                        );
                    })()}

                    {/* Player Level & XP */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Zap size={16} className="text-blue-500" />
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    Level {playerLevel}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500">
                                    {xpToNext} {isClassic ? 'pts to next' : 'XP to next'}
                                </span>
                            </div>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                            <div 
                                className={`h-full bg-gradient-to-r ${progressGradient} transition-all duration-500`}
                                style={{ width: `${xpPercent}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1">Earn XP from workouts, nutrition & habits</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
