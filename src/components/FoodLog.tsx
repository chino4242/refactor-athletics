'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Trash2 } from 'lucide-react';

interface FoodLogProps {
  userId: string;
  onUpdate: () => void;
}

interface MealEntry {
  id: string;
  meal_type: string;
  food_name: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  serving_size: string;
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<string, { emoji: string; label: string }> = {
  breakfast: { emoji: '🌅', label: 'Breakfast' },
  lunch: { emoji: '🌞', label: 'Lunch' },
  dinner: { emoji: '🌙', label: 'Dinner' },
  snack: { emoji: '🍿', label: 'Snack' },
};

export default function FoodLog({ userId, onUpdate }: FoodLogProps) {
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [userId]);

  const load = async () => {
    const supabase = createClient();
    const today = new Date().toLocaleDateString('en-CA');
    const { data } = await supabase
      .from('meal_entries')
      .select('id, meal_type, food_name, protein, carbs, fat, calories, serving_size')
      .eq('user_id', userId)
      .eq('date', today)
      .order('timestamp', { ascending: true });

    setEntries(data || []);
    setLoading(false);
  };

  const deleteEntry = async (id: string, entry: MealEntry) => {
    const supabase = createClient();
    await supabase.from('meal_entries').delete().eq('id', id);

    // Also subtract from nutrition_logs totals
    const today = new Date().toLocaleDateString('en-CA');
    if (entry.protein > 0) {
      const { data: pLogs } = await supabase.from('nutrition_logs').select('id, amount').eq('user_id', userId).eq('date', today).eq('macro_type', 'protein').order('timestamp', { ascending: false }).limit(1);
      const pLog = pLogs?.[0];
      if (pLog) await supabase.from('nutrition_logs').update({ amount: Math.max(0, pLog.amount - entry.protein) }).eq('id', pLog.id);
    }
    if (entry.carbs > 0) {
      const { data: cLogs } = await supabase.from('nutrition_logs').select('id, amount').eq('user_id', userId).eq('date', today).eq('macro_type', 'carbs').order('timestamp', { ascending: false }).limit(1);
      const cLog = cLogs?.[0];
      if (cLog) await supabase.from('nutrition_logs').update({ amount: Math.max(0, cLog.amount - entry.carbs) }).eq('id', cLog.id);
    }
    if (entry.fat > 0) {
      const { data: fLogs } = await supabase.from('nutrition_logs').select('id, amount').eq('user_id', userId).eq('date', today).eq('macro_type', 'fat').order('timestamp', { ascending: false }).limit(1);
      const fLog = fLogs?.[0];
      if (fLog) await supabase.from('nutrition_logs').update({ amount: Math.max(0, fLog.amount - entry.fat) }).eq('id', fLog.id);
    }
    // Recalculate calories
    const { data: calLogs } = await supabase.from('nutrition_logs').select('id, amount').eq('user_id', userId).eq('date', today).eq('macro_type', 'calories').order('timestamp', { ascending: false }).limit(1);
    const calLog = calLogs?.[0];
    if (calLog) {
      const calDelta = entry.protein * 4 + entry.carbs * 4 + entry.fat * 9;
      await supabase.from('nutrition_logs').update({ amount: Math.max(0, calLog.amount - calDelta) }).eq('id', calLog.id);
    }

    await load();
    onUpdate();
  };

  if (loading) return null;
  if (entries.length === 0) return null;

  // Group by meal type
  const grouped = MEAL_ORDER
    .map(type => ({ type, items: entries.filter(e => e.meal_type === type) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Today&apos;s Food Log</div>
      <div className="space-y-3">
        {grouped.map(group => {
          const meal = MEAL_LABELS[group.type] || { emoji: '🍽️', label: group.type };
          const totalP = group.items.reduce((s, i) => s + i.protein, 0);
          const totalC = group.items.reduce((s, i) => s + i.carbs, 0);
          const totalF = group.items.reduce((s, i) => s + i.fat, 0);
          return (
            <div key={group.type}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-zinc-300">{meal.emoji} {meal.label}</span>
                <span className="text-[9px] text-zinc-600">P:{totalP} C:{totalC} F:{totalF}</span>
              </div>
              <div className="space-y-1">
                {group.items.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-zinc-300 truncate">{entry.food_name}</div>
                      <div className="text-[9px] text-zinc-600">{entry.serving_size} · P:{entry.protein} C:{entry.carbs} F:{entry.fat}</div>
                    </div>
                    <button onClick={() => deleteEntry(entry.id, entry)} className="text-zinc-700 hover:text-red-400 p-1 transition shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
