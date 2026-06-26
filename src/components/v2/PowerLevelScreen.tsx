"use client";

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';
import PixelBox, { PixelBar, ScreenWrapper } from './PixelBox';
import { PowerLevelSkeleton } from './Skeletons';
import WeeklyRecapCard from './WeeklyRecapCard';
import HealthSync from './HealthSync';
import PushRegistration from './PushRegistration';
import CreatureNarrator from './CreatureNarrator';
import DailySummary from './DailySummary';

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


const ENEMY_NAMES_PL: Record<string, Record<string, string>> = {
  samurai: { back_squat: 'Oni', deadlift: 'Earth Yokai', bench_press: 'Armor', pull_up: 'Tengu', overhead_press: 'Thunder Oni', run_1_mile: 'Fox Spirit', plank: 'Kappa', push_ups: 'Ninjas', run_400m: 'Kunai', dead_hang: 'Chain Spirit', barbell_row: 'Kraken', run_5k: 'Wind Kami' },
  dragon: { back_squat: 'Golem', deadlift: 'Iron Wyrm', bench_press: 'Fire Shield', pull_up: 'Sky Drake', overhead_press: 'Thunder Dragon', run_1_mile: 'Wind Serpent', plank: 'Lava Tortoise', push_ups: 'Fire Sprites', run_400m: 'Lightning Drake', dead_hang: 'Gravity Phantom', barbell_row: 'Deep Wyrm', run_5k: 'Storm Dragon' },
  viking: { back_squat: 'Frost Troll', deadlift: 'Draugr', bench_press: 'War Shield', pull_up: 'Storm Raven', overhead_press: 'Lightning Giant', run_1_mile: 'Fenrir', plank: 'Glacier', push_ups: 'Berserkers', run_400m: 'Valkyrie', dead_hang: 'Anchor Wraith', barbell_row: 'Sea Serpent', run_5k: 'Odin\'s Hunt' },
  dinosaur: { back_squat: 'Mammoth', deadlift: 'T-Rex', bench_press: 'Triceratops', pull_up: 'Pterodactyl', overhead_press: 'Brachiosaurus', run_1_mile: 'Velociraptor', plank: 'Ankylosaurus', push_ups: 'Compys', run_400m: 'Raptor', dead_hang: 'Tar Pit', barbell_row: 'Mosasaurus', run_5k: 'Migration' },
};

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
      <p className="text-[9px] text-amber-400 italic">{beat.text}</p>
      <p className="text-[7px] text-zinc-600 mt-1">tap to dismiss</p>
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
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          {data.steps > 0 && <span className="text-emerald-400">👟 {data.steps.toLocaleString()}</span>}
          {data.calsIn > 0 && <span>IN {data.calsIn.toLocaleString()}</span>}
          {data.burned > 0 && <span>BURN {data.burned.toLocaleString()}</span>}
        </div>
        <span className={`text-[10px] font-bold ${net < 0 ? 'text-green-400' : net > 200 ? 'text-amber-400' : 'text-zinc-400'}`}>
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
          <span onClick={(e) => { e.stopPropagation(); openMealLog(); }} className="text-[8px] text-zinc-500 underline">meal log</span>
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
  const [physique, setPhysique] = useState<{ rank: number; bodyFat: number | null; leanMass: number | null; streak: number; isFemale: boolean } | null>(null);
  const [showPhysique, setShowPhysique] = useState(false);
  const [storyBeatVisible, setStoryBeatVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [tierUp, setTierUp] = useState<{ name: string; prev: string } | null>(null);
  const [showLoreLadder, setShowLoreLadder] = useState(false);
  const [showXray, setShowXray] = useState(false);
  const [avatarSex, setAvatarSex] = useState<'male' | 'female'>('male');
  const [showDailySummary, setShowDailySummary] = useState(false);
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
        });
      } catch {
        setData({ powerLevel: 0, maxPossible: 60, exercises: [], expiringExercises: [], closestRankUps: [], recentPRs: [] });
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

      {/* Health Sync Status Banner */}
      {healthStatus === 'unavailable' && (
        <div className="mb-4 p-3 border border-amber-800 bg-amber-950/20 flex items-center gap-2">
          <span className="text-amber-400 text-sm">⚠️</span>
          <p className="text-[9px] text-amber-300">Health sync unavailable — install the native app from TestFlight for automatic workout tracking.</p>
        </div>
      )}
      {healthStatus === 'needs_reconnect' && (
        <div className="mb-4 p-3 border border-red-800 bg-red-950/20 flex items-center gap-2">
          <span className="text-red-400 text-sm">⚠️</span>
          <p className="text-[9px] text-red-300">Health sync failing — open Settings → Health → Refactor Athletics and re-enable permissions.</p>
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
              <p className="text-sm text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {tierUp.prev}
              </p>
            )}
            <p className="text-zinc-600 text-lg">↓</p>
            <p className={`text-3xl ${tier.color} font-bold`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {tierUp.name.toUpperCase()}
            </p>
            <p className="text-[10px] text-zinc-500 italic mt-4">
              {currentTheme === 'samurai' ? 'Your blade carries a new weight. The rift bows.' :
               currentTheme === 'dragon' ? 'The fire within burns brighter. You have evolved.' :
               currentTheme === 'viking' ? 'The sagas will remember this day.' :
               currentTheme === 'dinosaur' ? 'You are no longer prey. You are the apex.' :
               'A new chapter begins.'}
            </p>
            <p className="text-[8px] text-zinc-700 mt-6">tap to continue</p>
          </div>
        </div>
      )}

      {/* Daily Threshold Toast */}
      {thresholdToast && currentTheme !== 'athlete' && (
        <div className="fixed top-16 left-4 right-4 z-50 animate-in slide-in-from-top duration-300" onClick={() => setThresholdToast(false)}>
          <div className={`flex items-center gap-3 p-4 border ${colors.primary} bg-zinc-900 shadow-lg`}>
            <img src={`/enemies/${currentTheme === 'dragon' ? 'dragon' : 'samurai'}/back_squat_t1.png`} alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
            <div>
              <p className={`text-[9px] ${colors.secondary} uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>★ DAY CLAIMED</p>
              <p className="text-[10px] text-zinc-200 italic">&ldquo;{narratorState.todayXp} XP earned. The rift remembers this day.&rdquo;</p>
            </div>
          </div>
        </div>
      )}

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

      {/* Creature Narrator */}
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
        <p className="text-[8px] text-zinc-600 italic text-center mb-2 px-1">{partyActivity}</p>
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
                          <span className={`text-[9px] ${isCurrent ? colors.secondary : isLocked ? 'text-zinc-600' : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                            {isCurrent ? '▸ ' : isLocked ? '○ ' : '✓ '}{name}
                          </span>
                          <span className="text-[7px] text-zinc-600" style={{ fontFamily: "var(--font-pixel), monospace" }}>PL {TIER_FLOORS[i]}</span>
                        </div>
                        <p className="text-[8px] text-zinc-500 italic mt-0.5">{lore}</p>
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
              {currentTheme !== 'athlete' && (
                <p className="text-[8px] text-zinc-500 mb-3">
                  {data.exercises.filter(ex => ex.level > 0 && !ex.expired).length}/12 Allied
                </p>
              )}
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
                  return (
                  <div key={ex.exerciseId} onClick={(e) => { e.stopPropagation(); setSelectedExercise(ex.exerciseId); }} className="flex flex-col items-center gap-1 cursor-pointer">
                    <div className={`relative w-8 h-8 border ${borderClass} ${state === 'dormant' ? 'opacity-40' : state === 'unmet' ? 'opacity-25' : ''} flex items-center justify-center bg-zinc-800 overflow-hidden`}>
                      {currentTheme !== 'athlete' ? (
                        <img src={spriteSrc} alt="" className="w-7 h-7" style={{ imageRendering: 'pixelated' }} onError={(e) => { (e.target as HTMLImageElement).src = `/themes/${currentTheme}/v2/level${ex.level}.png`; }} />
                      ) : (
                        <img src={`/themes/${currentTheme}/v2/level${ex.level}.png`} alt="" className="w-6 h-6" style={{ imageRendering: 'pixelated' }} />
                      )}
                      {ex.level > 0 && !ex.expired && (
                        <span className={`absolute bottom-0 right-0.5 text-[7px] font-bold ${levelTextColors[ex.level]}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{ex.level}</span>
                      )}
                    </div>
                    <span className={`text-[7px] ${state === 'allied' ? 'text-zinc-300' : 'text-zinc-600'} truncate max-w-[60px]`}>
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
              <span>{data.powerLevel - tier.floor}/{tier.ceiling - tier.floor}</span>
              {tier.next && <span>{tier.ceiling - data.powerLevel} more to {tier.next}</span>}
            </div>
            <PixelBar current={data.powerLevel - tier.floor} max={tier.ceiling - tier.floor} />
            {playerLevel && (
              <p className="text-[8px] text-zinc-500 text-center mt-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                LV {playerLevel.level} · {playerLevel.xp.toLocaleString()}/{playerLevel.xpForNext.toLocaleString()} XP
              </p>
            )}
          </div>
        )}
      </PixelBox>

      {/* Player Level merged into PL box below */}

      {/* ─── Detail Sections ─── */}
      {(data.expiringExercises.length > 0 || data.closestRankUps.length > 0 || data.recentPRs.length > 0) && (
        <div className="border-t border-zinc-800 mt-2 mb-4 pt-1">
          <p className="text-[7px] text-zinc-700 text-center" style={{ fontFamily: "var(--font-pixel), monospace" }}>DETAILS</p>
        </div>
      )}

      {/* Expiring exercises */}
      {data.expiringExercises.length > 0 && (
        <PixelBox className="p-4 mb-4">
          <p className="text-[10px] text-amber-400 mb-3 uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {currentTheme === 'athlete' ? '⚠ EXPIRING' : '⚠ GROWING RESTLESS'}
          </p>
          <div className="space-y-2">
            {data.expiringExercises.map((ex) => {
              const normalized = ex.exerciseId.replace(/^(barbell|dumbbell|smith_machine|cable|machine)_/, '');
              const creature = currentTheme !== 'athlete' ? ENEMY_NAMES_PL[currentTheme]?.[normalized] : null;
              return (
              <div key={ex.name}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={`/themes/${currentTheme}/v2/level${ex.level}.png`} alt={`Level ${ex.level}`} className="w-6 h-6" style={{ imageRendering: 'pixelated' }} />
                    <span className="text-xs text-zinc-200">{ex.name}</span>
                  </div>
                  <span className={`text-[8px] ${ex.daysLeft <= 3 ? 'text-red-400' : ex.daysLeft <= 7 ? 'text-amber-400' : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{ex.daysLeft}D</span>
                </div>
                {creature && (
                  <p className="text-[8px] text-zinc-600 italic ml-8 mt-0.5">
                    {ex.daysLeft <= 3 ? `${creature} is drifting. Prove yourself again.` : `${creature} grows impatient. Don't let it sleep.`}
                  </p>
                )}
              </div>
              );
            })}
          </div>
        </PixelBox>
      )}

      {/* Physique Rank (below fold) */}
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

      {/* Bounty Teaser (footer nudge) */}
      {bountyTeaser && (
        <button onClick={() => { window.location.hash = 'arena'; }} className={`w-full flex items-center justify-between px-3 py-2 mb-4 ${bountyTeaser.completed ? 'text-green-400' : 'text-zinc-500'}`}>
          <span className="text-[8px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {bountyTeaser.completed ? '✓ BOUNTIES SWEPT' : `◎ ${bountyTeaser.description}`}
          </span>
          {!bountyTeaser.completed && (
            <span className="text-[8px] text-zinc-600" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {bountyTeaser.current}/{bountyTeaser.target}
            </span>
          )}
        </button>
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

      {/* Exercise Detail Sheet */}
      {selectedExercise && (
        <ExerciseDetailSheet exerciseId={selectedExercise} userId={userId} exercises={data.exercises} onClose={() => setSelectedExercise(null)} colors={colors} currentTheme={currentTheme} />
      )}
    </ScreenWrapper>
  );
}

function ExerciseDetailSheet({ exerciseId, userId, exercises, onClose, colors, currentTheme }: { exerciseId: string; userId: string; exercises: any[]; onClose: () => void; colors: any; currentTheme: string }) {
  const [thresholds, setThresholds] = useState<number[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [currentValue, setCurrentValue] = useState(0);
  const [unit, setUnit] = useState('lbs');
  const [bodyweight, setBodyweight] = useState(180);
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
        const sexKey = (userProfile?.sex || 'male').toLowerCase() === 'female' ? 'female' : 'male';
        const sexBrackets = standards.brackets[sexKey] || standards.brackets.male || [];
        const bracket = sexBrackets.find((b: any) => userAge >= (b.min || 0) && userAge <= (b.max || 100)) || sexBrackets[0];
        if (!bracket?.levels) { setThresholds([]); return; }
        const levels = bracket.levels;
        const isXBW = standards.unit === 'xBW';
        const isTime = standards.unit?.toLowerCase() === 'sec' || standards.unit?.toLowerCase() === 'seconds' || standards.scoring === 'lower_is_better';
        const isReps = standards.unit === 'reps' || standards.unit === 'Reps';
        const isLowerBetter = standards.scoring === 'lower_is_better';
        setUnit(isTime ? (isLowerBetter ? 'time-lower' : 'time') : isReps ? 'reps' : 'lbs');
        setThresholds(levels.map((l: number) => isXBW ? Math.round(l * bw) : Math.round(l)));
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
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-zinc-900 border-t-2 border-zinc-700 rounded-t-lg overflow-y-auto overscroll-contain" onClick={e => e.stopPropagation()}>
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="text-center">
            {/* Creature sprite */}
            {currentTheme !== 'athlete' && (() => {
              const normalized = exerciseId.replace(/^(barbell|dumbbell|smith_machine|cable|machine)_/, '');
              const spriteTier = (ex?.level || 0) >= 4 ? 2 : (ex?.level || 0) >= 2 ? 1 : 0;
              return (
                <div className="w-24 h-24 mx-auto mb-2 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden">
                  <img src={`/enemies/${currentTheme}/${normalized}_t${spriteTier}.png`} alt="" className="w-20 h-20" style={{ imageRendering: 'pixelated' }} />
                </div>
              );
            })()}
            <p className="text-sm text-white font-medium">{ex?.name || exerciseId.replace(/_/g, ' ')}</p>
            {(() => {
              const normalized = exerciseId.replace(/^(barbell|dumbbell|smith_machine|cable|machine)_/, '');
              const creature = ENEMY_NAMES_PL[currentTheme]?.[normalized];
              const state = (ex?.level || 0) === 0 ? 'Unmet' : ex?.expired ? 'Dormant' : 'Allied';
              if (creature && currentTheme !== 'athlete') return (
                <p className="text-[9px] text-zinc-400 italic mt-0.5">{creature} · {state}</p>
              );
              return null;
            })()}
            <p className={`text-[10px] ${levelColors[ex?.level || 0]} mt-1`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              LV {ex?.level || 0}
            </p>
          </div>

          {/* Train button */}
          <a href={`/train/active?exercise=${exerciseId}`} className={`w-full block text-center text-[10px] py-3 border ${colors.primary} ${colors.secondary} bg-zinc-800 hover:bg-zinc-700 transition-colors`} style={{ fontFamily: "var(--font-pixel), monospace" }}>▸ TRAIN</a>

          {/* Threshold Table */}
          {thresholds.length > 0 && (
            <div className="space-y-1">
              <p className="text-[8px] text-zinc-500 uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>THRESHOLDS</p>
              {thresholds.map((t, i) => {
                const level = i + 1;
                const achieved = (ex?.level || 0) >= level;
                const isNext = (ex?.level || 0) === level - 1;
                const gap = isNext && currentValue > 0 ? (unit === 'time-lower' ? currentValue - t : t - currentValue) : null;
                return (
                  <div key={i} className={`flex items-center justify-between px-2 py-1 rounded-sm ${achieved ? 'bg-zinc-800/50' : ''} ${isNext ? `border ${colors.border}` : ''}`}>
                    <span className={`text-[10px] ${achieved ? levelColors[level] : 'text-zinc-600'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                      {achieved ? '✓' : '○'} LV {level}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] ${achieved ? 'text-zinc-300' : 'text-zinc-600'}`}>{formatValue(t)}</span>
                      {isNext && gap && gap > 0 && <span className={`text-[8px] ${colors.secondary}`}>{unit === 'time-lower' ? `${formatValue(gap)} faster` : unit === 'time' ? `+${formatValue(gap)} more` : unit === 'reps' ? `+${gap} more` : `+${gap} lbs`}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent History */}
          {history.length > 0 && (
            <div>
              <p className="text-[8px] text-zinc-500 uppercase mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>RECENT</p>
              <p className="text-[10px] text-zinc-400">
                {history.map(v => formatValue(v)).join(' → ')} {history.length >= 2 && (history[history.length - 1] > history[0] ? '↑' : history[history.length - 1] < history[0] ? '↓' : '→')}
              </p>
            </div>
          )}

          <button onClick={onClose} className="w-full text-center text-[8px] text-zinc-600 py-2">tap to close</button>
        </div>
      </div>
    </div>
  );
}
