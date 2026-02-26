"use client";

import { useState, useEffect } from 'react';
import DailyQuest from './DailyQuest';
import LevelUpOverlay from './LevelUpOverlay';
import CareerXpBar from './profile/CareerXpBar';
import { getHabitProgress } from '../services/api';
import type { UserStats, UserProfileData } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/data/themes';
import TestingTimer from './TestingTimer';
import WeeklyReview from './WeeklyReview';
import YesterdayRetroModal from './YesterdayRetroModal';


interface TrackPageProps {
    userId: string;
    bodyweight: number;
    initialProfile?: UserProfileData | null;
    initialStats?: UserStats | null;
    onLogComplete?: () => void;
}

export default function TrackPage({ userId, bodyweight, initialProfile, initialStats, onLogComplete }: TrackPageProps) {
    const { currentTheme } = useTheme();

    // --- STATE ---
    // Level Up Tracking & Stats
    // 🟢 CHANGED: Initialize from localStorage to persist across navigation
    const [currentLevel, setCurrentLevel] = useState<number>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('cached_player_level');
            return cached ? parseInt(cached, 10) : 0;
        }
        return 0;
    });
    const [showLevelUp, setShowLevelUp] = useState<number | null>(null);
    const [stats, setStats] = useState<UserStats | null>(null);

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

            {/* 🟢 THEME BANNER */}
            <div className="w-full relative bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
                <img
                    src={`/themes/${currentTheme}/banner.png`}
                    alt="Theme Banner"
                    className="w-full h-auto block object-cover max-h-48 md:max-h-96"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent"></div>

                {/* 🟢 TESTING TIMER OVERLAY */}
                <TestingTimer variant="overlay" />
            </div>

            {/* 🟢 CAREER XP BAR */}
            <CareerXpBar
                stats={initialStats}
                progressGradient={THEMES[currentTheme]?.progressGradient}
            />

            {/* 🟢 LEVEL UP OVERLAY - ALWAYS VISIBLE ON TOP */}
            {showLevelUp && (
                <LevelUpOverlay
                    level={showLevelUp}
                    onClose={() => setShowLevelUp(null)}
                />
            )}

            {/* 🟢 CUSTOM CHALLENGE SECTION - MOVED TO DAILY QUEST */}

            {/* 🟢 SPRINT REVIEW CARD */}
            {/* <SprintReviewCard
                status={sprintStatus}
                onStart={() => setShowSprintWizard(true)}
            // We'd need to persist summaryData to show it in "complete" state if we want stats persistent.
            // For now, "complete" just shows generic success.
            /> */}

            {/* 🟢 DAILY QUEST (NUTRITION & HABITS) */}
            <div className="mb-0">
                <DailyQuest
                    userId={userId}
                    bodyweight={bodyweight}
                    stats={initialStats || null}
                    initialProfile={initialProfile || null}
                    onXpEarned={() => {
                        onLogComplete?.();
                    }}
                    activeChallenge={null /* activeChallenge */}
                    onStartChallenge={() => { } /* setShowChallengeModal(true) */}
                    onChallengeUpdate={() => { } /* fetchChallenge */}
                />
            </div>

            {/* SPACER FOR MOBILE NAV */}
            <div className="h-40 md:h-0 w-full shrink-0" />

        </div>
    );
}
