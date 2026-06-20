"use client";

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';
import PixelBox, { PixelBar, ScreenWrapper } from './PixelBox';
import { PowerLevelSkeleton } from './Skeletons';
import WeeklyRecapCard from './WeeklyRecapCard';
import HealthSync from './HealthSync';
import PushRegistration from './PushRegistration';

interface PowerLevelScreenProps {
  userId: string;
}

interface PowerLevelData {
  powerLevel: number;
  maxPossible: number;
  exercises: { name: string; exerciseId: string; level: number; expired: boolean }[];
  expiringExercises: { name: string; level: number; daysLeft: number }[];
  closestRankUps: { name: string; exerciseId: string; currentLevel: number; gap: string }[];
  recentPRs: { name: string; value: string; date: string }[];
}

function getTier(pl: number): { name: string; color: string } {
  if (pl >= 49) return { name: 'DIAMOND', color: 'text-cyan-300' };
  if (pl >= 37) return { name: 'PLATINUM', color: 'text-purple-300' };
  if (pl >= 25) return { name: 'GOLD', color: 'text-yellow-400' };
  if (pl >= 13) return { name: 'SILVER', color: 'text-zinc-300' };
  return { name: 'BRONZE', color: 'text-amber-600' };
}

function NutritionBar({ userId, colors, refreshKey }: { userId: string; colors: any; refreshKey: number }) {
  const [data, setData] = useState<{ protein: number; carbs: number; fat: number; calsIn: number; burned: number; steps: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const today = new Date().toLocaleDateString('en-CA');
      const [{ data: logs }, { data: habits }] = await Promise.all([
        supabase.from('nutrition_logs').select('macro_type, amount').eq('user_id', userId).eq('date', today),
        supabase.from('habit_logs').select('habit_id, value').eq('user_id', userId).eq('date', today).eq('habit_id', 'habit_steps'),
      ]);

      const totals: Record<string, number> = {};
      for (const l of logs || []) totals[l.macro_type] = (totals[l.macro_type] || 0) + (l.amount || 0);
      let steps = (habits || []).reduce((s, h) => s + (h.value || 0), 0);

      // Read calories burned + steps directly from native plugin (bypasses DB race conditions)
      let burned = Math.round(totals['calories_burned'] || 0);
      try {
        const { getCaloriesBurned, getSteps } = await import('@/services/nativeHealth');
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
        const [nativeBurned, nativeSteps] = await Promise.all([
          getCaloriesBurned(startOfToday, endOfToday),
          getSteps(startOfToday, endOfToday),
        ]);
        if (nativeBurned > burned) burned = nativeBurned;
        if (nativeSteps > steps) steps = nativeSteps;
      } catch {}

      setData({
        protein: Math.round(totals['protein'] || 0),
        carbs: Math.round(totals['carbs'] || 0),
        fat: Math.round(totals['fat'] || 0),
        calsIn: Math.round(totals['calories'] || 0),
        burned,
        steps,
      });
    })();
  }, [userId, refreshKey]);

  const [showMealLog, setShowMealLog] = useState(false);
  const [mealLog, setMealLog] = useState<{ id: string; macro_type: string; amount: number; label?: string; meal_tag?: string; timestamp: number }[]>([]);

  if (!data) return null;

  const net = data.calsIn - data.burned;

  const openMealLog = async () => {
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    const today = new Date().toLocaleDateString('en-CA');
    const { data: logs } = await supabase.from('nutrition_logs').select('id, macro_type, amount, label, meal_tag, timestamp').eq('user_id', userId).eq('date', today).order('timestamp', { ascending: false });
    setMealLog(logs || []);
    setShowMealLog(true);
  };

  const deleteMealEntry = async (id: string) => {
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    await supabase.from('nutrition_logs').delete().eq('id', id);
    setMealLog(prev => prev.filter(l => l.id !== id));
  };

  return (
    <>
    <button onClick={openMealLog} className={`w-full text-left border ${colors.border} border-l-2 ${colors.primary} bg-zinc-900/80 px-3 py-2.5 mb-4 hover:bg-zinc-800/80 transition-colors`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-blue-400 font-medium">P {data.protein}g</span>
          <span className="text-orange-400 font-medium">C {data.carbs}g</span>
          <span className="text-yellow-400 font-medium">F {data.fat}g</span>
          {data.steps > 0 && <span className="text-emerald-400">👟 {data.steps.toLocaleString()}</span>}
        </div>
        <span className={`text-xs font-bold ${net < 0 ? 'text-green-400' : net > 200 ? 'text-amber-400' : 'text-zinc-400'}`}>
          NET {net > 0 ? '+' : ''}{net}
        </span>
      </div>
      {(data.calsIn > 0 || data.burned > 0) && (
        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-500">
          <span>IN {data.calsIn.toLocaleString()}</span>
          <span className="text-zinc-700">•</span>
          <span>BURNED {data.burned.toLocaleString()}</span>
        </div>
      )}
    </button>

    {/* Meal Log Sheet */}
    {showMealLog && (
      <div className="fixed inset-0 z-50" onClick={() => setShowMealLog(false)}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute bottom-0 left-0 right-0 max-h-[50vh] bg-zinc-900 border-t-2 border-zinc-700 rounded-t-lg overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="p-4">
            <p className={`text-[10px] ${colors.secondary} font-bold mb-3`} style={{ fontFamily: "var(--font-pixel), monospace" }}>TODAY&apos;S MEALS</p>
            {mealLog.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">No meals logged today</p>
            ) : (
              <div className="space-y-1">
                {mealLog.filter(l => l.macro_type === 'calories').map(l => (
                  <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-zinc-800">
                    <div>
                      <p className="text-[11px] text-zinc-300">{l.label || l.meal_tag || 'Meal'}</p>
                      <p className="text-[9px] text-zinc-500">{l.amount} cal</p>
                    </div>
                    <button onClick={() => deleteMealEntry(l.id)} className="text-[9px] text-red-500 px-2 py-1 border border-red-900 bg-zinc-800 hover:bg-red-950">DEL</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default function PowerLevelScreen({ userId }: PowerLevelScreenProps) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [data, setData] = useState<PowerLevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [playerLevel, setPlayerLevel] = useState<{ level: number; xp: number; xpForNext: number } | null>(null);
  const [physique, setPhysique] = useState<{ rank: number; bodyFat: number | null; leanMass: number | null; streak: number } | null>(null);
  const [showPhysique, setShowPhysique] = useState(false);
  const [showXray, setShowXray] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { getPowerLevelV2 } = await import('@/services/powerLevelV2');
        const result = await getPowerLevelV2(userId);
        setData({
          powerLevel: result.powerLevel,
          maxPossible: result.maxPossible,
          exercises: result.exercises.map(ex => ({ name: ex.name, exerciseId: ex.exerciseId, level: ex.level, expired: ex.expired })),
          expiringExercises: result.expiringExercises.map(ex => ({
            name: ex.name,
            level: ex.level,
            daysLeft: ex.daysUntilExpiry,
          })),
          closestRankUps: result.closestRankUps,
          recentPRs: result.recentPRs,
        });
      } catch {
        setData({ powerLevel: 0, maxPossible: 60, exercises: [], expiringExercises: [], closestRankUps: [], recentPRs: [] });
      }
      // Fetch player level
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: ledger } = await supabase.from('xp_ledger').select('amount').eq('user_id', userId);
        const totalXp = (ledger || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
        let level = 1; let xpNeeded = 1000;
        let xpAccum = 0;
        while (xpAccum + xpNeeded <= totalXp) { xpAccum += xpNeeded; level++; xpNeeded = Math.round(1000 * Math.pow(1.08, level - 1)); }
        setPlayerLevel({ level, xp: totalXp - xpAccum, xpForNext: xpNeeded });
      } catch {}

      // Fetch physique rank (body composition)
      try {
        const { createClient: getClient } = await import('@/utils/supabase/client');
        const sb = getClient();
        const { data: measurements } = await sb.from('body_measurements').select('body_fat_percentage, lean_body_mass, date').eq('user_id', userId).not('body_fat_percentage', 'is', null).order('date', { ascending: false }).limit(8);
        if (measurements?.length) {
          const latest = measurements[0];
          const bf = latest.body_fat_percentage;
          // Rank from BF%: male brackets
          const rank = bf <= 10 ? 5 : bf <= 15 ? 4 : bf <= 20 ? 3 : bf <= 25 ? 2 : 1;
          // Recomp streak: consecutive weeks where BF went down or lean mass went up
          let streak = 0;
          for (let i = 0; i < measurements.length - 1; i++) {
            const curr = measurements[i];
            const prev = measurements[i + 1];
            if ((curr.body_fat_percentage < prev.body_fat_percentage) || (curr.lean_body_mass > prev.lean_body_mass)) streak++;
            else break;
          }
          setPhysique({ rank, bodyFat: bf, leanMass: latest.lean_body_mass, streak });
        }
      } catch {}

      setLoading(false);
    })();
  }, [userId, refreshKey]);

  if (loading) {
    return <PowerLevelSkeleton />;
  }

  if (!data) return null;

  const tier = getTier(data.powerLevel);

  return (
    <ScreenWrapper onRefresh={async () => { setRefreshKey(k => k + 1); }}>
      <HealthSync userId={userId} refreshKey={refreshKey} onSyncComplete={() => setRefreshKey(k => k + 1)} />
      <PushRegistration userId={userId} />
      {/* Weekly Recap (shows Sun-Tue) */}
      <WeeklyRecapCard userId={userId} />

      {/* Theme Banner */}
      <div className="mb-4 overflow-hidden border-2 border-zinc-800 rounded-sm max-h-[120px]">
        <img
          src={`/themes/${currentTheme}/v2/banner.png`}
          alt=""
          className="w-full h-full object-cover"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Nutrition summary */}
      <NutritionBar userId={userId} colors={colors} refreshKey={refreshKey} />

      {/* Hero Power Level — tap for X-ray */}
      <PixelBox highlight className="p-5 mb-4">
        <button onClick={() => setShowXray(!showXray)} className="w-full text-center">
          {!showXray ? (
            <>
              <p className={`text-[10px] ${colors.headerText} mb-2 uppercase tracking-wider`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                POWER LV
              </p>
              <span className="text-5xl text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {data.powerLevel}
              </span>
              <p className={`text-[10px] mt-2 uppercase tracking-widest ${tier.color}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                ▸ {tier.name} ◂
              </p>
            </>
          ) : (
            <>
              <p className={`text-[10px] ${colors.headerText} mb-3 uppercase tracking-wider`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                RANKED EXERCISES
              </p>
              <div className="grid grid-cols-4 gap-2">
                {data.exercises.map(ex => {
                  const levelColors: Record<number, string> = {
                    0: 'border-zinc-700',
                    1: 'border-zinc-400',
                    2: 'border-green-500',
                    3: 'border-blue-500',
                    4: 'border-purple-500',
                    5: 'border-amber-400',
                  };
                  const levelTextColors: Record<number, string> = {
                    0: 'text-zinc-700',
                    1: 'text-zinc-400',
                    2: 'text-green-500',
                    3: 'text-blue-400',
                    4: 'text-purple-400',
                    5: 'text-amber-400',
                  };
                  const borderClass = ex.expired ? 'border-zinc-700' : (levelColors[ex.level] || 'border-zinc-700');
                  return (
                  <div key={ex.exerciseId} className="flex flex-col items-center gap-1">
                    <div className={`relative w-8 h-8 border ${borderClass} ${ex.expired ? 'opacity-40' : ''} flex items-center justify-center bg-zinc-800`}>
                      <img src={`/themes/${currentTheme}/v2/level${ex.level}.png`} alt="" className="w-6 h-6" style={{ imageRendering: 'pixelated' }} />
                      {ex.level > 0 && !ex.expired && (
                        <span className={`absolute bottom-0 right-0.5 text-[7px] font-bold ${levelTextColors[ex.level]}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{ex.level}</span>
                      )}
                    </div>
                    <span className={`text-[8px] ${ex.level > 0 && !ex.expired ? 'text-zinc-300' : 'text-zinc-600'} truncate max-w-[60px]`}>
                      {ex.name.split(' ').slice(0, 2).join(' ')}
                    </span>
                  </div>
                  );
                })}
              </div>
              <p className="text-[8px] text-zinc-600 mt-3">tap to close</p>
            </>
          )}
        </button>
        {!showXray && (
          <div className="mt-4">
            <div className="flex justify-between text-[8px] text-zinc-500 mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              <span>PWR</span>
              <span>{data.powerLevel}/{data.maxPossible}</span>
            </div>
            <PixelBar current={data.powerLevel} max={data.maxPossible} />
          </div>
        )}
      </PixelBox>

      {/* Player Level */}
      {playerLevel && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className={`text-[12px] ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>LV {playerLevel.level}</span>
          <div className="w-[120px] h-[6px] bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full ${colors.barFill} opacity-60 rounded-full`} style={{ width: `${(playerLevel.xp / playerLevel.xpForNext) * 100}%` }} />
          </div>
          <span className="text-[11px] text-white/60">{playerLevel.xp.toLocaleString()} / {playerLevel.xpForNext.toLocaleString()}</span>
        </div>
      )}

      {/* Physique Rank + Recomp Streak */}
      {physique && (
        <button onClick={() => setShowPhysique(p => !p)} className="w-full text-left">
        <PixelBox className="p-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className={`text-[9px] ${colors.headerText} uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>PHYSIQUE LV {physique.rank}</span>
              <div className="flex gap-3 mt-1 text-[10px]">
                {physique.bodyFat !== null && <span className="text-zinc-300">BF {Number(physique.bodyFat).toFixed(1)}%</span>}
                {physique.leanMass !== null && <span className="text-zinc-300">LEAN {Math.round(physique.leanMass)} lbs</span>}
              </div>
            </div>
            {physique.streak >= 2 && (
              <span className="text-[9px] text-amber-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>🔥 {physique.streak}wk streak</span>
            )}
          </div>
          {/* Threshold detail (shown on tap) */}
          {showPhysique && physique.bodyFat !== null && (
            <div className="mt-3 pt-2 border-t border-zinc-800 space-y-1">
              {[
                { lv: 1, range: '> 25%', target: 25 },
                { lv: 2, range: '20-25%', target: 20 },
                { lv: 3, range: '15-20%', target: 15 },
                { lv: 4, range: '10-15%', target: 10 },
                { lv: 5, range: '< 10%', target: 5 },
              ].map(t => {
                const current = physique.rank >= t.lv;
                const isNext = physique.rank === t.lv - 1;
                const gap = isNext && physique.bodyFat !== null ? (physique.bodyFat - t.target).toFixed(1) : null;
                return (
                  <div key={t.lv} className={`flex items-center justify-between text-[9px] ${current ? 'text-zinc-300' : 'text-zinc-600'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    <span>{current ? '✓' : '○'} LV {t.lv} — {t.range}</span>
                    {isNext && gap && <span className={colors.secondary}>-{gap}% to go</span>}
                  </div>
                );
              })}
            </div>
          )}
        </PixelBox>
        </button>
      )}

      {/* Expiring exercises */}
      {data.expiringExercises.length > 0 && (
        <PixelBox className="p-4 mb-4">
          <p className="text-[10px] text-amber-400 mb-3 uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            ⚠ EXPIRING
          </p>
          <div className="space-y-2">
            {data.expiringExercises.map((ex) => (
              <div key={ex.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={`/themes/${currentTheme}/v2/level${ex.level}.png`} alt={`Level ${ex.level}`} className="w-6 h-6" style={{ imageRendering: 'pixelated' }} />
                  <span className="text-xs text-zinc-200">{ex.name}</span>
                </div>
                <span className={`text-[8px] ${ex.daysLeft <= 3 ? 'text-red-400' : ex.daysLeft <= 7 ? 'text-amber-400' : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{ex.daysLeft}D</span>
              </div>
            ))}
          </div>
        </PixelBox>
      )}

      {/* Closest rank-ups */}
      {data.closestRankUps.length > 0 && (
        <PixelBox className="p-4 mb-4">
          <p className={`text-[10px] ${colors.headerText} mb-3 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            ▲ RANK UP
          </p>
          <div className="space-y-2">
            {data.closestRankUps.map((ex) => (
              <a key={ex.name} href={`/train/active?exercise=${ex.exerciseId}`} className="flex items-center justify-between hover:bg-zinc-800/50 -mx-1 px-1 py-0.5 transition-colors">
                <div className="flex items-center gap-2">
                  <img src={`/themes/${currentTheme}/v2/level${ex.currentLevel}.png`} alt={`Level ${ex.currentLevel}`} className="w-6 h-6" style={{ imageRendering: 'pixelated' }} />
                  <span className="text-xs text-zinc-200">{ex.name}</span>
                </div>
                <span className={`text-[8px] ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{ex.gap} ▸</span>
              </a>
            ))}
          </div>
        </PixelBox>
      )}

      {/* Recent PRs */}
      {data.recentPRs.length > 0 && (
        <PixelBox className="p-4 mb-4">
          <p className={`text-[10px] ${colors.headerText} mb-3 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            ★ NEW RECORDS
          </p>
          <div className="space-y-2">
            {data.recentPRs.map((pr) => (
              <div key={pr.name + pr.date} className="flex items-center justify-between">
                <span className="text-xs text-zinc-200">{pr.name}</span>
                <span className={`text-[8px] ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{pr.value}</span>
              </div>
            ))}
          </div>
        </PixelBox>
      )}

      {/* Empty state */}
      {data.powerLevel === 0 && (
        <PixelBox highlight className="p-5 text-center">
          <p className={`text-[10px] ${colors.secondary} mb-2`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            YOUR JOURNEY BEGINS
          </p>
          <p className="text-xs text-zinc-400 mb-1">12 ranked exercises determine your Power Level.</p>
          <p className="text-xs text-zinc-500 mb-4">Test one to discover your first rank.</p>
          <a
            href="/train/active?mode=flexible&filter=strength"
            className={`inline-block text-[10px] px-5 py-3 border-2 ${colors.primary} bg-zinc-800 text-white hover:bg-zinc-700 transition-colors`}
            style={{ fontFamily: "var(--font-pixel), monospace" }}
          >
            ⚔ TEST YOUR STRENGTH
          </a>
          <a
            href="/train"
            className="block mt-3 text-[8px] text-zinc-600 hover:text-zinc-400"
            style={{ fontFamily: "var(--font-pixel), monospace" }}
          >
            or start today&apos;s workout ▸
          </a>
        </PixelBox>
      )}
    </ScreenWrapper>
  );
}
