"use client";

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { calculatePhysiquePoints } from '@/utils/physiquePoints';

interface ProgressMetricsProps {
    stats: {
        player_level?: number;
        total_career_xp?: number;
        power_level?: number;
    } | null;
    profile: {
        body_composition_goals?: Record<string, string>;
    } | null;
    bodyCompHistory: Array<{
        date: string;
        weight?: number;
        waist?: number;
        arms?: number;
        chest?: number;
        legs?: number;
        shoulders?: number;
        [key: string]: string | number | undefined;
    }>;
}

export default function ProgressMetrics({ stats, profile, bodyCompHistory }: ProgressMetricsProps) {
    // Calculate XP progress to next level
    const xpProgress = useMemo(() => {
        const totalXp = stats?.total_career_xp || 0;
        const currentLevel = stats?.player_level || 1;
        const xpForCurrentLevel = (currentLevel - 1) * 1000;
        const xpIntoLevel = totalXp - xpForCurrentLevel;
        const xpNeeded = 1000;
        const percentage = Math.min((xpIntoLevel / xpNeeded) * 100, 100);
        
        return {
            current: xpIntoLevel,
            needed: xpNeeded,
            percentage
        };
    }, [stats]);

    // Calculate Physique Points
    const physiquePoints = useMemo(() => {
        return calculatePhysiquePoints(bodyCompHistory, profile?.body_composition_goals || {});
    }, [bodyCompHistory, profile]);

    return (
        <div className="grid grid-cols-3 gap-3 mb-6">
            {/* LEVEL CARD */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2">Level</div>
                <div className="text-3xl font-black text-white mb-2">{stats?.player_level || 1}</div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-2">
                    <div 
                        className="bg-gradient-to-r from-orange-600 to-red-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${xpProgress.percentage}%` }}
                    />
                </div>
                <div className="text-xs text-zinc-600 font-mono">
                    +{xpProgress.current} / {xpProgress.needed} XP
                </div>
            </div>

            {/* EXPERTISE CARD */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2">Expertise</div>
                <div className="text-3xl font-black text-orange-500 mb-2">{stats?.power_level || 0}<span className="text-lg text-zinc-500">/{stats?.max_expertise || 0}</span></div>
                <div className="flex items-center gap-1 text-xs text-zinc-600">
                    <span className="text-orange-500">⚡</span>
                    <span>Aggregate Score</span>
                </div>
            </div>

            {/* PHYSIQUE POINTS CARD */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2">💪 Physique Points</div>
                <div className={`text-3xl font-black mb-2 ${physiquePoints.color}`}>
                    {physiquePoints.score > 0 ? '+' : ''}{physiquePoints.score}
                </div>
                <div className="text-xs text-zinc-600">
                    {physiquePoints.status}
                </div>
            </div>
        </div>
    );
}
