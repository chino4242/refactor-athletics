"use client";

import { useState, useEffect } from 'react';

// Enemy names lookup (needed for creature display)
const ENEMY_NAMES_PL: Record<string, Record<string, string>> = {
  samurai: { back_squat: 'Oni', deadlift: 'Earth Yokai', bench_press: 'Armor', pull_up: 'Tengu', overhead_press: 'Thunder Oni', run_1_mile: 'Fox Spirit', plank: 'Kappa', push_ups: 'Ninjas', run_400m: 'Kunai', dead_hang: 'Chain Spirit', barbell_row: 'Kraken', run_5k: 'Wind Kami', deep_squat_hold: 'Jade Tortoise', cossack_squat: 'Mirror Kitsune', l_sit_hold: 'Floating Monk' },
  dragon: { back_squat: 'Golem', deadlift: 'Iron Wyrm', bench_press: 'Fire Shield', pull_up: 'Sky Drake', overhead_press: 'Thunder Dragon', run_1_mile: 'Wind Serpent', plank: 'Lava Tortoise', push_ups: 'Fire Sprites', run_400m: 'Lightning Drake', dead_hang: 'Gravity Phantom', barbell_row: 'Deep Wyrm', run_5k: 'Storm Dragon', deep_squat_hold: 'Magma Toad', cossack_squat: 'Split Wyrm', l_sit_hold: 'Ember Wraith' },
  viking: { back_squat: 'Frost Troll', deadlift: 'Draugr', bench_press: 'War Shield', pull_up: 'Storm Raven', overhead_press: 'Lightning Giant', run_1_mile: 'Fenrir', plank: 'Glacier', push_ups: 'Berserkers', run_400m: 'Valkyrie', dead_hang: 'Anchor Wraith', barbell_row: 'Sea Serpent', run_5k: 'Odin\'s Hunt', deep_squat_hold: 'Frost Crab', cossack_squat: 'Ice Dancer', l_sit_hold: 'Hovering Draugr' },
  dinosaur: { back_squat: 'Mammoth', deadlift: 'T-Rex', bench_press: 'Triceratops', pull_up: 'Pterodactyl', overhead_press: 'Brachiosaurus', run_1_mile: 'Velociraptor', plank: 'Ankylosaurus', push_ups: 'Compys', run_400m: 'Raptor', dead_hang: 'Tar Pit', barbell_row: 'Mosasaurus', run_5k: 'Migration', deep_squat_hold: 'Anchor Turtle', cossack_squat: 'Split Raptor', l_sit_hold: 'Vine Phantom' },
};

interface ExerciseDetailSheetProps {
  exerciseId: string;
  userId: string;
  exercises: { name: string; exerciseId: string; level: number; expired: boolean }[];
  onClose: () => void;
  colors: any;
  currentTheme: string;
}

