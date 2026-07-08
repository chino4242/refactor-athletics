"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Droplets, Wheat, Egg, Ban, Search, Plus, ScanBarcode, Camera } from 'lucide-react';
import ScreenshotUploader from './ScreenshotUploader';
import type { FoodResult } from '@/app/api/food-search/route';
import dynamic from 'next/dynamic';

const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { ssr: false });

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
    const [tab, setTab] = useState<'search' | 'manual' | 'ai'>('search');
    const [foodQuery, setFoodQuery] = useState('');
    const [foodResults, setFoodResults] = useState<FoodResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
    const [aiInput, setAiInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [photoLoading, setPhotoLoading] = useState(false);
    const [waterFlash, setWaterFlash] = useState(false);
    const [mealCart, setMealCart] = useState<{ food: FoodResult; servingGrams: string; p: number; c: number; f: number }[]>([]);
    const [editingCartIdx, setEditingCartIdx] = useState<number | null>(null);
    const [showMealTypePicker, setShowMealTypePicker] = useState(false);
    const [loggedConfirmation, setLoggedConfirmation] = useState(false);

    const handleMealPhoto = async (file: File) => {
        setPhotoLoading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('type', 'meal_photo');
            const res = await fetch('/api/parse-screenshot', { method: 'POST', body: formData });
            if (!res.ok) {
                setPhotoLoading(false);
                setAiInput('Photo analysis failed — try describing your meal instead');
                return;
            }
            const json = await res.json();
            const data = json.data;
            if (data?.foods?.length) {
                const foods: FoodResult[] = data.foods.map((item: any) => ({
                    id: `photo_${item.name?.replace(/\s+/g, '_').toLowerCase()}`,
                    name: item.name,
                    source: 'usda' as const,
                    servingSize: '1 serving',
                    per100g: { calories: item.calories || 0, protein: item.protein || 0, carbs: item.carbs || 0, fat: item.fat || 0 },
                }));
                // Auto-add all photo items to cart
                const cartItems = foods.map(food => ({
                    food, servingGrams: '100',
                    p: food.per100g.protein, c: food.per100g.carbs, f: food.per100g.fat,
                }));
                setMealCart(prev => [...prev, ...cartItems]);
                setFoodQuery('');
                setTab('search');
            } else {
                // AI returned but couldn't identify foods
                setAiInput('breakfast sandwich with sausage, protein shake');
                setTab('search');
            }
        } catch (e) {
            console.error('Meal photo parse failed:', e);
            setAiInput('Photo failed — describe your meal here');
        }
        finally { setPhotoLoading(false); }
    };
    const [servingGrams, setServingGrams] = useState('100');

    // Favorites
    const [favorites, setFavorites] = useState<FoodResult[]>([]);
    const [recents, setRecents] = useState<FoodResult[]>([]);
    const [meals, setMeals] = useState<{ name: string; foods: FoodResult[] }[]>([]);
    const [showMealBuilder, setShowMealBuilder] = useState(false);
    const [mealName, setMealName] = useState('');
    const [mealItems, setMealItems] = useState<FoodResult[]>([]);
    useEffect(() => {
        if (isOpen && userId) {
            const saved = localStorage.getItem('favorite_foods');
            if (saved) try { setFavorites(JSON.parse(saved)); } catch {}
            const recentSaved = localStorage.getItem('recent_foods');
            if (recentSaved) try { setRecents(JSON.parse(recentSaved)); } catch {}
            const mealsSaved = localStorage.getItem('saved_meals');
            if (mealsSaved) try { setMeals(JSON.parse(mealsSaved)); } catch {}
        }
    }, [isOpen, userId]);

    const saveMeal = () => {
        if (!mealName.trim() || mealItems.length === 0) return;
        const next = [...meals, { name: mealName.trim(), foods: mealItems }];
        setMeals(next);
        localStorage.setItem('saved_meals', JSON.stringify(next));
        setMealName('');
        setMealItems([]);
        setShowMealBuilder(false);
    };

    const logMeal = async (meal: { name: string; foods: FoodResult[] }) => {
        let totalP = 0, totalC = 0, totalF = 0;
        for (const food of meal.foods) {
            const mult = (parseFloat(food.servingSize?.replace(/[^0-9.]/g, '') || '') || 100) / 100;
            totalP += Math.round(food.per100g.protein * mult);
            totalC += Math.round(food.per100g.carbs * mult);
            totalF += Math.round(food.per100g.fat * mult);
        }
        const promises = [];
        if (totalP > 0) promises.push(onLog('protein', (totals['macro_protein'] || 0) + totalP));
        if (totalC > 0) promises.push(onLog('carbs', (totals['macro_carbs'] || 0) + totalC));
        if (totalF > 0) promises.push(onLog('fat', (totals['macro_fat'] || 0) + totalF));
        if (promises.length > 0) await Promise.all(promises);
        onClose();
    };

    const deleteMeal = (name: string) => {
        const next = meals.filter(m => m.name !== name);
        setMeals(next);
        localStorage.setItem('saved_meals', JSON.stringify(next));
    };

    const toggleFavorite = (food: FoodResult) => {
        setFavorites(prev => {
            const exists = prev.some(f => f.name === food.name);
            const next = exists ? prev.filter(f => f.name !== food.name) : [...prev, food];
            localStorage.setItem('favorite_foods', JSON.stringify(next));
            return next;
        });
    };

    const isFavorite = (food: FoodResult) => favorites.some(f => f.name === food.name);

    const handleAiParse = async () => {
        if (!aiInput.trim()) return;
        setAiLoading(true);
        try {
            const res = await fetch('/api/food-parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: aiInput }) });
            const data = await res.json();
            if (data.foods?.length) {
                setFoodResults(data.foods);
                setFoodQuery('');
                setTab('search');
                setAiInput('');
                // Auto-select if single item
                if (data.foods.length === 1) {
                    setSelectedFood(data.foods[0]);
                    setServingGrams(parseServingGrams(data.foods[0].servingSize) || '100');
                }
            }
        } catch {}
        finally { setAiLoading(false); }
    };

    const parseServingGrams = (s?: string): string => {
        if (!s) return '100';
        // Match "28g", "170 g", "1.5g"
        const gMatch = s.match(/([\d.]+)\s*g/i);
        if (gMatch) return String(Math.round(parseFloat(gMatch[1])));
        // Match "244ml" or "240 ml" (treat ml as g for liquids)
        const mlMatch = s.match(/([\d.]+)\s*ml/i);
        if (mlMatch) return String(Math.round(parseFloat(mlMatch[1])));
        // Match plain number like "28"
        const numMatch = s.match(/^([\d.]+)$/);
        if (numMatch) return String(Math.round(parseFloat(numMatch[1])));
        return '100';
    };
    const [showScanner, setShowScanner] = useState(false);

    const handleNutritionData = (data: any) => {
        if (data.protein) setProtein(String(data.protein));
        if (data.carbs) setCarbs(String(data.carbs));
        if (data.fat) setFat(String(data.fat));
        if (data.water) setWater(String(data.water));
    };

    const searchTimeoutRef = { current: null as NodeJS.Timeout | null };
    const abortRef = { current: null as AbortController | null };
    const handleFoodSearch = (q: string) => {
        setFoodQuery(q);
        setSelectedFood(null);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (abortRef.current) abortRef.current.abort();
        if (q.length < 2) { setFoodResults([]); return; }
        searchTimeoutRef.current = setTimeout(async () => {
            const controller = new AbortController();
            abortRef.current = controller;
            setSearching(true);
            try {
                const res = await fetch(`/api/food-search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
                const data = await res.json();
                if (!controller.signal.aborted) {
                    const results: FoodResult[] = data.results || [];
                    // Boost previously logged foods to the top
                    const recentNames = new Set(recents.map(r => r.name.toLowerCase()));
                    const favNames = new Set(favorites.map(f => f.name.toLowerCase()));
                    results.sort((a, b) => {
                        const aBoost = (favNames.has(a.name.toLowerCase()) ? 2 : 0) + (recentNames.has(a.name.toLowerCase()) ? 1 : 0);
                        const bBoost = (favNames.has(b.name.toLowerCase()) ? 2 : 0) + (recentNames.has(b.name.toLowerCase()) ? 1 : 0);
                        return bBoost - aBoost;
                    });
                    setFoodResults(results);
                }
            } catch (e: any) { if (e?.name !== 'AbortError') setFoodResults([]); }
            finally { if (!controller.signal.aborted) setSearching(false); }
        }, 400);
    };

    const handleAddToCart = () => {
        if (!selectedFood) return;
        const mult = (parseFloat(servingGrams) || 100) / 100;
        const p = Math.round(selectedFood.per100g.protein * mult);
        const c = Math.round(selectedFood.per100g.carbs * mult);
        const f = Math.round(selectedFood.per100g.fat * mult);
        // Save to recents
        setRecents(prev => {
            const filtered = prev.filter(r => r.name !== selectedFood.name);
            const next = [selectedFood, ...filtered].slice(0, 10);
            localStorage.setItem('recent_foods', JSON.stringify(next));
            return next;
        });
        setMealCart(prev => [...prev, { food: selectedFood, servingGrams, p, c, f }]);
        setSelectedFood(null);
        setFoodQuery('');
        setFoodResults([]);
        setServingGrams('100');
    };

    const handleUpdateCartItem = (idx: number, newServing: string) => {
        setMealCart(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            const mult = (parseFloat(newServing) || 100) / 100;
            return { ...item, servingGrams: newServing, p: Math.round(item.food.per100g.protein * mult), c: Math.round(item.food.per100g.carbs * mult), f: Math.round(item.food.per100g.fat * mult) };
        }));
    };

    const handleRemoveCartItem = (idx: number) => {
        setMealCart(prev => prev.filter((_, i) => i !== idx));
        setEditingCartIdx(null);
    };

    const [mealLogging, setMealLogging] = useState(false);

    const handleLogMeal = async (mealType: string) => {
        if (mealCart.length === 0 || mealLogging) return;
        setMealLogging(true);
        const supabase = (await import('@/utils/supabase/client')).createClient();
        const date = new Date().toLocaleDateString('en-CA');
        const ts = Math.floor(Date.now() / 1000);

        // Save each item to meal_entries
        for (const item of mealCart) {
            await supabase.from('meal_entries').insert({
                user_id: userId, date, meal_type: mealType, food_name: item.food.name,
                protein: item.p, carbs: item.c, fat: item.f,
                calories: item.p * 4 + item.c * 4 + item.f * 9,
                serving_size: `${item.servingGrams}g`, timestamp: ts,
            });
        }

        // Fetch fresh totals from meal_entries to avoid stale state
        const { data: allMeals } = await supabase.from('meal_entries')
            .select('protein, carbs, fat')
            .eq('user_id', userId).eq('date', date);
        const freshP = (allMeals || []).reduce((s: number, m: any) => s + (m.protein || 0), 0);
        const freshC = (allMeals || []).reduce((s: number, m: any) => s + (m.carbs || 0), 0);
        const freshF = (allMeals || []).reduce((s: number, m: any) => s + (m.fat || 0), 0);

        // Set totals to the fresh values from meal_entries
        const promises = [];
        if (freshP > 0) promises.push(onLog('protein', freshP));
        if (freshC > 0) promises.push(onLog('carbs', freshC));
        if (freshF > 0) promises.push(onLog('fat', freshF));
        if (promises.length > 0) await Promise.all(promises);

        setMealCart([]);
        setShowMealTypePicker(false);
        setLoggedConfirmation(true);
        setMealLogging(false);
        setTimeout(() => setLoggedConfirmation(false), 3000);
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
                            <span>🥗 Log Nutrition</span>
                        </div>
                        <div className="text-xs text-zinc-500 font-medium">
                            {Math.round(totals['macro_protein'] || 0)}g P · {Math.round(totals['macro_carbs'] || 0)}g C · {Math.round(totals['macro_fat'] || 0)}g F · {Math.round((totals['macro_protein'] || 0) * 4 + (totals['macro_carbs'] || 0) * 4 + (totals['macro_fat'] || 0) * 9)} cal today
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* AI-First Input */}
                <div className="p-4 border-b border-zinc-800">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={aiInput}
                            onChange={e => setAiInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && aiInput.trim()) handleAiParse(); }}
                            placeholder="What did you eat? e.g. chicken breast and rice"
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-zinc-500 outline-none placeholder:text-zinc-600"
                            autoFocus
                        />
                        <label className={`border text-zinc-400 hover:text-white px-3 rounded-xl transition cursor-pointer flex items-center shrink-0 ${photoLoading ? 'bg-orange-500/10 border-orange-500/30 animate-pulse' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700'}`}>
                            {photoLoading ? <span className="text-sm text-orange-400">📸</span> : <Camera size={18} />}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={photoLoading}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleMealPhoto(f); e.target.value = ''; }}
                            />
                        </label>
                        <button
                            onClick={handleAiParse}
                            disabled={aiLoading || !aiInput.trim()}
                            className="bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold px-4 rounded-xl text-xs uppercase tracking-wider transition shrink-0"
                        >
                            {aiLoading ? '...' : 'Go'}
                        </button>
                    </div>
                    {(aiLoading || photoLoading) && (
                        <div className="mt-2 text-center">
                            <span className="text-sm text-orange-400 animate-pulse">{photoLoading ? 'Analyzing your photo...' : 'Analyzing your meal...'}</span>
                        </div>
                    )}
                </div>

                {/* Water Quick-Log */}
                <div className="px-4 py-2 border-b border-zinc-800/50 flex items-center gap-2">
                    <span className="text-sm">💧</span>
                    <span className={`text-xs font-bold uppercase shrink-0 transition-colors ${waterFlash ? 'text-cyan-400' : 'text-zinc-500'}`}>{Math.round(totals['habit_water'] || 0)}oz</span>
                    <div className="flex gap-1.5 flex-1">
                        {[8, 16, 32].map(oz => (
                            <button key={oz} onClick={async () => { setWaterFlash(true); await onLog('water', (totals['habit_water'] || 0) + oz); setTimeout(() => setWaterFlash(false), 1000); }}
                                className="flex-1 bg-zinc-800 hover:bg-cyan-900 border border-zinc-700 hover:border-cyan-500 text-xs font-bold text-zinc-400 hover:text-cyan-400 rounded-lg py-1.5 transition active:scale-95 active:bg-cyan-800">
                                +{oz}oz
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quick-Log Tiles (recent meals, one-tap) */}
                {recents.length > 0 && !foodResults.length && (
                    <div className="px-4 py-2 border-b border-zinc-800/50">
                        <span className="text-xs text-zinc-600 uppercase font-bold tracking-wider">Quick Log</span>
                        <div className="flex gap-2 mt-1.5 overflow-x-auto no-scrollbar pb-1">
                            {recents.slice(0, 5).map((food, i) => {
                                const servGrams = parseFloat(parseServingGrams(food.servingSize));
                                const mult = servGrams / 100;
                                const p = Math.round(food.per100g.protein * mult);
                                return (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            const c = Math.round(food.per100g.carbs * mult);
                                            const f = Math.round(food.per100g.fat * mult);
                                            setMealCart(prev => [...prev, { food, servingGrams: String(Math.round(servGrams)), p, c, f }]);
                                        }}
                                        className="shrink-0 bg-zinc-800/60 border border-zinc-700/40 rounded-xl px-3 py-2 hover:border-zinc-600/40 transition text-left"
                                    >
                                        <div className="text-xs font-semibold text-white truncate max-w-[100px]">{food.name}</div>
                                        <div className="text-xs text-orange-400 font-bold mt-0.5">{p}g P</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Tabs (secondary) */}
                <div className="flex border-b border-zinc-800">
                    <button onClick={() => setTab('search')} className={`flex-1 text-xs font-bold uppercase py-2.5 transition border-b-2 ${tab === 'search' ? 'border-orange-500 text-white' : 'border-transparent text-zinc-500'}`}>
                        <Search size={12} className="inline mr-1" />Search
                    </button>
                    <button onClick={() => setTab('manual')} className={`flex-1 text-xs font-bold uppercase py-2.5 transition border-b-2 ${tab === 'manual' ? 'border-orange-500 text-white' : 'border-transparent text-zinc-500'}`}>
                        Set Totals
                    </button>
                </div>

                {tab === 'search' ? (
                    <div className="p-4 space-y-3">
                        {/* Search input */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="Search foods..."
                                    value={foodQuery}
                                    onChange={e => handleFoodSearch(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:border-zinc-500 outline-none"
                                    autoFocus
                                />
                            </div>
                            <button onClick={() => setShowScanner(true)}
                                className="bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg px-3 transition flex items-center"
                                title="Scan barcode">
                                <ScanBarcode size={18} className="text-zinc-400" />
                            </button>
                        </div>

                        {/* Selected food — serving size + add */}
                        {selectedFood && (
                            <div className="bg-zinc-800/50 border border-orange-500/30 rounded-lg p-3 space-y-2">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-base font-bold text-white">{selectedFood.name}</div>
                                        {selectedFood.brand && <div className="text-xs text-zinc-500">{selectedFood.brand}</div>}
                                    </div>
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400 uppercase">{selectedFood.source}</span>
                                </div>
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <label className="text-xs text-zinc-500 uppercase block mb-0.5">Serving (g)</label>
                                        <input type="number" value={servingGrams} onChange={e => setServingGrams(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white text-center focus:border-zinc-500 outline-none" />
                                        {selectedFood.servingLabel && <div className="text-xs text-zinc-500 mt-0.5 text-center">{selectedFood.servingLabel}</div>}
                                    </div>
                                    <div className="flex gap-1 flex-wrap">
                                        {(() => {
                                            const actual = parseServingGrams(selectedFood.servingSize);
                                            const presets = actual ? [actual, '100', '150', '200'] : ['50', '100', '150', '200'];
                                            const unique = [...new Set(presets)];
                                            return unique.map(g => (
                                                <button key={g} onClick={() => setServingGrams(g)}
                                                    className={`text-xs px-2 py-1.5 rounded border transition ${servingGrams === g ? 'border-orange-500 text-orange-400' : 'border-zinc-700 text-zinc-500'}`}>
                                                    {g === actual && actual !== '100' ? `${g}g ★` : `${g}g`}
                                                </button>
                                            ));
                                        })()}
                                    </div>
                                </div>
                                {/* Calculated macros */}
                                {(() => {
                                    const mult = (parseFloat(servingGrams) || 100) / 100;
                                    return (
                                        <div className="grid grid-cols-4 gap-2 text-center">
                                            <div className="bg-zinc-900 rounded p-1.5">
                                                <div className="text-xs text-zinc-600">CAL</div>
                                                <div className="text-sm font-bold text-white">{Math.round(selectedFood.per100g.calories * mult)}</div>
                                            </div>
                                            <div className="bg-zinc-900 rounded p-1.5">
                                                <div className="text-xs text-zinc-600">PRO</div>
                                                <div className="text-sm font-bold text-red-400">{Math.round(selectedFood.per100g.protein * mult)}g</div>
                                            </div>
                                            <div className="bg-zinc-900 rounded p-1.5">
                                                <div className="text-xs text-zinc-600">CARB</div>
                                                <div className="text-sm font-bold text-yellow-400">{Math.round(selectedFood.per100g.carbs * mult)}g</div>
                                            </div>
                                            <div className="bg-zinc-900 rounded p-1.5">
                                                <div className="text-xs text-zinc-600">FAT</div>
                                                <div className="text-sm font-bold text-green-400">{Math.round(selectedFood.per100g.fat * mult)}g</div>
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div className="flex gap-2">
                                    <button onClick={handleAddToCart}
                                        className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1.5">
                                        <Plus size={14} /> Add to Meal
                                    </button>
                                    <button onClick={() => selectedFood && toggleFavorite(selectedFood)}
                                        className={`px-3 py-2.5 rounded-lg border transition ${isFavorite(selectedFood!) ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-yellow-400'}`}>
                                        ★
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Meal Cart */}
                        {mealCart.length > 0 && !showMealTypePicker && (
                            <div className="bg-zinc-800/50 border border-emerald-500/20 rounded-xl p-3 space-y-2">
                                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Meal ({mealCart.length} items)</div>
                                {mealCart.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-zinc-900/50 rounded-lg px-2.5 py-1.5">
                                        {editingCartIdx === idx ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <span className="text-sm text-white truncate max-w-[120px]">{item.food.name}</span>
                                                <input type="number" value={item.servingGrams} onChange={e => handleUpdateCartItem(idx, e.target.value)}
                                                    className="w-14 bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-white text-center focus:border-zinc-500 outline-none" />
                                                <span className="text-xs text-zinc-500">g</span>
                                                <button onClick={() => setEditingCartIdx(null)} className="text-xs text-emerald-400 font-bold">Done</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setEditingCartIdx(idx)} className="flex-1 text-left">
                                                <span className="text-sm text-white">{item.food.name}</span>
                                                <span className="text-xs text-zinc-500 ml-1.5">{item.servingGrams}g</span>
                                            </button>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-zinc-400">P:{item.p} C:{item.c} F:{item.f}</span>
                                            <button onClick={() => handleRemoveCartItem(idx)} className="text-zinc-700 hover:text-red-400 transition">✕</button>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex items-center justify-between pt-1 border-t border-zinc-700/50">
                                    <span className="text-xs text-zinc-400">Total</span>
                                    <span className="text-sm font-bold text-white">
                                        P:{mealCart.reduce((s, i) => s + i.p, 0)} C:{mealCart.reduce((s, i) => s + i.c, 0)} F:{mealCart.reduce((s, i) => s + i.f, 0)} · {mealCart.reduce((s, i) => s + i.p * 4 + i.c * 4 + i.f * 9, 0)} cal
                                    </span>
                                </div>
                                <button onClick={() => setShowMealTypePicker(true)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition">
                                    Log Meal
                                </button>
                            </div>
                        )}

                        {/* Meal Type Picker */}
                        {showMealTypePicker && (
                            <div className="bg-zinc-800/50 border border-emerald-500/20 rounded-xl p-3 space-y-2">
                                <div className="text-xs text-zinc-400 text-center">Which meal is this?</div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: 'breakfast', emoji: '🌅', label: 'Breakfast' },
                                        { id: 'lunch', emoji: '🌞', label: 'Lunch' },
                                        { id: 'dinner', emoji: '🌙', label: 'Dinner' },
                                        { id: 'snack', emoji: '🍿', label: 'Snack' },
                                    ].map(m => (
                                        <button key={m.id} onClick={() => handleLogMeal(m.id)}
                                            className="flex flex-col items-center gap-1 py-2 bg-zinc-900 hover:bg-emerald-500/10 border border-zinc-700 hover:border-emerald-500/30 rounded-lg transition">
                                            <span className="text-lg">{m.emoji}</span>
                                            <span className="text-xs text-zinc-400 font-bold">{m.label}</span>
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => setShowMealTypePicker(false)} className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 py-1">Back</button>
                            </div>
                        )}

                        {/* Logged Confirmation */}
                        {loggedConfirmation && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
                                <span className="text-sm">✓</span>
                                <span className="text-sm font-bold text-emerald-400 ml-2">Meal logged!</span>
                            </div>
                        )}

                        {/* Results list */}
                        {!selectedFood && (
                            <div className="max-h-64 overflow-y-auto space-y-1">
                                {/* Favorites — show when not searching */}
                                {!foodQuery && favorites.length > 0 && (
                                    <div className="mb-3">
                                        <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">★ Favorites</span>
                                        <div className="mt-1 space-y-1">
                                            {favorites.map(food => (
                                                <button key={food.name} onClick={() => { setSelectedFood(food); setServingGrams(parseServingGrams(food.servingSize) || '100'); }}
                                                    className="w-full text-left p-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:border-yellow-500/30 transition">
                                                    <div className="text-sm font-medium text-white truncate">{food.name}</div>
                                                    <div className="text-xs text-zinc-500">P:{food.per100g.protein} C:{food.per100g.carbs} F:{food.per100g.fat} per 100g</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Recents — show when not searching */}
                                {!foodQuery && recents.length > 0 && (
                                    <div className="mb-3">
                                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">🕐 Recent</span>
                                        <div className="mt-1 space-y-1">
                                            {recents.filter(r => !favorites.some(f => f.name === r.name)).slice(0, 5).map(food => (
                                                <button key={food.name} onClick={() => { setSelectedFood(food); setServingGrams(parseServingGrams(food.servingSize) || '100'); }}
                                                    className="w-full text-left p-2 bg-zinc-800/30 border border-zinc-800/50 rounded-lg hover:border-zinc-600 transition">
                                                    <div className="text-sm font-medium text-zinc-300 truncate">{food.name}</div>
                                                    <div className="text-xs text-zinc-600">P:{food.per100g.protein} C:{food.per100g.carbs} F:{food.per100g.fat}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Saved Meals */}
                                {!foodQuery && meals.length > 0 && !showMealBuilder && (
                                    <div className="mb-3">
                                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">🍽️ Meals</span>
                                        <div className="mt-1 space-y-1">
                                            {meals.map(meal => (
                                                <div key={meal.name} className="flex items-center gap-2">
                                                    <button onClick={() => logMeal(meal)}
                                                        className="flex-1 text-left p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg hover:border-emerald-500/40 transition">
                                                        <div className="text-sm font-medium text-white">{meal.name}</div>
                                                        <div className="text-xs text-zinc-500">{meal.foods.length} items · tap to log all</div>
                                                    </button>
                                                    <button onClick={() => deleteMeal(meal.name)} className="text-zinc-700 hover:text-red-400 text-xs p-1">✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Meal Builder */}
                                {!foodQuery && !showMealBuilder && (favorites.length > 0 || recents.length > 0) && (
                                    <button onClick={() => setShowMealBuilder(true)} className="w-full text-center text-xs text-zinc-600 hover:text-emerald-400 font-bold uppercase tracking-wider py-2 transition">
                                        + Create Meal Template
                                    </button>
                                )}
                                {showMealBuilder && (
                                    <div className="mb-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white">New Meal</span>
                                            <button onClick={() => setShowMealBuilder(false)} className="text-zinc-500 text-xs">Cancel</button>
                                        </div>
                                        <input type="text" value={mealName} onChange={e => setMealName(e.target.value)} placeholder="Meal name (e.g. Breakfast)"
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none" />
                                        <div className="text-xs text-zinc-500">Tap items below to add:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {[...favorites, ...recents.filter(r => !favorites.some(f => f.name === r.name))].map(food => {
                                                const added = mealItems.some(m => m.name === food.name);
                                                return (
                                                    <button key={food.name} onClick={() => setMealItems(prev => added ? prev.filter(m => m.name !== food.name) : [...prev, food])}
                                                        className={`px-2 py-1 rounded text-xs font-medium transition ${added ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                                                        {added ? '✓ ' : ''}{food.name.split(' ').slice(0, 3).join(' ')}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {mealItems.length > 0 ? (
                                            <button onClick={saveMeal} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg uppercase tracking-wider transition">
                                                Save Meal ({mealItems.length} items)
                                            </button>
                                        ) : (
                                            <button disabled className="w-full bg-zinc-800 text-zinc-600 text-xs font-bold py-2 rounded-lg uppercase tracking-wider cursor-not-allowed">
                                                Select items to save
                                            </button>
                                        )}
                                    </div>
                                )}
                                {searching && <p className="text-xs text-zinc-500 text-center py-4">Searching...</p>}
                                {!searching && foodQuery.length >= 2 && foodResults.length === 0 && (
                                    <p className="text-xs text-zinc-500 text-center py-4">No results found</p>
                                )}
                                {foodResults.map(food => (
                                    <button key={food.id} onClick={() => { setSelectedFood(food); setServingGrams(parseServingGrams(food.servingSize)); }}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 transition flex items-center justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="text-base text-white truncate">{food.name}</div>
                                            {food.brand && <div className="text-xs text-zinc-600 truncate">{food.brand}</div>}
                                        </div>
                                        <div className="text-xs text-zinc-500 text-right ml-2 flex-shrink-0">
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
                        <div className="grid grid-cols-4 gap-2 text-xs">
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
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white text-center font-bold focus:border-zinc-500 outline-none"
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
                        <label className="text-xs font-bold text-cyan-500 uppercase flex items-center gap-1">
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
            {showScanner && (
                <BarcodeScanner
                    onResult={(food) => { setSelectedFood(food); setServingGrams(parseServingGrams(food.servingSize)); setShowScanner(false); setTab('search'); }}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
        , document.body);
}
