"use client";

import { useState, useEffect } from 'react';
import { getHabitProgress, saveProfile, getHistory, getProfile } from '../services/api';
import type { UserProfileData, UserStats, HistoryItem, Challenge } from '@/types';
import HabitHeatmap from './HabitHeatmap';
import NutritionTracker from './NutritionTracker';
import WeeklyQuest from './WeeklyQuest';
import { useToast } from '@/context/ToastContext';
import { SlidersHorizontal, Footprints, Timer, Share2, ChevronDown } from 'lucide-react';
import HabitSettings from './HabitSettings';
import BodyCompositionModal from './BodyCompositionModal';
import HabitCard from './HabitCard';
import ViceToggle from './ViceToggle';
import { logHabitAction, deleteHistoryItemAction } from '@/app/actions';
import ScreenshotUploader from './ScreenshotUploader';

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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ habits: true, nutrition: true });

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [consistencyView, setConsistencyView] = useState<'week' | 'month' | 'year'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('consistencyView') as 'week' | 'month' | 'year') || 'month';
    }
    return 'month';
  });

  const updateConsistencyView = (v: 'week' | 'month' | 'year') => {
    setConsistencyView(v);
    localStorage.setItem('consistencyView', v);
  };

  // Profile State
  const [profile, setProfile] = useState<UserProfileData | null>(initialProfile);

  // Still fetch progress client-side for now, but we'll migrate this to props next
  const fetchProgress = async () => {
    try {
      let startTs = 0;
      if (targetDateTs) {
        startTs = targetDateTs;
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startTs = Math.floor(today.getTime() / 1000);
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
  }, [userId, targetDateTs]); // Re-fetch when date changes

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

  const handleHabitData = async (data: any) => {
    const promises = [];
    if (data.steps) promises.push(handleLog('habit_steps', data.steps, 'Steps'));
    if (data.exercise_minutes) promises.push(handleLog('habit_exercise_minutes', data.exercise_minutes, 'Exercise'));
    if (data.stand_hours) promises.push(handleLog('habit_stand_hours', data.stand_hours, 'Stand'));
    if (data.water) promises.push(handleLog('habit_water', data.water, 'Water'));
    if (data.sleep) promises.push(handleLog('habit_sleep', data.sleep, 'Sleep'));
    
    if (promises.length > 0) {
      await Promise.all(promises);
      toast.success(`Logged ${promises.length} habits from screenshot!`);
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
                  className="text-zinc-600 hover:text-white transition-colors p-2 rounded hover:bg-zinc-700/50"
                  title="Manage Habits"
                >
                  <SlidersHorizontal size={18} />
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const todayStart = Math.floor(today.getTime() / 1000);
                    const todayXp = history.filter(item => item.timestamp >= todayStart).reduce((sum, item) => sum + (item.xp || 0), 0);
                    const todayVolume = history
                      .filter(item => item.timestamp >= todayStart && item.rank_name)
                      .reduce((sum, item) => {
                        const sets = (item as any).details || (item as any).data || [];
                        return sum + (Array.isArray(sets) ? sets.reduce((s: number, set: any) => s + (set.weight || 0) * (set.reps || 0), 0) : 0);
                      }, 0);
                    const caloriesIn = Math.round(totals['macro_calories'] || 0);
                    const burned = Math.round(totals['macro_calories_burned'] || 0);
                    const net = caloriesIn - burned;
                    const lines = [
                      "REFACTOR ATHLETICS REPORT",
                      `📅 ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                      `⚡ ${todayXp} XP`, "",
                      "🔥 STREAKS",
                      `🍺 No Alcohol: ${stats?.no_alcohol_streak || 0} Days`,
                      `🛡️ No Vice: ${stats?.no_vice_streak || 0} Days`, "",
                      "🏃 ACTIVITY",
                      `💪 Total Weight: ${todayVolume.toLocaleString()} lbs`,
                      `👣 Steps: ${(totals['habit_steps'] || 0).toLocaleString()}`,
                      `💪 Exercise: ${totals['habit_exercise_minutes'] || 0}/${profile?.habit_targets?.habit_exercise_minutes || 30} min`,
                      `🚶 Stand: ${totals['habit_stand_hours'] || 0}/${profile?.habit_targets?.habit_stand_hours || 12} hrs`,
                      `🧘 Mobility: ${totals['habit_mobility'] || 0}/${profile?.habit_targets?.habit_mobility || 15} min`, "",
                      "😴 RECOVERY",
                      `💤 Sleep: ${totals['habit_sleep'] || 0}/${profile?.habit_targets?.habit_sleep || 8} hrs`,
                      `📖 Reading: ${totals['habit_reading'] || 0}/${profile?.habit_targets?.habit_reading || 10} min`, "",
                      "🥗 NUTRITION",
                      `🥩 Protein: ${Math.round(totals['macro_protein'] || 0)}/${profile?.nutrition_targets?.protein || 150}g`,
                      `🍞 Carbs:   ${Math.round(totals['macro_carbs'] || 0)}/${profile?.nutrition_targets?.carbs || 150}g`,
                      `🥑 Fat:     ${Math.round(totals['macro_fat'] || 0)}/${profile?.nutrition_targets?.fat || 60}g`,
                      `🔥 Calories: ${caloriesIn}/${profile?.nutrition_targets?.calories || 2000}`,
                      `💧 Water: ${totals['habit_water'] || 0}/${profile?.nutrition_targets?.water || 100} oz`,
                      `🔥 Burned: ${burned} kcal`,
                      `📊 Net: ${net > 0 ? '+' : ''}${net} kcal`
                    ];
                    navigator.clipboard.writeText(lines.join('\n'));
                    toast.success("Report copied to clipboard!");
                  }}
                  className="text-zinc-600 hover:text-white transition-colors p-2 rounded hover:bg-zinc-700/50"
                  title="Share Daily Report"
                >
                  <Share2 size={18} />
                </button>
              </div>
              <p className="text-xs text-zinc-400 font-medium">Complete these tasks to boost your power.</p>
            </div>
          </div>
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
                console.log("Profile reloaded, hidden_habits:", data?.hidden_habits);
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

      <div className="space-y-3">

        {/* 1. NUTRITION & BASICS */}
        <div>
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, nutrition: !prev.nutrition }))}
            className="w-full flex items-center justify-between py-2"
          >
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">🥗 Nutrition & Sleep</span>
            <ChevronDown size={16} className={`text-zinc-600 transition-transform ${expandedSections.nutrition ? 'rotate-180' : ''}`} />
          </button>

          {expandedSections.nutrition && (
            <div className="space-y-3 animate-fade-in">

          {/* STEPS */}
          {!isHidden('habit_steps') && (
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
              setOnly={true}
              loading={loading === 'habit_steps'}
              xp={150}
            />
          )}

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
              onLogHabit={handleLog}
            />
          )}
            </div>
          )}
        </div>

        {/* 2. HABITS */}
        <div>
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, habits: !prev.habits }))}
            className="w-full flex items-center justify-between py-2"
          >
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">⚔️ Habits</span>
            <ChevronDown size={16} className={`text-zinc-600 transition-transform ${expandedSections.habits ? 'rotate-180' : ''}`} />
          </button>

          {expandedSections.habits && (
            <div className="space-y-3 animate-fade-in">
          <div className="flex justify-end mb-2">
            <ScreenshotUploader type="habits" userId={userId} onDataExtracted={handleHabitData} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {!isHidden('habit_sleep') && (
              <HabitCard
                habitId="habit_sleep"
                label="Sleep"
                icon="💤"
                current={totals['habit_sleep'] || 0}
                goal={profile?.habit_targets?.habit_sleep || 8}
                unit="hrs"
                colorClass="bg-purple-500"
                onLog={(val, label) => handleLog('habit_sleep', val, label)}
                loading={loading === 'habit_sleep'}
                xp={16}
              />
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
                    {(totals['habit_creatine'] || 0) > 0 ? 'COMPLETE' : '+25 XP'}
                  </span>
                </div>
              </button>
            )}

            {/* ALCOHOL TOGGLE */}
            {!isHidden('habit_no_alcohol') && (
              <ViceToggle
                virtueId="habit_no_alcohol"
                viceId="habit_alcohol"
                label="Avoid Alcohol"
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
                label="Avoid Vice"
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
                label="Avoid Sugar"
                icon="🍬"
                history={history}
                viewDateStartTs={viewDateStartTs}
                onLog={handleLog}
                onDelete={handleDelete}
                loading={loading === 'habit_sugar' || loading === 'habit_no_sugar'}
              />
            )}
          </div>

        {/* 3. RECOVERY & ACTIVITY */}
        <div className="space-y-3 mt-3">
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

            {/* EXERCISE MINUTES */}
            {!isHidden('habit_exercise_minutes') && (
              <HabitCard
                habitId="habit_exercise_minutes"
                label="Exercise"
                icon="💪"
                current={totals['habit_exercise_minutes'] || 0}
                goal={profile?.habit_targets?.habit_exercise_minutes || 30}
                unit="mins"
                colorClass="bg-green-500"
                onLog={(val, label) => handleLog('habit_exercise_minutes', val, label)}
                loading={loading === 'habit_exercise_minutes'}
                xp={3}
              />
            )}

            {/* STAND HOURS */}
            {!isHidden('habit_stand_hours') && (
              <HabitCard
                habitId="habit_stand_hours"
                label="Stand"
                icon="🚶"
                current={totals['habit_stand_hours'] || 0}
                goal={profile?.habit_targets?.habit_stand_hours || 12}
                unit="hrs"
                colorClass="bg-blue-400"
                onLog={(val, label) => handleLog('habit_stand_hours', val, label)}
                loading={loading === 'habit_stand_hours'}
                xp={2}
              />
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

          {/* WEEKLY QUESTS - temporarily disabled
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
          */}

            </div>
            </div>
          )}
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
          <div className="mt-4 animate-fade-in">
            <div className="flex justify-center gap-1 mb-4">
              {(['week', 'month', 'year'] as const).map(v => (
                <button key={v} onClick={() => updateConsistencyView(v)} className={`px-3 py-1 text-[10px] font-bold uppercase rounded ${consistencyView === v ? 'bg-zinc-700 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>{v}</button>
              ))}
            </div>
            <div className="space-y-4">
            {(() => {
              const viewProps = consistencyView === 'year'
                ? { year: 2026, daysBack: 365 }
                : { daysBack: consistencyView === 'month' ? 30 : 7 };
              const suffix = consistencyView === 'year' ? '(2026)' : consistencyView === 'month' ? '(30d)' : '(7d)';
              return <>
            {!isHidden('habit_sleep') && (
              <HabitHeatmap history={history} habitId="habit_sleep" label={`Sleep 7+ Hrs ${suffix}`} colorClass="bg-purple-500 shadow-purple-500/50 shadow-[0_0_5px]" {...viewProps} />
            )}
            {!isHidden('habit_no_alcohol') && (
              <HabitHeatmap history={history} habitId="habit_no_alcohol" label={`No Alcohol ${suffix}`} colorClass="bg-emerald-500 shadow-emerald-500/50 shadow-[0_0_5px]" {...viewProps} />
            )}
            {!isHidden('habit_no_vice') && (
              <HabitHeatmap history={history} habitId="habit_no_vice" label={`No Vice ${suffix}`} colorClass="bg-fuchsia-500 shadow-fuchsia-500/50 shadow-[0_0_5px]" {...viewProps} />
            )}
            {!isHidden('habit_steps') && (
              <HabitHeatmap history={history} habitId="habit_steps" label={`Steps ${suffix}`} colorClass="bg-orange-500 shadow-orange-500/50 shadow-[0_0_5px]" {...viewProps} goal={10000} />
            )}
            {!isHidden('habit_water') && (
              <HabitHeatmap history={history} habitId="habit_water" label={`Water ${suffix}`} colorClass="bg-cyan-500 shadow-cyan-500/50 shadow-[0_0_5px]" {...viewProps} goal={100} />
            )}
            {!isHidden('habit_journaling') && (
              <HabitHeatmap history={history} habitId="habit_journaling" label={`Journaling ${suffix}`} colorClass="bg-yellow-500 shadow-yellow-500/50 shadow-[0_0_5px]" {...viewProps} />
            )}
            {!isHidden('habit_meditation') && (
              <HabitHeatmap history={history} habitId="habit_meditation" label={`Meditation ${suffix}`} colorClass="bg-indigo-500 shadow-indigo-500/50 shadow-[0_0_5px]" {...viewProps} goal={10} />
            )}
            {!isHidden('habit_reading') && (
              <HabitHeatmap history={history} habitId="habit_reading" label={`Reading ${suffix}`} colorClass="bg-blue-500 shadow-blue-500/50 shadow-[0_0_5px]" {...viewProps} goal={10} />
            )}
            {!isHidden('habit_mobility') && (
              <HabitHeatmap history={history} habitId="habit_mobility" label={`Mobility ${suffix}`} colorClass="bg-pink-500 shadow-pink-500/50 shadow-[0_0_5px]" {...viewProps} goal={15} />
            )}
            {!isHidden('habit_fasting') && (
              <HabitHeatmap history={history} habitId="habit_fasting" label={`Fasting ${suffix}`} colorClass="bg-violet-500 shadow-violet-500/50 shadow-[0_0_5px]" {...viewProps} goal={16} />
            )}
            {!isHidden('habit_bad_habit') && (
              <HabitHeatmap history={history} habitId="habit_bad_habit" label={`Bad Habit ${suffix}`} colorClass="bg-red-500 shadow-red-500/50 shadow-[0_0_5px]" {...viewProps} />
            )}
              </>;
            })()}
            </div>
          </div>
        )}
      </div>

    </div >
  );
}