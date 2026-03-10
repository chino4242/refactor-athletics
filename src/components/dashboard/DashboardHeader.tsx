'use client';

import { useState, useEffect, useMemo } from 'react';
import type { UserStats } from '@/types';
import { Trophy, Zap } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/data/themes';
import { BodyCompositionService } from '@/services/BodyCompositionService';
import { createClient } from '@/utils/supabase/client';

interface DashboardHeaderProps {
    stats: UserStats | null;
    userId: string;
}

export default function DashboardHeader({ stats, userId }: DashboardHeaderProps) {
    const [mounted, setMounted] = useState(false);
    const [bodyCompHistory, setBodyCompHistory] = useState<any[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);
    const { currentTheme } = useTheme();
    const theme = THEMES[currentTheme] || THEMES['athlete'];
    const progressGradient = theme.progressGradient || 'from-orange-600 to-red-600';
    
    useEffect(() => {
        setMounted(true);
        if (userId) {
            const supabase = createClient();
            Promise.all([
                supabase.from('body_measurements').select('*').eq('user_id', userId).order('timestamp', { ascending: false }).limit(1),
                supabase.from('users').select('body_composition_goals, bodyweight').eq('id', userId).single()
            ]).then(([measurement, profile]) => {
                console.log('Latest measurement:', measurement.data);
                console.log('User profile:', profile.data);
                if (measurement.data && measurement.data.length > 0) {
                    setBodyCompHistory([measurement.data[0]]);
                }
                setUserProfile(profile.data);
            });
        }
    }, [userId]);
    
    const powerLevel = stats?.power_level || 0;
    const totalXp = stats?.total_career_xp || stats?.total_xp || 0;
    const playerLevel = Math.floor(totalXp / 1000) + 1;
    const xpProgress = totalXp % 1000;
    const xpPercent = (xpProgress / 1000) * 100;

    // Calculate refactor score
    const refactorScore = useMemo(() => {
        if (bodyCompHistory.length < 2) return { score: 0, status: '⚖️ No Data', color: 'text-zinc-400' };

        const baseline = bodyCompHistory[0];
        const current = bodyCompHistory[bodyCompHistory.length - 1];
        let score = 0;

        const goals = current.body_composition_goals || {};
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
            color = 'text-orange-400';
        }

        return { score: roundedScore, status, color };
    }, [bodyCompHistory]);

    return (
        <div className="relative">
            {/* Theme Banner Image */}
            {mounted && (
                <div className="relative h-48 overflow-hidden">
                    <img 
                        src={`/themes/${currentTheme}/banner.png`}
                        alt={`${theme.name} banner`}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                </div>
            )}
            
            {/* Header Content */}
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border-b border-zinc-800 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        {/* Power Level */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">{theme.emoji}</span>
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Power Level</span>
                            </div>
                            <div className={`text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r ${progressGradient}`}>
                                {powerLevel.toLocaleString()}
                            </div>
                        </div>

                        {/* Refactor Score */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">⚖️</span>
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Refactor Score</span>
                            </div>
                            <div className={`text-4xl font-black italic ${refactorScore.color}`}>
                                {refactorScore.score > 0 ? '+' : ''}{refactorScore.score}
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">
                                {refactorScore.status}
                            </div>
                        </div>

                        {/* Weight */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">⚖️</span>
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Weight</span>
                            </div>
                            {(() => {
                                const target = userProfile?.body_composition_goals?.target_weight;
                                const currentWeight = bodyCompHistory[0]?.weight || userProfile?.bodyweight;
                                
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
                        </div>
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
                            <span className="text-xs text-zinc-500">
                                {xpProgress} / 1000 XP
                            </span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                            <div 
                                className={`h-full bg-gradient-to-r ${progressGradient} transition-all duration-500`}
                                style={{ width: `${xpPercent}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
