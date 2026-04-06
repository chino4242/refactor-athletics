"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Scale, TrendingUp } from 'lucide-react';
import MeasurementRow from './MeasurementRow';
import type { UserProfileData } from '@/types';
import { BodyCompositionService } from '../services/BodyCompositionService';
import type { BodyCompositionEntry } from '../services/BodyCompositionService';
import { calculatePhysiquePoints } from '@/utils/physiquePoints';
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
    const [physiquePoints, setPhysiquePoints] = useState<number>(0);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [mode, setMode] = useState<'tape' | 'muscle'>(profile.measurement_mode || 'tape');
    const [localProfile, setLocalProfile] = useState(profile);

    useEffect(() => { setLocalProfile(profile); }, [profile]);

    const switchMode = async (newMode: 'tape' | 'muscle') => {
        setMode(newMode);
        const updated = { ...localProfile, measurement_mode: newMode };
        setLocalProfile(updated);
        setProfile(updated);
        await saveProfile(updated);
    };

    // Initial Load
    useEffect(() => {
        if (isOpen && localProfile?.user_id) {
            loadHistory();
        }
    }, [isOpen, localProfile?.user_id]);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        const data = await BodyCompositionService.getHistory(localProfile.user_id);
        setHistory(data);
        const result = calculatePhysiquePoints(data, localProfile.body_composition_goals || {});
        setPhysiquePoints(result.score);
        setIsLoadingHistory(false);
    };

    const handleMeasurementLog = async (metricId: string, value: number, label: string) => {
        setLoading(metricId);
        try {
            // 1. Log to DB separate table
            const today = new Date().toISOString().split('T')[0];
            await BodyCompositionService.logMeasurements(localProfile.user_id, today, {
                [metricId]: value,
                measurement_mode: mode,
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
                const updated = { ...localProfile, bodyweight: value };
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

                    {/* PHYSIQUE POINTS CARD */}
                    <div className="bg-zinc-800/50 px-4 py-2 rounded-xl border border-zinc-700 flex flex-col items-center">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">💪 Physique Points</span>
                        <div className={`text-2xl font-black ${physiquePoints > 0 ? 'text-emerald-400' : physiquePoints < 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                            {isLoadingHistory ? '...' : (physiquePoints > 0 ? '+' : '') + physiquePoints}
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg absolute top-4 right-4"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="flex border-b border-zinc-800 shrink-0">
                    {([['tape', '📏 Tape (inches)'], ['muscle', '💪 Muscle Mass (lbs)']] as const).map(([id, label]) => (
                        <button
                            key={id}
                            onClick={() => switchMode(id)}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all ${mode === id ? 'text-white border-b-2 border-emerald-500 bg-zinc-800/50' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Content - Two Columns */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {/* LEFT: Inputs */}
                    <div className="w-full md:w-1/3 border-r border-zinc-800 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-zinc-900/30">
                        {/* WEIGHT */}
                        <MeasurementRow
                            label="Weight"
                            currentGoal={localProfile?.body_composition_goals?.weight || "Maintain"}
                            currentValue={String(localProfile?.bodyweight || getLatestValue('weight'))}
                            unit="lbs"
                            onGoalChange={async (goal) => {
                                const updated = { ...localProfile, body_composition_goals: { ...localProfile.body_composition_goals, weight: goal } };
                                setLocalProfile(updated);
                                setProfile(updated);
                                await saveProfile(updated);
                                // Recalculate score locally
                                loadHistory();
                            }}
                            onLog={(val) => handleMeasurementLog('weight', val, 'Weigh In')}
                            loading={loading === 'weight'}
                        />
                        {(mode === 'tape' ? [
                            { id: 'waist', label: 'Waist' },
                            { id: 'arms', label: 'Arms' },
                            { id: 'chest', label: 'Chest' },
                            { id: 'legs', label: 'Legs' },
                            { id: 'shoulders', label: 'Shoulders' },
                        ] : [
                            { id: 'left_arm_muscle', label: 'Left Arm' },
                            { id: 'right_arm_muscle', label: 'Right Arm' },
                            { id: 'trunk_muscle', label: 'Trunk' },
                            { id: 'left_leg_muscle', label: 'Left Leg' },
                            { id: 'right_leg_muscle', label: 'Right Leg' },
                        ]).map(part => (
                            <MeasurementRow
                                key={part.id}
                                label={part.label}
                                currentGoal={localProfile?.body_composition_goals?.[part.id] || (mode === 'muscle' ? 'Grow' : part.id === 'waist' ? 'Shrink' : 'Maintain')}
                                currentValue={getLatestValue(part.id)}
                                onGoalChange={async (goal) => {
                                    const updated = { ...localProfile, body_composition_goals: { ...localProfile?.body_composition_goals, [part.id]: goal } };
                                    setLocalProfile(updated);
                                    setProfile(updated);
                                    await saveProfile(updated);
                                    loadHistory();
                                }}
                                onLog={(val) => handleMeasurementLog(part.id, val, `${part.label}`)}
                                loading={loading === part.id}
                                unit={mode === 'muscle' ? 'lbs' : 'in'}
                            />
                        ))}
                    </div>

                    {/* RIGHT: Visuals */}
                    <div className="w-full md:w-2/3 p-6 overflow-y-auto custom-scrollbar bg-black/20">
                        <div className="grid grid-cols-1 gap-6">
                            {/* Simple Graphs Loop */}
                            {(mode === 'tape'
                                ? ['weight', 'waist', 'arms', 'legs', 'chest', 'shoulders']
                                : ['weight', 'left_arm_muscle', 'right_arm_muscle', 'trunk_muscle', 'left_leg_muscle', 'right_leg_muscle']
                            ).map(metric => {
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
