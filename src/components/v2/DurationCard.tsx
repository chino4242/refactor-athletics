"use client";

import { useState, useEffect } from 'react';
import { PixelBar } from './PixelBox';

interface BattleCard {
  id: string;
  name: string;
  exerciseId: string;
  type: 'lifting' | 'duration' | 'cardio';
  totalSets: number;
  completedSets: number;
  targetReps: number;
  targetSeconds?: number;
  intervals?: { zone: string; seconds: number; color: string; note?: string }[];
  exercises?: { name: string; exerciseId: string; targetReps: number }[];
  defeated: boolean;
  poofing: boolean;
  section?: string;
  catalogItem?: any;
  lastWeight?: number;
  bestValue?: number;
  lastThree?: number[];
  currentLevel?: number;
  threatLevel?: 'guardian' | 'trickster' | 'titan' | 'spark';
}

export interface DurationCardProps {
  card: BattleCard;
  isActive: boolean;
  colors: any;
  currentTheme: string;
  onComplete: (seconds: number, cardId?: string) => void;
}

export default function DurationCard({ card, isActive, colors, currentTheme, onComplete }: DurationCardProps) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const targetSec = card.targetSeconds || 30;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setElapsed(prev => {
        if (prev + 1 >= targetSec) {
          setRunning(false);
          onComplete(prev + 1, card.id);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, targetSec]);

  const progress = Math.min(elapsed / targetSec, 1);

  return (
    <div className={`border-2 ${isActive ? colors.primary : colors.border} bg-zinc-900 p-4 space-y-4`}>
      {/* Enemy header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={`/themes/${currentTheme}/v2/level0.png`} alt="" className="w-5 h-5" style={{ imageRendering: 'pixelated' }} />
          <p className="text-xs text-white font-medium">{card.name}</p>
        </div>
        <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          SET {card.completedSets + 1}/{card.totalSets}
        </span>
      </div>

      {/* HP Bar */}
      <PixelBar current={card.completedSets} max={card.totalSets} />

      {/* Timer circle */}
      <div className="flex flex-col items-center py-6">
        <div className={`w-32 h-32 rounded-full border-4 ${running ? colors.primary : 'border-zinc-700'} flex items-center justify-center relative`}>
          {/* Progress ring via conic-gradient */}
          <div
            className="absolute inset-1 rounded-full"
            style={{ background: `conic-gradient(${running ? 'rgb(239 68 68)' : 'transparent'} ${progress * 360}deg, transparent 0deg)`, opacity: 0.2 }}
          />
          <span className="text-2xl text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {running ? (targetSec - elapsed) : targetSec}
          </span>
        </div>
        <p className="text-[8px] text-zinc-500 mt-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {running ? 'HOLD...' : 'TAP TO START'}
        </p>
      </div>

      {/* Start / Stop */}
      <button
        onClick={() => {
          if (running) { setRunning(false); onComplete(elapsed, card.id); setElapsed(0); }
          else setRunning(true);
        }}
        className={`w-full py-4 border-2 ${running ? 'border-red-500' : colors.primary} bg-zinc-800 text-center transition-colors hover:bg-zinc-700`}
      >
        <span className={`text-[10px] ${running ? 'text-red-400' : colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {running ? '■ STOP' : '▶ START HOLD'}
        </span>
      </button>
    </div>
  );
}
