'use client';

import { CheckCircle } from 'lucide-react';

interface MissionHubProps {
  workoutData: any[];
  sections: any[];
  completedIndices: number[];
  skippedIndices: number[];
  sectionCompleteIdx: number | null;
  selectedDate: string | null;
  progressKey: string;
  onStartBlock: (blockIndex: number) => void;
  onDismissSection: () => void;
  onFinishWorkout: () => void;
}

export default function MissionHub({
  workoutData,
  sections,
  completedIndices,
  skippedIndices,
  sectionCompleteIdx,
  selectedDate,
  progressKey,
  onStartBlock,
  onDismissSection,
  onFinishWorkout,
}: MissionHubProps) {
  const totalBlocks = workoutData.length;
  const completedCount = completedIndices.length;
  const overallProgress = Math.round((completedCount / totalBlocks) * 100) || 0;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Section Complete Overlay */}
      {sectionCompleteIdx !== null && sections[sectionCompleteIdx] && (() => {
        const section = sections[sectionCompleteIdx];
        const sectionXp = section.indices.reduce((sum: number, i: number) => sum + (workoutData[i]?.xp_value || 0), 0);
        const allSectionsDone = sections.every((s: any) => s.indices.every((i: number) => completedIndices.includes(i) || skippedIndices.includes(i)));
        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full text-center">
              <div className="text-3xl mb-2">✅</div>
              <h2 className="text-lg font-black text-white mb-1">{section.name} Complete</h2>
              <p className="text-base text-zinc-400 mb-4">+{sectionXp} XP earned</p>
              {allSectionsDone ? (
                <button
                  onClick={onFinishWorkout}
                  className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold uppercase tracking-wider text-sm rounded-xl active:scale-[0.98] transition"
                >
                  View Workout Summary
                </button>
              ) : (
                <button
                  onClick={onDismissSection}
                  className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold uppercase tracking-wider text-sm rounded-xl active:scale-[0.98] transition"
                >
                  Continue →
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <div className="mb-5 px-1">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-0.5">Today&apos;s Workout</h2>
            <h1 className="text-xl font-black text-white">{workoutData[0]?.name?.split(' - ')[0] || selectedDate || "Today"}</h1>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-white">{overallProgress}%</span>
            <p className="text-xs text-zinc-500">{completedCount} of {totalBlocks} blocks done</p>
          </div>
        </div>
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500 rounded-full" style={{ width: `${overallProgress}%` }} />
        </div>
        {/* Next up CTA */}
        {completedCount < totalBlocks && (() => {
          const nextIdx = workoutData.findIndex((_: any, i: number) => !completedIndices.includes(i) && !skippedIndices.includes(i));
          if (nextIdx < 0) return null;
          const next = workoutData[nextIdx];
          return (
            <button
              onClick={() => onStartBlock(nextIdx)}
              className="mt-3 w-full bg-orange-600 hover:bg-orange-500 text-white rounded-xl px-4 py-3 flex items-center justify-between transition-colors"
            >
              <div className="text-left">
                <span className="text-xs text-white/60 uppercase font-bold">Next Up</span>
                <p className="text-base font-bold">{(next.name || next.type).replace(/^\d+\.\s*/, '')}</p>
              </div>
              <span className="text-base font-bold">Start →</span>
            </button>
          );
        })()}
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {sections.map((section: any, idx: number) => {
          const sectionDoneCount = section.indices.filter((i: number) => completedIndices.includes(i)).length;
          const sectionSkippedCount = section.indices.filter((i: number) => skippedIndices.includes(i)).length;
          const allDone = sectionDoneCount + sectionSkippedCount === section.count;

          const sectionXp = allDone ? section.indices.reduce((sum: number, i: number) => {
            return sum + (workoutData[i]?.xp_value || 0);
          }, 0) : 0;

          return (
            <div key={idx} className={`rounded-xl border transition-all overflow-hidden ${
              allDone ? 'bg-emerald-500/5 border-emerald-500/20' :
              'bg-zinc-900/60 border-zinc-800/50'
            }`}>
              <div className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  allDone ? 'bg-emerald-500/15' : 'bg-zinc-800'
                }`}>
                  {allDone
                    ? <CheckCircle size={18} className="text-emerald-400" />
                    : <span className="text-sm font-bold text-zinc-400">{idx + 1}</span>
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className={`text-base font-bold ${allDone ? 'text-emerald-400' : 'text-white'}`}>
                    {section.name}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {allDone ? (
                      <span className="text-emerald-400">Complete · {sectionXp} XP earned</span>
                    ) : (
                      <>
                        {sectionDoneCount}/{section.count} blocks
                        {(() => {
                          const sectionBlocks = section.indices.map((i: number) => workoutData[i]);
                          const estMins = sectionBlocks.reduce((s: number, b: any) => {
                            if (b.type === 'timer' && b.intervals) return s + b.intervals.reduce((t: number, iv: any) => t + (iv.seconds || 0), 0) / 60;
                            if (b.type === 'checklist_exercise') return s + (b.sets || 3) * ((b.rest_seconds || 60) + 30) / 60;
                            if (b.type === 'superset') return s + (b.sets || 3) * ((b.rest_seconds || 60) + 45) / 60;
                            return s;
                          }, 0);
                          return <span> · ~{Math.round(estMins)} min</span>;
                        })()}
                      </>
                    )}
                  </p>
                  {!allDone && section.preview.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {section.preview.map((name: string, i: number) => (
                        <span key={i} className="text-xs text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded">{name}</span>
                      ))}
                    </div>
                  )}
                </div>

                {!allDone && (
                  <button
                    onClick={() => {
                      const firstIncomplete = section.indices.find((i: number) => !completedIndices.includes(i) && !skippedIndices.includes(i));
                      if (firstIncomplete !== undefined) onStartBlock(firstIncomplete);
                    }}
                    className="shrink-0 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg active:scale-95 transition shadow-lg shadow-orange-900/20"
                  >
                    {sectionDoneCount > 0 ? 'Resume' : 'Start'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
