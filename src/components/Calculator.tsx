"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import {
    calculateRank,
    getHistory,
    getPreviewRank,
    type RankResponse,
    type HistoryItem
} from '../services/api';
import RankCard from './RankCard';
import RankUpOverlay from './RankUpOverlay';
import InfoTooltip from './common/InfoTooltip';
import { THEMES } from '../data/themes';
import { useTheme } from '../context/ThemeContext';
import RankGauge from './RankGauge';

interface CalculatorProps {
    userId: string;
    bodyweight: number;
    sex: string;
    age: number;
    exercises: any[];
    onCalculate?: () => void;
    history?: any[];
    hideBanner?: boolean;
}

export default function Calculator({ userId, bodyweight, sex, age, exercises, onCalculate, hideBanner = false }: CalculatorProps) {

    // --- LOCAL STATE ---
    const [exerciseId, setExerciseId] = useState<string>('');
    const [resultValue, setResultValue] = useState<number>(0);
    const { currentTheme } = useTheme();

    // Time Inputs
    const [minutes, setMinutes] = useState<number>(0);
    const [seconds, setSeconds] = useState<number>(0);

    // Distance Input (for distance_time type)
    const [distanceValue, setDistanceValue] = useState<number>(0);

    // Async Data
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [rankData, setRankData] = useState<RankResponse | null>(null);
    const [nextGoal, setNextGoal] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Dropdown States
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Rank Up Celebration State
    const [rankUpDetails, setRankUpDetails] = useState<{
        name: string;
        image: string;
        description: string;
    } | null>(null);

    // --- HELPERS ---
    const formatDate = (isoString: string) => {
        if (!isoString) return '';
        const [year, month, day] = isoString.split('-');
        return `${month}-${day}-${year}`;
    };

    // --- INITIALIZATION ---
    useEffect(() => {
        if (userId) {
            getHistory(userId).then(setHistory);
        }
    }, [userId]);

    // --- DROPDOWN LOGIC ---
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredGroups = useMemo(() => {
        const groups: Record<string, any[]> = {};
        const filteredItems = exercises.filter(ex => (ex.displayName || ex.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

        filteredItems.forEach(ex => {
            const cat = ex.category || 'Other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(ex);
        });

        const orderedKeys = ["Strength", "Endurance & Speed", "Power & Capacity", "Plyometrics", "Olympic", "Mobility", "Cardio", "Lifestyle", "Other"];
        const sortedGroups: Record<string, any[]> = {};

        orderedKeys.forEach(key => { if (groups[key]) sortedGroups[key] = groups[key]; });
        Object.keys(groups).forEach(key => { if (!sortedGroups[key]) sortedGroups[key] = groups[key]; });

        return sortedGroups;
    }, [exercises, searchTerm]);

    const handleSelectExercise = (exercise: any) => {
        setExerciseId(exercise.id);
        setSearchTerm(exercise.displayName || exercise.name);
        setIsDropdownOpen(false);
        setRankData(null);
        setNextGoal(null);
        setResultValue(0);
        setMinutes(0);
        setSeconds(0);
        setDistanceValue(0);
    };

    const currentExercise = exercises.find(e => e.id === exerciseId);

    // Smart Unit Logic
    const standardUnit = currentExercise?.standards?.unit;
    const isTimeBased = standardUnit === 'seconds' || standardUnit === 'time' || currentExercise?.unit === 'time';
    const isDistanceTime = currentExercise?.type === 'distance_time';

    let unitLabel = 'Score';
    if (standardUnit === 'xBW') unitLabel = 'lbs';
    else if (standardUnit === 'watts') unitLabel = 'watts';
    else if (standardUnit === 'calories') unitLabel = 'cals';
    else if (standardUnit === 'meters') unitLabel = 'meters';
    else if (!standardUnit && currentExercise?.type === 'distance_time') unitLabel = 'Distance';
    else if (currentExercise?.unit) unitLabel = currentExercise.unit;

    // --- VISUALIZATION LOGIC ---
    const exerciseStats = useMemo(() => {
        if (!exerciseId || history.length === 0) return null;

        const logs = history.filter(h => h.exercise_id === exerciseId);
        if (logs.length === 0) return null;

        const scoring = currentExercise?.standards?.scoring || 'higher_is_better';

        const sortedForPB = [...logs].sort((a, b) => {
            if (a.level !== b.level) return b.level - a.level;
            const valA = parseFloat(a.value.replace(/[^0-9.]/g, '')) || 0;
            const valB = parseFloat(b.value.replace(/[^0-9.]/g, '')) || 0;
            if (scoring === 'lower_is_better') return valA - valB;
            return valB - valA;
        });

        const pb = sortedForPB[0];

        const recentLogs = [...logs]
            .sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (dateA !== dateB) return dateA - dateB;
                if (a.timestamp && b.timestamp && a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
                if (a.id && b.id) return a.id - b.id;
                return 0;
            })
            .slice(-7);

        const values = recentLogs.map(l => parseFloat(l.value.replace(/[^0-9.]/g, '')) || 0);
        const trueMax = Math.max(...values);
        const trueMin = Math.min(...values);
        const padding = (trueMax - trueMin) * 0.2 || (trueMax * 0.1) || 5;
        const graphMin = Math.max(0, trueMin - padding);
        const graphMax = trueMax + padding;
        const graphRange = graphMax - graphMin || 1;

        const points = values.map((val, index) => {
            const x = (index / (values.length - 1 || 1)) * 100;
            const normalized = (val - graphMin) / graphRange;
            const y = 100 - (normalized * 100);
            return `${x},${y}`;
        }).join(' ');

        const areaPoints = `${points} 100,120 0,120`;

        return { pb, recentLogs, graphMin, graphMax, graphRange, points, areaPoints };
    }, [exerciseId, history, currentExercise]);

    // --- NEXT GOAL LOGIC ---
    useEffect(() => {
        const fetchGoal = async () => {
            if (!exerciseId) { setNextGoal(null); return; }
            if (exerciseStats?.pb?.level === 5) { setNextGoal("MAX RANK ACHIEVED"); return; }

            setNextGoal(null);
            const valToCheck = exerciseStats?.pb ? (parseFloat(exerciseStats.pb.value.replace(/[^0-9.]/g, '')) || 0) : 0;

            try {
                const data = await getPreviewRank(exerciseId, valToCheck, age, sex, bodyweight);
                setNextGoal(data.next_milestone);
            } catch {
                setNextGoal("Grind to earn XP");
            }
        };

        const timer = setTimeout(fetchGoal, 300);
        return () => clearTimeout(timer);
    }, [exerciseId, exerciseStats, age, sex, bodyweight]);

    // --- AUTO-FILL PB ---
    useEffect(() => {
        const isEmpty = isTimeBased ? (minutes === 0 && seconds === 0) : (resultValue === 0);
        if (isEmpty && exerciseStats?.pb?.value) {
            const valStr = exerciseStats.pb.value;
            if (isTimeBased) {
                let m = 0; let s = 0;
                const mMatch = valStr.match(/(\d+)m/);
                if (mMatch) m = parseInt(mMatch[1]);
                const sMatch = valStr.match(/(\d+)s/);
                if (sMatch) s = parseInt(sMatch[1]);
                if (!mMatch && !sMatch) {
                    const clean = parseFloat(valStr.replace(/[^0-9.]/g, ''));
                    if (!isNaN(clean)) s = clean;
                }
                setMinutes(m);
                setSeconds(s);
            } else {
                const clean = parseFloat(valStr.replace(/[^0-9.]/g, ''));
                if (!isNaN(clean)) setResultValue(clean);
            }
        }
    }, [exerciseStats]);

    // --- CALCULATION HANDLER ---
    const handleCalculate = async () => {
        setIsLoading(true);
        try {
            let finalValue = resultValue;

            if (isDistanceTime) {
                finalValue = isTimeBased ? (minutes * 60) + seconds : distanceValue;
            } else if (isTimeBased) {
                finalValue = (minutes * 60) + seconds;
            }

            const calcAge = age > 0 ? age : 25;
            const calcWeight = bodyweight > 0 ? bodyweight : 150;

            const data = await calculateRank(exerciseId, finalValue, calcAge, sex, calcWeight, userId);
            setRankData(data);

            const newLevel = parseInt(data.rank_level.replace('level', '')) || 0;
            const previousBestLevel = exerciseStats?.pb?.level ?? -1;

            if (newLevel > previousBestLevel && newLevel > 0) {
                const themeDetails = getThemeDetails(data.rank_level);
                setRankUpDetails({
                    name: themeDetails.name,
                    image: getRankImage(data.rank_level),
                    description: themeDetails.description
                });
            }

            let formattedValue = `${resultValue}`;

            if (isDistanceTime) {
                const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                const distStr = `${distanceValue} ${unitLabel === 'Distance' ? 'miles' : unitLabel}`;
                formattedValue = isTimeBased ? `${timeStr} (${distStr})` : `${distStr} (${timeStr})`;
            } else if (isTimeBased) {
                formattedValue = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
            }

            const rankName = getThemeDetails(data.rank_level).name;
            const optimisticLog: HistoryItem = {
                exercise_id: exerciseId,
                date: new Date().toISOString().split('T')[0],
                value: formattedValue,
                level: newLevel,
                timestamp: Date.now(),
                rank_name: rankName
            };
            setHistory(prev => [...prev, optimisticLog]);

            setTimeout(() => {
                getHistory(userId).then(serverHistory => {
                    const isLogPresent = serverHistory.some(h =>
                        h.exercise_id === optimisticLog.exercise_id &&
                        Math.abs(h.timestamp - (optimisticLog.timestamp / 1000)) < 10
                    );
                    if (isLogPresent) {
                        setHistory(serverHistory);
                    } else {
                        const cleanHistory = serverHistory.filter(h => h.timestamp !== optimisticLog.timestamp);
                        setHistory([...cleanHistory, optimisticLog]);
                    }
                }).catch(err => console.error("Background history fetch failed", err));
            }, 1500);

            if (onCalculate) onCalculate();

        } catch (error) {
            console.error(error);
            alert("Could not connect to the backend.");
        } finally {
            setIsLoading(false);
        }
    };

    const getThemeDetails = (level: string) => {
        const theme = THEMES[currentTheme] || THEMES['dragon'];
        return theme.ranks[level as keyof typeof theme.ranks] || theme.ranks['level0'];
    };

    const getRankImage = (level: string) => {
        const rankDetails = getThemeDetails(level);
        if (sex === 'female' && rankDetails.femaleImage) return rankDetails.femaleImage;
        return rankDetails.image;
    };

    const getDisplayValue = () => {
        if (isTimeBased) {
            if (minutes > 0) return `${minutes}m ${seconds}s`;
            return `${seconds}s`;
        }
        return `${resultValue} ${unitLabel}`;
    };

    return (
        <div className="flex flex-col md:flex-row gap-8 items-start animate-fade-in-up">

            {/* --- LEFT COLUMN: INPUT FORM --- */}
            <section className="w-full md:w-1/2 bg-zinc-800/50 rounded-2xl border border-zinc-700/50 shadow-xl backdrop-blur-sm overflow-hidden">
                {!hideBanner && (
                    <div className="w-full relative bg-zinc-900 rounded-t-2xl overflow-hidden">
                        <img
                            src={`/themes/${currentTheme}/banner.png`}
                            alt="Banner"
                            className="w-full h-auto block"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-zinc-900/100 to-transparent"></div>
                    </div>
                )}

                <div className={`p-8 ${hideBanner ? '' : 'pt-4'}`}>
                    <div className="mb-8 p-4 bg-zinc-900 rounded-xl border border-zinc-700 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Player Stats</h3>
                                <p className="text-sm font-bold text-zinc-300">
                                    {age > 0 ? `${age} yrs` : 'Age: --'} • <span className="capitalize">{sex}</span> • {bodyweight > 0 ? `${bodyweight} lbs` : 'Weight: --'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span className="bg-orange-500 w-2 h-6 rounded-full inline-block"></span>
                        Log Performance
                    </h2>

                    <div className="mb-6 relative" ref={dropdownRef}>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Select Exercise</label>
                        <input
                            type="text"
                            value={searchTerm}
                            onClick={() => { setSearchTerm(''); setIsDropdownOpen(true); }}
                            onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
                            placeholder="Search exercises..."
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:border-orange-500 outline-none transition placeholder-zinc-600"
                        />
                        <div className="absolute right-3 bottom-3.5 pointer-events-none text-zinc-500">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z" /></svg>
                        </div>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-50 divide-y divide-zinc-800">
                                {Object.entries(filteredGroups).map(([category, items]) => (
                                    <div key={category}>
                                        <div className="sticky top-0 bg-zinc-950/90 backdrop-blur px-3 py-1 text-[10px] uppercase font-bold text-orange-500 tracking-wider border-b border-zinc-800">
                                            {category}
                                        </div>
                                        {items.map((ex) => (
                                            <div key={ex.id} onClick={() => handleSelectExercise(ex)} className="px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer transition-colors">
                                                {ex.displayName || ex.name}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                                {Object.keys(filteredGroups).length === 0 && (
                                    <div className="px-4 py-3 text-sm text-zinc-500 text-center">No exercises found.</div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mb-8 p-4 rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-transparent flex justify-between items-center relative overflow-hidden">
                        <div className="absolute left-0 top-0 w-1 h-full bg-orange-500"></div>
                        <div>
                            <div className="text-[10px] text-orange-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                                🎯 Current Objective
                            </div>
                            <div className={`text-lg font-black italic ${!nextGoal ? "text-zinc-500 animate-pulse" : "text-white"}`}>
                                {nextGoal || (exerciseId ? "Calculating..." : "Select Exercise")}
                            </div>
                            {exerciseStats?.pb ? (
                                <div className="text-[10px] text-zinc-500 font-mono mt-1">
                                    <span>Current PB: {exerciseStats.pb.value}</span>
                                </div>
                            ) : (
                                <div className="text-[10px] text-zinc-500 font-mono mt-1">No history yet.</div>
                            )}
                        </div>
                    </div>

                    <div className="mb-8">
                        {isDistanceTime ? (
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
                                        Distance
                                        <InfoTooltip text="Enter the distance covered (e.g. 1.5 for 1.5 miles)." />
                                    </label>
                                    <div className="flex gap-2 items-center">
                                        <input type="number" value={distanceValue || ''} onChange={(e) => setDistanceValue(Number(e.target.value))} placeholder="e.g. 1.0" className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-lg font-mono focus:border-orange-500 outline-none transition" />
                                        <span className="text-sm font-bold text-zinc-500">{unitLabel === 'Distance' ? 'Mi/Km' : unitLabel === 'meters' ? 'm' : unitLabel}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Time</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <input type="number" value={minutes || ''} onChange={(e) => setMinutes(Number(e.target.value))} placeholder="Min" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-lg font-mono focus:border-orange-500 outline-none transition text-center" />
                                            <span className="text-xs text-zinc-500 mt-1 block text-center">Minutes</span>
                                        </div>
                                        <div className="flex items-center text-xl font-bold text-zinc-600">:</div>
                                        <div className="flex-1">
                                            <input type="number" value={seconds || ''} onChange={(e) => setSeconds(Number(e.target.value))} placeholder="Sec" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-lg font-mono focus:border-orange-500 outline-none transition text-center" />
                                            <span className="text-xs text-zinc-500 mt-1 block text-center">Seconds</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : isTimeBased ? (
                            <div>
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
                                    Time Result
                                    <InfoTooltip text="Enter the time it took to complete the exercise / distance." />
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <input type="number" value={minutes || ''} onChange={(e) => setMinutes(Number(e.target.value))} placeholder="Min" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-lg font-mono focus:border-orange-500 outline-none transition text-center" />
                                        <span className="text-xs text-zinc-500 mt-1 block text-center">Minutes</span>
                                    </div>
                                    <div className="flex items-center text-xl font-bold text-zinc-600">:</div>
                                    <div className="flex-1">
                                        <input type="number" value={seconds || ''} onChange={(e) => setSeconds(Number(e.target.value))} placeholder="Sec" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-lg font-mono focus:border-orange-500 outline-none transition text-center" />
                                        <span className="text-xs text-zinc-500 mt-1 block text-center">Seconds</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
                                    {unitLabel === 'Distance' ? 'Distance (Miles/Km)' : `Result (${unitLabel})`}
                                    <InfoTooltip text="Enter your Lift Weight (lbs) or Score." />
                                </label>
                                <input type="number" value={resultValue || ''} onChange={(e) => setResultValue(Number(e.target.value))} placeholder={unitLabel === 'lbs' ? "e.g., 225" : "e.g., 50"} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white text-lg font-mono focus:border-orange-500 outline-none transition" />
                            </div>
                        )}
                    </div>

                    {currentExercise && (
                        <RankGauge
                            exercise={currentExercise}
                            value={isTimeBased ? (minutes * 60) + seconds : resultValue}
                            age={age}
                            sex={sex}
                            themeKey={currentTheme}
                            bodyweight={bodyweight}
                        />
                    )}

                    <div className="mt-6">
                        <button onClick={handleCalculate} disabled={isLoading || !exerciseId} className={`w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wider transition-all transform active:scale-95 shadow-lg ${isLoading || !exerciseId ? 'bg-zinc-600 cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white hover:shadow-orange-500/20'}`}>
                            {isLoading ? 'Calculating...' : 'Calculate Rank'}
                        </button>
                    </div>
                </div>
            </section>

            {/* --- RIGHT COLUMN: RESULTS & HISTORY --- */}
            <section className="w-full md:w-1/2 flex flex-col gap-6">
                {rankData && (
                    <div className="animate-fade-in-up w-full">
                        <RankCard
                            exerciseName={currentExercise?.displayName || currentExercise?.name || exerciseId}
                            resultValue={getDisplayValue()}
                            rankName={getThemeDetails(rankData.rank_level).name}
                            rankDescription={getThemeDetails(rankData.rank_level).description}
                            bodyweight={bodyweight ?? 185}
                            calculationDetails={rankData.description}
                            rankImage={getRankImage(rankData.rank_level)}
                            nextMilestone={rankData.next_milestone ?? undefined}
                        />
                    </div>
                )}

                {exerciseStats ? (() => {
                    const currentLog = exerciseStats.recentLogs[exerciseStats.recentLogs.length - 1];
                    return (
                        <div className="bg-zinc-800/50 rounded-2xl border border-zinc-700/50 p-6 shadow-xl backdrop-blur-sm animate-fade-in-up relative">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex gap-4 items-center">
                                    <img
                                        src={getRankImage(`level${currentLog.level}`)}
                                        alt="Current Rank"
                                        className="w-16 h-16 rounded-md object-cover border border-zinc-700 bg-zinc-900"
                                    />
                                    <div>
                                        <h3 className="text-lg font-bold text-white italic tracking-tight leading-none">RECENT PERFORMANCE</h3>
                                        <div className="flex items-center gap-2 mt-2 mb-1">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${currentLog.level >= 3 ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : currentLog.level >= 1 ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-900 text-zinc-600 border-zinc-800'}`}>
                                                Level {currentLog.level}
                                            </span>
                                            <span className="text-white font-bold text-sm">{currentLog.value}</span>
                                            <span className="text-[10px] text-zinc-500">({formatDate(currentLog.date)})</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">All-Time Best:</span>
                                            <span className="text-orange-400 font-bold text-xs">{exerciseStats.pb.value}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full h-40 relative">
                                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible pl-4">
                                    <defs>
                                        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor="#f97316" stopOpacity="0.5" />
                                            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <polygon points={exerciseStats.areaPoints} fill="url(#chartGradient)" />
                                    <polyline fill="none" stroke="#f97316" strokeWidth="2" points={exerciseStats.points} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                                    {exerciseStats.recentLogs.map((log, index) => {
                                        const val = parseFloat(log.value.replace(/[^0-9.]/g, '')) || 0;
                                        const x = (index / (exerciseStats.recentLogs.length - 1 || 1)) * 100;
                                        const normalized = (val - exerciseStats.graphMin) / exerciseStats.graphRange;
                                        const y = 100 - (normalized * 100);
                                        return <circle key={index} cx={x} cy={y} r="3" fill="#18181b" stroke="#f97316" strokeWidth="2" vectorEffect="non-scaling-stroke" />;
                                    })}
                                </svg>
                            </div>

                            <div className="flex justify-between mt-2 text-[10px] text-zinc-500 font-mono uppercase pl-4">
                                <span>{formatDate(exerciseStats.recentLogs[0]?.date)}</span>
                                <span>{formatDate(exerciseStats.recentLogs[exerciseStats.recentLogs.length - 1]?.date)}</span>
                            </div>
                        </div>
                    );
                })() : (
                    !rankData && (
                        <div className="h-64 w-full border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-600 p-8 text-center">
                            <span className="text-4xl mb-4 opacity-50">⏱️</span>
                            <p className="text-sm font-medium">Select an exercise to see your history.</p>
                        </div>
                    )
                )}
            </section>

            {rankUpDetails && (
                <RankUpOverlay
                    rankName={rankUpDetails.name}
                    rankImage={rankUpDetails.image}
                    rankDescription={rankUpDetails.description}
                    onClose={() => setRankUpDetails(null)}
                />
            )}
        </div>
    );
}
