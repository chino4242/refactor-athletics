"use client";

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useVisualMode } from '@/context/VisualModeContext';
import { getV2Theme, getDevotionName } from '@/data/v2themes';
import PixelBox, { PixelBar, ScreenWrapper } from './PixelBox';
import { PowerLevelSkeleton } from './Skeletons';
import WeeklyRecapCard from './WeeklyRecapCard';
import HealthSync from './HealthSync';
import PushRegistration from './PushRegistration';
import CreatureNarrator from './CreatureNarrator';
import DailySummary from './DailySummary';
import GuildQuestRally from './GuildQuestRally';
import BestiaryRadar from './BestiaryRadar';
import PathSwitchSheet from './PathSwitchSheet';
import PowerLevelVibrant from './PowerLevelVibrant';
import ExerciseDetailSheet from './ExerciseDetailSheet';

interface PowerLevelScreenProps {
  userId: string;
}

interface PowerLevelData {
  powerLevel: number;
  maxPossible: number;
  exercises: { name: string; exerciseId: string; level: number; expired: boolean }[];
  expiringExercises: { exerciseId: string; name: string; level: number; daysLeft: number }[];
  closestRankUps: { name: string; exerciseId: string; currentLevel: number; gap: string }[];
  recentPRs: { name: string; value: string; date: string }[];
  userPath: string;
}

const TIER_NAMES: Record<string, string[]> = {
  samurai: ['Ronin', 'Samurai', 'Daimyo', 'Shogun', 'Legendary Warrior'],
  dragon: ['Hatchling', 'Whelp', 'Drake', 'Wyrm', 'Ancient Dragon'],
  viking: ['Thrall', 'Warrior', 'Berserker', 'Jarl', 'Einherjar'],
  dinosaur: ['Fossil', 'Compy', 'Raptor', 'Allosaurus', 'T-Rex'],
  athlete: ['Rookie', 'Varsity', 'All-Star', 'Pro', 'Hall of Fame'],
};
const TIER_COLORS = ['text-amber-600', 'text-zinc-300', 'text-yellow-400', 'text-purple-300', 'text-cyan-300'];
const TIER_FLOORS = [0, 12, 24, 36, 48];


const TIER_LORE: Record<string, string[]> = {
  samurai: [
    'A wanderer with a blade. Untested, but willing.',
    'Armor earned through discipline. The rift begins to notice.',
    'A lord of war. Creatures hesitate before engaging.',
    'Commander of the rift. Others follow your path.',
    'The rift itself bends to your will.',
  ],
  dragon: [
    'A spark in the dark. The flame barely flickers.',
    'Wings unfurl. The fire finds its voice.',
    'Scales harden. Lesser creatures flee your shadow.',
    'Ancient power courses through you. The rift trembles.',
    'You are the dragon. The rift is your domain.',
  ],
  viking: [
    'A thrall with nothing. Survival is the only goal.',
    'Battle-tested. You have earned your place at the table.',
    'The fury is yours to command. Enemies scatter.',
    'Lord of the hall. Your name carries weight.',
    'Chosen of the gods. Valhalla watches.',
  ],
  dinosaur: [
    'Buried deep. Barely a whisper in the fossil record.',
    'Small but fast. You survive by instinct.',
    'The hunt is yours. Prey cannot escape.',
    'Apex of your ecosystem. Nothing challenges you.',
    'Extinction-proof. You are the ultimate predator.',
  ],
  athlete: [
    'Just getting started. Every journey begins here.',
    'Consistent and improving. You belong on the team.',
    'Standing out. Your performance speaks for itself.',
    'Elite territory. Few reach this level.',
    'Legendary. Your name goes in the record books.',
  ],
};

function getTier(pl: number, theme: string): { name: string; color: string; index: number; floor: number; ceiling: number; next?: string } {
  const names = TIER_NAMES[theme] || TIER_NAMES['athlete'];
  let idx = 4;
  if (pl < 12) idx = 0;
  else if (pl < 24) idx = 1;
  else if (pl < 36) idx = 2;
  else if (pl < 48) idx = 3;
  const ceiling = idx < 4 ? TIER_FLOORS[idx + 1] : 60;
  return { name: names[idx], color: TIER_COLORS[idx], index: idx, floor: TIER_FLOORS[idx], ceiling, next: idx < 4 ? names[idx + 1] : undefined };
}

