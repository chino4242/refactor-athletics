"use client";

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface Props {
    onSelect: (choice: 'walk' | 'yoga' | 'foam_roll', durationMinutes: number) => void;
}

const RECOVERY_OPTIONS = [
    { key: 'walk' as const, emoji: '🚶', label: 'Walk', desc: 'Easy pace, outdoors or treadmill', defaultMin: 25, options: [15, 20, 25, 30] },
    { key: 'yoga' as const, emoji: '🧘', label: 'Yoga / Stretching', desc: 'Follow along or freestyle', defaultMin: 20, options: [10, 15, 20, 30] },
    { key: 'foam_roll' as const, emoji: '🔄', label: 'Foam Rolling', desc: 'Quads, hamstrings, back, shoulders', defaultMin: 10, options: [5, 10, 15, 20] },
];

export default function RecoverySelector({ onSelect }: Props) {
    const [selected, setSelected] = useState<typeof RECOVERY_OPTIONS[number] | null>(null);
    const [duration, setDuration] = useState(20);

    if (selected) {
        return (
            <div className="w-full max-w-md mx-auto bg-zinc-900 rounded-3xl border border-zinc-800 p-6 space-y-6">
                <div className="text-center">
                    <div className="text-4xl mb-3">{selected.emoji}</div>
                    <h2 className="text-xl font-black italic text-white uppercase">{selected.label}</h2>
                    <p className="text-zinc-500 text-sm mt-1">How long?</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {selected.options.map(min => (
                        <button
                            key={min}
                            onClick={() => setDuration(min)}
                            className={`p-4 rounded-xl border text-center transition-all ${duration === min
                                ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500'
                                : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                            }`}
                        >
                            <div className={`text-2xl font-black ${duration === min ? 'text-emerald-400' : 'text-white'}`}>{min}</div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold">minutes</div>
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => onSelect(selected.key, duration)}
                    className="w-full py-4 bg-emerald-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                >
                    Start {duration} Min {selected.label} <ChevronRight size={20} />
                </button>

                <button onClick={() => setSelected(null)} className="w-full text-center text-zinc-600 text-xs font-bold uppercase hover:text-zinc-400 transition">
                    ← Back
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto bg-zinc-900 rounded-3xl border border-zinc-800 p-6 space-y-4">
            <div className="text-center mb-2">
                <h2 className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Active Recovery</h2>
                <p className="text-zinc-500 text-sm mt-1">Pick your recovery activity</p>
            </div>

            {RECOVERY_OPTIONS.map(opt => (
                <button
                    key={opt.key}
                    onClick={() => { setSelected(opt); setDuration(opt.defaultMin); }}
                    className="w-full p-5 bg-zinc-800 border border-zinc-700 rounded-2xl hover:border-emerald-500 hover:bg-zinc-800/80 transition-all text-left group"
                >
                    <div className="flex items-center gap-4">
                        <div className="text-3xl">{opt.emoji}</div>
                        <div className="flex-1">
                            <div className="text-white font-black uppercase text-sm">{opt.label}</div>
                            <div className="text-zinc-500 text-xs mt-0.5">{opt.desc}</div>
                        </div>
                        <ChevronRight size={18} className="text-zinc-600 group-hover:text-emerald-500 transition" />
                    </div>
                </button>
            ))}
        </div>
    );
}
