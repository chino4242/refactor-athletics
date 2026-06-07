"use client";

import { useState, useEffect } from 'react';
import { saveProfile } from '../services/api';
import type { UserProfileData, NutritionTargets } from '@/types';
import { Eye, EyeOff, ChevronDown, Calculator } from 'lucide-react';
import { calculateMacros, ACTIVITY_LABELS, GOAL_LABELS, type ActivityLevel, type MacroGoal, type MacroResult } from '@/utils/macroCalculator';

interface HabitSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile: UserProfileData;
    onUpdate: () => void;
}

const HABIT_CATALOG = {
  health: {
    label: '💪 Health',
    habits: [
      { id: 'habit_steps', label: 'Steps', desc: 'Daily step count from walking/running', hasTarget: true, min: 1000, max: 25000, step: 500, unit: 'steps', color: 'accent-orange-500' },
      { id: 'habit_sleep', label: 'Sleep', desc: 'Hours of sleep per night', hasTarget: true, min: 4, max: 12, step: 0.5, unit: 'hrs', color: 'accent-purple-500' },
      { id: 'habit_mood', label: 'Mood / Energy', desc: 'How do you feel today? (1-5)', hasTarget: false },
      { id: 'habit_exercise_minutes', label: 'Exercise', desc: 'Minutes of intentional exercise', hasTarget: true, min: 10, max: 120, step: 5, unit: 'min', color: 'accent-green-500' },
      { id: 'habit_stand_hours', label: 'Stand Hours', desc: 'Hours spent standing/moving (Apple Watch)', hasTarget: true, min: 6, max: 16, step: 1, unit: 'hrs', color: 'accent-blue-500' },
      { id: 'habit_creatine', label: 'Supplements', desc: 'Daily creatine or supplement intake', hasTarget: false },
    ],
  },
  recovery: {
    label: '🧘 Recovery',
    habits: [
      { id: 'habit_mobility', label: 'Mobility', desc: 'Stretching, foam rolling, yoga', hasTarget: true, min: 5, max: 60, step: 5, unit: 'min', color: 'accent-teal-500' },
      { id: 'habit_cold_plunge', label: 'Cold Plunge', desc: 'Cold water immersion', hasTarget: true, min: 1, max: 15, step: 1, unit: 'min', color: 'accent-blue-500' },
      { id: 'habit_sauna', label: 'Sauna', desc: 'Heat therapy session', hasTarget: true, min: 5, max: 30, step: 5, unit: 'min', color: 'accent-red-500' },
      { id: 'habit_meditation', label: 'Meditation', desc: 'Mindfulness or breathing practice', hasTarget: true, min: 5, max: 30, step: 5, unit: 'min', color: 'accent-indigo-500' },
    ],
  },
  wearable: {
    label: '⌚ Wearable Sync',
    habits: [
      { id: 'habit_day_strain', label: 'Day Strain', desc: 'WHOOP daily strain score', hasTarget: true, min: 1, max: 21, step: 1, unit: 'strain', color: 'accent-amber-500' },
      { id: 'habit_recovery', label: 'Recovery', desc: 'WHOOP recovery percentage', hasTarget: true, min: 10, max: 100, step: 10, unit: '%', color: 'accent-emerald-500' },
      { id: 'habit_hrv', label: 'HRV', desc: 'Heart rate variability (ms)', hasTarget: true, min: 10, max: 200, step: 10, unit: 'ms', color: 'accent-purple-500' },
      { id: 'habit_resting_hr', label: 'Resting HR', desc: 'Resting heart rate (bpm)', hasTarget: true, min: 40, max: 100, step: 5, unit: 'bpm', color: 'accent-red-500' },
    ],
  },
  discipline: {
    label: '🛡️ Discipline',
    habits: [
      { id: 'habit_no_alcohol', label: 'Avoid Alcohol', desc: 'Track alcohol-free days', hasTarget: false },
      { id: 'habit_no_vice', label: 'Avoid Vice', desc: 'Track days without your chosen vice', hasTarget: false },
      { id: 'habit_sugar', label: 'Avoid Sugar', desc: 'Track days without added sugar', hasTarget: false },
      { id: 'habit_journaling', label: 'Journaling', desc: 'Daily writing or reflection', hasTarget: false },
      { id: 'habit_reading', label: 'Reading', desc: 'Pages read per day', hasTarget: true, min: 1, max: 100, step: 5, unit: 'pg', color: 'accent-pink-500' },
      { id: 'habit_fasting', label: 'Intermittent Fasting', desc: 'Hours in fasting window', hasTarget: true, min: 12, max: 24, step: 1, unit: 'hrs', color: 'accent-violet-500' },
    ],
  },
};