export default function ExerciseDetailSheet({ exerciseId, userId, exercises, onClose, colors, currentTheme }: ExerciseDetailSheetProps) {
  const [thresholds, setThresholds] = useState<number[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [currentValue, setCurrentValue] = useState(0);
  const [unit, setUnit] = useState('lbs');
  const [bodyweight, setBodyweight] = useState(180);
  const [userAge, setUserAge] = useState(30);
  const [isXBW, setIsXBW] = useState(false);
  const [xbwThresholds, setXbwThresholds] = useState<number[]>([]);
  const ex = exercises.find((e: any) => e.exerciseId === exerciseId);

  useEffect(() => {
    (async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      // Get catalog for thresholds
      const baseId = exerciseId.replace(/^(barbell|dumbbell|smith_machine|cable|machine)_/, '');
      // Try original ID first, then stripped version
      let { data: catRows } = await supabase.from('catalog').select('standards, normalizes_to').eq('id', exerciseId).limit(1);
      if (!catRows?.length) {
        const res = await supabase.from('catalog').select('standards, normalizes_to').eq('id', baseId).limit(1);
        catRows = res.data;
      }
      const cat = catRows?.[0];
      let standards = cat?.standards;
      if (cat?.normalizes_to) {
        const { data: baseCat } = await supabase.from('catalog').select('standards').eq('id', cat.normalizes_to).single();
        if (baseCat?.standards?.brackets?.male?.length) standards = baseCat.standards;
      }

      const { data: user } = await supabase.from('users').select('bodyweight').eq('id', userId).single();
      const bw = user?.bodyweight || 180;
      setBodyweight(bw);

      if (standards?.brackets?.male?.[0]?.levels) {
        // Find the correct age bracket for the user
        const { data: userProfile } = await supabase.from('users').select('age, sex').eq('id', userId).single();
        const userAge = userProfile?.age || 30;
        setUserAge(userAge);
        const sexKey = (userProfile?.sex || 'male').toLowerCase() === 'female' ? 'female' : 'male';
        const sexBrackets = standards.brackets[sexKey] || standards.brackets.male || [];
        const bracket = sexBrackets.find((b: any) => userAge >= (b.min || 0) && userAge <= (b.max || 100)) || sexBrackets[0];
        if (!bracket?.levels) { setThresholds([]); return; }
        const levels = bracket.levels;
        const isXBWunit = standards.unit === 'xBW';
        setIsXBW(isXBWunit);
        if (isXBWunit) setXbwThresholds(levels.map((l: number) => l));
        const isTime = standards.unit?.toLowerCase() === 'sec' || standards.unit?.toLowerCase() === 'seconds' || standards.scoring === 'lower_is_better';
        const isReps = standards.unit === 'reps' || standards.unit === 'Reps';
        const isLowerBetter = standards.scoring === 'lower_is_better';
        setUnit(isTime ? (isLowerBetter ? 'time-lower' : 'time') : isReps ? 'reps' : 'lbs');
        setThresholds(levels.map((l: number) => isXBWunit ? Math.round(l * bw) : Math.round(l)));
      }

      // Get recent history
      const { data: workouts } = await supabase.from('workouts').select('raw_value').eq('user_id', userId).eq('exercise_id', exerciseId).gt('raw_value', 0).order('timestamp', { ascending: false }).limit(5);
      const vals = (workouts || []).map((w: any) => Math.round(w.raw_value));
      setHistory(vals.reverse());
      if (vals.length > 0) setCurrentValue(Math.max(...vals));
    })();
  }, [exerciseId, userId]);

  const levelColors = ['text-zinc-500', 'text-zinc-300', 'text-green-400', 'text-blue-400', 'text-purple-400', 'text-amber-400'];
  const formatValue = (v: number) => {
    if (unit === 'time' || unit === 'time-lower') {
      const m = Math.floor(v / 60);
      const s = Math.round(v % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    if (unit === 'reps') return `${v} reps`;
    return `${v} lbs`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 overflow-y-auto overscroll-contain" onClick={onClose}>
      <div className="min-h-full p-4 space-y-4" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 text-lg z-10">✕</button>

        {/* Header */}
        <div className="text-center pt-2">
          {currentTheme !== 'athlete' && (() => {
            const normalized = exerciseId.replace(/^(barbell|dumbbell|smith_machine|cable|machine)_/, '');
            const spriteTier = (ex?.level || 0) >= 4 ? 2 : (ex?.level || 0) >= 2 ? 1 : 0;
            return (
              <div className="w-24 h-24 mx-auto mb-2 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                <img src={`/enemies/${currentTheme}/${normalized}_t${spriteTier}.png`} alt="" className="w-20 h-20" style={{ imageRendering: 'pixelated' }} />
              </div>
            );
          })()}
          <p className="text-base text-white font-medium">{ex?.name || exerciseId.replace(/_/g, ' ')}</p>
          {(() => {
            const normalized = exerciseId.replace(/^(barbell|dumbbell|smith_machine|cable|machine)_/, '');
            const creature = ENEMY_NAMES_PL[currentTheme]?.[normalized];
            const state = (ex?.level || 0) === 0 ? 'Unmet' : ex?.expired ? 'Dormant' : 'Allied';
            if (creature && currentTheme !== 'athlete') return (
              <p className="text-xs text-zinc-400 italic mt-0.5">{creature} · {state}</p>
            );
            return null;
          })()}
          <p className={`text-xs ${levelColors[ex?.level || 0]} mt-1`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            LV {ex?.level || 0}
          </p>
        </div>

        {/* YOUR NUMBERS section */}
        {currentValue > 0 && (
          <div className={`border ${colors.border} bg-zinc-900 p-3 space-y-1.5`}>
            <p className="text-xs text-zinc-500 uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>YOUR NUMBERS</p>
            {isXBW ? (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Bodyweight</span>
                  <span className="text-white">{bodyweight} lbs</span>
                </div>
                <p className="text-xs text-zinc-600">Thresholds scale with your bodyweight — update weight in profile if changed.</p>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Your best (est. 1RM)</span>
                  <span className="text-white">{Math.round(currentValue)} lbs ({(currentValue / bodyweight).toFixed(2)}×BW)</span>
                </div>
                {(ex?.level || 0) < 5 && thresholds[(ex?.level || 0)] && (
                  <>
                    <div className="border-t border-zinc-800 my-1.5" />
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Next level needs</span>
                      <span className={colors.secondary}>{xbwThresholds[(ex?.level || 0)]?.toFixed(2)}×BW = {thresholds[(ex?.level || 0)]} lbs</span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1">
                      Hit: <span className={`${colors.secondary} font-medium`}>{Math.round(thresholds[(ex?.level || 0)] / (1 + 5/30))}×5</span> or <span className={`${colors.secondary} font-medium`}>{Math.round(thresholds[(ex?.level || 0)] / (1 + 8/30))}×8</span>
                    </p>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Your best</span>
                  <span className="text-white">{formatValue(currentValue)}</span>
                </div>
                {(ex?.level || 0) < 5 && thresholds[(ex?.level || 0)] && (
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Next level needs</span>
                    <span className={colors.secondary}>{formatValue(thresholds[(ex?.level || 0)])}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Train button */}
        <a href={`/train/active?exercise=${exerciseId}`} className={`w-full block text-center text-xs py-3 border ${colors.primary} ${colors.secondary} bg-zinc-800 hover:bg-zinc-700 transition-colors`} style={{ fontFamily: "var(--font-pixel), monospace" }}>▸ TRAIN</a>

        {/* Threshold Table with progress bar */}
        {thresholds.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-zinc-500 uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>THRESHOLDS</p>

            {thresholds.map((t, i) => {
              const level = i + 1;
              const achieved = (ex?.level || 0) >= level;
              const isNext = (ex?.level || 0) === level - 1;
              // Progress bar: show % between previous threshold and next threshold
              const prevThreshold = i > 0 ? thresholds[i - 1] : 0;
              const range = t - prevThreshold;
              const progress = isNext && currentValue > 0 && range > 0
                ? Math.min(Math.max(((unit === 'time-lower' ? prevThreshold - currentValue : currentValue - prevThreshold) / range) * 100, 0), 100)
                : null;

              return (
                <div key={i}>
                  <div className={`flex items-center justify-between px-2 py-1.5 rounded-sm ${achieved ? 'bg-zinc-800/50' : ''} ${isNext ? `border ${colors.border}` : ''}`}>
                    <span className={`text-xs ${achieved ? levelColors[level] : 'text-zinc-600'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                      {achieved ? '✓' : '○'} LV {level}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${achieved ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        {formatValue(t)}
                        {isXBW && <span className="text-xs text-zinc-600 ml-1">({xbwThresholds[i]?.toFixed(2)}×)</span>}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar for next level */}
                  {isNext && progress !== null && (
                    <div className="mx-2 mt-1 mb-1">
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full ${colors.barFill} rounded-full transition-all`} style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-xs text-zinc-600 text-right mt-0.5" style={{ fontFamily: "var(--font-pixel), monospace" }}>{Math.round(progress)}% → LV {level}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Recent History */}
        {history.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 uppercase mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>RECENT</p>
            <p className="text-xs text-zinc-400">
              {history.map(v => formatValue(v)).join(' → ')} {history.length >= 2 && (history[history.length - 1] > history[0] ? '↑' : history[history.length - 1] < history[0] ? '↓' : '→')}
            </p>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
