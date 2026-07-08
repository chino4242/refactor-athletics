'use client';

import { useState, useEffect } from 'react';
import type { FoodResult } from '@/app/api/food-search/route';

interface RecentFoodsProps {
  onInstantLog: (food: FoodResult) => void;
}

export default function RecentFoods({ onInstantLog }: RecentFoodsProps) {
  const [recents, setRecents] = useState<FoodResult[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recent_foods');
      if (saved) setRecents(JSON.parse(saved).slice(0, 8));
    } catch {}
  }, []);

  if (recents.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {recents.map((food, i) => {
        const mult = parseServingMult(food.servingSize);
        const p = Math.round(food.per100g.protein * mult);
        const c = Math.round(food.per100g.carbs * mult);
        const f = Math.round(food.per100g.fat * mult);
        return (
          <button
            key={i}
            onClick={() => onInstantLog(food)}
            className="shrink-0 bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-3 py-2 hover:border-zinc-600/50 transition text-left"
          >
            <div className="text-xs font-medium text-white truncate max-w-[100px]">{food.name}</div>
            <div className="text-xs text-zinc-500">P:{p} C:{c} F:{f}</div>
          </button>
        );
      })}
    </div>
  );
}

function parseServingMult(s?: string): number {
  if (!s) return 1;
  const gMatch = s.match(/([\d.]+)\s*g/i);
  if (gMatch) return parseFloat(gMatch[1]) / 100;
  const mlMatch = s.match(/([\d.]+)\s*ml/i);
  if (mlMatch) return parseFloat(mlMatch[1]) / 100;
  return 1;
}
