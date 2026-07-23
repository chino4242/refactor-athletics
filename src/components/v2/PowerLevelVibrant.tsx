"use client";

/**
 * PowerLevelVibrant v3 — Option A: Grid as the fill.
 * 
 * One unified card. The power level number and the bestiary grid
 * are the same surface. No separation. Your number IS your creatures.
 */

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import BestiaryRadar from './BestiaryRadar';

interface Exercise {
  name: string;
  exerciseId: string;
  level: number;
  expired: boolean;
}

interface VibrantProps {
  powerLevel: number;
  maxPossible: number;
  exercises: Exercise[];
  tierName: string;
  tierIndex: number;
  tierFloor: number;
  tierCeiling: number;
  nextTierName?: string;
  expiringExercises: { exerciseId: string; name: string; level: number; daysLeft: number }[];
  closestRankUps: { exerciseId: string; name: string; gap: string }[];
  recentPRs: { name: string; value: string; date: string }[];
  streak: number;
  todayXp: number;
  playerLevel?: { level: number; xp: number; xpForNext: number } | null;
  userPath: string;
  onPathSwitch?: () => void;
  onExerciseTap?: (exerciseId: string) => void;
}

const VIBRANT_ACCENTS: Record<string, { gradient: string; text: string; glow: string; softBg: string }> = {
  athlete: { gradient: 'from-orange-500 to-amber-400', text: 'text-orange-400', glow: 'shadow-[0_0_60px_rgba(249,115,22,0.12)]', softBg: 'bg-orange-500/[0.03]' },
  dragon: { gradient: 'from-red-500 to-orange-400', text: 'text-red-400', glow: 'shadow-[0_0_60px_rgba(239,68,68,0.12)]', softBg: 'bg-red-500/[0.03]' },
  samurai: { gradient: 'from-[#c084a8] to-[#e8a0b8]', text: 'text-[#e8a0b8]', glow: 'shadow-[0_0_60px_rgba(232,160,184,0.12)]', softBg: 'bg-pink-500/[0.03]' },
  viking: { gradient: 'from-sky-500 to-cyan-400', text: 'text-sky-300', glow: 'shadow-[0_0_60px_rgba(56,189,248,0.12)]', softBg: 'bg-sky-500/[0.03]' },
  dinosaur: { gradient: 'from-green-500 to-emerald-400', text: 'text-emerald-400', glow: 'shadow-[0_0_60px_rgba(16,185,129,0.12)]', softBg: 'bg-emerald-500/[0.03]' },
};

const LEVEL_STYLES: Record<number, { bg: string; border: string; text: string; glow: string }> = {
  0: { bg: 'bg-zinc-800/30', border: 'border-zinc-700/20', text: 'text-zinc-600', glow: '' },
  1: { bg: 'bg-zinc-700/20', border: 'border-zinc-500/30', text: 'text-zinc-300', glow: '' },
  2: { bg: 'bg-emerald-950/30', border: 'border-emerald-500/25', text: 'text-emerald-400', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.08)]' },
  3: { bg: 'bg-blue-950/30', border: 'border-blue-500/25', text: 'text-blue-400', glow: 'shadow-[0_0_8px_rgba(59,130,246,0.08)]' },
  4: { bg: 'bg-purple-950/30', border: 'border-purple-500/25', text: 'text-purple-400', glow: 'shadow-[0_0_10px_rgba(168,85,247,0.12)]' },
  5: { bg: 'bg-amber-950/30', border: 'border-amber-400/30', text: 'text-amber-400', glow: 'shadow-[0_0_14px_rgba(245,158,11,0.15)]' },
};