export default function HabitSettings({ isOpen, onClose, userProfile, onUpdate }: HabitSettingsProps) {
    const [targets, setTargets] = useState<Record<string, number>>({});
    const [nutritionTargets, setNutritionTargets] = useState<Record<string, number>>({});
    const [hidden, setHidden] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({ health: true, recovery: true, wearable: true, discipline: true });
    const [showCalc, setShowCalc] = useState(false);
    const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
    const [macroGoal, setMacroGoal] = useState<MacroGoal>(() => {
        const tw = parseFloat(userProfile.body_composition_goals?.target_weight || '0');
        if (tw && tw < userProfile.bodyweight) return 'lose';
        if (tw && tw > userProfile.bodyweight) return 'gain';
        return 'maintain';
    });
    const [calcResult, setCalcResult] = useState<MacroResult | null>(null);

    useEffect(() => {
        if (isOpen) {
            setTargets({
                habit_steps: userProfile.habit_targets?.habit_steps || 10000,
                habit_sleep: userProfile.habit_targets?.habit_sleep || 8,
                habit_exercise_minutes: userProfile.habit_targets?.habit_exercise_minutes || 30,
                habit_stand_hours: userProfile.habit_targets?.habit_stand_hours || 12,
                habit_water: userProfile.nutrition_targets?.water || userProfile.habit_targets?.habit_water || 100,
                habit_reading: userProfile.habit_targets?.habit_reading || 10,
                habit_mobility: userProfile.habit_targets?.habit_mobility || 15,
                habit_cold_plunge: userProfile.habit_targets?.habit_cold_plunge || 3,
                habit_sauna: userProfile.habit_targets?.habit_sauna || 15,
                habit_meditation: userProfile.habit_targets?.habit_meditation || 10,
                habit_fasting: userProfile.habit_targets?.habit_fasting || 16,
            });
            setNutritionTargets({
                protein: userProfile.nutrition_targets?.protein || 150,
                carbs: userProfile.nutrition_targets?.carbs || 150,
                fat: userProfile.nutrition_targets?.fat || 60,
                calories: userProfile.nutrition_targets?.calories || 2000,
            });
            setHidden(userProfile?.hidden_habits || []);
        }
    }, [isOpen, userProfile]);

    useEffect(() => {
        const calc = (nutritionTargets.protein * 4) + (nutritionTargets.carbs * 4) + (nutritionTargets.fat * 9);
        setNutritionTargets(prev => ({ ...prev, calories: calc }));
    }, [nutritionTargets.protein, nutritionTargets.carbs, nutritionTargets.fat]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const updatedProfile = { ...userProfile };
            updatedProfile.habit_targets = { ...userProfile.habit_targets, ...targets };
            updatedProfile.nutrition_targets = { ...userProfile.nutrition_targets, ...nutritionTargets, water: targets.habit_water } as NutritionTargets;
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
        setHidden(prev => prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 relative shadow-2xl flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">✕</button>

                <div className="mb-6">
                    <h3 className="text-xl font-black italic text-white mb-1 uppercase tracking-tighter">Quest Settings</h3>
                    <p className="text-xs text-zinc-400">Toggle habits on/off and set daily targets.</p>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">

                    {/* Nutrition */}
                    <div>
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2 mb-3">🥗 Nutrition Targets</h4>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { key: 'protein', label: '🥩 Protein (g)', color: 'focus:border-red-500' },
                                { key: 'carbs', label: '🍞 Carbs (g)', color: 'focus:border-yellow-500' },
                                { key: 'fat', label: '🥑 Fat (g)', color: 'focus:border-green-500' },
                            ].map(m => (
                                <div key={m.key}>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">{m.label}</label>
                                    <input type="number" value={nutritionTargets[m.key]} onChange={e => setNutritionTargets({ ...nutritionTargets, [m.key]: Number(e.target.value) })}
                                        className={`w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white text-center font-bold outline-none ${m.color}`} />
                                </div>
                            ))}
                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">🔥 Calories</label>
                                <div className="w-full bg-zinc-800/50 border border-zinc-700 rounded p-2 text-zinc-400 text-center font-bold">{nutritionTargets.calories}</div>
                            </div>
                        </div>
                        {/* Water */}
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase">💧 Water (oz) <span className="text-cyan-500">{targets.habit_water}</span></label>
                            </div>
                            <input type="range" min="20" max="200" step="10" value={targets.habit_water}
                                onChange={e => setTargets({ ...targets, habit_water: Number(e.target.value) })}
                                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                        </div>

                        {/* Macro Calculator */}
                        <div className="mt-3">
                            <button onClick={() => { setShowCalc(!showCalc); setCalcResult(null); }}
                                className="flex items-center gap-1.5 text-[10px] font-bold text-orange-500 hover:text-orange-400 transition uppercase tracking-wider">
                                <Calculator size={12} />
                                {showCalc ? 'Hide Calculator' : 'Calculate for me'}
                            </button>

                            {showCalc && (
                                <div className="mt-2 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg space-y-3 animate-fade-in">
                                    <div className="text-[10px] text-zinc-500">Based on: {userProfile.bodyweight} lbs, age {userProfile.age}, {userProfile.sex}</div>

                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Activity Level</label>
                                        <select value={activityLevel} onChange={e => { setActivityLevel(e.target.value as ActivityLevel); setCalcResult(null); }}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-white text-xs outline-none focus:border-orange-500">
                                            {(Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][]).map(([k, v]) => (
                                                <option key={k} value={k}>{v}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Goal</label>
                                        <div className="flex gap-2">
                                            {(Object.entries(GOAL_LABELS) as [MacroGoal, string][]).map(([k, v]) => (
                                                <button key={k} onClick={() => { setMacroGoal(k); setCalcResult(null); }}
                                                    className={`flex-1 text-[10px] font-bold py-2 rounded-lg transition ${macroGoal === k ? 'bg-orange-600 text-white' : 'bg-zinc-900 text-zinc-400 border border-zinc-700'}`}>
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {!calcResult ? (
                                        <button onClick={() => setCalcResult(calculateMacros({ weightLbs: userProfile.bodyweight, age: userProfile.age, sex: userProfile.sex, activityLevel, goal: macroGoal }))}
                                            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 rounded-lg text-xs uppercase tracking-wider transition">
                                            Calculate
                                        </button>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-4 gap-2 text-center">
                                                <div className="bg-zinc-900 rounded-lg p-2">
                                                    <div className="text-[9px] text-zinc-500 uppercase">Calories</div>
                                                    <div className="text-sm font-bold text-white">{calcResult.calories}</div>
                                                </div>
                                                <div className="bg-zinc-900 rounded-lg p-2">
                                                    <div className="text-[9px] text-zinc-500 uppercase">Protein</div>
                                                    <div className="text-sm font-bold text-red-400">{calcResult.protein}g</div>
                                                </div>
                                                <div className="bg-zinc-900 rounded-lg p-2">
                                                    <div className="text-[9px] text-zinc-500 uppercase">Carbs</div>
                                                    <div className="text-sm font-bold text-yellow-400">{calcResult.carbs}g</div>
                                                </div>
                                                <div className="bg-zinc-900 rounded-lg p-2">
                                                    <div className="text-[9px] text-zinc-500 uppercase">Fat</div>
                                                    <div className="text-sm font-bold text-green-400">{calcResult.fat}g</div>
                                                </div>
                                            </div>
                                            <div className="text-[9px] text-zinc-600 text-center">BMR: {calcResult.bmr} · TDEE: {calcResult.tdee}</div>
                                            <button onClick={() => {
                                                setNutritionTargets({ protein: calcResult.protein, carbs: calcResult.carbs, fat: calcResult.fat, calories: calcResult.calories });
                                                setShowCalc(false);
                                            }}
                                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg text-xs uppercase tracking-wider transition">
                                                Apply These Targets
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Habit Categories */}
                    {Object.entries(HABIT_CATALOG).map(([catId, cat]) => {
                        const visibleCount = cat.habits.filter(h => !hidden.includes(h.id)).length;
                        const isExpanded = expandedCats[catId];

                        return (
                            <div key={catId}>
                                <button onClick={() => setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }))}
                                    className="w-full flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{cat.label}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-zinc-600">{visibleCount}/{cat.habits.length} active</span>
                                        <ChevronDown size={14} className={`text-zinc-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="space-y-3 animate-fade-in">
                                        {cat.habits.map(habit => {
                                            const isHidden = hidden.includes(habit.id);
                                            return (
                                                <div key={habit.id} className={`p-3 rounded-lg border transition-all ${isHidden ? 'bg-zinc-900/30 border-zinc-800/50 opacity-50' : 'bg-zinc-800/50 border-zinc-700'}`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div>
                                                            <span className="text-xs font-bold text-white">{habit.label}</span>
                                                            <p className="text-[10px] text-zinc-500">{habit.desc}</p>
                                                        </div>
                                                        <button onClick={() => toggleHidden(habit.id)}
                                                            className={`p-1.5 rounded transition-all ${isHidden ? 'bg-zinc-800 text-zinc-600 hover:text-red-400' : 'bg-zinc-800 text-green-500 hover:text-green-400'}`}>
                                                            {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                                                        </button>
                                                    </div>
                                                    {habit.hasTarget && !isHidden && (
                                                        <div className="mt-2">
                                                            <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                                                                <span>{habit.min} {habit.unit}</span>
                                                                <span className="font-bold text-zinc-300">{targets[habit.id] || habit.min} {habit.unit}</span>
                                                                <span>{habit.max} {habit.unit}</span>
                                                            </div>
                                                            <input type="range" min={habit.min} max={habit.max} step={habit.step}
                                                                value={targets[habit.id] || habit.min}
                                                                onChange={e => setTargets({ ...targets, [habit.id]: Number(e.target.value) })}
                                                                className={`w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer ${habit.color}`} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 flex gap-3 pt-4 border-t border-zinc-800">
                    <button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold py-3 rounded-xl uppercase tracking-wider text-xs transition">Cancel</button>
                    <button onClick={handleSave} disabled={loading}
                        className="flex-1 bg-white hover:bg-zinc-200 text-black font-black py-3 rounded-xl uppercase tracking-wider text-xs transition disabled:opacity-50">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
