'use client';

import Link from 'next/link';
import { Swords, Trophy, Users, ChevronRight } from 'lucide-react';
import type { DuelResponse } from '@/types';

interface ArenaTabProps {
    userId: string;
    activeDuels: DuelResponse[];
}

export default function ArenaTab({ userId, activeDuels }: ArenaTabProps) {
    return (
        <div className="space-y-4">
            {/* Active Duels */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">⚔️</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Duels</h3>
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
                    <p className="text-sm text-zinc-500">No active duels</p>
                )}
            </div>

            {/* Weekly Challenge */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🏆</span>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Weekly Challenge</h3>
                    </div>
                    <Link href="/arena" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1">
                        View
                        <ChevronRight size={14} />
                    </Link>
                </div>
                <p className="text-sm text-zinc-500">No active challenge</p>
            </div>

            {/* Challenge a Friend CTA */}
            <Link
                href="/arena"
                className="block bg-gradient-to-br from-orange-600 to-red-600 rounded-xl p-6 text-center hover:scale-[1.02] transition-transform"
            >
                <div className="text-4xl mb-2">🤝</div>
                <h3 className="text-lg font-black italic text-white uppercase tracking-wider mb-1">
                    Challenge a Friend
                </h3>
                <p className="text-sm text-orange-100">
                    Compete head-to-head in fitness duels
                </p>
            </Link>
        </div>
    );
}
