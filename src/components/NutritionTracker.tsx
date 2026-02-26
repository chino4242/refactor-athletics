"use client";

import { useState, useEffect } from 'react';
import { saveProfile, getWeeklyProgress } from '../services/api';
import { logHabitAction } from '@/app/actions';
import type { UserProfileData, NutritionTargets, HistoryItem } from '@/types';
import MacroLogModal from './MacroLogModal';
import { Plus } from 'lucide-react';

interface NutritionTrackerProps {
    userId: string;
    userProfile: UserProfileData;
    totals: Record<string, number>; // Current progress from DailyQuest
    onUpdate: () => void; // Trigger refresh
}

export default function NutritionTracker({ userId, userProfile, totals, onUpdate }: NutritionTrackerProps) {
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [targets, setTargets] = useState<NutritionTargets>(userProfile.nutrition_targets || {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 65,
        water: 100
    });

    // Debug: Log totals to see what's actually there
    useEffect(() => {
        console.log("NutritionTracker totals:", totals);
    }, [totals]);



    // 🟢 NEW: Logging Mode for Macros
    const [showLogModal, setShowLogModal] = useState(false);

    // Weekly State
    const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
    const [weeklyData, setWeeklyData] = useState<Record<number, Record<string, number>>>({}); // Day Index -> Totals


    const hasTargets = !!userProfile.nutrition_targets;

    useEffect(() => {
        if (userProfile.nutrition_targets) {
            setTargets({
                ...userProfile.nutrition_targets,
                water: userProfile.nutrition_targets.water || 100 // Default Water Target
            });
        }
    }, [userProfile]);

    // Fetch Weekly Data when view changes to Weekly
    useEffect(() => {
        if (viewMode === 'weekly') {
            const fetchWeekly = async () => {
                const now = new Date();
                const day = now.getDay(); // 0 (Sun) - 6 (Sat)

                // Calculate days to subtract to get to MONDAY
                const diffToMonday = (day + 6) % 7;

                const monday = new Date(now);
                monday.setDate(now.getDate() - diffToMonday);
                monday.setHours(0, 0, 0, 0);

                const mondayTs = Math.floor(monday.getTime() / 1000);

                try {
                    const data = await getWeeklyProgress(userId, mondayTs);

                    // Bucket items by day
                    const buckets: Record<number, Record<string, number>> = {};

                    if (data?.items) {
                        data.items.forEach((item: HistoryItem) => {
                            if (!item.timestamp) return;
                            const itemDate = new Date(item.timestamp * 1000);
                            const itemDay = itemDate.getDay(); // 0-6

                            // Initialize bucket if needed
                            if (!buckets[itemDay]) buckets[itemDay] = {};

                            // Add to totals
                            // 🟢 FIX: Check raw_value if value is missing (Habits often use raw_value in DB)
                            const val = parseFloat(item.value || String(item.raw_value || 0)) || 0;
                            // Map 'habit_water' to 'macro_water' logic if needed, but easier to just use 'habit_water' key
                            // But for consistency in this component, let's treat it as habit_water
                            const key = item.exercise_id;
                            buckets[itemDay][key] = (buckets[itemDay][key] || 0) + val;
                        });
                    }

                    setWeeklyData(buckets);
                } catch (e) {
                    console.error("Weekly load fail", e);
                }
            };
            fetchWeekly();
        }
    }, [viewMode, userId, totals]);

    const handleSaveTargets = async () => {
        setLoading(true);
        try {
            await saveProfile({
                ...userProfile,
                nutrition_targets: targets
            });
            setEditing(false);
            onUpdate(); // refresh profile in parent
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogMacro = async (type: 'calories' | 'protein' | 'carbs' | 'fat' | 'water', value: number, mode: 'add' | 'total' = 'add') => {
        if (value <= 0) return;
        setLoading(true);

        // Special case for water ID
        const habitId = type === 'water' ? 'habit_water' : `macro_${type}`;

        // Calculate diff if mode is 'total'
        let finalVal = value;
        let label = type === 'water' ? 'Water' : `Track ${type}`;

        if (mode === 'total') {
            const current = totals[habitId] || 0;
            if (value <= current) {
                // Technically valid to log 0 or negative diff? But simpler to ignore or warn.
                // For now, let's just log the diff if positive. if negative, we might need a "remove" logic which `logHabit` supports if backend handles it?
                // Actually `logHabit` usually adds. If we want to precise set, we currently just Add. 
                // So we can only "Set Total" if the new total is HIGHER. (MVP Limitation)
                console.warn("Cannot set total lower than current via this method yet.");
                setLoading(false);
                return;
            }
            finalVal = value - current;
            label = `${label} (Sync)`;
        }

        try {
            // 1. Log the Macro itself
            await logHabitAction(userId, habitId, finalVal, userProfile.bodyweight, label);

            // 2. Auto-Log Calories (4/4/9 Rule) - Skip for Water
            // ONLY if mode is 'add'. If 'total', we don't know the breakdown of the ADDED amount easily for cals 
            // unless we blindly apply 4/4/9 to the diff. Let's do that.
            if (type !== 'water') {
                let cals = 0;
                if (type === 'protein') cals = finalVal * 4;
                if (type === 'carbs') cals = finalVal * 4;
                if (type === 'fat') cals = finalVal * 9;

                if (cals > 0) {
                    // Log the calculated calories
                    await logHabitAction(userId, 'macro_calories', cals, userProfile.bodyweight, `Auto-Cal (${type})`);
                }
            }

            // Wait a moment for database to update before refreshing
            await new Promise(resolve => setTimeout(resolve, 500));

            // Note: Inputs cleared by Modal

            onUpdate();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // 🟢 Renders either valid daily bar or 7-segment weekly bar
    const renderBar = (label: string, macroKey: string, dailyTarget: number, baseColor: string, unit: string) => {

        if (viewMode === 'daily') {
            // --- DAILY VIEW (Single Bar) ---
            const filled = totals[macroKey] || 0;
            const percent = dailyTarget > 0 ? Math.min((filled / dailyTarget) * 100, 100) : 0;
            const isOver = filled > dailyTarget;
            const color = isOver ? (macroKey === 'habit_water' ? baseColor : 'text-red-500') : baseColor; // Don't turn red for water

            return (
                <div className="mb-3">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase mb-1">
                        <span>{label}</span>
                        <span className={color}>{Math.round(filled)} / {dailyTarget} {unit}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-500`} style={{ width: `${percent}%` }} />
                    </div>
                </div>
            );
        } else {
            // --- WEEKLY VIEW (Budget Bar with Hashmarks) ---
            const weeklyTarget = dailyTarget * 7;
            const actualTotal = Object.values(weeklyData).reduce((sum, dayData) => sum + (dayData[macroKey] || 0), 0);

            // Cap at 100% for the main bar width (unless we want it to overflow, better to stick to 100 and change color)
            const percent = weeklyTarget > 0 ? Math.min((actualTotal / weeklyTarget) * 100, 100) : 0;
            const isOver = actualTotal > weeklyTarget;

            // Base color for the bar
            let barColor = baseColor.replace('text-', 'bg-');
            if (isOver && macroKey !== 'habit_water') barColor = 'bg-red-500';

            // Markers for daily amounts (1/7, 2/7, 3/7, etc)
            const markers = [1, 2, 3, 4, 5, 6].map(i => (i / 7) * 100);

            return (
                <div className="mb-3">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase mb-1">
                        <span>{label}</span>
                        <span className={isOver && macroKey !== 'habit_water' ? 'text-red-500' : 'text-zinc-500'}>
                            {Math.round(actualTotal)} / {weeklyTarget} {unit}
                        </span>
                    </div>

                    <div className="h-4 w-full bg-zinc-800 rounded-sm overflow-hidden relative">
                        {/* Main Progress Bar */}
                        <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${percent}%` }} />

                        {/* Daily Markers (Hashmarks) */}
                        {markers.map((leftPct, i) => (
                            <div
                                key={i}
                                className="absolute top-0 bottom-0 w-[2px] bg-zinc-950/50 mix-blend-overlay z-10 pointer-events-none"
                                style={{ left: `${leftPct}%` }}
                            />
                        ))}
                    </div>
                    {/* Optional: Label underneath for "Day 1", "Day 2" etc if needed, sticking to minimal for now */}
                </div>
            )
        }
    };

    if (!hasTargets || editing) {
        return (
            <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl animate-fade-in-up">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-black text-white italic uppercase">🎯 Set Nutrition Goals</h4>
                    {hasTargets && <button onClick={() => setEditing(false)} className="text-xs text-zinc-500 hover:text-white">Cancel</button>}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase">Calories</label>
                        <input 
                            type="number" 
                            inputMode="numeric"
                            value={targets.calories} 
                            onChange={e => setTargets({ ...targets, calories: Number(e.target.value) })} 
                            className="w-full bg-black p-2 rounded text-white text-center font-bold outline-none border border-zinc-700 focus:border-green-500" 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase">Carbs (g)</label>
                        <input 
                            type="number" 
                            inputMode="numeric"
                            value={targets.carbs} 
                            onChange={e => setTargets({ ...targets, carbs: Number(e.target.value) })} 
                            className="w-full bg-black p-2 rounded text-white text-center font-bold outline-none border border-zinc-700 focus:border-orange-500" 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase">Fat (g)</label>
                        <input 
                            type="number" 
                            inputMode="numeric"
                            value={targets.fat} 
                            onChange={e => setTargets({ ...targets, fat: Number(e.target.value) })} 
                            className="w-full bg-black p-2 rounded text-white text-center font-bold outline-none border border-zinc-700 focus:border-yellow-500" 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase">Protein (g)</label>
                        <input 
                            type="number" 
                            inputMode="numeric"
                            value={targets.protein} 
                            onChange={e => setTargets({ ...targets, protein: Number(e.target.value) })} 
                            className="w-full bg-black p-2 rounded text-white text-center font-bold outline-none border border-zinc-700 focus:border-blue-500" 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase">Water (oz)</label>
                        <input 
                            type="number" 
                            inputMode="numeric"
                            value={targets.water || 100} 
                            onChange={e => setTargets({ ...targets, water: Number(e.target.value) })} 
                            className="w-full bg-black p-2 rounded text-white text-center font-bold outline-none border border-zinc-700 focus:border-cyan-500" 
                        />
                    </div>
                </div>
                <button onClick={handleSaveTargets} disabled={loading} className="w-full bg-zinc-100 hover:bg-white text-black font-black py-3 rounded text-xs uppercase tracking-wider">
                    {loading ? 'Saving...' : 'Save Goals'}
                </button>
            </div>
        );
    }

    // --- TRACKER VIEW ---
    return (
        <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl relative group">
            <button onClick={() => setEditing(true)} className="absolute top-2 right-2 p-3 text-[10px] text-zinc-600 hover:text-white transition">EDIT</button>

            <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-2">
                    <span>🥗</span> Nutrition
                </h4>

                <div className="flex items-center gap-2">
                    {/* LOG BUTTON */}
                    <button
                        onClick={() => setShowLogModal(true)}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-2 py-1 rounded transition-all"
                    >
                        <Plus size={12} /> Log
                    </button>

                    {/* VIEW TOGGLE */}
                    <div className="flex bg-black rounded-lg p-0.5 z-10">
                        <button onClick={() => setViewMode('daily')} className={`px-2 py-0.5 text-[10px] font-bold rounded ${viewMode === 'daily' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>DAILY</button>
                        <button onClick={() => setViewMode('weekly')} className={`px-2 py-0.5 text-[10px] font-bold rounded ${viewMode === 'weekly' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>WEEKLY</button>
                    </div>
                </div>
            </div>

            {/* PROGRESS BARS */}
            {renderBar(viewMode === 'daily' ? 'Calories' : 'Weekly Cals', 'macro_calories', targets.calories, 'text-green-500', 'kcal')}
            {renderBar('Carbs', 'macro_carbs', targets.carbs, 'text-orange-500', 'g')}
            {renderBar('Fat', 'macro_fat', targets.fat, 'text-yellow-500', 'g')}
            {renderBar('Protein', 'macro_protein', targets.protein, 'text-blue-500', 'g')}
            {renderBar('Water', 'habit_water', targets.water || 100, 'text-cyan-500', 'oz')}

            <MacroLogModal
                isOpen={showLogModal}
                onClose={() => setShowLogModal(false)}
                onLog={handleLogMacro}
                totals={totals}
            />
        </div>
    );
}
