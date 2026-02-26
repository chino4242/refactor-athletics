import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { THEMES } from '../data/themes';

interface RankGaugeProps {
    exercise: any;
    value: number;
    age: number;
    sex: string;
    themeKey: string;
    bodyweight: number;
}

export default function RankGauge({ exercise, value, age, sex, themeKey, bodyweight }: RankGaugeProps) {

    // 1. EXTRACT BENCHMARKS based on Age/Sex
    const benchmarks = useMemo(() => {
        if (!exercise || !exercise.standards || !exercise.standards.brackets) return null;

        const sexKey = sex.toLowerCase() === 'female' ? 'female' : 'male';
        const brackets = exercise.standards.brackets[sexKey];

        if (!brackets) return null;

        const userAge = age > 0 ? age : 25;
        const bracket = brackets.find((b: any) => userAge >= b.min && userAge <= b.max);

        if (!bracket) {
            if (userAge > 99) return brackets[brackets.length - 1].levels;
            return brackets[0].levels;
        }

        return bracket.levels;
    }, [exercise, age, sex]);

    // 2. GET THEME RANKS
    const themeRanks = useMemo(() => {
        const theme = THEMES[themeKey] || THEMES['athlete'];
        return [
            theme.ranks.level1.name.split(':')[1].trim(),
            theme.ranks.level2.name.split(':')[1].trim(),
            theme.ranks.level3.name.split(':')[1].trim(),
            theme.ranks.level4.name.split(':')[1].trim(),
            theme.ranks.level5.name.split(':')[1].trim(),
        ];
    }, [themeKey]);

    if (!benchmarks) return null;

    // 3. HELPERS FOR DISPLAY
    const isXBW = exercise.standards?.unit === 'xBW';
    const unitLabel = isXBW ? 'lbs' : (exercise.standards?.unit || '');

    // 4. PIECEWISE INTERPOLATION W/ FIXED MARKERS
    const scoring = exercise.standards?.scoring || 'higher_is_better';

    // NORMALIZE BENCHMARKS (Handle xBW conversion for calculation)
    const normalizedBenchmarks = useMemo(() => {
        if (!benchmarks) return [];
        if (isXBW) {
            return benchmarks.map((b: number) => b * bodyweight);
        }
        return benchmarks;
    }, [benchmarks, isXBW, bodyweight]);

    const formatValue = (val: number) => {
        // Val is already normalized to Lbs/Time by the above logic
        // Just round it for display
        return Math.round(val);
    };

    // Fixed visual positions for levels 1-5 (0 is start)
    const MARKERS = [20, 40, 60, 80, 100];

    let progressPercent = 0;

    // Buckets: Start->L1, L1->L2, L2->L3, L3->L4, L4->L5, L5->MAX
    const checkBetter = (a: number, b: number) => scoring === 'higher_is_better' ? a >= b : a <= b;

    // 5. CALCULATE MILESTONES
    let startValue = 0;
    if (scoring === 'lower_is_better') {
        startValue = normalizedBenchmarks[0] * 1.5;
    }

    // Combine into a sorted array of "Milestones"
    const milestones = [startValue, ...normalizedBenchmarks];

    // Corresponding visual percentages
    const visualStops = [0, 20, 40, 60, 80, 100];

    // Find where user sits
    let lowerIndex = -1;

    for (let i = 0; i < milestones.length - 1; i++) {
        const lower = milestones[i];
        const upper = milestones[i + 1];

        if (scoring === 'higher_is_better') {
            if (value >= lower && value < upper) {
                lowerIndex = i;
                break;
            }
        } else { // Lower is better
            // "Lower" (Start) is actually a HIGHER number than "Upper"
            if (value <= lower && value > upper) {
                lowerIndex = i;
                break;
            }
        }
    }

    // Handle Edge Cases based on scale direction
    if (scoring === 'higher_is_better') {
        if (value >= milestones[5]) {        // Above Level 5
            progressPercent = 100;
        } else if (value < startValue) {     // Below Start
            progressPercent = 0;
        } else if (lowerIndex !== -1) {      // Interpolate
            const rangeStart = milestones[lowerIndex];
            const rangeEnd = milestones[lowerIndex + 1]; // This is now safe
            const rangeDist = rangeEnd - rangeStart;
            const valDist = value - rangeStart;

            const percentStart = visualStops[lowerIndex];
            const percentDist = 20; // Fixed 20% jumps

            progressPercent = percentStart + ((valDist / rangeDist) * percentDist);
        }
    } else {
        // Lower is better (Time, Speed)
        if (value <= 0) {                    // Empty / Zero check
            progressPercent = 0;
        } else if (value <= milestones[5]) { // Faster than Level 5 (Value is smaller)
            progressPercent = 100;
        } else if (value > startValue) {     // Slower than start (Value is larger)
            progressPercent = 0;
        } else if (lowerIndex !== -1) {      // Interpolate
            const rangeStart = milestones[lowerIndex];
            const rangeEnd = milestones[lowerIndex + 1];

            const totalDiff = rangeStart - rangeEnd;
            const myDiff = rangeStart - value;

            const percentStart = visualStops[lowerIndex];
            const percentDist = 20;

            progressPercent = percentStart + ((myDiff / totalDiff) * percentDist);
        }
    }

    progressPercent = Math.min(100, Math.max(0, progressPercent));

    return (
        <div className="bg-black/20 rounded-xl p-4 border border-white/10 mt-4">
            <div className="flex justify-between items-end mb-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Rank Progress</h4>
                <div className="text-xs font-mono font-bold text-orange-400">
                    {value > 0 ? (
                        <span>{Math.round(value)} <span className="text-xs text-zinc-500">{unitLabel}</span></span>
                    ) : '--'}
                    {isXBW && value > 0 && bodyweight > 0 && <span className="ml-1 text-[10px] text-zinc-600">({(value / bodyweight).toFixed(2)}x)</span>}
                </div>
            </div>

            {/* BAR CONTAINER */}
            <div className="h-4 w-full bg-zinc-800 rounded-full relative overflow-visible mt-4 mb-6">
                {/* BACKGROUND TRACK */}
                <div className="absolute top-0 bottom-0 left-0 right-0 bg-zinc-800 rounded-full overflow-hidden">
                    {/* FILL BAR */}
                    <motion.div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-900 to-orange-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ type: "spring", damping: 20 }}
                    />
                </div>

                {/* FIXED SEGMENT MARKERS (20, 40, 60, 80, 100) */}
                {MARKERS.map((pos, i) => {
                    const benchmarkVal = normalizedBenchmarks[i];
                    const isAchieved = checkBetter(value, benchmarkVal);
                    // Is this the NEXT immediate goal?
                    // Current index i is goal if: NOT achieved AND (i==0 OR prev achieved)
                    const prevAchieved = i === 0 ? true : checkBetter(value, normalizedBenchmarks[i - 1]);
                    const isNextGoal = !isAchieved && prevAchieved;

                    // COLLISION DETECTION: Hide label if user is very close (within 8%)
                    const isCloseToUser = Math.abs(pos - progressPercent) < 8;

                    // READABILITY: Only show Rank Name for:
                    // 1. The Next Immediate Goal
                    // 2. The Final Goal (Max Rank)
                    // 3. Or if we are at the start (Level 1) and haven't achieved anything yet

                    // Logic: Show Name IF (isNextGoal) OR (i === 4). 
                    // If we haven't achieved ANYTHING, show Level 1 (i=0).
                    const showRankName = isNextGoal || i === 4 || (i === 0 && !normalizedBenchmarks.some((b: number) => checkBetter(value, b)));

                    return (
                        <div key={i} className="absolute top-[-4px] bottom-[-4px] flex flex-col items-center group" style={{ left: `${pos}%` }}>
                            {/* Tick Line */}
                            <div className={`w-0.5 h-full z-10 transition-colors ${isAchieved ? 'bg-white' : 'bg-zinc-600'}`}></div>

                            {/* Top Label (Rank Name) - Cleaned Up */}
                            <div className={`absolute bottom-full mb-2 text-[7px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 items-center flex flex-col ${showRankName ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'} ${isAchieved ? 'text-orange-400' : 'text-zinc-600'}`}>
                                <span>{themeRanks[i]}</span>
                                {isNextGoal && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-0.5 animate-bounce"></div>}
                            </div>

                            {/* Bottom Label (Value) - Hidden on collision */}
                            <div className={`absolute top-full mt-2 text-[9px] font-mono font-bold whitespace-nowrap transition-opacity ${isCloseToUser ? 'opacity-0' : 'opacity-100'} ${isAchieved ? 'text-white' : 'text-zinc-500'}`}>
                                {formatValue(benchmarkVal)}
                            </div>
                        </div>
                    );
                })}

                {/* Current User Marker */}
                <motion.div
                    className="absolute top-[-6px] w-0.5 h-[calc(100%+12px)] bg-white z-20 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    initial={{ left: '0%' }}
                    animate={{ left: `${progressPercent}%` }}
                    transition={{ type: "spring", damping: 20 }}
                >
                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-white text-black px-1 rounded z-30">YOU</div>
                </motion.div>
            </div>
        </div>
    );
}
