"use client";

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';
import { useVisualMode } from '@/context/VisualModeContext';
import PixelBox, { ScreenWrapper } from './PixelBox';
import NutritionInputV2 from './NutritionInputV2';
import TodaysMeals from './TodaysMeals';
import FuelVibrant from './FuelVibrant';
import NutritionCoach from './NutritionCoach';
import { logHabitAction, saveMealFavoriteAction, deleteMealFavoriteAction, deleteMealByTimestampAction } from '@/app/actions';

interface Props {
  userId: string;
}

export default function FuelScreen({ userId }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const { isVibrant } = useVisualMode();
  const [refreshKey, setRefreshKey] = useState(0);
  const [totals, setTotals] = useState({ protein: 0, carbs: 0, fat: 0, calsIn: 0, burned: 0 });
  const [targets, setTargets] = useState({ protein: 170, carbs: 250, fat: 65, calories: 2000 });

  // Vibrant mode state
  const [meals, setMeals] = useState<{ timestamp: number; label: string; meal_tag: string; protein: number; carbs: number; fat: number; calories: number }[]>([]);
  const [favorites, setFavorites] = useState<{ id: string; name: string; items: any[]; total_protein: number; total_carbs: number; total_fat: number; total_calories: number; meal_tag: string | null }[]>([]);
  const [nudge, setNudge] = useState<string | null>(null);
  const [pending, setPending] = useState<{ protein: number; carbs: number; fat: number; calories: number; items?: any[]; _favoriteId?: string } | null>(null);
  const [vibLoading, setVibLoading] = useState(false);
  const [mealTag, setMealTag] = useState('lunch');
  const [vibText, setVibText] = useState('');
  const [weeklyDots, setWeeklyDots] = useState<boolean[]>([]);
  const [showCoach, setShowCoach] = useState(false);
  const [deletingTs, setDeletingTs] = useState<number | null>(null);
  const [tierIndex, setTierIndex] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

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

  // ─── Vibrant mode: fetch meals, favorites, weekly dots ───
  useEffect(() => {
    if (!isVibrant) return;
    (async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const today = new Date().toLocaleDateString('en-CA');

      // Meals
      const { data: logData } = await supabase.from('nutrition_logs')
        .select('id, macro_type, amount, label, timestamp')
        .eq('user_id', userId).eq('date', today)
        .in('macro_type', ['protein', 'carbs', 'fat', 'calories'])
        .order('timestamp', { ascending: true });

      // Group logs into meals (within 5 sec = same meal)
      const sorted = [...(logData || [])].sort((a: any, b: any) => a.timestamp - b.timestamp);
      const clusters: any[][] = [];
      let cur: any[] = [];
      for (const row of sorted) {
        if (cur.length === 0 || row.timestamp - cur[0].timestamp <= 5) cur.push(row);
        else { clusters.push(cur); cur = [row]; }
      }
      if (cur.length > 0) clusters.push(cur);
      const mealList = clusters.map(c => {
        const m: any = { timestamp: c[0].timestamp, label: c[0].label || 'Meal', meal_tag: 'snack', protein: 0, carbs: 0, fat: 0, calories: 0 };
        const h = new Date(c[0].timestamp * 1000).getHours();
        m.meal_tag = h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner';
        for (const r of c) {
          if (r.macro_type === 'protein') m.protein += r.amount || 0;
          if (r.macro_type === 'carbs') m.carbs += r.amount || 0;
          if (r.macro_type === 'fat') m.fat += r.amount || 0;
          if (r.macro_type === 'calories') m.calories += r.amount || 0;
        }
        return m;
      });
      setMeals(mealList);

      // Favorites
      const { data: favData } = await supabase.from('meal_favorites')
        .select('id, name, items, total_protein, total_carbs, total_fat, total_calories, meal_tag')
        .eq('user_id', userId).order('use_count', { ascending: false }).limit(12);
      setFavorites(favData || []);

      // Weekly protein dots
      const monday = new Date();
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      const monStr = monday.toLocaleDateString('en-CA');
      const { data: weekLogs } = await supabase.from('nutrition_logs')
        .select('date, amount').eq('user_id', userId).eq('macro_type', 'protein').gte('date', monStr);
      const byDay: Record<string, number> = {};
      for (const l of weekLogs || []) byDay[l.date] = (byDay[l.date] || 0) + (l.amount || 0);
      const dots: boolean[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday); d.setDate(monday.getDate() + i);
        dots.push((byDay[d.toLocaleDateString('en-CA')] || 0) >= targets.protein * 0.8);
      }
      setWeeklyDots(dots);

      // Auto meal tag
      const h = new Date().getHours();
      setMealTag(h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner');

      // Fetch tier for avatar
      try {
        const { data: workouts } = await supabase.from('workouts').select('exercise_id, level').eq('user_id', userId).gt('level', 0);
        const maxLevels: Record<string, number> = {};
        for (const w of workouts || []) { if (!maxLevels[w.exercise_id] || w.level > maxLevels[w.exercise_id]) maxLevels[w.exercise_id] = w.level; }
        const pl = Object.values(maxLevels).reduce((s, l) => s + l, 0);
        setTierIndex(pl < 12 ? 0 : pl < 24 ? 1 : pl < 36 ? 2 : pl < 48 ? 3 : 4);
      } catch {}
    })();
  }, [userId, refreshKey, isVibrant, targets.protein]);

  // Vibrant handlers
  const vibHandleSubmit = async () => {
    if (!vibText.trim() || vibLoading) return;
    setVibLoading(true);
    try {
      const res = await fetch('/api/food-parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: vibText.trim() }) });
      const data = await res.json();
      if (data.foods?.length) {
        const items = data.foods.map((f: any) => {
          const g = parseInt(f.servingSize) || 100;
          const factor = g / 100;
          return { name: f.name || 'Food', protein: Math.round((f.per100g?.protein || 0) * factor), carbs: Math.round((f.per100g?.carbs || 0) * factor), fat: Math.round((f.per100g?.fat || 0) * factor), calories: Math.round((f.per100g?.calories || 0) * factor) };
        });
        const t = items.reduce((a: any, f: any) => ({ protein: a.protein + f.protein, carbs: a.carbs + f.carbs, fat: a.fat + f.fat, calories: a.calories + f.calories }), { protein: 0, carbs: 0, fat: 0, calories: 0 });
        setPending({ ...t, items });
      }
    } catch {}
    setVibLoading(false);
  };

  const vibHandlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setVibLoading(true);
    try {
      const formData = new FormData(); formData.append('image', file); formData.append('type', 'meal_photo');
      const res = await fetch('/api/parse-screenshot', { method: 'POST', body: formData });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.foods?.length) {
          const t = json.data.foods.reduce((a: any, f: any) => ({ protein: a.protein + (f.protein || 0), carbs: a.carbs + (f.carbs || 0), fat: a.fat + (f.fat || 0), calories: a.calories + (f.calories || 0) }), { protein: 0, carbs: 0, fat: 0, calories: 0 });
          setPending(t);
        }
      }
    } catch {}
    setVibLoading(false);
    if (fileRef.current) fileRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';
  };

  const vibHandleConfirm = async () => {
    if (!pending) return;
    vibHandleConfirmWithMultiplier(1);
  };

  const vibHandleConfirmWithMultiplier = async (multiplier: number) => {
    if (!pending) return;
    const p = Math.round(pending.protein * multiplier);
    const c = Math.round(pending.carbs * multiplier);
    const f = Math.round(pending.fat * multiplier);
    const cal = Math.round(pending.calories * multiplier);
    setTotals(prev => ({ ...prev, protein: prev.protein + p, carbs: prev.carbs + c, fat: prev.fat + f, calsIn: prev.calsIn + cal }));
    const ts = Math.floor(Date.now() / 1000);
    await Promise.all([
      logHabitAction(userId, 'macro_protein', p, undefined, vibText.trim() || mealTag, ts),
      logHabitAction(userId, 'macro_carbs', c, undefined, vibText.trim() || mealTag, ts),
      logHabitAction(userId, 'macro_fat', f, undefined, vibText.trim() || mealTag, ts),
      logHabitAction(userId, 'macro_calories', cal, undefined, vibText.trim() || mealTag, ts),
    ]);
    setPending(null); setVibText(''); setRefreshKey(k => k + 1);
  };

  const vibHandleMealDelete = async (meal: any) => {
    setDeletingTs(meal.timestamp);
    setMeals(prev => prev.filter(m => m.timestamp !== meal.timestamp));
    setTotals(prev => ({ ...prev, protein: Math.max(0, prev.protein - meal.protein), carbs: Math.max(0, prev.carbs - meal.carbs), fat: Math.max(0, prev.fat - meal.fat), calsIn: Math.max(0, prev.calsIn - meal.calories) }));
    try { await deleteMealByTimestampAction(userId, meal.timestamp); } catch {}
    setDeletingTs(null);
  };

  // ─── Vibrant Mode Render ───
  if (isVibrant) {
    return (
      <ScreenWrapper onRefresh={async () => setRefreshKey(k => k + 1)}>
        {showCoach && <NutritionCoach userId={userId} onClose={() => { setShowCoach(false); setRefreshKey(k => k + 1); }} />}
        <input ref={fileRef} type="file" accept="image/*" onChange={vibHandlePhoto} className="hidden" />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={vibHandlePhoto} className="hidden" />
        <FuelVibrant
          totals={totals}
          targets={targets}
          favorites={favorites}
          meals={meals}
          nudge={nudge}
          pending={pending}
          loading={vibLoading}
          mealTag={mealTag}
          text={vibText}
          weeklyDots={weeklyDots}
          tierIndex={tierIndex}
          onTextChange={setVibText}
          onMealTagChange={setMealTag}
          onSubmit={vibHandleSubmit}
          onConfirm={vibHandleConfirm}
          onConfirmWithMultiplier={vibHandleConfirmWithMultiplier}
          onDismiss={() => { setPending(null); setVibText(''); }}
          onPhotoCapture={() => fileRef.current?.click()}
          onPhotoUpload={() => fileRef.current?.click()}
          onFavoriteTap={(fav) => { setPending({ protein: fav.total_protein, carbs: fav.total_carbs, fat: fav.total_fat, calories: fav.total_calories, items: fav.items, _favoriteId: fav.id }); setMealTag(fav.meal_tag || mealTag); }}
          onFavoriteLongPress={async (fav) => { if (confirm(`Remove "${fav.name}" from favorites?`)) { await deleteMealFavoriteAction(userId, fav.id); setFavorites(prev => prev.filter(f => f.id !== fav.id)); } }}
          onMealDelete={vibHandleMealDelete}
          onNudgeTap={() => setShowCoach(true)}
          onNudgeDismiss={() => { setNudge(null); localStorage.setItem('coach_nudge_dismissed', String(Date.now() + 7 * 86400000)); }}
          onCoachOpen={() => setShowCoach(true)}
          deletingTimestamp={deletingTs}
        />
      </ScreenWrapper>
    );
  }

  // ─── Retro Mode Render (existing) ───

  return (
    <ScreenWrapper onRefresh={async () => setRefreshKey(k => k + 1)}>
      {/* Header */}
      <p className={`text-xs ${colors.headerText} uppercase tracking-widest mb-4`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
        FUEL
      </p>

      {/* Net Calories + Macros Summary */}
      <PixelBox className="p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-300">IN {totals.calsIn.toLocaleString()}</span>
          {totals.burned > 0 ? (
            <span className={`text-base font-bold ${net < 0 ? 'text-green-400' : net > 200 ? 'text-amber-400' : 'text-zinc-300'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              NET {net > 0 ? '+' : ''}{net}
            </span>
          ) : (
            <span className="text-xs text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              NET — sync for burn
            </span>
          )}
          <span className="text-sm text-zinc-500">BURNED {totals.burned > 0 ? totals.burned.toLocaleString() : '—'}</span>
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
        <NutritionInputV2 userId={userId} onLog={() => setRefreshKey(k => k + 1)} />
      </PixelBox>

      {/* Food Journal */}
      <TodaysMeals
        userId={userId}
        refreshKey={refreshKey}
        onDelete={(meal) => {
          setTotals(prev => ({
            ...prev,
            protein: Math.max(0, prev.protein - meal.protein),
            carbs: Math.max(0, prev.carbs - meal.carbs),
            fat: Math.max(0, prev.fat - meal.fat),
            calsIn: Math.max(0, prev.calsIn - meal.calories),
          }));
        }}
      />
    </ScreenWrapper>
  );
}

function MacroBar({ label, current, target, color }: { label: string; current: number; target: number; color: string }) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500 w-12" style={{ fontFamily: "var(--font-pixel), monospace" }}>{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-400 w-16 text-right">{current}/{target}g</span>
    </div>
  );
}
