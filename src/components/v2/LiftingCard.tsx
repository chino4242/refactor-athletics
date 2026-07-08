"use client";

import { useState } from 'react';
import { PixelBar } from './PixelBox';
import EnemySprite, { getBattleNarration } from './EnemySprite';
import type { CatalogItem } from '@/types';

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
  catalogItem?: CatalogItem;
  lastWeight?: number;
  bestValue?: number;
  lastThree?: number[];
  currentLevel?: number;
  nextThreshold?: number;
  threatLevel?: 'guardian' | 'trickster' | 'titan' | 'spark';
}

export interface LiftingCardProps {
  card: BattleCard;
  isActive: boolean;
  colors: any;
  currentTheme: string;
  weight: string;
  reps: string;
  onWeightChange: (v: string) => void;
  onRepsChange: (v: string) => void;
  isResting: boolean;
  restSeconds: number;
  restMax: number;
  onLogAttack: () => void;
  onSkipRest: () => void;
  subExerciseIdx: number;
  catalog: CatalogItem[];
  onSwap: (exId: string, name: string) => void;
  restEvent?: string | null;
  onShowHistory: (exId: string) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  prFlash?: boolean;
}

// --- Plate Calculator (inline, pixel-styled) ---
function PlateCalcInline({ onUse }: { onUse: (weight: number) => void }) {
  const [barWeight, setBarWeight] = useState(45);
  const [plates, setPlates] = useState<Record<number, number>>({});
  const PLATES = [45, 35, 25, 10, 5, 2.5];

  const plateTotal = Object.entries(plates).reduce((sum, [w, count]) => sum + parseFloat(w) * count * 2, 0);
  const total = barWeight + plateTotal;

  return (
    <div className="border border-zinc-700 bg-zinc-800 p-3 mt-1 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {[45, 25].map(bw => (
            <button key={bw} onClick={() => setBarWeight(bw)} className={`text-xs px-2 py-1 border ${barWeight === bw ? 'border-zinc-500 text-white' : 'border-zinc-700 text-zinc-500'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {bw}lb BAR
            </button>
          ))}
        </div>
        <span className="text-xs text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>{total} LBS</span>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {PLATES.map(p => (
          <div key={p} className="text-center">
            <p className="text-xs text-zinc-500 mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>{p}</p>
            <div className="flex items-center justify-center">
              <button onClick={() => setPlates(prev => ({ ...prev, [p]: Math.max(0, (prev[p] || 0) - 1) }))} className="w-7 h-7 flex items-center justify-center border border-zinc-600 bg-zinc-900 text-zinc-300 active:bg-zinc-700">
                <span className="text-sm">−</span>
              </button>
              <span className="text-xs text-white w-5 text-center" style={{ fontFamily: "var(--font-pixel), monospace" }}>{plates[p] || 0}</span>
              <button onClick={() => setPlates(prev => ({ ...prev, [p]: (prev[p] || 0) + 1 }))} className="w-7 h-7 flex items-center justify-center border border-zinc-600 bg-zinc-900 text-zinc-300 active:bg-zinc-700">
                <span className="text-sm">+</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => onUse(total)} className="w-full text-xs py-1.5 border border-zinc-600 bg-zinc-900 text-zinc-300 hover:text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
        USE {total} LBS
      </button>
    </div>
  );
}

export default function LiftingCard({ card, isActive, colors, currentTheme, weight, reps, onWeightChange, onRepsChange, isResting, restSeconds, restMax, onLogAttack, onSkipRest, subExerciseIdx, catalog, onSwap, restEvent, onShowHistory, onUndo, canUndo, prFlash }: LiftingCardProps) {
  const isCompound = ['squat', 'bench', 'deadlift', 'press', 'row', 'clean', 'snatch'].some(n => card.name.toLowerCase().includes(n));
  const isSuperset = card.exercises && card.exercises.length > 1;
  const [showPlate, setShowPlate] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const combat = currentTheme !== 'athlete';

  const currentExercise = isSuperset ? card.exercises![subExerciseIdx % card.exercises!.length] : null;
  const displayName = currentExercise ? currentExercise.name : card.name;

  return (
    <div className={`border-2 ${isActive ? colors.primary : colors.border} bg-zinc-900 p-4 space-y-4`}>
      {/* Battle scene — enemy sprite + name + HP */}
      {combat && !isSuperset && <EnemySprite exerciseId={card.exerciseId} level={card.currentLevel || 0} defeated={card.defeated} theme={currentTheme} showName attackCount={card.completedSets} />}
      {/* Battle narration */}
      {combat && !isSuperset && (
        <p className="text-xs text-zinc-500 italic text-center mb-1">
          {getBattleNarration(card, currentTheme)}
        </p>
      )}
      {combat && !isSuperset && (
        <PixelBar current={card.completedSets} max={card.totalSets} inverted={combat} />
      )}
      {/* Enemy header */}
      <div>
        {isSuperset ? (
          <div className="space-y-2">
            <EnemySprite exerciseId={card.exerciseId} level={card.currentLevel || 0} defeated={card.defeated} theme={currentTheme} showName={combat} attackCount={card.completedSets} />
            <div className="flex items-center justify-between">
              <span className={`text-xs ${colors.secondary} tracking-wider`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                ⚔⚔ DUAL ENCOUNTER
              </span>
              <span className="text-xs text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                SET {card.completedSets + 1}/{card.totalSets}
              </span>
            </div>
            {card.exercises!.map((ex, i) => {
              const active = i === subExerciseIdx;
              const done = i < subExerciseIdx;
              return (
                <div key={i} className={`flex items-center justify-between px-2 py-1.5 border ${active ? `${colors.border} bg-zinc-800` : 'border-transparent'}`}>
                  <p className={`${active ? 'text-xs text-white' : 'text-xs text-zinc-600'} truncate max-w-[220px]`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    {done ? '✓ ' : active ? '▸ ' : ''}{ex.name}
                  </p>
                  <span className={`text-xs ${done ? 'text-green-500' : active ? colors.secondary : 'text-zinc-700'}`}>
                    {done ? '✓' : active ? '⬤' : '○'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button onClick={() => onShowHistory(card.exerciseId)} className="flex items-center gap-2">
              {!combat && <img src={`/themes/${currentTheme}/v2/level${card.catalogItem?.standards ? '1' : '0'}.png`} alt="" className="w-5 h-5" style={{ imageRendering: 'pixelated' }} />}
              <p className={`${combat ? 'text-xs text-zinc-400' : 'text-xs text-white font-medium'} truncate max-w-[200px] ${combat ? '' : 'underline decoration-zinc-700'}`}>{displayName}</p>
            </button>
            <span className="text-xs text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {card.completedSets + 1 === card.totalSets ? (combat ? '⚡ FINAL STRIKE' : '⚡ LAST SET') : combat ? `STRIKE ${card.completedSets + 1}/${card.totalSets}` : `SET ${card.completedSets + 1}/${card.totalSets}`}
            </span>
          </div>
        )}
      </div>

      {/* HP Bar (shown here only for athlete mode or superset — combat non-superset has it above) */}
      {(!combat || isSuperset) && <PixelBar current={card.completedSets} max={card.totalSets} inverted={combat} />}

      {/* Rank indicator + progressive overload suggestion */}
      {card.currentLevel !== undefined && !isSuperset && card.catalogItem?.standards && (
        <p className="text-xs text-zinc-600 text-center" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          {(() => {
            const unit = card.catalogItem?.standards?.unit;
            const isRepsBased = unit === 'Reps';
            const nextT = card.nextThreshold || 0;

            if (card.currentLevel >= 5) return 'LV5 · MAX RANK';

            // Reps-based exercises (push-ups, pull-ups, dips)
            if (isRepsBased) {
              const bestReps = Math.round(card.bestValue || 0);
              const suggestion = bestReps + 2;
              if (nextT > 0) return `LV${card.currentLevel} · Next: ${Math.min(suggestion, nextT)} reps → LV${card.currentLevel + 1}`;
              if (bestReps > 0) return `LV${card.currentLevel} · Best ${bestReps} reps`;
              return `LV${card.currentLevel}`;
            }

            // Time-based exercises (plank, dead hang, runs)
            if (unit === 'Sec') {
              const bestSec = Math.round(card.bestValue || 0);
              const isLowerBetter = card.catalogItem?.standards?.scoring === 'lower_is_better';
              if (nextT > 0) {
                const gap = isLowerBetter ? bestSec - nextT : nextT - bestSec;
                const fmtTarget = nextT >= 60 ? `${Math.floor(nextT / 60)}:${String(Math.round(nextT % 60)).padStart(2, '0')}` : `${nextT}s`;
                if (gap > 0) return `LV${card.currentLevel} · ${isLowerBetter ? '-' : '+'}${Math.round(gap)}s to LV${card.currentLevel + 1}`;
                return `LV${card.currentLevel} · Target: ${fmtTarget} → LV${card.currentLevel + 1}`;
              }
              if (bestSec > 0) {
                const fmt = bestSec >= 60 ? `${Math.floor(bestSec / 60)}:${String(Math.round(bestSec % 60)).padStart(2, '0')}` : `${bestSec}s`;
                return `LV${card.currentLevel} · Best ${fmt}`;
              }
              return `LV${card.currentLevel}`;
            }

            // Weight-based exercises
            const isLower = ['squat', 'deadlift', 'rdl', 'leg'].some(k => card.exerciseId.includes(k));
            const increment = isLower ? 10 : 5;
            const lastW = card.lastWeight || 0;
            const targetReps = card.targetReps || 8;
            const suggestion = lastW > 0 ? Math.round((lastW + increment) / 5) * 5 : 0;

            if (suggestion > 0 && nextT > 0) {
              const safeSuggestion = Math.min(suggestion, Math.round(nextT / (1 + targetReps / 30) / 5) * 5);
              return `LV${card.currentLevel} · Next: ${safeSuggestion} × ${targetReps} → LV${card.currentLevel + 1}`;
            }
            if (nextT > 0) return `LV${card.currentLevel} · ${Math.round(nextT - (card.bestValue || 0))} lbs to LV${card.currentLevel + 1}`;
            if (card.bestValue) return `LV${card.currentLevel} · Best ${Math.round(card.bestValue)} lbs`;
            return `LV${card.currentLevel}`;
          })()}
        </p>
      )}

      {/* PR Flash */}
      {prFlash && (
        <p className="text-center text-base text-amber-400 font-bold animate-pulse" style={{ fontFamily: "var(--font-pixel), monospace" }}>★ NEW PR</p>
      )}

      {/* Equipment variants */}
      {(() => {
        const baseId = card.catalogItem?.normalizes_to || card.exerciseId;
        const variants = catalog.filter(c => (c.id === baseId || c.normalizes_to === baseId) && c.id !== card.exerciseId);
        if (variants.length === 0) return null;
        return (
          <div className="flex gap-1 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 border ${colors.primary} bg-zinc-800 text-zinc-200`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {card.catalogItem?.required_equipment?.[0]?.toUpperCase()?.slice(0, 2) || 'BB'}
            </span>
            {variants.slice(0, 3).map(v => (
              <button key={v.id} onClick={() => onSwap(v.id, v.name)} className="text-xs px-1.5 py-0.5 border border-zinc-700 bg-zinc-900 text-zinc-500 hover:text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {v.required_equipment?.[0]?.toUpperCase()?.slice(0, 2) || 'DB'}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Rank nudge */}
      {card.catalogItem?.standards && (card.lastWeight || 0) > 0 && (() => {
        const standards = card.catalogItem.standards;
        const brackets = standards?.brackets?.male || standards?.brackets?.female;
        if (!brackets?.length) return null;
        const bracket = brackets[0];
        const levels = bracket?.levels;
        if (!levels) return null;
        const currentWeight = card.lastWeight || 0;
        for (let i = 0; i < levels.length; i++) {
          const threshold = levels[i];
          if (currentWeight < threshold) {
            const diff = Math.round(threshold - currentWeight);
            return <p className={`text-xs ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>▲ {diff} more for LV{i + 1}</p>;
          }
        }
        return null;
      })()}

      {/* Weight + Reps inputs */}
      {(() => {
        const isRunExercise = ['run_1_mile', 'run_400m', 'run_5k', 'run_2_mile'].some(k => card.exerciseId === k || card.exerciseId.includes(k));
        const isRepsOnly = card.catalogItem?.standards?.unit === 'Reps';
        if (isRunExercise) {
          return (
            <div className="grid grid-cols-2 gap-3">
              <div className={`border ${colors.border} bg-zinc-800 p-4 text-center`}>
                <input type="number" inputMode="numeric" value={weight} onChange={e => onWeightChange(e.target.value)} className="w-full bg-transparent text-center text-3xl text-white outline-none placeholder:text-zinc-600" style={{ fontFamily: "var(--font-pixel), monospace" }} placeholder="0" />
                <p className="text-xs text-zinc-500 mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>MIN</p>
              </div>
              <div className={`border ${colors.border} bg-zinc-800 p-4 text-center`}>
                <input type="number" inputMode="numeric" value={reps} onChange={e => onRepsChange(e.target.value)} className="w-full bg-transparent text-center text-3xl text-white outline-none placeholder:text-zinc-600" style={{ fontFamily: "var(--font-pixel), monospace" }} placeholder="00" />
                <p className="text-xs text-zinc-500 mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>SEC</p>
              </div>
            </div>
          );
        }
        if (isRepsOnly) {
          return (
            <div className="max-w-[160px] mx-auto">
              <button onClick={() => { if (!reps) onRepsChange(String(card.targetReps || 8)); }} className={`w-full border ${colors.border} bg-zinc-800 p-4 text-center`}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={reps}
                  onChange={e => onRepsChange(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  className="w-full bg-transparent text-center text-3xl text-white outline-none placeholder:text-zinc-600"
                  style={{ fontFamily: "var(--font-pixel), monospace" }}
                  placeholder={String(card.targetReps || 8)}
                />
                <p className="text-xs text-zinc-500 mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>MAX REPS</p>
              </button>
            </div>
          );
        }
        return (
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => { if (!weight && card.lastWeight) onWeightChange(String(card.lastWeight)); }} className={`border ${colors.border} bg-zinc-800 p-4 text-center`}>
          <input
            type="number"
            inputMode="numeric"
            value={weight}
            onChange={e => onWeightChange(e.target.value)}
            onClick={e => e.stopPropagation()}
            className="w-full bg-transparent text-center text-3xl text-white outline-none placeholder:text-zinc-600"
            style={{ fontFamily: "var(--font-pixel), monospace" }}
            placeholder={card.lastWeight ? String(card.lastWeight) : '0'}
          />
          <p className="text-xs text-zinc-500 mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>LBS</p>
        </button>
        <button onClick={() => { if (!reps) onRepsChange(String(card.targetReps || 8)); }} className={`border ${colors.border} bg-zinc-800 p-4 text-center`}>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={e => onRepsChange(e.target.value)}
            onClick={e => e.stopPropagation()}
            className="w-full bg-transparent text-center text-3xl text-white outline-none placeholder:text-zinc-600"
            style={{ fontFamily: "var(--font-pixel), monospace" }}
            placeholder={String(card.targetReps || 8)}
          />
          <p className="text-xs text-zinc-500 mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>REPS</p>
        </button>
      </div>
        );
      })()}

      {/* LOG ATTACK / REST button */}
      {isResting ? (
        <>
        <button
          onClick={onSkipRest}
          className="w-full py-3 border-2 border-cyan-500/60 bg-cyan-950/40 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-cyan-500/20 transition-all duration-1000 ease-linear" style={{ width: `${(restSeconds / restMax) * 100}%` }} />
          <div className="relative z-10 flex flex-col items-center gap-0.5">
            <span className="text-3xl font-bold text-cyan-300 tabular-nums">
              {restSeconds}s
            </span>
            <span className="text-xs text-cyan-400/80 tracking-wider" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              ◷ RESTING — TAP TO SKIP
            </span>
            {restEvent && <p className="text-xs text-zinc-500 mt-1 italic">{restEvent}</p>}
          </div>
        </button>
        {canUndo && onUndo && (
          <button onClick={onUndo} className="w-full py-2 mt-1 border border-zinc-700 bg-zinc-900 text-center hover:bg-zinc-800">
            <span className="text-xs text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>↩ UNDO LAST</span>
          </button>
        )}
        </>
      ) : (
        <button
          onClick={(e) => { (e.currentTarget as HTMLElement).style.animation = 'shake 200ms'; setTimeout(() => { (e.currentTarget as HTMLElement).style.animation = ''; }, 200); onLogAttack(); }}
          className={`w-full py-6 border-2 ${card.completedSets + 1 === card.totalSets && combat ? 'border-red-500 animate-pulse' : colors.primary} bg-zinc-800 text-center transition-colors hover:bg-zinc-700`}
        >
          <span className={`text-base ${card.completedSets + 1 === card.totalSets && combat ? 'text-red-400' : colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {combat
              ? (card.completedSets + 1 === card.totalSets ? '⚔ FINISH' : card.completedSets === 0 ? '⚔ ATTACK' : '⚔⚔ STRIKE')
              : (card.completedSets + 1 === card.totalSets ? '✓ COMPLETE' : '▸ LOG SET')
            }
          </span>
        </button>
      )}

      {/* Secondary tools */}
      <div className="flex items-center justify-between pt-1">
        <button onClick={() => setShowSwap(!showSwap)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors" style={{ fontFamily: "var(--font-pixel), monospace" }}>⟲ SWAP</button>
        <button onClick={() => setShowPlate(!showPlate)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors" style={{ fontFamily: "var(--font-pixel), monospace" }}>⊞ PLATE</button>
        <button className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors" style={{ fontFamily: "var(--font-pixel), monospace" }}>◷ {isCompound ? '90' : '60'}s</button>
        <button className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors" style={{ fontFamily: "var(--font-pixel), monospace" }}>⋯</button>
      </div>

      {/* Plate calculator inline */}
      {showPlate && (
        <PlateCalcInline onUse={(w) => { onWeightChange(String(w)); setShowPlate(false); }} />
      )}

      {/* Swap picker */}
      {showSwap && (() => {
        const currentCat = card.catalogItem || catalog.find(c => c.id === card.exerciseId);
        const swapGroup = currentCat?.swap_group;
        const alternatives = swapGroup
          ? catalog.filter(c => c.swap_group === swapGroup && c.id !== card.exerciseId)
          : [];
        return (
          <div className="border border-zinc-700 bg-zinc-800 p-2 mt-1 max-h-32 overflow-y-auto">
            {alternatives.length > 0 ? alternatives.map(c => (
              <button key={c.id} onClick={() => { onSwap(c.id, c.name); setShowSwap(false); }} className="w-full text-left px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {c.name}
              </button>
            )) : (
              <p className="text-xs text-zinc-600 text-center py-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>NO ALTERNATIVES</p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
