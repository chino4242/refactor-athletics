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
}

// Map power level to a tier (0-5) using thresholds
// Tier 0: 0, Tier 1: 1-12, Tier 2: 13-24, Tier 3: 25-48, Tier 4: 49-96, Tier 5: 97+
const TIER_THRESHOLDS = [0, 1, 13, 25, 49, 97];
function getTier(powerLevel: number): number {
    for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
        if (powerLevel >= TIER_THRESHOLDS[i]) return i;
    }
    return 0;
}
function getNextTierThreshold(powerLevel: number): number | null {
    const tier = getTier(powerLevel);
    if (tier >= 5) return null;
    return TIER_THRESHOLDS[tier + 1];
}

function formatExerciseName(id: string): string {
    return id.replace(/^(five_rm_|one_rm_|est_1rm_)/, '').replace(/_/g, ' ');
}

function getStandardsForExercise(exercise: any, age: number, sex: string): number[] | null {
    if (!exercise?.standards?.brackets) return null;
    const sexKey = sex.toLowerCase() === 'female' ? 'female' : 'male';
    const brackets = exercise.standards.brackets[sexKey];
    if (!brackets) return null;
    const bracket = brackets.find((b: any) => age >= b.min && age <= b.max) || brackets[0];
    return bracket?.levels || null;
}

export default function PowerLevelPage({ userId, profile, history, catalog, stats }: Props) {
    const themeKey = profile?.selected_theme || 'athlete';
    const theme = THEMES[themeKey] || THEMES['athlete'];
    const sex = profile?.sex || 'M';
    const age = profile?.age || 25;
    const powerLevel = stats?.power_level || 0;
    const maxPower = stats?.max_expertise || 0;

    const { groupedTrophies, categoryStats } = useTrophies(history, catalog);

    // Compute per-exercise data with next-level thresholds
    const exerciseData = useMemo(() => {
        const catalogMap = new Map(catalog.map((c: any) => [c.id, c]));
        const allEntries = Object.values(groupedTrophies).flat();

        return allEntries.map(entry => {
            const cleanId = entry.exerciseId.replace(/^(five_rm_|one_rm_|est_1rm_)/, '');
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
                bestValue: entry.best?.value || entry.best?.raw_value || 0,
            };
        }).sort((a, b) => b.currentLevel - a.currentLevel || (b.bestValue as number) - (a.bestValue as number));
    }, [groupedTrophies, catalog, age, sex]);

    // Tier calculation
    const tier = getTier(powerLevel);
    const nextTierThreshold = getNextTierThreshold(powerLevel);
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
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
                <div className="relative p-6 flex flex-col items-center text-center">
                    {/* Rank image */}
                    {rankImage && (
                        <div className="w-44 h-44 mb-3">
                            <Image src={rankImage} alt={rankName} width={176} height={176} className="object-contain drop-shadow-[0_0_20px_rgba(255,165,0,0.3)]" />
                        </div>
                    )}

                    {/* Title */}
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Power Level</div>
                    <div className={`text-6xl font-black italic bg-gradient-to-r ${theme.progressGradient || 'from-orange-500 to-red-500'} bg-clip-text text-transparent`}>
                        {powerLevel}
                    </div>
                    <div className="text-lg text-zinc-500 font-bold">/ {maxPower}</div>

                    {/* Rank name + description */}
                    <div className="mt-3">
                        <div className={`text-lg font-black uppercase tracking-wider bg-gradient-to-r ${theme.progressGradient || 'from-orange-500 to-red-500'} bg-clip-text text-transparent`}>
                            {rankName}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">{rankDesc}</p>
                    </div>

                    {/* Progress to next tier */}
                    {nextTierThreshold && (
                        <div className="w-full mt-4">
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

            {/* === CORE LIFTS === */}
            {coreLiftData.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-wider">Core Lifts</h2>
                            <p className="text-[10px] text-zinc-600">Your top exercises driving your Power Level</p>
                        </div>
                        <Link href="/test" className="text-[10px] text-orange-500 hover:text-orange-400 font-bold flex items-center gap-0.5">
                            Test <ChevronRight size={12} />
                        </Link>
                    </div>
                    <div className="space-y-2">
                        {coreLiftData.map(ex => {
                            const levelKey = `level${ex.currentLevel}` as keyof typeof theme.ranks;
                            const exRank = theme.ranks[levelKey];
                            const exImage = (sex.toLowerCase() === 'female' && exRank && 'femaleImage' in exRank && exRank.femaleImage) ? exRank.femaleImage : exRank?.image;
                            const exRankName = exRank?.name?.split(': ')[1] || 'Unranked';

                            return (
                                <div key={ex.exerciseId} className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                    {exImage && (
                                        <Image src={exImage} alt={exRankName} width={40} height={40} className="object-contain flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white truncate">{ex.displayName}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ex.currentLevel >= 4 ? 'bg-orange-500/20 text-orange-400' : ex.currentLevel >= 2 ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-800 text-zinc-500'}`}>
                                                Lv.{ex.currentLevel}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <span className="text-[10px] text-zinc-500">{exRankName}</span>
                                            {ex.nextThreshold && (
                                                <span className="text-[10px] text-zinc-600">
                                                    Next: <span className="text-zinc-400 font-bold">{ex.nextThreshold} {ex.unit}</span>
                                                </span>
                                            )}
                                            {!ex.nextThreshold && ex.currentLevel === 5 && (
                                                <span className="text-[10px] text-emerald-400 font-bold">MAX</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* === FULL BREAKDOWN === */}
            <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider mb-1">Full Breakdown</h2>
                <p className="text-[10px] text-zinc-600 mb-3">All ranked exercises by category</p>

                <div className="space-y-2">
                    {CATEGORIES.map(cat => {
                        const catExercises = exerciseData.filter(e => e.category === cat);
                        const catScore = catExercises.reduce((sum, e) => sum + e.currentLevel, 0);
                        const catMax = catExercises.length * 5;
                        const isExpanded = expandedCats[cat] || false;

                        // Also show untested ranked exercises in this category
                        const testedIds = new Set(catExercises.map(e => e.exerciseId.replace(/^(five_rm_|one_rm_|est_1rm_)/, '')));
                        const untestedInCat = catalog.filter((c: any) => {
                            if (!c.standards) return false;
                            let displayCat = c.category || 'Strength';
                            if (displayCat.includes("Strength") || displayCat === "Gymnastics" || displayCat === "Weightlifting") displayCat = "Strength";
                            else if (displayCat === "Cardio" || displayCat === "Endurance") displayCat = "Endurance & Speed";
                            else if (displayCat === "Metcon" || displayCat === "Power") displayCat = "Power & Capacity";
                            else if (displayCat === "Mobility" || displayCat === "Flexibility") displayCat = "Mobility";
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

                                            return (
                                                <div key={ex.exerciseId} className="flex items-center gap-2 py-1.5">
                                                    {exImage && <Image src={exImage} alt="" width={24} height={24} className="object-contain" />}
                                                    <span className="text-[11px] text-white flex-1 truncate">{ex.displayName}</span>
                                                    <span className="text-[10px] font-bold text-zinc-400">Lv.{ex.currentLevel}</span>
                                                    {ex.nextThreshold && (
                                                        <span className="text-[9px] text-zinc-600">→ {ex.nextThreshold} {ex.unit}</span>
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
                                                        <Link href="/test" className="text-[9px] text-orange-500/60 hover:text-orange-400 font-bold">Test</Link>
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
            </div>

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