function StoryBeat({ powerLevel, playerLevel, streak, onVisible }: { powerLevel: number; playerLevel: number; streak: number; onVisible?: (v: boolean) => void }) {
  const [beat, setBeat] = useState<{ key: string; text: string } | null>(null);

  useEffect(() => {
    const beats = [
      { key: 'first_rank', threshold: () => powerLevel >= 1, text: 'The creature yielded for the first time. It wasn\'t expecting that. Neither were you.' },
      { key: 'pl_10', threshold: () => powerLevel >= 10, text: 'Ten disciplines forged. The rift watchers request an audience.' },
      { key: 'lv_5', threshold: () => playerLevel >= 5, text: 'The rift noticed you. The creatures arrive differently now — prepared, not curious.' },
      { key: 'lv_10', threshold: () => playerLevel >= 10, text: 'Legends form in the rift. They speak of an Adventurer who refuses to stop.' },
    ];
    for (const b of beats) {
      if (b.threshold() && !localStorage.getItem(`story_beat_${b.key}`)) {
        setBeat(b);
        onVisible?.(true);
        break;
      }
    }
  }, [powerLevel, playerLevel, streak, onVisible]);

  if (!beat) return null;

  return (
    <button onClick={() => { localStorage.setItem(`story_beat_${beat.key}`, '1'); setBeat(null); onVisible?.(false); }} className="w-full mb-4 p-4 border border-amber-700 bg-amber-950/20 text-center">
      <p className="text-xs text-amber-400 italic">{beat.text}</p>
      <p className="text-xs text-zinc-600 mt-1">tap to dismiss</p>
    </button>
  );
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
  const [expanded, setExpanded] = useState(false);
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
    <button onClick={() => setExpanded(!expanded)} className={`w-full text-left px-3 py-2 mb-4 hover:bg-zinc-800/50 transition-colors`}>
      {/* Collapsed: single line */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {data.steps > 0 && <span className="text-emerald-400">👟 {data.steps.toLocaleString()}</span>}
          {data.calsIn > 0 && <span>IN {data.calsIn.toLocaleString()}</span>}
          {data.burned > 0 && <span>BURN {data.burned.toLocaleString()}</span>}
        </div>
        <span className={`text-xs font-bold ${net < 0 ? 'text-green-400' : net > 200 ? 'text-amber-400' : 'text-zinc-400'}`}>
          NET {net > 0 ? '+' : ''}{net}
        </span>
      </div>
      {/* Expanded: macro breakdown */}
      {expanded && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-blue-400">P {data.protein}g</span>
            <span className="text-orange-400">C {data.carbs}g</span>
            <span className="text-yellow-400">F {data.fat}g</span>
          </div>
          <span onClick={(e) => { e.stopPropagation(); openMealLog(); }} className="text-xs text-zinc-500 underline">meal log</span>
        </div>
      )}
    </button>

    {/* Meal Log Sheet */}
    {showMealLog && (
      <div className="fixed inset-0 z-50" onClick={() => setShowMealLog(false)}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute bottom-0 left-0 right-0 max-h-[50vh] bg-zinc-900 border-t-2 border-zinc-700 rounded-t-lg overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="p-4">
            <p className={`text-xs ${colors.secondary} font-bold mb-3`} style={{ fontFamily: "var(--font-pixel), monospace" }}>TODAY&apos;S MEALS</p>
            {mealLog.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">No meals logged today</p>
            ) : (
              <div className="space-y-1">
                {mealLog.filter(l => l.macro_type === 'calories').map(l => (
                  <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-zinc-800">
                    <div>
                      <p className="text-xs text-zinc-300">{l.label || l.meal_tag || 'Meal'}</p>
                      <p className="text-xs text-zinc-500">{l.amount} cal</p>
                    </div>
                    <button onClick={() => deleteMealEntry(l.id)} className="text-xs text-red-500 px-2 py-1 border border-red-900 bg-zinc-800 hover:bg-red-950">DEL</button>
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
  const [physique, setPhysique] = useState<{ rank: number; bodyFat: number | null; leanMass: number | null; streak: number; isFemale: boolean } | null>(null);
  const [showPhysique, setShowPhysique] = useState(false);
  const [storyBeatVisible, setStoryBeatVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [tierUp, setTierUp] = useState<{ name: string; prev: string } | null>(null);
  const [showLoreLadder, setShowLoreLadder] = useState(false);
  const [showLegacyInfo, setShowLegacyInfo] = useState(false);
  const [showXray, setShowXray] = useState(false);
  const [showPathSwitch, setShowPathSwitch] = useState(false);
  const { isVibrant: vibrantMode } = useVisualMode();
  const [avatarSex, setAvatarSex] = useState<'male' | 'female'>('male');
  const [showDailySummary, setShowDailySummary] = useState(false);
  const [questRally, setQuestRally] = useState<string | null>(null);
  const [questRallyId, setQuestRallyId] = useState<string | null>(null);
  const [partyActivity, setPartyActivity] = useState<string | null>(null);
  const [narratorState, setNarratorState] = useState<{ streak: number; todayXp: number; dailyTarget: number; hasPrToday: boolean; missedYesterday: boolean }>({ streak: 0, todayXp: 0, dailyTarget: 0, hasPrToday: false, missedYesterday: false });
  const [thresholdToast, setThresholdToast] = useState(false);
  const [bountyTeaser, setBountyTeaser] = useState<{ description: string; current: number; target: number; completed: boolean } | null>(null);
  const [healthStatus, setHealthStatus] = useState<'ok' | 'unavailable' | 'needs_reconnect' | null>(null);

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
            exerciseId: ex.exerciseId,
            name: ex.name,
            level: ex.level,
            daysLeft: ex.daysUntilExpiry,
          })),
          closestRankUps: result.closestRankUps,
          recentPRs: result.recentPRs,
          userPath: result.userPath,
        });
      } catch {
        setData({ powerLevel: 0, maxPossible: 60, exercises: [], expiringExercises: [], closestRankUps: [], recentPRs: [], userPath: 'hybrid' });
      }
      // Fetch player level (single source of truth)
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { getPlayerLevel } = await import('@/utils/getPlayerLevel');
        const pl = await getPlayerLevel(supabase, userId);
        setPlayerLevel({ level: pl.level, xp: pl.xpInLevel, xpForNext: pl.xpForNext });
      } catch {}

      // Fetch narrator state (streak, today XP, daily target, PRs, yesterday)
      try {
        const { createClient: getClient2 } = await import('@/utils/supabase/client');
        const sb2 = getClient2();
        const today = new Date().toLocaleDateString('en-CA');
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
        const weekAgo = new Date(Date.now() - 7 * 86400000).toLocaleDateString('en-CA');
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

        const [{ data: todayLedger }, { data: weekLedger }, { data: streakData }, { data: yesterdayW }, { data: todayPRs }] = await Promise.all([
          sb2.from('xp_ledger').select('amount').eq('user_id', userId).gte('created_at', todayStart.toISOString()),
          sb2.from('xp_ledger').select('amount, created_at').eq('user_id', userId).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
          sb2.from('workouts').select('date').eq('user_id', userId).gte('date', new Date(Date.now() - 60 * 86400000).toLocaleDateString('en-CA')),
          sb2.from('workouts').select('id').eq('user_id', userId).eq('date', yesterday).limit(1),
          sb2.from('workouts').select('id').eq('user_id', userId).eq('date', today).gt('level', 0).limit(1),
        ]);

        const todayXp = (todayLedger || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
        // Daily target = 7-day average
        const dailyTarget = Math.round((weekLedger || []).reduce((s: number, r: any) => s + (r.amount || 0), 0) / 7);

        // Streak calc
        const streakDates = new Set((streakData || []).map((w: any) => w.date));
        let streak = 0;
        let checkDay = streakDates.has(today) ? new Date() : new Date(Date.now() - 86400000);
        while (streakDates.has(checkDay.toLocaleDateString('en-CA'))) { streak++; checkDay.setDate(checkDay.getDate() - 1); }

        setNarratorState({
          streak,
          todayXp,
          dailyTarget: Math.max(dailyTarget, 100), // minimum 100 XP target
          hasPrToday: (todayPRs || []).length > 0,
          missedYesterday: (yesterdayW || []).length === 0,
        });

        // Daily Threshold toast: fire once per day when XP crosses target
        const thresholdKey = `threshold_${today}`;
        if (todayXp >= Math.max(dailyTarget, 100) && !localStorage.getItem(thresholdKey)) {
          localStorage.setItem(thresholdKey, '1');
          setThresholdToast(true);
          setTimeout(() => setThresholdToast(false), 4000);
        }
      } catch {}

      // Fetch nearest bounty for teaser
      try {

        // Daily Summary trigger: show on first open if not dismissed today
        const today = new Date().toLocaleDateString('en-CA');
        const summaryKey = `daily_summary_dismissed_${today}`;
        if (!localStorage.getItem(summaryKey)) {
          setShowDailySummary(true);
        }

        // Guild Quest failure rally: check for recently expired (failed) quest user hasn't seen
        try {
          const { createClient: gcRally } = await import('@/utils/supabase/client');
          const sbRally = gcRally();
          const { data: myGroup } = await sbRally.from('group_members').select('group_id').eq('user_id', userId).limit(1);
          if (myGroup?.[0]) {
            const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toLocaleDateString('en-CA');
            const { data: expiredQuests } = await sbRally.from('group_challenges')
              .select('id, name, status, end_date, results')
              .eq('group_id', myGroup[0].group_id)
              .eq('status', 'expired')
              .gte('end_date', twoDaysAgo)
              .order('end_date', { ascending: false })
              .limit(1);
            if (expiredQuests?.[0]) {
              const seenBy: string[] = expiredQuests[0].results?.rally_seen_by || [];
              if (!seenBy.includes(userId)) {
                setQuestRally(expiredQuests[0].name);
                setQuestRallyId(expiredQuests[0].id);
              }
            }
          }
        } catch {}

        // Party activity — what did your partner do today?
        try {
          const { createClient: gc } = await import('@/utils/supabase/client');
          const sbp = gc();
          const { data: myGroups } = await sbp.from('group_members').select('group_id').eq('user_id', userId).limit(1);
          if (myGroups?.[0]) {
            const { data: members } = await sbp.from('group_members').select('user_id, users(display_name)').eq('group_id', myGroups[0].group_id).neq('user_id', userId).limit(1);
            if (members?.[0]) {
              const partnerId = members[0].user_id;
              const partnerName = (members[0] as any).users?.display_name || 'Ally';
              const todayStart = new Date(today + 'T00:00:00').toISOString();
              const { data: partnerXp } = await sbp.from('xp_ledger').select('amount').eq('user_id', partnerId).gte('created_at', todayStart);
              const xp = (partnerXp || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
              if (xp > 0) setPartyActivity(`${partnerName} earned ${xp} XP today`);
            }
          }
        } catch {}

        const { getWeeklyBounties } = await import('@/services/bountyService');
        const bounties = await getWeeklyBounties(userId);
        // Pick the closest-to-completion incomplete bounty
        const incomplete = bounties.filter(b => !b.completed).sort((a, b) => (b.current / b.target) - (a.current / a.target));
        if (incomplete.length > 0) {
          const best = incomplete[0];
          setBountyTeaser({ description: best.description, current: best.current, target: best.target, completed: false });
        } else if (bounties.length > 0 && bounties.every(b => b.completed)) {
          setBountyTeaser({ description: 'All bounties swept!', current: 1, target: 1, completed: true });
        }
      } catch {}

      // Fetch physique rank (body composition)
      try {
        const { createClient: getClient } = await import('@/utils/supabase/client');
        const sb = getClient();
        const { data: measurements } = await sb.from('body_measurements').select('body_fat_percentage, lean_body_mass, date').eq('user_id', userId).not('body_fat_percentage', 'is', null).order('date', { ascending: false }).limit(8);
        if (measurements?.length) {
          const latest = measurements[0];
          const bf = latest.body_fat_percentage;
          // Get user sex for appropriate BF% brackets
          const { data: userSexData } = await sb.from('users').select('sex').eq('id', userId).single();
          const isFemale = (userSexData?.sex || 'male').toLowerCase() === 'female';
          setAvatarSex(isFemale ? 'female' : 'male');
          // Rank from BF%: female brackets are higher (women naturally carry more body fat)
          const rank = isFemale
            ? (bf <= 18 ? 5 : bf <= 22 ? 4 : bf <= 28 ? 3 : bf <= 35 ? 2 : 1)
            : (bf <= 10 ? 5 : bf <= 15 ? 4 : bf <= 20 ? 3 : bf <= 25 ? 2 : 1);
          // Recomp streak: consecutive weeks where BF went down or lean mass went up
          let streak = 0;
          for (let i = 0; i < measurements.length - 1; i++) {
            const curr = measurements[i];
            const prev = measurements[i + 1];
            if ((curr.body_fat_percentage < prev.body_fat_percentage) || (curr.lean_body_mass > prev.lean_body_mass)) streak++;
            else break;
          }
          setPhysique({ rank, bodyFat: bf, leanMass: latest.lean_body_mass, streak, isFemale });
        }
      } catch {}

      // Update Android widget with daily progress
      try {
        const { updateWidget } = await import('@/services/widgetBridge');
        const { getTodayXp } = await import('@/utils/getTodayXp');
        const { getHabitProgress } = await import('@/services/api');
        const { createClient: wcClient } = await import('@/utils/supabase/client');
        const wSb = wcClient();
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const startTs = Math.floor(startOfDay.getTime() / 1000);
        const [{ totalXp }, habitData] = await Promise.all([
          getTodayXp(userId),
          getHabitProgress(userId, startTs),
        ]);
        const totals = habitData?.totals || {};
        const questChecks = [
          (totals['habit_steps'] || 0) >= 7500,
          (totals['habit_sleep'] || 0) >= 7,
          (totals['macro_protein'] || 0) >= 100,
          (totals['habit_water'] || 0) >= 64,
          totalXp >= 50,
        ];
        const dateStr = startOfDay.toLocaleDateString('en-CA');
        const { data: recentDays } = await wSb.from('habit_logs')
          .select('date').eq('user_id', userId).lte('date', dateStr)
          .order('date', { ascending: false }).limit(90);
        let widgetStreak = 0;
        if (recentDays?.length) {
          const activeDates = new Set(recentDays.map((r: any) => r.date));
          const d = new Date(startOfDay);
          while (activeDates.has(d.toLocaleDateString('en-CA'))) { widgetStreak++; d.setDate(d.getDate() - 1); }
        }
        await updateWidget({
          streak: widgetStreak,
          level: playerLevel?.level || 1,
          xp: totalXp,
          questsDone: questChecks.filter(Boolean).length,
          questsTotal: questChecks.length,
          steps: totals['habit_steps'] || 0,
          sleep: totals['habit_sleep'] || 0,
          protein: totals['macro_protein'] || 0,
        });
      } catch {}

      setLoading(false);
    })();
  }, [userId, refreshKey]);

  // Detect tier-up (must be before early returns — hooks must always run)
  const tierIndex = data ? getTier(data.powerLevel, currentTheme).index : -1;
  useEffect(() => {
    if (tierIndex < 0) return;
    const key = `tier_seen_${currentTheme}`;
    const lastSeen = parseInt(localStorage.getItem(key) || '0');
    if (tierIndex > lastSeen) {
      const prevNames = (TIER_NAMES[currentTheme] || TIER_NAMES['athlete']);
      const names = TIER_NAMES[currentTheme] || TIER_NAMES['athlete'];
      setTierUp({ name: names[tierIndex], prev: prevNames[lastSeen] || '' });
      localStorage.setItem(key, String(tierIndex));
    }
  }, [tierIndex, currentTheme]);

  if (loading) {
    return <PowerLevelSkeleton />;
  }

  if (!data) return null;

  const tier = getTier(data.powerLevel, currentTheme);

  return (
    <ScreenWrapper onRefresh={async () => { setRefreshKey(k => k + 1); }}>
      <HealthSync userId={userId} refreshKey={refreshKey} onSyncComplete={() => setRefreshKey(k => k + 1)} onSyncStatus={setHealthStatus} />
      <PushRegistration userId={userId} />

      {/* Daily Summary (yesterday's recap — fires on first open) */}
      {showDailySummary && (
        <DailySummary userId={userId} onDismiss={() => {
          setShowDailySummary(false);
          localStorage.setItem(`daily_summary_dismissed_${new Date().toLocaleDateString('en-CA')}`, '1');
        }} />
      )}

      {/* Guild Quest failure rally */}
      {questRally && !showDailySummary && (
        <GuildQuestRally questName={questRally} onDismiss={async () => {
          setQuestRally(null);
          if (questRallyId) {
            try {
              const { createClient: gcDismiss } = await import('@/utils/supabase/client');
              const sbDismiss = gcDismiss();
              const { data: current } = await sbDismiss.from('group_challenges').select('results').eq('id', questRallyId).single();
              const results = current?.results || {};
              const seenBy: string[] = results.rally_seen_by || [];
              if (!seenBy.includes(userId)) {
                seenBy.push(userId);
                await sbDismiss.from('group_challenges').update({ results: { ...results, rally_seen_by: seenBy } }).eq('id', questRallyId);
              }
            } catch {}
          }
        }} />
      )}

      {/* Health Sync Status Banner */}
      {healthStatus === 'unavailable' && (
        <div className="mb-4 p-3 border border-amber-800 bg-amber-950/20 flex items-center gap-2">
          <span className="text-amber-400 text-sm">⚠️</span>
          <p className="text-xs text-amber-300">Health sync unavailable — install the native app from TestFlight for automatic workout tracking.</p>
        </div>
      )}
      {healthStatus === 'needs_reconnect' && (
        <div className="mb-4 p-3 border border-red-800 bg-red-950/20 flex items-center gap-2">
          <span className="text-red-400 text-sm">⚠️</span>
          <p className="text-xs text-red-300">Health sync failing — open Settings → Health → Refactor Athletics and re-enable permissions.</p>
        </div>
      )}

      {/* Tier-Up Celebration */}
      {tierUp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={() => setTierUp(null)}>
          <div className="absolute inset-0 bg-black/90" />
          <div className="relative text-center space-y-4 px-8 animate-in fade-in zoom-in duration-500">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              TIER ASCENSION
            </p>
            {tierUp.prev && (
              <p className="text-base text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {tierUp.prev}
              </p>
            )}
            <p className="text-zinc-600 text-lg">↓</p>
            <p className={`text-3xl ${tier.color} font-bold`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {tierUp.name.toUpperCase()}
            </p>
            <p className="text-xs text-zinc-500 italic mt-4">
              {currentTheme === 'samurai' ? 'Your blade carries a new weight. The rift bows.' :
               currentTheme === 'dragon' ? 'The fire within burns brighter. You have evolved.' :
               currentTheme === 'viking' ? 'The sagas will remember this day.' :
               currentTheme === 'dinosaur' ? 'You are no longer prey. You are the apex.' :
               'A new chapter begins.'}
            </p>
            <p className="text-xs text-zinc-700 mt-6">tap to continue</p>
          </div>
        </div>
      )}

      {/* Daily Threshold Toast */}
      {thresholdToast && currentTheme !== 'athlete' && (
        <div className="fixed top-16 left-4 right-4 z-50 animate-in slide-in-from-top duration-300" onClick={() => setThresholdToast(false)}>
          <div className={`flex items-center gap-3 p-4 border ${colors.primary} bg-zinc-900 shadow-lg`}>
            <img src={`/enemies/${currentTheme === 'dragon' ? 'dragon' : 'samurai'}/back_squat_t1.png`} alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
            <div>
              <p className={`text-xs ${colors.secondary} uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>★ DAY CLAIMED</p>
              <p className="text-xs text-zinc-200 italic">&ldquo;{narratorState.todayXp} XP earned. The rift remembers this day.&rdquo;</p>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Recap (shows Sun-Tue) */}
      <WeeklyRecapCard userId={userId} />

      {/* Theme Banner */}
      <div className={`mb-4 overflow-hidden ${vibrantMode ? 'rounded-2xl border border-zinc-700/20' : 'border-2 border-zinc-800 rounded-sm max-h-[120px]'}`}>
        <img
          src={`/themes/${currentTheme}/v2/banner.png`}
          alt=""
          className="w-full h-full object-cover"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Vibrant Proof of Concept */}
      {vibrantMode && (
        <PowerLevelVibrant
          powerLevel={data.powerLevel}
          maxPossible={data.maxPossible}
          exercises={data.exercises}
          tierName={tier.name}
          tierIndex={tier.index}
          tierFloor={tier.floor}
          tierCeiling={tier.ceiling}
          nextTierName={tier.next}
          expiringExercises={data.expiringExercises}
          closestRankUps={data.closestRankUps}
          recentPRs={data.recentPRs}
          streak={narratorState.streak}
          todayXp={narratorState.todayXp}
          playerLevel={playerLevel}
          userPath={data.userPath}
          onPathSwitch={() => setShowPathSwitch(true)}
          onExerciseTap={(id) => setSelectedExercise(id)}
        />
      )}

      {/* Creature Narrator */}
      <div className={vibrantMode ? 'hidden' : ''}>
      {currentTheme !== 'athlete' && (
        <CreatureNarrator
          theme={currentTheme}
          streak={narratorState.streak}
          todayXp={narratorState.todayXp}
          dailyTarget={narratorState.dailyTarget}
          hasPrToday={narratorState.hasPrToday}
          missedYesterday={narratorState.missedYesterday}
          expiringCount={data.expiringExercises.length}
          colors={colors}
        />
      )}

      {/* Party activity */}
      {partyActivity && (
        <p className="text-xs text-zinc-600 italic text-center mb-2 px-1">{partyActivity}</p>
      )}

      {/* Nutrition summary */}
      <NutritionBar userId={userId} colors={colors} refreshKey={refreshKey} />

      {/* Hero Power Level — tap for X-ray */}
      <PixelBox highlight className="p-5 mb-4">
        <button onClick={() => setShowXray(!showXray)} className="w-full text-center">
          {!showXray ? (
            <>
              {currentTheme !== 'athlete' && (
                <img
                  src={`/avatars/${currentTheme}/${avatarSex}_t${tier.index}.png`}
                  alt={`${tier.name} avatar`}
                  className="w-16 h-16 mx-auto mb-2"
                  style={{ imageRendering: 'pixelated' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <p className={`text-[10px] ${colors.headerText} mb-1 uppercase tracking-wider`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                POWER LV
              </p>
              <span className="text-5xl text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {data.powerLevel}
              </span>
              <span role="button" onClick={(e) => { e.stopPropagation(); setShowLoreLadder(!showLoreLadder); }} className={`text-[10px] mt-2 uppercase tracking-widest ${tier.color} block cursor-pointer`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                ▸ {tier.name} ◂
              </span>
              {/* Lore Ladder */}
              {showLoreLadder && (
                <div className="mt-3 space-y-2 text-left">
                  {(TIER_NAMES[currentTheme] || TIER_NAMES['athlete']).map((name, i) => {
                    const isCurrent = i === tier.index;
                    const isLocked = i > tier.index;
                    const lore = TIER_LORE[currentTheme]?.[i] || TIER_LORE['athlete'][i];
                    return (
                      <div key={i} className={`px-3 py-2 border ${isCurrent ? colors.primary + ' bg-zinc-800' : 'border-zinc-800'} ${isLocked ? 'opacity-40' : ''}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs ${isCurrent ? colors.secondary : isLocked ? 'text-zinc-600' : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                            {isCurrent ? '▸ ' : isLocked ? '○ ' : '✓ '}{name}
                          </span>
                          <span className="text-xs text-zinc-600" style={{ fontFamily: "var(--font-pixel), monospace" }}>PL {TIER_FLOORS[i]}</span>
                        </div>
                        <p className="text-xs text-zinc-500 italic mt-0.5">{lore}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <p className={`text-[10px] ${colors.headerText} mb-1 uppercase tracking-wider`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {currentTheme === 'athlete' ? 'RANKED EXERCISES' : 'BESTIARY'}
              </p>
              {/* Path label */}
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  PATH: {(data.userPath || 'hybrid').toUpperCase()} · 8 core + 4 specialty
                </p>
                <span role="button" onClick={(e) => { e.stopPropagation(); setShowPathSwitch(true); }} className={`text-xs px-2 py-0.5 border ${colors.border} ${colors.secondary} bg-zinc-800 cursor-pointer`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  SWITCH
                </span>
              </div>
              {currentTheme !== 'athlete' && (
                <p className="text-xs text-zinc-500 mb-2">
                  {data.exercises.filter(ex => ex.level > 0 && !ex.expired).length}/12 Allied
                </p>
              )}
              {/* Shape Radar */}
              <BestiaryRadar exercises={data.exercises} accentColor={
                currentTheme === 'dragon' ? '#ef4444' :
                currentTheme === 'samurai' ? '#ec4899' :
                currentTheme === 'viking' ? '#38bdf8' :
                currentTheme === 'dinosaur' ? '#22c55e' :
                '#a1a1aa'
              } />
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
                  const normalized = ex.exerciseId.replace(/^(barbell|dumbbell|smith_machine|cable|machine)_/, '');
                  const state = ex.level === 0 ? 'unmet' : ex.expired ? 'dormant' : 'allied';
                  const spriteTier = ex.level >= 4 ? 2 : ex.level >= 2 ? 1 : 0;
                  const spriteSrc = `/enemies/${currentTheme}/${normalized}_t${spriteTier}.png`;
                  // State pips
                  const isExpiring = data.expiringExercises.some(e => e.exerciseId === ex.exerciseId);
                  const isClosest = data.closestRankUps.some(r => r.exerciseId === ex.exerciseId);
                  return (
                  <div key={ex.exerciseId} onClick={(e) => { e.stopPropagation(); setSelectedExercise(ex.exerciseId); }} className="flex flex-col items-center gap-1 cursor-pointer">
                    <div className={`relative w-8 h-8 border ${borderClass} ${state === 'dormant' ? 'opacity-40' : state === 'unmet' ? 'opacity-25' : ''} flex items-center justify-center bg-zinc-800 overflow-hidden`}>
                      {/* State pip */}
                      {isExpiring && (
                        <span className="absolute top-0 left-0.5 text-[6px] text-amber-400 z-10">⚠</span>
                      )}
                      {!isExpiring && isClosest && (
                        <span className="absolute top-0 left-0.5 text-[6px] text-green-400 z-10">↑</span>
                      )}
                      {currentTheme !== 'athlete' ? (
                        <img src={spriteSrc} alt="" className="w-7 h-7" style={{ imageRendering: 'pixelated' }} onError={(e) => { (e.target as HTMLImageElement).src = `/themes/${currentTheme}/v2/level${ex.level}.png`; }} />
                      ) : (
                        <img src={`/themes/${currentTheme}/v2/level${ex.level}.png`} alt="" className="w-6 h-6" style={{ imageRendering: 'pixelated' }} />
                      )}
                      {ex.level > 0 && !ex.expired && (
                        <span className={`absolute bottom-0 right-0.5 text-xs font-bold ${levelTextColors[ex.level]}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{ex.level}</span>
                      )}
                    </div>
                    <span className={`text-xs ${state === 'allied' ? 'text-zinc-300' : 'text-zinc-600'} truncate max-w-[60px]`}>
                      {ex.name.split(' ').slice(0, 2).join(' ')}
                    </span>
                  </div>
                  );
                })}
              </div>
              <p className="text-xs text-zinc-600 mt-3">tap to close</p>
            </>
          )}
        </button>
        {!showXray && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-zinc-500 mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              <span>{data.powerLevel - tier.floor}/{tier.ceiling - tier.floor}</span>
              {tier.next && <span>{tier.ceiling - data.powerLevel} more to {tier.next}</span>}
            </div>
            <PixelBar current={data.powerLevel - tier.floor} max={tier.ceiling - tier.floor} />
            {/* Bestiary preview — top 3 actionable exercises */}
            <div className="mt-3 space-y-1.5">
              {(() => {
                const slots: { icon: string; name: string; detail: string; color: string }[] = [];
                // Priority 1: expiring exercises
                for (const ex of data.expiringExercises.slice(0, 2)) {
                  slots.push({ icon: '⚠', name: ex.name, detail: `${ex.daysLeft}d left`, color: ex.daysLeft <= 3 ? 'text-red-400' : 'text-amber-400' });
                }
                // Priority 2: closest rank-ups
                for (const ex of data.closestRankUps) {
                  if (slots.length >= 3) break;
                  if (slots.find(s => s.name === ex.name)) continue;
                  slots.push({ icon: '↑', name: ex.name, detail: ex.gap, color: colors.secondary });
                }
                // Priority 3: recent PRs
                for (const pr of data.recentPRs) {
                  if (slots.length >= 3) break;
                  if (slots.find(s => s.name === pr.name)) continue;
                  slots.push({ icon: '★', name: pr.name, detail: 'NEW PR', color: 'text-amber-300' });
                }
                if (slots.length === 0) {
                  return <p className="text-xs text-zinc-600 text-center">Complete a ranked exercise to fill your Bestiary</p>;
                }
                return slots.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className={`text-xs ${s.color}`}>{s.icon} <span className="text-zinc-300">{s.name}</span></span>
                    <span className={`text-xs ${s.color}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{s.detail}</span>
                  </div>
                ));
              })()}
            </div>
            <p className="text-xs text-zinc-600 text-center mt-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              tap for full bestiary →
            </p>
          </div>
        )}
      </PixelBox>

      {/* Legacy / Commitment strip — separate from Power Level */}
      {playerLevel && (
        <div className="relative mb-4">
          <div className="flex items-center gap-2 px-1">
            {(() => {
              const devotion = getDevotionName(currentTheme);
              const pct = Math.round((playerLevel.xp / playerLevel.xpForNext) * 100);
              const xpLeft = playerLevel.xpForNext - playerLevel.xp;
              const isClose = pct >= 85;
              return (
                <>
                  <span className="text-xs">{devotion.icon}</span>
                  <span className="text-xs text-amber-300 whitespace-nowrap" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    {devotion.label} {playerLevel.level} → {playerLevel.level + 1}
                  </span>
                  <div className="flex-1 h-[4px] bg-zinc-800 border border-zinc-700/50 flex">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className={`flex-1 border-r border-zinc-900 ${i < Math.round(pct / 100 * 12) ? 'bg-amber-500' : ''}`} />
                    ))}
                  </div>
                  <span className={`text-xs whitespace-nowrap ${isClose ? 'text-amber-400 animate-pulse' : 'text-zinc-500'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    {xpLeft.toLocaleString()} XP to go
                  </span>
                  <button onClick={() => setShowLegacyInfo(prev => !prev)} className="text-xs text-zinc-600 hover:text-zinc-400">
                    ⓘ
                  </button>
                </>
              );
            })()}
          </div>
          {showLegacyInfo && (
            <div className={`mt-2 mx-1 p-3 border ${colors.border} bg-zinc-900 text-xs text-zinc-300 leading-relaxed`}>
              <p>Your <span className="text-amber-300">{getDevotionName(currentTheme).label}</span> grows every time you train, track food, or complete challenges. It never goes down — it&apos;s your permanent record of commitment.</p>
              <button onClick={() => setShowLegacyInfo(false)} className="mt-2 text-xs text-zinc-500 uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>GOT IT</button>
            </div>
          )}
        </div>
      )}

      {/* Player Level merged into PL box below */}

      {/* Physique Rank (below fold) */}
      {physique && (
        <button onClick={() => setShowPhysique(p => !p)} className="w-full text-left">
        <PixelBox className="p-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className={`text-xs ${colors.headerText} uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>PHYSIQUE LV {physique.rank}</span>
              <div className="flex gap-3 mt-1 text-xs">
                {physique.bodyFat !== null && <span className="text-zinc-300">BF {Number(physique.bodyFat).toFixed(1)}%</span>}
                {physique.leanMass !== null && <span className="text-zinc-300">LEAN {Math.round(physique.leanMass)} lbs</span>}
              </div>
            </div>
            {physique.streak >= 2 && (
              <span className="text-xs text-amber-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>🔥 {physique.streak}wk streak</span>
            )}
          </div>
          {showPhysique && physique.bodyFat !== null && (
            <div className="mt-3 pt-2 border-t border-zinc-800 space-y-1">
              {(physique.isFemale ? [
                { lv: 1, range: '> 35%', target: 35 },
                { lv: 2, range: '28-35%', target: 28 },
                { lv: 3, range: '22-28%', target: 22 },
                { lv: 4, range: '18-22%', target: 18 },
                { lv: 5, range: '< 18%', target: 14 },
              ] : [
                { lv: 1, range: '> 25%', target: 25 },
                { lv: 2, range: '20-25%', target: 20 },
                { lv: 3, range: '15-20%', target: 15 },
                { lv: 4, range: '10-15%', target: 10 },
                { lv: 5, range: '< 10%', target: 5 },
              ]).map(t => {
                const current = physique.rank >= t.lv;
                const isNext = physique.rank === t.lv - 1;
                const gap = isNext && physique.bodyFat !== null ? (physique.bodyFat - t.target).toFixed(1) : null;
                return (
                  <div key={t.lv} className={`flex items-center justify-between text-xs ${current ? 'text-zinc-300' : 'text-zinc-600'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
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

      {/* Closest rank-ups */}
      {/* Recent PRs */}
      {data.recentPRs.length > 0 && (
        <PixelBox className="p-4 mb-4">
          <p className={`text-xs ${colors.headerText} mb-3 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            ★ NEW RECORDS
          </p>
          <div className="space-y-2">
            {data.recentPRs.map((pr) => (
              <div key={pr.name + pr.date} className="flex items-center justify-between">
                <span className="text-sm text-zinc-200">{pr.name}</span>
                <span className={`text-xs ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{pr.value}</span>
              </div>
            ))}
          </div>
        </PixelBox>
      )}

      {/* Bounty Teaser (footer nudge) */}
      {bountyTeaser && (
        <button onClick={() => { window.location.hash = 'arena'; }} className={`w-full flex items-center justify-between px-3 py-2 mb-4 ${bountyTeaser.completed ? 'text-green-400' : 'text-zinc-500'}`}>
          <span className="text-xs" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {bountyTeaser.completed ? '✓ BOUNTIES SWEPT' : `◎ ${bountyTeaser.description}`}
          </span>
          {!bountyTeaser.completed && (
            <span className="text-xs text-zinc-600" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {bountyTeaser.current}/{bountyTeaser.target}
            </span>
          )}
        </button>
      )}

      {/* Empty state */}
      {data.powerLevel === 0 && (
        <PixelBox highlight className="p-5 text-center">
          <p className={`text-xs ${colors.secondary} mb-2`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            YOUR JOURNEY BEGINS
          </p>
          <p className="text-sm text-zinc-400 mb-1">12 ranked exercises determine your Power Level.</p>
          <p className="text-sm text-zinc-500 mb-4">Test one to discover your first rank.</p>
          <a
            href="/train/active?mode=flexible&filter=strength"
            className={`inline-block text-xs px-5 py-3 border-2 ${colors.primary} bg-zinc-800 text-white hover:bg-zinc-700 transition-colors`}
            style={{ fontFamily: "var(--font-pixel), monospace" }}
          >
            ⚔ TEST YOUR STRENGTH
          </a>
          <a
            href="/train"
            className="block mt-3 text-xs text-zinc-600 hover:text-zinc-400"
            style={{ fontFamily: "var(--font-pixel), monospace" }}
          >
            or start today&apos;s workout ▸
          </a>
        </PixelBox>
      )}

      </div>{/* end vibrantMode hide wrapper */}

      {/* Exercise Detail Sheet */}
      {selectedExercise && (
        <ExerciseDetailSheet exerciseId={selectedExercise} userId={userId} exercises={data.exercises} onClose={() => setSelectedExercise(null)} colors={colors} currentTheme={currentTheme} />
      )}
      {showPathSwitch && (
        <PathSwitchSheet
          userId={userId}
          currentPath={data.userPath || 'hybrid'}
          exercises={data.exercises}
          onConfirm={() => { setShowPathSwitch(false); setRefreshKey(k => k + 1); }}
          onClose={() => setShowPathSwitch(false)}
        />
      )}
    </ScreenWrapper>
  );
}


