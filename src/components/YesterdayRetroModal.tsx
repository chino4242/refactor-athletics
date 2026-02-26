"use client";

import { AlertCircle } from 'lucide-react';
import DailyQuest from './DailyQuest';

interface YesterdayRetroModalProps {
    userId: string;
    bodyweight: number;
    yesterdayTs: number; // Noon or Midnight of yesterday
    missingHabits: string[]; // Keep for prop compatibility but unused if we show full quest
    onClose: () => void;
}

export default function YesterdayRetroModal({ userId, bodyweight, yesterdayTs, onClose }: YesterdayRetroModalProps) {

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-zinc-950 border border-zinc-700 rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-zinc-900 p-6 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-zinc-800 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-500/20 rounded-xl text-orange-500 shrink-0">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-wide">Finalize Yesterday</h2>
                            <p className="text-sm text-zinc-400 mt-1">
                                Did you miss logging anything? This is your only chance to update yesterday's quest.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-wider py-3 px-8 rounded-xl transition shadow-lg shrink-0"
                    >
                        Finalize & Close
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-2 md:p-6 overflow-y-auto">
                    <DailyQuest
                        userId={userId}
                        bodyweight={bodyweight}
                        onXpEarned={() => { }} // No need to update parent XP for yesterday's changes immediately
                        targetDateTs={yesterdayTs} // 🟢 Back-date mode
                        stats={null}
                        activeChallenge={null}
                        onStartChallenge={() => { }}
                        onChallengeUpdate={() => { }}
                    />
                </div>
            </div>
        </div>
    );
}
