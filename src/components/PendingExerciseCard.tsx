'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Search } from 'lucide-react';

interface PendingExercise {
  id: string;
  date: string;
  duration_seconds: number;
  distance_meters: number;
  suggested_type: string;
  calories?: number;
}

interface ConfirmResult {
  xp_earned: number;
  rank_name?: string;
  level?: number;
  quest_progress?: string;
  challenge_progress?: string;
}

function getSuggestion(ex: PendingExercise): { emoji: string; label: string; id: string } {
  const mins = ex.duration_seconds / 60;
  const miles = ex.distance_meters / 1609.34;
  if (miles > 0.3) {
    const pace = mins / miles;
    if (pace < 12) return { emoji: '🏃', label: 'Run', id: 'run' };
    return { emoji: '🚶', label: 'Walk', id: 'walk' };
  }
  if (mins > 20) return { emoji: '💪', label: 'Workout', id: 'workout' };
  return { emoji: '🏋️', label: 'Exercise', id: 'other' };
}

export default function PendingExerciseCard({ userId }: { userId: string }) {
  const [exercises, setExercises] = useState<PendingExercise[]>([]);
  const [searchOpen, setSearchOpen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [confirmResult, setConfirmResult] = useState<Record<string, ConfirmResult>>({});
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => { load(); }, [userId]);

  const load = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('pending_exercises')
      .select('id, date, duration_seconds, distance_meters, suggested_type, calories')
      .eq('user_id', userId)
      .is('confirmed_type', null)
      .order('timestamp', { ascending: false })
      .limit(5);
    setExercises(data || []);
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const supabase = createClient();
    const { data } = await supabase.from('catalog').select('id, name, category').ilike('name', `%${q}%`).limit(8);
    setSearchResults(data || []);
  };

  const confirm = async (id: string, type: string, catalogId?: string) => {
    setConfirming(id);
    const supabase = createClient();
    await supabase.from('pending_exercises').update({ confirmed_type: type }).eq('id', id);

    const res = await fetch('/api/exercises/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise_id: id, type, catalog_id: catalogId }),
    });

    if (res.ok) {
      const result = await res.json();
      setConfirmResult(prev => ({ ...prev, [id]: result }));
    }

    setSearchOpen(null);
    setSearchQuery('');
    setConfirming(null);
  };

  const dismiss = async (id: string) => {
    const supabase = createClient();
    await supabase.from('pending_exercises').update({ confirmed_type: 'dismissed' }).eq('id', id);
    setExercises(prev => prev.filter(e => e.id !== id));
  };

  if (exercises.length === 0) return null;

  return (
    <div className="space-y-2">
      {exercises.map(ex => {
        const mins = Math.round(ex.duration_seconds / 60);
        const miles = ex.distance_meters > 0 ? (ex.distance_meters / 1609.34).toFixed(1) : null;
        const suggestion = getSuggestion(ex);
        const result = confirmResult[ex.id];

        // Already confirmed — show impact
        if (result) return (
          <div key={ex.id} className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <div>
                  <span className="text-xs font-bold text-emerald-400">+{result.xp_earned} XP</span>
                  {result.rank_name && <span className="text-[10px] text-zinc-400 ml-2">→ {result.rank_name}</span>}
                </div>
              </div>
              <button onClick={() => setExercises(prev => prev.filter(e => e.id !== ex.id))} className="text-zinc-600 text-xs">Done</button>
            </div>
            {(result.quest_progress || result.challenge_progress) && (
              <div className="mt-1.5 flex gap-2 text-[10px]">
                {result.quest_progress && <span className="text-orange-400">⚔️ {result.quest_progress}</span>}
                {result.challenge_progress && <span className="text-blue-400">🎯 {result.challenge_progress}</span>}
              </div>
            )}
          </div>
        );

        return (
          <div key={ex.id} className="bg-zinc-900 border border-orange-500/20 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">📡</span>
                <span className="text-[10px] font-bold text-orange-400 uppercase">Activity Detected</span>
              </div>
              <button onClick={() => dismiss(ex.id)} className="text-zinc-600 hover:text-zinc-400 text-xs">Skip</button>
            </div>

            {/* Show available data — hide zeros */}
            <div className="flex gap-3 mb-3 text-xs text-zinc-300">
              {miles && <span>📍 {miles} mi</span>}
              {mins > 0 && <span>⏱️ {mins} min</span>}
              {ex.calories && ex.calories > 0 && <span>🔥 {ex.calories} cal</span>}
            </div>

            {/* Search mode */}
            {searchOpen === ex.id ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)} autoFocus
                    placeholder="Search exercises..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:border-orange-500 outline-none" />
                </div>
                {searchResults.map(r => (
                  <button key={r.id} onClick={() => confirm(ex.id, r.id, r.id)}
                    className="w-full text-left px-3 py-2 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition text-xs text-white">
                    {r.name} <span className="text-zinc-600 ml-1">{r.category}</span>
                  </button>
                ))}
                <button onClick={() => { setSearchOpen(null); setSearchQuery(''); }} className="text-[10px] text-zinc-500 w-full text-center">Cancel</button>
              </div>
            ) : (
              <div className="flex gap-2">
                {/* Primary suggestion — one tap */}
                <button onClick={() => confirm(ex.id, suggestion.id)} disabled={confirming === ex.id}
                  className="flex-1 bg-orange-500/15 border border-orange-500/30 hover:bg-orange-500/25 rounded-lg py-2.5 text-center transition">
                  <div className="text-base">{suggestion.emoji}</div>
                  <div className="text-[10px] font-bold text-orange-400">{confirming === ex.id ? '...' : `Log as ${suggestion.label}`}</div>
                </button>
                {/* Search for something else */}
                <button onClick={() => setSearchOpen(ex.id)}
                  className="px-4 bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg text-center transition">
                  <Search size={14} className="text-zinc-400 mx-auto" />
                  <div className="text-[9px] text-zinc-500 mt-0.5">Other</div>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
