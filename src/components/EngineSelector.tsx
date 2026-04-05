"use client";

import { useState } from 'react';
import { Flame, Heart, Timer, ChevronRight } from 'lucide-react';

interface Props {
    onSelect: (choice: 'hiit' | 'zone2', durationMinutes?: number) => void;
}

const DURATION_OPTIONS = [20, 30, 45, 60];

export default function EngineSelector({ onSelect }: Props) {
    const [mode, setMode] = useState<'choose' | 'duration'>('choose');
    const [duration, setDuration] = useState(30);

    if (mode === 'duration') {
        return (
            <div className="w-full max-w-md mx-auto bg-zinc-900 rounded-3xl border border-zinc-800 p-6 space-y-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Heart size={32} className="text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-black italic text-white uppercase">Zone 2 Run</h2>
                    <p className="text-zinc-500 text-sm mt-1">How long do you want to go?</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {DURATION_OPTIONS.map(min => (
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

                {/* Custom input */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 uppercase font-bold shrink-0">Custom:</span>
                    <input
                        type="number"
                        inputMode="numeric"
                        value={duration}
                        onChange={e => setDuration(Math.max(5, parseInt(e.target.value) || 5))}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm text-center font-mono focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-xs text-zinc-500">min</span>
                </div>

                <button
                    onClick={() => onSelect('zone2', duration)}
                    className="w-full py-4 bg-emerald-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                >
                    Start {duration} Min Zone 2 <ChevronRight size={20} />
                </button>

                <button onClick={() => setMode('choose')} className="w-full text-center text-zinc-600 text-xs font-bold uppercase hover:text-zinc-400 transition">
                    ← Back
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto bg-zinc-900 rounded-3xl border border-zinc-800 p-6 space-y-4">
            <div className="text-center mb-2">
                <h2 className="text-xs font-bold text-orange-500 uppercase tracking-widest">Pick Your Engine</h2>
                <p className="text-zinc-500 text-sm mt-1">What kind of cardio today?</p>
            </div>

            <button
                onClick={() => onSelect('hiit')}
                className="w-full p-5 bg-zinc-800 border border-zinc-700 rounded-2xl hover:border-orange-500 hover:bg-zinc-800/80 transition-all text-left group"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center shrink-0">
                        <Flame size={24} className="text-orange-500" />
                    </div>
                    <div className="flex-1">
                        <div className="text-white font-black uppercase text-sm">HIIT Intervals</div>
                        <div className="text-zinc-500 text-xs mt-0.5">Today's programmed tread block</div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-600 group-hover:text-orange-500 transition" />
                </div>
            </button>

            <button
                onClick={() => setMode('duration')}
                className="w-full p-5 bg-zinc-800 border border-zinc-700 rounded-2xl hover:border-emerald-500 hover:bg-zinc-800/80 transition-all text-left group"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center shrink-0">
                        <Heart size={24} className="text-emerald-500" />
                    </div>
                    <div className="flex-1">
                        <div className="text-white font-black uppercase text-sm">Zone 2 Steady State</div>
                        <div className="text-zinc-500 text-xs mt-0.5">Conversational pace, pick your duration</div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-600 group-hover:text-emerald-500 transition" />
                </div>
            </button>
        </div>
    );
}
