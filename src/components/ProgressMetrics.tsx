"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { calculatePhysiquePoints } from '@/utils/physiquePoints';
import InfoTooltip from '@/components/common/InfoTooltip';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/data/themes';

interface ProgressMetricsProps {
    stats: {
        player_level?: number;
        total_career_xp?: number;
        power_level?: number;
        level_progress_percent?: number;
        xp_to_next_level?: number;
        max_expertise?: number;
    } | null;
    profile: {
        bodyweight?: number;
        body_composition_goals?: Record<string, string>;
        measurement_mode?: string;
    } | null;
    bodyCompHistory: any[];
}

export default function ProgressMetrics({ stats, profile, bodyCompHistory }: ProgressMetricsProps) {
    const { currentTheme } = useTheme();
    const theme = THEMES[currentTheme] || THEMES.dragon;

    const physiquePoints = useMemo(() => {
        return calculatePhysiquePoints(bodyCompHistory, profile?.body_composition_goals || {}, (profile?.measurement_mode as 'tape' | 'scale') || 'tape');
    }, [bodyCompHistory, profile]);

    const powerLevel = stats?.power_level || 0;

    return (
        <div className="mb-6">
            <div className="grid grid-cols-3 gap-4 mb-4">
                {/* Expertise */}
                <Link href="/test" className="group">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{theme.emoji}</span>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider group-hover:text-orange-400 transition">Expertise</span>
                        <InfoTooltip text={`Your best rank level (1-5) across ${stats?.max_expertise ? stats.max_expertise / 5 : 0} ranked exercises. Max = ${stats?.max_expertise || 0}. Log your best result on an exercise to earn your rank!`} size={14} />
                    </div>
                    <div className="text-4xl font-black italic text-orange-500">
                        {powerLevel}<span className="text-lg text-zinc-500">/{stats?.max_expertise || 0}</span>
                    </div>
                    <div className="text-[10px] text-orange-500/70 group-hover:text-orange-400 mt-1 transition">Test an exercise to build Expertise →</div>
                </Link>

                {/* Physique Points */}
                <Link href="#body-comp" className="group">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">💪</span>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider group-hover:text-emerald-400 transition">Physique Points</span>
                        <InfoTooltip text="Tracks body composition changes over time. Compares your earliest and latest measurements (weight, waist, arms, chest, legs) to score progress toward your goals. Positive = improving, negative = regressing." size={14} />
                    </div>
                    <div className={`text-4xl font-black italic ${physiquePoints.color}`}>
                        {physiquePoints.score > 0 ? '+' : ''}{physiquePoints.score}
                    </div>
                    <div className="text-[10px] text-emerald-500/70 group-hover:text-emerald-400 mt-1 transition">Log body comp to track trends →</div>
                </Link>

                {/* Weight */}
                <Link href="#body-comp" className="group">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">⚖️</span>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider group-hover:text-cyan-400 transition">Weight</span>
                    </div>
                    {(() => {
                        const target = profile?.body_composition_goals?.target_weight;
                        const currentWeight = bodyCompHistory[0]?.weight || profile?.bodyweight;
                        if (currentWeight && target) {
                            const targetNum = parseFloat(target);
                            const diff = Math.abs(currentWeight - targetNum).toFixed(1);
                            return (
                                <>
                                    <div className="text-2xl font-black italic text-white">{currentWeight} lbs</div>
                                    <div className="text-xs text-zinc-500">Target: {target} lbs</div>
                                    <div className="text-xs text-zinc-400 font-semibold">{diff} lbs to go</div>
                                </>
                            );
                        }
                        return <div className="text-4xl font-black italic text-zinc-600">—</div>;
                    })()}
                    <div className="text-[10px] text-cyan-500/70 group-hover:text-cyan-400 mt-1 transition">Update weight →</div>
                </Link>
            </div>

            {/* Level / XP */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Level {stats?.player_level || 1}</span>
                    <span className="text-xs text-zinc-500">{stats?.xp_to_next_level || 0} XP to next</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-600 to-red-600 h-2 rounded-full transition-all duration-500" style={{ width: `${stats?.level_progress_percent || 0}%` }} />
                </div>
            </div>
        </div>
    );
}
