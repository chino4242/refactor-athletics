"use client";

import { useState } from 'react';
import { X, Calendar, Trophy, Target } from 'lucide-react';
import CalendarPicker from './common/CalendarPicker';
import { createGroupChallenge } from '@/services/groupApi';
import { CHALLENGE_PRESETS, type ChallengeMetric } from '@/types';

interface Props {
    isOpen: boolean;
    groupId: string;
    userId: string;
    onClose: () => void;
    onCreated: () => void;
}

const DURATION_PRESETS = [
    { label: 'Work Week', days: 5, desc: 'Mon – Fri' },
    { label: 'Full Week', days: 7, desc: '7 Days' },
    { label: 'Weekend', days: 2, desc: 'Sat – Sun' },
    { label: 'Two Weeks', days: 14, desc: '14 Days' },
];

export default function GroupChallengeModal({ isOpen, groupId, userId, onClose, onCreated }: Props) {
    const [metric, setMetric] = useState<ChallengeMetric>('steps');
    const [target, setTarget] = useState<string>(String(CHALLENGE_PRESETS.steps.defaultTarget));
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    // Date state
    const [isCustomDate, setIsCustomDate] = useState(false);
    const [activeDateField, setActiveDateField] = useState<'start' | 'end' | null>(null);
    const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
    const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
    const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);

    if (!isOpen) return null;

    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getPresetDates = (presetIdx: number) => {
        const preset = DURATION_PRESETS[presetIdx];
        const now = new Date();
        const dayOfWeek = now.getDay();

        let start: Date;
        if (preset.days === 2) {
            // Weekend: next Saturday
            const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
            start = new Date(now);
            start.setDate(now.getDate() + daysUntilSat);
        } else if (preset.days === 5) {
            // Work week: closest Monday
            start = new Date(now);
            const daysSinceMonday = (dayOfWeek + 6) % 7; // Mon=0, Tue=1, ... Sun=6
            if (daysSinceMonday <= 2) {
                // Mon-Wed: go back to this Monday
                start.setDate(now.getDate() - daysSinceMonday);
            } else {
                // Thu-Sun: go forward to next Monday
                start.setDate(now.getDate() + (7 - daysSinceMonday));
            }
        } else {
            // Start tomorrow
            start = new Date(now);
            start.setDate(now.getDate() + 1);
        }

        const end = new Date(start);
        end.setDate(start.getDate() + preset.days - 1);
        return { start, end };
    };

    const handleMetricChange = (m: ChallengeMetric) => {
        setMetric(m);
        setTarget(String(CHALLENGE_PRESETS[m].defaultTarget));
    };

    const handleCreate = async () => {
        let startDate: string;
        let endDate: string;

        if (isCustomDate) {
            if (!customStartDate || !customEndDate) {
                alert('Please select both start and end dates.');
                return;
            }
            if (customEndDate < customStartDate) {
                alert('End date cannot be before start date.');
                return;
            }
            startDate = formatDate(customStartDate);
            endDate = formatDate(customEndDate);
        } else {
            const dates = getPresetDates(selectedPresetIdx);
            startDate = formatDate(dates.start);
            endDate = formatDate(dates.end);
        }

        const targetNum = parseInt(target);
        if (!targetNum || targetNum <= 0) {
            alert('Please enter a valid target.');
            return;
        }

        setLoading(true);
        try {
            const preset = CHALLENGE_PRESETS[metric];
            await createGroupChallenge({
                groupId,
                createdBy: userId,
                metric,
                target: targetNum,
                name: name.trim() || `${preset.emoji} ${preset.label} Challenge`,
                startDate,
                endDate,
            });
            onCreated();
            onClose();
            // Reset
            setMetric('steps');
            setTarget(String(CHALLENGE_PRESETS.steps.defaultTarget));
            setName('');
            setIsCustomDate(false);
            setCustomStartDate(null);
            setCustomEndDate(null);
        } catch (e) {
            console.error(e);
            alert('Failed to create challenge.');
        } finally {
            setLoading(false);
        }
    };

    const preset = CHALLENGE_PRESETS[metric];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden">

                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-20">
                    <X size={24} />
                </button>

                {/* Header */}
                <div className="p-6 pb-0 text-center shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-900/20">
                        <Trophy size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black italic text-white uppercase tracking-tight">Group Challenge</h2>
                    <p className="text-zinc-400 text-base mt-1">Work together to hit the goal</p>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">

                    {/* Challenge Name */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Challenge Name (optional)</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder={`${preset.emoji} ${preset.label} Challenge`}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-base"
                        />
                    </div>

                    {/* Metric Selection */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Metric</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(Object.entries(CHALLENGE_PRESETS) as [ChallengeMetric, typeof CHALLENGE_PRESETS[ChallengeMetric]][]).map(([key, p]) => (
                                <button
                                    key={key}
                                    onClick={() => handleMetricChange(key)}
                                    className={`p-3 rounded-xl border text-left transition-all ${metric === key
                                        ? 'bg-zinc-800 border-emerald-500 ring-1 ring-emerald-500'
                                        : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                                    }`}
                                >
                                    <div className="text-xl mb-1">{p.emoji}</div>
                                    <div className={`text-xs font-bold uppercase ${metric === key ? 'text-emerald-400' : 'text-zinc-300'}`}>{p.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Target */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
                            <Target size={14} /> Group Target ({preset.unit})
                        </label>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={target}
                            onChange={e => setTarget(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-base font-bold"
                        />
                        <p className="text-xs text-zinc-600 mt-1">Combined total across all group members</p>
                    </div>

                    {/* Time Window */}
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
                            <Calendar size={14} /> Time Window
                        </label>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            {DURATION_PRESETS.map((dur, idx) => {
                                const dates = getPresetDates(idx);
                                return (
                                    <button
                                        key={dur.label}
                                        onClick={() => { setSelectedPresetIdx(idx); setIsCustomDate(false); setActiveDateField(null); }}
                                        className={`p-3 rounded-xl border text-left transition-all ${!isCustomDate && selectedPresetIdx === idx
                                            ? 'bg-zinc-800 border-emerald-500 ring-1 ring-emerald-500'
                                            : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                                        }`}
                                    >
                                        <div className={`text-xs font-bold uppercase mb-0.5 ${!isCustomDate && selectedPresetIdx === idx ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                            {dur.label}
                                        </div>
                                        <div className="text-zinc-500 text-xs font-mono">
                                            {dates.start.toLocaleDateString()} – {dates.end.toLocaleDateString()}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => { setIsCustomDate(true); setActiveDateField(null); }}
                            className={`w-full p-3 rounded-xl border text-left transition-all ${isCustomDate
                                ? 'bg-zinc-800 border-emerald-500 ring-1 ring-emerald-500'
                                : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                            }`}
                        >
                            <div className={`text-xs font-bold uppercase mb-0.5 ${isCustomDate ? 'text-emerald-400' : 'text-zinc-300'}`}>Custom Range</div>
                            <div className="text-zinc-500 text-xs font-mono">
                                {customStartDate && customEndDate
                                    ? `${customStartDate.toLocaleDateString()} – ${customEndDate.toLocaleDateString()}`
                                    : 'Pick your dates'}
                            </div>
                        </button>

                        {isCustomDate && (
                            <div className="mt-3 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setActiveDateField(prev => prev === 'start' ? null : 'start')}
                                        className={`p-3 rounded-xl border text-left transition-all ${activeDateField === 'start'
                                            ? 'bg-zinc-800 border-emerald-500 ring-1 ring-emerald-500'
                                            : customStartDate ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                                        }`}
                                    >
                                        <div className={`text-xs font-bold uppercase mb-0.5 ${activeDateField === 'start' || customStartDate ? 'text-emerald-400' : 'text-zinc-300'}`}>Start Date</div>
                                        <div className="text-zinc-500 text-xs font-mono truncate">
                                            {customStartDate ? customStartDate.toLocaleDateString() : 'Select'}
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => { if (customStartDate) setActiveDateField(prev => prev === 'end' ? null : 'end'); }}
                                        disabled={!customStartDate}
                                        className={`p-3 rounded-xl border text-left transition-all ${activeDateField === 'end'
                                            ? 'bg-zinc-800 border-emerald-500 ring-1 ring-emerald-500'
                                            : customEndDate ? 'bg-zinc-800 border-zinc-700'
                                            : customStartDate ? 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                                            : 'bg-zinc-900/20 border-zinc-800 opacity-50 cursor-not-allowed'
                                        }`}
                                    >
                                        <div className={`text-xs font-bold uppercase mb-0.5 ${activeDateField === 'end' || customEndDate ? 'text-emerald-400' : 'text-zinc-300'}`}>End Date</div>
                                        <div className="text-zinc-500 text-xs font-mono truncate">
                                            {customEndDate ? customEndDate.toLocaleDateString() : 'Select'}
                                        </div>
                                    </button>
                                </div>

                                {activeDateField && (
                                    <div>
                                        <CalendarPicker
                                            startDate={activeDateField === 'start' ? customStartDate : customEndDate}
                                            endDate={null}
                                            selectionMode="single"
                                            minDate={activeDateField === 'end' ? (customStartDate || undefined) : new Date()}
                                            onChange={(date: any) => {
                                                if (activeDateField === 'start') {
                                                    setCustomStartDate(date);
                                                    setActiveDateField('end');
                                                    if (customEndDate && date && date > customEndDate) setCustomEndDate(null);
                                                } else {
                                                    setCustomEndDate(date);
                                                    setActiveDateField(null);
                                                }
                                            }}
                                        />
                                        <p className="text-xs text-zinc-500 text-center mt-1">*Midnight to Midnight (Local Time)</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-900 shrink-0">
                    <button
                        onClick={handleCreate}
                        disabled={loading}
                        className="w-full py-4 bg-emerald-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/10"
                    >
                        {loading ? 'Creating...' : 'Launch Challenge'}
                    </button>
                </div>
            </div>
        </div>
    );
}
