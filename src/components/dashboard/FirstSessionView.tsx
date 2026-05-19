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
      <div className="text-4xl mb-4">👋</div>
      <h1 className="text-2xl font-black text-white mb-2">
        {userName ? `Welcome, ${userName}!` : 'Welcome!'}
      </h1>
      <p className="text-sm text-zinc-400 mb-8 max-w-xs">
        {isClassic
          ? "Your first workout is ready. Let's establish your baseline."
          : "Your journey begins now. Complete your first workout to earn XP and discover your rank."
        }
      </p>

      {/* Primary CTA: Start Workout */}
      {todayWorkoutName && (
        <Link
          href="/train"
          className="w-full max-w-sm bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl p-5 mb-4 block shadow-lg shadow-orange-900/20 hover:scale-[1.02] transition-transform"
        >
          <div className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-1">Today&apos;s Workout</div>
          <div className="text-lg font-black">{todayWorkoutName}</div>
          {todayWorkoutPreview && todayWorkoutPreview.length > 0 && (
            <div className="text-xs text-white/70 mt-2">
              {todayWorkoutPreview.slice(0, 3).join(' • ')}
            </div>
          )}
          <div className="mt-3 text-sm font-bold uppercase tracking-wider">Start Workout →</div>
        </Link>
      )}

      {!todayWorkoutName && (
        <Link
          href="/train"
          className="w-full max-w-sm bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-2xl p-5 mb-4 block shadow-lg shadow-orange-900/20 hover:scale-[1.02] transition-transform text-center"
        >
          <div className="text-lg font-black">Start Your First Workout →</div>
        </Link>
      )}

      {/* Secondary actions */}
      <div className="w-full max-w-sm space-y-2">
        <Link
          href="/track"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between hover:border-zinc-700 transition block"
        >
          <div className="text-left">
            <div className="text-sm font-bold text-white">Log what I ate today</div>
            <div className="text-[11px] text-zinc-500">Track macros to hit your nutrition goals</div>
          </div>
          <span className="text-zinc-600">→</span>
        </Link>

        <button
          onClick={() => { localStorage.setItem('first_session_dismissed', 'true'); window.location.reload(); }}
          className="w-full text-zinc-600 text-xs font-bold uppercase tracking-widest py-3 hover:text-zinc-400 transition"
        >
          Explore the app
        </button>
      </div>
    </div>
  );
}
