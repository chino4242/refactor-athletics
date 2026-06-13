"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveProfile } from '@/services/api';
import { assignDefaultProgram } from '@/app/actions';
import { PATHS, type PathKey } from '@/data/paths';
import { THEME_IDENTITY } from '@/data/v2themes';
import { calculateMacros, type MacroGoal } from '@/utils/macroCalculator';

interface Props {
  userId: string;
}

const THEMES_LIST = [
  { key: 'athlete', emoji: '🏟️', name: 'Athlete', desc: 'Clean and competitive' },
  { key: 'dragon', emoji: '🐉', name: 'Draconic', desc: 'Mythic fire and gold' },
  { key: 'samurai', emoji: '⛩️', name: 'Samurai', desc: 'Indigo discipline' },
  { key: 'dinosaur', emoji: '🦖', name: 'Apex Predator', desc: 'Primal power' },
  { key: 'viking', emoji: '⚡', name: 'Viking', desc: 'Ice and thunder' },
];

const PATHS_LIST = Object.entries(PATHS).map(([key, p]) => ({ key, ...p }));

export default function OnboardingFlow({ userId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [theme, setTheme] = useState('athlete');
  const [path, setPath] = useState<PathKey>('hybrid');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [bodyweight, setBodyweight] = useState('');
  const [goal, setGoal] = useState<MacroGoal>('maintain');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    const macros = calculateMacros({
      weightLbs: parseFloat(bodyweight) || 180,
      age: parseInt(age) || 25,
      sex: sex || 'male',
      activityLevel: 'moderate',
      goal,
    });
    await saveProfile({
      user_id: userId,
      age: parseInt(age) || 25,
      sex: sex || 'male',
      bodyweight: parseFloat(bodyweight) || 180,
      selected_theme: theme,
      selected_path: path,
      experience_mode: 'rpg',
      is_onboarded: true,
      waiver_accepted_at: new Date().toISOString(),
      nutrition_targets: { protein: macros.protein, carbs: macros.carbs, fat: macros.fat, calories: macros.calories },
    } as any);
    await assignDefaultProgram(userId, path, []);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center px-4">
      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className={`w-3 h-3 border ${s === step ? 'border-red-500 bg-red-500' : s < step ? 'border-green-600 bg-green-600' : 'border-zinc-700 bg-zinc-800'}`} />
        ))}
      </div>

      <div className="w-full max-w-sm">
        {/* Step 1: Waiver */}
        {step === 1 && (
          <div className="border-2 border-zinc-700 bg-zinc-900 p-6 space-y-4">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest text-center" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              REFACTOR ATHLETICS
            </p>
            <p className="text-xs text-zinc-300 text-center mt-4">
              By continuing, you acknowledge that you are responsible for your own health and safety during exercise.
            </p>
            <p className="text-[8px] text-zinc-500 text-center">
              This app provides fitness tracking, not medical advice. Consult a physician before starting any exercise program.
            </p>
            <label className="flex items-center gap-3 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={waiverAccepted}
                onChange={e => setWaiverAccepted(e.target.checked)}
                className="w-4 h-4 accent-red-500"
              />
              <span className="text-[8px] text-zinc-300" style={{ fontFamily: "var(--font-pixel), monospace" }}>I ACCEPT</span>
            </label>
            <button
              onClick={() => setStep(2)}
              disabled={!waiverAccepted}
              className="w-full py-3 mt-4 border-2 border-red-800 bg-zinc-800 text-white disabled:opacity-30 transition-colors hover:bg-zinc-700"
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              <span className="text-[10px] text-red-400">NEXT ▸</span>
            </button>
          </div>
        )}

        {/* Step 2: Theme */}
        {step === 2 && (
          <div className="border-2 border-zinc-700 bg-zinc-900 p-5 space-y-4">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest text-center" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              CHOOSE YOUR THEME
            </p>
            <div className="space-y-2">
              {THEMES_LIST.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTheme(t.key)}
                  className={`w-full p-3 border text-left transition-colors ${theme === t.key ? 'border-red-700 bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{t.emoji}</span>
                    <div>
                      <p className={`text-[9px] ${theme === t.key ? 'text-white' : 'text-zinc-300'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{t.name}</p>
                      <p className="text-[8px] text-zinc-500">{t.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(1)} className="flex-1 py-3 border border-zinc-700 bg-zinc-800 text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                <span className="text-[9px]">◂ BACK</span>
              </button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 border-2 border-red-800 bg-zinc-800 text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                <span className="text-[10px] text-red-400">NEXT ▸</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Personal Info */}
        {step === 3 && (
          <div className="border-2 border-zinc-700 bg-zinc-900 p-5 space-y-4">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest text-center" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              ABOUT YOU
            </p>
            <div>
              <p className="text-[8px] text-zinc-500 uppercase mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>AGE</p>
              <input type="number" inputMode="numeric" value={age} onChange={e => setAge(e.target.value)} placeholder="25" className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <p className="text-[8px] text-zinc-500 uppercase mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>SEX</p>
              <div className="flex gap-2">
                {['male', 'female'].map(s => (
                  <button key={s} onClick={() => setSex(s)} className={`flex-1 py-2 border text-center ${sex === s ? 'border-red-700 bg-zinc-800' : 'border-zinc-700 bg-zinc-900'}`}>
                    <span className={`text-[9px] ${sex === s ? 'text-red-400' : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{s.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[8px] text-zinc-500 uppercase mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>BODYWEIGHT (LBS)</p>
              <input type="number" inputMode="numeric" value={bodyweight} onChange={e => setBodyweight(e.target.value)} placeholder="180" className="w-full bg-zinc-800 border border-zinc-700 px-3 py-2 text-white text-sm" />
            </div>
            <div>
              <p className="text-[8px] text-zinc-500 uppercase mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>GOAL</p>
              <div className="flex gap-2">
                {([['lose', 'CUT'], ['maintain', 'MAINTAIN'], ['gain', 'GAIN']] as [MacroGoal, string][]).map(([g, label]) => (
                  <button key={g} onClick={() => setGoal(g)} className={`flex-1 py-2 border text-center ${goal === g ? 'border-red-700 bg-zinc-800' : 'border-zinc-700 bg-zinc-900'}`}>
                    <span className={`text-[9px] ${goal === g ? 'text-red-400' : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[7px] text-zinc-600 text-center" style={{ fontFamily: "var(--font-pixel), monospace" }}>Used for rank calculation + nutrition targets</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(2)} className="flex-1 py-3 border border-zinc-700 bg-zinc-800 text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                <span className="text-[9px]">◂ BACK</span>
              </button>
              <button onClick={() => setStep(4)} disabled={!age || !sex || !bodyweight} className="flex-1 py-3 border-2 border-red-800 bg-zinc-800 text-white disabled:opacity-30" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                <span className="text-[10px] text-red-400">NEXT ▸</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Path */}
        {step === 4 && (
          <div className="border-2 border-zinc-700 bg-zinc-900 p-5 space-y-4">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest text-center" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              CHOOSE YOUR PATH
            </p>
            <div className="space-y-2">
              {PATHS_LIST.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPath(p.key as PathKey)}
                  className={`w-full p-3 border text-left transition-colors ${path === p.key ? 'border-red-700 bg-zinc-800' : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{p.emoji}</span>
                    <div>
                      <p className={`text-[9px] ${path === p.key ? 'text-white' : 'text-zinc-300'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{p.name}</p>
                      <p className="text-[8px] text-zinc-500">{p.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(3)} className="flex-1 py-3 border border-zinc-700 bg-zinc-800 text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                <span className="text-[9px]">◂ BACK</span>
              </button>
              <button onClick={() => setStep(5)} className="flex-1 py-3 border-2 border-red-800 bg-zinc-800 text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                <span className="text-[10px] text-red-400">NEXT ▸</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Connect Wearable */}
        {step === 5 && (
          <div className="border-2 border-zinc-700 bg-zinc-900 p-5 space-y-4">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest text-center" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              CONNECT WEARABLE
            </p>
            <p className="text-xs text-zinc-500 text-center">Sync steps, sleep, and activity automatically</p>
            <div className="space-y-2">
              <button onClick={async () => { const { requestPermissions } = await import('@/services/nativeHealth'); await requestPermissions(); }} className="w-full p-3 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-left transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⌚</span>
                  <div>
                    <p className="text-[9px] text-zinc-300" style={{ fontFamily: "var(--font-pixel), monospace" }}>APPLE HEALTH</p>
                    <p className="text-[8px] text-zinc-500">HealthKit (iOS)</p>
                  </div>
                </div>
              </button>
              <button onClick={async () => { const { requestPermissions } = await import('@/services/nativeHealth'); await requestPermissions(); }} className="w-full p-3 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-left transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">💚</span>
                  <div>
                    <p className="text-[9px] text-zinc-300" style={{ fontFamily: "var(--font-pixel), monospace" }}>HEALTH CONNECT</p>
                    <p className="text-[8px] text-zinc-500">Android</p>
                  </div>
                </div>
              </button>
              <button onClick={() => { window.location.href = '/api/whoop/authorize'; }} className="w-full p-3 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-left transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🟢</span>
                  <div>
                    <p className="text-[9px] text-zinc-300" style={{ fontFamily: "var(--font-pixel), monospace" }}>WHOOP</p>
                    <p className="text-[8px] text-zinc-500">OAuth connection</p>
                  </div>
                </div>
              </button>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(4)} className="flex-1 py-3 border border-zinc-700 bg-zinc-800 text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                <span className="text-[9px]">◂ BACK</span>
              </button>
              <button onClick={handleComplete} disabled={loading} className="flex-1 py-3 border-2 border-red-800 bg-zinc-800 text-white disabled:opacity-40" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                <span className="text-[10px] text-red-400">{loading ? 'LOADING...' : '⚔ BEGIN'}</span>
              </button>
            </div>
            <button onClick={handleComplete} disabled={loading} className="w-full text-center mt-2">
              <span className="text-[8px] text-zinc-600 hover:text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>SKIP FOR NOW</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
