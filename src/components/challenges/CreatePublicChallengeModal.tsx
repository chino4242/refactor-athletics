"use client";

import { useState } from 'react';
import { getToday } from '@/utils/date';
import { X, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { CHALLENGE_PRESETS, type ChallengeMetric } from '@/types';

interface Props {
    userId: string;
    displayName?: string;
    onCreated: () => void;
    onClose: () => void;
}

export default function CreatePublicChallengeModal({ userId, displayName, onCreated, onClose }: Props) {
    const [name, setName] = useState('');
    const [metric, setMetric] = useState<ChallengeMetric>('steps');
    const [duration, setDuration] = useState(7);
    const [creating, setCreating] = useState(false);
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setCreating(true);
        const preset = CHALLENGE_PRESETS[metric];
        const start = getToday();
        const end = new Date(Date.now() + duration * 86400000).toLocaleDateString('en-CA', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });

        const res = await fetch('/api/public-challenges', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create',
                creator_id: userId,
                name: name.trim(),
                metric,
                target: preset.defaultTarget,
                start_date: start,
                end_date: end,
                display_name: displayName,
            }),
        });
        const data = await res.json();
        setCreating(false);
        if (data.challenge) {
            setShareLink(`${window.location.origin}/join/${data.challenge.invite_code}`);
            onCreated();
        }
    };

    const handleCopy = async () => {
        if (!shareLink) return;
        if (navigator.share) {
            await navigator.share({ title: name, text: `Join my challenge: ${name}`, url: shareLink });
        } else {
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <h2 className="text-lg font-black italic uppercase tracking-tight text-white">Create Challenge</h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                </div>

                <div className="p-4 space-y-4">
                    {!shareLink ? (
                        <>
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Challenge Name</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. April Step Challenge"
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white text-sm outline-none focus:border-zinc-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Metric</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(Object.entries(CHALLENGE_PRESETS) as [ChallengeMetric, typeof CHALLENGE_PRESETS[ChallengeMetric]][]).map(([key, preset]) => (
                                        <button
                                            key={key}
                                            onClick={() => setMetric(key)}
                                            className={`p-3 rounded-lg border text-left transition ${
                                                metric === key
                                                    ? 'border-orange-500 bg-orange-500/10'
                                                    : 'border-zinc-800 bg-zinc-800/50 hover:border-zinc-600'
                                            }`}
                                        >
                                            <div className="text-lg">{preset.emoji}</div>
                                            <div className="text-xs font-bold text-white">{preset.label}</div>
                                            <div className="text-[10px] text-zinc-500">{preset.defaultTarget.toLocaleString()} {preset.unit}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Duration</label>
                                <div className="flex gap-2">
                                    {[7, 14, 30].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setDuration(d)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
                                                duration === d
                                                    ? 'bg-orange-500 text-black'
                                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                            }`}
                                        >{d} days</button>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={handleCreate}
                                disabled={!name.trim() || creating}
                                className="w-full py-3 bg-orange-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-orange-400 transition disabled:opacity-50"
                            >
                                {creating ? 'Creating...' : 'Create & Get Link'}
                            </button>
                        </>
                    ) : (
                        <div className="text-center space-y-4 py-4">
                            <div className="text-4xl">🎉</div>
                            <h3 className="text-xl font-black text-white">Challenge Created!</h3>
                            <p className="text-sm text-zinc-400">Share this link with anyone to invite them:</p>
                            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-700 rounded-lg p-3">
                                <LinkIcon size={14} className="text-zinc-500 shrink-0" />
                                <span className="text-xs text-orange-400 truncate flex-1">{shareLink}</span>
                                <button onClick={handleCopy} className="shrink-0">
                                    {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-zinc-400 hover:text-white" />}
                                </button>
                            </div>
                            <button onClick={handleCopy} className="w-full py-3 bg-emerald-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition">
                                {copied ? 'Copied!' : 'Share Link'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
