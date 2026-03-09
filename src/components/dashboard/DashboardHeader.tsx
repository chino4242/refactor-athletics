'use client';

import { useState, useEffect } from 'react';
import type { UserStats } from '@/types';
import { Trophy, Zap } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/data/themes';

interface DashboardHeaderProps {
    stats: UserStats | null;
    userId: string;
}

export default function DashboardHeader({ stats }: DashboardHeaderProps) {
    const [mounted, setMounted] = useState(false);
    const { currentTheme } = useTheme();
    const theme = THEMES[currentTheme] || THEMES['athlete'];
    const progressGradient = theme.progressGradient || 'from-orange-600 to-red-600';
    
    useEffect(() => {
        setMounted(true);
    }, []);
    
    const powerLevel = stats?.power_level || 0;
    const totalXp = stats?.total_career_xp || stats?.total_xp || 0;
    const playerLevel = Math.floor(totalXp / 1000) + 1;
    const xpProgress = totalXp % 1000;
    const xpPercent = (xpProgress / 1000) * 100;

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
                    {/* Power Level */}
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{theme.emoji}</span>
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Power Level</span>
                        </div>
                        <div className={`text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r ${progressGradient}`}>
                            {powerLevel.toLocaleString()}
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
