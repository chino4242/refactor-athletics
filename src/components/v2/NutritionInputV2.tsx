"use client";

import { useState, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';
import { logHabitAction } from '@/app/actions';

interface Props {
  userId: string;
}

interface ParsedMeal {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export default function NutritionInputV2({ userId }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedMeal | null>(null);
  const [mealCount, setMealCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/food-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (data.foods?.length) {
        const totals = data.foods.reduce((acc: ParsedMeal, f: any) => ({
          protein: acc.protein + (f.per100g?.protein * ((parseInt(f.servingSize) || 100) / 100) || 0),
          carbs: acc.carbs + (f.per100g?.carbs * ((parseInt(f.servingSize) || 100) / 100) || 0),
          fat: acc.fat + (f.per100g?.fat * ((parseInt(f.servingSize) || 100) / 100) || 0),
          calories: acc.calories + (f.per100g?.calories * ((parseInt(f.servingSize) || 100) / 100) || 0),
        }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

        // Log to DB
        await Promise.all([
          logHabitAction(userId, 'macro_protein', Math.round(totals.protein)),
          logHabitAction(userId, 'macro_carbs', Math.round(totals.carbs)),
          logHabitAction(userId, 'macro_fat', Math.round(totals.fat)),
          logHabitAction(userId, 'macro_calories', Math.round(totals.calories)),
        ]);

        setResult({ protein: Math.round(totals.protein), carbs: Math.round(totals.carbs), fat: Math.round(totals.fat), calories: Math.round(totals.calories) });
        setMealCount(prev => prev + 1);
        setText('');
        setTimeout(() => setResult(null), 4000);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', 'meal_photo');
      const res = await fetch('/api/parse-screenshot', { method: 'POST', body: formData });
      if (!res.ok) return;
      const json = await res.json();
      if (json.data?.foods?.length) {
        const totals = json.data.foods.reduce((acc: ParsedMeal, f: any) => ({
          protein: acc.protein + (f.protein || 0),
          carbs: acc.carbs + (f.carbs || 0),
          fat: acc.fat + (f.fat || 0),
          calories: acc.calories + (f.calories || 0),
        }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

        await Promise.all([
          logHabitAction(userId, 'macro_protein', Math.round(totals.protein)),
          logHabitAction(userId, 'macro_carbs', Math.round(totals.carbs)),
          logHabitAction(userId, 'macro_fat', Math.round(totals.fat)),
          logHabitAction(userId, 'macro_calories', Math.round(totals.calories)),
        ]);

        setResult(totals);
        setMealCount(prev => prev + 1);
        setTimeout(() => setResult(null), 4000);
      }
    } catch { /* silent */ }
    setLoading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      {/* Input row */}
      <div className="flex gap-2">
        <div className={`flex-1 border ${colors.border} bg-zinc-800 flex items-center px-3`}>
          <span className="text-sm mr-2">🍽️</span>
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="What did you eat?"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none py-2.5"
          />
          {loading && <span className="text-[8px] text-zinc-500 animate-pulse" style={{ fontFamily: "var(--font-pixel), monospace" }}>...</span>}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className={`border ${colors.border} bg-zinc-800 px-3 hover:bg-zinc-700 transition-colors disabled:opacity-50`}
        >
          <span className="text-sm">📷</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />

      {/* Result */}
      {result && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[8px] text-green-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>✓</span>
          <span className="text-[8px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>P:{result.protein}g</span>
          <span className="text-[8px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>C:{result.carbs}g</span>
          <span className="text-[8px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>F:{result.fat}g</span>
          <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>{result.calories}cal</span>
        </div>
      )}

      {/* Meal count */}
      {mealCount > 0 && !result && (
        <p className="text-[8px] text-zinc-600 px-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {mealCount >= 3 ? '✓ 3/3 +50 XP' : `${mealCount}/3 today`}
        </p>
      )}
    </div>
  );
}
