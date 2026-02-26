"use client";

import { useState } from 'react';
import { type DuelResponse, acceptChallenge, finalizeDuel, cancelDuel } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { THEMES } from '../../data/themes';
import { Swords, Clock, Trophy, XCircle } from 'lucide-react';

interface Props {
    duel: DuelResponse;
    currentUserId: string;
    onRefresh: () => void;
    onShowVictory: (duel: DuelResponse) => void;
}

export default function ActiveDuelCard({ duel, currentUserId, onRefresh, onShowVictory }: Props) {
    const [loading, setLoading] = useState(false);
    const { currentTheme } = useTheme();
    const progressGradient = THEMES[currentTheme]?.progressGradient || "from-emerald-500 to-emerald-600";

    const isChallenger = duel.challenger_id.toLowerCase() === currentUserId.toLowerCase();

    const myScore = isChallenger ? duel.challenger_score : duel.opponent_score;
    const theirScore = isChallenger ? duel.opponent_score : duel.challenger_score;

    const myTotal = isChallenger ? (duel.challenger_metric_total || 0) : (duel.opponent_metric_total || 0);
    const theirTotal = isChallenger ? (duel.opponent_metric_total || 0) : (duel.challenger_metric_total || 0);

    const isStepsChallenge = duel.included_metrics?.includes('STEPS');
    const metricLabel = isStepsChallenge ? 'Total Steps' : 'Total Value';
    const showMetric = isStepsChallenge || (duel.included_metrics && !duel.included_metrics.includes('ALL'));

    // Max score for bars
    const maxScore = Math.max(myScore, theirScore, 100) * 1.2;
    const myPercent = Math.min((myScore / maxScore) * 100, 100);
    const theirPercent = Math.min((theirScore / maxScore) * 100, 100);

    const delta = myScore - theirScore;
    const timeLeft = Math.max(0, duel.end_at - (Date.now() / 1000));
    const daysLeft = Math.floor(timeLeft / 86400);
    const hoursLeft = Math.floor((timeLeft % 86400) / 3600);

    const handleAccept = async () => {
        setLoading(true);
        try {
            await acceptChallenge(duel.id, currentUserId);
            onRefresh();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async () => {
        if (timeLeft > 0 && !window.confirm("Are you sure you want to end this duel early? Current scores will be final.")) {
            return;
        }

        setLoading(true);
        try {
            const success = await finalizeDuel(duel.id, myScore, theirScore, delta > 0 ? duel.challenger_id : delta < 0 ? duel.opponent_id : null);
            if (success) {
                onShowVictory({ ...duel, status: 'COMPLETED' });
            }
            onRefresh();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!window.confirm("Cancel this challenge link? It will become invalid.")) return;
        setLoading(true);
        try {
            await cancelDuel(duel.id);
            onRefresh();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (duel.status === 'PENDING') {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                        <Clock size={20} className="text-zinc-500" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold uppercase tracking-wide text-sm">Challenge Pending</h3>
                        <p className="text-zinc-500 text-xs">
                            {duel.opponent_id ? `vs ${duel.opponent_id}` : 'Waiting for opponent...'}
                        </p>
                    </div>
                </div>

                {/* If I am NOT the challenger (and viewing pending), I can accept */}
                {!isChallenger && !duel.opponent_id && (
                    <button
                        onClick={handleAccept}
                        disabled={loading}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors"
                    >
                        {loading ? '...' : 'Accept Duel'}
                    </button>
                )}

                {/* If I AM the challenger, I can cancel */}
                {isChallenger && (
                    <button
                        onClick={handleCancel}
                        disabled={loading}
                        className="text-zinc-500 hover:text-red-500 transition-colors"
                        title="Cancel Link"
                    >
                        <XCircle size={20} />
                    </button>
                )}
            </div>
        );
    }

    // ACTIVE OR COMPLETED
    let message = "";
    if (delta > 0) message = `Leading by ${delta} XP`;
    else if (delta < 0) message = `Trailing by ${Math.abs(delta)} XP`;
    else message = "Dead Even";

    return (
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden relative group">
            {/* BACKGROUND GLOW */}
            {delta > 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[50px] rounded-full pointer-events-none"></div>}
            {delta < 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[50px] rounded-full pointer-events-none"></div>}

            <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <Swords size={20} className="text-zinc-500" />
                        <span className="text-zinc-400 font-mono text-xs uppercase tracking-widest">
                            {duel.status === 'COMPLETED' ? 'Duel Finished' : `Ends in ${daysLeft}d ${hoursLeft}h`}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        {/* Show Finalize if time is up OR if I am a participant (Challenger or Opponent) */}
                        {duel.status === 'ACTIVE' && (
                            timeLeft === 0 ||
                            isChallenger ||
                            (duel.opponent_id && duel.opponent_id.toLowerCase() === currentUserId.toLowerCase())
                        ) && (
                                <button
                                    onClick={handleFinalize}
                                    disabled={loading}
                                    className={`text-xs px-3 py-1 rounded border transition-colors ${timeLeft > 0
                                        ? 'text-red-400 border-red-900/50 hover:bg-red-900/20'
                                        : 'text-white border-zinc-700 bg-zinc-800 hover:bg-zinc-700'}`}
                                >
                                    {timeLeft > 0 ? 'End Early' : 'Claim Victory'}
                                </button>
                            )}
                    </div>
                </div>

                {/* Battle Area */}
                <div className="space-y-8">

                    {/* YOU (Challenger or Opponent depending on viewing perspective) */}
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <span className="text-white font-bold text-sm uppercase tracking-wide">
                                    {isChallenger ? (duel.challenger_name || "You") : (duel.opponent_name || "You")}
                                </span>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono uppercase">Lvl {isChallenger ? (duel.challenger_level || 1) : (duel.opponent_level || 1)}</span>
                        </div>
                        <div className="text-right">
                            <span className="font-black text-2xl text-white block leading-none">{myScore} <span className="text-sm text-zinc-500 font-bold">XP</span></span>
                            {showMetric && (
                                <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wide block mt-1">
                                    {myTotal.toLocaleString()} {metricLabel}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="h-4 bg-zinc-800 rounded-full overflow-hidden mb-3 ring-1 ring-zinc-700/50">
                        <div
                            className={`h-full bg-gradient-to-r ${progressGradient} transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.3)] relative`}
                            style={{ width: `${myPercent}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                        </div>
                    </div>

                    {/* MY HISTORY */}
                    <div className="mt-3 bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/50">
                        <p className="text-[10px] uppercase font-bold text-zinc-600 mb-2 flex items-center gap-1">
                            <Clock size={10} /> Recent Activity
                        </p>
                        <div className="space-y-2">
                            {(isChallenger ? duel.challenger_history : duel.opponent_history)?.slice(0, 3).map((h, i) => {
                                // Helper to resolve the raw value robustly
                                let displayValue: string | number | null = h.raw_value ?? null; // Try raw_value first

                                // Fallback: If missing, check 'value' (legacy string)
                                if (displayValue == null && h.value && !isNaN(parseFloat(h.value))) {
                                    displayValue = parseFloat(h.value);
                                }

                                // Fallback: If still missing, and it's 'steps', calculate from XP
                                // Factor: 0.015 XP per step
                                if (displayValue == null && (h.exercise_id === 'steps' || h.exercise_id === 'habit_daily_steps' || (h.rank_name || '').toLowerCase().includes('steps'))) {
                                    if (h.xp) displayValue = Math.round(h.xp / 0.015);
                                }

                                return (
                                    <div key={i} className="flex justify-between items-center text-xs mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-zinc-400 font-bold truncate max-w-[150px]">{h.rank_name || h.exercise_id}</span>

                                            {displayValue != null && (
                                                <span className="text-[10px] text-zinc-500 font-mono block">
                                                    {Number(displayValue).toLocaleString()} {isStepsChallenge ? 'Additional Steps' : (metricLabel || 'Units')}
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-mono text-emerald-500 font-bold">+{h.xp} XP</span>
                                    </div>
                                );
                            }) || <p className="text-[10px] text-zinc-700 italic">No recent activity</p>}
                        </div>
                    </div>
                </div>

                {/* OPPONENT */}
                <div className="relative mt-8">
                    {/* VS Badge */}
                    <div className="absolute left-1/2 -top-4 -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[10px] font-black px-2 py-0.5 rounded-full z-10">
                        VS
                    </div>

                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <span className="text-white font-bold text-sm uppercase tracking-wide">
                                {isChallenger ? (duel.opponent_name || "Waiting...") : (duel.challenger_name || duel.challenger_id)}
                            </span>
                        </div>
                        <span className="text-[10px] text-zinc-600 font-mono uppercase">
                            Lvl {isChallenger ? (duel.opponent_level || 1) : (duel.challenger_level || 1)}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="font-black text-2xl text-white block leading-none">{theirScore} <span className="text-sm text-zinc-500 font-bold">XP</span></span>
                        {showMetric && (
                            <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wide block mt-1">
                                {theirTotal.toLocaleString()} {metricLabel}
                            </span>
                        )}
                    </div>
                    <div className="h-4 bg-zinc-800 rounded-full overflow-hidden mb-3 ring-1 ring-zinc-700/50">
                        <div
                            className="h-full bg-red-900/80 transition-all duration-1000 ease-out relative"
                            style={{ width: `${theirPercent}%` }}
                        >
                        </div>
                    </div>

                    {/* THEIR HISTORY */}
                    <div className="mt-3 bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/50">
                        <p className="text-[10px] uppercase font-bold text-zinc-600 mb-2 flex items-center gap-1">
                            <Clock size={10} /> Recent Activity
                        </p>
                        <div className="space-y-2">
                            {(isChallenger ? duel.opponent_history : duel.challenger_history)?.slice(0, 3).map((h, i) => {
                                // Helper to resolve the raw value robustly
                                let displayValue: string | number | null = h.raw_value ?? null; // Try raw_value first

                                // Fallback: If missing, check 'value' (legacy string)
                                if (displayValue == null && h.value && !isNaN(parseFloat(h.value))) {
                                    displayValue = parseFloat(h.value);
                                }

                                // Fallback: If still missing, and it's 'steps', calculate from XP
                                // Factor: 0.015 XP per step
                                if (displayValue == null && (h.exercise_id === 'steps' || h.exercise_id === 'habit_daily_steps' || (h.rank_name || '').toLowerCase().includes('steps'))) {
                                    if (h.xp) displayValue = Math.round(h.xp / 0.015);
                                }

                                return (
                                    <div key={i} className="flex justify-between items-center text-xs mb-2">
                                        <div className="flex flex-col">
                                            <span className="text-zinc-400 font-bold truncate max-w-[150px]">{h.rank_name || h.exercise_id}</span>

                                            {displayValue != null && (
                                                <span className="text-[10px] text-zinc-500 font-mono block">
                                                    {Number(displayValue).toLocaleString()} {isStepsChallenge ? 'Additional Steps' : (metricLabel || 'Units')}
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-mono text-red-900/70 font-bold ml-2">+{h.xp} XP</span>
                                    </div>
                                );
                            }) || <p className="text-[10px] text-zinc-700 italic">No recent activity</p>}
                        </div>
                    </div>
                </div>

                {/* Footer / Taunt */}
                <div className="mt-6 pt-4 border-t border-zinc-800/50 flex justify-between items-center">
                    <div className={`text-xs font-black uppercase tracking-wider ${delta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {message}
                    </div>

                    {duel.status === 'COMPLETED' && (
                        <div className="flex items-center gap-2 text-yellow-500">
                            <Trophy size={16} />
                            <span className="text-xs font-bold uppercase">{duel.winner_id === currentUserId ? 'Victory' : 'Defeat'}</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
