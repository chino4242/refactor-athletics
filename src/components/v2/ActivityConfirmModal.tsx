"use client";

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

interface SyncedActivity {
  id: string;
  name: string;
  duration: number;
  xp: number;
  exerciseId: string;
}

interface Props {
  activity: SyncedActivity;
  onConfirm: (sessionGroup: string | null) => void;
  onDismiss: () => void;
}

export default function ActivityConfirmModal({ activity, onConfirm, onDismiss }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [sessionGroup, setSessionGroup] = useState<string | null>(autoDetectGroup(activity.name));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onDismiss}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative w-full max-w-md bg-zinc-900 border-t-2 border-zinc-700 rounded-t-lg p-5 pb-24 space-y-4 animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="text-center">
          <p className={`text-xs ${colors.secondary} uppercase tracking-wider mb-1`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            CLAIM YOUR XP
          </p>
          <p className="text-lg text-white font-medium">{activity.name}</p>
          <p className="text-base text-zinc-400">{activity.duration} min</p>
        </div>

        {/* XP display */}
        <div className="text-center py-2">
          <span className={`text-2xl ${colors.secondary} font-bold`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            +{activity.xp} XP
          </span>
        </div>

        {/* Session assignment */}
        <div>
          <p className="text-xs text-zinc-500 mb-2 uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Count toward:
          </p>
          <div className="flex gap-2">
            {['Strength', 'Cardio', 'Core'].map(g => (
              <button
                key={g}
                onClick={() => setSessionGroup(sessionGroup === g.toLowerCase() ? null : g.toLowerCase())}
                className={`flex-1 py-2 border text-xs transition-colors ${sessionGroup === g.toLowerCase() ? `${colors.primary} ${colors.secondary}` : 'border-zinc-700 text-zinc-500'}`}
                style={{ fontFamily: "var(--font-pixel), monospace" }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Confirm button */}
        <button
          onClick={() => onConfirm(sessionGroup)}
          className={`w-full py-3 border-2 ${colors.primary} bg-zinc-800 text-center hover:bg-zinc-700 transition-colors`}
        >
          <span className={`text-xs ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            ✓ CLAIM
          </span>
        </button>
      </div>
    </div>
  );
}

function autoDetectGroup(name: string): string | null {
  const lower = name.toLowerCase();
  if (['run', 'bike', 'swim', 'row', 'hike', 'cardio', 'cycling'].some(k => lower.includes(k))) return 'cardio';
  if (['yoga', 'stretch', 'pilates', 'flexibility'].some(k => lower.includes(k))) return 'core';
  if (['strength', 'weight', 'lifting'].some(k => lower.includes(k))) return 'strength';
  return 'cardio'; // default for most synced activities
}
