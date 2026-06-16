"use client";

import { useState, useEffect, useRef } from 'react';
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

const MEAL_TAGS = [
  { key: 'breakfast', emoji: '🌅', label: 'Breakfast' },
  { key: 'lunch', emoji: '☀️', label: 'Lunch' },
  { key: 'snack', emoji: '🍎', label: 'Snack' },
  { key: 'dinner', emoji: '🌙', label: 'Dinner' },
];

function getAutoMealTag(): string {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 15 && h < 18) return 'snack';
  return 'dinner';
}

export default function NutritionInputV2({ userId }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<ParsedMeal | null>(null);
  const [mealTag, setMealTag] = useState(getAutoMealTag());
  const [expanded, setExpanded] = useState(false);
  const [mealCount, setMealCount] = useState(0);
  const [xpPop, setXpPop] = useState<number | null>(null);
  const [dailyTotals, setDailyTotals] = useState<{ protein: number; carbs: number; fat: number; calsIn: number; burned: number; meals: { tag: string; cals: number }[] }>({ protein: 0, carbs: 0, fat: 0, calsIn: 0, burned: 0, meals: [] });
  const [weeklyDots, setWeeklyDots] = useState<boolean[]>([]);
  const [targets, setTargets] = useState({ protein: 170, carbs: 250, fat: 65, calories: 2000 });
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch daily totals + weekly dots
  const fetchProgress = async () => {
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    const today = new Date().toLocaleDateString('en-CA');

    const [{ data: logs }, { data: profile }] = await Promise.all([
      supabase.from('nutrition_logs').select('macro_type, amount, timestamp').eq('user_id', userId).eq('date', today),
      supabase.from('users').select('nutrition_targets').eq('id', userId).single(),
    ]);

    const totals: Record<string, number> = {};
    for (const l of logs || []) totals[l.macro_type] = (totals[l.macro_type] || 0) + (l.amount || 0);

    if (profile?.nutrition_targets) {
      const t = profile.nutrition_targets;
      setTargets({ protein: t.protein || 170, carbs: t.carbs || 250, fat: t.fat || 65, calories: t.calories || 2000 });
    }

    setDailyTotals({
      protein: Math.round(totals['protein'] || 0),
      carbs: Math.round(totals['carbs'] || 0),
      fat: Math.round(totals['fat'] || 0),
      calsIn: Math.round(totals['calories'] || 0),
      burned: Math.round(totals['calories_burned'] || 0),
      meals: [],
    });

    // Weekly protein dots
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const monStr = monday.toLocaleDateString('en-CA');
    const { data: weekLogs } = await supabase.from('nutrition_logs').select('date, amount').eq('user_id', userId).eq('macro_type', 'protein').gte('date', monStr);

    const byDay: Record<string, number> = {};
    for (const l of weekLogs || []) byDay[l.date] = (byDay[l.date] || 0) + (l.amount || 0);

    const dots: boolean[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toLocaleDateString('en-CA');
      dots.push((byDay[dateStr] || 0) >= (targets.protein * 0.8));
    }
    setWeeklyDots(dots);
  };

  useEffect(() => { fetchProgress(); }, [userId]);

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
        setPending({ protein: Math.round(totals.protein), carbs: Math.round(totals.carbs), fat: Math.round(totals.fat), calories: Math.round(totals.calories) });
        setMealTag(getAutoMealTag());
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
      if (!res.ok) { setLoading(false); return; }
      const json = await res.json();
      if (json.data?.foods?.length) {
        const totals = json.data.foods.reduce((acc: ParsedMeal, f: any) => ({
          protein: acc.protein + (f.protein || 0), carbs: acc.carbs + (f.carbs || 0),
          fat: acc.fat + (f.fat || 0), calories: acc.calories + (f.calories || 0),
        }), { protein: 0, carbs: 0, fat: 0, calories: 0 });
        setPending(totals);
        setMealTag(getAutoMealTag());
      }
    } catch { /* silent */ }
    setLoading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const confirmLog = async () => {
    if (!pending) return;
    import('@/utils/haptics').then(m => m.haptic('success'));
    await Promise.all([
      logHabitAction(userId, 'macro_protein', pending.protein, undefined, mealTag),
      logHabitAction(userId, 'macro_carbs', pending.carbs, undefined, mealTag),
      logHabitAction(userId, 'macro_fat', pending.fat, undefined, mealTag),
      logHabitAction(userId, 'macro_calories', pending.calories, undefined, mealTag),
    ]);
    setPending(null);
    setText('');
    setMealCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) { setXpPop(50); setTimeout(() => setXpPop(null), 2000); }
      return newCount;
    });
    fetchProgress();
  };

  const dismiss = () => { setPending(null); setText(''); };

  const net = dailyTotals.calsIn - dailyTotals.burned;
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="space-y-2">
      {/* Loading state */}
      {loading && (
        <div className={`border ${colors.border} bg-zinc-800 p-3 animate-pulse flex items-center gap-3`}>
          <span className="text-lg">🧠</span>
          <span className="text-[11px] text-zinc-400">ANALYZING MEAL...</span>
        </div>
      )}

      {/* Input row */}
      {!pending && !loading && (
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
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={loading} className={`border ${colors.border} bg-zinc-800 px-3 hover:bg-zinc-700 transition-colors disabled:opacity-50`}>
            <span className="text-sm">📷</span>
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />

      {/* Confirm card */}
      {pending && (
        <div className={`border ${colors.primary} bg-zinc-800 p-3 space-y-2`}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              P:{pending.protein}g C:{pending.carbs}g F:{pending.fat}g {pending.calories}cal
            </span>
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => { const idx = MEAL_TAGS.findIndex(m => m.key === mealTag); setMealTag(MEAL_TAGS[(idx + 1) % MEAL_TAGS.length].key); }} className={`text-[8px] px-2 py-1 border ${colors.border} bg-zinc-900 text-zinc-300`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {MEAL_TAGS.find(m => m.key === mealTag)?.emoji} {MEAL_TAGS.find(m => m.key === mealTag)?.label}
            </button>
            <div className="flex gap-2">
              <button onClick={dismiss} className="w-8 h-7 border border-zinc-700 bg-zinc-900 text-zinc-500 text-xs flex items-center justify-center">✗</button>
              <button onClick={confirmLog} className={`w-8 h-7 border ${colors.primary} bg-zinc-900 text-green-400 text-xs flex items-center justify-center`}>✓</button>
            </div>
          </div>
        </div>
      )}

      {/* XP pop */}
      {xpPop && (
        <div className="flex justify-center py-1">
          <span className={`text-[11px] font-bold ${colors.secondary} animate-bounce`}>+{xpPop} XP 🎉</span>
        </div>
      )}

      {/* Daily progress (collapsed) */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-1 py-1">
        <span className="text-[8px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          P:{dailyTotals.protein}/{targets.protein} C:{dailyTotals.carbs}/{targets.carbs} F:{dailyTotals.fat}/{targets.fat}
        </span>
        <span className={`text-[8px] ${net <= 0 ? 'text-green-400' : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          NET:{net > 0 ? '+' : ''}{net} {expanded ? '▴' : '▾'}
        </span>
      </button>

      {/* Expanded view */}
      {expanded && (
        <div className={`border ${colors.border} bg-zinc-900 p-3 space-y-2`}>
          {/* Macro bars */}
          {[
            { label: 'PROTEIN', value: dailyTotals.protein, target: targets.protein },
            { label: 'CARBS', value: dailyTotals.carbs, target: targets.carbs },
            { label: 'FAT', value: dailyTotals.fat, target: targets.fat },
          ].map(bar => (
            <div key={bar.label}>
              <div className="flex justify-between text-[7px] text-zinc-500 mb-0.5" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                <span>{bar.label}</span>
                <span>{Math.round((bar.value / bar.target) * 100)}%</span>
              </div>
              <div className="h-[4px] bg-zinc-800 flex">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className={`flex-1 border-r border-zinc-900 ${i < Math.round((bar.value / bar.target) * 20) ? colors.barFill : ''}`} />
                ))}
              </div>
            </div>
          ))}

          {/* Weekly dots */}
          <div className="pt-2 border-t border-zinc-800">
            <p className="text-[7px] text-zinc-600 mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>PROTEIN THIS WEEK</p>
            <div className="flex items-center gap-2">
              {dayLabels.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <span className="text-[6px] text-zinc-600">{d}</span>
                  <div className={`w-2 h-2 rounded-full ${weeklyDots[i] ? 'bg-green-500' : 'bg-zinc-700'}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
