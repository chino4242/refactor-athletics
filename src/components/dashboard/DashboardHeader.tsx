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
                supabase.from('users').select('body_composition_goals, bodyweight').eq('id', userId).single()
            ]).then(([measurement, profile]) => {
                if (measurement.data && measurement.data.length > 0) {
                    setBodyCompHistory(measurement.data);
                }
                setUserProfile(profile.data);
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
                <div className="relative overflow-hidden">
                    <img 
                        src={`/themes/${currentTheme}/banner.png`}
                        alt={`${theme.displayName} banner`}
                        className="w-full h-auto block"
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
                                {powerLevel}<span className="text-lg text-zinc-500">/{stats?.max_expertise || 0}</span>
                            </div>
                            {!isClassic && rankImage && (
                                <div className="flex flex-col items-center mt-2">
                                    <img src={rankImage} alt={rankName} className="w-14 h-14 object-contain" />
                                    <span className="text-[10px] font-bold mt-1" style={{ color: theme.accentHex }}>{rankName}</span>
                                </div>
                            )}
                            <div className="text-[10px] text-orange-500/70 group-hover:text-orange-400 mt-1 transition">View Power Level →</div>
                        </Link>

                        {/* Body Composition */}
                        <Link href="/track#body-comp" className="group text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="text-xl">💪</span>
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider group-hover:text-emerald-400 transition">Body Composition</span>
                                <InfoTooltip text="Tracks positive body composition changes that may not show up on the scale — like losing inches, gaining muscle, or dropping body fat %. Compares your earliest and latest measurements to score progress toward your goals. Positive = improving, negative = regressing." size={14} />
                            </div>
                            <div className={`text-4xl font-black italic ${physiquePoints.color}`}>
                                {physiquePoints.score > 0 ? '+' : ''}{physiquePoints.score}
                            </div>
                            {(physiquePoints.leanMassDelta !== undefined || physiquePoints.fatPctDelta !== undefined) && (
                                <div className="flex gap-3 justify-center mt-1">
                                    {physiquePoints.leanMassDelta !== undefined && (
                                        <span className={`text-[10px] font-bold ${physiquePoints.leanMassDelta > 0 ? 'text-emerald-400' : physiquePoints.leanMassDelta < 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                                            {physiquePoints.leanMassDelta > 0 ? '+' : ''}{physiquePoints.leanMassDelta} lbs muscle
                                        </span>
                                    )}
                                    {physiquePoints.fatPctDelta !== undefined && (
                                        <span className={`text-[10px] font-bold ${physiquePoints.fatPctDelta < 0 ? 'text-emerald-400' : physiquePoints.fatPctDelta > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                                            {physiquePoints.fatPctDelta > 0 ? '+' : ''}{physiquePoints.fatPctDelta}% body fat
                                        </span>
                                    )}
                                </div>
                            )}
                            <div className="text-[10px] text-emerald-500/70 group-hover:text-emerald-400 mt-1 transition">Log body comp to track trends →</div>
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
