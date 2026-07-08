'use client';

import { LEVEL_REWARDS, type LevelReward } from '@/data/level-rewards';
import { Check, Lock, Sparkles } from 'lucide-react';

interface RewardsTrackProps {
  playerLevel: number;
}

export default function RewardsTrack({ playerLevel }: RewardsTrackProps) {
  // Only show levels that have titles, unlocks, or previews (skip filler levels)
  const milestones = LEVEL_REWARDS.filter(r => r.title || r.unlock_type);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Sparkles size={14} className="text-orange-500" /> Rewards Track
      </h3>

      <div className="space-y-0">
        {milestones.map((reward, i) => {
          const earned = playerLevel >= reward.level;
          const isNext = !earned && (i === 0 || playerLevel >= milestones[i - 1].level);
          const isFuture = !earned && !isNext;

          return (
            <div key={reward.level} className="flex gap-3 items-start">
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center shrink-0 w-6">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  earned ? 'bg-orange-500' : isNext ? 'bg-zinc-700 border-2 border-orange-500 animate-pulse' : 'bg-zinc-800 border border-zinc-700'
                }`}>
                  {earned ? <Check size={10} className="text-white" /> : <Lock size={8} className="text-zinc-500" />}
                </div>
                {i < milestones.length - 1 && (
                  <div className={`w-[2px] h-8 ${earned ? 'bg-orange-500/50' : 'bg-zinc-800'}`} />
                )}
              </div>

              {/* Content */}
              <div className={`pb-4 flex-1 min-w-0 ${isFuture ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${earned ? 'text-orange-400' : isNext ? 'text-white' : 'text-zinc-500'}`}>
                    Lv {reward.level}
                  </span>
                  {reward.title && (
                    <span className={`text-xs font-black uppercase ${earned ? 'text-white' : 'text-zinc-400'}`}>
                      {reward.title}
                    </span>
                  )}
                </div>
                {reward.unlock_label && (
                  <div className={`text-xs mt-0.5 ${earned ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {reward.version_gate ? `🔒 ${reward.unlock_label} (${reward.version_gate.toUpperCase()})` : (earned ? `✓ ${reward.unlock_label}` : reward.unlock_label)}
                  </div>
                )}
                {isNext && (
                  <div className="mt-1.5 h-1 w-full max-w-[120px] bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(playerLevel / reward.level) * 100}%` }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
