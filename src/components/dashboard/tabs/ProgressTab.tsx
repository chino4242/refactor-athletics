'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, Activity, ChevronRight } from 'lucide-react';
import type { UserStats } from '@/types';
import PowerRadar from '@/components/profile/PowerRadar';
import { getHistory, getTrainingCatalog } from '@/services/api';
import { useTrophies } from '@/hooks/useTrophies';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/data/themes';
import { createClient } from '@/utils/supabase/client';
import CharacterAvatar from '@/components/character/CharacterAvatar';
import { CharacterConfig, getTierName } from '@/types/character';

interface ProgressTabProps {
    userId: string;
    stats: UserStats | null;
}

export default function ProgressTab({ userId, stats }: ProgressTabProps) {
    const [recentHistory, setRecentHistory] = useState<any[]>([]);
    const [fullHistory, setFullHistory] = useState<any[]>([]);
    const [exercises, setExercises] = useState<any[]>([]);
    const [powerLevelExercises, setPowerLevelExercises] = useState<any[]>([]);
    const [allRankedExercises, setAllRankedExercises] = useState<any[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [characterConfig, setCharacterConfig] = useState<CharacterConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const { currentTheme } = useTheme();

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const supabase = createClient();
                const [history, catalog, profile] = await Promise.all([
                    getHistory(userId),
                    getTrainingCatalog(),
                    supabase.from('users').select('age, sex, bodyweight, character_config').eq('id', userId).single(),
                ]);
                setFullHistory(history);
                setRecentHistory(history.slice(0, 5));
                setExercises(catalog);
                setUserProfile(profile.data);
                setCharacterConfig(profile.data?.character_config || null);
                
                // Get exercises with standards (these contribute to power level)
                const rankedCatalog = catalog.filter((ex: any) => ex.standards);
                
                // Get user's max level per exercise
                const workouts = history.filter(item => item.type === 'workout');
                const userLevels = new Map();
                workouts.forEach(workout => {
                    if (workout.level > 0) {
                        const existing = userLevels.get(workout.exercise_id);
                        if (!existing || workout.level > existing) {
                            userLevels.set(workout.exercise_id, workout.level);
                        }
                    }
                });
                
                // Helper to get Level 1 standard using same logic as getPreviewRank
                const getLevel1Standard = (ex: any, userAge: number, userSex: string, userBodyweight: number) => {
                    if (!ex.standards) return null;
                    
                    const standards = ex.standards;
                    const isXBW = standards.unit === 'xBW';
                    const sexKey = userSex === 'F' || userSex === 'female' ? 'female' : 'male';
                    const brackets = standards.brackets?.[sexKey] || [];
                    
                    // Find age bracket
                    let ageBracket = brackets.find((b: any) => userAge >= b.min && userAge <= b.max);
                    if (!ageBracket && brackets.length > 0) {
                        if (userAge > 99) ageBracket = brackets[brackets.length - 1];
                        else ageBracket = brackets[0];
                    }
                    
                    const levels = ageBracket ? ageBracket.levels : [];
                    if (levels.length < 2) return null; // Need at least Level 0 and Level 1
                    
                    let level1Threshold = levels[1]; // Index 1 = Level 1 (Rookie)
                    
                    // Convert xBW to actual weight
                    if (isXBW && userBodyweight > 0) {
                        level1Threshold = Math.round(level1Threshold * userBodyweight);
                    }
                    
                    return level1Threshold;
                };
                
                const userAge = profile.data?.age || 30;
                const userSex = profile.data?.sex || 'M';
                const userBodyweight = profile.data?.bodyweight || 150;
                
                // Build full list: all ranked exercises with user's level or Level 1 standard
                const allRanked = rankedCatalog
                    .map((ex: any) => {
                        const userLevel = userLevels.get(ex.id) || 0;
                        const level1Standard = getLevel1Standard(ex, userAge, userSex, userBodyweight);
                        
                        return {
                            exercise_id: ex.id,
                            exercise_name: ex.name,
                            unit: ex.standards?.unit === 'xBW' ? 'Lbs' : (ex.unit || ''),
                            category: ex.category,
                            user_level: userLevel,
                            contribution: userLevel * 100,
                            level1_standard: level1Standard,
                        };
                    })
                    .filter((ex: any) => ex.level1_standard !== null) // Only show exercises with valid Level 1 standards
                    .sort((a: any, b: any) => b.contribution - a.contribution);
                
                setAllRankedExercises(allRanked);
                
                // Keep existing power level exercises (only ones user has completed)
                const powerExercises = allRanked.filter((ex: any) => ex.user_level > 0);
                setPowerLevelExercises(powerExercises);
            } catch (error) {
                console.error('Failed to load history:', error);
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, [userId]);

    const { categoryStats } = useTrophies(fullHistory, exercises);

    const getRankImage = (level: number) => {
        const theme = THEMES[currentTheme] || THEMES['athlete'];
        const rankKey = `level${level}` as keyof typeof theme.ranks;
        const rankData = theme.ranks[rankKey] || theme.ranks['level0'];
        
        if (userProfile?.sex === 'female' && rankData.femaleImage) {
            return rankData.femaleImage;
        }
        return rankData.image;
    };

    const groupByCategory = (exercises: any[]) => {
        const groups: Record<string, any[]> = {};
        exercises.forEach(ex => {
            let cat = ex.category || 'Other';
            if (cat.includes('Strength') || cat === 'Gymnastics' || cat === 'Weightlifting') {
                cat = 'Strength';
            } else if (cat === 'Cardio' || cat === 'Endurance') {
                cat = 'Endurance & Speed';
            } else if (cat === 'Metcon' || cat === 'Power') {
                cat = 'Power & Capacity';
            } else if (cat === 'Mobility' || cat === 'Flexibility') {
                cat = 'Mobility';
            }
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(ex);
        });
        return groups;
    };

    const groupedExercises = groupByCategory(allRankedExercises);

    return (
        <div className="space-y-4">
            {/* Character Card */}
            {characterConfig && stats && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-4">
                        <CharacterAvatar
                            character={characterConfig}
                            powerLevel={stats.power_level || 0}
                            size="md"
                            animated
                        />
                        <div className="flex-1">
                            <h3 className="text-lg font-black text-white mb-1">Your Character</h3>
                            <div className="text-sm text-zinc-400 mb-2">{getTierName(characterConfig.powerLevelTier)}</div>
                            <div className="flex gap-4 text-xs">
                                <div>
                                    <span className="text-zinc-500">Power Level:</span>
                                    <span className="text-orange-500 font-bold ml-1">{stats.power_level || 0}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-500">Career XP:</span>
                                    <span className="text-blue-500 font-bold ml-1">{stats.total_xp || 0}</span>
                                </div>
                            </div>
                        </div>
                        <Link 
                            href="/character-test" 
                            className="text-xs text-orange-500 hover:text-orange-400 font-semibold flex items-center gap-1"
                        >
                            Customize
                            <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>
            )}

            {/* Power Radar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">📊</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Attribute Balance</h3>
                    </div>
                    <Link href="/profile" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1">
                        View Profile
                        <ChevronRight size={14} />
                    </Link>
                </div>
                {stats && (
                    <PowerRadar stats={stats} categoryStats={categoryStats} />
                )}
            </div>

            {/* Power Level Contributors */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">💪</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Power Level Contributors</h3>
                    </div>
                    <Link href="/profile" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1">
                        Trophy Case
                        <ChevronRight size={14} />
                    </Link>
                </div>
                {loading ? (
                    <p className="text-sm text-zinc-500">Loading...</p>
                ) : Object.values(groupedExercises).every(arr => arr.length === 0) ? (
                    <div className="text-center py-8">
                        <div className="text-5xl mb-4">🏆</div>
                        <p className="text-sm text-zinc-400 mb-2">No exercises completed yet</p>
                        <p className="text-xs text-zinc-500 mb-4">Complete workouts to build your Power Level</p>
                        <Link 
                            href="/train" 
                            className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400 font-semibold"
                        >
                            Start Training
                            <ChevronRight size={14} />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {['Strength', 'Endurance & Speed', 'Power & Capacity', 'Mobility'].map(category => {
                            const items = groupedExercises[category] || [];
                            if (items.length === 0) return null;
                            
                            return (
                                <div key={category}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                                            {category === 'Strength' && '⚔️'}
                                            {category === 'Endurance & Speed' && '🏃'}
                                            {category === 'Power & Capacity' && '⚡'}
                                            {category === 'Mobility' && '🧘'}
                                            {category}
                                        </h4>
                                        <span className="text-xs font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                                            {categoryStats[category] || 0}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {items.map((exercise: any, idx: number) => {
                                            const imageSrc = getRankImage(exercise.user_level);
                                            return (
                                                <div key={idx} className="flex items-center gap-3 bg-zinc-800/50 rounded-lg p-2.5">
                                                    <img 
                                                        src={imageSrc} 
                                                        alt={`Level ${exercise.user_level}`}
                                                        className="w-10 h-10 rounded object-cover border border-zinc-700 bg-zinc-800 shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-white truncate">
                                                            {exercise.exercise_name}
                                                        </p>
                                                        <p className="text-xs text-zinc-500">
                                                            {exercise.user_level > 0 ? (
                                                                <span>Level {exercise.user_level}</span>
                                                            ) : (
                                                                <span className="text-zinc-600">
                                                                    Level 1: {exercise.level1_standard !== null ? `${exercise.level1_standard} ${exercise.unit}` : 'N/A'}
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className={`text-sm font-bold ${exercise.user_level > 0 ? 'text-orange-500' : 'text-zinc-600'}`}>
                                                            {exercise.user_level > 0 ? `+${exercise.contribution}` : '+0'}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Recent Activity */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">📈</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Activity</h3>
                    </div>
                    <Link href="/track" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1">
                        View All
                        <ChevronRight size={14} />
                    </Link>
                </div>
                {loading ? (
                    <p className="text-sm text-zinc-500">Loading...</p>
                ) : recentHistory.length > 0 ? (
                    <div className="space-y-2">
                        {recentHistory.map((item, idx) => {
                            // Handle timestamp - could be seconds or milliseconds
                            const timestamp = item.timestamp > 10000000000 
                                ? item.timestamp 
                                : item.timestamp * 1000;
                            
                            // Format display name
                            const displayName = item.exercise_name || 
                                item.exercise_id
                                    .replace(/^(habit_|macro_)/, '')
                                    .replace(/_/g, ' ')
                                    .replace(/\b\w/g, (l: string) => l.toUpperCase());
                            
                            return (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                    <div>
                                        <p className="text-white font-medium">
                                            {displayName}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {item.type === 'workout' && item.details?.sets && (
                                                <span>{item.details.sets.length} sets</span>
                                            )}
                                            {item.type === 'habit' && (
                                                <span>{item.value}</span>
                                            )}
                                            {item.type === 'nutrition' && (
                                                <span>{item.value}g</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {new Date(timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-zinc-500">No recent activity</p>
                )}
            </div>

            {/* Stats Summary */}
            {stats && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Workouts</p>
                        <p className="text-2xl font-black italic text-white">{stats.exercises_tracked || 0}</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total XP</p>
                        <p className="text-2xl font-black italic text-white">{(stats.total_career_xp || stats.total_xp || 0).toLocaleString()}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
