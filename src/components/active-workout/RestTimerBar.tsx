'use client';

import { useEffect } from 'react';
import { Timer } from 'lucide-react';
import type { RestTimerBarProps } from './types';

export default function RestTimerBar({ restTime, totalRest, onSkip }: RestTimerBarProps) {
  const progress = totalRest > 0 ? ((totalRest - restTime) / totalRest) * 100 : 0;

  useEffect(() => {
    if (restTime === 0) {
      try { navigator.vibrate?.(200); } catch {}
    }
  }, [restTime]);

  if (restTime <= 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pt-safe animate-in slide-in-from-top-2">
      <div className="bg-blue-600 px-4 py-3 flex items-center justify-between shadow-lg shadow-blue-900/40">
        <div className="flex items-center gap-2">
          <Timer size={16} className="text-white animate-pulse" />
          <span className="text-xs font-bold text-white/80 uppercase">Rest</span>
        </div>
        <span className="text-xl font-mono font-black text-white">{Math.floor(restTime / 60)}:{(restTime % 60).toString().padStart(2, '0')}</span>
        <button onClick={onSkip} className="text-[10px] font-bold text-white/70 hover:text-white px-3 py-1.5 rounded bg-white/15 hover:bg-white/25 transition">SKIP</button>
      </div>
      <div className="h-1 bg-blue-900">
        <div className="h-full bg-blue-300 transition-all duration-1000" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
