"use client";

import { useState, useEffect } from 'react';
import { getHabitProgress, saveProfile, getHistory, getProfile } from '../services/api';
import type { UserProfileData, UserStats, HistoryItem, Challenge } from '@/types';
import HabitHeatmap from './HabitHeatmap';
import NutritionTracker from './NutritionTracker';
import WeeklyQuest from './WeeklyQuest';
import { useToast } from '@/context/ToastContext';
import { SlidersHorizontal, Footprints, Timer } from 'lucide-react';
import HabitSettings from './HabitSettings';
// import ActiveChallengeCard from './challenges/ActiveChallengeCard';
// Removed Challenge import since it's in @/types
import BodyCompositionModal from './BodyCompositionModal';
import HabitCard from './HabitCard';
import ViceToggle from './ViceToggle';
import { logHabitAction, deleteHistoryItemAction } from '@/app/actions';

interface DailyQuestProps {
  userId: string;
  bodyweight: number;
  onXpEarned: () => void;
  targetDateTs?: number;
  stats: UserStats | null;
  initialProfile: UserProfileData | null;
  activeChallenge: Challenge | null;
  onStartChallenge: () => void;
  onChallengeUpdate: () => void;
}

// Edit Mode for Toggling Habits
export default function DailyQuest({ userId, bodyweight, onXpEarned, targetDateTs, stats, initialProfile /* , activeChallenge, onStartChallenge, onChallengeUpdate */ }: DailyQuestProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const toast = useToast();

  // Edit Mode for Toggling Habits
  const [showSettings, setShowSettings] = useState(false);
  const [showBodyComp, setShowBodyComp] = useState(false);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Profile State
  const [profile, setProfile] = useState<UserProfileData | null>(initialProfile);

  // Still fetch progress client-side for now, but we'll migrate this to props next
  const fetchProgress = async () => {
    try {
      let startTs = 0;
      if (targetDateTs) {
        startTs = targetDateTs;
      } else {
        const currentYear = new Date().getFullYear();
        const yearStart = new Date(currentYear, 0, 1);
        yearStart.setHours(0, 0, 0, 0);
        startTs = Math.floor(yearStart.getTime() / 1000);
      }

      const data = await getHabitProgress(userId, startTs);
      if (data.status === 'success') {
        setTotals(data.totals);
      }

      getHistory(userId).then(setHistory);
    } catch (err) {
      console.error("Failed to fetch habit progress:", err);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [userId]);

  // Sync profile when props change
  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

  const handleLog = async (habitId: string, value: number, label: string) => {
    setLoading(habitId);
    try {
      const timestamp = targetDateTs || undefined;
      const result = await logHabitAction(userId, habitId, value, bodyweight, label, timestamp);
      toast.xp(`${label} Logged! +${result.xp_earned} XP`);
      onXpEarned();
      fetchProgress(); // Re-fetch totals locally while we wait for full Server Component migration
    } catch (error) {
      console.error(error);
      toast.error("Failed to log quest.");
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (timestamp: number) => {
    try {
      await deleteHistoryItemAction(userId, timestamp);
      fetchProgress();
    } catch (e) {
      console.error(e);
      toast.error("Failed to undo log");
    }
  };

  const viewDateStartTs = targetDateTs || (() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.floor(now.getTime() / 1000);
  })();

  const isHidden = (habitId: string) => {
    return profile?.hidden_habits?.includes(habitId);
  };

  return (
    <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50 transition-all duration-300 shadow-xl backdrop-blur-sm mb-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 border-b border-zinc-700 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📜</span>
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black italic text-white tracking-tighter">DAILY QUESTS</h3>
                <button
                  onClick={() => setShowSettings(true)}
                  className="text-zinc-600 hover:text-white transition-colors p-1 rounded hover:bg-zinc-700/50"
                  title="Manage Habits"
                >
                  <SlidersHorizontal size={14} />
                </button>
              </div>
              <p className="text-xs text-zinc-400 font-medium">Complete these tasks to boost your power.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto justify-end overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          <button
            onClick={() => setShowBodyComp(true)}
            className="flex-shrink-0 text-[10px] md:text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-500 whitespace-nowrap"
          >
            <span className="text-lg">⚖️</span>
            Body Comp
          </button>

          <button
            onClick={() => {
              const lines = [
                "REFACTOR ATHLETICS REPORT",
                `📅 ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                `⚡ ${totals['total_daily_xp'] || 0} XP`,
                "",
                "🔥 STREAKS",
                `🍺 No Alcohol: ${stats?.no_alcohol_streak || 0} Days`,
                `🛡️ No Vice: ${stats?.no_vice_streak || 0} Days`,
                "",
                "🏃 ACTIVITY",
                `💪 Total Weight: ${(stats?.total_volume_today || 0).toLocaleString()} lbs`,
                `👣 Steps: ${(totals['habit_steps'] || 0).toLocaleString()}`,
                "",
                "🥗 NUTRITION",
                `🥩 Protein: ${Math.round(totals['macro_protein'] || 0)}/${profile?.nutrition_targets?.protein || 150}g`,
                `🍞 Carbs:   ${Math.round(totals['macro_carbs'] || 0)}/${profile?.nutrition_targets?.carbs || 150}g`,
                `🥑 Fat:     ${Math.round(totals['macro_fat'] || 0)}/${profile?.nutrition_targets?.fat || 60}g`,
                `🔥 Calories: ${Math.round(totals['macro_calories'] || 0)}/${profile?.nutrition_targets?.calories || 2000}`,
                `💧 Water: ${totals['habit_water'] || 0}/${profile?.nutrition_targets?.water || 100} oz`
              ];

              const text = lines.join('\n');
              navigator.clipboard.writeText(text);
              toast.success("Report copied to clipboard!");
            }}
            className="flex-shrink-0 text-[10px] md:text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
          >
            Share
          </button>
        </div>
      </div>

      {profile && (
        <HabitSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          userProfile={profile}
          onUpdate={() => {
            const loadProfile = async () => {
              try {
                const data = await getProfile(userId);
                if (data) setProfile(data);
              } catch (e) { console.error("Profile reload fail", e); }
            };
            loadProfile();
          }}
        />
      )}

      {profile && (
        <BodyCompositionModal
          isOpen={showBodyComp}
          onClose={() => setShowBodyComp(false)}
          profile={profile}
          setProfile={setProfile}
          saveProfile={saveProfile}
          handleLog={handleLog}
          totals={totals}
          loading={loading}
          setLoading={setLoading}
          toast={toast}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 1. NUTRITION & BASICS */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Nutrition & Sleep</div>

          {profile && (
            <NutritionTracker
              userId={userId}
              userProfile={profile}
              totals={totals}
              onUpdate={() => {
                fetchProgress();
                const loadProfile = async () => {
                  try {
                    const data = await getProfile(userId);
                    if (data) setProfile(data);
                  } catch (e) { console.error("Profile reload fail", e); }
                };
                loadProfile();
              }}
            />
          )}

          {/* HABITS GRID */}
          <div className="grid grid-cols-2 gap-2">
            {!isHidden('habit_sleep') && (
              <button
                onClick={() => handleLog('habit_sleep', 7.5, 'Sleep')}
                disabled={loading === 'habit_sleep' || (totals['habit_sleep'] || 0) > 0}
                className={`p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1.5 relative overflow-hidden group h-24 ${(totals['habit_sleep'] || 0) > 0
                  ? 'bg-emerald-900/20 border-emerald-500/50 cursor-default'
                  : 'bg-zinc-900 border-zinc-700 hover:border-purple-500 hover:bg-purple-500/10'
                  }`}
              >
                <span className="text-2xl">{(totals['habit_sleep'] || 0) > 0 ? '✅' : '💤'}</span>
                <div className="text-center">
                  <span className="block text-xs font-black uppercase text-white tracking-tight">Sleep 7+</span>
                  <span className={`text-[9px] font-bold ${(totals['habit_sleep'] || 0) > 0 ? 'text-emerald-400' : 'text-purple-400'}`}>
                    {(totals['habit_sleep'] || 0) > 0 ? 'COMPLETE' : '+15 XP'}
                  </span>
                </div>
              </button>
            )}

            {!isHidden('habit_creatine') && (
              <button
                onClick={() => handleLog('habit_creatine', 1, 'Supplements')}
                disabled={loading === 'habit_creatine' || (totals['habit_creatine'] || 0) > 0}
                className={`p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1.5 relative overflow-hidden group h-24 ${(totals['habit_creatine'] || 0) > 0
                  ? 'bg-emerald-900/20 border-emerald-500/50 cursor-default'
                  : 'bg-zinc-900 border-zinc-700 hover:border-blue-500 hover:bg-blue-500/10'
                  }`}
              >
                <span className="text-2xl">{(totals['habit_creatine'] || 0) > 0 ? '✅' : '🧪'}</span>
                <div className="text-center">
                  <span className="block text-xs font-black uppercase text-white tracking-tight">Supplements</span>
                  <span className={`text-[9px] font-bold ${(totals['habit_creatine'] || 0) > 0 ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {(totals['habit_creatine'] || 0) > 0 ? 'COMPLETE' : '+5 XP'}
                  </span>
                </div>
              </button>
            )}

            {/* ALCOHOL TOGGLE */}
            {!isHidden('habit_no_alcohol') && (
              <ViceToggle
                virtueId="habit_no_alcohol"
                viceId="habit_alcohol"
                label="Alcohol"
                icon="🍺"
                history={history}
                viewDateStartTs={viewDateStartTs}
                onLog={handleLog}
                onDelete={handleDelete}
                loading={loading === 'habit_alcohol' || loading === 'habit_no_alcohol'}
              />
            )}

            {/* BAD HABIT TOGGLE */}
            {!isHidden('habit_no_vice') && (
              <ViceToggle
                virtueId="habit_no_vice"
                viceId="habit_bad_habit"
                label="Vice"
                icon="🛡️"
                history={history}
                viewDateStartTs={viewDateStartTs}
                onLog={handleLog}
                onDelete={handleDelete}
                loading={loading === 'habit_bad_habit' || loading === 'habit_no_vice'}
              />
            )}

            {/* SUGAR TOGGLE (Extra) */}
            {(!isHidden('habit_sugar') /* || activeChallenge?.goals.some(g => g.habit_id === 'habit_sugar') */) && (
              <ViceToggle
                virtueId="habit_no_sugar"
                viceId="habit_sugar"
                label="Sugar"
                icon="🍬"
                history={history}
                viewDateStartTs={viewDateStartTs}
                onLog={handleLog}
                onDelete={handleDelete}
                loading={loading === 'habit_sugar' || loading === 'habit_no_sugar'}
              />
            )}
          </div>
        </div>

        {/* 3. RECOVERY & ACTIVITY */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Recovery & Mindset</div>

          {!isHidden('habit_journaling') && (
            <div className="relative w-full">
              <button
                onClick={() => handleLog('habit_journaling', 1, 'Journaling')}
                disabled={loading === 'habit_journaling' || (totals['habit_journaling'] || 0) > 0}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition group ${(totals['habit_journaling'] || 0) > 0
                  ? 'bg-emerald-900/20 border-emerald-500/50 cursor-default'
                  : 'bg-zinc-900 border-zinc-700 hover:border-yellow-500 hover:bg-yellow-500/10'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{(totals['habit_journaling'] || 0) > 0 ? '✅' : '📓'}</span>
                  <div className="text-left">
                    <span className="block text-sm font-bold text-white">Journaling</span>
                  </div>
                </div>
                {(totals['habit_journaling'] || 0) > 0 ? (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">LOGGED</span>
                ) : (
                  <span className="text-xs font-bold text-yellow-400">+25 XP</span>
                )}
              </button>
            </div>
          )}

          {/* CUSTOM HABIT CARDS */}
          <div className="grid grid-cols-2 gap-2">

            {/* STEPS */}
            {!isHidden('habit_steps') && (
              <div className="col-span-2">
                <HabitCard
                  habitId="habit_steps"
                  label="Steps"
                  icon={<Footprints size={14} className="text-orange-500" />}
                  current={totals['habit_steps'] || 0}
                  goal={profile?.habit_targets?.habit_steps || 10000}
                  unit="steps"
                  colorClass="bg-orange-500"
                  onLog={(val, label) => handleLog('habit_steps', val, label)}
                  enableTotalSync={true}
                  loading={loading === 'habit_steps'}
                  xp={150}
                />
              </div>
            )}

            {!isHidden('habit_reading') && (
              <HabitCard
                habitId="habit_reading"
                label="Reading"
                icon="📖"
                current={totals['habit_reading'] || 0}
                goal={profile?.habit_targets?.habit_reading || 10}
                unit="pages"
                colorClass="bg-pink-500"
                onLog={(val, label) => handleLog('habit_reading', val, label)}
                loading={loading === 'habit_reading'}
                xp={1}
              />
            )}

            {!isHidden('habit_mobility') && (
              <HabitCard
                habitId="habit_mobility"
                label="Mobility"
                icon="🧘"
                current={totals['habit_mobility'] || 0}
                goal={profile?.habit_targets?.habit_mobility || 15}
                unit="mins"
                colorClass="bg-teal-500"
                onLog={(val, label) => handleLog('habit_mobility', val, label)}
                loading={loading === 'habit_mobility'}
                xp={2}
              />
            )}

            {!isHidden('habit_cold_plunge') && (
              <HabitCard
                habitId="habit_cold_plunge"
                label="Cold Plunge"
                icon="🧊"
                current={totals['habit_cold_plunge'] || 0}
                goal={profile?.habit_targets?.habit_cold_plunge || 3}
                unit="mins"
                colorClass="bg-blue-500"
                onLog={(val, label) => handleLog('habit_cold_plunge', val, label)}
                loading={loading === 'habit_cold_plunge'}
                xp={5}
              />
            )}

            {!isHidden('habit_sauna') && (
              <HabitCard
                habitId="habit_sauna"
                label="Sauna"
                icon="🔥"
                current={totals['habit_sauna'] || 0}
                goal={profile?.habit_targets?.habit_sauna || 15}
                unit="mins"
                colorClass="bg-red-500"
                onLog={(val, label) => handleLog('habit_sauna', val, label)}
                loading={loading === 'habit_sauna'}
                xp={2}
              />
            )}

            {!isHidden('habit_meditation') && (
              <HabitCard
                habitId="habit_meditation"
                label="Meditation"
                icon="🧠"
                current={totals['habit_meditation'] || 0}
                goal={profile?.habit_targets?.habit_meditation || 10}
                unit="mins"
                colorClass="bg-indigo-500"
                onLog={(val, label) => handleLog('habit_meditation', val, label)}
                loading={loading === 'habit_meditation'}
                xp={3}
              />
            )}

            {!isHidden('habit_fasting') && (
              <HabitCard
                habitId="habit_fasting"
                label="Intermit. Fasting"
                icon={<Timer size={14} className="text-violet-500" />}
                current={totals['habit_fasting'] || 0}
                goal={profile?.habit_targets?.habit_fasting || 16}
                unit="hours"
                colorClass="bg-violet-500"
                onLog={(val, label) => handleLog('habit_fasting', val, label)}
                loading={loading === 'habit_fasting'}
                xp={25}
              />
            )}
          </div>

          {/* WEEKLY QUESTS */}
          {profile && (
            <WeeklyQuest
              userId={userId}
              userProfile={profile}
              onUpdate={() => {
                fetchProgress();
                onXpEarned();
              }}
            />
          )}

          {/* 🟢 CUSTOM CHALLENGE SLOT */}
          {/* <div className="pt-2">
            {!activeChallenge && (
              <button
                onClick={onStartChallenge}
                className="w-full bg-gradient-to-r from-yellow-900/20 to-transparent border border-yellow-500/20 hover:border-yellow-500/50 hover:from-yellow-900/30 p-4 rounded-xl flex items-center justify-center gap-3 text-yellow-600 hover:text-yellow-400 transition-all group shadow-lg shadow-black/20"
              >
                <span className="text-xl group-hover:scale-110 transition-transform filter drop-shadow-md">🏆</span>
                <span className="font-black uppercase tracking-widest text-xs">Start a Custom Challenge</span>
              </button>
            )}

            {activeChallenge && (
              <ActiveChallengeCard
                challenge={activeChallenge}
                userId={userId}
                onUpdate={onChallengeUpdate}
              />
            )}
          </div> */}

        </div>
      </div>

      {/* CONSISTENCY TOGGLE */}
      <div className="mt-6 border-t border-zinc-800 pt-6">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full py-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <span>{showHistory ? 'Hide' : 'Show'} Consistency</span>
          <span className="text-lg">📊</span>
        </button>

        {showHistory && (
          <div className="mt-4 animate-fade-in space-y-4">
            {!isHidden('habit_sleep') && (
              <HabitHeatmap history={history} habitId="habit_sleep" label="Sleep 7+ Hrs (2026)" colorClass="bg-purple-500 shadow-purple-500/50 shadow-[0_0_5px]" year={2026} />
            )}
            {!isHidden('habit_no_alcohol') && (
              <HabitHeatmap history={history} habitId="habit_no_alcohol" label="No Alcohol (2026)" colorClass="bg-emerald-500 shadow-emerald-500/50 shadow-[0_0_5px]" year={2026} />
            )}
            {!isHidden('habit_no_vice') && (
              <HabitHeatmap history={history} habitId="habit_no_vice" label="No Vice (2026)" colorClass="bg-fuchsia-500 shadow-fuchsia-500/50 shadow-[0_0_5px]" year={2026} />
            )}
            {!isHidden('habit_steps') && (
              <HabitHeatmap history={history} habitId="habit_steps" label="Steps (2026)" colorClass="bg-orange-500 shadow-orange-500/50 shadow-[0_0_5px]" year={2026} goal={10000} />
            )}
            {!isHidden('habit_water') && (
              <HabitHeatmap history={history} habitId="habit_water" label="Water (2026)" colorClass="bg-cyan-500 shadow-cyan-500/50 shadow-[0_0_5px]" year={2026} goal={100} />
            )}
            {!isHidden('habit_journaling') && (
              <HabitHeatmap history={history} habitId="habit_journaling" label="Journaling (2026)" colorClass="bg-yellow-500 shadow-yellow-500/50 shadow-[0_0_5px]" year={2026} />
            )}
            {!isHidden('habit_meditation') && (
              <HabitHeatmap history={history} habitId="habit_meditation" label="Meditation (2026)" colorClass="bg-indigo-500 shadow-indigo-500/50 shadow-[0_0_5px]" year={2026} goal={10} />
            )}
            {!isHidden('habit_reading') && (
              <HabitHeatmap history={history} habitId="habit_reading" label="Reading (2026)" colorClass="bg-blue-500 shadow-blue-500/50 shadow-[0_0_5px]" year={2026} goal={10} />
            )}
            {!isHidden('habit_mobility') && (
              <HabitHeatmap history={history} habitId="habit_mobility" label="Mobility (2026)" colorClass="bg-pink-500 shadow-pink-500/50 shadow-[0_0_5px]" year={2026} goal={15} />
            )}
            {!isHidden('habit_fasting') && (
              <HabitHeatmap history={history} habitId="habit_fasting" label="Fasting (2026)" colorClass="bg-violet-500 shadow-violet-500/50 shadow-[0_0_5px]" year={2026} goal={16} />
            )}
            {!isHidden('habit_bad_habit') && (
              <HabitHeatmap history={history} habitId="habit_bad_habit" label="Bad Habit (2026)" colorClass="bg-red-500 shadow-red-500/50 shadow-[0_0_5px]" year={2026} />
            )}
          </div>
        )}
      </div>

    </div >
  );
}