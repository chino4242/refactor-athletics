"use client";

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';
import { deleteMealByTimestampAction } from '@/app/actions';
import { createClient } from '@/utils/supabase/client';
import PixelBox from './PixelBox';

interface NutritionRow {
  id: string;
  macro_type: string;
  amount: number;
  label: string | null;
  timestamp: number;
}

interface Meal {
  timestamp: number;
  label: string;
  meal_tag: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

const MEAL_TAG_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  snack: '🍎',
  dinner: '🌙',
};

const MEAL_TAG_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];

const VALID_MEAL_TAGS = new Set(['breakfast', 'lunch', 'snack', 'dinner']);

function getMealTagFromTimestamp(ts: number): string {
  const h = new Date(ts * 1000).getHours();
  if (h >= 4 && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 15 && h < 18) return 'snack';
  return 'dinner';
}

function groupRowsIntoMeals(rows: NutritionRow[]): Meal[] {
  // Cluster rows within 5 seconds of each other as one meal
  // (Promise.all calls may land in adjacent seconds)
  const sorted = [...rows].sort((a, b) => a.timestamp - b.timestamp);
  const clusters: NutritionRow[][] = [];
  let current: NutritionRow[] = [];

  for (const row of sorted) {
    if (current.length === 0 || row.timestamp - current[0].timestamp <= 5) {
      current.push(row);
    } else {
      clusters.push(current);
      current = [row];
    }
  }
  if (current.length > 0) clusters.push(current);

  return clusters.map(group => {
    const get = (type: string) => group.filter(r => r.macro_type === type).reduce((sum, r) => sum + (r.amount ?? 0), 0);
    const rawLabel = group[0]?.label ?? '';
    const ts = group[0].timestamp;
    const meal_tag = VALID_MEAL_TAGS.has(rawLabel)
      ? rawLabel
      : getMealTagFromTimestamp(ts);
    const displayLabel = VALID_MEAL_TAGS.has(rawLabel) ? '' : rawLabel;
    return {
      timestamp: ts,
      label: displayLabel,
      meal_tag,
      protein: Math.round(get('protein')),
      carbs: Math.round(get('carbs')),
      fat: Math.round(get('fat')),
      calories: Math.round(get('calories')),
    };
  }).sort((a, b) => a.timestamp - b.timestamp);
}

function groupMealsByTag(meals: Meal[]): Record<string, Meal[]> {
  const grouped: Record<string, Meal[]> = {};
  for (const meal of meals) {
    const tag = meal.meal_tag || 'snack';
    if (!grouped[tag]) grouped[tag] = [];
    grouped[tag].push(meal);
  }
  return grouped;
}

interface Props {
  userId: string;
  refreshKey: number;
  onDelete: (meal: Meal) => void;
}

export default function TodaysMeals({ userId, refreshKey, onDelete }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchMeals = useCallback(async () => {
    const supabase = createClient();
    const today = new Date().toLocaleDateString('en-CA');

    const { data } = await supabase
      .from('nutrition_logs')
      .select('id, macro_type, amount, label, timestamp')
      .eq('user_id', userId)
      .eq('date', today)
      .in('macro_type', ['protein', 'carbs', 'fat', 'calories'])
      .order('timestamp', { ascending: true });

    setMeals(groupRowsIntoMeals(data || []));
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchMeals(); }, [fetchMeals, refreshKey]);

  const handleDelete = async (meal: Meal) => {
    // Optimistic update
    setDeleting(meal.timestamp);
    setMeals(prev => prev.filter(m => m.timestamp !== meal.timestamp));
    onDelete(meal);

    try {
      await deleteMealByTimestampAction(userId, meal.timestamp);
    } catch {
      // Rollback on failure
      setMeals(prev => [...prev, meal].sort((a, b) => a.timestamp - b.timestamp));
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <PixelBox className="p-3">
        <p className="text-[8px] text-zinc-500 uppercase tracking-widest mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          TODAY&apos;S MEALS
        </p>
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-8 bg-zinc-800 animate-pulse rounded" />
          ))}
        </div>
      </PixelBox>
    );
  }

  if (meals.length === 0) {
    return (
      <PixelBox className="p-3">
        <p className="text-[8px] text-zinc-500 uppercase tracking-widest mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          TODAY&apos;S MEALS
        </p>
        <p className="text-[10px] text-zinc-600 text-center py-3">
          No meals logged yet — add your first one above
        </p>
      </PixelBox>
    );
  }

  const grouped = groupMealsByTag(meals);
  const tagOrder = MEAL_TAG_ORDER.filter(tag => grouped[tag]);

  return (
    <PixelBox className="p-3">
      <p className="text-[8px] text-zinc-500 uppercase tracking-widest mb-3" style={{ fontFamily: "var(--font-pixel), monospace" }}>
        TODAY&apos;S MEALS
      </p>

      <div className="space-y-3">
        {tagOrder.map(tag => (
          <div key={tag}>
            {/* Tag header */}
            <p className="text-[8px] text-zinc-500 mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {MEAL_TAG_EMOJI[tag] ?? '🍽️'} {tag.toUpperCase()}
            </p>

            <div className="space-y-1">
              {grouped[tag].map(meal => (
                <div
                  key={meal.timestamp}
                  className={`flex items-center justify-between py-1.5 border-b border-zinc-800/60 ${deleting === meal.timestamp ? 'opacity-40' : ''}`}
                >
                  <div className="flex-1 min-w-0 mr-2">
                    {meal.label && (
                      <p className="text-[11px] text-zinc-300 truncate">{meal.label}</p>
                    )}
                    <p className="text-[9px] text-zinc-500">
                      <span className="text-zinc-600 mr-1.5">{new Date(meal.timestamp * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                      {meal.calories > 0 && <span className="text-zinc-400 mr-1">{meal.calories} cal</span>}
                      {meal.protein > 0 && <span className={`${colors.secondary} mr-1`}>P{meal.protein}g</span>}
                      {meal.carbs > 0 && <span className="text-orange-400 mr-1">C{meal.carbs}g</span>}
                      {meal.fat > 0 && <span className="text-yellow-400">F{meal.fat}g</span>}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(meal)}
                    disabled={deleting === meal.timestamp}
                    aria-label="Delete meal"
                    className="text-[9px] text-red-500 px-2 py-1 border border-red-900 bg-zinc-800 hover:bg-red-950 disabled:opacity-40 shrink-0"
                  >
                    DEL
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PixelBox>
  );
}
