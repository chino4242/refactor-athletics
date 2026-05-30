"use client";

import { useState } from 'react';
import { Info, ChevronRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/data/themes';
import { useExperienceMode } from '@/context/ExperienceModeContext';
import ChecklistView from './ChecklistView';
import ProtocolBriefing from './ProtocolBriefing';
import WorkoutReport from './WorkoutReport';
import EngineSelector from './EngineSelector';
import RecoverySelector from './RecoverySelector';

// Extracted sub-components
import ExerciseView from './active-workout/ExerciseView';
import TimerView from './active-workout/TimerView';
import SupersetView from './active-workout/SupersetView';
import BlockCompleteOverlay from './active-workout/BlockCompleteOverlay';
import MissionHub from './active-workout/MissionHub';
import { useWorkoutSession } from './active-workout/useWorkoutSession';
import FlexibleWorkoutView from './active-workout/FlexibleWorkoutView';

interface ActiveWorkoutProps {
  userId: string;
  onLogComplete: () => void;
  initialDate?: string | null;
  sectionFilter?: 'strength' | 'cardio' | 'core';
}

export default function ActiveWorkout({ userId, onLogComplete, initialDate, sectionFilter }: ActiveWorkoutProps) {
  const session = useWorkoutSession({ userId, onLogComplete, initialDate, sectionFilter });
  const [workoutMode, setWorkoutMode] = useState<'guided' | 'flexible'>('guided');

  // Theme-aware rank names
  const { currentTheme } = useTheme();
  const { isClassic } = useExperienceMode();
  const theme = THEMES[currentTheme] || THEMES.athlete;
  const getThemedRankName = (level: number): string => {
    if (isClassic) {
      const classicNames = ['Unranked', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6'];
      return classicNames[level] || `Level ${level}`;
    }
    const rankKey = `level${level}`;
    const themed = theme.ranks?.[rankKey]?.name;
    if (themed) return themed.replace(/^Level \d+:\s*/, '');
    const defaults = ['Peasant', 'Rookie', 'Amateur', 'Contender', 'Pro', 'Champion', 'Legend'];
    return defaults[level] || 'Unknown';
  };

  const {
    blockIndex, setBlockIndex,
    isComplete, setIsComplete,
    workoutData, setWorkoutData,
    isLoading,
    sessionId,
    viewMode, setViewMode,
    completedIndices,
    skippedIndices,
    showLibrary, setShowLibrary,
    workoutDates,
    selectedDate,
    weeklySchedule,
    activeTab, setActiveTab,
    fullHistory,
    catalog,
    userProfile,
    blockResults,
    showBlockComplete,
    sectionCompleteIdx, setSectionCompleteIdx,
    showEndConfirm, setShowEndConfirm,
    engineChoice, setEngineChoice,
    swapTarget, setSwapTarget,
    exerciseSwaps, setExerciseSwaps,
    briefingData, setBriefingData,
    briefingDate,
    progressKey,
    currentBlock,
    sections,
    engineRecommendation,
    handleBlockComplete,
    handleContinueAfterBlock,
    handleStopAfterBlock,
    handlePreviewWorkout,
    handleStartBriefing,
    generateZone2Block,
  } = session;

  // --- Render ---

  if (isLoading) {
    return (
      <div className="text-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-zinc-500 font-medium">Loading Workflow...</p>
      </div>
    );
  }

  if (briefingData) {
    return (
      <ProtocolBriefing
        workout={briefingData}
        date={briefingDate}
        onStart={handleStartBriefing}
        onCancel={() => setBriefingData(null)}
      />
    );
  }

  if (showBlockComplete && blockResults) {
    return (
      <BlockCompleteOverlay
        blockResults={blockResults}
        completedCount={completedIndices.length}
        totalBlocks={workoutData.length}
        getThemedRankName={getThemedRankName}
        onContinue={handleContinueAfterBlock}
        onStop={handleStopAfterBlock}
      />
    );
  }

  if (isComplete) {
    return <WorkoutReport sessionId={sessionId} userId={userId} onExit={() => window.location.reload()} />;
  }

  if (viewMode === 'HUB') {
    return (
      <MissionHub
        workoutData={workoutData}
        sections={sections}
        completedIndices={completedIndices}
        skippedIndices={skippedIndices}
        sectionCompleteIdx={sectionCompleteIdx}
        selectedDate={selectedDate}
        progressKey={progressKey}
        onStartBlock={(idx) => { setBlockIndex(idx); setViewMode('WORKOUT'); }}
        onDismissSection={() => setSectionCompleteIdx(null)}
        onFinishWorkout={() => { setSectionCompleteIdx(null); setIsComplete(true); localStorage.removeItem(progressKey); }}
      />
    );
  }

  // --- WORKOUT View: Route to correct block type ---

  let mainView;

  if (!currentBlock) {
    mainView = (
      <div className="text-white text-center p-8 flex flex-col items-center justify-center h-[400px]">
        <div className="bg-zinc-800 p-4 rounded-full mb-4"><Info size={32} className="text-zinc-500" /></div>
        <h2 className="text-xl font-bold mb-2">No Active Workout</h2>
        <p className="text-zinc-400 mb-6 max-w-xs mx-auto">We couldn&apos;t find a workout for today. Check the library to load a past protocol.</p>
        <button onClick={() => setShowLibrary(true)} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wide transition-all">Open Library</button>
      </div>
    );
  } else if (currentBlock.type === 'recovery_selector') {
    mainView = (
      <RecoverySelector
        key={blockIndex}
        onSelect={(choice, duration) => {
          const labels: Record<string, string> = { walk: 'Walk', yoga: 'Yoga / Stretching', foam_roll: 'Foam Rolling' };
          const timerBlock = { name: labels[choice] || 'Recovery', type: 'timer', section: 'Recovery', xp_value: Math.floor(duration * 3), intervals: [{ type: 'interval', seconds: duration * 60, zone: labels[choice], color: 'bg-emerald-500', note: 'Easy pace — recover', raw_text: `${duration} min ${labels[choice]}` }] };
          const newData = [...workoutData];
          newData[blockIndex] = timerBlock;
          setWorkoutData(newData);
        }}
      />
    );
  } else if (currentBlock.type === 'checklist_exercise') {
    mainView = (
      <ExerciseView
        key={blockIndex}
        block={currentBlock}
        blockIndex={blockIndex}
        fullHistory={fullHistory}
        catalog={catalog}
        exerciseSwaps={exerciseSwaps}
        onSwap={(exIdx: number, name: string, swapGroup: string) => setSwapTarget({ blockIdx: blockIndex, exIdx, name, swapGroup })}
        onComplete={handleBlockComplete}
        userProfile={userProfile}
      />
    );
  } else if (currentBlock.type === 'list') {
    mainView = (
      <ChecklistView
        key={blockIndex}
        block={currentBlock}
        blockIndex={blockIndex}
        totalBlocks={workoutData.length}
        onComplete={handleBlockComplete}
      />
    );
  } else if (currentBlock.type === 'superset') {
    mainView = (
      <SupersetView
        key={blockIndex}
        block={currentBlock}
        blockIndex={blockIndex}
        fullHistory={fullHistory}
        catalog={catalog}
        exerciseSwaps={exerciseSwaps}
        onSwap={(exIdx: number, name: string, swapGroup: string) => setSwapTarget({ blockIdx: blockIndex, exIdx, name, swapGroup })}
        onComplete={handleBlockComplete}
      />
    );
  } else {
    const choice = engineChoice[blockIndex];
    if (choice === null || choice === undefined) {
      mainView = (
        <EngineSelector
          key={`engine-${blockIndex}`}
          recommendation={engineRecommendation}
          onSelect={(type, duration) => {
            setEngineChoice(prev => ({ ...prev, [blockIndex]: type }));
            if (type === 'zone2' && duration) {
              const zone2Block = generateZone2Block(duration);
              const newData = [...workoutData];
              newData[blockIndex] = { ...zone2Block, section: currentBlock.section };
              setWorkoutData(newData);
            }
          }}
        />
      );
    } else {
      mainView = (
        <TimerView key={blockIndex} block={workoutData[blockIndex]} blockIndex={blockIndex} onComplete={handleBlockComplete} />
      );
    }
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Atmospheric banner — arena floor */}
      {!isClassic && (
        <div className="fixed bottom-16 left-0 right-0 h-28 pointer-events-none z-0 overflow-hidden opacity-15">
          <img src={`/themes/${currentTheme}/banner.png`} alt="" className="w-full h-full object-cover object-bottom" style={{ maskImage: 'linear-gradient(transparent, black 40%)' }} />
        </div>
      )}

      {/* Workout Header + Mode Toggle */}
      <div className="mb-3 flex items-center justify-between px-1">
        <button onClick={() => setViewMode('HUB')} className="text-left cursor-pointer">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 text-sm">‹</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
              Block {completedIndices.length + 1} of {workoutData.length}
            </span>
          </div>
        </button>
        <div className="flex bg-zinc-800 rounded-lg p-0.5">
          <button onClick={() => setWorkoutMode('guided')} className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${workoutMode === 'guided' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>Guided</button>
          <button onClick={() => setWorkoutMode('flexible')} className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${workoutMode === 'flexible' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>Flexible</button>
        </div>
      </div>

      {/* Flexible Mode — current section only */}
      {workoutMode === 'flexible' ? (() => {
        const currentSection = currentBlock?.section || 'General';
        const sectionBlocks = workoutData.map((b, i) => ({ ...b, _globalIdx: i })).filter(b => (b.section || 'General') === currentSection);
        const sectionCompletedIndices = completedIndices;
        return (
          <FlexibleWorkoutView
            workoutData={sectionBlocks}
            completedIndices={sectionCompletedIndices}
            onCompleteBlock={(idx, data) => { const globalIdx = sectionBlocks[idx]._globalIdx; setBlockIndex(globalIdx); handleBlockComplete(false, data || []); }}
            onSkipBlock={(idx) => { const globalIdx = sectionBlocks[idx]._globalIdx; setBlockIndex(globalIdx); handleBlockComplete(true); }}
            fullHistory={fullHistory}
            catalog={catalog}
            userProfile={userProfile}
          />
        );
      })() : (
        /* Guided Mode (existing) */
        mainView
      )}

      {/* End Workout */}
      <div className="mt-3 text-center">
        <button onClick={() => setShowEndConfirm(true)} className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest hover:text-red-500 transition-colors py-2">End Workout</button>
      </div>

      {/* End Workout Confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="text-3xl mb-3">🏁</div>
            <h3 className="text-lg font-black text-white mb-2">End Workout?</h3>
            <p className="text-sm text-zinc-400 mb-6">Completed blocks are already saved. You can always come back and finish later.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-3 bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-sm rounded-xl hover:bg-zinc-700 transition">Keep Going</button>
              <button onClick={() => { setShowEndConfirm(false); setIsComplete(true); localStorage.removeItem(progressKey); }} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl transition">End Workout</button>
            </div>
          </div>
        </div>
      )}

      {/* Library Drawer */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4 min-h-screen" onClick={() => setShowLibrary(false)}>
          <div className="bg-zinc-900 rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden border border-zinc-700 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-700 shrink-0">
              <h2 className="text-2xl font-black italic text-white">Workout Library</h2>
              <p className="text-zinc-400 text-sm mt-1">Select a past workout</p>
            </div>
            <div className="overflow-y-auto p-4 space-y-2 flex-1">
              <div className="flex p-1 bg-zinc-800 rounded-xl mb-4">
                <button onClick={() => setActiveTab('schedule')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition ${activeTab === 'schedule' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>Weekly Schedule</button>
                <button onClick={() => setActiveTab('history')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition ${activeTab === 'history' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}>Past History</button>
              </div>
              {activeTab === 'schedule' ? (
                <div className="space-y-2">
                  {weeklySchedule.map((day) => (
                    <button key={day.day} onClick={() => handlePreviewWorkout(day.day)} className="w-full p-4 rounded-xl text-left bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition">
                      <div className="flex justify-between items-center">
                        <div className="font-bold capitalize text-white">{day.day}</div>
                        <ChevronRight size={16} />
                      </div>
                      <div className="text-xs text-zinc-500 mt-1 truncate">{day.title}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <button onClick={() => handlePreviewWorkout()} className={`w-full p-4 rounded-xl text-left transition ${(!selectedDate && !briefingData) ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
                    <div className="font-bold">Today</div>
                    <div className="text-xs opacity-70">Latest workout</div>
                  </button>
                  {workoutDates.map((date) => (
                    <button key={date} onClick={() => handlePreviewWorkout(date)} className={`w-full p-4 rounded-xl text-left transition ${selectedDate === date ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
                      <div className="font-bold">{date}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Swap Exercise Picker */}
      {swapTarget && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={() => setSwapTarget(null)}>
          <div className="bg-zinc-900 border-t border-zinc-700 rounded-t-2xl w-full max-w-lg max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Swap Exercise</h3>
                <p className="text-[10px] text-zinc-500">Replacing: {swapTarget.name}</p>
              </div>
              <button onClick={() => setSwapTarget(null)} className="text-zinc-500 hover:text-white text-xs font-bold px-3 py-1 rounded bg-zinc-800">✕</button>
            </div>
            <div className="overflow-y-auto p-3 space-y-1">
              {catalog
                .filter(c => c.swap_group === swapTarget.swapGroup && c.name.toLowerCase() !== swapTarget.name.toLowerCase())
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(c => (
                  <button key={c.id} onClick={() => { setExerciseSwaps(prev => ({ ...prev, [`${swapTarget.blockIdx}-${swapTarget.exIdx}`]: { name: c.name, catalogItem: c } })); setSwapTarget(null); }} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-zinc-800 transition flex items-center justify-between">
                    <span className="text-sm text-white">{c.name}</span>
                    {c.required_equipment && c.required_equipment.length > 0 && (
                      <span className="text-[9px] text-zinc-600">{c.required_equipment.join(', ')}</span>
                    )}
                  </button>
                ))}
              {catalog.filter(c => c.swap_group === swapTarget.swapGroup && c.name.toLowerCase() !== swapTarget.name.toLowerCase()).length === 0 && (
                <p className="text-center text-zinc-500 text-xs py-4">No alternatives available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
