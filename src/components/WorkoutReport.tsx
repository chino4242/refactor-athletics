"use client";

import { useState, useEffect, useMemo } from 'react';
import { Trophy, Share2, Copy, Check, X } from 'lucide-react';
import { getSessionWorkouts, getExercisePRs, type SessionWorkout } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/data/themes';

interface Props {
    sessionId: string;
    userId: string;
    onExit: () => void;
}

interface ReportExercise {
    name: string;
    exerciseId: string;
    sets: { weight: number; reps: number }[];
    bestWeight: number;
    est1RM: number;
    totalVolume: number;
    xp: number;
    level: number;
    rankName: string | null;
    isPR: boolean;
    isBlock: boolean;
}

export default function WorkoutReport({ sessionId, userId, onExit }: Props) {
    const [workouts, setWorkouts] = useState<SessionWorkout[]>([]);
    const [prMap, setPrMap] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [showCelebration, setShowCelebration] = useState(true);
    const { currentTheme } = useTheme();
    const theme = THEMES[currentTheme] || THEMES['athlete'];

    const getThemeRankName = (level: number) => {
        const key = `level${level}` as keyof typeof theme.ranks;
        return theme.ranks[key]?.name?.split(': ')[1] || theme.ranks[key]?.name || null;
    };

    useEffect(() => {
        loadReport();
    }, [sessionId]);

    const loadReport = async () => {
        const rows = await getSessionWorkouts(sessionId);
        setWorkouts(rows);

        // Get historical PRs for real exercises (not blocks)
        const exerciseIds = rows
            .filter(r => !r.exercise_id.startsWith('block_'))
            .map(r => r.exercise_id);
        const prs = await getExercisePRs(userId, [...new Set(exerciseIds)]);
        setPrMap(prs);
        setLoading(false);
    };

    const exercises: ReportExercise[] = useMemo(() => {
        return workouts.map(w => {
            const isBlock = w.exercise_id.startsWith('block_');
            const sets = (w.sets || []).filter((s: any) => s.weight !== undefined || s.reps !== undefined);
            const bestWeight = sets.reduce((max: number, s: any) => Math.max(max, s.weight || 0), 0);
            const est1RM = sets.reduce((max: number, s: any) => {
                const e = (s.weight || 0) * (1 + (s.reps || 1) / 30);
                return Math.max(max, e);
            }, 0);
            const totalVolume = sets.reduce((sum: number, s: any) => sum + (s.weight || 0) * (s.reps || 1), 0);

            // PR check: current session's best weight vs all-time best (which includes this session)
            // A PR means this session set a new record — best weight in this session >= all-time best
            const allTimeBest = prMap[w.exercise_id] || 0;
            const isPR = !isBlock && bestWeight > 0 && bestWeight >= allTimeBest;

            // Clean up display name
            const name = isBlock
                ? w.exercise_id.replace('block_', '').replace(/_/g, ' ')
                : w.exercise_id.replace(/_/g, ' ');

            return {
                name,
                exerciseId: w.exercise_id,
                sets,
                bestWeight,
                est1RM: Math.round(est1RM),
                totalVolume,
                xp: w.xp || 0,
                level: w.level || 0,
                rankName: getThemeRankName(w.level || 0),
                isPR,
                isBlock,
            };
        });
    }, [workouts, prMap]);

    const totalXp = exercises.reduce((sum, e) => sum + e.xp, 0);
    const totalVolume = exercises.reduce((sum, e) => sum + e.totalVolume, 0);
    const prCount = exercises.filter(e => e.isPR).length;
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Tread summary: aggregate block entries that look like tread intervals
    const treadExercises = exercises.filter(e => e.isBlock && /tread|engine|run|row/i.test(e.name));
    const treadXp = treadExercises.reduce((s, e) => s + e.xp, 0);
    const treadIntervals = treadExercises.length;
    const liftExercises = exercises.filter(e => !e.isBlock || !/tread|engine|run|row/i.test(e.name));

    const generateShareText = () => {
        const lines = [`🏋️ WORKOUT REPORT — ${dateStr}`, ''];
        for (const ex of exercises) {
            const setCount = ex.sets.length;
            if (ex.isBlock) {
                lines.push(`${ex.name} • +${ex.xp} XP`);
            } else if (ex.bestWeight > 0) {
                const prTag = ex.isPR ? ' 🏆 PR!' : '';
                lines.push(`${ex.name}: ${ex.bestWeight} lbs × ${ex.sets[0]?.reps || '?'} (${setCount} sets)${prTag}`);
                if (ex.est1RM > ex.bestWeight) {
                    lines.push(`  Est. 1RM: ${ex.est1RM} lbs`);
                }
            } else {
                lines.push(`${ex.name}: ${setCount} sets • +${ex.xp} XP`);
            }
        }
        lines.push('');
        if (totalVolume > 0) lines.push(`Total Volume: ${totalVolume.toLocaleString()} lbs`);
        lines.push(`XP Earned: +${totalXp} XP`);
        if (prCount > 0) lines.push(`Personal Records: ${prCount} 🏆`);
        lines.push('');
        lines.push('Refactor Athletics');
        return lines.join('\n');
    };

    const handleShare = async () => {
        const text = generateShareText();
        if (navigator.share) {
            try { await navigator.share({ text }); return; } catch {}
        }
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="w-full max-w-md mx-auto h-[600px] bg-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-800">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500" />
            </div>
        );
    }

    // Celebration screen — shows first, tap to see full report
    if (showCelebration) {
        return (
            <div className="w-full max-w-md mx-auto h-[600px] bg-zinc-900 rounded-3xl overflow-hidden border border-orange-500/30 flex flex-col items-center justify-center text-center px-8 relative" onClick={() => setShowCelebration(false)}>
                {/* Confetti */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {Array.from({ length: 30 }).map((_, i) => (
                        <div key={i} className="absolute w-2 h-2 rounded-full animate-confetti" style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 20}%`,
                            backgroundColor: ['#f97316', '#ef4444', '#eab308', '#22c55e', '#3b82f6'][i % 5],
                            animationDelay: `${Math.random() * 1}s`,
                            animationDuration: `${1.5 + Math.random() * 1.5}s`,
                        }} />
                    ))}
                </div>
                <div className="text-6xl mb-4">🏆</div>
                <h1 className="text-3xl font-black italic text-white uppercase tracking-tight mb-2">Workout Complete</h1>
                <div className="flex items-center gap-4 mt-4">
                    <div className="text-center">
                        <div className="text-2xl font-black text-orange-400">+{totalXp}</div>
                        <div className="text-[9px] text-zinc-500 uppercase">XP Earned</div>
                    </div>
                    {liftExercises.filter(e => !e.isBlock).length > 0 && (
                        <div className="text-center">
                            <div className="text-2xl font-black text-white">{liftExercises.filter(e => !e.isBlock).length}</div>
                            <div className="text-[9px] text-zinc-500 uppercase">Exercises</div>
                        </div>
                    )}
                    {prCount > 0 && (
                        <div className="text-center">
                            <div className="text-2xl font-black text-yellow-400">{prCount}</div>
                            <div className="text-[9px] text-zinc-500 uppercase">PRs</div>
                        </div>
                    )}
                </div>
                <div className="mt-8 text-[10px] text-zinc-600 uppercase tracking-wider animate-pulse">Tap for details</div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto bg-zinc-900 rounded-3xl overflow-hidden border border-orange-500/30 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-b from-orange-600/20 to-transparent p-6 text-center">
                <div className="text-5xl mb-3">🏆</div>
                <h1 className="text-3xl font-black italic text-white uppercase tracking-tight">Workout Complete</h1>
                <p className="text-zinc-400 text-sm mt-1">{dateStr}</p>

                {/* Summary Stats */}
                <div className="flex justify-center gap-6 mt-4">
                    <div className="text-center">
                        <div className="text-orange-500 text-xl font-black">+{totalXp}</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">XP</div>
                    </div>
                    {totalVolume > 0 && (
                        <div className="text-center">
                            <div className="text-white text-xl font-black">{totalVolume.toLocaleString()}</div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">lbs</div>
                        </div>
                    )}
                    {prCount > 0 && (
                        <div className="text-center">
                            <div className="text-yellow-400 text-xl font-black">{prCount}</div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">PRs</div>
                        </div>
                    )}
                    <div className="text-center">
                        <div className="text-white text-xl font-black">{exercises.length}</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Exercises</div>
                    </div>
                </div>
            </div>

            {/* Exercise Breakdown */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {/* Tread Summary */}
                {treadIntervals > 0 && (
                    <div className="rounded-xl p-4 bg-orange-500/10 border border-orange-500/20">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">🏃</span>
                            <span className="text-sm font-bold text-white">Treadmill Summary</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center">
                                <div className="text-lg font-black text-white">{treadIntervals}</div>
                                <div className="text-[10px] text-zinc-500 uppercase font-bold">Intervals</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-black text-yellow-400">+{treadXp}</div>
                                <div className="text-[10px] text-zinc-500 uppercase font-bold">XP</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-black text-orange-400">~{Math.round(treadIntervals * 1.2 * 8)}</div>
                                <div className="text-[10px] text-zinc-500 uppercase font-bold">Est. Cal</div>
                            </div>
                        </div>
                    </div>
                )}
                {liftExercises.map((ex, i) => (
                    <div key={i} className={`rounded-xl p-3 border ${ex.isPR ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-zinc-800/50 border-zinc-800'}`}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white capitalize">{ex.name}</span>
                                    {ex.isPR && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-bold">🏆 PR!</span>}
                                </div>
                                {!ex.isBlock && ex.bestWeight > 0 ? (
                                    <div className="mt-1 space-y-0.5">
                                        <div className="text-xs text-zinc-400">
                                            {ex.sets.map((s: any, j: number) => (
                                                <span key={j}>
                                                    {j > 0 && ' → '}
                                                    {s.weight}×{s.reps}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="text-[10px] text-zinc-600">
                                            Best set: {ex.bestWeight} lbs
                                            {ex.est1RM > ex.bestWeight && ` • Est. 1RM: ${ex.est1RM} lbs`}
                                        </div>
                                    </div>
                                ) : !ex.isBlock ? (
                                    <div className="text-xs text-zinc-500 mt-0.5">{ex.sets.length} sets</div>
                                ) : null}
                            </div>
                            <div className="text-right shrink-0 ml-3">
                                {ex.level > 0 && ex.rankName ? (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                        ex.level >= 5 ? 'bg-orange-500/20 text-orange-400' :
                                        ex.level >= 3 ? 'bg-zinc-700 text-zinc-200' :
                                        'bg-zinc-800 text-zinc-400'
                                    }`}>
                                        {ex.rankName}
                                    </span>
                                ) : (
                                    <span className="text-xs text-zinc-600">+{ex.xp} XP</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-zinc-800 space-y-3">
                <button
                    onClick={handleShare}
                    className="w-full py-3 bg-zinc-800 text-white font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-700 transition flex items-center justify-center gap-2"
                >
                    {copied ? <Check size={18} className="text-emerald-400" /> : <Share2 size={18} />}
                    {copied ? 'Copied to Clipboard!' : 'Share Report'}
                </button>
                <button
                    onClick={onExit}
                    className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-black uppercase tracking-wider rounded-xl hover:from-orange-500 hover:to-red-500 transition-all"
                >
                    Done
                </button>
            </div>
        </div>
    );
}
