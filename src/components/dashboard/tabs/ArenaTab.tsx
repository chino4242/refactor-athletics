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
    const [challenge75, setChallenge75] = useState<{ day: number; title: string; passed: number; status: string } | null>(null);
    const [challenge75Loading, setChallenge75Loading] = useState(true);

    const loadChallenges = async () => {
        const res = await fetch(`/api/public-challenges?user_id=${userId}`);
        const data = await res.json();
        setPublicChallenges(data.challenges || []);
    };

    const loadChallenge75 = async () => {
        try {
            const res = await fetch('/api/challenge-75');
            if (!res.ok) { setChallenge75Loading(false); return; }
            const data = await res.json();
            const active = (data.challenges || []).find((c: any) => c.status === 'active');
            if (active) {
                const dayNum = Math.floor((Date.now() - new Date(active.start_date).getTime()) / 86400000);
                const passed = (active.challenge_75_days || []).filter((d: any) => d.user_id === userId && d.status === 'passed').length;
                setChallenge75({ day: Math.min(dayNum + 1, 75), title: active.title, passed, status: 'active' });
            }
        } catch {}
        setChallenge75Loading(false);
    };

    useEffect(() => { loadChallenges(); loadChallenge75(); }, [userId]);

    return (
        <div className="space-y-4">
            {/* 75 Day Challenge */}
            {!challenge75Loading && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🎯</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">75 Day Challenge</h3>
                    </div>
                    {challenge75 ? (
                        <Link href="/challenge-75" className="block mt-3">
                            <div className="bg-zinc-800 rounded-lg p-3 hover:bg-zinc-700 transition">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-white">{challenge75.title}</p>
                                        <p className="text-[10px] text-zinc-500">Day {challenge75.day}/75 · ✅ {challenge75.passed} days passed</p>
                                    </div>
                                    <ChevronRight size={14} className="text-zinc-600" />
                                </div>
                            </div>
                        </Link>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-sm text-zinc-400 mb-3">Commit to 75 days of daily discipline — track workouts, nutrition, and habits.</p>
                            <Link href="/challenge-75" className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400 font-semibold">
                                Start a 75 Day Challenge
                                <ChevronRight size={14} />
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* Group / Party */}
            <GroupCard userId={userId} />

            {/* Active Duels */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{isClassic ? '🤝' : '⚔️'}</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{isClassic ? 'Active Matchups' : 'Active Duels'}</h3>
                    </div>
                    <Link href="/arena" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1">
                        View All
                        <ChevronRight size={14} />
                    </Link>
                </div>
                <p className="text-[10px] text-zinc-600 mb-3">Head-to-head challenges — outperform your opponent to win</p>
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
                                            {(duel as any).exercise_id}
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

            {/* Public Challenges */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🏆</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Challenges</h3>
                    </div>
                    <button onClick={() => setShowCreate(true)} className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1 font-bold">
                        <Plus size={14} /> Create
                    </button>
                </div>
                <p className="text-[10px] text-zinc-600 mb-3">Open challenges anyone can join — share the link to invite others</p>
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
