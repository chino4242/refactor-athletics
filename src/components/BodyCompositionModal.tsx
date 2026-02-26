"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Scale, TrendingUp } from 'lucide-react';
import MeasurementRow from './MeasurementRow';
import type { UserProfileData } from '@/types';
import { BodyCompositionService } from '../services/BodyCompositionService';
import type { BodyCompositionEntry } from '../services/BodyCompositionService';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface BodyCompositionModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfileData;
    setProfile: (profile: UserProfileData) => void;
    saveProfile: (profile: UserProfileData) => Promise<any>;
    handleLog: (habitId: string, value: number, label: string) => Promise<void>;
    totals: Record<string, number>;
    loading: string | null;
    setLoading: (id: string | null) => void;
    toast: any;
}

export default function BodyCompositionModal({
    isOpen,
    onClose,
    profile,
    setProfile,
    saveProfile,
    handleLog,
    totals: _totals,
    loading,
    setLoading,
    toast
}: BodyCompositionModalProps) {
    const [history, setHistory] = useState<BodyCompositionEntry[]>([]);
    const [refactorScore, setRefactorScore] = useState<number>(0);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Initial Load
    useEffect(() => {
        if (isOpen && profile?.user_id) {
            loadHistory();
        }
    }, [isOpen, profile?.user_id]);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        const data = await BodyCompositionService.getHistory(profile.user_id);
        setHistory(data);
        calculateRefactorScore(data);
        setIsLoadingHistory(false);
    };

    const calculateRefactorScore = (data: BodyCompositionEntry[]) => {
        if (data.length < 2) {
            setRefactorScore(0);
            return;
        }

        const baseline = data[0]; // Earliest
        const current = data[data.length - 1]; // Latest
        let score = 0;

        const goals = profile.body_composition_goals || {};

        // Metrics to track
        const metrics = ['waist', 'arms', 'legs', 'chest', 'shoulders', 'weight'];

        metrics.forEach(metric => {
            const goal = goals[metric];
            const baseVal = baseline[metric];
            const currVal = current[metric];

            if (baseVal !== undefined && currVal !== undefined && goal) {
                const delta = Number(currVal) - Number(baseVal);

                if (goal.toLowerCase() === 'shrink') {
                    // Shrink means we WANT it to go down. 
                    // If delta is -1 (lost 1 inch), we want +1 score.
                    score -= delta;
                } else if (goal.toLowerCase() === 'grow') {
                    // Grow means we WANT it to go up.
                    // If delta is +1, score is +1.
                    score += delta;
                }
                // 'Maintain' adds 0 ideally, or maybe penalizes change? 
                // For now, Maintain = 0 impact.
            }
        });

        // Round to 1 decimal
        setRefactorScore(Math.round(score * 10) / 10);
    };

    const handleMeasurementLog = async (metricId: string, value: number, label: string) => {
        setLoading(metricId);
        try {
            // 1. Log to DB separate table
            const today = new Date().toISOString().split('T')[0];
            await BodyCompositionService.logMeasurements(profile.user_id, today, {
                [metricId]: value
            });

            // 2. Refresh History to update graph/score
            await loadHistory();

            // 3. Keep existing "Habit" log for consistency if needed?
            // User requested separating this. 
            // BUT, the HabitHeatmap relies on 'handleLog'.
            // Let's call BOTH for now to keep the streaks alive.
            // Map metricId to habitId
            const habitMap: Record<string, string> = {
                'weight': 'habit_weigh_in',
                'waist': 'habit_measure_waist',
                'arms': 'habit_measure_arms',
                'legs': 'habit_measure_legs',
                'chest': 'habit_measure_chest',
                'shoulders': 'habit_measure_shoulders'
            };

            const habitId = habitMap[metricId];
            if (habitId) {
                await handleLog(habitId, 1, label);
            }

            // 4. Update Profile Bodyweight if it's weight
            if (metricId === 'weight') {
                const updated = { ...profile, bodyweight: value };
                await saveProfile(updated);
                setProfile(updated); // Optimistic
            }

            toast.success(`Logged ${label}`);

        } catch (e) {
            console.error(e);
            toast.error("Failed to save");
        } finally {
            setLoading(null);
        }
    };

    const getLatestValue = (metric: string) => {
        if (!history.length) return "-";
        const last = history[history.length - 1];
        const val = last[metric];
        return val !== undefined ? String(val) : "-";
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-500/10 p-3 rounded-xl">
                            <Scale className="text-emerald-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic tracking-tighter uppercase text-white">Body Composition</h2>
                            <p className="text-zinc-400 text-xs">Track your evolution.</p>
                        </div>
                    </div>

                    {/* REFACTOR SCORE CARD */}
                    <div className="bg-zinc-800/50 px-4 py-2 rounded-xl border border-zinc-700 flex flex-col items-center">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Refactor Score</span>
                        <div className={`text-2xl font-black ${refactorScore > 0 ? 'text-emerald-400' : refactorScore < 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                            {isLoadingHistory ? '...' : (refactorScore > 0 ? '+' : '') + refactorScore}
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg absolute top-4 right-4"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Two Columns */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {/* LEFT: Inputs */}
                    <div className="w-full md:w-1/3 border-r border-zinc-800 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-zinc-900/30">
                        {/* WEIGHT */}
                        <MeasurementRow
                            label="Weight"
                            currentGoal={profile?.body_composition_goals?.weight || "Maintain"}
                            currentValue={String(profile?.bodyweight || getLatestValue('weight'))}
                            unit="lbs"
                            onGoalChange={async (goal) => {
                                const updated = { ...profile, body_composition_goals: { ...profile.body_composition_goals, weight: goal } };
                                setProfile(updated);
                                await saveProfile(updated);
                                // Recalculate score locally
                                loadHistory();
                            }}
                            onLog={(val) => handleMeasurementLog('weight', val, 'Weigh In')}
                            loading={loading === 'weight'}
                        />

                        {/* BODY PARTS */}
                        {[
                            { id: 'waist', label: 'Waist' },
                            { id: 'arms', label: 'Arms' },
                            { id: 'chest', label: 'Chest' },
                            { id: 'legs', label: 'Legs' },
                            { id: 'shoulders', label: 'Shoulders' },
                        ].map(part => (
                            <MeasurementRow
                                key={part.id}
                                label={part.label}
                                currentGoal={profile?.body_composition_goals?.[part.id] || "Maintain"}
                                currentValue={getLatestValue(part.id)}
                                onGoalChange={async (goal) => {
                                    const updated = { ...profile, body_composition_goals: { ...profile?.body_composition_goals, [part.id]: goal } };
                                    setProfile(updated);
                                    await saveProfile(updated);
                                    loadHistory();
                                }}
                                onLog={(val) => handleMeasurementLog(part.id, val, `${part.label}`)}
                                loading={loading === part.id}
                            />
                        ))}
                    </div>

                    {/* RIGHT: Visuals */}
                    <div className="w-full md:w-2/3 p-6 overflow-y-auto custom-scrollbar bg-black/20">
                        <div className="grid grid-cols-1 gap-6">
                            {/* Simple Graphs Loop */}
                            {['weight', 'waist', 'arms', 'legs', 'chest', 'shoulders'].map(metric => {
                                // Filter data where metric exists
                                const chartData = history.filter(h => h[metric] !== undefined && h[metric] !== null && Number(h[metric]) > 0);
                                if (chartData.length < 2) return null; // Don't show empty charts

                                return (
                                    <div key={metric} className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                                        <h4 className="text-sm font-bold text-zinc-400 uppercase mb-4 tracking-wider">{metric} History</h4>
                                        <div className="h-32 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={chartData}>
                                                    <XAxis
                                                        dataKey="date"
                                                        hide={true}
                                                    />
                                                    <YAxis
                                                        domain={['auto', 'auto']}
                                                        hide={true}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                                                        itemStyle={{ color: '#fff' }}
                                                        labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey={metric}
                                                        stroke="#10b981"
                                                        strokeWidth={2}
                                                        dot={{ r: 2, fill: '#10b981' }}
                                                        activeDot={{ r: 4, fill: '#fff' }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                );
                            })}

                            {history.length < 2 && (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-500 py-20 opacity-50">
                                    <TrendingUp size={48} className="mb-4" />
                                    <p>Log more measurements to see trends & score</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        , document.body);
}
