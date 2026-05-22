'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface PendingExercise {
  id: string;
  date: string;
  duration_seconds: number;
  distance_meters: number;
  suggested_type: string;
}

const TYPE_OPTIONS = [
  { id: 'run', emoji: '🏃', label: 'Run' },
  { id: 'bike', emoji: '🚴', label: 'Bike' },
  { id: 'walk', emoji: '🚶', label: 'Walk' },
  { id: 'row', emoji: '🚣', label: 'Row' },
  { id: 'other', emoji: '💪', label: 'Other' },
];

export default function PendingExerciseCard({ userId }: { userId: string }) {
  const [exercises, setExercises] = useState<PendingExercise[]>([]);

  useEffect(() => { load(); }, [userId]);

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('pending_exercises')
      .select('id, date, duration_seconds, distance_meters, suggested_type')
      .eq('user_id', userId)
      .is('confirmed_type', null)
      .order('timestamp', { ascending: false })
      .limit(5);
    setExercises(data || []);
  };

  const confirm = async (id: string, type: string) => {
    const supabase = createClient();
    const ex = exercises.find(e => e.id === id);
    if (!ex) return;

    // Update as confirmed
    await supabase.from('pending_exercises').update({ confirmed_type: type }).eq('id', id);

    // Process: log to workouts + rank if applicable
    await fetch('/api/exercises/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise_id: id, type }),
    });

    setExercises(prev => prev.filter(e => e.id !== id));
  };

  const dismiss = async (id: string) => {
    const supabase = createClient();
    await supabase.from('pending_exercises').update({ confirmed_type: 'dismissed' }).eq('id', id);
    setExercises(prev => prev.filter(e => e.id !== id));
  };

  if (exercises.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-orange-500/20 rounded-xl p-3 space-y-2">
      <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">New Activity Detected</div>
      {exercises.map(ex => {
        const mins = Math.round(ex.duration_seconds / 60);
        const miles = ex.distance_meters > 0 ? (ex.distance_meters / 1609.34).toFixed(2) : null;
        const suggested = TYPE_OPTIONS.find(t => t.id === ex.suggested_type);

        return (
          <div key={ex.id} className="bg-zinc-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-bold text-white">{miles ? `${miles} mi` : `${mins} min`}</span>
                <span className="text-xs text-zinc-500 ml-2">{mins} min · {ex.date}</span>
              </div>
              <button onClick={() => dismiss(ex.id)} className="text-zinc-600 hover:text-zinc-400 text-xs">✕</button>
            </div>
            <div className="flex gap-1.5">
              {TYPE_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => confirm(ex.id, opt.id)}
                  className={`flex-1 py-2 rounded-lg text-center transition text-xs font-medium ${
                    opt.id === ex.suggested_type
                      ? 'bg-orange-500/20 border border-orange-500/40 text-orange-400'
                      : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}>
                  <div className="text-base">{opt.emoji}</div>
                  <div className="text-[9px]">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
