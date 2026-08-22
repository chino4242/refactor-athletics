"use client";

/**
 * TrainingGrounds — Vibrant workout template library.
 *
 * A filterable grid of timed workouts fetched from the `workout_templates` table.
 * Cards expand on tap to reveal exercises + Start button.
 * Vibrant design language: rounded-2xl, zinc-900/50, accent gradients.
 */

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { createClient } from '@/utils/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string | null;
  format: 'amrap' | 'for_time' | 'timed_rounds' | 'emom';
  duration_seconds: number;
  time_cap_seconds: number | null;
  rounds: number | null;
  exercises: any;
  equipment: string[];
  difficulty: number;
  tags: string[];
  benchmark_score: string | null;
}

interface TrainingGroundsProps {
  userId: string;
  onStartWorkout: (template: WorkoutTemplate) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const VIBRANT_ACCENTS: Record<string, { gradient: string; text: string; glow: string }> = {
  athlete: { gradient: 'from-orange-500 to-amber-400', text: 'text-orange-400', glow: 'shadow-[0_0_30px_rgba(249,115,22,0.08)]' },
  dragon: { gradient: 'from-red-500 to-orange-400', text: 'text-red-400', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.08)]' },
  samurai: { gradient: 'from-[#c084a8] to-[#e8a0b8]', text: 'text-[#e8a0b8]', glow: 'shadow-[0_0_30px_rgba(232,160,184,0.08)]' },
  viking: { gradient: 'from-sky-500 to-cyan-400', text: 'text-sky-300', glow: 'shadow-[0_0_30px_rgba(56,189,248,0.08)]' },
  dinosaur: { gradient: 'from-green-500 to-emerald-400', text: 'text-emerald-400', glow: 'shadow-[0_0_30px_rgba(16,185,129,0.08)]' },
};

const FORMAT_LABELS: Record<WorkoutTemplate['format'], string> = {
  amrap: 'AMRAP',
  emom: 'EMOM',
  for_time: 'For Time',
  timed_rounds: 'Rounds',
};

const FORMAT_COLORS: Record<WorkoutTemplate['format'], string> = {
  amrap: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  emom: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  for_time: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  timed_rounds: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

const EQUIPMENT_ICONS: Record<string, string> = {
  kettlebell: '🫎',
  bodyweight: '🏋️',
  dumbbell: '💪',
  barbell: '🏗️',
  rower: '🚣',
  bike: '🚴',
  jump_rope: '⏭️',
};

type FormatFilter = 'all' | WorkoutTemplate['format'];
type EquipmentFilter = 'all' | 'kettlebell' | 'bodyweight' | 'dumbbell';

const FORMAT_FILTERS: { key: FormatFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'amrap', label: 'AMRAP' },
  { key: 'emom', label: 'EMOM' },
  { key: 'for_time', label: 'For Time' },
  { key: 'timed_rounds', label: 'Rounds' },
];

const EQUIPMENT_FILTERS: { key: EquipmentFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'kettlebell', label: 'Kettlebell' },
  { key: 'bodyweight', label: 'Bodyweight' },
  { key: 'dumbbell', label: 'Dumbbell' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number, timeCap: number | null): string {
  const mins = Math.round(seconds / 60);
  if (timeCap) {
    const capMins = Math.round(timeCap / 60);
    return `${capMins} min cap`;
  }
  return `${mins} min`;
}

