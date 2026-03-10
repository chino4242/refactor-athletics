"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Droplets, Wheat, Egg, Ban } from 'lucide-react';
import ScreenshotUploader from './ScreenshotUploader';

interface MacroLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLog: (type: 'calories' | 'protein' | 'carbs' | 'fat' | 'water', value: number) => Promise<void>;
    totals: Record<string, number>;
}

export default function MacroLogModal({ isOpen, onClose, onLog, totals }: MacroLogModalProps) {
    const [mounted, setMounted] = useState(false);

    // Values
    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fat, setFat] = useState('');
    const [water, setWater] = useState('');

    const handleNutritionData = (data: any) => {
        if (data.protein) setProtein(String(data.protein));
        if (data.carbs) setCarbs(String(data.carbs));
        if (data.fat) setFat(String(data.fat));
        if (data.water) setWater(String(data.water));
    };

    const handleLogAll = async () => {
        const promises = [];
        
        if (protein && parseFloat(protein) > 0) {
            promises.push(onLog('protein', parseFloat(protein)));
        }
        if (carbs && parseFloat(carbs) > 0) {
            promises.push(onLog('carbs', parseFloat(carbs)));
        }
        if (fat && parseFloat(fat) > 0) {
            promises.push(onLog('fat', parseFloat(fat)));
        }
        if (water && parseFloat(water) > 0) {
            promises.push(onLog('water', parseFloat(water)));
        }

        if (promises.length > 0) {
            await Promise.all(promises);
            // Clear all fields after logging
            setProtein('');
            setCarbs('');
            setFat('');
            setWater('');
            onClose(); // Close modal after logging
        }
    };

    const handleQuickWater = async (amount: string) => {
        const val = parseFloat(amount);
        if (val > 0) {
            const currentWater = totals['habit_water'] || 0;
            await onLog('water', currentWater + val);
        }
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-white font-black italic tracking-tighter uppercase">
                            <span>🥗 Set Nutrition Totals</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-medium">
                            Enter exact totals for the day
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Screenshot Upload */}
                <div className="p-4 border-b border-zinc-800/50">
                    <ScreenshotUploader type="nutrition" onDataExtracted={handleNutritionData} />
                </div>

                {/* Current Totals Display */}
                <div className="p-4 border-b border-zinc-800/50">
                    <div className="p-2 bg-blue-950/20 border border-blue-900/30 rounded text-xs text-blue-400">
                        <div className="font-bold mb-1">Current Totals:</div>
                        <div className="grid grid-cols-4 gap-2 text-[10px]">
                            <div>🍞 {Math.round(totals['macro_carbs'] || 0)}g</div>
                            <div>🥑 {Math.round(totals['macro_fat'] || 0)}g</div>
                            <div>🥩 {Math.round(totals['macro_protein'] || 0)}g</div>
                            <div>💧 {Math.round(totals['habit_water'] || 0)}oz</div>
                        </div>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {/* MACROS */}
                    <div className="grid grid-cols-3 gap-3">
                        {/* Carbs */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-orange-500 uppercase flex items-center gap-1">
                                <Wheat size={12} /> Carbs (g)
                            </label>
                            <input
                                type="number"
                                value={carbs}
                                placeholder={String(Math.round(totals['macro_carbs'] || 0))}
                                onChange={(e) => setCarbs(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white text-center font-bold focus:border-orange-500 outline-none"
                            />
                        </div>

                        {/* Fat */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-yellow-500 uppercase flex items-center gap-1">
                                <Ban size={12} /> Fat (g)
                            </label>
                            <input
                                type="number"
                                value={fat}
                                placeholder={String(Math.round(totals['macro_fat'] || 0))}
                                onChange={(e) => setFat(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white text-center font-bold focus:border-yellow-500 outline-none"
                            />
                        </div>

                        {/* Protein */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-blue-500 uppercase flex items-center gap-1">
                                <Egg size={12} /> Protein (g)
                            </label>
                            <input
                                type="number"
                                value={protein}
                                placeholder={String(Math.round(totals['macro_protein'] || 0))}
                                onChange={(e) => setProtein(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white text-center font-bold focus:border-blue-500 outline-none"
                            />
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
                            <button onClick={() => handleQuickWater('8')} className="bg-zinc-800 hover:bg-cyan-900 border border-zinc-700 hover:border-cyan-500 text-xs font-bold text-zinc-400 hover:text-cyan-400 rounded px-3 transition-all">+8</button>
                            <button onClick={() => handleQuickWater('16')} className="bg-zinc-800 hover:bg-cyan-900 border border-zinc-700 hover:border-cyan-500 text-xs font-bold text-zinc-400 hover:text-cyan-400 rounded px-3 transition-all">+16</button>
                            <button onClick={() => handleQuickWater('32')} className="bg-zinc-800 hover:bg-cyan-900 border border-zinc-700 hover:border-cyan-500 text-xs font-bold text-zinc-400 hover:text-cyan-400 rounded px-3 transition-all">+32</button>

                            <input
                                type="number"
                                value={water}
                                placeholder="Custom"
                                onChange={(e) => setWater(e.target.value)}
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 text-white text-center font-bold focus:border-cyan-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Log All Button */}
                    <button
                        onClick={handleLogAll}
                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-black italic uppercase py-3 rounded-lg shadow-lg transition-all"
                    >
                        Set Totals
                    </button>

                </div>
            </div>
        </div>
        , document.body);
}
