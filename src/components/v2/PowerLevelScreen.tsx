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

  if (!data || (data.calsIn === 0 && data.protein === 0 && data.steps === 0)) return null;

  const net = data.calsIn - data.burned;

  return (
    <div className={`border ${colors.border} border-l-2 ${colors.primary} bg-zinc-900/80 px-3 py-2.5 mb-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-blue-400 font-medium">P {data.protein}g</span>
          <span className="text-orange-400 font-medium">C {data.carbs}g</span>
          <span className="text-yellow-400 font-medium">F {data.fat}g</span>
          {data.steps > 0 && <span className="text-emerald-400">👟 {data.steps.toLocaleString()}</span>}
        </div>
        <span className={`text-xs font-bold ${net <= 0 ? 'text-green-400' : 'text-zinc-400'}`}>
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
    </div>
  );
}

export default function PowerLevelScreen({ userId }: PowerLevelScreenProps) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [data, setData] = useState<PowerLevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { getPowerLevelV2 } = await import('@/services/powerLevelV2');
        const result = await getPowerLevelV2(userId);
        setData({
          powerLevel: result.powerLevel,
          maxPossible: result.maxPossible,
          expiringExercises: result.expiringExercises.map(ex => ({
            name: ex.name,
            level: ex.level,
            daysLeft: ex.daysUntilExpiry,
          })),
          closestRankUps: result.closestRankUps,
          recentPRs: result.recentPRs,
        });
      } catch {
        setData({ powerLevel: 0, maxPossible: 60, expiringExercises: [], closestRankUps: [], recentPRs: [] });
      }
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

      {/* Hero Power Level */}
      <PixelBox highlight className="p-5 mb-4">
        <div className="text-center">
          <p className={`text-[10px] ${colors.headerText} mb-2 uppercase tracking-wider`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            POWER LV
          </p>
          <span className="text-5xl text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {data.powerLevel}
          </span>
          <p className={`text-[10px] mt-2 uppercase tracking-widest ${tier.color}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            ▸ {tier.name} ◂
          </p>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[8px] text-zinc-500 mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            <span>PWR</span>
            <span>{data.powerLevel}/{data.maxPossible}</span>
          </div>
          <PixelBar current={data.powerLevel} max={data.maxPossible} />
        </div>
      </PixelBox>

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
