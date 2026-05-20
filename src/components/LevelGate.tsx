'use client';

import { getLevelRequirement } from '@/data/level-rewards';
import { Lock } from 'lucide-react';

interface LevelGateProps {
  featureId: string;
  playerLevel: number;
  children: React.ReactNode;
  inline?: boolean;
}

/** Gates content behind a player level requirement. Shows unlock message if not met. */
export default function LevelGate({ featureId, playerLevel, children, inline }: LevelGateProps) {
  const required = getLevelRequirement(featureId);
  if (!required || playerLevel >= required) return <>{children}</>;

  if (inline) {
    return (
      <div className="relative">
        <div className="opacity-40 pointer-events-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-zinc-900/90 border border-zinc-700 rounded-lg px-3 py-2 flex items-center gap-2">
            <Lock size={12} className="text-zinc-500" />
            <span className="text-[10px] font-bold text-zinc-400">Unlocks at Level {required}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-8 px-4">
      <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
        <Lock size={20} className="text-zinc-500" />
      </div>
      <p className="text-sm font-bold text-white mb-1">Unlocks at Level {required}</p>
      <p className="text-xs text-zinc-500">Keep training and building habits to reach Level {required}</p>
      <div className="mt-3 h-1.5 w-32 mx-auto bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-orange-500/70 rounded-full" style={{ width: `${Math.min(100, (playerLevel / required) * 100)}%` }} />
      </div>
      <p className="text-[10px] text-zinc-600 mt-1">Level {playerLevel} / {required}</p>
    </div>
  );
}
