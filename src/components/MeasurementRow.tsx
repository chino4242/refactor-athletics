"use client";

import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, Ban } from 'lucide-react';

interface MeasurementRowProps {
    label: string;
    currentGoal: string; // 'Grow' | 'Shrink' | 'Maintain' | 'Disable'
    currentValue: string; // Display generic last value or "-"
    onGoalChange: (newGoal: string) => void;
    onLog: (value: number) => void;
    unit?: string;
    disabled?: boolean;
    loading?: boolean;
}

export default function MeasurementRow({ label, currentGoal, currentValue, onGoalChange, onLog, unit = "in", disabled, loading }: MeasurementRowProps) {
    const [inputVal, setInputVal] = useState('');

    const goals = [
        { id: 'Grow', icon: <TrendingUp size={14} className="text-emerald-500" />, label: 'Grow' },
        { id: 'Shrink', icon: <TrendingDown size={14} className="text-red-500" />, label: 'Shrink' },
        { id: 'Maintain', icon: <Minus size={14} className="text-blue-500" />, label: 'Maintain' },
        { id: 'Disable', icon: <Ban size={14} className="text-zinc-500" />, label: 'Disable' },
    ];

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const activeGoal = goals.find(g => g.id === currentGoal) || goals[3]; // Default Disable if unknown

    const isDisabled = currentGoal === 'Disable';

    return (
        <div className={`p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl transition-all ${isDisabled ? 'opacity-50' : ''}`}>
            {/* Header: Label + Goal Config */}
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    {label}
                </span>

                {/* Goal Selector */}
                <div className="group relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase py-2 px-3 rounded bg-zinc-800 hover:bg-zinc-700 transition border border-zinc-700"
                    >
                        {activeGoal.icon}
                        <span className="text-zinc-300">{activeGoal.label}</span>
                    </button>

                    {/* Click Dropdown */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 top-full mt-1 w-24 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-20">
                            {goals.map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => {
                                        onGoalChange(g.id);
                                        setIsDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-3 text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-zinc-800 transition ${currentGoal === g.id ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
                                >
                                    {g.icon}
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Input Area */}
            {!isDisabled && (
                <div className="flex gap-2">
                    <div className="relative w-full">
                        <input
                            type="number"
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            disabled={disabled || loading}
                            className="w-full bg-zinc-950 rounded-lg p-2 text-sm text-white text-center outline-none border border-zinc-800 focus:border-zinc-600 transition font-bold disabled:opacity-50 placeholder:text-zinc-700"
                            placeholder={currentValue !== '0' ? currentValue : "0.0"}
                            step="0.01"
                        />
                        <span className="absolute right-3 top-2.5 text-[10px] text-zinc-600 font-bold pointer-events-none uppercase">{unit}</span>
                    </div>
                    <button
                        onClick={() => {
                            if (!inputVal) return;
                            onLog(Number(inputVal));
                            setInputVal('');
                        }}
                        disabled={disabled || loading || !inputVal}
                        className="bg-white hover:bg-zinc-200 text-black text-xs px-3 rounded-lg font-black uppercase tracking-wide transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Log
                    </button>
                </div>
            )}
        </div>
    );
}