function getExerciseList(template: WorkoutTemplate): string[] {
  if (Array.isArray(template.exercises)) {
    return template.exercises.map((ex: any) =>
      typeof ex === 'string' ? ex : ex.name || ex.exercise || String(ex)
    );
  }
  if (template.exercises && typeof template.exercises === 'object') {
    // EMOM format: { "1": [...], "2": [...] } or { minutes: [...] }
    const entries = Object.values(template.exercises).flat();
    return entries.map((ex: any) =>
      typeof ex === 'string' ? ex : ex.name || ex.exercise || String(ex)
    );
  }
  return [];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TrainingGrounds({ userId, onStartWorkout }: TrainingGroundsProps) {
  const { currentTheme } = useTheme();
  const accent = VIBRANT_ACCENTS[currentTheme] || VIBRANT_ACCENTS.athlete;

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Collapsed by default; remembers the user's last choice.
  const [collapsed, setCollapsed] = useState(true);

  // ── Restore collapse preference ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('training_grounds_collapsed');
    if (saved !== null) setCollapsed(saved === '1');
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('training_grounds_collapsed', next ? '1' : '0');
      }
      return next;
    });
  };

  // ── Fetch templates ──
  useEffect(() => {
    async function fetchTemplates() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .order('difficulty', { ascending: true });

      if (!error && data) {
        setTemplates(data as WorkoutTemplate[]);
      }
      setLoading(false);
    }
    fetchTemplates();
  }, []);

  // ── Filtered list ──
  const filtered = templates.filter(t => {
    if (formatFilter !== 'all' && t.format !== formatFilter) return false;
    if (equipmentFilter !== 'all') {
      const eq = t.equipment?.map(e => e.toLowerCase()) || [];
      if (!eq.includes(equipmentFilter)) return false;
    }
    return true;
  });

  // ── Render ──
  return (
    <div className="space-y-4">
      {/* Header — tap to expand/collapse */}
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className={`text-zinc-500 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'}`}>
            ▸
          </span>
          <div>
            <p className="text-lg font-bold text-white">Training Grounds</p>
            <p className="text-xs text-zinc-500">
              {collapsed ? 'Tap to browse workouts' : 'Pick a workout. Get after it.'}
            </p>
          </div>
        </div>
        <span className={`text-xs font-bold ${accent.text} bg-zinc-800/60 px-2.5 py-1 rounded-lg`}>
          {templates.length} workouts
        </span>
      </button>

      {!collapsed && (
        <>
      {/* Format filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FORMAT_FILTERS.map(f => {
          const active = formatFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFormatFilter(f.key)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                active
                  ? `bg-gradient-to-r ${accent.gradient} text-white shadow-lg`
                  : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border border-zinc-700/30'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Equipment filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {EQUIPMENT_FILTERS.map(f => {
          const active = equipmentFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setEquipmentFilter(f.key)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                active
                  ? `${accent.text} bg-zinc-800 border border-zinc-600/50`
                  : 'text-zinc-500 bg-zinc-900/40 border border-zinc-800/30 hover:text-zinc-300'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl bg-zinc-900/50 border border-zinc-800/30 p-4 animate-pulse">
              <div className="h-5 w-40 bg-zinc-800 rounded mb-3" />
              <div className="h-3 w-24 bg-zinc-800 rounded mb-2" />
              <div className="h-3 w-32 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/30 p-8 text-center">
          <p className="text-3xl mb-2">🏟️</p>
          <p className="text-sm font-semibold text-zinc-300">No workouts found</p>
          <p className="text-xs text-zinc-500 mt-1">
            {templates.length === 0
              ? 'Workouts are being loaded into the training grounds...'
              : 'Try adjusting your filters'}
          </p>
        </div>
      )}

      {/* Template cards */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(template => {
            const isExpanded = expandedId === template.id;
            const exercises = getExerciseList(template);
            const isHyrox = template.tags?.includes('hyrox');

            return (
              <div
                key={template.id}
                className={`rounded-2xl border transition-all duration-200 ${
                  isExpanded
                    ? `bg-zinc-900/70 border-zinc-600/40 ${accent.glow}`
                    : 'bg-zinc-900/50 border-zinc-800/30 hover:border-zinc-700/40'
                }`}
              >
                {/* Card header — always visible */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : template.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Name + badges row */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="text-sm font-bold text-white truncate">
                          {template.name}
                        </h3>
                        {isHyrox && (
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                            HYROX
                          </span>
                        )}
                      </div>

                      {/* Format badge + Duration */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${FORMAT_COLORS[template.format]}`}>
                          {FORMAT_LABELS[template.format]}
                        </span>
                        <span className="text-xs text-zinc-400">
                          ⏱ {formatDuration(template.duration_seconds, template.time_cap_seconds)}
                        </span>
                        {template.rounds && (
                          <span className="text-xs text-zinc-500">
                            • {template.rounds} rds
                          </span>
                        )}
                      </div>

                      {/* Equipment tags */}
                      {template.equipment && template.equipment.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {template.equipment.map(eq => (
                            <span
                              key={eq}
                              className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded"
                            >
                              {EQUIPMENT_ICONS[eq.toLowerCase()] || '•'} {eq}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right side: difficulty dots */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < template.difficulty
                                ? `bg-gradient-to-br ${accent.gradient}`
                                : 'bg-zinc-800'
                            }`}
                          />
                        ))}
                      </div>
                      {/* Expand chevron */}
                      <svg
                        className={`w-4 h-4 text-zinc-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-zinc-800/40 pt-3 space-y-3">
                    {/* Description */}
                    {template.description && (
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {template.description}
                      </p>
                    )}

                    {/* Exercise list */}
                    {exercises.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                          Exercises
                        </p>
                        <ul className="space-y-1">
                          {exercises.map((ex, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                              <span className={`w-1 h-1 rounded-full bg-gradient-to-br ${accent.gradient}`} />
                              {ex}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Benchmark score */}
                    {template.benchmark_score && (
                      <p className="text-[11px] text-zinc-500">
                        🏆 Benchmark: <span className="text-zinc-300">{template.benchmark_score}</span>
                      </p>
                    )}

                    {/* Start button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartWorkout(template);
                      }}
                      className={`w-full mt-2 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${accent.gradient} 
                        shadow-lg hover:shadow-xl transition-all active:scale-[0.98]`}
                    >
                      Start Workout →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
}
