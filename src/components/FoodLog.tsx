'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Trash2 } from 'lucide-react';

interface FoodLogProps {
  userId: string;
  onUpdate: () => void;
}

interface LogEntry {
  id: string;
  timestamp: number;
  macro_type: string;
  amount: number;
  label: string;
}

interface MealGroup {
  time: string;
  timestamp: number;
  items: { macro_type: string; amount: number; label: string; id: string }[];
}

export default function FoodLog({ userId, onUpdate }: FoodLogProps) {
  const [meals, setMeals] = useState<MealGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [userId]);

  const load = async () => {
    const supabase = createClient();
    const today = new Date().toLocaleDateString('en-CA');
    const { data } = await supabase
      .from('nutrition_logs')
      .select('id, timestamp, macro_type, amount, label')
      .eq('user_id', userId)
      .eq('date', today)
      .order('timestamp', { ascending: true });

    if (!data?.length) { setMeals([]); setLoading(false); return; }

    // Group by timestamp (entries within 5 seconds = same meal)
    const groups: MealGroup[] = [];
    for (const entry of data) {
      if (entry.macro_type === 'calories') continue; // auto-calculated, don't show
      const last = groups[groups.length - 1];
      if (last && Math.abs(entry.timestamp - last.timestamp) < 30) {
        last.items.push({ macro_type: entry.macro_type, amount: entry.amount, label: entry.label, id: entry.id });
      } else {
        const d = new Date(entry.timestamp * 1000);
        const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        groups.push({ time, timestamp: entry.timestamp, items: [{ macro_type: entry.macro_type, amount: entry.amount, label: entry.label, id: entry.id }] });
      }
    }
    setMeals(groups);
    setLoading(false);
  };

  const deleteMeal = async (group: MealGroup) => {
    const supabase = createClient();
    const ids = group.items.map(i => i.id);
    // Also delete the auto-calculated calories for this timestamp
    await supabase.from('nutrition_logs').delete().eq('user_id', userId).in('id', ids);
    await supabase.from('nutrition_logs').delete().eq('user_id', userId).eq('macro_type', 'calories')
      .gte('timestamp', group.timestamp - 5).lte('timestamp', group.timestamp + 5);
    await load();
    onUpdate();
  };

  if (loading) return null;
  if (meals.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Today&apos;s Food Log</div>
      <div className="space-y-2">
        {meals.map((meal, i) => {
          const p = meal.items.find(i => i.macro_type === 'protein')?.amount || 0;
          const c = meal.items.find(i => i.macro_type === 'carbs')?.amount || 0;
          const f = meal.items.find(i => i.macro_type === 'fat')?.amount || 0;
          const label = meal.items[0]?.label;
          const isAutoLabel = label?.startsWith('Auto-Cal');
          const displayLabel = isAutoLabel ? null : label;

          return (
            <div key={i} className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-zinc-600">{meal.time}</span>
                  {displayLabel && !['Protein', 'Carbs', 'Fat', 'Water', 'protein', 'carbs', 'fat', 'water'].includes(displayLabel) && (
                    <span className="text-xs text-zinc-300 truncate">{displayLabel}</span>
                  )}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {p > 0 && `P:${p} `}{c > 0 && `C:${c} `}{f > 0 && `F:${f}`}
                  {!p && !c && !f && meal.items.map(i => `${i.macro_type}: ${i.amount}`).join(' ')}
                </div>
              </div>
              <button onClick={() => deleteMeal(meal)} className="text-zinc-700 hover:text-red-400 p-1 transition">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
