'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { logHabitAction } from '@/app/actions';
import { Check } from 'lucide-react';

interface DailyHabitsQuickProps {
  userId: string;
  hiddenHabits: string[];
}

const TOGGLE_HABITS = [
  { id: 'habit_no_alcohol', label: 'No Alcohol', emoji: '🍺', virtueId: 'habit_no_alcohol' },
  { id: 'habit_no_vice', label: 'No Vice', emoji: '🛡️', virtueId: 'habit_no_vice' },
  { id: 'habit_no_sugar', label: 'No Sugar', emoji: '🍬', virtueId: 'habit_no_sugar' },
  { id: 'habit_creatine', label: 'Supplements', emoji: '🧪', virtueId: 'habit_creatine' },
  { id: 'habit_journaling', label: 'Journaling', emoji: '📓', virtueId: 'habit_journaling' },
];

export default function DailyHabitsQuick({ userId, hiddenHabits }: DailyHabitsQuickProps) {
  const [logged, setLogged] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  const visibleHabits = TOGGLE_HABITS.filter(h => !hiddenHabits.includes(h.id));

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const today = new Date().toLocaleDateString('en-CA');
      const { data } = await supabase
        .from('habit_logs')
        .select('habit_id')
        .eq('user_id', userId)
        .eq('date', today)
        .in('habit_id', visibleHabits.map(h => h.virtueId));
      if (data) setLogged(new Set(data.map(d => d.habit_id)));
    };
    if (visibleHabits.length > 0) load();
  }, [userId]);

  if (visibleHabits.length === 0) return null;

  const toggle = async (habit: typeof TOGGLE_HABITS[0]) => {
    if (loading) return;
    setLoading(habit.id);
    try {
      if (logged.has(habit.virtueId)) {
        // Undo — delete today's entry
        const supabase = createClient();
        const today = new Date().toLocaleDateString('en-CA');
        await supabase.from('habit_logs').delete()
          .eq('user_id', userId).eq('habit_id', habit.virtueId).eq('date', today);
        setLogged(prev => { const s = new Set(prev); s.delete(habit.virtueId); return s; });
      } else {
        // Log it
        await logHabitAction(userId, habit.virtueId, 1, undefined, habit.label);
        setLogged(prev => new Set(prev).add(habit.virtueId));
      }
    } catch (e) {
      console.error('Toggle habit error:', e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
      <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Daily Rites</div>
      <div className="flex flex-wrap gap-2">
        {visibleHabits.map(habit => {
          const done = logged.has(habit.virtueId);
          return (
            <button
              key={habit.id}
              onClick={() => toggle(habit)}
              disabled={loading === habit.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                done
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              } ${loading === habit.id ? 'opacity-50' : ''}`}
            >
              {done ? <Check size={12} className="text-emerald-400" /> : <span>{habit.emoji}</span>}
              <span>{habit.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
