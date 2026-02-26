"use client";

import { useState, useEffect } from 'react';
import { saveProfile } from '../services/api';
import type { UserProfileData } from '@/types';
import { Eye, EyeOff } from 'lucide-react';

interface HabitSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile: UserProfileData;
    onUpdate: () => void;
}

export default function HabitSettings({ isOpen, onClose, userProfile, onUpdate }: HabitSettingsProps) {
    const [targets, setTargets] = useState<Record<string, number>>({});
    const [hidden, setHidden] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Initialize with existing targets or defaults
            setTargets({
                habit_steps: userProfile.habit_targets?.habit_steps || 10000,
                habit_water: userProfile.nutrition_targets?.water || userProfile.habit_targets?.habit_water || 100,
                habit_reading: userProfile.habit_targets?.habit_reading || 10,
                habit_mobility: userProfile.habit_targets?.habit_mobility || 15,
                habit_cold_plunge: userProfile.habit_targets?.habit_cold_plunge || 3,
                habit_sauna: userProfile.habit_targets?.habit_sauna || 15,
                habit_meditation: userProfile.habit_targets?.habit_meditation || 10,
            });
            setHidden(userProfile?.hidden_habits || []);
        }
    }, [isOpen, userProfile]);

    const handleSave = async () => {
        setLoading(true);
        try {
            // Prepare updates
            const updatedProfile = { ...userProfile };

            // Update habit targets
            updatedProfile.habit_targets = {
                ...userProfile.habit_targets,
                ...targets
            };

            // Sync Water to Nutrition Targets if it exists
            if (userProfile.nutrition_targets) {
                updatedProfile.nutrition_targets = {
                    ...userProfile.nutrition_targets,
                    water: targets.habit_water
                };
            }

            // Update hidden habits
            updatedProfile.hidden_habits = hidden;

            await saveProfile(updatedProfile);
            onUpdate();
            onClose();
        } catch (e) {
            console.error("Failed to save habit targets", e);
        } finally {
            setLoading(false);
        }
    };

    const toggleHidden = (id: string) => {
        if (hidden.includes(id)) {
            setHidden(hidden.filter(h => h !== id));
        } else {
            setHidden([...hidden, id]);
        }
    };

    const VisibilityToggle = ({ id }: { id: string }) => {
        const isHidden = hidden.includes(id);
        return (
            <button
                onClick={() => toggleHidden(id)}
                className={`p-1.5 rounded transition-all ${isHidden ? 'bg-zinc-800 text-zinc-600 hover:text-red-400' : 'bg-zinc-800 text-green-500 hover:text-green-400'}`}
                title={isHidden ? "Hidden" : "Visible"}
            >
                {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 relative shadow-2xl flex flex-col max-h-[90vh]">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                >
                    ✕
                </button>

                <div className="mb-6">
                    <h3 className="text-xl font-black italic text-white mb-1 uppercase tracking-tighter">Habit Settings</h3>
                    <p className="text-xs text-zinc-400">Manage habit goals and visibility.</p>
                </div>

                <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">

                    {/* Section 1: Quantitative Habits (Targets) */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Daily Targets</h4>

                        {/* Steps */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2">
                                    <VisibilityToggle id="habit_steps" />
                                    Steps <span className="text-orange-500">{targets.habit_steps}</span>
                                </label>
                            </div>
                            <input
                                type="range"
                                min="1000" max="25000" step="500"
                                value={targets.habit_steps}
                                onChange={(e) => setTargets({ ...targets, habit_steps: Number(e.target.value) })}
                                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                        </div>

                        {/* Water */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2">
                                    <VisibilityToggle id="habit_water" />
                                    Water (oz) <span className="text-cyan-500">{targets.habit_water}</span>
                                </label>
                            </div>
                            <input
                                type="range"
                                min="20" max="200" step="10"
                                value={targets.habit_water}
                                onChange={(e) => setTargets({ ...targets, habit_water: Number(e.target.value) })}
                                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Reading */}
                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2 mb-1">
                                    <VisibilityToggle id="habit_reading" />
                                    Reading (Pg)
                                </label>
                                <input
                                    type="number"
                                    value={targets.habit_reading}
                                    onChange={(e) => setTargets({ ...targets, habit_reading: Number(e.target.value) })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white text-center font-bold focus:border-pink-500 outline-none"
                                />
                            </div>
                            {/* Mobility */}
                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2 mb-1">
                                    <VisibilityToggle id="habit_mobility" />
                                    Mobility (m)
                                </label>
                                <input
                                    type="number"
                                    value={targets.habit_mobility}
                                    onChange={(e) => setTargets({ ...targets, habit_mobility: Number(e.target.value) })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white text-center font-bold focus:border-teal-500 outline-none"
                                />
                            </div>
                            {/* Meditation */}
                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2 mb-1">
                                    <VisibilityToggle id="habit_meditation" />
                                    Meditate (m)
                                </label>
                                <input
                                    type="number"
                                    value={targets.habit_meditation}
                                    onChange={(e) => setTargets({ ...targets, habit_meditation: Number(e.target.value) })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white text-center font-bold focus:border-indigo-500 outline-none"
                                />
                            </div>
                            {/* Sauna */}
                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2 mb-1">
                                    <VisibilityToggle id="habit_sauna" />
                                    Sauna (m)
                                </label>
                                <input
                                    type="number"
                                    value={targets.habit_sauna}
                                    onChange={(e) => setTargets({ ...targets, habit_sauna: Number(e.target.value) })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white text-center font-bold focus:border-red-500 outline-none"
                                />
                            </div>
                            {/* Cold */}
                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-2 mb-1">
                                    <VisibilityToggle id="habit_cold_plunge" />
                                    Cold (m)
                                </label>
                                <input
                                    type="number"
                                    value={targets.habit_cold_plunge}
                                    onChange={(e) => setTargets({ ...targets, habit_cold_plunge: Number(e.target.value) })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white text-center font-bold focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Binary Habits (Toggle Only) */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Habit Visibility</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'habit_sleep', label: 'Sleep 7+ Hrs' },
                                { id: 'habit_creatine', label: 'Supplements' },
                                { id: 'habit_no_alcohol', label: 'No Alcohol' },
                                { id: 'habit_no_vice', label: 'No Vice' },
                                { id: 'habit_journaling', label: 'Journaling' },
                                { id: 'habit_weigh_in', label: 'Weigh In' },
                            ].map(habit => (
                                <div key={habit.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-800">
                                    <span className="text-xs font-bold text-zinc-300">{habit.label}</span>
                                    <VisibilityToggle id={habit.id} />
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                <div className="mt-6 flex gap-3 pt-4 border-t border-zinc-800">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold py-3 rounded-xl uppercase tracking-wider text-xs transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 bg-white hover:bg-zinc-200 text-black font-black py-3 rounded-xl uppercase tracking-wider text-xs transition disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
