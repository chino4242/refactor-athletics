'use client';

import { useState } from 'react';
import type { UserStats, DuelResponse, Workout } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/data/themes';
import TodayTab from './tabs/TodayTab';
import ArenaTab from './tabs/ArenaTab';
import ProgressTab from './tabs/ProgressTab';

interface DashboardTabsProps {
    userId: string;
    stats: UserStats | null;
    hasActiveDuels: boolean;
    activeDuels: DuelResponse[];
    programs: Workout[];
}

export default function DashboardTabs({ userId, stats, hasActiveDuels, activeDuels, programs }: DashboardTabsProps) {
    const { currentTheme } = useTheme();
    const theme = THEMES[currentTheme] || THEMES['athlete'];
    const progressGradient = theme.progressGradient || 'from-orange-600 to-red-600';
    
    // Dynamic tab order based on active duels
    const tabs = hasActiveDuels 
        ? ['Today', 'Arena', 'Progress']
        : ['Today', 'Progress', 'Arena'];

    const [activeTab, setActiveTab] = useState(tabs[0]);

    // Tab icons
    const tabIcons: Record<string, string> = {
        'Today': '📅',
        'Arena': '⚔️',
        'Progress': '📊',
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
                                ? 'text-orange-500'
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
                {activeTab === 'Today' && <TodayTab userId={userId} programs={programs} />}
                {activeTab === 'Arena' && <ArenaTab userId={userId} activeDuels={activeDuels} />}
                {activeTab === 'Progress' && <ProgressTab userId={userId} stats={stats} />}
            </div>
        </div>
    );
}
