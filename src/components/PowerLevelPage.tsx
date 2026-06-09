"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { THEMES } from '@/data/themes';
import { useTrophies } from '@/hooks/useTrophies';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { UserStats } from '@/types';

interface Props {
    userId: string;
    profile: any;
    history: any[];
    catalog: any[];
    stats: UserStats | null;
    pathExerciseIds: string[];
    percentile: number | null;
    powerHistory: { week_start: string; power_level: number }[];
}

// Map power level to a tier (0-5) using thresholds
// Tier 0: 0, Tier 1: 1-12, Tier 2: 13-24, Tier 3: 25-48, Tier 4: 49-96, Tier 5: 97+
import { TIER_THRESHOLDS, getTier } from '@/utils/calculations';
function getNextTierThreshold(powerLevel: number): number | null {
    const tier = getTier(powerLevel);
    if (tier >= 5) return null;
    return TIER_THRESHOLDS[tier + 1];
}

function formatExerciseName(id: string): string {
    return id.replace(/^(five_rm_|one_rm_|est_1rm_)/, '').replace(/_/g, ' ');
}

function formatThreshold(value: number, unit: string, bodyweight?: number): string {
    const lowerUnit = (unit || '').toLowerCase();
    if (lowerUnit === 'sec' || lowerUnit === 'seconds' || lowerUnit === 'time') {
        const min = Math.floor(value / 60);
        const sec = Math.round(value % 60);
        return `${min}:${String(sec).padStart(2, '0')}`;
    }
    if (lowerUnit === 'xbw' && bodyweight) {
        return `${Math.round(value * bodyweight)} lbs`;
    }
    return `${value}${lowerUnit === 'reps' ? '' : ' ' + unit}`;
}

function getStandardsForExercise(exercise: any, age: number, sex: string): number[] | null {
    if (!exercise?.standards?.brackets) return null;
    const sexKey = sex.toLowerCase() === 'female' ? 'female' : 'male';
    const brackets = exercise.standards.brackets[sexKey];
    if (!brackets) return null;
    const bracket = brackets.find((b: any) => age >= b.min && age <= b.max) || brackets[0];
    return bracket?.levels || null;
}

