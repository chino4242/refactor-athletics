'use client';

import { useState, useEffect } from 'react';
import { getUserStats, getActiveDuels } from '@/services/api';
import { getWorkouts } from '@/services/workoutApi';
import type { UserStats, DuelResponse, Workout } from '@/types';
import DashboardHeader from './DashboardHeader';
import DashboardTabs from './DashboardTabs';
import QuickActionButton from './QuickActionButton';
import { Plus } from 'lucide-react';

interface DashboardClientProps {
    userId: string;
}

export default function DashboardClient({ userId }: DashboardClientProps) {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [activeDuels, setActiveDuels] = useState<DuelResponse[]>([]);
    const [programs, setPrograms] = useState<Workout[]>([]);
    const [loading, setLoading] = useState(true);
    const [showQuickActions, setShowQuickActions] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [statsData, duelsData, programsData] = await Promise.all([
                    getUserStats(userId).catch(e => { console.error('Stats error:', e); return null; }),
                    getActiveDuels(userId).catch(e => { console.error('Duels error:', e); return []; }),
                    getWorkouts(userId).catch(e => { console.error('Programs error:', e); return []; }),
                ]);
                console.log('Dashboard loaded:', { statsData, duelsData: duelsData?.length, programsData: programsData?.length });
                setStats(statsData);
                setActiveDuels(duelsData || []);
                setPrograms(programsData || []);
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [userId]);

    const hasActiveDuels = activeDuels.length > 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-zinc-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black pb-24">
            {/* Header with Power Level & Stats */}
            <DashboardHeader stats={stats} userId={userId} />

            {/* Tabbed Content */}
            <DashboardTabs 
                userId={userId}
                stats={stats}
                hasActiveDuels={hasActiveDuels}
                activeDuels={activeDuels}
                programs={programs}
            />

            {/* Floating Action Button */}
            <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-orange-600 to-red-600 rounded-full shadow-lg flex items-center justify-center z-50 hover:scale-110 transition-transform"
                aria-label="Quick Actions"
            >
                <Plus size={24} className="text-white" />
            </button>

            {/* Quick Actions Menu */}
            {showQuickActions && (
                <>
                    <div 
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => setShowQuickActions(false)}
                    />
                    <div className="fixed bottom-24 right-6 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
                        <QuickActionButton 
                            label="Log Macros"
                            href="/track"
                            onClick={() => setShowQuickActions(false)}
                        />
                        <QuickActionButton 
                            label="Log Habits"
                            href="/track"
                            onClick={() => setShowQuickActions(false)}
                        />
                        <QuickActionButton 
                            label="Log Workout"
                            href="/track"
                            onClick={() => setShowQuickActions(false)}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
