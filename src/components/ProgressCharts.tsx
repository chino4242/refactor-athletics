"use client";

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { format, subDays, startOfWeek, parseISO } from 'date-fns';
import type { HistoryItem, CatalogItem } from '@/types';

interface Props {
  history: HistoryItem[];
  catalog: CatalogItem[];
  bodyweight: number;
}

type TimeRange = '30d' | '90d' | '1y' | 'all';

const RANGES: { key: TimeRange; label: string }[] = [
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: '1y', label: '1Y' },
  { key: 'all', label: 'All' },
];

function filterByRange(items: any[], dateField: string, range: TimeRange) {
  if (range === 'all') return items;
  const days = range === '30d' ? 30 : range === '90d' ? 90 : 365;
  const cutoff = subDays(new Date(), days).getTime() / 1000;
  return items.filter(i => (i[dateField] || 0) > cutoff);
}

export default function ProgressCharts({ history, catalog, bodyweight }: Props) {
  const [range, setRange] = useState<TimeRange>('90d');
  const [selectedExercise, setSelectedExercise] = useState('');

  // Get exercises that have been logged
  const loggedExercises = useMemo(() => {
    const exerciseMap = new Map<string, { id: string; name: string; count: number }>();
    history.filter(h => h.exercise_id && !h.exercise_id.startsWith('macro_') && !h.exercise_id.startsWith('habit_') && !h.exercise_id.startsWith('body_'))
      .forEach(h => {
        const existing = exerciseMap.get(h.exercise_id);
        if (existing) { existing.count++; }
        else {
          const cat = catalog.find(c => c.id === h.exercise_id);
          exerciseMap.set(h.exercise_id, { id: h.exercise_id, name: cat?.name || h.exercise_id, count: 1 });
        }
      });
    return Array.from(exerciseMap.values()).sort((a, b) => b.count - a.count);
  }, [history, catalog]);

  // Auto-select most logged exercise
  const activeExercise = selectedExercise || loggedExercises[0]?.id || '';

  // Exercise trend data (Est. 1RM over time)
  const exerciseData = useMemo(() => {
    const logs = filterByRange(
      history.filter(h => h.exercise_id === activeExercise && ((h as any).details?.length > 0 || h.raw_value)),
      'timestamp', range
    ).sort((a, b) => a.timestamp - b.timestamp);

    return logs.map(h => {
      const sets = (h as any).details || h.data || [];
      const best1RM = sets.length > 0
        ? Math.max(...sets.map((s: any) => s.weight ? s.weight * (1 + (s.reps || 1) / 30) : 0))
        : h.raw_value || 0;
      const totalVolume = sets.reduce((sum: number, s: any) => sum + (s.weight || 0) * (s.reps || 1), 0);
      return {
        date: format(new Date(h.timestamp * 1000), 'MMM d'),
        est1RM: Math.round(best1RM),
        volume: Math.round(totalVolume),
      };
    });
  }, [history, activeExercise, range]);

  // Body weight over time
  const weightData = useMemo(() => {
    const logs = filterByRange(
      history.filter(h => h.exercise_id === 'body_weight'),
      'timestamp', range
    ).sort((a, b) => a.timestamp - b.timestamp);

    return logs.map(h => ({
      date: format(new Date(h.timestamp * 1000), 'MMM d'),
      weight: parseFloat(h.value) || 0,
    }));
  }, [history, range]);

  // Weekly volume (total lbs moved per week)
  const weeklyVolume = useMemo(() => {
    const workouts = filterByRange(
      history.filter(h => h.exercise_id && !h.exercise_id.startsWith('macro_') && !h.exercise_id.startsWith('habit_') && !h.exercise_id.startsWith('body_') && ((h as any).details?.length > 0 || h.data?.length)),
      'timestamp', range
    );

    const weekMap = new Map<string, number>();
    workouts.forEach(h => {
      const weekStart = format(startOfWeek(new Date(h.timestamp * 1000), { weekStartsOn: 1 }), 'MMM d');
      const vol = ((h as any).details || h.data || []).reduce((sum: number, s: any) => sum + (s.weight || 0) * (s.reps || 1), 0);
      weekMap.set(weekStart, (weekMap.get(weekStart) || 0) + vol);
    });

    return Array.from(weekMap.entries()).map(([week, volume]) => ({ week, volume: Math.round(volume) }));
  }, [history, range]);

  const catItem = catalog.find(c => c.id === activeExercise);
  const isWeightExercise = catItem?.type?.toLowerCase().includes('weight') || catItem?.type === 'strength';

  return (
    <div className="space-y-6 pb-24">
      {/* Time range selector */}
      <div className="flex gap-2 justify-center">
        {RANGES.map(r => (
          <button key={r.key} onClick={() => setRange(r.key)}
            className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg transition ${range === r.key ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Exercise Trend */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Exercise Trend</h3>
        </div>

        <select value={activeExercise} onChange={e => setSelectedExercise(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-base text-white mb-4 outline-none focus:border-zinc-500">
          {loggedExercises.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.name} ({ex.count})</option>
          ))}
        </select>

        {exerciseData.length > 1 ? (
          <div className="space-y-4">
            {/* Est 1RM chart */}
            {isWeightExercise && (
              <div>
                <div className="text-xs text-zinc-500 uppercase mb-2">Estimated 1RM (lbs)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={exerciseData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#71717a' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#71717a' }} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="est1RM" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Volume chart */}
            <div>
              <div className="text-xs text-zinc-500 uppercase mb-2">Session Volume (lbs)</div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={exerciseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#71717a' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#71717a' }} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="volume" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="text-zinc-500 text-sm text-center py-8">Need at least 2 sessions to show trends</p>
        )}
      </div>

      {/* Body Weight */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Body Weight</h3>
        {weightData.length > 1 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 9, fill: '#71717a' }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="weight" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3, fill: '#22d3ee' }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-zinc-500 text-sm text-center py-8">Log body weight to see trends</p>
        )}
      </div>

      {/* Weekly Volume */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Weekly Volume</h3>
        {weeklyVolume.length > 1 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 9, fill: '#71717a' }} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`${v.toLocaleString()} lbs`, 'Volume']} />
              <Bar dataKey="volume" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-zinc-500 text-sm text-center py-8">Need at least 2 weeks of data</p>
        )}
      </div>
    </div>
  );
}
