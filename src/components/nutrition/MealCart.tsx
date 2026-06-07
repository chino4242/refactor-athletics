'use client';

import { useState } from 'react';
import { X, Minus, Plus } from 'lucide-react';
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
  onRemove: (idx: number) => void;
  onUpdateServing: (idx: number, grams: number) => void;
  onLogMeal: () => void;
  logging: boolean;
}

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

export default function MealCart({ items, onRemove, onUpdateServing, onLogMeal, logging }: MealCartProps) {
  if (items.length === 0) return null;

  const totals = items.reduce((acc, i) => ({ p: acc.p + i.p, c: acc.c + i.c, f: acc.f + i.f }), { p: 0, c: 0, f: 0 });
  const totalCal = totals.p * 4 + totals.c * 4 + totals.f * 9;

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{item.food.name}</div>
            <div className="text-[10px] text-zinc-500">P:{item.p} C:{item.c} F:{item.f}</div>
          </div>
          <button onClick={() => onRemove(i)} className="text-zinc-600 hover:text-red-400 p-1">
            <X size={12} />
          </button>
        </div>
      ))}

      {/* Totals + Log */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-700/50">
        <div className="text-[11px] text-zinc-400">
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
  );
}