export default function PowerLevelVibrant({
  powerLevel,
  exercises,
  tierName,
  tierIndex,
  tierFloor,
  tierCeiling,
  nextTierName,
  expiringExercises,
  closestRankUps,
  recentPRs,
  streak,
  todayXp,
  playerLevel,
  userPath,
  onPathSwitch,
  onExerciseTap,
}: VibrantProps) {
  const { currentTheme } = useTheme();
  const accent = VIBRANT_ACCENTS[currentTheme] || VIBRANT_ACCENTS.athlete;
  const progress = ((powerLevel - tierFloor) / (tierCeiling - tierFloor)) * 100;
  const toNext = tierCeiling - powerLevel;
  const alliedCount = exercises.filter(e => e.level > 0 && !e.expired).length;
  const [showRadar, setShowRadar] = useState(false);

  const accentHex = currentTheme === 'dragon' ? '#ef4444' :
    currentTheme === 'samurai' ? '#e8a0b8' :
    currentTheme === 'viking' ? '#38bdf8' :
    currentTheme === 'dinosaur' ? '#22c55e' : '#f97316';

  return (
    <div className={`rounded-3xl ${accent.softBg} border border-zinc-700/20 ${accent.glow} overflow-hidden`}>
      
      {/* === TOP GRADIENT ACCENT === */}
      <svg viewBox="0 0 400 12" className="w-full h-3" preserveAspectRatio="none">
        <path d="M0 6 Q20 2 60 6 Q100 10 150 5 Q200 2 250 7 Q300 10 350 4 Q380 2 400 6" stroke="url(#plBrushGrad)" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7" />
        <defs>
          <linearGradient id="plBrushGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={accentHex === '#e8a0b8' ? '#c084a8' : accentHex} />
            <stop offset="100%" stopColor={accentHex} />
          </linearGradient>
        </defs>
      </svg>

      {/* === THE SINGLE CARD === */}
      <div className="p-5">

        {/* Context bar: streak + level + today XP */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <span className="text-sm font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg">
                🔥 {streak}
              </span>
            )}
            {playerLevel && (
              <span className="text-sm font-bold text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-lg">
                Lv {playerLevel.level}
              </span>
            )}
          </div>
          {todayXp > 0 && (
            <span className={`text-sm font-bold ${accent.text} bg-zinc-800/60 px-2.5 py-1 rounded-lg`}>
              +{todayXp} XP
            </span>
          )}
        </div>

        {/* Power Level — the hero number */}
        <div className="text-center mb-5">
          {currentTheme !== 'athlete' && (
            <img
              src={`/avatars/${currentTheme}/male_t${tierIndex}.png`}
              alt={tierName}
              className="w-20 h-20 mx-auto mb-2"
              style={{ imageRendering: 'pixelated' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            Power Level
          </p>
          <p className={`text-7xl font-black ${accent.text} tracking-tighter leading-none mt-1`}>
            {powerLevel}
          </p>
          <p className="text-base font-bold text-zinc-300 mt-1.5">
            {tierName}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-zinc-500 mb-1.5 font-medium">
            <span>{powerLevel - tierFloor} / {tierCeiling - tierFloor}</span>
            {nextTierName && <span>{toNext} to {nextTierName}</span>}
          </div>
          <div className="h-3 bg-zinc-900 rounded-full overflow-hidden ring-1 ring-zinc-800">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${accent.gradient} transition-all duration-700`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Path info */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 font-medium">
            <span className="uppercase">{userPath}</span> path · 8 core + 4 specialty
          </p>
          {onPathSwitch && (
            <button
              onClick={(e) => { e.stopPropagation(); onPathSwitch(); }}
              className={`text-xs font-bold ${accent.text} bg-zinc-800/80 px-2.5 py-1 rounded-lg hover:bg-zinc-700 transition-colors`}
            >
              Switch
            </button>
          )}
        </div>

        {/* === THE GRID — This IS your power level === */}
        <div className="mb-5">
          {/* Radar toggle */}
          <div className="flex items-center justify-between mb-3 mt-4">
            <p className="text-sm font-bold text-zinc-300">
              {currentTheme === 'athlete' ? 'Your Roster' : 'Your Bestiary'}
            </p>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${accent.text}`}>{alliedCount}/{exercises.length}</span>
              <button
                onClick={() => setShowRadar(!showRadar)}
                className={`text-xs px-2 py-1 rounded-lg transition-colors ${showRadar ? accent.text + ' bg-zinc-800' : 'text-zinc-500 bg-zinc-800/50 hover:text-zinc-300'}`}
              >
                {showRadar ? '✕' : '◈'}
              </button>
            </div>
          </div>

          {/* Radar chart (toggled) */}
          {showRadar && (
            <div className="py-2">
              <BestiaryRadar exercises={exercises} accentColor={accentHex} />
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            {exercises.map(ex => {
              const ls = LEVEL_STYLES[ex.level] || LEVEL_STYLES[0];
              const state = ex.level === 0 ? 'unmet' : ex.expired ? 'dormant' : 'allied';
              const normalized = ex.exerciseId.replace(/^(barbell|dumbbell|smith_machine|cable|machine)_/, '');
              const spriteTier = ex.level >= 4 ? 2 : ex.level >= 2 ? 1 : 0;
              const spriteSrc = `/enemies/${currentTheme}/${normalized}_t${spriteTier}.png`;
              const isExpiring = expiringExercises.some(e => e.exerciseId === ex.exerciseId);
              const isClose = closestRankUps.some(r => r.exerciseId === ex.exerciseId);

              return (
                <div
                  key={ex.exerciseId}
                  onClick={() => onExerciseTap?.(ex.exerciseId)}
                  className="flex flex-col items-center gap-1 cursor-pointer active:scale-95 transition-transform"
                >
                  <div className={`relative w-[72px] h-[72px] rounded-2xl border ${ls.border} ${ls.bg} ${ls.glow} ${state === 'dormant' ? 'opacity-35 grayscale-[60%]' : state === 'unmet' ? 'opacity-15' : ''} flex items-center justify-center overflow-hidden transition-all duration-300`}>
                    {/* Status indicators on tile */}
                    {isExpiring && state === 'allied' && (
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 to-orange-400 rounded-t-2xl" />
                    )}
                    {isClose && !isExpiring && state === 'allied' && (
                      <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${accent.gradient} rounded-t-2xl opacity-60`} />
                    )}
                    {/* Sprite */}
                    {currentTheme !== 'athlete' ? (
                      <img src={spriteSrc} alt="" className="w-12 h-12" style={{ imageRendering: 'pixelated' }} onError={(e) => { (e.target as HTMLImageElement).src = `/themes/${currentTheme}/v2/level${ex.level}.png`; }} />
                    ) : (
                      <img src={`/themes/${currentTheme}/v2/level${ex.level}.png`} alt="" className="w-10 h-10" style={{ imageRendering: 'pixelated' }} />
                    )}
                    {/* Level badge */}
                    {ex.level > 0 && !ex.expired && (
                      <span className={`absolute bottom-1 right-1.5 text-sm font-black ${ls.text}`}>
                        {ex.level}
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] text-center leading-tight font-medium ${state === 'allied' ? 'text-zinc-300' : 'text-zinc-600'} truncate max-w-[72px]`}>
                    {ex.name.split(' ').slice(0, 2).join(' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* === ACTION ITEMS — what needs attention === */}
        {(expiringExercises.length > 0 || closestRankUps.length > 0 || recentPRs.length > 0) && (
          <div className="pt-4 border-t border-zinc-800/40 space-y-2">
            {expiringExercises.slice(0, 2).map(ex => (
              <div key={ex.exerciseId} className="flex items-center justify-between py-1">
                <span className="text-sm text-zinc-200">
                  <span className="text-amber-400 mr-2">⚠</span>{ex.name}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${ex.daysLeft <= 3 ? 'text-red-400 bg-red-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                  {ex.daysLeft}d left
                </span>
              </div>
            ))}
            {closestRankUps.slice(0, 2).map(ex => (
              <div key={ex.exerciseId} className="flex items-center justify-between py-1">
                <span className="text-sm text-zinc-200">
                  <span className={`${accent.text} mr-2`}>↑</span>{ex.name}
                </span>
                <span className={`text-xs font-bold ${accent.text} bg-zinc-800/80 px-2 py-0.5 rounded-md`}>
                  {ex.gap}
                </span>
              </div>
            ))}
            {recentPRs.slice(0, 1).map(pr => (
              <div key={pr.name} className="flex items-center justify-between py-1">
                <span className="text-sm text-zinc-200">
                  <span className="text-amber-300 mr-2">★</span>{pr.name}
                </span>
                <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md">
                  PR · {pr.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
