'use client';

import { useMemo, useState } from 'react';
import { Scale, TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react';
import { calculatePhysiquePoints } from '@/utils/physiquePoints';
import LogMeasurement from './LogMeasurement';

interface BodyCompHomeProps {
  userId: string;
  bodyweight: number;
  bodyCompHistory: any[];
  goals: Record<string, string>;
  measurementMode: 'tape' | 'scale';
  syncedData?: { weight?: number; body_fat_percentage?: number; lean_body_mass?: number };
  onRefresh: () => void;
}

export default function BodyCompHome({ userId, bodyweight, bodyCompHistory, goals, measurementMode, syncedData, onRefresh }: BodyCompHomeProps) {
  const [showLog, setShowLog] = useState(false);

  const physiquePoints = useMemo(() =>
    calculatePhysiquePoints(bodyCompHistory, goals, measurementMode),
    [bodyCompHistory, goals, measurementMode]
  );

  // 7-day rolling average for weight
  const weightTrend = useMemo(() => {
    const withWeight = bodyCompHistory.filter(e => e.weight != null).slice(-14);
    if (withWeight.length < 2) return null;

    const points: { date: string; avg: number }[] = [];
    for (let i = 0; i < withWeight.length; i++) {
      const window = withWeight.slice(Math.max(0, i - 6), i + 1);
      const avg = window.reduce((s, e) => s + (e.weight || 0), 0) / window.length;
      points.push({ date: withWeight[i].date, avg: Math.round(avg * 10) / 10 });
    }
    return points;
  }, [bodyCompHistory]);

  // Natural language summary
  const summary = useMemo(() => {
    const withWeight = bodyCompHistory.filter(e => e.weight != null);
    const withWaist = bodyCompHistory.filter(e => e.waist != null);
    const parts: string[] = [];

    if (withWeight.length >= 2) {
      const recent = withWeight.slice(-7);
      const avgRecent = recent.reduce((s, e) => s + e.weight, 0) / recent.length;
      const older = withWeight.slice(-14, -7);
      if (older.length > 0) {
        const avgOlder = older.reduce((s, e) => s + e.weight, 0) / older.length;
        const diff = avgRecent - avgOlder;
        if (Math.abs(diff) >= 0.3) {
          parts.push(`${diff > 0 ? 'Up' : 'Down'} ${Math.abs(diff).toFixed(1)} lbs avg`);
        } else {
          parts.push('Weight holding steady');
        }
      }
    }

    if (withWaist.length >= 2) {
      const first = withWaist[0].waist;
      const last = withWaist[withWaist.length - 1].waist;
      const diff = last - first;
      if (Math.abs(diff) >= 0.25) {
        parts.push(`waist ${diff > 0 ? '+' : ''}${diff.toFixed(1)}"`);
      }
    }

    if (parts.length === 0 && withWeight.length > 0) {
      parts.push(`Current avg: ${Math.round(withWeight.slice(-7).reduce((s, e) => s + e.weight, 0) / Math.min(7, withWeight.length))} lbs`);
    }

    return parts.join(' · ') || null;
  }, [bodyCompHistory]);

  // Last circumference date
  const lastCircDate = useMemo(() => {
    const withCirc = bodyCompHistory.filter(e => e.waist || e.chest || e.arms);
    if (!withCirc.length) return undefined;
    return withCirc[withCirc.length - 1].date;
  }, [bodyCompHistory]);

  // Last logged source
  const lastEntry = bodyCompHistory[bodyCompHistory.length - 1];
  const lastLoggedDate = lastEntry?.date;

  if (bodyCompHistory.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="text-center py-4">
          <div className="text-4xl mb-3">📐</div>
          <h3 className="text-sm font-bold text-white mb-1">Body Composition</h3>
          <p className="text-xs text-zinc-500 mb-4">Track your physical transformation</p>
          <button onClick={() => setShowLog(true)}
            className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider">
            Log First Measurement
          </button>
        </div>
        <LogMeasurement isOpen={showLog} onClose={() => setShowLog(false)} userId={userId} bodyweight={bodyweight} onSaved={onRefresh} />
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      {/* Hero: Physique Points */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Physique Points</span>
          </div>
          <div className={`text-3xl font-black italic ${physiquePoints.color}`}>
            {physiquePoints.score > 0 ? '+' : ''}{physiquePoints.score}
          </div>
          {summary && <p className="text-[11px] text-zinc-500 mt-0.5">{summary}</p>}
        </div>
        <button onClick={() => setShowLog(true)}
          className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white p-2.5 rounded-xl transition">
          <Plus size={18} />
        </button>
      </div>

      {/* Sparkline (weight 7-day rolling avg) */}
      {weightTrend && weightTrend.length >= 3 && (
        <div className="mb-3 h-12 flex items-end gap-[2px]">
          {(() => {
            const values = weightTrend.map(p => p.avg);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const range = max - min || 1;
            return values.map((v, i) => {
              const height = Math.max(4, ((v - min) / range) * 40);
              const isLast = i === values.length - 1;
              return (
                <div key={i} className="flex-1 flex items-end">
                  <div className={`w-full rounded-sm transition-all ${isLast ? 'bg-orange-500' : 'bg-zinc-700'}`} style={{ height: `${height}px` }} />
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Detail cards */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {(() => {
          const cards: { label: string; value: string; delta?: string; goal?: string }[] = [];
          const latest = bodyCompHistory[bodyCompHistory.length - 1];
          const prev = bodyCompHistory.length > 1 ? bodyCompHistory[bodyCompHistory.length - 2] : null;

          if (latest?.weight) {
            const d = prev?.weight ? (latest.weight - prev.weight) : null;
            cards.push({ label: 'Weight', value: `${latest.weight}`, delta: d ? `${d > 0 ? '+' : ''}${d.toFixed(1)}` : undefined, goal: goals.weight });
          }
          if (latest?.body_fat_percentage) {
            const d = prev?.body_fat_percentage ? (latest.body_fat_percentage - prev.body_fat_percentage) : null;
            cards.push({ label: 'Body Fat', value: `${latest.body_fat_percentage}%`, delta: d ? `${d > 0 ? '+' : ''}${d.toFixed(1)}%` : undefined, goal: goals.body_fat_percentage });
          }
          if (latest?.waist) {
            const d = prev?.waist ? (latest.waist - prev.waist) : null;
            cards.push({ label: 'Waist', value: `${latest.waist}"`, delta: d ? `${d > 0 ? '+' : ''}${d.toFixed(1)}"` : undefined, goal: goals.waist });
          }

          if (cards.length === 0) return null;

          return cards.map(c => (
            <div key={c.label} className="bg-zinc-800/50 rounded-lg p-2 border border-zinc-700/50">
              <div className="text-[9px] text-zinc-500 uppercase font-bold">{c.label}</div>
              <div className="text-sm font-black text-white">{c.value}</div>
              {c.delta && (
                <div className={`text-[10px] font-mono ${
                  c.goal === 'Shrink' ? (parseFloat(c.delta) <= 0 ? 'text-emerald-400' : 'text-rose-400') :
                  c.goal === 'Grow' ? (parseFloat(c.delta) >= 0 ? 'text-emerald-400' : 'text-rose-400') :
                  'text-zinc-500'
                }`}>{c.delta}</div>
              )}
            </div>
          ));
        })()}
      </div>

      {/* Last logged */}
      {lastLoggedDate && (
        <div className="text-[9px] text-zinc-600 text-center">
          Last logged: {lastLoggedDate}
        </div>
      )}

      <LogMeasurement isOpen={showLog} onClose={() => setShowLog(false)} userId={userId} bodyweight={bodyweight}
        syncedData={syncedData} lastCircumferenceDate={lastCircDate} onSaved={onRefresh} />
    </div>
  );
}
