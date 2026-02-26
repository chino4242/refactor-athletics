"use client";

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ProgressMetricsProps {
    stats: {
        player_level?: number;
        total_xp?: number;
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
        const totalXp = stats?.total_xp || 0;
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

    // Calculate Refactor Score
    const refactorScore = useMemo(() => {
        if (bodyCompHistory.length < 2) return { score: 0, status: 'No Data' };

        const baseline = bodyCompHistory[0];
        const current = bodyCompHistory[bodyCompHistory.length - 1];
        let score = 0;

        const goals = profile?.body_composition_goals || {};
        const metrics = ['waist', 'arms', 'legs', 'chest', 'shoulders', 'weight'];

        metrics.forEach(metric => {
            const goal = goals[metric];
            const baseVal = baseline[metric];
            const currVal = current[metric];

            if (baseVal !== undefined && currVal !== undefined && goal) {
                const delta = Number(currVal) - Number(baseVal);

                if (goal.toLowerCase() === 'shrink') {
                    score -= delta;
                } else if (goal.toLowerCase() === 'grow') {
                    score += delta;
                }
            }
        });

        const roundedScore = Math.round(score * 10) / 10;

        // Determine status
        let status = '⚖️ Maintaining';
        let color = 'text-zinc-400';
        
        if (roundedScore > 10) {
            status = '🔥 Crushing It';
            color = 'text-emerald-400';
        } else if (roundedScore > 5) {
            status = '🎯 On Track';
            color = 'text-emerald-400';
        } else if (roundedScore > 0) {
            status = '✓ Progressing';
            color = 'text-green-400';
        } else if (roundedScore < -5) {
            status = '🚨 Off Track';
            color = 'text-rose-400';
        } else if (roundedScore < 0) {
            status = '⚠️ Slipping';
            color = 'text-yellow-400';
        }

        return { score: roundedScore, status, color };
    }, [bodyCompHistory, profile]);

    return (
        <div className="grid grid-cols-3 gap-3 mb-6">
            {/* LEVEL CARD */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Level</div>
                <div className="text-3xl font-black text-white mb-2">{stats?.player_level || 1}</div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-2">
                    <div 
                        className="bg-gradient-to-r from-orange-600 to-red-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${xpProgress.percentage}%` }}
                    />
                </div>
                <div className="text-[10px] text-zinc-600 font-mono">
                    +{xpProgress.current} / {xpProgress.needed} XP
                </div>
            </div>

            {/* POWER CARD */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Power</div>
                <div className="text-3xl font-black text-orange-500 mb-2">{stats?.power_level?.toLocaleString() || 0}</div>
                <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                    <span className="text-orange-500">⚡</span>
                    <span>Aggregate Score</span>
                </div>
            </div>

            {/* REFACTOR SCORE CARD */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Refactor</div>
                <div className={`text-3xl font-black mb-2 ${refactorScore.color}`}>
                    {refactorScore.score > 0 ? '+' : ''}{refactorScore.score}
                </div>
                <div className="text-[10px] text-zinc-600">
                    {refactorScore.status}
                </div>
            </div>
        </div>
    );
}
