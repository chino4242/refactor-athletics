"use client";

import Link from 'next/link';
import { Users, AlertTriangle } from 'lucide-react';

interface Props {
    groupName: string | null;
    memberCount: number;
    code: string;
    isChallenge: boolean;
}

export default function JoinPreview({ groupName, memberCount, code, isChallenge }: Props) {
    if (!groupName && !isChallenge) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full text-center">
                    <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white mb-2">Invalid Invite</h1>
                    <p className="text-zinc-500 text-sm">This invite link is invalid or expired.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-600" />

                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users size={40} className="text-emerald-500" />
                    </div>

                    <h1 className="text-3xl font-black italic text-white uppercase tracking-tight mb-2">
                        You&apos;re Invited!
                    </h1>
                    <p className="text-zinc-500 italic text-sm mb-6">
                        Refactor Athletics — a fitness RPG where every rep counts.
                    </p>

                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6">
                        <div className="text-lg font-bold text-white mb-1">{groupName}</div>
                        <div className="text-sm text-zinc-500">
                            {memberCount} {memberCount === 1 ? 'adventurer awaits' : 'adventurers await'}
                        </div>
                    </div>

                    <Link
                        href={`/login?redirect=/join/${code}`}
                        className="block w-full py-4 bg-emerald-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10 text-center"
                    >
                        Sign Up to Join
                    </Link>
                    <p className="text-zinc-600 text-xs mt-3">Already have an account? You&apos;ll log in and join automatically.</p>
                </div>
            </div>
        </div>
    );
}
