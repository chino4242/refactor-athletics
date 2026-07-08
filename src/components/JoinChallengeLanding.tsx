"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { CHALLENGE_PRESETS } from '@/types';

interface Props {
    currentUserId: string;
    inviteCode: string;
}

export default function JoinChallengeLanding({ currentUserId, inviteCode }: Props) {
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'preview' | 'joining' | 'success' | 'error'>('loading');
    const [challenge, setChallenge] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        loadChallenge();
    }, [inviteCode]);

    const loadChallenge = async () => {
        try {
            const res = await fetch(`/api/public-challenges?code=${inviteCode}`);
            const data = await res.json();
            if (!data.challenge) {
                setError('This challenge link is invalid or expired.');
                setStatus('error');
                return;
            }
            setChallenge(data.challenge);
            setStatus('preview');
        } catch {
            setError('Failed to load challenge info.');
            setStatus('error');
        }
    };

    const handleJoin = async () => {
        setStatus('joining');
        try {
            const res = await fetch('/api/public-challenges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'join', invite_code: inviteCode, user_id: currentUserId }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setStatus('success');
            setTimeout(() => router.push(`/challenges/${data.challenge_id}`), 1500);
        } catch (e: any) {
            setError(e.message || 'Failed to join challenge.');
            setStatus('error');
        }
    };

    const preset = challenge?.metric ? CHALLENGE_PRESETS[challenge.metric as keyof typeof CHALLENGE_PRESETS] : null;
    const participantCount = challenge?.public_challenge_participants?.length || 0;
    const alreadyJoined = challenge?.public_challenge_participants?.some((p: any) => p.user_id === currentUserId);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-amber-600" />

                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        {status === 'success' || alreadyJoined ? (
                            <CheckCircle2 size={40} className="text-emerald-500" />
                        ) : status === 'error' ? (
                            <AlertTriangle size={40} className="text-red-500" />
                        ) : (
                            <Trophy size={40} className="text-orange-500" />
                        )}
                    </div>

                    {status === 'loading' && (
                        <>
                            <Loader2 size={24} className="animate-spin text-zinc-500 mx-auto mb-4" />
                            <p className="text-zinc-500">Loading challenge...</p>
                        </>
                    )}

                    {status === 'preview' && (
                        <>
                            <h1 className="text-3xl font-black italic text-white uppercase tracking-tight mb-2">
                                {alreadyJoined ? "You're In!" : "Challenge Invite"}
                            </h1>
                            <p className="text-zinc-400 mb-6">
                                {alreadyJoined ? 'You already joined this challenge.' : "You've been invited to compete!"}
                            </p>

                            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6 space-y-2">
                                <div className="text-lg font-bold text-white">{challenge.name}</div>
                                {challenge.description && <div className="text-base text-zinc-500">{challenge.description}</div>}
                                <div className="flex justify-center gap-4 text-xs text-zinc-400 pt-2">
                                    <span>{preset?.emoji || '🏆'} {preset?.label || challenge.metric}</span>
                                    <span>👥 {participantCount} joined</span>
                                </div>
                                {challenge.target && (
                                    <div className="text-xs text-orange-400 font-bold">
                                        Target: {Number(challenge.target).toLocaleString()} {preset?.unit || ''}
                                    </div>
                                )}
                                <div className="text-xs text-zinc-600">
                                    {challenge.start_date} → {challenge.end_date}
                                </div>
                            </div>

                            {alreadyJoined ? (
                                <button
                                    onClick={() => router.push(`/challenges/${challenge.id}`)}
                                    className="w-full py-4 bg-emerald-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all"
                                >
                                    View Challenge
                                </button>
                            ) : (
                                <button
                                    onClick={handleJoin}
                                    className="w-full py-4 bg-orange-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-orange-400 transition-all shadow-lg shadow-orange-500/10"
                                >
                                    Join Challenge
                                </button>
                            )}
                        </>
                    )}

                    {status === 'joining' && (
                        <>
                            <Loader2 size={24} className="animate-spin text-orange-500 mx-auto mb-4" />
                            <p className="text-zinc-400">Joining {challenge?.name}...</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <h1 className="text-3xl font-black italic text-white uppercase tracking-tight mb-2">
                                You&apos;re In!
                            </h1>
                            <p className="text-zinc-400">Let&apos;s go. Redirecting to leaderboard...</p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <h1 className="text-xl font-bold text-white mb-2">Something Went Wrong</h1>
                            <p className="text-zinc-500 mb-6">{error}</p>
                            <button onClick={() => router.push('/arena')} className="text-orange-500 hover:text-white underline text-base">
                                Go to Arena
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
