"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';
import PixelBox, { ScreenWrapper } from './PixelBox';
import NutritionInputV2 from './NutritionInputV2';

interface Props {
  userId: string;
}

export default function FuelScreen({ userId }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [refreshKey, setRefreshKey] = useState(0);
  const [totals, setTotals] = useState({ protein: 0, carbs: 0, fat: 0, calsIn: 0, burned: 0 });
  const [targets, setTargets] = useState({ protein: 170, carbs: 250, fat: 65, calories: 2000 });

  useEffect(() => {
    (async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const today = new Date().toLocaleDateString('en-CA');

      const [{ data: logs }, { data: user }, { data: todayHabitBurn }] = await Promise.all([
        supabase.from('nutrition_logs').select('macro_type, amount').eq('user_id', userId).eq('date', today),
        supabase.from('users').select('nutrition_targets').eq('id', userId).single(),
        supabase.from('habit_logs').select('value').eq('user_id', userId).eq('habit_id', 'habit_calories_burned').eq('date', today),
      ]);

      const t: Record<string, number> = {};
      for (const l of logs || []) t[l.macro_type] = (t[l.macro_type] || 0) + (l.amount || 0);
      // Only use burn data if it's actually from today (not stale fallback)
      const todayHabitBurnVal = (todayHabitBurn || []).reduce((s: number, h: any) => s + (h.value || 0), 0);
      let burned = Math.round(t['calories_burned'] || todayHabitBurnVal || 0);

      // Read calories burned directly from native plugin (more accurate than DB)
      try {
        const { getCaloriesBurned } = await import('@/services/nativeHealth');
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
        const nativeBurned = await getCaloriesBurned(startOfToday, endOfToday);
        if (nativeBurned > burned) burned = nativeBurned;
      } catch {}

      setTotals({ protein: Math.round(t['protein'] || 0), carbs: Math.round(t['carbs'] || 0), fat: Math.round(t['fat'] || 0), calsIn: Math.round(t['calories'] || 0), burned });

      if (user?.nutrition_targets) {
        setTargets({ protein: user.nutrition_targets.protein || 170, carbs: user.nutrition_targets.carbs || 250, fat: user.nutrition_targets.fat || 65, calories: user.nutrition_targets.calories || 2000 });
      }
    })();
  }, [userId, refreshKey]);

  const net = totals.calsIn - totals.burned;

  return (
    <ScreenWrapper onRefresh={async () => setRefreshKey(k => k + 1)}>
      {/* Header */}
      <p className={`text-[10px] ${colors.headerText} uppercase tracking-widest mb-4`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
        FUEL
      </p>

      {/* Net Calories + Macros Summary */}
      <PixelBox className="p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-300">IN {totals.calsIn.toLocaleString()}</span>
          {totals.burned > 0 ? (
            <span className={`text-sm font-bold ${net < 0 ? 'text-green-400' : net > 200 ? 'text-amber-400' : 'text-zinc-300'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              NET {net > 0 ? '+' : ''}{net}
            </span>
          ) : (
            <span className="text-[9px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              NET — sync for burn
            </span>
          )}
          <span className="text-xs text-zinc-500">BURNED {totals.burned > 0 ? totals.burned.toLocaleString() : '—'}</span>
        </div>
        {/* Macro progress bars */}
        <div className="space-y-1.5">
          <MacroBar label="Protein" current={totals.protein} target={targets.protein} color="bg-blue-500" />
          <MacroBar label="Carbs" current={totals.carbs} target={targets.carbs} color="bg-orange-500" />
          <MacroBar label="Fat" current={totals.fat} target={targets.fat} color="bg-yellow-500" />
        </div>
      </PixelBox>

      {/* Nutrition Input */}
      <PixelBox className="p-4 mb-4">
        <NutritionInputV2 userId={userId} />
      </PixelBox>
    </ScreenWrapper>
  );
}

function MacroBar({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] text-zinc-500 w-12" style={{ fontFamily: "var(--font-pixel), monospace" }}>{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[8px] text-zinc-400 w-16 text-right">{current}/{target}g</span>
    </div>
  );
}
