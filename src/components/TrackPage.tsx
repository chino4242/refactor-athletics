"use client";

import { useState, useEffect, useMemo } from 'react';
import DailyQuest from './DailyQuest';
import LevelUpOverlay from './LevelUpOverlay';
import BodyCompSummary from './BodyCompSummary';
import BodyCompositionModal from './BodyCompositionModal';
import { BodyCompositionService } from '../services/BodyCompositionService';
import type { UserStats, UserProfileData } from '@/types';
import { calculatePhysiquePoints } from '@/utils/physiquePoints';

interface TrackPageProps {
    userId: string;
    bodyweight: number;
    initialProfile?: UserProfileData | null;
    initialStats?: UserStats | null;
    onLogComplete?: () => void;
}

export default function TrackPage({ userId, bodyweight, initialProfile, initialStats, onLogComplete }: TrackPageProps) {
    // Date navigation
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedDateTs, setSelectedDateTs] = useState<number>(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Math.floor(today.getTime() / 1000);
    });

    useEffect(() => {
        const d = new Date(selectedDate);
        d.setHours(0, 0, 0, 0);
        setSelectedDateTs(Math.floor(d.getTime() / 1000));
    }, [selectedDate]);

    const goToPreviousDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); };
    const goToNextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); };
    const goToToday = () => setSelectedDate(new Date());

    const isToday = useMemo(() => selectedDate.toDateString() === new Date().toDateString(), [selectedDate]);
    const isFuture = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const sel = new Date(selectedDate); sel.setHours(0, 0, 0, 0);
        return sel > today;
    }, [selectedDate]);

    // Keyboard nav
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'ArrowLeft') { e.preventDefault(); goToPreviousDay(); }
            else if (e.key === 'ArrowRight' && !isFuture) { e.preventDefault(); goToNextDay(); }
            else if (e.key === 't' || e.key === 'T') { e.preventDefault(); goToToday(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedDate, isFuture]);

    // Level up celebration
    const [currentLevel, setCurrentLevel] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('cached_player_level');
            return cached ? parseInt(cached, 10) : 0;
        }
        return 0;
    });
    const [showLevelUp, setShowLevelUp] = useState<number | null>(null);

    useEffect(() => {
        if (!initialStats) return;
        const newLevel = initialStats.player_level || 0;
        if (currentLevel > 0 && newLevel > currentLevel) setShowLevelUp(newLevel);
        setCurrentLevel(newLevel);
        localStorage.setItem('cached_player_level', newLevel.toString());
    }, [initialStats]);

    // Body composition
    const [bodyCompHistory, setBodyCompHistory] = useState<any[]>([]);
    const [showBodyCompModal, setShowBodyCompModal] = useState(false);

    useEffect(() => {
        if (userId) BodyCompositionService.getHistory(userId).then(setBodyCompHistory);
    }, [userId]);

    const physiquePoints = useMemo(() => {
        return calculatePhysiquePoints(bodyCompHistory, initialProfile?.body_composition_goals || {}, initialProfile?.measurement_mode || 'tape');
    }, [bodyCompHistory, initialProfile]);

    return (
        <div className="max-w-3xl mx-auto animate-fade-in-up flex flex-col gap-8 relative pb-32">
            {showLevelUp && <LevelUpOverlay level={showLevelUp} onClose={() => setShowLevelUp(null)} />}

            {/* Date Navigation */}
            <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3">
                <button onClick={goToPreviousDay} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition active:scale-95">
                    <span className="text-lg font-bold">‹</span>
                </button>
                <button onClick={isToday ? undefined : goToToday} className={`text-center px-4 ${!isToday ? 'active:opacity-70' : ''}`}>
                    <span className="text-sm font-black text-white uppercase tracking-wider">
                        {isToday ? '📅 Today' : selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    {!isToday && <span className="block text-[10px] text-orange-500 font-bold mt-0.5">Tap to return to today</span>}
                </button>
                <button onClick={goToNextDay} disabled={isFuture} className={`p-2 rounded-lg transition active:scale-95 ${isFuture ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white'}`}>
                    <span className="text-lg font-bold">›</span>
                </button>
            </div>

            {/* Daily Quests (Nutrition & Habits) */}
            <DailyQuest
                userId={userId}
                bodyweight={bodyweight}
                stats={initialStats || null}
                initialProfile={initialProfile || null}
                targetDateTs={selectedDateTs}
                onXpEarned={() => {
                    onLogComplete?.();
                    if (userId) BodyCompositionService.getHistory(userId).then(setBodyCompHistory);
                }}
                activeChallenge={null}
                onStartChallenge={() => {}}
                onChallengeUpdate={() => {}}
            />

            {/* Body Composition */}
            <div id="body-comp">
                <BodyCompSummary
                    profile={initialProfile || null}
                    bodyCompHistory={bodyCompHistory}
                    physiquePoints={physiquePoints}
                    onOpenModal={() => setShowBodyCompModal(true)}
                />
            </div>

            {showBodyCompModal && initialProfile && (
                <BodyCompositionModal
                    isOpen={showBodyCompModal}
                    profile={initialProfile}
                    setProfile={() => {}}
                    saveProfile={async (p) => { const { saveProfile: sp } = await import('../services/api'); return sp(p); }}
                    handleLog={async () => {}}
                    totals={{}}
                    loading={null}
                    setLoading={() => {}}
                    toast={{ success: () => {}, error: () => {} }}
                    onClose={() => {
                        setShowBodyCompModal(false);
                        BodyCompositionService.getHistory(userId).then(setBodyCompHistory);
                    }}
                />
            )}

            <div className="h-40 md:h-0 w-full shrink-0" />
        </div>
    );
}
