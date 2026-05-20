'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

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
        // Clear the flag
        await supabase.from('users').update({ pending_level_up: null }).eq('id', userId);
      }
    };
    check();
  }, [userId]);

  if (!levelUp) return null;

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
      <div className="relative text-center px-8">
        <div className="text-6xl mb-6 animate-bounce">🎉</div>
        <div className="text-xs font-bold text-orange-400 uppercase tracking-[0.4em] mb-3">Level Up</div>
        <div className="text-7xl font-black italic text-white mb-2">{levelUp.level}</div>
        <div className="text-sm text-zinc-400 mb-8">
          {levelUp.source === 'workout' && 'Your training paid off!'}
          {levelUp.source === 'habit' && 'Consistency wins!'}
          {levelUp.source === 'nutrition' && 'Fueling the machine!'}
          {!['workout', 'habit', 'nutrition'].includes(levelUp.source) && 'Keep pushing!'}
        </div>
        <div className="text-[10px] text-zinc-600 uppercase tracking-wider animate-pulse">Tap to continue</div>
      </div>
    </div>
  );
}