export default function PowerLevelPage({ userId, profile, history, catalog, stats, pathExerciseIds, percentile, powerHistory }: Props) {
    const themeKey = profile?.selected_theme || 'athlete';
    const theme = THEMES[themeKey] || THEMES['athlete'];
    const sex = profile?.sex || 'M';
    const age = profile?.age || 25;
    const powerLevel = stats?.power_level || 0;
    const maxPower = stats?.max_expertise || 0;

    const { groupedTrophies, categoryStats } = useTrophies(history, catalog);
    const pathSet = useMemo(() => new Set(pathExerciseIds), [pathExerciseIds]);

    // Compute per-exercise data with next-level thresholds
    const exerciseData = useMemo(() => {
        const catalogMap = new Map(catalog.map((c: any) => [c.id, c]));
        const allEntries = Object.values(groupedTrophies).flat();

        return allEntries.map(entry => {
            const cleanId = entry.exerciseId.replace(/^(five_rm_|one_rm_|est_1rm_)/, '');
            if (!pathSet.has(cleanId) && !pathSet.has(entry.exerciseId)) return null;
            const ex = catalogMap.get(cleanId) || catalogMap.get(entry.exerciseId);
            const levels = getStandardsForExercise(ex, age, sex);
            const currentLevel = entry.best?.level || 0;
            const nextThreshold = levels && currentLevel < 5 ? levels[currentLevel] : null;
            const unit = ex?.standards?.unit || 'Lbs';

            return {
                ...entry,
                displayName: ex?.name || formatExerciseName(entry.exerciseId),
                currentLevel,
                nextThreshold,
                unit,
                bestValue: entry.best?.raw_value || parseFloat(String(entry.best?.value).replace(/[^0-9.]/g, '')) || 0,
                // Partial progress: % between current threshold and next
                progressToNext: (() => {
                    if (!levels || currentLevel >= 5) return 100;
                    const currentThreshold = currentLevel > 0 ? levels[currentLevel - 1] : 0;
                    const nextT = levels[currentLevel];
                    if (!nextT) return 100;
                    const best = entry.best?.raw_value || parseFloat(String(entry.best?.value).replace(/[^0-9.]/g, '')) || 0;
                    const isXBW = (ex?.standards?.unit || '').toLowerCase() === 'xbw';
                    const scoring = ex?.standards?.scoring || 'higher_is_better';
                    let compareVal = isXBW ? best / (profile?.bodyweight || 180) : best;
                    if (scoring === 'lower_is_better') {
                        if (compareVal >= nextT) return 0;
                        return Math.min(Math.round(((currentThreshold - compareVal) / (currentThreshold - nextT)) * 100), 99);
                    }
                    if (compareVal <= currentThreshold) return 0;
                    return Math.min(Math.round(((compareVal - currentThreshold) / (nextT - currentThreshold)) * 100), 99);
                })(),
                // Gap to next threshold (raw value needed)
                gapToNext: (() => {
                    if (!levels || currentLevel >= 5) return null;
                    const nextT = levels[currentLevel];
                    if (!nextT) return null;
                    const best = entry.best?.raw_value || parseFloat(String(entry.best?.value).replace(/[^0-9.]/g, '')) || 0;
                    const isXBW = (ex?.standards?.unit || '').toLowerCase() === 'xbw';
                    const bw = profile?.bodyweight || 180;
                    const scoring = ex?.standards?.scoring || 'higher_is_better';
                    if (isXBW) return Math.round((nextT * bw) - best);
                    if (scoring === 'lower_is_better') return Math.round(best - nextT);
                    return Math.round(nextT - best);
                })(),
            };
        }).filter((x): x is NonNullable<typeof x> => x !== null).sort((a, b) => b.currentLevel - a.currentLevel || (b.bestValue as number) - (a.bestValue as number));
    }, [groupedTrophies, catalog, age, sex, pathSet]);

    // Tier calculation
    const tier = getTier(powerLevel);
    const nextTierThreshold = getNextTierThreshold(powerLevel);

    // Letter grade: A-F based on power level vs max possible
    const maxPossible = exerciseData.length * 5 || maxPower || 1;
    const powerPct = powerLevel / maxPossible;
    const letterGrade = powerPct >= 0.9 ? 'S' : powerPct >= 0.8 ? 'A' : powerPct >= 0.6 ? 'B' : powerPct >= 0.4 ? 'C' : powerPct >= 0.2 ? 'D' : 'F';

    // Easiest next level-up: exercise with highest progressToNext (closest to threshold)
    const easiestLevelUp = useMemo(() => {
        const candidates = exerciseData.filter(e => e.currentLevel < 5 && e.progressToNext < 100);
        if (candidates.length === 0) return null;
        return candidates.reduce((best, e) => e.progressToNext > best.progressToNext ? e : best);
    }, [exerciseData]);
    const rankKey = `level${tier}` as keyof typeof theme.ranks;
    const rank = theme.ranks[rankKey];
    const rankName = rank?.name?.split(': ')[1] || rank?.name || 'Unranked';
    const rankImage = (sex.toLowerCase() === 'female' && rank && 'femaleImage' in rank && rank.femaleImage) ? rank.femaleImage : rank?.image;
    const rankDesc = rank?.description || '';

    // Progress to next tier
    const prevThreshold = TIER_THRESHOLDS[tier] || 0;
    const tierProgress = nextTierThreshold
        ? ((powerLevel - prevThreshold) / (nextTierThreshold - prevThreshold)) * 100
        : 100;

    // Core lifts = top exercises by level
    const coreLiftCount = Math.min(6, exerciseData.length);
    const coreLiftData = exerciseData.slice(0, coreLiftCount);

    // Category breakdown
    const CATEGORIES = ['Strength', 'Endurance & Speed', 'Power & Capacity', 'Mobility'];
    const CAT_EMOJI: Record<string, string> = { 'Strength': '⚔️', 'Endurance & Speed': '🏃', 'Power & Capacity': '💥', 'Mobility': '🧘' };

    const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Back nav */}
            <Link href="/" className="text-xs text-zinc-500 hover:text-white transition flex items-center gap-1">
                ← Dashboard
            </Link>

            {/* === HERO === */}
            <div className={`relative rounded-2xl border border-zinc-800 overflow-hidden ${theme.colorClass || 'bg-zinc-900'}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />
                {/* Full-width rank image */}
                {rankImage && (
                    <div className="flex justify-center pt-4 px-4">
                        <Image src={rankImage} alt={rankName} width={280} height={280} className="object-contain drop-shadow-[0_0_30px_rgba(255,165,0,0.3)]" />
                    </div>
                )}
                {/* Score overlay at bottom */}
                <div className="relative px-4 pb-4 mt-2 text-center">
                    <div className="flex flex-col items-center">
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Power Level</div>
                        <div className={`text-5xl font-black italic leading-none bg-gradient-to-r ${theme.progressGradient || 'from-orange-500 to-red-500'} bg-clip-text text-transparent`}>
                            {powerLevel}
                            <span className="text-xl text-zinc-500 font-bold ml-1">/ {maxPower}</span>
                            <span className="text-lg font-black text-zinc-400 ml-2">{letterGrade}</span>
                        </div>
                        <div className={`text-sm font-black uppercase tracking-wider mt-1 bg-gradient-to-r ${theme.progressGradient || 'from-orange-500 to-red-500'} bg-clip-text text-transparent`}>
                            {rankName}
                        </div>
                        <p className="text-[9px] text-zinc-500 mt-0.5 max-w-[240px]">{rankDesc}</p>
                        {percentile !== null && (
                            <p className="text-[10px] font-bold text-orange-400 mt-2">Stronger than {percentile}% of athletes</p>
                        )}
                    </div>

                    {/* Progress to next tier */}
                    {nextTierThreshold && (
                        <div className="mt-3">
                            <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                                <span>{rankName}</span>
                                <span>{theme.ranks[`level${tier + 1}` as keyof typeof theme.ranks]?.name?.split(': ')[1] || 'Next'}</span>
                            </div>
                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full bg-gradient-to-r ${theme.progressGradient || 'from-orange-500 to-red-500'} transition-all duration-700`}
                                    style={{ width: `${Math.min(tierProgress, 100)}%` }}
                                />
                            </div>
                            <div className="text-[10px] text-zinc-600 mt-1">
                                {nextTierThreshold - powerLevel} more to reach {theme.ranks[`level${tier + 1}` as keyof typeof theme.ranks]?.name?.split(': ')[1]}
                            </div>
                        </div>
                    )}
                    {!nextTierThreshold && powerLevel > 0 && (
                        <div className="text-[10px] text-emerald-400 font-bold mt-3 uppercase">Max Tier Reached</div>
                    )}
                </div>
            </div>

            {/* === POWER LEVEL TREND === */}
            {powerHistory.length >= 2 && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Progress Over Time</div>
                    <div className="flex items-end gap-1 h-16">
                        {powerHistory.map((entry, i) => {
                            const maxVal = Math.max(...powerHistory.map(e => e.power_level), 1);
                            const pct = (entry.power_level / maxVal) * 100;
                            const isLast = i === powerHistory.length - 1;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-full rounded-t-sm overflow-hidden" style={{ height: `${Math.max(pct, 5)}%` }}>
                                        <div className={`w-full h-full ${isLast ? 'bg-orange-500' : 'bg-zinc-600'}`} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between text-[8px] text-zinc-600 mt-1">
                        <span>{new Date(powerHistory[0].week_start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span>{new Date(powerHistory[powerHistory.length - 1].week_start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    {powerHistory.length >= 2 && (() => {
                        const delta = powerHistory[powerHistory.length - 1].power_level - powerHistory[0].power_level;
                        return (
                            <div className={`text-[10px] font-bold mt-1 ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                                {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {delta > 0 ? '+' : ''}{delta} since {new Date(powerHistory[0].week_start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* === EASIEST LEVEL-UP === */}
            {easiestLevelUp && (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
                    <div className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">⚡ Easiest Next Level-Up</div>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-bold text-white">{easiestLevelUp.displayName}</div>
                            <div className="text-[11px] text-zinc-400">
                                Lv.{easiestLevelUp.currentLevel} → Lv.{easiestLevelUp.currentLevel + 1}
                                {easiestLevelUp.gapToNext !== null && (
                                    <span className="text-orange-400 ml-1">
                                        ({easiestLevelUp.gapToNext > 0 ? '+' : ''}{easiestLevelUp.gapToNext} {easiestLevelUp.unit} needed)
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-black text-orange-400">{easiestLevelUp.progressToNext}%</div>
                            <div className="text-[9px] text-zinc-500">to next level</div>
                        </div>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-gradient-to-r from-orange-600 to-amber-500 rounded-full" style={{ width: `${easiestLevelUp.progressToNext}%` }} />
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-1.5">
                        If you hit this, Power Level goes from {powerLevel} → {powerLevel + 1}
                    </div>
                </div>
            )}

            {/* === RANK LADDER === */}
            <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider mb-1">The Ranks</h2>
                <p className="text-[10px] text-zinc-600 mb-3">Your Power Level measures relative strength across all ranked exercises. As it grows, you ascend through the ranks.</p>
                <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2, 3, 4, 5].map(lvl => {
                        const key = `level${lvl}` as keyof typeof theme.ranks;
                        const r = theme.ranks[key];
                        if (!r) return null;
                        const name = r.name?.split(': ')[1] || r.name;
                        const img = (sex.toLowerCase() === 'female' && 'femaleImage' in r && r.femaleImage) ? r.femaleImage : r.image;
                        const isCurrent = lvl === tier;
                        const isLocked = lvl > tier;

                        return (
                            <div key={lvl} className={`rounded-xl border p-3 flex flex-col items-center text-center ${
                                isCurrent ? 'border-orange-500/50 bg-zinc-800/80' :
                                isLocked ? 'border-zinc-800/30 bg-zinc-900/30 opacity-40' :
                                'border-zinc-800/50 bg-zinc-900/50'
                            }`}>
                                {img && (
                                    <Image src={img} alt={name} width={56} height={56} className={`object-contain mb-1.5 ${isLocked ? 'grayscale' : ''}`} />
                                )}
                                <span className={`text-[10px] font-black uppercase leading-tight ${isCurrent ? 'text-white' : isLocked ? 'text-zinc-600' : 'text-zinc-400'}`}>{name}</span>
                                {isCurrent && <span className="text-[8px] font-bold text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded mt-1">YOU</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* === FULL BREAKDOWN === */}
            {exerciseData.length > 0 && <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider mb-1">Path Exercises</h2>
                <p className="text-[10px] text-zinc-600 mb-3">Your 12 ranked exercises by category</p>

                <div className="space-y-2">
                    {CATEGORIES.map(cat => {
                        const catExercises = exerciseData.filter(e => e.category === cat);
                        const catScore = catExercises.reduce((sum, e) => sum + e.currentLevel, 0);
                        const catMax = catExercises.length * 5;
                        const isExpanded = expandedCats[cat] || false;

                        // Also show untested ranked exercises in this category
                        const testedIds = new Set(catExercises.map(e => e.exerciseId.replace(/^(five_rm_|one_rm_|est_1rm_)/, '')));
                        const untestedInCat = catalog.filter((c: any) => {
                            if (!c.standards || !pathSet.has(c.id)) return false;
                            let displayCat = c.category || 'Strength';
                            if (['Strength','Chest','Back','Legs','Shoulders','Arms','Olympic','Abs & Core','Core','Gymnastics','Weightlifting'].includes(displayCat)) displayCat = 'Strength';
                            else if (['Endurance & Speed','Cardio','Endurance','Cardio & Conditioning'].includes(displayCat)) displayCat = 'Endurance & Speed';
                            else if (['Power & Capacity','Metcon','Power','Plyometrics'].includes(displayCat)) displayCat = 'Power & Capacity';
                            else if (['Mobility','Flexibility','Recovery'].includes(displayCat)) displayCat = 'Mobility';
                            return displayCat === cat && !testedIds.has(c.id);
                        });

                        return (
                            <div key={cat} className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden">
                                <button
                                    onClick={() => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }))}
                                    className="w-full flex items-center justify-between p-3"
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{CAT_EMOJI[cat] || '📊'}</span>
                                        <span className="text-xs font-bold text-white uppercase">{cat}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${catScore > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-800 text-zinc-600'}`}>
                                            {catScore}{catMax > 0 ? ` / ${catMax}` : ''}
                                        </span>
                                        <ChevronDown size={14} className={`text-zinc-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-zinc-800/50 px-3 pb-3 space-y-1.5 animate-fade-in">
                                        {catExercises.map(ex => {
                                            const levelKey = `level${ex.currentLevel}` as keyof typeof theme.ranks;
                                            const exRank = theme.ranks[levelKey];
                                            const exImage = (sex.toLowerCase() === 'female' && exRank && 'femaleImage' in exRank && exRank.femaleImage) ? exRank.femaleImage : exRank?.image;

                                            // Compute concrete targets for next rank
                                            let targetCombos: string[] = [];
                                            if (ex.nextThreshold && ex.unit !== 'Sec' && ex.unit !== 'sec' && ex.unit !== 'Reps' && ex.unit !== 'reps') {
                                                const cleanId = ex.exerciseId.replace(/^(five_rm_|one_rm_|est_1rm_)/, '');
                                                const catalogMap = new Map(catalog.map((c: any) => [c.id, c]));
                                                const catItem = catalogMap.get(cleanId) || catalogMap.get(ex.exerciseId);
                                                const normFactor = catItem?.normalization_factor || 1;
                                                const isXBW = (ex.unit || '').toLowerCase() === 'xbw';
                                                const bw = profile?.bodyweight || 180;
                                                const rawNeeded = isXBW ? ex.nextThreshold * bw : ex.nextThreshold;
                                                const targetEpley = rawNeeded / normFactor;
                                                for (const r of [3, 5, 8]) {
                                                    const w = Math.ceil(targetEpley / (1 + r / 30) / 5) * 5;
                                                    if (w > 0 && w < 1000) targetCombos.push(`${w}×${r}`);
                                                }
                                                targetCombos = [...new Set(targetCombos)];
                                            }

                                            return (
                                                <div key={ex.exerciseId} className="py-2">
                                                    <div className="flex items-center gap-2">
                                                        {exImage && <Image src={exImage} alt="" width={24} height={24} className="object-contain" />}
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-[11px] text-white truncate block">{ex.displayName}</span>
                                                            {targetCombos.length > 0 && (
                                                                <span className="text-[9px] text-zinc-600">Hit {targetCombos.join(' or ')} to rank up</span>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[10px] font-bold text-zinc-400">Lv.{ex.currentLevel}</span>
                                                            {ex.currentLevel < 5 && (
                                                                <div className="text-[8px] text-zinc-500">{ex.progressToNext}%</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Progress bar within level */}
                                                    {ex.currentLevel < 5 && (
                                                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mt-1.5 ml-8">
                                                            <div className={`h-full bg-gradient-to-r ${theme.progressGradient || 'from-orange-500 to-red-500'} rounded-full`} style={{ width: `${ex.progressToNext}%` }} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {untestedInCat.length > 0 && (
                                            <div className="pt-1.5 border-t border-zinc-800/30">
                                                <div className="text-[9px] text-zinc-600 uppercase font-bold mb-1">{untestedInCat.length} untested — up to +{untestedInCat.length * 5} potential</div>
                                                {untestedInCat.slice(0, 5).map((c: any) => (
                                                    <div key={c.id} className="flex items-center gap-2 py-1">
                                                        <span className="text-[10px] text-zinc-600 flex-1 truncate">{c.name || formatExerciseName(c.id)}</span>
                                                        <Link href={`/test?exercise=${encodeURIComponent(c.id)}`} className="text-[9px] text-zinc-400 hover:text-white font-bold">Test</Link>
                                                    </div>
                                                ))}
                                                {untestedInCat.length > 5 && (
                                                    <div className="text-[9px] text-zinc-700">+{untestedInCat.length - 5} more</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>}

            {/* === THRESHOLDS REFERENCE === */}
            {exerciseData.length > 0 && (
                <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-wider mb-1">Rank Thresholds</h2>
                    <p className="text-[10px] text-zinc-600 mb-3">What you need to hit for each level (age {age}, {sex.toLowerCase() === 'female' ? 'female' : 'male'})</p>
                    <p className="text-[9px] text-zinc-700 mb-4 italic">Your &quot;Best&quot; is calculated using the Epley formula: weight × (1 + reps/30). This estimates your 1RM from any set — so 185 lbs × 8 reps = 234 lbs estimated max.</p>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-zinc-800">
                                    <th className="text-left py-2 text-zinc-500 font-bold uppercase">Exercise</th>
                                    <th className="text-center py-2 text-zinc-500 font-bold">Best</th>
                                    <th className="text-center py-2 text-zinc-600">Lv.1</th>
                                    <th className="text-center py-2 text-zinc-600">Lv.2</th>
                                    <th className="text-center py-2 text-zinc-600">Lv.3</th>
                                    <th className="text-center py-2 text-zinc-600">Lv.4</th>
                                    <th className="text-center py-2 text-zinc-600">Lv.5</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const catalogMap = new Map(catalog.map((c: any) => [c.id, c]));
                                    return exerciseData.map(ex => {
                                        const cleanId = ex.exerciseId.replace(/^(five_rm_|one_rm_|est_1rm_)/, '');
                                        const catItem = catalogMap.get(cleanId) || catalogMap.get(ex.exerciseId);
                                        const levels = getStandardsForExercise(catItem, age, sex);
                                        if (!levels) return null;
                                        const unit = catItem?.standards?.unit || '';
                                        const unitLabel = unit === 'xBW' ? 'xBW' : unit === 'Sec' || unit === 'sec' || unit === 'seconds' ? 's' : unit === 'Reps' || unit === 'reps' ? '' : 'lbs';
                                        const isXBW = unit === 'xBW';
                                        const isTime = ['sec', 'seconds', 'time'].includes(unit.toLowerCase());
                                        const bw = profile?.bodyweight || 180;
                                        return (
                                            <tr key={ex.exerciseId} className="border-b border-zinc-800/50">
                                                <td className="py-2 text-white font-medium">{ex.displayName}</td>
                                                <td className="text-center py-2 text-orange-400 font-bold">{ex.bestValue ? (isXBW ? <><span>{Math.round(ex.bestValue)} lbs</span><div className="text-[8px] text-zinc-500 font-normal">e1RM</div></> : formatThreshold(ex.bestValue, unit, bw)) : '—'}</td>
                                                {levels.map((t: number, i: number) => (
                                                    <td key={i} className={`text-center py-2 font-mono ${ex.currentLevel > i ? 'text-emerald-400' : ex.currentLevel === i ? 'text-orange-400 font-bold' : 'text-zinc-600'}`}>
                                                        {isXBW ? <><div>{Math.round(t * bw)}</div><div className="text-[9px] opacity-50">{t}x</div></> : formatThreshold(t, unit, bw)}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    }).filter(Boolean);
                                })()}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-2">
                        {(() => {
                            const catalogMap = new Map(catalog.map((c: any) => [c.id, c]));
                            return exerciseData.map(ex => {
                                const cleanId = ex.exerciseId.replace(/^(five_rm_|one_rm_|est_1rm_)/, '');
                                const catItem = catalogMap.get(cleanId) || catalogMap.get(ex.exerciseId);
                                const levels = getStandardsForExercise(catItem, age, sex);
                                if (!levels) return null;
                                const unit = catItem?.standards?.unit || '';
                                const isXBW = unit === 'xBW';
                                const isTime = ['sec', 'seconds', 'time'].includes(unit.toLowerCase());
                                const bw = profile?.bodyweight || 180;
                                return (
                                    <div key={ex.exerciseId} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-white">{ex.displayName}</span>
                                            <span className="text-[10px] text-orange-400 font-bold">{ex.bestValue ? (isXBW ? `e1RM: ${Math.round(ex.bestValue)} lbs` : formatThreshold(ex.bestValue, unit, bw)) : '—'}</span>
                                        </div>
                                        <div className="grid grid-cols-5 gap-1">
                                            {levels.map((t: number, i: number) => (
                                                <div key={i} className={`text-center py-1.5 rounded-lg text-[10px] font-mono ${ex.currentLevel > i ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : ex.currentLevel === i ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-zinc-800/50 text-zinc-600 border border-zinc-800'}`}>
                                                    <div className="font-bold">{isTime ? formatThreshold(t, unit) : isXBW ? Math.round(t * bw) : t}</div>
                                                    <div className="text-[8px] opacity-60">{isXBW ? `${t}x` : `Lv.${i + 1}`}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }).filter(Boolean);
                        })()}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {exerciseData.length === 0 && (
                <div className="text-center py-8">
                    <div className="text-4xl mb-3">🏋️</div>
                    <h3 className="text-lg font-bold text-white mb-1">No Power Level Yet</h3>
                    <p className="text-xs text-zinc-500 mb-4">Log a ranked exercise to start building your Power Level</p>
                    <Link href="/train" className="inline-block px-6 py-3 bg-white text-black font-black rounded-xl text-xs uppercase tracking-wider hover:bg-zinc-200 transition">
                        Start Training
                    </Link>
                </div>
            )}
        </div>
    );
}
