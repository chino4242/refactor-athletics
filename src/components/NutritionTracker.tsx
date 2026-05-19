"use client";

import { useState, useEffect } from 'react';
import { saveProfile, getWeeklyProgress } from '../services/api';
import { logHabitAction, resetHabitTodayAction } from '@/app/actions';
import type { UserProfileData, NutritionTargets, HistoryItem } from '@/types';
import MacroLogModal from './MacroLogModal';
import ScreenshotUploader from './ScreenshotUploader';
import { Plus, Flame, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

interface NutritionTrackerProps {
    userId: string;
    userProfile: UserProfileData;
    totals: Record<string, number>;
    onUpdate: () => void;
    onLogHabit?: (habitId: string, value: number, label: string) => Promise<void>;
}

export default function NutritionTracker({ userId, userProfile, totals, onUpdate, onLogHabit }: NutritionTrackerProps) {
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    
    const defaultTargets = {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 65,
        water: 100
    };

    const [targets, setTargets] = useState<NutritionTargets>(() => {
        const saved = userProfile.nutrition_targets;
        if (saved && (saved.calories || saved.protein || saved.carbs || saved.fat)) {
            return { ...saved, water: saved.water || 100 };
        }
        return defaultTargets;
    });

    // Debug: Log totals to see what's actually there
    useEffect(() => {
    }, [totals, targets, userProfile.nutrition_targets]);



    // 🟢 NEW: Logging Mode for Macros
    const [showLogModal, setShowLogModal] = useState(false);
    const [burnInput, setBurnInput] = useState('');
    const [burnLoading, setBurnLoading] = useState(false);

    // Weekly State
    const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('weekly');
    const [weeklyData, setWeeklyData] = useState<Record<number, Record<string, number>>>({}); // Day Index -> Totals


    const hasTargets = !!(userProfile.nutrition_targets?.calories || userProfile.nutrition_targets?.protein);

    useEffect(() => {
        const saved = userProfile.nutrition_targets;
        if (saved && (saved.calories || saved.protein || saved.carbs || saved.fat)) {
            setTargets({ ...saved, water: saved.water || 100 });
        } else {
            setTargets(defaultTargets);
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
    }, [viewMode, userId, JSON.stringify(totals)]);

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

    const handleLogMacro = async (type: 'calories' | 'protein' | 'carbs' | 'fat' | 'water', value: number) => {
        if (value < 0) return;
        setLoading(true);

        // Special case for water ID
        const habitId = type === 'water' ? 'habit_water' : `macro_${type}`;

        // Always calculate diff for "Set Total" mode
        const current = totals[habitId] || 0;
        
        // If setting to exact same value, skip
        if (value === current) {
            setLoading(false);
            return;
        }
        
        // Calculate the difference (can be negative for adjustments)
        const finalVal = value - current;
        const label = type === 'water' ? 'Water' : `${type.charAt(0).toUpperCase() + type.slice(1)}`;

        try {
            // 1. Log the Macro itself (can be negative for adjustments)
            await logHabitAction(userId, habitId, finalVal, userProfile.bodyweight, label);

            // 2. Auto-Log Calories (4/4/9 Rule) - Skip for Water
            if (type !== 'water' && type !== 'calories') {
                let cals = 0;
                if (type === 'protein') cals = finalVal * 4;
                if (type === 'carbs') cals = finalVal * 4;
                if (type === 'fat') cals = finalVal * 9;

                if (cals !== 0) {
                    // Log the calculated calories (can be negative)
                    await logHabitAction(userId, 'macro_calories', cals, userProfile.bodyweight, `Auto-Cal (${type})`);
                }
            }

            // Wait a moment for database to update before refreshing
            await new Promise(resolve => setTimeout(resolve, 500));

            onUpdate();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogBurn = async () => {
        const val = Number(burnInput);
        if (!val || val <= 0) return;
        setBurnLoading(true);
        try {
            await logHabitAction(userId, 'macro_calories_burned', val, userProfile.bodyweight, 'Calories Burned');
            await new Promise(resolve => setTimeout(resolve, 500));
            onUpdate();
            setBurnInput('');
        } catch (e) {
            console.error(e);
        } finally {
            setBurnLoading(false);
        }
    };

    const handleFitnessData = async (data: any) => {
        try {
            // Populate input for review — don't auto-log calories burned
            if (data.calories_burned && data.calories_burned > 0) {
                setBurnInput(String(Math.round(data.calories_burned)));
            }
            if (data.steps && data.steps > 0 && onLogHabit) {
                await onLogHabit('habit_steps', data.steps, 'Steps');
            }
            if (data.day_strain && data.day_strain > 0 && onLogHabit) {
                await onLogHabit('habit_day_strain', data.day_strain, 'Day Strain');
            }
            onUpdate();
        } catch (e) {
            console.error('Error logging fitness data:', e);
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
                    <div className="flex justify-between text-xs font-bold text-zinc-400 uppercase mb-1">
                        <span>{label}</span>
                        <div className="flex items-center gap-2">
                            <span className={color}>{Math.round(filled)} / {dailyTarget} {unit}</span>
                            {filled > 0 && (
                                <button onClick={async () => { await resetHabitTodayAction(userId, macroKey); onUpdate(); }} className="text-zinc-600 hover:text-red-400 transition" title="Reset today">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-500`} 
                            style={{ width: `${percent}%` }} 
                        />
                    </div>
                </div>
            );
        } else {
            // --- WEEKLY VIEW (Budget Bar with Per-Day Segments) ---
            const weeklyTarget = dailyTarget * 7;
            const dayIndices = [1, 2, 3, 4, 5, 6, 0]; // Mon=1 ... Sun=0
            const today = new Date().getDay(); // 0-6
            const todayPos = dayIndices.indexOf(today);

            const dayAmounts = dayIndices.map(dayIdx => {
                const dayData = weeklyData[dayIdx] || {};
                return dayData[macroKey] || 0;
            });
            const actualTotal = dayAmounts.reduce((sum, v) => sum + v, 0);
            const daysTracked = dayAmounts.slice(0, todayPos + 1).filter(v => v > 0).length;
            const dailyAvg = daysTracked > 0 ? Math.round(actualTotal / daysTracked) : 0;
            const isOver = actualTotal > weeklyTarget && macroKey !== 'habit_water';

            // Color hex values for segments
            const colorMap: Record<string, [string, string]> = {
                'text-green-500': ['#22c55e', '#16a34a'],
                'text-orange-500': ['#f97316', '#c2410c'],
                'text-yellow-500': ['#eab308', '#a16207'],
                'text-blue-500': ['#3b82f6', '#1d4ed8'],
                'text-cyan-500': ['#06b6d4', '#0e7490'],
                'text-red-500': ['#ef4444', '#b91c1c'],
            };
            const [todayColor, pastColor] = isOver ? ['#ef4444', '#b91c1c'] : (colorMap[baseColor] || ['#71717a', '#52525b']);

            return (
                <div className="mb-3">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase mb-1">
                        <span>{label} {daysTracked > 0 && <span className="text-zinc-500 normal-case font-normal">· {dailyAvg}{unit}/day avg</span>}</span>
                        <span className={isOver ? 'text-red-500' : 'text-zinc-500'}>
                            {Math.round(actualTotal)} / {weeklyTarget} {unit}
                        </span>
                    </div>

                    <div className="h-5 w-full bg-zinc-800 rounded-sm overflow-hidden relative flex">
                        {dayAmounts.map((amount, i) => {
                            if (i > todayPos || amount <= 0) return null;
                            const widthPct = weeklyTarget > 0 ? (amount / weeklyTarget) * 100 : 0;
                            const isToday = i === todayPos;
                            return (
                                <div
                                    key={i}
                                    className="h-full transition-all duration-500"
                                    style={{
                                        width: `${widthPct}%`,
                                        backgroundColor: isToday ? todayColor : pastColor,
                                        borderRight: i < todayPos && amount > 0 ? '1px solid rgba(0,0,0,0.3)' : undefined,
                                    }}
                                />
                            );
                        })}
                        {/* Daily Hashmarks */}
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div
                                key={`h${i}`}
                                className="absolute top-0 bottom-0 w-[1px] bg-zinc-600/60 pointer-events-none"
                                style={{ left: `${(i / 7) * 100}%` }}
                            />
                        ))}
                    </div>
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
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase">🔥 Burn Target</label>
                        <input 
                            type="number" 
                            inputMode="numeric"
                            value={targets.calories_burned || 2500} 
                            onChange={e => setTargets({ ...targets, calories_burned: Number(e.target.value) })} 
                            className="w-full bg-black p-2 rounded text-white text-center font-bold outline-none border border-zinc-700 focus:border-red-500" 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase">Net Cal Target</label>
                        <input 
                            type="number" 
                            inputMode="numeric"
                            value={targets.net_calorie_target || -500} 
                            onChange={e => setTargets({ ...targets, net_calorie_target: Number(e.target.value) })} 
                            className="w-full bg-black p-2 rounded text-white text-center font-bold outline-none border border-zinc-700 focus:border-purple-500" 
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
        <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl">

            <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-black text-white italic uppercase flex items-center gap-2">
                    <span>🥗</span> Nutrition
                    <button onClick={() => setEditing(true)} className="text-[10px] font-bold text-zinc-500 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded transition not-italic tracking-wider">EDIT</button>
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
            <div key={JSON.stringify(totals)}>
                {renderBar('Calories', 'macro_calories', targets.calories, 'text-green-500', 'kcal')}
                {renderBar('Carbs', 'macro_carbs', targets.carbs, 'text-orange-500', 'g')}
                {renderBar('Fat', 'macro_fat', targets.fat, 'text-yellow-500', 'g')}
                {renderBar('Protein', 'macro_protein', targets.protein, 'text-blue-500', 'g')}
                {renderBar('Water', 'habit_water', targets.water || 100, 'text-cyan-500', 'oz')}
            </div>

            {/* CALORIES BURNED INPUT */}
            {viewMode === 'daily' && (
                <div className="mt-3 p-3 bg-zinc-950/50 border border-zinc-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-1">
                            <Flame size={12} className="text-red-500" /> Calories Burned
                        </span>
                        <span className="text-xs font-bold text-red-400 flex items-center gap-2">
                            {Math.round(totals['macro_calories_burned'] || 0)} / {targets.calories_burned || 2500} kcal
                            {(totals['macro_calories_burned'] || 0) > 0 && (
                                <button onClick={async () => { await resetHabitTodayAction(userId, 'macro_calories_burned'); onUpdate(); }} className="text-zinc-600 hover:text-red-400 transition" title="Reset today">
                                    <X size={12} />
                                </button>
                            )}
                        </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mb-2">
                        <div 
                            className="h-full bg-red-500 transition-all duration-500" 
                            style={{ width: `${Math.min(((totals['macro_calories_burned'] || 0) / (targets.calories_burned || 2500)) * 100, 100)}%` }} 
                        />
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            inputMode="numeric"
                            value={burnInput}
                            onChange={e => setBurnInput(e.target.value)}
                            placeholder={String(totals['macro_calories_burned'] || 0)}
                            className="flex-1 min-w-0 bg-zinc-900 rounded-lg p-2 text-sm text-white text-center outline-none border border-zinc-800 focus:border-red-500 transition font-bold placeholder:text-zinc-700"
                        />
                        <ScreenshotUploader type="fitness" userId={userId} onDataExtracted={handleFitnessData} />
                        <button
                            onClick={handleLogBurn}
                            disabled={burnLoading || !burnInput}
                            className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 rounded-lg font-black uppercase tracking-wide transition disabled:opacity-50"
                        >
                            {burnLoading ? '...' : 'Set'}
                        </button>
                    </div>
                </div>
            )}

            {/* NET CALORIE SUMMARY */}
            {(() => {
                const caloriesIn = totals['macro_calories'] || 0;
                const caloriesBurned = totals['macro_calories_burned'] || 0;
                const netTarget = targets.net_calorie_target || -500;

                if (viewMode === 'daily') {
                    const net = Math.round(caloriesIn - caloriesBurned);
                    const onTarget = net <= netTarget;
                    return (
                        <div className={`mt-3 p-3 rounded-lg border ${onTarget ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-zinc-950/50 border-zinc-800'}`}>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold uppercase text-zinc-400">Net Calories</span>
                                <div className="text-right">
                                    <span className={`text-lg font-black ${net <= 0 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                        {net > 0 ? '+' : ''}{net}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 ml-1">/ {netTarget} kcal</span>
                                </div>
                            </div>
                            <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                                <span>In: {Math.round(caloriesIn)}</span>
                                <span>Burned: {Math.round(caloriesBurned)}</span>
                                <span className={onTarget ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                                    {onTarget ? '✓ On Target' : `${Math.round(net - netTarget)} over`}
                                </span>
                            </div>
                        </div>
                    );
                } else {
                    // Weekly chart
                    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    const dayIndices = [1, 2, 3, 4, 5, 6, 0]; // Mon=1 ... Sun=0
                    const today = new Date().getDay();
                    const todayPos = dayIndices.indexOf(today);
                    const chartData = dayIndices.map((dayIdx, i) => {
                        const dayData = weeklyData[dayIdx] || {};
                        const dayIn = dayData['macro_calories'] || 0;
                        const dayBurn = dayData['macro_calories_burned'] || 0;
                        const isFuture = i > todayPos;
                        return { name: dayLabels[i], net: isFuture ? null : Math.round(dayIn - dayBurn), isFuture };
                    });
                    const weeklyNet = chartData.reduce((sum, d) => sum + (d.net || 0), 0);

                    return (
                        <div className="mt-3 p-3 bg-zinc-950/50 border border-zinc-800 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold uppercase text-zinc-400">Weekly Net Calories</span>
                                <span className={`text-sm font-black ${weeklyNet <= netTarget * 7 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                    {weeklyNet > 0 ? '+' : ''}{weeklyNet} kcal
                                </span>
                            </div>
                            <div className="h-40 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis hide />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px' }}
                                            itemStyle={{ color: '#fff' }}
                                            labelStyle={{ color: '#a1a1aa' }}
                                            formatter={(value: any) => [`${value} kcal`, 'Net']}
                                        />
                                        <ReferenceLine y={netTarget} stroke="#6b21a8" strokeDasharray="4 4" label={{ value: 'Target', fill: '#6b21a8', fontSize: 10, position: 'right' }} />
                                        <ReferenceLine y={0} stroke="#3f3f46" />
                                        <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={index} fill={entry.isFuture ? '#27272a' : entry.net! <= netTarget ? '#10b981' : entry.net! <= 0 ? '#22d3ee' : '#ef4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    );
                }
            })()}

            <MacroLogModal
                isOpen={showLogModal}
                onClose={() => setShowLogModal(false)}
                onLog={handleLogMacro}
                totals={totals}
                userId={userId}
            />
        </div>
    );
}
