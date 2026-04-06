'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Swords, Trophy, Users, ChevronRight, Plus } from 'lucide-react';
import type { DuelResponse } from '@/types';
import { useExperienceMode } from '@/context/ExperienceModeContext';
import GroupCard from '@/components/GroupCard';
import CreatePublicChallengeModal from '@/components/challenges/CreatePublicChallengeModal';

interface ArenaTabProps {
    userId: string;
    activeDuels: DuelResponse[];
}

export default function ArenaTab({ userId, activeDuels }: ArenaTabProps) {
    const { isClassic } = useExperienceMode();
    const [showCreate, setShowCreate] = useState(false);
    const [publicChallenges, setPublicChallenges] = useState<any[]>([]);

    const loadChallenges = async () => {
        const res = await fetch(`/api/public-challenges?user_id=${userId}`);
        const data = await res.json();
        setPublicChallenges(data.challenges || []);
    };

    useEffect(() => { loadChallenges(); }, [userId]);

    return (
        <div className="space-y-4">
            {/* Group / Party */}
            <GroupCard userId={userId} />

            {/* Active Duels */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{isClassic ? '🤝' : '⚔️'}</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{isClassic ? 'Active Matchups' : 'Active Duels'}</h3>
                    </div>
                    <Link href="/arena" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1">
                        View All
                        <ChevronRight size={14} />
                    </Link>
                </div>
                {activeDuels.length > 0 ? (
                    <div className="space-y-2">
                        {activeDuels.slice(0, 3).map((duel) => (
                            <div key={duel.id} className="bg-zinc-800 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-white">
                                            {duel.status === 'PENDING' ? 'Pending' : 'Active'}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {duel.exercise_id}
                                        </p>
                                    </div>
                                    <div className="text-xs text-zinc-400">
                                        {new Date(duel.start_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {activeDuels.length > 3 && (
                            <p className="text-xs text-zinc-500 text-center pt-2">
                                +{activeDuels.length - 3} more
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <div className="text-4xl mb-3">⚔️</div>
                        <p className="text-sm text-zinc-400 mb-3">{isClassic ? 'No active matchups. Challenge a friend!' : 'No active duels. Time to challenge someone!'}</p>
                        <Link 
                            href="/arena" 
                            className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400 font-semibold"
                        >
                            Start a Duel
                            <ChevronRight size={14} />
                        </Link>
                    </div>
                )}
            </div>

            {/* Challenge a Friend CTA */}
            <Link
                href="/arena"
                className="block bg-gradient-to-br from-orange-600 to-red-600 rounded-xl p-6 text-center hover:scale-[1.02] transition-transform"
            >
                <div className="text-4xl mb-2">🤝</div>
                <h3 className="text-lg font-black italic text-white uppercase tracking-wider mb-1">
                    {isClassic ? 'Challenge a Friend' : 'Challenge a Friend'}
                </h3>
                <p className="text-sm text-orange-100">
                    {isClassic ? 'Compete head-to-head in friendly fitness matchups' : 'Compete head-to-head in fitness duels'}
                </p>
            </Link>

            {/* Public Challenges */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🏆</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Challenges</h3>
                    </div>
                    <button onClick={() => setShowCreate(true)} className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1 font-bold">
                        <Plus size={14} /> Create
                    </button>
                </div>
                {publicChallenges.length > 0 ? (
                    <div className="space-y-2">
                        {publicChallenges.map((c) => (
                            <Link key={c.id} href={`/challenges/${c.id}`} className="block bg-zinc-800 rounded-lg p-3 hover:bg-zinc-700 transition">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-white">{c.name}</p>
                                        <p className="text-[10px] text-zinc-500">{c.public_challenge_participants?.length || 0} participants</p>
                                    </div>
                                    <ChevronRight size={14} className="text-zinc-600" />
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <div className="text-4xl mb-3">🏆</div>
                        <p className="text-sm text-zinc-400 mb-3">Create a challenge and share the link!</p>
                        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400 font-semibold">
                            <Plus size={14} /> Create Challenge
                        </button>
                    </div>
                )}
            </div>

            {showCreate && (
                <CreatePublicChallengeModal userId={userId} onCreated={loadChallenges} onClose={() => setShowCreate(false)} />
            )}
        </div>
    );
}
