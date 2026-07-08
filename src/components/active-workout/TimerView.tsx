'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { playCountdownBeep } from '../../utils/audio';
import { useAudioWorkout } from './useAudioWorkout';

export default function TimerView({ block, blockIndex, onComplete, engineChoice }: any) {
  const [intervalIndex, setIntervalIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [outdoor, setOutdoor] = useState(false);
  const [showDistancePrompt, setShowDistancePrompt] = useState(false);
  const [distanceInput, setDistanceInput] = useState('');
  const [finalXp, setFinalXp] = useState(0);
  const [audioMode, setAudioMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('audio_workout_mode') === 'true';
  });

  // Wall-clock based timer: store when interval started
  const intervalStartRef = useRef<number>(0);
  const intervalDurationRef = useRef<number>(0);
  const halfwayAnnouncedRef = useRef(false);

  const audio = useAudioWorkout({ enabled: audioMode });

  const toggleAudioMode = () => {
    const next = !audioMode;
    setAudioMode(next);
    localStorage.setItem('audio_workout_mode', next ? 'true' : 'false');
  };

  // Persist timer state for background resume
  const timerKey = `active_timer_${blockIndex}`;
  useEffect(() => {
    if (isActive && intervalStartRef.current > 0) {
      localStorage.setItem(timerKey, JSON.stringify({ intervalIndex, intervalStartedAt: intervalStartRef.current, earnedXp, blockIndex }));
    }
  }, [intervalIndex, isActive, timerKey]);

  // Restore timer state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(timerKey);
      if (!saved) return;
      const state = JSON.parse(saved);
      if (state.blockIndex !== blockIndex) { localStorage.removeItem(timerKey); return; }
      const elapsed = Math.floor((Date.now() - state.intervalStartedAt) / 1000);
      let idx = state.intervalIndex;
      let remaining = (block.intervals[idx]?.seconds || 0) - elapsed;
      let xp = state.earnedXp || 0;
      while (remaining <= 0 && idx < block.intervals.length - 1) {
        idx++;
        remaining += block.intervals[idx]?.seconds || 0;
      }
      if (idx < block.intervals.length && remaining > 0) {
        setIntervalIndex(idx);
        setTimeLeft(remaining);
        setEarnedXp(xp);
        intervalStartRef.current = Date.now() - ((block.intervals[idx]?.seconds || 0) - remaining) * 1000;
        intervalDurationRef.current = block.intervals[idx]?.seconds || 0;
        setIsActive(true);
        setGetReady(0);
      } else {
        localStorage.removeItem(timerKey);
      }
    } catch { localStorage.removeItem(timerKey); }
  }, []);

  // Keep screen awake
  useEffect(() => {
    let wakeLock: any = null;
    const acquire = async () => {
      try { if ('wakeLock' in navigator) wakeLock = await (navigator as any).wakeLock.request('screen'); } catch {}
    };
    if (!audioMode) acquire(); // Only request wake lock if NOT in audio mode (user wants screen off)
    const onVisChange = () => { if (document.visibilityState === 'visible' && !audioMode) acquire(); };
    document.addEventListener('visibilitychange', onVisChange);
    return () => { wakeLock?.release(); document.removeEventListener('visibilitychange', onVisChange); };
  }, [audioMode]);

  const currentInterval = block.intervals[intervalIndex];
  const nextInterval = block.intervals[intervalIndex + 1];
  const [getReady, setGetReady] = useState(5);

  // "GET READY" countdown
  useEffect(() => {
    if (getReady <= 0) return;
    if (getReady <= 3) playCountdownBeep();
    const t = setTimeout(() => setGetReady(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [getReady]);

  // Start interval when getReady finishes or intervalIndex changes
  useEffect(() => {
    if (getReady > 0) return;
    if (currentInterval) {
      const secs = currentInterval.seconds;
      setTimeLeft(secs);
      intervalStartRef.current = Date.now();
      intervalDurationRef.current = secs;
      halfwayAnnouncedRef.current = false;
      setIsActive(true);

      // Announce interval
      const zone = outdoor && currentInterval.outdoor_alternative
        ? currentInterval.outdoor_alternative
        : (currentInterval.zone || currentInterval.text || '');
      const incline = currentInterval.note?.match(/(\d+)%/)?.[1];

      if (audioMode) {
        audio.announceInterval(zone, secs, incline ? parseInt(incline) : null);
      } else if (zone) {
        try {
          if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(zone);
            u.rate = 1.1; u.volume = 1;
            speechSynthesis.speak(u);
          }
        } catch {}
      }
    }
  }, [intervalIndex, currentInterval, getReady]);

  // Wall-clock timer tick — calculates timeLeft from elapsed time
  useEffect(() => {
    if (!isActive || intervalStartRef.current === 0) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - intervalStartRef.current) / 1000);
      const remaining = Math.max(0, intervalDurationRef.current - elapsed);
      setTimeLeft(remaining);

      // Halfway announcement
      if (!halfwayAnnouncedRef.current && remaining <= Math.floor(intervalDurationRef.current / 2) && remaining > 0) {
        halfwayAnnouncedRef.current = true;
        if (audioMode) audio.announceHalfway();
      }

      // Countdown beeps + audio countdown
      if (remaining <= 5 && remaining > 0) {
        playCountdownBeep();
        if (audioMode) audio.announceCountdown(remaining);
      }

      // Next interval preview at 5 seconds
      if (remaining === 5 && nextInterval) {
        const next = nextInterval.zone || nextInterval.text || '';
        if (!audioMode && next) {
          try {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(`${next} in 5 seconds`);
            u.rate = 1.1; u.volume = 1;
            speechSynthesis.speak(u);
          } catch {}
        }
      }

      if (remaining === 0) {
        handleNext();
        return;
      }
    };

    // Tick immediately, then every 250ms (more responsive than 1s for screen-off recovery)
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [isActive, intervalIndex]);

  const handleNext = () => {
    let earned = 0;
    if (currentInterval) {
      let rate = 5;
      const z = (currentInterval.zone || currentInterval.text || "").toLowerCase();
      if (z.includes("push") || z.includes("tempo") || z.includes("threshold")) rate = 12;
      else if (z.includes("all out") || z.includes("sprint") || z.includes("max")) rate = 20;
      else if (z.includes("long run") || z.includes("moderate")) rate = 8;
      const durationMin = currentInterval.seconds / 60;
      earned = Math.ceil(Math.max(1, durationMin * rate));
      setEarnedXp(prev => prev + earned);
    }

    if (intervalIndex < block.intervals.length - 1) {
      setIntervalIndex((prev) => prev + 1);
    } else {
      setIsActive(false);
      localStorage.removeItem(timerKey);
      setFinalXp(earnedXp + earned);
      if (audioMode) audio.announceComplete();
      setShowDistancePrompt(true);
    }
  };

  const handleDistanceSubmit = () => {
    const distance = parseFloat(distanceInput) || 0;
    onComplete(false, [], finalXp, distance);
    setShowDistancePrompt(false);
  };


  if (!currentInterval) return <div className="text-white p-8">Loading Interval...</div>;

  if (showDistancePrompt) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-5xl">🏁</div>
        <h2 className="text-xl font-black text-white uppercase tracking-tight">Block Complete!</h2>
        <p className="text-base text-zinc-400 text-center">How far did you go? (optional)</p>
        <div className="w-full max-w-[200px]">
          <span className="text-xs text-zinc-500 uppercase block text-center mb-1">Miles</span>
          <input
            type="text"
            inputMode="decimal"
            value={distanceInput}
            onChange={e => setDistanceInput(e.target.value)}
            placeholder="0.0"
            autoFocus
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-center text-lg text-white font-mono focus:border-zinc-500 outline-none"
          />
        </div>
        <div className="flex gap-3 w-full max-w-[280px]">
          <button onClick={handleDistanceSubmit} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition">
            {distanceInput ? 'Save & Continue' : 'Skip'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md mx-auto h-[calc(100dvh-80px)] md:h-[600px] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative transition-colors duration-700 ${currentInterval.color}`}>

      {/* HEADER */}
      <div className="bg-black/20 p-6 backdrop-blur-sm shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-white/80 font-bold uppercase tracking-widest text-xs">
            {block.name}
          </h2>
          <div className="flex items-center gap-2">
            {earnedXp > 0 && <span className="text-sm font-bold text-yellow-400/90">XP: {earnedXp}</span>}
            <button onClick={toggleAudioMode} className={`p-1.5 rounded-lg transition ${audioMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-zinc-800/50 text-white/40 border border-white/10'}`} title={audioMode ? 'Audio cues on' : 'Audio cues off'}>
              {audioMode ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <button onClick={() => setOutdoor(o => !o)} className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition ${outdoor ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-zinc-800/50 text-white/50 border border-white/10'}`}>
              {outdoor ? '🌳 Out' : '🏃 In'}
            </button>
          </div>
        </div>
        <div className="flex justify-between items-end mt-1">
          <h1 className="text-white text-3xl font-black italic">
            {outdoor && currentInterval.outdoor_alternative ? currentInterval.outdoor_alternative : currentInterval.zone}
          </h1>
          <span className="text-white/60 font-mono text-base">
            {intervalIndex + 1} / {block.intervals.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="flex gap-1 mt-3">
          {block.intervals.map((_: any, i: number) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < intervalIndex ? 'bg-white' : i === intervalIndex ? 'bg-white/80 animate-pulse' : 'bg-white/20'}`} />
          ))}
        </div>
      </div>

      {/* CONTENT: GET READY / TIMER / CARD */}
      {getReady > 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <h3 className="text-white/60 font-bold uppercase tracking-widest text-base mb-4">Get Ready</h3>
          <div className="text-[120px] font-black text-white leading-none font-mono animate-pulse">{getReady}</div>
        </div>
      ) : (
      <div key={intervalIndex} className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {currentInterval.type === 'card' ? (
          <div className="animate-in fade-in zoom-in duration-300">
            <h3 className="text-white/60 font-bold uppercase tracking-widest text-sm mb-4">
              Instruction
            </h3>
            <div className="text-3xl md:text-4xl font-black text-white leading-tight">
              {currentInterval.text || currentInterval.raw_text}
            </div>
          </div>
        ) : (
          <>
            {!outdoor && (() => {
              const txt = (currentInterval.note || '') + ' ' + (currentInterval.raw_text || '');
              const m = txt.match(/(\d+(?:\.\d+)?)\s*%/);
              return m ? (
                <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-1">
                  <span className="text-2xl font-black text-white">{m[1]}%</span>
                  <span className="text-xs text-white/60 uppercase font-bold">incline</span>
                </div>
              ) : null;
            })()}
            <div className={`text-[120px] font-black leading-none tracking-tighter drop-shadow-lg font-mono transition-colors duration-300 ${timeLeft <= 5 && timeLeft > 0 && isActive ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              {isNaN(timeLeft) ? "--:--" :
                `${Math.floor(timeLeft / 60)}:${timeLeft % 60 < 10 ? '0' : ''}${timeLeft % 60}`
              }
            </div>
            <p className="text-white/90 text-lg font-medium mt-4 max-w-[90%] animate-pulse-slow">
              {outdoor && currentInterval.outdoor_alternative ? currentInterval.outdoor_alternative : (currentInterval.note || currentInterval.raw_text)}
            </p>
            {(() => {
              const remaining = timeLeft + block.intervals.slice(intervalIndex + 1).reduce((s: number, i: any) => s + (i.seconds || 0), 0);
              const mins = Math.floor(remaining / 60);
              const secs = remaining % 60;
              return <p className="text-white/50 text-base font-mono mt-2">{mins}:{secs < 10 ? '0' : ''}{secs} remaining</p>;
            })()}
          </>
        )}
      </div>
      )}

      {/* FOOTER */}
      <div className="bg-black/30 p-4 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-bold bg-white/20 text-white px-2 py-1 rounded uppercase">Up Next</span>
          {nextInterval ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base font-bold text-white truncate">{nextInterval.zone || nextInterval.text || 'Next'}</span>
              {nextInterval.seconds && <span className="text-base text-white/50 font-mono shrink-0">{Math.floor(nextInterval.seconds / 60)}:{nextInterval.seconds % 60 < 10 ? '0' : ''}{nextInterval.seconds % 60}</span>}
            </div>
          ) : (
            <span className="text-base font-bold text-white">Block Complete 🎉</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-2">
          {/* If Card, only show Next button (centered/expanded) */}
          {currentInterval.type === 'card' ? (
            <button onClick={handleNext} className="col-span-3 flex items-center justify-center bg-white text-black p-4 rounded-xl shadow-lg hover:scale-105 transition active:scale-95 font-bold uppercase tracking-widest">
              CONTINUE
            </button>
          ) : (
            <>
              <button aria-label="Restart Interval" onClick={() => { setTimeLeft(currentInterval.seconds || 0); setIsActive(true); }} className="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white p-4 rounded-xl transition"><RotateCcw size={24} /></button>
              <button aria-label={isActive ? "Pause Timer" : "Resume Timer"} onClick={() => setIsActive(!isActive)} className="flex items-center justify-center bg-white text-black p-4 rounded-xl shadow-lg hover:scale-105 transition active:scale-95">{isActive ? <Pause size={28} fill="black" /> : <Play size={28} fill="black" />}</button>
              <button aria-label="Next Interval" onClick={handleNext} className="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white p-4 rounded-xl transition"><SkipForward size={24} /></button>
            </>
          )}
        </div>

        {/* Skip Block Button */}
        <div className="mt-4 text-center">
          <button onClick={() => onComplete(true)} className="text-white/40 hover:text-red-500 text-xs font-bold uppercase tracking-widest transition-colors py-2">
            Skip Entire Block
          </button>
        </div>
      </div>
    </div>
  );
}
