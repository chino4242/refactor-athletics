"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Droplets, Wheat, Egg, Ban, Search, Plus } from 'lucide-react';
import ScreenshotUploader from './ScreenshotUploader';
import type { FoodResult } from '@/app/api/food-search/route';

interface MacroLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLog: (type: 'calories' | 'protein' | 'carbs' | 'fat' | 'water', value: number) => Promise<void>;
    totals: Record<string, number>;
    userId?: string;
}

export default function MacroLogModal({ isOpen, onClose, onLog, totals, userId }: MacroLogModalProps) {
    const [mounted, setMounted] = useState(false);

    // Values
    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fat, setFat] = useState('');
    const [water, setWater] = useState('');
    const [tab, setTab] = useState<'search' | 'manual'>('search');
    const [foodQuery, setFoodQuery] = useState('');
    const [foodResults, setFoodResults] = useState<FoodResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
    const [servingGrams, setServingGrams] = useState('100');

    const handleNutritionData = (data: any) => {
        if (data.protein) setProtein(String(data.protein));
        if (data.carbs) setCarbs(String(data.carbs));
        if (data.fat) setFat(String(data.fat));
        if (data.water) setWater(String(data.water));
    };

    const searchTimeoutRef = { current: null as NodeJS.Timeout | null };
    const handleFoodSearch = (q: string) => {
        setFoodQuery(q);
        setSelectedFood(null);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (q.length < 2) { setFoodResults([]); return; }
        searchTimeoutRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/api/food-search?q=${encodeURIComponent(q)}`);
                const data = await res.json();
                setFoodResults(data.results || []);
            } catch { setFoodResults([]); }
            finally { setSearching(false); }
        }, 400);
    };

    const handleAddFood = async () => {
        if (!selectedFood) return;
        const mult = (parseFloat(servingGrams) || 100) / 100;
        const p = Math.round(selectedFood.per100g.protein * mult);
        const c = Math.round(selectedFood.per100g.carbs * mult);
        const f = Math.round(selectedFood.per100g.fat * mult);
        const promises = [];
        if (p > 0) promises.push(onLog('protein', (totals['macro_protein'] || 0) + p));
        if (c > 0) promises.push(onLog('carbs', (totals['macro_carbs'] || 0) + c));
        if (f > 0) promises.push(onLog('fat', (totals['macro_fat'] || 0) + f));
        if (promises.length > 0) await Promise.all(promises);
        setSelectedFood(null);
        setFoodQuery('');
        setFoodResults([]);
        setServingGrams('100');
        onClose();
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

                {/* Tabs */}
                <div className="flex border-b border-zinc-800">
                    <button onClick={() => setTab('search')} className={`flex-1 text-xs font-bold uppercase py-2.5 transition border-b-2 ${tab === 'search' ? 'border-orange-500 text-white' : 'border-transparent text-zinc-500'}`}>
                        <Search size={12} className="inline mr-1" />Food Search
                    </button>
                    <button onClick={() => setTab('manual')} className={`flex-1 text-xs font-bold uppercase py-2.5 transition border-b-2 ${tab === 'manual' ? 'border-orange-500 text-white' : 'border-transparent text-zinc-500'}`}>
                        Set Totals
                    </button>
                </div>

                {tab === 'search' ? (
                    <div className="p-4 space-y-3">
                        {/* Search input */}
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search foods (e.g. chicken breast, rice)..."
                                value={foodQuery}
                                onChange={e => handleFoodSearch(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:border-orange-500 outline-none"
                                autoFocus
                            />
                        </div>

                        {/* Selected food — serving size + add */}
                        {selectedFood && (
                            <div className="bg-zinc-800/50 border border-orange-500/30 rounded-lg p-3 space-y-2">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-sm font-bold text-white">{selectedFood.name}</div>
                                        {selectedFood.brand && <div className="text-[10px] text-zinc-500">{selectedFood.brand}</div>}
                                    </div>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400 uppercase">{selectedFood.source}</span>
                                </div>
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <label className="text-[9px] text-zinc-500 uppercase block mb-0.5">Serving (g)</label>
                                        <input type="number" value={servingGrams} onChange={e => setServingGrams(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white text-center focus:border-orange-500 outline-none" />
                                    </div>
                                    <div className="flex gap-1">
                                        {[100, 150, 200].map(g => (
                                            <button key={g} onClick={() => setServingGrams(String(g))}
                                                className={`text-[9px] px-2 py-1.5 rounded border transition ${servingGrams === String(g) ? 'border-orange-500 text-orange-400' : 'border-zinc-700 text-zinc-500'}`}>{g}g</button>
                                        ))}
                                    </div>
                                </div>
                                {/* Calculated macros */}
                                {(() => {
                                    const mult = (parseFloat(servingGrams) || 100) / 100;
                                    return (
                                        <div className="grid grid-cols-4 gap-2 text-center">
                                            <div className="bg-zinc-900 rounded p-1.5">
                                                <div className="text-[8px] text-zinc-600">CAL</div>
                                                <div className="text-xs font-bold text-white">{Math.round(selectedFood.per100g.calories * mult)}</div>
                                            </div>
                                            <div className="bg-zinc-900 rounded p-1.5">
                                                <div className="text-[8px] text-zinc-600">PRO</div>
                                                <div className="text-xs font-bold text-red-400">{Math.round(selectedFood.per100g.protein * mult)}g</div>
                                            </div>
                                            <div className="bg-zinc-900 rounded p-1.5">
                                                <div className="text-[8px] text-zinc-600">CARB</div>
                                                <div className="text-xs font-bold text-yellow-400">{Math.round(selectedFood.per100g.carbs * mult)}g</div>
                                            </div>
                                            <div className="bg-zinc-900 rounded p-1.5">
                                                <div className="text-[8px] text-zinc-600">FAT</div>
                                                <div className="text-xs font-bold text-green-400">{Math.round(selectedFood.per100g.fat * mult)}g</div>
                                            </div>
                                        </div>
                                    );
                                })()}
                                <button onClick={handleAddFood}
                                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1.5">
                                    <Plus size={14} /> Add to Today
                                </button>
                            </div>
                        )}

                        {/* Results list */}
                        {!selectedFood && (
                            <div className="max-h-64 overflow-y-auto space-y-1">
                                {searching && <p className="text-xs text-zinc-500 text-center py-4">Searching...</p>}
                                {!searching && foodQuery.length >= 2 && foodResults.length === 0 && (
                                    <p className="text-xs text-zinc-500 text-center py-4">No results found</p>
                                )}
                                {foodResults.map(food => (
                                    <button key={food.id} onClick={() => { setSelectedFood(food); setServingGrams('100'); }}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 transition flex items-center justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm text-white truncate">{food.name}</div>
                                            {food.brand && <div className="text-[10px] text-zinc-600 truncate">{food.brand}</div>}
                                        </div>
                                        <div className="text-[9px] text-zinc-500 text-right ml-2 flex-shrink-0">
                                            <div>{food.per100g.calories} cal</div>
                                            <div>P{food.per100g.protein} C{food.per100g.carbs} F{food.per100g.fat}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                <>

                {/* Screenshot Upload */}
                <div className="p-4 border-b border-zinc-800/50">
                    <ScreenshotUploader type="nutrition" userId={userId} onDataExtracted={handleNutritionData} />
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
                </>
                )}
            </div>
        </div>
        , document.body);
}
