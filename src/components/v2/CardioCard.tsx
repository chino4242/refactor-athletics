"use client";

import { useState, useEffect, useRef } from 'react';

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

export interface CardioCardProps {
  card: BattleCard;
  isActive: boolean;
  colors: any;
  onComplete: (seconds: number, cardId?: string) => void;
}

export default function CardioCard({ card, isActive, colors, onComplete }: CardioCardProps) {
  const [engineChoice, setEngineChoice] = useState<'hiit' | 'zone2' | null>(null);
  const [zone2Duration, setZone2Duration] = useState(30);
  const intervals = engineChoice === 'zone2'
    ? [{ zone: 'Comfortable', seconds: zone2Duration * 60, color: 'bg-green-500', note: null }]
    : (card.intervals || []);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  const current = intervals[currentIdx];
  const totalElapsed = intervals.slice(0, currentIdx).reduce((s, i) => s + i.seconds, 0) + elapsed;
  const totalDuration = card.targetSeconds || intervals.reduce((s, i) => s + i.seconds, 0);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [flash, setFlash] = useState(false);
  const prevIdx = useRef(currentIdx);

  // Flash on zone transition
  useEffect(() => {
    if (currentIdx !== prevIdx.current) {
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
      prevIdx.current = currentIdx;
    }
  }, [currentIdx]);

  useEffect(() => {
    if (!running || !current) return;
    const t = setInterval(() => {
      setElapsed(prev => {
        const remaining = current.seconds - (prev + 1);
        // 3-2-1 countdown beeps (ascending pitch)
        if (remaining === 2) import('@/utils/audio').then(m => m.playCountdownBeep(600, 0.1));
        if (remaining === 1) import('@/utils/audio').then(m => m.playCountdownBeep(800, 0.1));
        if (remaining === 0) import('@/utils/audio').then(m => m.playCountdownBeep(1000, 0.15));

        if (prev + 1 >= current.seconds) {
          // Zone transition sound
          const nextZone = intervals[currentIdx + 1];
          if (nextZone?.color.includes('red')) {
            // Urgent triple beep for Full Send
            setTimeout(() => import('@/utils/audio').then(m => m.playCountdownBeep(800, 0.05)), 0);
            setTimeout(() => import('@/utils/audio').then(m => m.playCountdownBeep(1000, 0.05)), 80);
            setTimeout(() => import('@/utils/audio').then(m => m.playCountdownBeep(1200, 0.1)), 160);
          } else {
            // Normal double beep
            setTimeout(() => import('@/utils/audio').then(m => m.playCountdownBeep(800, 0.05)), 0);
            setTimeout(() => import('@/utils/audio').then(m => m.playCountdownBeep(1200, 0.1)), 80);
          }
          import('@/utils/haptics').then(m => m.haptic('medium'));
          if (currentIdx + 1 < intervals.length) {
            setCurrentIdx(i => i + 1);
            return 0;
          } else {
            setRunning(false);
            setFinished(true);
            onCompleteRef.current(totalDuration, card.id);
            return prev + 1;
          }
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, currentIdx, current, intervals.length, totalDuration]);

  // Engine choice: HIIT vs Zone 2
  if (!engineChoice) {
    return (
      <div className={`border-2 ${isActive ? colors.primary : colors.border} bg-zinc-900 p-4 space-y-3`}>
        <p className={`text-[10px] ${colors.headerText} text-center uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          PICK YOUR ENGINE
        </p>
        <button onClick={() => setEngineChoice('hiit')} className={`w-full p-3 border ${colors.border} bg-zinc-800 text-left hover:bg-zinc-700 transition-colors`}>
          <span className="text-sm">🔥</span>
          <span className="text-xs text-white ml-2 font-medium">HIIT Intervals</span>
          <p className="text-[10px] text-zinc-500 ml-6">Programmed tread block</p>
        </button>
        <button onClick={() => setEngineChoice('zone2')} className={`w-full p-3 border ${colors.border} bg-zinc-800 text-left hover:bg-zinc-700 transition-colors`}>
          <span className="text-sm">💚</span>
          <span className="text-xs text-white ml-2 font-medium">Zone 2 Steady State</span>
          <p className="text-[10px] text-zinc-500 ml-6">Easy pace — pick your duration</p>
        </button>
        {engineChoice === null && (
          <div className="flex gap-2 justify-center">
            {[20, 30, 45].map(m => (
              <button key={m} onClick={() => { setZone2Duration(m); setEngineChoice('zone2'); }} className={`text-[9px] px-2 py-1 border border-zinc-700 bg-zinc-900 text-zinc-400`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {m}min Z2
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (finished) {
    return (
      <div className={`border-2 ${colors.primary} bg-zinc-900 p-4 text-center`}>
        <p className={`text-[10px] ${colors.secondary} mb-2`} style={{ fontFamily: "var(--font-pixel), monospace" }}>✓ CARDIO COMPLETE</p>
        <p className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>{Math.round(totalDuration / 60)} min</p>
      </div>
    );
  }

  // Zone-based card styling
  const zoneBg = current?.color.includes('red') ? 'bg-red-950/60 border-red-700'
    : current?.color.includes('orange') ? 'bg-orange-950/60 border-orange-700'
    : 'bg-green-950/60 border-green-700';
  const zoneText = current?.color.includes('red') ? 'text-red-400'
    : current?.color.includes('orange') ? 'text-orange-400'
    : 'text-green-400';

  // Parse incline from note
  const inclineMatch = current?.note?.match(/(\d+(?:\.\d+)?)\s*%/);
  const incline = inclineMatch ? inclineMatch[1] : null;

  const remaining = current ? current.seconds - elapsed : 0;
  const isCountdown = remaining <= 5 && running;

  return (
    <div className={`border-2 ${zoneBg} p-4 space-y-4 transition-colors duration-300 ${flash ? 'brightness-200' : ''}`} style={flash ? { filter: 'brightness(2)' } : undefined}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-white font-medium">{card.name}</p>
        <span className="text-[8px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {Math.round(totalElapsed / 60)}/{Math.round(totalDuration / 60)} MIN
        </span>
      </div>

      {/* Overall progress */}
      <div className="h-2 bg-zinc-800 border border-zinc-700 flex">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className={`flex-1 border-r border-zinc-900 ${i < Math.round((totalElapsed / totalDuration) * 20) ? colors.barFill : ''}`} />
        ))}
      </div>

      {/* Current zone — LARGE display */}
      {current && (
        <div className="text-center py-3">
          <p className={`text-sm uppercase font-bold ${zoneText}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {current.zone}
          </p>
          <p className="text-[10px] text-zinc-500 mt-1 mb-3">
            {current.zone === 'Comfortable' ? 'Easy pace — can hold a conversation' :
             current.zone === 'Challenging' ? 'Push it — breathing hard' :
             current.zone === 'Full Send' ? 'All out — max effort' :
             'Steady effort'}
          </p>

          {/* Large incline display */}
          {incline && (
            <p className="text-3xl text-white font-bold mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {incline}%<span className="text-base text-zinc-400 ml-1">incline</span>
            </p>
          )}

          {/* Countdown */}
          <span className={`text-white block ${isCountdown ? 'text-5xl animate-pulse' : 'text-3xl'}`} style={{ fontFamily: "var(--font-pixel), monospace", transition: 'font-size 0.2s' }}>
            {running ? remaining : current.seconds}
          </span>
          <p className="text-[8px] text-zinc-600 mt-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            INTERVAL {currentIdx + 1}/{intervals.length}
          </p>
          {currentIdx + 1 < intervals.length && (
            <p className="text-[10px] text-zinc-600 mt-1">
              Next: {intervals[currentIdx + 1].zone} ({intervals[currentIdx + 1].seconds}s)
            </p>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="space-y-2">
        <button
          onClick={() => setRunning(!running)}
          className={`w-full py-3 border-2 ${running ? 'border-red-500' : colors.primary} bg-zinc-800 text-center transition-colors hover:bg-zinc-700`}
        >
          <span className={`text-[10px] ${running ? 'text-red-400' : colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {running ? '■ PAUSE' : '▶ START CARDIO'}
          </span>
        </button>
        {running && (
          <div className="flex gap-2">
            {currentIdx + 1 < intervals.length && (
              <button
                onClick={() => { setCurrentIdx(i => i + 1); setElapsed(0); }}
                className="flex-1 py-2 border border-zinc-700 bg-zinc-800 text-center hover:bg-zinc-700"
              >
                <span className="text-[9px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>▸ SKIP</span>
              </button>
            )}
            <button
              onClick={() => { if (totalElapsed > 0) onCompleteRef.current(totalElapsed, card.id); setRunning(false); setFinished(true); }}
              className="flex-1 py-2 border border-zinc-700 bg-zinc-800 text-center hover:bg-zinc-700"
            >
              <span className="text-[9px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>✓ END EARLY</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
