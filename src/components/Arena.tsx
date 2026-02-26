"use client";

import { useState, useCallback, useEffect } from 'react';
import { getActiveDuels, getDuelHistory, type DuelResponse } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext'; // 👈 Imported
import ChallengeModal from './arena/ChallengeModal';
import ActiveDuelCard from './arena/ActiveDuelCard';
import DuelHistoryCard from './arena/DuelHistoryCard';
import DuelVictoryModal from './arena/DuelVictoryModal';
import { Swords, History } from 'lucide-react';

interface ArenaProps {
    userId: string;
}

export default function Arena({ userId }: ArenaProps) {
    const toast = useToast();
    const { currentTheme } = useTheme();
    const [isMounted, setIsMounted] = useState(false);
    const [view, setView] = useState<'active' | 'history'>('active');

    // Wait for client-side hydration
    useEffect(() => {
        setIsMounted(true);
    }, []);
    const [activeDuels, setActiveDuels] = useState<DuelResponse[]>([]);
    const [historyDuels, setHistoryDuels] = useState<DuelResponse[]>([]);
    const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
    const [victoryDuel, setVictoryDuel] = useState<DuelResponse | null>(null);

    const loadDuels = useCallback(() => {
        if (userId) {
            getActiveDuels(userId).then(setActiveDuels);
            getDuelHistory(userId).then(setHistoryDuels);
        }
    }, [userId]);

    useEffect(() => {
        loadDuels();
    }, [loadDuels]);

    return (
        <div className="w-full max-w-4xl mx-auto animate-fade-in-up space-y-8 p-4 md:p-0">

            {/* 🟢 THEME BANNER (Reused) */}
            <div className="w-full relative bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
                {isMounted ? (
                    <img
                        src={`/themes/${currentTheme}/banner.png`}
                        alt="Theme Banner"
                        className="w-full h-auto block opacity-80"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-full h-48 md:h-96 bg-zinc-900 animate-pulse" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>

                {/* Overlay Text for Arena */}
                <div className="absolute bottom-4 left-6">
                    <h1 className="text-3xl font-black italic uppercase text-white drop-shadow-md tracking-tighter">
                        The Arena
                    </h1>
                </div>
            </div>

            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex items-center gap-4 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
                    <button
                        onClick={() => setView('active')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${view === 'active' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                    >
                        <Swords size={14} /> Active Battles
                    </button>
                    <button
                        onClick={() => setView('history')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${view === 'history' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                    >
                        <History size={14} /> History
                    </button>
                </div>

                <button
                    onClick={() => setIsChallengeModalOpen(true)}
                    className="flex items-center gap-2 bg-red-900/40 hover:bg-red-900/60 border border-red-900 text-red-200 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)]"
                >
                    <Swords size={16} /> Create Challenge
                </button>
            </div>

            {/* CONTENT */}
            <div className="grid grid-cols-1 gap-4">
                {view === 'active' ? (
                    activeDuels.length === 0 ? (
                        <div className="p-12 border-2 border-dashed border-zinc-800 rounded-2xl text-center">
                            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                ⚔️
                            </div>
                            <p className="text-zinc-500 font-bold uppercase tracking-wide">No Active Battles</p>
                            <p className="text-zinc-600 text-xs mt-1 max-w-xs mx-auto">
                                The arena is empty. Challenge a rival to a duel and prove your strength.
                            </p>
                            <button
                                onClick={() => setIsChallengeModalOpen(true)}
                                className="mt-6 text-red-400 hover:text-red-300 text-xs underline underline-offset-4"
                            >
                                Initiate a Duel
                            </button>
                        </div>
                    ) : (
                        activeDuels.map(d => (
                            <ActiveDuelCard
                                key={d.id}
                                duel={d}
                                currentUserId={userId}
                                onRefresh={loadDuels}
                                onShowVictory={setVictoryDuel}
                            />
                        ))
                    )
                ) : (
                    // HISTORY VIEW
                    historyDuels.length === 0 ? (
                        <div className="p-12 border-2 border-dashed border-zinc-800 rounded-2xl text-center">
                            <p className="text-zinc-500 font-bold uppercase tracking-wide">No History Yet</p>
                        </div>
                    ) : (
                        historyDuels.map(d => (
                            <DuelHistoryCard
                                key={d.id}
                                duel={d}
                                currentUserId={userId}
                            />
                        ))
                    )
                )}
            </div>

            {/* MODALS */}
            <ChallengeModal
                isOpen={isChallengeModalOpen}
                challengerId={userId}
                onClose={() => setIsChallengeModalOpen(false)}
                onChallengeCreated={() => { loadDuels(); toast.success("Link Created!"); }}
            />

            {victoryDuel && (
                <DuelVictoryModal
                    duel={victoryDuel}
                    currentUserId={userId}
                    onClose={() => setVictoryDuel(null)}
                />
            )}
        </div>
    );
}
