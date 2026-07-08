"use client";

import { useState, useEffect } from 'react';
import { getToday } from '@/utils/date';
import { createPortal } from 'react-dom';
import { X, Scale, TrendingUp, Trash2 } from 'lucide-react';
import MeasurementRow from './MeasurementRow';
import ScreenshotUploader from './ScreenshotUploader';
import type { UserProfileData } from '@/types';
import { BodyCompositionService } from '../services/BodyCompositionService';
import type { BodyCompositionEntry } from '../services/BodyCompositionService';
import { calculatePhysiquePoints } from '@/utils/physiquePoints';
import { deleteBodyMeasurementAction, deleteAllBodyMeasurementsAction } from '@/app/actions';
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
    const [localProfile, setLocalProfile] = useState(profile);
    const [confirmReset, setConfirmReset] = useState(false);
    const [scaleInputs, setScaleInputs] = useState<Record<string, string>>({});
    const mode = localProfile.measurement_mode || 'tape';

    useEffect(() => { setLocalProfile(profile); }, [profile]);

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
        const result = calculatePhysiquePoints(data, localProfile.body_composition_goals || {}, mode);
        setPhysiquePoints(result.score);
        setIsLoadingHistory(false);
    };

    const handleMeasurementLog = async (metricId: string, value: number, label: string) => {
        setLoading(metricId);
        try {
            // 1. Log to DB separate table
            const today = getToday();
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
                            <p className="text-zinc-400 text-sm">Track your evolution.</p>
                        </div>
                    </div>

                    {/* BODY COMPOSITION CARD */}
                    <div className="bg-zinc-800/50 px-4 py-2 rounded-xl border border-zinc-700 flex flex-col items-center">
                        <span className="text-xs text-zinc-400 uppercase tracking-widest font-bold">💪 Body Composition</span>
                        <div className={`text-2xl font-black ${physiquePoints > 0 ? 'text-emerald-400' : physiquePoints < 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                            {isLoadingHistory ? '...' : (physiquePoints > 0 ? '+' : '') + physiquePoints}
                        </div>
                    </div>

                    {/* MODE TOGGLE */}
                    <div className="flex bg-zinc-800 rounded-lg p-0.5 border border-zinc-700">
                        <button
                            onClick={async () => {
                                const updated = { ...localProfile, measurement_mode: 'tape' as const };
                                setLocalProfile(updated);
                                setProfile(updated);
                                await saveProfile(updated);
                                loadHistory();
                            }}
                            className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-all ${mode === 'tape' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            📏 Tape
                        </button>
                        <button
                            onClick={async () => {
                                const updated = { ...localProfile, measurement_mode: 'scale' as const };
                                setLocalProfile(updated);
                                setProfile(updated);
                                await saveProfile(updated);
                                loadHistory();
                            }}
                            className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-all ${mode === 'scale' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            ⚖️ Scale
                        </button>
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
                        <ScreenshotUploader
                            type="body_comp"
                            subtype={mode}
                            userId={localProfile.user_id}
                            onDataExtracted={async (data) => {
                                const measurements = data as Record<string, number>;
                                if (!Object.keys(measurements).length) return;
                                try {
                                    setLoading('screenshot');
                                    const today = getToday();
                                    await BodyCompositionService.logMeasurements(localProfile.user_id, today, { ...measurements, measurement_mode: mode });
                                    if (measurements.weight) {
                                        const updated = { ...localProfile, bodyweight: measurements.weight };
                                        await saveProfile(updated);
                                        setLocalProfile(updated);
                                        setProfile(updated);
                                    }
                                    await loadHistory();
                                    toast.success(`Logged ${Object.keys(measurements).length} measurements`);
                                } catch (e) {
                                    console.error(e);
                                    toast.error('Failed to save');
                                } finally {
                                    setLoading(null);
                                }
                            }}
                        />
                        {/* WEIGHT */}
                        {mode === 'tape' ? (
                            <>
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
                                    loadHistory();
                                }}
                                onLog={(val) => handleMeasurementLog('weight', val, 'Weigh In')}
                                loading={loading === 'weight'}
                            />
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
                                    currentGoal={localProfile?.body_composition_goals?.[part.id] || (part.id === 'waist' ? 'Shrink' : 'Maintain')}
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
                                    unit="in"
                                />
                            ))}
                            </>
                        ) : (
                            <>
                                {/* Scale batch form */}
                                {(() => {
                                    const scaleFields = [
                                        { id: 'weight', label: 'Weight', unit: 'lbs', placeholder: getLatestValue('weight') },
                                        { id: 'body_fat_percentage', label: 'Body Fat', unit: '%', placeholder: getLatestValue('body_fat_percentage') },
                                    ];
                                    const regionFields = [
                                        { region: 'Left Arm', muscle: 'left_arm_muscle', fat: 'left_arm_fat' },
                                        { region: 'Right Arm', muscle: 'right_arm_muscle', fat: 'right_arm_fat' },
                                        { region: 'Trunk', muscle: 'trunk_muscle', fat: 'trunk_fat' },
                                        { region: 'Left Leg', muscle: 'left_leg_muscle', fat: 'left_leg_fat' },
                                        { region: 'Right Leg', muscle: 'right_leg_muscle', fat: 'right_leg_fat' },
                                    ];
                                    return (
                                        <div className="space-y-3">
                                            {/* Weight + Body Fat */}
                                            {scaleFields.map(f => (
                                                <div key={f.id} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                                                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{f.label}</span>
                                                    <div className="relative mt-1">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={scaleInputs[f.id] || ''}
                                                            onChange={e => setScaleInputs(prev => ({ ...prev, [f.id]: e.target.value }))}
                                                            placeholder={f.placeholder !== '0' ? f.placeholder : '0.0'}
                                                            className="w-full bg-zinc-950 rounded-lg p-2 text-sm text-white text-center outline-none border border-zinc-800 focus:border-zinc-600 transition font-bold placeholder:text-zinc-700"
                                                        />
                                                        <span className="absolute right-3 top-2.5 text-xs text-zinc-600 font-bold pointer-events-none uppercase">{f.unit}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {/* Per-region muscle + fat */}
                                            {regionFields.map(r => (
                                                <div key={r.region} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                                                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{r.region}</span>
                                                    <div className="grid grid-cols-2 gap-2 mt-1">
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={scaleInputs[r.muscle] || ''}
                                                                onChange={e => setScaleInputs(prev => ({ ...prev, [r.muscle]: e.target.value }))}
                                                                placeholder={getLatestValue(r.muscle) !== '0' ? getLatestValue(r.muscle) : '0.0'}
                                                                className="w-full bg-zinc-950 rounded-lg p-2 text-sm text-white text-center outline-none border border-zinc-800 focus:border-zinc-600 transition font-bold placeholder:text-zinc-700"
                                                            />
                                                            <span className="absolute right-2 top-2.5 text-xs text-zinc-600 font-bold pointer-events-none">lbs</span>
                                                        </div>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={scaleInputs[r.fat] || ''}
                                                                onChange={e => setScaleInputs(prev => ({ ...prev, [r.fat]: e.target.value }))}
                                                                placeholder={getLatestValue(r.fat) !== '0' ? getLatestValue(r.fat) : '0.0'}
                                                                className="w-full bg-zinc-950 rounded-lg p-2 text-sm text-white text-center outline-none border border-zinc-800 focus:border-zinc-600 transition font-bold placeholder:text-zinc-700"
                                                            />
                                                            <span className="absolute right-2 top-2.5 text-xs text-zinc-600 font-bold pointer-events-none">fat%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {/* Log All button */}
                                            <button
                                                onClick={async () => {
                                                    const measurements: Record<string, number> = {};
                                                    Object.entries(scaleInputs).forEach(([k, v]) => {
                                                        if (v && Number(v) > 0) measurements[k] = Number(v);
                                                    });
                                                    if (Object.keys(measurements).length === 0) return;
                                                    setLoading('scale_all');
                                                    try {
                                                        const today = getToday();
                                                        await BodyCompositionService.logMeasurements(localProfile.user_id, today, { ...measurements, measurement_mode: mode });
                                                        if (measurements.weight) {
                                                            const updated = { ...localProfile, bodyweight: measurements.weight };
                                                            setLocalProfile(updated);
                                                            setProfile(updated);
                                                            await saveProfile(updated);
                                                        }
                                                        await loadHistory();
                                                        setScaleInputs({});
                                                        toast.success(`Logged ${Object.keys(measurements).length} measurements`);
                                                    } catch (e) {
                                                        console.error(e);
                                                        toast.error('Failed to save');
                                                    } finally {
                                                        setLoading(null);
                                                    }
                                                }}
                                                disabled={loading === 'scale_all' || Object.values(scaleInputs).every(v => !v)}
                                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl uppercase tracking-wider text-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loading === 'scale_all' ? 'Saving...' : 'Log All Measurements'}
                                            </button>
                                        </div>
                                    );
                                })()}
                            </>
                        )}
                    </div>

                    {/* RIGHT: Visuals */}
                    <div className="w-full md:w-2/3 p-6 overflow-y-auto custom-scrollbar bg-black/20">
                        <div className="grid grid-cols-1 gap-6">
                            {/* Simple Graphs Loop */}
                            {(mode === 'tape'
                                ? ['weight', 'waist', 'arms', 'legs', 'chest', 'shoulders']
                                : ['weight', 'body_fat_percentage', 'left_arm_muscle', 'left_arm_fat', 'right_arm_muscle', 'right_arm_fat', 'trunk_muscle', 'trunk_fat', 'left_leg_muscle', 'left_leg_fat', 'right_leg_muscle', 'right_leg_fat']
                            ).map(metric => {
                                // Filter data where metric exists
                                const chartData = history.filter(h => h[metric] !== undefined && h[metric] !== null && Number(h[metric]) > 0);
                                if (chartData.length < 2) return null; // Don't show empty charts

                                return (
                                    <div key={metric} className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                                        <h4 className="text-base font-bold text-zinc-400 uppercase mb-4 tracking-wider">{metric} History</h4>
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

                            {/* Measurement History Table */}
                            {history.length > 0 && (
                                <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-base font-bold text-zinc-400 uppercase tracking-wider">History</h4>
                                        {!confirmReset ? (
                                            <button
                                                onClick={() => setConfirmReset(true)}
                                                className="text-xs text-red-500/60 hover:text-red-400 uppercase tracking-wider font-bold transition"
                                            >
                                                Reset All
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-red-400">Delete all data?</span>
                                                <button
                                                    onClick={async () => {
                                                        await deleteAllBodyMeasurementsAction(localProfile.user_id);
                                                        setConfirmReset(false);
                                                        await loadHistory();
                                                    }}
                                                    className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded font-bold uppercase transition"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    onClick={() => setConfirmReset(false)}
                                                    className="text-xs text-zinc-500 hover:text-white px-2 py-1 font-bold uppercase transition"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                        {[...history].reverse().map((entry) => (
                                            <div key={entry.id || entry.date} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-zinc-800/50 group">
                                                <div className="flex items-center gap-3 text-sm">
                                                    <span className="text-zinc-500 font-mono w-20">{entry.date}</span>
                                                    <span className="text-zinc-300">
                                                        {[
                                                            entry.weight && `${entry.weight}lbs`,
                                                            entry.waist && `W:${entry.waist}"`,
                                                            entry.arms && `A:${entry.arms}"`,
                                                            entry.chest && `C:${entry.chest}"`,
                                                            entry.legs && `L:${entry.legs}"`,
                                                        ].filter(Boolean).join(' · ') || 'No data'}
                                                    </span>
                                                </div>
                                                {entry.id && (
                                                    <button
                                                        onClick={async () => {
                                                            await deleteBodyMeasurementAction(entry.id!);
                                                            await loadHistory();
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition p-1"
                                                        title="Delete measurement"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        , document.body);
}
