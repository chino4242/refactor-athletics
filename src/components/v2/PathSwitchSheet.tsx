"use client";

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';
import { PATH_KEY_EXERCISES } from '@/data/pathExercises';

interface Exercise {
  exerciseId: string;
  name: string;
  level: number;
  expired: boolean;
}

interface Props {
  userId: string;
  currentPath: string;
  exercises: Exercise[];
  onConfirm: () => void;
  onClose: () => void;
}

const PATH_OPTIONS: { key: string; label: string; description: string }[] = [
  { key: 'hybrid', label: 'Hybrid', description: 'All-rounder — balanced strength, cardio, and mobility' },
  { key: 'strength', label: 'Strength', description: 'Heavy lifting, max effort — powerlifting focus' },
  { key: 'endurance', label: 'Endurance', description: 'Cardio, time trials, and sustained effort' },
  { key: 'mobility', label: 'Mobility & Calisthenics', description: 'Holds, flexibility, and bodyweight mastery' },
];

const UNIVERSAL_CORE = ['back_squat', 'deadlift', 'bench_press', 'pull_up', 'overhead_press', 'run_1_mile', 'plank', 'push_ups'];

function getExerciseName(id: string, exercises: Exercise[]): string {
  const found = exercises.find(e => e.exerciseId === id);
  if (found) return found.name;
  // Fallback: humanize the ID
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function PathSwitchSheet({ userId, currentPath, exercises, onConfirm, onClose }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [targetPath, setTargetPath] = useState<string>(currentPath);
  const [confirming, setConfirming] = useState(false);

  const currentExercises = PATH_KEY_EXERCISES[currentPath] || PATH_KEY_EXERCISES['hybrid'];
  const targetExercises = PATH_KEY_EXERCISES[targetPath] || PATH_KEY_EXERCISES['hybrid'];

  const currentSpecialty = currentExercises.filter(id => !UNIVERSAL_CORE.includes(id));
  const targetSpecialty = targetExercises.filter(id => !UNIVERSAL_CORE.includes(id));

  // What carries (exists in both paths)
  const carries = currentSpecialty.filter(id => targetSpecialty.includes(id));
  // What you lose (in current but not target)
  const loses = currentSpecialty.filter(id => !targetSpecialty.includes(id));
  // What you gain (in target but not current)
  const gains = targetSpecialty.filter(id => !currentSpecialty.includes(id));

  // Calculate PL impact
  const currentPL = exercises.filter(ex => !ex.expired).reduce((sum, ex) => sum + ex.level, 0);
  const lostLevels = loses.reduce((sum, id) => {
    const ex = exercises.find(e => e.exerciseId === id);
    return sum + (ex && !ex.expired ? ex.level : 0);
  }, 0);
  const projectedPL = currentPL - lostLevels;

  const isSamePath = targetPath === currentPath;

  const handleConfirm = async () => {
    if (isSamePath) { onClose(); return; }
    setConfirming(true);
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      await supabase.from('users').update({ selected_path: targetPath }).eq('id', userId);
      onConfirm();
    } catch {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-zinc-950 overflow-y-auto overscroll-contain">
      <div className="p-4 space-y-4 min-h-full">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 text-lg">✕</button>

        {/* Header */}
        <div className="text-center pt-2">
          <p className={`text-[10px] ${colors.headerText} uppercase tracking-widest`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            SWITCH PATH
          </p>
          <p className="text-[9px] text-zinc-500 mt-1">
            Your path determines which 4 specialty exercises count toward Power Level.
          </p>
        </div>

        {/* Path picker */}
        <div className="space-y-2">
          {PATH_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setTargetPath(opt.key)}
              className={`w-full text-left px-3 py-2.5 border ${targetPath === opt.key ? colors.primary + ' bg-zinc-800' : 'border-zinc-800 bg-zinc-900'} transition-colors`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] ${targetPath === opt.key ? colors.secondary : 'text-zinc-300'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  {opt.label.toUpperCase()}
                </span>
                {opt.key === currentPath && (
                  <span className="text-[7px] text-zinc-600" style={{ fontFamily: "var(--font-pixel), monospace" }}>CURRENT</span>
                )}
              </div>
              <p className="text-[8px] text-zinc-500 mt-0.5">{opt.description}</p>
            </button>
          ))}
        </div>

        {/* Impact preview (only show if different path selected) */}
        {!isSamePath && (
          <div className="space-y-3">
            {/* PL Impact */}
            <div className={`border ${colors.border} bg-zinc-900 p-3`}>
              <p className="text-[8px] text-zinc-500 uppercase mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>POWER LEVEL IMPACT</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-xl text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{currentPL}</span>
                <span className="text-zinc-500">→</span>
                <span className={`text-xl ${projectedPL < currentPL ? 'text-amber-400' : 'text-white'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{projectedPL}</span>
              </div>
              {lostLevels > 0 && (
                <p className="text-[8px] text-zinc-500 text-center mt-1">
                  -{lostLevels} from dropped exercises (earn it back by ranking the new ones)
                </p>
              )}
            </div>

            {/* Keeps */}
            <div>
              <p className="text-[8px] text-zinc-500 uppercase mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>KEEPS (8 core)</p>
              <p className="text-[9px] text-zinc-400">
                {UNIVERSAL_CORE.map(id => getExerciseName(id, exercises)).join(', ')}
              </p>
            </div>

            {/* Carries */}
            {carries.length > 0 && (
              <div>
                <p className="text-[8px] text-green-400 uppercase mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>★ CARRIES OVER</p>
                {carries.map(id => {
                  const ex = exercises.find(e => e.exerciseId === id);
                  return (
                    <div key={id} className="flex justify-between text-[9px] py-0.5">
                      <span className="text-zinc-300">{getExerciseName(id, exercises)}</span>
                      {ex && ex.level > 0 && <span className="text-green-400">Lv{ex.level} ★</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Loses */}
            {loses.length > 0 && (
              <div>
                <p className="text-[8px] text-red-400 uppercase mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>DROPS</p>
                {loses.map(id => {
                  const ex = exercises.find(e => e.exerciseId === id);
                  return (
                    <div key={id} className="flex justify-between text-[9px] py-0.5">
                      <span className="text-zinc-500">{getExerciseName(id, exercises)}</span>
                      {ex && ex.level > 0 && !ex.expired && <span className="text-red-400">-Lv{ex.level}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Gains */}
            {gains.length > 0 && (
              <div>
                <p className={`text-[8px] ${colors.secondary} uppercase mb-1`} style={{ fontFamily: "var(--font-pixel), monospace" }}>GAINS</p>
                {gains.map(id => (
                  <div key={id} className="flex justify-between text-[9px] py-0.5">
                    <span className="text-zinc-300">{getExerciseName(id, exercises)}</span>
                    <span className="text-zinc-600">unranked</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Confirm */}
        <div className="pt-4 pb-8">
          <button
            onClick={handleConfirm}
            disabled={isSamePath || confirming}
            className={`w-full text-center text-[10px] py-3 border ${isSamePath ? 'border-zinc-700 text-zinc-600' : colors.primary + ' ' + colors.secondary} bg-zinc-800 disabled:opacity-50 transition-colors`}
            style={{ fontFamily: "var(--font-pixel), monospace" }}
          >
            {confirming ? 'SWITCHING...' : isSamePath ? 'SELECT A DIFFERENT PATH' : `SWITCH TO ${PATH_OPTIONS.find(p => p.key === targetPath)?.label.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
