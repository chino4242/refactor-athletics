"use client";

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

interface Props {
  userId: string;
}

interface ExerciseReport {
  name: string;
  sets: { weight: number; reps: number; duration?: number }[];
  category: string;
}

export default function DailyWorkoutReport({ userId }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [report, setReport] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));

  const generateReport = async () => {
    setLoading(true);
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();

    // Get all workouts for the selected date
    const { data: workouts } = await supabase
      .from('workouts')
      .select('exercise_id, sets, timestamp')
      .eq('user_id', userId)
      .eq('date', selectedDate)
      .order('timestamp', { ascending: true });

    if (!workouts?.length) {
      setReport('No workouts logged for this date.');
      setExercises([]);
      setLoading(false);
      return;
    }

    // Get catalog names
    const exerciseIds = [...new Set(workouts.map(w => w.exercise_id))];
    const { data: catalog } = await supabase
      .from('catalog')
      .select('id, name, category')
      .in('id', exerciseIds);

    const nameMap = new Map((catalog || []).map(c => [c.id, { name: c.name || c.id.replace(/_/g, ' '), category: c.category || 'Other' }]));

    // Group by exercise, aggregate sets
    const grouped: Record<string, ExerciseReport> = {};
    for (const w of workouts) {
      let info = nameMap.get(w.exercise_id);
      if (!info) {
        // Handle synced exercises like "synced_yoga_29713538" — strip the ID suffix
        const cleanId = w.exercise_id.replace(/^synced_/, '').replace(/_\d{6,}$/, '');
        info = { name: cleanId.replace(/_/g, ' '), category: 'Cardio' };
      }
      if (!grouped[w.exercise_id]) {
        grouped[w.exercise_id] = { name: info.name, sets: [], category: info.category };
      }
      const sets = w.sets || [];
      for (const s of sets) {
        grouped[w.exercise_id].sets.push(s);
      }
    }

    const exerciseList = Object.values(grouped).filter(e => e.sets.length > 0);
    // Sort: strength first, then cardio/other
    const strengthCategories = ['strength', 'weightlifting', 'gymnastics', 'power'];
    exerciseList.sort((a, b) => {
      const aIsStrength = strengthCategories.some(c => a.category.toLowerCase().includes(c));
      const bIsStrength = strengthCategories.some(c => b.category.toLowerCase().includes(c));
      if (aIsStrength && !bIsStrength) return -1;
      if (!aIsStrength && bIsStrength) return 1;
      return 0;
    });

    setExercises(exerciseList);

    // Generate text report
    const dateDisplay = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const lines: string[] = [`WORKOUT — ${dateDisplay}`, ''];

    // Strength exercises first
    const strength = exerciseList.filter(e => strengthCategories.some(c => e.category.toLowerCase().includes(c)));
    const other = exerciseList.filter(e => !strengthCategories.some(c => e.category.toLowerCase().includes(c)));

    if (strength.length > 0) {
      lines.push('── STRENGTH ──');
      for (const ex of strength) {
        lines.push('');
        lines.push(ex.name);
        for (let i = 0; i < ex.sets.length; i++) {
          const s = ex.sets[i];
          if (s.duration) {
            const min = Math.floor(s.duration / 60);
            const sec = s.duration % 60;
            lines.push(`  Set ${i + 1}: ${min}:${String(sec).padStart(2, '0')}`);
          } else if (s.weight && s.reps) {
            lines.push(`  Set ${i + 1}: ${s.weight} lbs × ${s.reps} reps`);
          } else if (s.reps) {
            lines.push(`  Set ${i + 1}: ${s.reps} reps`);
          }
        }
      }
    }

    if (other.length > 0) {
      lines.push('');
      lines.push('── OTHER ──');
      for (const ex of other) {
        lines.push('');
        lines.push(ex.name);
        for (let i = 0; i < ex.sets.length; i++) {
          const s = ex.sets[i];
          if (s.duration) {
            const min = Math.floor(s.duration / 60);
            const sec = s.duration % 60;
            lines.push(`  Set ${i + 1}: ${min}:${String(sec).padStart(2, '0')}`);
          } else if (s.weight && s.reps) {
            lines.push(`  Set ${i + 1}: ${s.weight} lbs × ${s.reps} reps`);
          } else if (s.reps) {
            lines.push(`  Set ${i + 1}: ${s.reps} reps`);
          }
        }
      }
    }

    setReport(lines.join('\n'));
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!report) return;
    if (navigator.share) {
      try { await navigator.share({ text: report }); return; } catch {}
    }
    handleCopy();
  };

  return (
    <div className="space-y-3">
      {/* Date picker + Generate */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white outline-none"
        />
        <button onClick={generateReport} disabled={loading} className={`px-4 py-2 border ${colors.primary} bg-zinc-800 text-[10px] text-white uppercase disabled:opacity-50`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {loading ? '...' : 'Generate'}
        </button>
      </div>

      {/* Report output */}
      {report && (
        <div className={`border ${colors.border} bg-zinc-900 p-3 space-y-3`}>
          <pre className="text-[10px] text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono max-h-[400px] overflow-y-auto">
            {report}
          </pre>
          <div className="flex gap-2">
            <button onClick={handleCopy} className={`flex-1 py-2 border ${colors.border} bg-zinc-800 text-[9px] text-white uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
            <button onClick={handleShare} className={`flex-1 py-2 border ${colors.primary} bg-zinc-800 text-[9px] text-white uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              📤 Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
