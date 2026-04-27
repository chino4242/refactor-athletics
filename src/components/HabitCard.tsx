"use client";

import { useState, useRef, useEffect } from 'react';

interface HabitCardProps {
    habitId: string;
    label: string;
    icon?: string | React.ReactNode;
    current: number;
    goal: number;
    unit: string;
    colorClass: string; // e.g. "bg-orange-500" or "text-orange-500" - we will parse or expect bg base
    onLog: (amount: number, label: string) => void;
    onUndo?: () => void;
    onReset?: () => void;
    enableTotalSync?: boolean; // For Steps
    setOnly?: boolean; // Force "set" mode, hide add/quick buttons
    loading?: boolean;
    xp?: number;
    weekDots?: boolean[]; // 7 booleans for last 7 days (oldest first), true = goal met
}

export default function HabitCard({
    label,
    icon,
    current,
    goal,
    unit,
    colorClass,
    onLog,
    onUndo,
    onReset,
    enableTotalSync = false,
    setOnly = false,
    loading = false,
    xp = 0,
    weekDots
}: HabitCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState('');
    const [mode, setMode] = useState<'add' | 'total'>(setOnly ? 'total' : 'add');
    const [justLogged, setJustLogged] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const percent = Math.min((current / goal) * 100, 100);
    const isCompleted = current >= goal;

    // Parse color for text/bg (assuming format like "bg-orange-500")
    // If user passes "bg-orange-500", we might need "text-orange-500"
    const baseColorName = colorClass.replace('bg-', '').replace('text-', '');
    const textColor = `text-${baseColorName}`;

    const handleSubmit = () => {
        const val = parseFloat(value);
        if (!val || val <= 0) return;

        let finalVal = val;
        let logLabel = label;

        if (mode === 'total' && enableTotalSync) {
            finalVal = val;
            if (finalVal === current) return;
            logLabel = `${label} (Sync)`;
        }

        onLog(finalVal, logLabel);
        setValue('');
        setIsEditing(false);
        setMode('add');
        setSubmitting(false);
        setJustLogged(true);
        setTimeout(() => setJustLogged(false), 1200);
    };

    if (isEditing) {
        return (
            <div className={`relative p-3 rounded-xl border border-zinc-700 bg-zinc-900 group animate-fade-in`}>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-zinc-500 uppercase">{label}</span>
                    <div className="flex items-center gap-2">
                        {current > 0 && onReset && (
                            <button
                                onClick={() => { onReset(); setIsEditing(false); }}
                                className="text-[10px] text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded bg-red-500/10 border border-red-500/20"
                            >
                                Reset to 0
                            </button>
                        )}
                        <button
                            onClick={() => setIsEditing(false)}
                            className="text-xs text-zinc-600 hover:text-white uppercase font-bold px-2 py-1.5"
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                {enableTotalSync && !setOnly && (
                    <div className="flex bg-black rounded p-0.5 border border-zinc-800 mb-2">
                        <button
                            onClick={() => setMode('add')}
                            className={`flex-1 text-xs font-bold rounded py-2.5 uppercase transition-all ${mode === 'add' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            [+] Add
                        </button>
                        <button
                            onClick={() => setMode('total')}
                            className={`flex-1 text-xs font-bold rounded py-2.5 uppercase transition-all ${mode === 'total' ? 'bg-blue-900/50 text-blue-400 shadow-sm border border-blue-900/50' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            [=] Set
                        </button>
                    </div>
                )}

                <div className="flex gap-1">
                    <input
                        ref={inputRef}
                        type="number"
                        inputMode="decimal"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmit();
                            if (e.key === 'Escape') setIsEditing(false);
                        }}
                        className={`w-full bg-zinc-950 rounded p-1.5 text-xs text-white text-center outline-none border transition-all ${mode === 'total' ? 'border-orange-900 focus:border-orange-500 placeholder-orange-500/50' : 'border-zinc-800 focus:border-zinc-600'}`}
                        placeholder={mode === 'total' ? String(current) : unit}
                    />
                    <button
                        onClick={() => { setSubmitting(true); handleSubmit(); }}
                        disabled={loading || submitting || !value}
                        className={`px-4 py-2.5 rounded font-bold text-xs uppercase tracking-wider transition-all ${loading || submitting ? 'opacity-50' : `hover:opacity-90 active:scale-95 text-white ${colorClass}`}`}
                    >
                        {submitting ? '...' : (mode === 'total' ? 'SET' : 'LOG')}
                    </button>
                </div>
            </div>
        );
    }

    // DISPLAY MODE
    return (
        <button
            onClick={() => !loading && setIsEditing(true)}
            className="w-full text-left relative group outline-none"
        >
            <div className={`p-2 bg-zinc-900/50 hover:bg-zinc-900 rounded-xl border transition-all duration-300 ${justLogged ? 'border-emerald-500 bg-emerald-500/5' : 'border-zinc-800/50 hover:border-zinc-700'}`}>

                {/* Header */}
                <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                        {typeof icon === 'string' ? <span className="text-sm">{icon}</span> : icon}
                        <span className="text-[10px] uppercase font-bold text-zinc-400 group-hover:text-zinc-300 transition-colors">{label}</span>
                        {justLogged && <span className="text-[10px] text-emerald-400 font-bold animate-pulse">✓</span>}
                        {justLogged && onUndo && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onUndo(); setJustLogged(false); }}
                                className="text-[10px] text-red-400 hover:text-red-300 font-bold px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20"
                            >
                                Undo
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono font-bold ${isCompleted ? 'text-emerald-500' : textColor}`}>
                            {current} <span className="text-zinc-600">/ {goal}</span>
                        </span>
                        {xp > 0 && !isCompleted && (
                            <span className={`text-[9px] px-1 rounded bg-zinc-950 border border-zinc-800 ${textColor} opacity-60`}>+{xp}xp</span>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${isCompleted ? 'bg-emerald-500' : colorClass} transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                    />
                </div>

                {/* Week dots */}
                {weekDots && (
                    <div className="flex gap-0.5 mt-1.5 justify-end">
                        {weekDots.map((met, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${met ? colorClass : 'bg-zinc-800'}`} />
                        ))}
                    </div>
                )}

                {/* Mobile-friendly: No hover overlays */}
            </div>
        </button>
    );
}
