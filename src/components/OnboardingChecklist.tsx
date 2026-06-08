'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import type { StarterQuest } from '@/hooks/useStarterQuests';

interface OnboardingChecklistProps {
  quests: (StarterQuest & { isComplete: boolean; isActive: boolean })[];
  allComplete: boolean;
}

export default function OnboardingChecklist({ quests, allComplete }: OnboardingChecklistProps) {
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !localStorage.getItem('onboarding_collapsed');
  });

  if (allComplete) return null;

  const completedCount = quests.filter(q => q.isComplete).length;

  const collapse = () => {
    setExpanded(false);
    localStorage.setItem('onboarding_collapsed', 'true');
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => expanded ? collapse() : setExpanded(true)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🚀</span>
          <span className="text-xs font-bold text-white">Getting Started</span>
          <span className="text-[10px] font-bold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
            {completedCount}/{quests.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${(completedCount / quests.length) * 100}%` }} />
          </div>
          {expanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-1.5">
          {quests.map(quest => (
            <div key={quest.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${quest.isComplete ? 'bg-zinc-800/30' : 'bg-zinc-800/60'}`}>
              {quest.isComplete ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-zinc-600 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium ${quest.isComplete ? 'text-zinc-500 line-through' : 'text-white'}`}>
                  {quest.emoji} {quest.title}
                </div>
                {!quest.isComplete && (
                  <div className="text-[10px] text-zinc-500">{quest.description}</div>
                )}
              </div>
              {!quest.isComplete && quest.ctaHref && (
                <Link href={quest.ctaHref} className="text-[10px] font-bold text-orange-400 shrink-0">
                  {quest.cta} →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
