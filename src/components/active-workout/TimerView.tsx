'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import { playCountdownBeep } from '../../utils/audio';

export default function TimerView({ block, blockIndex, onComplete, engineChoice }: any) {
  const [intervalIndex, setIntervalIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [outdoor, setOutdoor] = useState(false);
  const [showDistancePrompt, setShowDistancePrompt] = useState(false);
  const [distanceInput, setDistanceInput] = useState('');
  const [finalXp, setFinalXp] = useState(0);

  // Persist timer state for background resume
  const timerKey = `active_timer_${blockIndex}`;
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      const intervalStartedAt = Date.now() - ((block.intervals[intervalIndex]?.seconds || 0) - timeLeft) * 1000;
      localStorage.setItem(timerKey, JSON.stringify({ intervalIndex, intervalStartedAt, earnedXp, blockIndex }));
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
      // Auto-advance through completed intervals
      while (remaining <= 0 && idx < block.intervals.length - 1) {
        idx++;
        remaining += block.intervals[idx]?.seconds || 0;
      }
      if (idx < block.intervals.length && remaining > 0) {
        setIntervalIndex(idx);
        setTimeLeft(remaining);
        setEarnedXp(xp);
        setIsActive(true);
        setGetReady(0);
      } else {
        localStorage.removeItem(timerKey);
      }
    } catch { localStorage.removeItem(timerKey); }
  }, []);

  // Keep screen awake during tread block
  useEffect(() => {
    let wakeLock: any = null;
    const acquire = async () => {
      try { if ('wakeLock' in navigator) wakeLock = await (navigator as any).wakeLock.request('screen'); } catch {}
    };
    acquire();
    const onVisChange = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVisChange);
    return () => { wakeLock?.release(); document.removeEventListener('visibilitychange', onVisChange); };
  }, []);

  const speak = (text: string) => {
    try {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.1;
      u.volume = 1;
      speechSynthesis.speak(u);
    } catch {}
  };

  const currentInterval = block.intervals[intervalIndex];
  const nextInterval = block.intervals[intervalIndex + 1];
  const [getReady, setGetReady] = useState(5);

  // "GET READY" countdown before first interval
  useEffect(() => {
    if (getReady <= 0) return;
    if (getReady <= 3) playCountdownBeep();
    const t = setTimeout(() => setGetReady(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [getReady]);

  useEffect(() => {
    if (getReady > 0) return;
    if (currentInterval) {
      setTimeLeft(currentInterval.seconds);
      setIsActive(true);
      const zone = outdoor && currentInterval.outdoor_alternative ? currentInterval.outdoor_alternative : (currentInterval.zone || currentInterval.text || '');
      if (zone) speak(zone);
    }
  }, [intervalIndex, currentInterval, getReady]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      if (timeLeft <= 5) playCountdownBeep();
      if (timeLeft === 5 && nextInterval) {
        const next = nextInterval.zone || nextInterval.text || '';
        if (next) speak(`${next} in 5 seconds`);
      }
      interval = setInterval(() => { setTimeLeft((p) => p - 1); }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleNext();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleNext = () => {
    // 🟢 NEW: Log the completed interval immediately
    let earned = 0;
    if (currentInterval) {
      // Calculate dynamic XP based on Intensity * Duration
      let rate = 5; // Default (Base/Recovery) - 5 XP/min
      const z = (currentInterval.zone || currentInterval.text || "").toLowerCase();

      if (z.includes("push") || z.includes("tempo") || z.includes("threshold")) rate = 12;
      else if (z.includes("all out") || z.includes("sprint") || z.includes("max")) rate = 20;
      else if (z.includes("long run") || z.includes("moderate")) rate = 8;

      // Minimum 1 XP if it's very short
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
        <p className="text-sm text-zinc-400 text-center">How far did you go? (optional)</p>
        <div className="w-full max-w-[200px]">
          <span className="text-[9px] text-zinc-500 uppercase block text-center mb-1">Miles</span>
          <input
            type="text"
            inputMode="decimal"
            value={distanceInput}
            onChange={e => setDistanceInput(e.target.value)}
            placeholder="0.0"
            autoFocus
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-center text-lg text-white font-mono focus:border-orange-500 outline-none"
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
          <div className="flex items-center gap-3">
            {earnedXp > 0 && <span className="text-xs font-bold text-yellow-400/90">XP Earned: {earnedXp}</span>}
            <button onClick={() => setOutdoor(o => !o)} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition ${outdoor ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-zinc-800/50 text-white/50 border border-white/10'}`}>
              {outdoor ? '🌳 Outdoor' : '🏃 Indoor'}
            </button>
          </div>
        </div>
        <div className="flex justify-between items-end mt-1">
          <h1 className="text-white text-3xl font-black italic">
            {outdoor && currentInterval.outdoor_alternative ? currentInterval.outdoor_alternative : currentInterval.zone}
          </h1>
          <span className="text-white/60 font-mono text-sm">
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
          <h3 className="text-white/60 font-bold uppercase tracking-widest text-sm mb-4">Get Ready</h3>
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
                  <span className="text-[10px] text-white/60 uppercase font-bold">incline</span>
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
              return <p className="text-white/50 text-sm font-mono mt-2">{mins}:{secs < 10 ? '0' : ''}{secs} remaining</p>;
            })()}
          </>
        )}
      </div>
      )}

      {/* FOOTER */}
      <div className="bg-black/30 p-4 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-1 rounded uppercase">Up Next</span>
          {nextInterval ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base font-bold text-white truncate">{nextInterval.zone || nextInterval.text || 'Next'}</span>
              {nextInterval.seconds && <span className="text-sm text-white/50 font-mono shrink-0">{Math.floor(nextInterval.seconds / 60)}:{nextInterval.seconds % 60 < 10 ? '0' : ''}{nextInterval.seconds % 60}</span>}
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
