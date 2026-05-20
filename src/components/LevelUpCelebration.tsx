'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getRewardForLevel } from '@/data/level-rewards';

interface LevelUpCelebrationProps {
  userId: string;
}

export default function LevelUpCelebration({ userId }: LevelUpCelebrationProps) {
  const [levelUp, setLevelUp] = useState<{ level: number; source: string } | null>(null);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('users').select('pending_level_up').eq('id', userId).single();
      if (data?.pending_level_up) {
        setLevelUp(data.pending_level_up);
        await supabase.from('users').update({ pending_level_up: null }).eq('id', userId);
      }
    };
    check();
  }, [userId]);

  if (!levelUp) return null;

  const reward = getRewardForLevel(levelUp.level);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in" onClick={() => setLevelUp(null)}>
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="absolute w-2 h-2 rounded-full animate-confetti" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 20}%`,
            backgroundColor: ['#f97316', '#ef4444', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'][i % 7],
            animationDelay: `${Math.random() * 1.5}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }} />
        ))}
      </div>

      {/* Content */}
      <div className="relative text-center px-8 max-w-sm">
        <div className="text-6xl mb-4 animate-bounce">⚡</div>
        <div className="text-xs font-bold text-orange-400 uppercase tracking-[0.4em] mb-2">Level Up</div>
        <div className="text-7xl font-black italic text-white mb-2">{levelUp.level}</div>

        {reward?.title && (
          <div className="text-lg font-black text-orange-400 uppercase tracking-wider mb-3">"{reward.title}"</div>
        )}

        {reward?.lore_text && (
          <p className="text-sm text-zinc-400 italic mb-6">"{reward.lore_text}"</p>
        )}

        {reward?.unlock_label && !reward.version_gate && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 mb-6">
            <div className="text-[10px] text-orange-400 uppercase tracking-wider font-bold mb-1">New Unlock</div>
            <div className="text-sm font-bold text-white">{reward.unlock_label}</div>
          </div>
        )}

        {reward?.unlock_label && reward.version_gate && (
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3 mb-6">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Coming in {reward.version_gate.toUpperCase()}</div>
            <div className="text-sm font-medium text-zinc-400">🔒 {reward.unlock_label}</div>
          </div>
        )}

        <div className="text-[10px] text-zinc-600 uppercase tracking-wider animate-pulse">Tap to continue</div>
      </div>
    </div>
  );
}
