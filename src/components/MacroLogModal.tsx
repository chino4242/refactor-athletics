"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Droplets, Wheat, Egg, Ban } from 'lucide-react';

interface MacroLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLog: (type: 'calories' | 'protein' | 'carbs' | 'fat' | 'water', value: number, mode: 'add' | 'total') => Promise<void>;
    totals: Record<string, number>;
}

export default function MacroLogModal({ isOpen, onClose, onLog, totals }: MacroLogModalProps) {
    if (!isOpen) return null;

    const [mode, setMode] = useState<'add' | 'total'>('add');


    // Values
    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fat, setFat] = useState('');

    const [water, setWater] = useState('');

    const handleQuickLog = async (type: 'calories' | 'protein' | 'carbs' | 'fat' | 'water', valStr: string) => {
        const val = parseFloat(valStr);
        if (!val || val <= 0) return;

        await onLog(type, val, mode);

        // Clear input after log
        if (type === 'protein') setProtein('');
        if (type === 'carbs') setCarbs('');
        if (type === 'fat') setFat('');

        if (type === 'water') setWater('');
    };
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-2 text-white font-black italic tracking-tighter uppercase">
                        <span>🥗 Log Nutrition</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="p-4 border-b border-zinc-800/50">
                    <div className="flex bg-black rounded p-0.5 border border-zinc-800">
                        <button
                            onClick={() => setMode('add')}
                            className={`flex-1 text-xs font-bold rounded py-1.5 uppercase transition-all ${mode === 'add' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            [+] Add to Total
                        </button>
                        <button
                            onClick={() => setMode('total')}
                            className={`flex-1 text-xs font-bold rounded py-1.5 uppercase transition-all ${mode === 'total' ? 'bg-blue-900/50 text-blue-400 shadow-sm border border-blue-900/50' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            [=] Set Exact Total
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* MACROS */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Carbs */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-orange-500 uppercase flex items-center gap-1">
                                <Wheat size={12} /> Carbs (g)
                            </label>
                            <div className="flex gap-1">
                                <input
                                    type="number"
                                    value={carbs}
                                    placeholder={mode === 'total' ? String(Math.round(totals['macro_carbs'] || 0)) : "0"}
                                    onChange={(e) => setCarbs(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white text-center font-bold focus:border-orange-500 outline-none"
                                />
                                <button
                                    onClick={() => handleQuickLog('carbs', carbs)}
                                    className="bg-orange-600/20 hover:bg-orange-600 text-orange-500 hover:text-white border border-orange-600/50 rounded px-4 py-2.5 font-bold transition-all"
                                >
                                    LOG
                                </button>
                            </div>
                        </div>

                        {/* Fat */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-yellow-500 uppercase flex items-center gap-1">
                                <Ban size={12} /> Fat (g)
                            </label>
                            <div className="flex gap-1">
                                <input
                                    type="number"
                                    value={fat}
                                    placeholder={mode === 'total' ? String(Math.round(totals['macro_fat'] || 0)) : "0"}
                                    onChange={(e) => setFat(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white text-center font-bold focus:border-yellow-500 outline-none"
                                />
                                <button
                                    onClick={() => handleQuickLog('fat', fat)}
                                    className="bg-yellow-600/20 hover:bg-yellow-600 text-yellow-500 hover:text-white border border-yellow-600/50 rounded px-4 py-2.5 font-bold transition-all"
                                >
                                    LOG
                                </button>
                            </div>
                        </div>

                        {/* Protein */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1">
                                <Egg size={12} /> Protein (g)
                            </label>
                            <div className="flex gap-1">
                                <input
                                    type="number"
                                    value={protein}
                                    placeholder={mode === 'total' ? String(Math.round(totals['macro_protein'] || 0)) : "0"}
                                    onChange={(e) => setProtein(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white text-center font-bold focus:border-blue-500 outline-none"
                                />
                                <button
                                    onClick={() => handleQuickLog('protein', protein)}
                                    className="bg-blue-600/20 hover:bg-blue-600 text-blue-500 hover:text-white border border-blue-600/50 rounded px-4 py-2.5 font-bold transition-all"
                                >
                                    LOG
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-zinc-800 my-2" />

                    {/* Water */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-cyan-500 uppercase flex items-center gap-1">
                            <Droplets size={12} /> Water (oz)
                        </label>
                        <div className="flex gap-2">
                            {/* Quick Adds */}
                            <button onClick={() => handleQuickLog('water', '8')} className="bg-zinc-800 hover:bg-cyan-900 border border-zinc-700 hover:border-cyan-500 text-xs font-bold text-zinc-400 hover:text-cyan-400 rounded px-3 transition-all">+8</button>
                            <button onClick={() => handleQuickLog('water', '16')} className="bg-zinc-800 hover:bg-cyan-900 border border-zinc-700 hover:border-cyan-500 text-xs font-bold text-zinc-400 hover:text-cyan-400 rounded px-3 transition-all">+16</button>
                            <button onClick={() => handleQuickLog('water', '32')} className="bg-zinc-800 hover:bg-cyan-900 border border-zinc-700 hover:border-cyan-500 text-xs font-bold text-zinc-400 hover:text-cyan-400 rounded px-3 transition-all">+32</button>

                            <div className="flex-1 flex gap-1">
                                <input
                                    type="number"
                                    value={water}
                                    placeholder={mode === 'total' ? String(totals['habit_water'] || 0) : "Custom"}
                                    onChange={(e) => setWater(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white text-center font-bold focus:border-cyan-500 outline-none"
                                />
                                <button
                                    onClick={() => handleQuickLog('water', water)}
                                    className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-500 hover:text-white border border-cyan-600/50 rounded px-3 font-bold transition-all"
                                >
                                    LOG
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
        , document.body);
}
