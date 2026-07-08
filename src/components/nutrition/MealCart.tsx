'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { FoodResult } from '@/app/api/food-search/route';

export interface CartItem {
  food: FoodResult;
  servingGrams: number;
  p: number;
  c: number;
  f: number;
}

interface MealCartProps {
  items: CartItem[];
  mealType: string;
  onMealTypeChange: (type: string) => void;
  onRemove: (idx: number) => void;
  onUpdateServing: (idx: number, grams: number) => void;
  onLogMeal: () => void;
  logging: boolean;
}

const MEAL_TYPES = [
  { id: 'breakfast', emoji: '🌅' },
  { id: 'lunch', emoji: '🌞' },
  { id: 'dinner', emoji: '🌙' },
  { id: 'snack', emoji: '🍿' },
];

export function cartItemFromFood(food: FoodResult): CartItem {
  const mult = parseServingMult(food.servingSize);
  return {
    food,
    servingGrams: Math.round(mult * 100),
    p: Math.round(food.per100g.protein * mult),
    c: Math.round(food.per100g.carbs * mult),
    f: Math.round(food.per100g.fat * mult),
  };
}

function parseServingMult(s?: string): number {
  if (!s) return 1;
  const gMatch = s.match(/([\d.]+)\s*g/i);
  if (gMatch) return parseFloat(gMatch[1]) / 100;
  const mlMatch = s.match(/([\d.]+)\s*ml/i);
  if (mlMatch) return parseFloat(mlMatch[1]) / 100;
  return 1;
}

export default function MealCart({ items, mealType, onMealTypeChange, onRemove, onUpdateServing, onLogMeal, logging }: MealCartProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showTip, setShowTip] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('seen_portion_tip');
  });

  if (items.length === 0) return null;

  const dismissTip = () => {
    setShowTip(false);
    localStorage.setItem('seen_portion_tip', 'true');
  };

  const totals = items.reduce((acc, i) => ({ p: acc.p + i.p, c: acc.c + i.c, f: acc.f + i.f }), { p: 0, c: 0, f: 0 });
  const totalCal = totals.p * 4 + totals.c * 4 + totals.f * 9;

  const startEdit = (i: number) => {
    setEditingIdx(i);
    setEditValue(String(items[i].servingGrams));
  };

  const commitEdit = (i: number) => {
    const g = Math.max(1, Math.round(parseFloat(editValue) || items[i].servingGrams));
    onUpdateServing(i, g);
    setEditingIdx(null);
  };

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 space-y-2">
      {items.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{item.food.name}</div>
              <div className="text-xs text-zinc-500">{item.p * 4 + item.c * 4 + item.f * 9} cal · P:{item.p} C:{item.c} F:{item.f}</div>
            </div>
            <button onClick={() => onRemove(i)} className="text-zinc-600 hover:text-red-400 p-1">
              <X size={12} />
            </button>
          </div>
          {/* Serving adjustment */}
          <div className="flex items-center gap-1.5 relative">
            {showTip && i === 0 && (
              <div onClick={dismissTip} className="absolute -top-7 left-0 bg-orange-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 cursor-pointer animate-pulse">
                Tap to adjust portion size ✕
              </div>
            )}
            {editingIdx === i ? (
              <input
                type="number"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => commitEdit(i)}
                onKeyDown={e => e.key === 'Enter' && commitEdit(i)}
                autoFocus
                className="w-16 bg-zinc-700 border border-zinc-600 rounded px-2 py-0.5 text-xs text-white text-center outline-none focus:border-zinc-400"
              />
            ) : (
              <button
                onClick={() => startEdit(i)}
                className="bg-zinc-700/50 border border-zinc-600/50 rounded px-2 py-0.5 text-xs text-zinc-300 hover:border-zinc-500 transition"
              >
                {item.servingGrams}g
              </button>
            )}
            {[0.5, 1, 2].map(mult => {
              const g = Math.round((parseServingMult(item.food.servingSize) * 100) * mult);
              const isActive = item.servingGrams === g;
              return (
                <button
                  key={mult}
                  onClick={() => onUpdateServing(i, g)}
                  className={`text-xs px-1.5 py-0.5 rounded transition ${isActive ? 'bg-orange-600 text-white' : 'bg-zinc-700/50 text-zinc-400 hover:text-white'}`}
                >
                  {mult === 0.5 ? '½' : mult}×
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Meal type selector + Totals + Log */}
      <div className="pt-2 border-t border-zinc-700/50 space-y-2">
        <div className="flex gap-1.5">
          {MEAL_TYPES.map(m => (
            <button
              key={m.id}
              onClick={() => onMealTypeChange(m.id)}
              className={`text-xs px-2 py-1 rounded-full transition ${mealType === m.id ? 'bg-orange-600 text-white' : 'bg-zinc-700/50 text-zinc-400 hover:text-white'}`}
            >
              {m.emoji} {m.id}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            <span className="font-bold text-white">{totalCal} cal</span> · P:{totals.p} C:{totals.c} F:{totals.f}
          </div>
          <button
            onClick={onLogMeal}
            disabled={logging}
            className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            {logging ? '...' : 'Log Meal'}
          </button>
        </div>
      </div>
    </div>
  );
}
