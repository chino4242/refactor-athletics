"use client";

import { useState } from 'react';
import { X, Swords, Calendar, Copy, Check, Clock, Globe } from 'lucide-react';
import { createChallenge } from '../../services/api';
import CalendarPicker from '../common/CalendarPicker';

interface Props {
    isOpen: boolean;
    challengerId: string;
    onClose: () => void;
    onChallengeCreated: () => void;
}

const DURATIONS = [
    { label: 'The Daily Grind', days: 1, desc: '24 Hours' },
    { label: 'Weekend Warrior', days: 2, desc: '48 Hours' },
    { label: 'Work Week Rumble', days: 5, desc: 'Mon-Fri' },
    { label: 'Weekly War', days: 7, desc: '7 Days' }
];

export default function ChallengeModal({ isOpen, challengerId, onClose, onChallengeCreated }: Props) {
    const [selectedDuration, setSelectedDuration] = useState<number>(1);
    const [mode, setMode] = useState<'IMMEDIATE' | 'CALENDAR'>('IMMEDIATE');
    const [loading, setLoading] = useState(false);
    const [duelLink, setDuelLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Custom Date State
    const [isCustomDate, setIsCustomDate] = useState(false);
    const [activeDateField, setActiveDateField] = useState<'start' | 'end' | null>(null);
    const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
    const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

    // Metric Filtering State
    const [includedMetrics, setIncludedMetrics] = useState<string[]>(['ALL']);

    // Metric Toggle Helper
    const toggleMetric = (metric: string) => {
        setIncludedMetrics(prev => {
            if (metric === 'ALL') return ['ALL'];

            let newMetrics = prev.filter(m => m !== 'ALL');
            if (prev.includes(metric)) {
                newMetrics = newMetrics.filter(m => m !== metric);
            } else {
                newMetrics = [...newMetrics, metric];
            }

            // If empty, default back to ALL? Or strictly enforce selecting something. 
            // Let's default to ALL if empty for safety.
            if (newMetrics.length === 0) return ['ALL'];

            return newMetrics;
        });
    };

    const handleCreate = async () => {
        setLoading(true);
        try {
            // Pass null for opponent_id to create an open challenge
            // If custom, pass dates
            let startDate = null;
            let endDate = null;
            let duration = selectedDuration;

            if (isCustomDate) {
                if (!customStartDate || !customEndDate) {
                    alert("Please select both start and end dates.");
                    setLoading(false);
                    return;
                }

                // Format directly for local YYYY-MM-DD
                const formatDate = (d: Date) => {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                startDate = formatDate(customStartDate);
                endDate = formatDate(customEndDate);

                // Validate dates
                if (customEndDate < customStartDate) {
                    alert("End date cannot be before start date.");
                    setLoading(false);
                    return;
                }
            }

            const duel = await createChallenge(
                challengerId,
                null,
                duration,
                mode,
                startDate,
                endDate,
                includedMetrics // <--- Pass Metrics
            );

            // Generate Link
            const link = `${window.location.origin}/challenge/${duel.id}`;
            setDuelLink(link);
            onChallengeCreated(); // Refresh background list
        } catch (e) {
            console.error(e);
            alert("Failed to create challenge link.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (duelLink) {
            navigator.clipboard.writeText(duelLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setDuelLink(null);
        setCopied(false);
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden">

                {/* Close Button - Absolute to be on top of header */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-20"
                >
                    <X size={24} />
                </button>

                {/* Header (Fixed) */}
                <div className="p-6 pb-0 text-center shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-900/20">
                        <Swords size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black italic text-white uppercase tracking-tight">
                        {duelLink ? 'Challenge Ready' : 'Issue Challenge'}
                    </h2>
                    <p className="text-zinc-400 text-sm mt-1">
                        {duelLink ? 'Share this link with your rival.' : 'Compete for the highest XP total.'}
                    </p>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                    {duelLink ? (
                        <div className="space-y-4 animate-fade-in-up">
                            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center justify-between gap-3">
                                <code className="text-xs text-zinc-400 truncate font-mono">
                                    {duelLink}
                                </code>
                                <button
                                    onClick={copyToClipboard}
                                    className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-500/20 text-green-500' : 'bg-zinc-800 text-zinc-300 hover:text-white'}`}
                                >
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-zinc-500">
                                    Anyone with this link can accept the duel.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Mode Selection */}
                            <div className="mb-6">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
                                    Start Mode
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setMode('IMMEDIATE')}
                                        className={`p-3 rounded-xl border text-left transition-all ${mode === 'IMMEDIATE'
                                            ? 'bg-zinc-800 border-orange-500 ring-1 ring-orange-500'
                                            : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                                            }`}
                                    >
                                        <div className={`text-xs font-black uppercase mb-0.5 flex items-center gap-2 ${mode === 'IMMEDIATE' ? 'text-orange-400' : 'text-zinc-300'}`}>
                                            <Clock size={14} /> Immediate
                                        </div>
                                        <div className="text-zinc-500 text-[10px] font-mono leading-tight">
                                            Timer starts now. Ends cleanly in 24h.
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setMode('CALENDAR')}
                                        className={`p-3 rounded-xl border text-left transition-all ${mode === 'CALENDAR'
                                            ? 'bg-zinc-800 border-orange-500 ring-1 ring-orange-500'
                                            : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                                            }`}
                                    >
                                        <div className={`text-xs font-black uppercase mb-0.5 flex items-center gap-2 ${mode === 'CALENDAR' ? 'text-orange-400' : 'text-zinc-300'}`}>
                                            <Globe size={14} /> Calendar
                                        </div>
                                        <div className="text-zinc-500 text-[10px] font-mono leading-tight">
                                            Starts Midnight Tomorrow. Uses local days.
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Duration Selection */}
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
                                    <Calendar size={14} /> Time Constraint
                                </label>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    {DURATIONS.map((dur) => (
                                        <button
                                            key={dur.days}
                                            onClick={() => {
                                                setSelectedDuration(dur.days);
                                                setIsCustomDate(false);
                                                setActiveDateField(null);
                                            }}
                                            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${selectedDuration === dur.days && !isCustomDate
                                                ? 'bg-zinc-800 border-orange-500 ring-1 ring-orange-500'
                                                : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                                                }`}
                                        >
                                            <div className={`text-xs font-black uppercase mb-0.5 ${selectedDuration === dur.days && !isCustomDate ? 'text-orange-400' : 'text-zinc-300'}`}>
                                                {dur.label}
                                            </div>
                                            <div className="text-zinc-500 text-[10px] font-mono">
                                                {dur.desc}
                                            </div>
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => {
                                            setIsCustomDate(true);
                                            setActiveDateField(null);
                                        }}
                                        className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden col-span-2 ${isCustomDate
                                            ? 'bg-zinc-800 border-orange-500 ring-1 ring-orange-500'
                                            : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                                            }`}
                                    >
                                        <div className={`text-xs font-black uppercase mb-0.5 ${isCustomDate ? 'text-orange-400' : 'text-zinc-300'}`}>
                                            Custom Range
                                        </div>
                                        <div className="text-zinc-500 text-[10px] font-mono">
                                            {customStartDate && customEndDate
                                                ? `${customStartDate.toLocaleDateString()} - ${customEndDate.toLocaleDateString()}`
                                                : 'Pick your dates'}
                                        </div>
                                    </button>
                                </div>

                                {isCustomDate && (
                                    <div className="animate-fade-in space-y-2 mb-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => {
                                                    setActiveDateField(prev => prev === 'start' ? null : 'start');
                                                }}
                                                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${activeDateField === 'start'
                                                    ? 'bg-zinc-800 border-orange-500 ring-1 ring-orange-500'
                                                    : customStartDate
                                                        ? 'bg-zinc-800 border-zinc-700'
                                                        : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                                                    }`}
                                            >
                                                <div className={`text-xs font-black uppercase mb-0.5 ${activeDateField === 'start' || customStartDate ? 'text-orange-400' : 'text-zinc-300'}`}>
                                                    Start Date
                                                </div>
                                                <div className="text-zinc-500 text-[10px] font-mono truncate">
                                                    {customStartDate ? customStartDate.toLocaleDateString() : 'Select Start'}
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    if (!customStartDate) return;
                                                    setActiveDateField(prev => prev === 'end' ? null : 'end');
                                                }}
                                                disabled={!customStartDate}
                                                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${activeDateField === 'end'
                                                    ? 'bg-zinc-800 border-orange-500 ring-1 ring-orange-500'
                                                    : customEndDate
                                                        ? 'bg-zinc-800 border-zinc-700'
                                                        : customStartDate
                                                            ? 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                                                            : 'bg-zinc-900/20 border-zinc-800 opacity-50 cursor-not-allowed'
                                                    }`}
                                            >
                                                <div className={`text-xs font-black uppercase mb-0.5 ${activeDateField === 'end' || customEndDate ? 'text-orange-400' : 'text-zinc-300'}`}>
                                                    End Date
                                                </div>
                                                <div className="text-zinc-500 text-[10px] font-mono truncate">
                                                    {customEndDate ? customEndDate.toLocaleDateString() : 'Select End'}
                                                </div>
                                            </button>
                                        </div>

                                        {activeDateField && (
                                            <div className="animate-fade-in relative z-10">
                                                <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm -mb-2 -mx-4 z-0 rounded-b-2xl" />
                                                <CalendarPicker
                                                    startDate={activeDateField === 'start' ? customStartDate : customEndDate}
                                                    endDate={null}
                                                    selectionMode="single"
                                                    minDate={activeDateField === 'end' ? (customStartDate || undefined) : undefined}
                                                    onChange={(date) => {
                                                        if (activeDateField === 'start') {
                                                            setCustomStartDate(date);
                                                            setActiveDateField('end');
                                                            if (customEndDate && date && date > customEndDate) {
                                                                setCustomEndDate(null);
                                                            }
                                                        } else {
                                                            setCustomEndDate(date);
                                                            setActiveDateField(null);
                                                        }
                                                    }}
                                                />
                                                <div className="mt-2 text-center relative z-10">
                                                    <p className="text-[10px] text-zinc-500">
                                                        *Midnight to Midnight (Local Time)
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Metric Selection */}
                            <div className="mb-6">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
                                    Included Metrics
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['ALL', 'STEPS', 'HABITS', 'WORKOUTS'].map((metric) => {
                                        const isSelected = includedMetrics.includes(metric);
                                        return (
                                            <button
                                                key={metric}
                                                onClick={() => toggleMetric(metric)}
                                                className={`p-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${isSelected
                                                    ? 'bg-zinc-800 border-orange-500 text-orange-400 shadow-lg shadow-orange-900/20'
                                                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
                                                    }`}
                                            >
                                                {metric}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-zinc-600 mt-2 text-center">
                                    {includedMetrics.includes('ALL')
                                        ? "All XP gained will count towards the score."
                                        : "Only selected activities will generate points."}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer (Fixed) */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-900 shrink-0 z-10">
                    {duelLink ? (
                        <button
                            onClick={handleClose}
                            className="w-full py-4 bg-zinc-800 text-white font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-700 transition-colors"
                        >
                            Done
                        </button>
                    ) : (
                        <button
                            onClick={handleCreate}
                            disabled={loading}
                            className="w-full py-4 bg-white text-black font-black uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/10"
                        >
                            {loading ? 'Creating Link...' : 'Create Challenge Link'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
