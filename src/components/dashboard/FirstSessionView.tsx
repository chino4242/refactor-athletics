'use client';

import Link from 'next/link';
import { useExperienceMode } from '@/context/ExperienceModeContext';

interface FirstSessionViewProps {
  userName?: string;
  todayWorkoutName?: string;
  todayWorkoutPreview?: string[];
}

export default function FirstSessionView({ userName, todayWorkoutName, todayWorkoutPreview }: FirstSessionViewProps) {
  const { isClassic } = useExperienceMode();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-5">🏋️</div>
      <h1 className="text-2xl font-black text-white mb-2">
        {userName ? `Let's go, ${userName}` : "Let's go"}
      </h1>
      <p className="text-sm text-zinc-400 mb-2 max-w-xs">
        {isClassic
          ? "Log your first lift to establish your baseline."
          : "Log one exercise to discover your rank and start building your Power Level."
        }
      </p>
      <p className="text-[11px] text-zinc-600 mb-8 max-w-xs">
        Your rank is based on how much you can lift relative to your age and weight. Even one set counts.
      </p>

      <Link
        href="/train"
        className="w-full max-w-sm bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl p-6 block shadow-lg shadow-orange-900/20 hover:scale-[1.02] transition-transform text-center"
      >
        {todayWorkoutName ? (
          <>
            <div className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-1">Today&apos;s Workout</div>
            <div className="text-lg font-black">{todayWorkoutName}</div>
            {todayWorkoutPreview && todayWorkoutPreview.length > 0 && (
              <div className="text-xs text-white/70 mt-2">{todayWorkoutPreview.slice(0, 3).join(' • ')}</div>
            )}
            <div className="mt-3 text-sm font-bold uppercase tracking-wider">Start Workout →</div>
          </>
        ) : (
          <div className="text-lg font-black">Start Your First Workout →</div>
        )}
      </Link>

      <button
        onClick={() => { localStorage.setItem('first_session_dismissed', 'true'); window.location.reload(); }}
        className="mt-6 text-zinc-600 text-xs font-bold uppercase tracking-widest py-3 hover:text-zinc-400 transition"
      >
        Skip — I&apos;ll explore first
      </button>
    </div>
  );
}
