"use client";

import { useState, useEffect, useMemo } from 'react';
import DailyQuest from './DailyQuest';
import LevelUpOverlay from './LevelUpOverlay';
import CareerXpBar from './profile/CareerXpBar';
import ProgressMetrics from './ProgressMetrics';
import BodyCompSummary from './BodyCompSummary';
import BodyCompositionModal from './BodyCompositionModal';
import { getHabitProgress } from '../services/api';
import { BodyCompositionService } from '../services/BodyCompositionService';
import type { UserStats, UserProfileData } from '@/types';
import WeeklyReview from './WeeklyReview';
import { calculatePhysiquePoints } from '@/utils/physiquePoints';
import YesterdayRetroModal from './YesterdayRetroModal';


interface TrackPageProps {
    userId: string;
    bodyweight: number;
    initialProfile?: UserProfileData | null;
    initialStats?: UserStats | null;
    onLogComplete?: () => void;
}

export default function TrackPage({ userId, bodyweight, initialProfile, initialStats, onLogComplete }: TrackPageProps) {

    // Date navigation state
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedDateTs, setSelectedDateTs] = useState<number>(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Math.floor(today.getTime() / 1000);
    });

    // Update timestamp when date changes
    useEffect(() => {
        const dateAtMidnight = new Date(selectedDate);
        dateAtMidnight.setHours(0, 0, 0, 0);
        setSelectedDateTs(Math.floor(dateAtMidnight.getTime() / 1000));
    }, [selectedDate]);

    // Date navigation handlers
    const goToPreviousDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() - 1);
        setSelectedDate(newDate);
    };

    const goToNextDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + 1);
        setSelectedDate(newDate);
    };

    const goToToday = () => {
        setSelectedDate(new Date());
    };

    const isToday = useMemo(() => {
        const today = new Date();
        return selectedDate.toDateString() === today.toDateString();
    }, [selectedDate]);

    const isFuture = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selected = new Date(selectedDate);
        selected.setHours(0, 0, 0, 0);
        return selected > today;
    }, [selectedDate]);

    // Keyboard shortcuts for date navigation
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Only handle if not typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goToPreviousDay();
            } else if (e.key === 'ArrowRight' && !isFuture) {
                e.preventDefault();
                goToNextDay();
            } else if (e.key === 't' || e.key === 'T') {
                e.preventDefault();
                goToToday();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [selectedDate, isFuture]);

    // --- STATE ---
    const [currentLevel, setCurrentLevel] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('cached_player_level');
            return cached ? parseInt(cached, 10) : 0;
        }
        return 0;
    });
    const [showLevelUp, setShowLevelUp] = useState<number | null>(null);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [bodyCompHistory, setBodyCompHistory] = useState<any[]>([]);
    const [showBodyCompModal, setShowBodyCompModal] = useState(false);

    // Challenges
    // const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
    // const [showChallengeModal, setShowChallengeModal] = useState(false);

    // 🟢 CHANGED: We now receive stats directly from the Server Component via page.tsx
    // The Celebration logic remains client-side to pop the modal only on actual increases.
    useEffect(() => {
        if (!initialStats) return;

        const newLevel = initialStats.player_level || 0;

        if (currentLevel > 0 && newLevel > currentLevel) {
            setShowLevelUp(newLevel);
        }

        setCurrentLevel(newLevel);
        localStorage.setItem('cached_player_level', newLevel.toString());
    }, [initialStats]);

    // Load body composition history
    useEffect(() => {
        if (userId) {
            BodyCompositionService.getHistory(userId).then(setBodyCompHistory);
        }
    }, [userId]);

    // Calculate refactor score
    const physiquePoints = useMemo(() => {
        return calculatePhysiquePoints(bodyCompHistory, initialProfile?.body_composition_goals || {});
    }, [bodyCompHistory, initialProfile]);

    // --- RETRO CHECK LOGIC ---
    const [retroMissing, setRetroMissing] = useState<string[]>([]);
    const [showRetro, setShowRetro] = useState(false);
    const [yesterdayTs, setYesterdayTs] = useState(0);

    // Note: checkRetro is defined but not called (commented out in useEffect)
    const _checkRetro = async () => {
        if (!userId) return;

        // 1. Calculate Yesterday Midnight (Start of Day) - CORRECTED
        const now = new Date();
        const yMidnight = new Date(now);
        yMidnight.setDate(now.getDate() - 1);
        yMidnight.setHours(0, 0, 0, 0);
        const yMidnightTs = Math.floor(yMidnight.getTime() / 1000);

        setYesterdayTs(yMidnightTs);

        // 2. Check LocalStorage: Did we already check today?
        const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
        const lastChecked = localStorage.getItem(`retro_checked_${userId}`);

        if (lastChecked === todayStr) {
            return;
        }

        // 3. Fetch Yesterday's Habits from Backend
        // yMidnightTs already calculated above

        try {
            const progress = await getHabitProgress(userId, yMidnightTs);
            const totals = progress.totals || {};

            const missing = [];

            // Check No Alcohol
            const hasNoAlc = totals['habit_no_alcohol'] > 0 || totals['no_alcohol'] > 0 || totals['habit_no_vice'] > 0;
            if (!hasNoAlc) missing.push('habit_no_alcohol');

            // Check Steps
            const hasSteps = totals['habit_steps'] > 0 || totals['steps'] > 0 || totals['habit_daily_steps'] > 0;
            if (!hasSteps) missing.push('habit_steps');

            setRetroMissing(missing);
            setShowRetro(true);
            // localStorage set in onClose of modal

        } catch (e) {
            console.error("Retro check failed", e);
        }
    };
    void _checkRetro;
    useEffect(() => {
        // checkRetro(); // DISABLED per request to avoid prod loop
    }, [userId]);

    // --- WEEKLY REVIEW LOGIC ---
    const [showReview, setShowReview] = useState(false);

    useEffect(() => {
        const now = new Date();
        const isSunday = now.getDay() === 0;
        const lastReviewDate = localStorage.getItem(`weekly_review_${userId}`);
        const todayStr = now.toLocaleDateString();

        if (isSunday && lastReviewDate !== todayStr) {
            // It's Sunday and we haven't done the review today
            setShowReview(true);
        }

        // Force Review Check (from Settings)
        const forceReview = localStorage.getItem('force_weekly_review');
        if (forceReview === 'true') {
            setShowReview(true);
            localStorage.removeItem('force_weekly_review');
        }
    }, [userId]);

    const handleReviewClose = () => {
        setShowReview(false);
        const todayStr = new Date().toLocaleDateString();
        localStorage.setItem(`weekly_review_${userId}`, todayStr);
    };

    // --- SPRINT REVIEW WIZARD LOGIC ---
    // const [showSprintWizard, setShowSprintWizard] = useState(false);
    // const [sprintStatus, setSprintStatus] = useState<'due' | 'complete'>('due');

    // const checkSprintStatus = () => {
    //     // Check if we already did it today (or recently)
    //     // For MVP, simplistic check: LocalStorage key unique to Week? 
    //     // Or actually we can just check if we did it *today* or this week.
    //     // Let's rely on localStorage key "sprint_review_<User>" holding the DATE.
    //     // If date is NOT today, it shows Due?
    //     // Actually, user standard is ONCE A WEEK.
    //     // Let's mimic weekly review: If Sunday? 
    //     // User request: "Given it is a new week ... then prominent card visible".
    //     // Let's stick to the "Weekly Review" logic: If Sunday -> Trigger.
    //     // But user might want to do it manually anytime?
    //     // Let's say: If it hasn't been done in the last 7 days? 
    //     // Or simpler: If "sprint_review_last_date" is older than 6 days?
    //
    //     const lastDate = localStorage.getItem(`sprint_review_${userId}`);
    //     if (!lastDate) {
    //         setSprintStatus('due');
    //         return;
    //     }
    //
    //     const diff = new Date().getTime() - new Date(lastDate).getTime();
    //     const days = diff / (1000 * 3600 * 24);
    //
    //     if (days >= 6) { // Almost a week
    //         setSprintStatus('due');
    //     } else {
    //         setSprintStatus('complete');
    //     }
    // };
    //
    // useEffect(() => {
    //     checkSprintStatus();
    // }, [userId]);

    // const handleSprintComplete = () => {
    //     checkSprintStatus();
    //     onLogComplete(); // Refresh everything
    // };

    return (
        <div className="max-w-3xl mx-auto animate-fade-in-up flex flex-col gap-8 relative pb-32">

            {/* 🟢 YESTERDAY RETRO MODAL */}
            {showRetro && (
                <YesterdayRetroModal
                    userId={userId}
                    bodyweight={bodyweight}
                    yesterdayTs={yesterdayTs}
                    missingHabits={retroMissing}
                    onClose={() => {
                        setShowRetro(false);
                        const todayStr = new Date().toLocaleDateString('en-CA');
                        localStorage.setItem(`retro_checked_${userId}`, todayStr);
                        onLogComplete?.(); // Refresh stats/quests
                    }}
                />
            )}

            {/* 🟢 WEEKLY REVIEW MODAL */}
            {showReview && (
                <WeeklyReview
                    userId={userId}
                    onClose={handleReviewClose}
                />
            )}

            {/* 🟢 CHALLENGE BUILDER MODAL */}
            {/* <ChallengeBuilderModal
                isOpen={showChallengeModal}
                onClose={() => setShowChallengeModal(false)}
                userId={userId}
                onChallengeCreated={fetchChallenge}
            /> */}

            {/* 🟢 SPRINT REVIEW WIZARD */}
            {/* {showSprintWizard && (
                <SprintReviewWizard
                    userId={userId}
                    onClose={() => setShowSprintWizard(false)}
                    onComplete={handleSprintComplete}
                />
            )} */}

            {/* 🟢 DATE NAVIGATION */}
            <div className="flex items-center justify-between px-2 py-2">
                <button
                    onClick={goToPreviousDay}
                    className="p-2 text-zinc-400 hover:text-white transition"
                >
                    ←
                </button>
                <button
                    onClick={isToday ? undefined : goToToday}
                    className={`text-center ${!isToday ? 'active:opacity-70' : ''}`}
                >
                    <span className="text-sm font-black text-white">
                        {isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    {!isToday && (
                        <span className="block text-[10px] text-orange-500 font-bold">Tap for today</span>
                    )}
                </button>
                <button
                    onClick={goToNextDay}
                    disabled={isFuture}
                    className={`p-2 transition ${isFuture ? 'text-zinc-700' : 'text-zinc-400 hover:text-white'}`}
                >
                    →
                </button>
            </div>

            {/* 🟢 PROGRESS METRICS */}
            <div id="expertise">
            <ProgressMetrics 
                stats={initialStats}
                profile={initialProfile}
                bodyCompHistory={bodyCompHistory}
            />
            </div>

            {/* 🟢 LEVEL UP OVERLAY - ALWAYS VISIBLE ON TOP */}
            {showLevelUp && (
                <LevelUpOverlay
                    level={showLevelUp}
                    onClose={() => setShowLevelUp(null)}
                />
            )}

            {/* 🟢 DAILY QUEST (NUTRITION & HABITS) */}
            <div className="mb-0">
                <DailyQuest
                    userId={userId}
                    bodyweight={bodyweight}
                    stats={initialStats || null}
                    initialProfile={initialProfile || null}
                    targetDateTs={selectedDateTs}
                    onXpEarned={() => {
                        onLogComplete?.();
                        // Reload body comp history after logging
                        if (userId) {
                            BodyCompositionService.getHistory(userId).then(setBodyCompHistory);
                        }
                    }}
                    activeChallenge={null /* activeChallenge */}
                    onStartChallenge={() => { } /* setShowChallengeModal(true) */}
                    onChallengeUpdate={() => { } /* fetchChallenge */}
                />
            </div>

            {/* 🟢 BODY COMPOSITION SUMMARY */}
            <div id="body-comp">
            <BodyCompSummary 
                profile={initialProfile}
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

            {/* SPACER FOR MOBILE NAV */}
            <div className="h-40 md:h-0 w-full shrink-0" />

        </div>
    );
}
