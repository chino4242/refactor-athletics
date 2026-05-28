'use client';

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/data/themes';

interface BlockCompleteOverlayProps {
  blockResults: any[];
  completedCount: number;
  totalBlocks: number;
  getThemedRankName: (level: number) => string;
  onContinue: () => void;
  onStop: () => void;
}

export default function BlockCompleteOverlay({
  blockResults,
  completedCount,
  totalBlocks,
  getThemedRankName,
  onContinue,
  onStop,
}: BlockCompleteOverlayProps) {
  const { currentTheme } = useTheme();
  const totalXp = blockResults.reduce((sum: number, r: any) => sum + (r.xp_earned || 0), 0);
  const progressPct = Math.round((completedCount / totalBlocks) * 100);
  const levelUps = blockResults.filter((r: any) => r.level > 0 && r.level > (r.previous_level || 0));
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);

  const rankUpMessages: Record<string, (name: string) => string> = {
    athlete: (n) => `Promoted to ${n}!`,
    dragon: (n) => `You've evolved to ${n}!`,
    samurai: (n) => `You have ascended to ${n}!`,
    dinosaur: (n) => `You've evolved to ${n}!`,
    viking: (n) => `Hail! You are now ${n}!`,
  };
  const blockCompleteMessages: Record<string, string> = {
    athlete: 'Another rep in the bank.',
    dragon: 'The forge grows hotter.',
    samurai: 'One step closer to mastery.',
    dinosaur: 'The hunt was successful.',
    viking: 'Another battle won.',
  };

  // Full-screen rank-up celebration (shows first, user taps to dismiss)
  if (levelUps.length > 0 && !celebrationDismissed) {
    const rankUp = levelUps[0];
    import('@/utils/haptics').then(m => m.haptic('success'));
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center text-center px-4 min-h-[70vh] relative overflow-hidden" onClick={() => setCelebrationDismissed(true)}>
        {/* Confetti */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="absolute w-2 h-2 rounded-full animate-confetti" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 30}%`,
              backgroundColor: ['#f97316', '#ef4444', '#eab308', '#22c55e', '#3b82f6', '#a855f7'][i % 6],
              animationDelay: `${Math.random() * 1}s`,
              animationDuration: `${1.5 + Math.random() * 1.5}s`,
            }} />
          ))}
        </div>

        {/* Glow */}
        <div className="absolute inset-0 bg-gradient-radial from-orange-500/10 via-transparent to-transparent pointer-events-none" />

        {/* Rank image — hero reveal */}
        {(() => {
          const theme = THEMES[currentTheme] || THEMES.athlete;
          const img = theme.ranks?.[`level${levelUps[0].level}`]?.image;
          if (!img) return null;
          return <img src={img} alt="" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 object-contain opacity-50 pointer-events-none" />;
        })()}

        {/* Content */}
        <div className="text-6xl mb-4 animate-bounce">⚡</div>
        <div className="text-xs font-bold text-orange-400 uppercase tracking-[0.3em] mb-2">Rank Up</div>
        <div className="text-2xl font-black text-white mb-6">{(rankUpMessages[currentTheme] || rankUpMessages.athlete)(getThemedRankName(rankUp.level))}</div>

        <div className="flex items-center gap-4 mb-8">
          <div className="text-center">
            <div className="text-xs text-zinc-500 uppercase mb-1">Was</div>
            <div className="text-lg font-bold text-zinc-400">{getThemedRankName(rankUp.previous_level || 0)}</div>
          </div>
          <div className="text-3xl text-orange-500 animate-pulse">→</div>
          <div className="text-center">
            <div className="text-xs text-orange-400 uppercase mb-1">Now</div>
            <div className="text-2xl font-black text-orange-400">{getThemedRankName(rankUp.level)}</div>
          </div>
        </div>

        {rankUp.best_set && (
          <div className="text-sm text-zinc-400 mb-2">{rankUp.best_set}</div>
        )}
        {rankUp.e1rm && (
          <div className="text-xs text-zinc-500">e1RM: {rankUp.e1rm} lbs</div>
        )}

        <div className="mt-8 text-[10px] text-zinc-600 uppercase tracking-wider animate-pulse">Tap to continue</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center text-center px-4 relative">
      {/* Current rank image — subtle background */}
      {(() => {
        const theme = THEMES[currentTheme] || THEMES.athlete;
        const highestLevel = Math.max(...blockResults.map((r: any) => r.level || 0), 0);
        const img = theme.ranks?.[`level${highestLevel}`]?.image || theme.ranks?.level0?.image;
        if (!img) return null;
        return <img src={img} alt="" className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-24 object-contain opacity-20 pointer-events-none" />;
      })()}

      {/* Progress ring */}
      <div className="relative w-20 h-20 mb-4">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="#1c1c1e" strokeWidth="5" />
          <circle cx="40" cy="40" r="34" fill="none" stroke="url(#xp-grad)" strokeWidth="5"
            strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPct / 100)}`}
            strokeLinecap="round" className="transition-all duration-700" />
          <defs>
            <linearGradient id="xp-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black text-orange-400">+{totalXp}</span>
        </div>
      </div>

      <h1 className="text-xl font-black text-white mb-1">Block Complete</h1>
      <p className="text-[11px] text-zinc-400 italic mb-1">{blockCompleteMessages[currentTheme] || blockCompleteMessages.athlete}</p>
      <p className="text-xs text-zinc-500 mb-5">{completedCount} of {totalBlocks} blocks done</p>

      <div className="w-full space-y-1.5 mb-6">
        {blockResults.map((r: any, i: number) => (
          <div key={i} className="flex items-center justify-between bg-zinc-800/60 rounded-xl p-3 border border-zinc-700/30">
            <div className="text-left min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {r.name}
                {r.isPR && <span className="ml-1.5 text-yellow-400 text-[10px]">🏆 PR</span>}
              </p>
              {r.best_set ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white font-medium">{r.best_set}</span>
                  {r.e1rm && <span className="text-[10px] text-zinc-500">e1RM: {r.e1rm} lbs</span>}
                </div>
              ) : (
                <p className="text-[11px] text-zinc-500">{r.value}</p>
              )}
              {r.next_threshold_lbs && r.next_rank_name && (
                <p className="text-[10px] text-orange-400 font-semibold mt-0.5">🔥 {r.next_threshold_lbs} lbs to {getThemedRankName((r.level || 0) + 1)}</p>
              )}
            </div>
            {r.hasStandards && r.level > 0 ? (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ml-2 ${
                r.level >= 4 ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20' :
                r.level >= 2 ? 'bg-zinc-700/80 text-zinc-300 border border-zinc-600/30' :
                'bg-zinc-800 text-zinc-400 border border-zinc-700/30'
              }`}>
                {getThemedRankName(r.level || 0)}
              </span>
            ) : (
              <span className="text-[10px] text-zinc-600 shrink-0 ml-2">+{r.xp_earned} XP</span>
            )}
          </div>
        ))}
      </div>

      <div className="w-full space-y-2">
        <button
          onClick={onContinue}
          className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold uppercase tracking-wider text-sm rounded-xl hover:from-orange-500 hover:to-red-500 transition-all active:scale-[0.98] shadow-lg shadow-orange-600/20"
        >
          Next Exercise →
        </button>
        <button
          onClick={onStop}
          className="w-full py-3 text-zinc-500 font-medium text-sm rounded-xl hover:text-white transition"
        >
          Stop Workout
        </button>
      </div>
    </div>
  );
}
