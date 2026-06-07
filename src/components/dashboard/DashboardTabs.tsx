'use client';

import { useState } from 'react';
import type { UserStats, DuelResponse, Workout } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { useExperienceMode } from '@/context/ExperienceModeContext';
import { THEMES } from '@/data/themes';
import TodayTab from './tabs/TodayTab';
import ArenaTab from './tabs/ArenaTab';
import StatsTab from './tabs/StatsTab';
import { LockedFeatureOverlay } from '../StarterQuestCard';

interface DashboardTabsProps {
    userId: string;
    stats: UserStats | null;
    hasActiveDuels: boolean;
    activeDuels: DuelResponse[];
    programs: Workout[];
    starterQuestProgress?: any[];
}

export default function DashboardTabs({ userId, stats, hasActiveDuels, activeDuels, programs, starterQuestProgress }: DashboardTabsProps) {
    const { currentTheme } = useTheme();
    const { isClassic } = useExperienceMode();
    const theme = THEMES[currentTheme] || THEMES['athlete'];
    const progressGradient = theme.progressGradient || 'from-orange-600 to-red-600';
    
    // Dynamic tab order based on active duels
    const tabs = hasActiveDuels 
        ? ['Today', 'Arena', 'Stats']
        : ['Today', 'Stats', 'Arena'];

    const [activeTab, setActiveTab] = useState(tabs[0]);

    // Tab icons
    const tabIcons: Record<string, string> = {
        'Today': '📅',
        'Arena': isClassic ? '👥' : '⚔️',
        'Stats': '📊',
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Tab Navigation */}
            <div className="flex border-b border-zinc-800 px-4 sticky top-0 bg-black z-10">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors relative ${
                            activeTab === tab
                                ? 'text-white'
                                : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        <span className="mr-2">{tabIcons[tab]}</span>
                        {tab}
                        {activeTab === tab && (
                            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${progressGradient}`} />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="p-4">
                <div key={activeTab} className="animate-fade-in">
                    {activeTab === 'Today' && <TodayTab userId={userId} programs={programs} stats={stats} />}
                    {activeTab === 'Arena' && <ArenaTab userId={userId} activeDuels={activeDuels} />}
                    {activeTab === 'Stats' && <StatsTab userId={userId} stats={stats} />}
                </div>
            </div>
        </div>
    );
}
