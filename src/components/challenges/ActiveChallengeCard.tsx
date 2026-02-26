"use client";

import { useState, useEffect } from 'react';
import { type Challenge, checkChallengeStatus, cancelChallenge } from '../../services/api';
import { Flame, Snowflake, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface ActiveChallengeCardProps {
    challenge: Challenge;
    userId: string;
    onUpdate: () => void;
}

export default function ActiveChallengeCard({ challenge, userId, onUpdate }: ActiveChallengeCardProps) {
    const toast = useToast();
    const [checking, setChecking] = useState(false);

    // 1. Precise Day Calculation (Midnight to Midnight)
    const start = new Date(challenge.start_date + 'T00:00:00'); // Ensure local midnight or consistent Parse
    const now = new Date();

    // Reset to start of day for accurate day diff
    const startMidnight = new Date(start);
    startMidnight.setHours(0, 0, 0, 0);

    const nowMidnight = new Date(now);
    nowMidnight.setHours(0, 0, 0, 0);

    const diffTime = nowMidnight.getTime() - startMidnight.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const currentDay = diffDays + 1;

    // 2. Auto-Verification Logic
    const todayStr = new Date().toLocaleDateString('en-CA');
    const needsCheck = challenge.last_checked !== todayStr && challenge.status === 'alive';

    useEffect(() => {
        if (needsCheck && !checking) {
            handleCheck(true);
        }
    }, [needsCheck]);

    const handleCheck = async (silent = false) => {
        if (checking) return;
        setChecking(true);
        try {
            const res = await checkChallengeStatus(userId);
            if (!silent) {
                toast.success(res.status === 'alive' ? "Streak Updated!" : "Streak Reset!");
            }
            onUpdate();
        } catch (e) {
            console.error(e);
            if (!silent) toast.error("Failed to update status");
        } finally {
            setChecking(false);
        }
    };

    const handleCancel = async () => {
        if (!window.confirm("Are you sure you want to end this challenge early? It will be marked as cancelled.")) return;

        try {
            await cancelChallenge(userId);
            toast.success("Challenge ended.");
            onUpdate();
        } catch (e: any) {
            console.error("Cancel failed:", e);
            toast.error(e.message || "Failed to cancel challenge");
        }
    }

    const isAlive = challenge.status === 'alive';

    return (
        <div className={`p-6 rounded-2xl border transition-all shadow-lg relative overflow-hidden group ${isAlive
            ? 'bg-gradient-to-br from-zinc-900 via-zinc-900 to-orange-950/30 border-orange-500/20'
            : 'bg-zinc-900 border-red-900/50 opacity-80'
            }`}>

            {/* BACKGROUND GLOW */}
            <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[100px] pointer-events-none ${isAlive ? 'bg-orange-500/20' : 'bg-red-500/10'
                }`}></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Challenge</span>
                        {isAlive && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/30 animate-pulse">LIVE</span>}
                        {!isAlive && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">RESET</span>}
                    </div>
                    <h3 className="text-2xl font-black italic text-white tracking-tighter">{challenge.name}</h3>
                    <p className="text-sm text-zinc-400 font-medium">Day <span className="text-white">{currentDay}</span> of {challenge.duration_days}</p>
                </div>

                <div className="flex flex-col items-end">
                    <div className={`text-4xl font-black italic flex items-center gap-1 ${isAlive ? 'text-orange-500' : 'text-zinc-600'}`}>
                        <span className="text-2xl">{isAlive ? <Flame fill="currentColor" /> : <Snowflake />}</span>
                        {challenge.current_streak}
                    </div>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Day Streak</span>
                </div>
            </div>

            {/* GOALS GRID */}
            <div className="space-y-3 relative z-10">
                {challenge.goals.map((goal, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                        <div className={`w-1.5 h-1.5 rounded-full ${isAlive ? 'bg-orange-500' : 'bg-red-900'}`}></div>
                        <div className="flex-1">
                            <div className="flex justify-between items-baseline">
                                <span className="font-bold text-zinc-300">{goal.label}</span>
                                <span className="text-xs font-mono text-zinc-500">
                                    Target: {goal.target_value} {goal.unit}
                                    {goal.tolerance > 0 && <span className="text-zinc-600"> ±{goal.tolerance}</span>}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ACTION FOOTER */}
            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-4">
                    <span className="text-xs text-zinc-600">
                        Last Checked: {challenge.last_checked || "Never"}
                    </span>

                    {isAlive ? (
                        <button
                            onClick={handleCancel}
                            className="text-[10px] uppercase font-bold text-zinc-600 hover:text-red-500 flex items-center gap-1 transition-colors"
                            title="End Challenge Early"
                        >
                            <XCircle size={12} />
                            Forfeit
                        </button>
                    ) : (
                        <button
                            onClick={handleCancel}
                            className="text-[10px] uppercase font-bold text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors animate-pulse"
                            title="Clear and Start New"
                        >
                            <RotateCcw size={12} />
                            Dismiss & Restart
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {checking && <span className="text-xs text-orange-500 animate-pulse">Syncing...</span>}
                    {!checking && !needsCheck && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500 font-bold uppercase tracking-wider">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            Up to Date
                        </span>
                    )}
                </div>
            </div>

        </div>
    );
}
