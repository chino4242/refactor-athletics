"use client";

import { useState, useEffect } from 'react';
import { createCustomChallenge, type ChallengeGoal } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { X, Plus, Trash2 } from 'lucide-react';

interface ChallengeBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onChallengeCreated: () => void;
}

const HABIT_OPTIONS = [
    { id: 'habit_steps', label: 'Steps', unit: 'steps', default: 7500, defaultTol: 0, comparison: 'min' },
    { id: 'macro_protein', label: 'Protein', unit: 'g', default: 170, defaultTol: 10, comparison: 'min' },
    { id: 'macro_carbs', label: 'Carbs', unit: 'g', default: 150, defaultTol: 10, comparison: 'min' },
    { id: 'macro_fat', label: 'Fat', unit: 'g', default: 60, defaultTol: 5, comparison: 'min' },
    { id: 'macro_calories', label: 'Calories', unit: 'kcal', default: 1820, defaultTol: 100, comparison: 'max' },
    { id: 'habit_water', label: 'Water', unit: 'oz', default: 100, defaultTol: 0, comparison: 'min' },
    { id: 'habit_sleep', label: 'Sleep', unit: 'hrs', default: 7, defaultTol: 0, comparison: 'min' },
    { id: 'habit_journaling', label: 'Journaling', unit: 'entry', default: 1, defaultTol: 0, comparison: 'min' },
    { id: 'habit_no_alcohol', label: 'No Alcohol', unit: 'bool', default: 1, defaultTol: 0, comparison: 'min' },
    { id: 'habit_alcohol', label: 'Alcohol (Limit)', unit: 'drinks', default: 0, defaultTol: 0, comparison: 'max' },
    { id: 'habit_sugar', label: 'Sugar (Limit)', unit: 'treats', default: 0, defaultTol: 0, comparison: 'max' },
    { id: 'habit_bad_habit', label: 'Bad Habit (Generic)', unit: 'count', default: 0, defaultTol: 0, comparison: 'max' },
    { id: 'habit_fasting', label: 'Intermittent Fasting', unit: 'hours', default: 16, defaultTol: 0, comparison: 'min' },
];

export default function ChallengeBuilderModal({ isOpen, onClose, userId, onChallengeCreated }: ChallengeBuilderModalProps) {
    const toast = useToast();
    const [name, setName] = useState("30 Day Hard Reset");
    const [duration, setDuration] = useState(30);
    const [startDay, setStartDay] = useState(1);
    const [goals, setGoals] = useState<ChallengeGoal[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    // Add default goal
    useEffect(() => {
        if (isOpen && goals.length === 0) {
            addGoal('habit_steps');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const addGoal = (habitId: string) => {
        const template = HABIT_OPTIONS.find(h => h.id === habitId);
        if (template) {
            setGoals([...goals, {
                habit_id: template.id,
                label: template.label,
                unit: template.unit,
                target_value: template.default,
                tolerance: template.defaultTol,
                comparison: template.comparison as 'min' | 'max' | 'range'
            }]);
        }
        setShowDropdown(false);
    };

    const removeGoal = (index: number) => {
        const newGoals = [...goals];
        newGoals.splice(index, 1);
        setGoals(newGoals);
    };

    const updateGoal = (index: number, field: keyof ChallengeGoal, value: any) => {
        const newGoals = [...goals];
        // @ts-ignore
        newGoals[index][field] = value;
        setGoals(newGoals);
    };

    const handleSubmit = async () => {
        if (!name || goals.length === 0) {
            toast.error("Please add at least one goal.");
            return;
        }

        try {
            const today = new Date();
            const todayStr = today.toLocaleDateString('en-CA'); // YYYY-MM-DD

            // Calculate Backdated Start if startDay > 1
            const daysOffset = startDay - 1;
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - daysOffset);
            const startDateStr = startDate.toLocaleDateString('en-CA');

            await createCustomChallenge({
                user_id: userId,
                name: name,
                duration_days: duration,
                goals: goals.map(g => ({
                    ...g,
                    target_value: Number(g.target_value)
                })),
                start_date: startDateStr
            });
            toast.success("Challenge Created!");
            onChallengeCreated();
            onClose();
        } catch (e) {
            console.error(e);
            toast.error("Failed to create challenge.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* HEADER */}
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                    <h2 className="text-xl font-black italic text-white">CREATE CHALLENGE</h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="p-6 overflow-y-auto space-y-6">

                    {/* BASE SETTINGS */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase">Challenge Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 font-bold"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase">Duration (Days): <span className="text-white">{duration}</span></label>
                            <input
                                type="range"
                                min="7"
                                max="100"
                                value={duration}
                                onChange={(e) => setDuration(parseInt(e.target.value))}
                                className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="relative w-full h-4 mt-1">
                                <span className="absolute left-0 text-[10px] text-zinc-600 font-mono">7d</span>
                                <span className="absolute left-[24.7%] -translate-x-1/2 text-[10px] text-zinc-600 font-mono">30d</span>
                                <span className="absolute left-[73.1%] -translate-x-1/2 text-[10px] text-zinc-600 font-mono">75d</span>
                                <span className="absolute right-0 text-[10px] text-zinc-600 font-mono">100d</span>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-baseline mb-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Starting From</label>
                                <span className="text-sm font-bold text-white">Day {startDay}</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max={duration}
                                value={startDay}
                                onChange={(e) => setStartDay(parseInt(e.target.value))}
                                className="w-full accent-orange-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-zinc-600 font-mono mt-1">
                                <span>Day 1</span>
                                <span>Day {duration}</span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-2">
                                Start from a later day if you've already been tracking. Past days will be marked as complete.
                            </p>
                        </div>
                    </div>

                    <hr className="border-zinc-800" />

                    {/* GOALS */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center relative z-20">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Daily Requirements</label>

                            <div className="relative">
                                <button
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    className="text-xs font-bold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 rounded hover:bg-emerald-500/20 flex items-center gap-1 transition-colors"
                                >
                                    <Plus size={14} /> Add Metric
                                </button>
                                {/* DROPDOWN */}
                                {showDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)}></div>
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            {HABIT_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => addGoal(opt.id)}
                                                    className="w-full text-left px-4 py-2 hover:bg-zinc-700 text-sm text-zinc-300 hover:text-white transition-colors border-b border-zinc-700/50 last:border-0"
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {goals.map((goal, idx) => (
                            <div key={idx} className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 relative group">
                                <button
                                    onClick={() => removeGoal(idx)}
                                    className="absolute top-2 right-2 text-zinc-600 hover:text-red-500 transition-opacity p-2"
                                >
                                    <Trash2 size={16} />
                                </button>

                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-white">{goal.label}</span>
                                    <span className="text-xs text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{goal.unit}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Target</label>
                                        <input
                                            type="number"
                                            value={goal.target_value}
                                            onChange={(e) => updateGoal(idx, 'target_value', parseFloat(e.target.value))}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm text-white focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Tolerance (+/-)</label>
                                        <input
                                            type="number"
                                            value={goal.tolerance}
                                            onChange={(e) => updateGoal(idx, 'tolerance', parseFloat(e.target.value))}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm text-zinc-400 focus:text-white focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>

                {/* FOOTER */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-950">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-sm py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                    >
                        Launch Challenge
                    </button>
                </div>

            </div>
        </div>
    );
}
