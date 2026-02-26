"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDuel, acceptChallenge, type DuelResponse } from '../../services/api';
import { Swords, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface Props {
    currentUserId: string;
}

export default function ChallengeLanding({ currentUserId }: Props) {
    const { duelId } = useParams();
    const router = useRouter();
    const toast = useToast();

    const [duel, setDuel] = useState<DuelResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (duelId) {
            getDuel(duelId)
                .then(setDuel)
                .catch(e => {
                    console.error(e);
                    setError("Challenge not found or expired.");
                })
                .finally(() => setLoading(false));
        }
    }, [duelId]);

    const handleAccept = async () => {
        if (!duel || !currentUserId) return;

        setAccepting(true);
        try {
            await acceptChallenge(duel.id, currentUserId);
            toast.success("Challenge Accepted!");
            router.push('/arena');
        } catch (e) {
            console.error(e);
            toast.error("Failed to accept challenge.");
        } finally {
            setAccepting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (error || !duel) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
                <AlertTriangle size={48} className="text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Challenge Not Found</h2>
                <p className="text-zinc-500">{error || "This link might be invalid."}</p>
                <button onClick={() => router.push('/arena')} className="mt-6 text-orange-500 hover:text-white underline">
                    Return to Arena
                </button>
            </div>
        );
    }

    const isMyChallenge = duel.challenger_id === currentUserId;
    const isOngoing = duel.status !== 'PENDING';
    const timeLeft = Math.max(0, duel.end_at - duel.start_at);
    const days = Math.floor(timeLeft / 86400);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full relative overflow-hidden shadow-2xl">
                {/* Background Glow */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-red-600"></div>

                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <Swords size={40} className="text-orange-500" />
                        <div className="absolute -bottom-2 bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            VS
                        </div>
                    </div>

                    <h1 className="text-3xl font-black italic text-white uppercase tracking-tight mb-2">
                        {isMyChallenge ? 'Your Challenge' : 'You have been Challenged!'}
                    </h1>
                    <p className="text-zinc-400">
                        {isMyChallenge
                            ? "You are waiting for a worthy opponent."
                            : "A rival has invited you to a duel."}
                    </p>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Clock size={20} className="text-zinc-500" />
                            <span className="text-sm font-bold text-zinc-300">Duration</span>
                        </div>
                        <span className="text-orange-500 font-black uppercase text-sm">{days} Days</span>
                    </div>
                </div>

                {isMyChallenge ? (
                    <div className="text-center bg-zinc-800/50 p-4 rounded-xl border border-dashed border-zinc-700">
                        <p className="text-sm text-zinc-400">Share the link via copy-paste to invite someone.</p>
                    </div>
                ) : isOngoing ? (
                    <div className="text-center">
                        <p className="text-zinc-400 mb-4">This duel is already active.</p>
                        <button
                            onClick={() => router.push('/arena')}
                            className="w-full py-4 bg-zinc-800 text-white font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-700 transition-colors"
                        >
                            Go to Arena
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleAccept}
                        disabled={accepting}
                        className="w-full py-4 bg-white text-black font-black uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50"
                    >
                        {accepting ? 'Accepting...' : 'Accept Challenge'}
                    </button>
                )}

            </div>
        </div>
    );
}
