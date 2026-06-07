'use client';

import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';
import type { StarterQuest } from '@/hooks/useStarterQuests';

interface StarterQuestCardProps {
  quest: StarterQuest & { isComplete: boolean; isActive: boolean };
  onInlineAction?: () => void; // for quests that resolve inline (theme picker, path picker)
}

export default function StarterQuestCard({ quest, onInlineAction }: StarterQuestCardProps) {
  if (quest.isComplete) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
          <Check size={14} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold text-emerald-400">{quest.title}</span>
          {quest.xpReward > 0 && <span className="text-[10px] text-emerald-500/60 ml-2">+{quest.xpReward} XP</span>}
        </div>
        <span className="text-[10px] text-zinc-600">✓</span>
      </div>
    );
  }

  if (!quest.isActive) return null;

  const content = (
    <div className="relative overflow-hidden bg-gradient-to-br from-orange-500/10 via-zinc-900 to-zinc-900 border-2 border-orange-500/40 rounded-2xl p-5 shadow-lg shadow-orange-900/10">
      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Active Quest</span>
          {quest.xpReward > 0 && <span className="text-[10px] text-orange-500/60">+{quest.xpReward} XP</span>}
        </div>
        
        <div className="flex items-start gap-3 mt-3">
          <span className="text-2xl">{quest.emoji}</span>
          <div className="flex-1">
            <h3 className="text-lg font-black text-white">{quest.title}</h3>
            <p className="text-sm text-zinc-400 mt-1">{quest.description}</p>
          </div>
        </div>

        <div className="mt-4">
          {onInlineAction ? (
            <button
              onClick={onInlineAction}
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl text-sm uppercase tracking-wider hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
              {quest.cta} <ChevronRight size={16} />
            </button>
          ) : quest.ctaHref ? (
            <Link
              href={quest.ctaHref}
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-xl text-sm uppercase tracking-wider hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 block text-center"
            >
              {quest.cta} <ChevronRight size={16} />
            </Link>
          ) : null}
        </div>

        <div className="mt-3 text-[10px] text-zinc-600 text-center">
          Unlocks: {quest.unlocks}
        </div>
      </div>
    </div>
  );

  return content;
}

export function LockedFeatureOverlay({ questTitle, children, href = '/track' }: { questTitle: string; children: React.ReactNode; href?: string }) {
  return (
    <div className="relative">
      <div className="opacity-40 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Link href={href} className="bg-zinc-900/90 border border-zinc-700 rounded-lg px-3 py-1.5 flex items-center gap-2 hover:border-zinc-600 transition-colors">
          <span className="text-[10px]">🔒</span>
          <span className="text-[10px] text-zinc-400 font-bold">Tap to complete &quot;{questTitle}&quot;</span>
        </Link>
      </div>
    </div>
  );
}
