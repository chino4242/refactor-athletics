"use client";

import { useState, useEffect } from 'react';
import { getToday } from '@/utils/date';
import { useRouter } from 'next/navigation';
import { Trophy, ArrowLeft, Share2, Loader2, Crown } from 'lucide-react';
import { CHALLENGE_PRESETS } from '@/types';

interface Props {
    challengeId: string;
    currentUserId: string;
}

interface Participant {
    user_id: string;
    display_name: string | null;
    score: number;
    joined_at: string;
}

export default function PublicChallengeDetail({ challengeId, currentUserId }: Props) {
    const router = useRouter();
    const [challenge, setChallenge] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => { loadChallenge(); }, [challengeId]);

    const loadChallenge = async () => {
        // Refresh scores then load
        await fetch('/api/public-challenges/refresh-scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ challenge_id: challengeId }),
        }).catch(() => {});
        const res = await fetch(`/api/public-challenges?id=${challengeId}`);
        const data = await res.json();
        setChallenge(data.challenge);
        setLoading(false);
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/join/${challenge.invite_code}`;
        if (navigator.share) {
            await navigator.share({ title: challenge.name, text: `Join my challenge: ${challenge.name}`, url });
        } else {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 size={32} className="animate-spin text-zinc-500" />
        </div>
    );

    if (!challenge) return (
        <div className="text-center py-20">
            <p className="text-zinc-500">Challenge not found.</p>
            <button onClick={() => router.push('/arena')} className="text-orange-500 underline text-base mt-4">Back to Arena</button>
        </div>
    );

    const preset = CHALLENGE_PRESETS[challenge.metric as keyof typeof CHALLENGE_PRESETS];
    const participants: Participant[] = (challenge.public_challenge_participants || [])
        .sort((a: Participant, b: Participant) => b.score - a.score);
    const isParticipant = participants.some(p => p.user_id === currentUserId);
    const myRank = participants.findIndex(p => p.user_id === currentUserId) + 1;

    const now = getToday();
    const daysLeft = Math.max(0, Math.ceil((new Date(challenge.end_date).getTime() - new Date(now).getTime()) / 86400000));

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => router.push('/arena')} className="text-zinc-500 hover:text-white">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-black italic uppercase tracking-tight text-white">{challenge.name}</h1>
                    {challenge.description && <p className="text-zinc-500 text-base">{challenge.description}</p>}
                </div>
                <button onClick={handleShare} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition">
                    <Share2 size={16} className={copied ? 'text-emerald-500' : 'text-zinc-400'} />
                </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                    <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Metric</div>
                    <div className="text-base font-bold text-white mt-1">{preset?.emoji || '🏆'} {preset?.label || challenge.metric}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                    <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Participants</div>
                    <div className="text-base font-bold text-white mt-1">👥 {participants.length}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                    <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest">
                        {challenge.status === 'completed' ? 'Status' : 'Days Left'}
                    </div>
                    <div className={`text-base font-bold mt-1 ${daysLeft <= 2 ? 'text-red-400' : 'text-white'}`}>
                        {challenge.status === 'completed' ? '✅ Done' : `⏳ ${daysLeft}`}
                    </div>
                </div>
            </div>

            {/* Your Position */}
            {isParticipant && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-orange-400 uppercase font-bold tracking-widest">Your Rank</div>
                        <div className="text-2xl font-black text-white">#{myRank}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-orange-400 uppercase font-bold tracking-widest">Your Score</div>
                        <div className="text-2xl font-black text-white">
                            {(participants.find(p => p.user_id === currentUserId)?.score || 0).toLocaleString()}
                            <span className="text-sm text-zinc-500 ml-1">{preset?.unit || ''}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Leaderboard */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800">
                    <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">🏆 Leaderboard</h2>
                </div>
                <div className="divide-y divide-zinc-800/50">
                    {participants.length === 0 ? (
                        <div className="p-6 text-center text-zinc-600 text-base">No participants yet. Share the link!</div>
                    ) : participants.map((p, i) => (
                        <div
                            key={p.user_id}
                            className={`flex items-center gap-3 px-4 py-3 ${p.user_id === currentUserId ? 'bg-orange-500/5' : ''}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                                i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                i === 1 ? 'bg-zinc-400/20 text-zinc-300' :
                                i === 2 ? 'bg-orange-700/20 text-orange-400' :
                                'bg-zinc-800 text-zinc-500'
                            }`}>
                                {i === 0 ? <Crown size={14} /> : i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`text-base font-bold truncate ${p.user_id === currentUserId ? 'text-orange-400' : 'text-white'}`}>
                                    {p.display_name || 'Anonymous'}
                                    {p.user_id === currentUserId && <span className="text-xs text-zinc-500 ml-1">(you)</span>}
                                </div>
                            </div>
                            <div className="text-base font-bold text-white">
                                {p.score.toLocaleString()}
                                <span className="text-xs text-zinc-600 ml-1">{preset?.unit || ''}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Share CTA */}
            {isParticipant && (
                <button
                    onClick={handleShare}
                    className="w-full py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-base font-bold text-zinc-300 hover:bg-zinc-700 transition flex items-center justify-center gap-2"
                >
                    <Share2 size={14} />
                    {copied ? 'Link Copied!' : 'Share Challenge Link'}
                </button>
            )}
        </div>
    );
}
