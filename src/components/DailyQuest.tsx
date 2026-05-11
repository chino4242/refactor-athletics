"use client";

import { useState, useEffect } from 'react';
import { getHabitProgress, saveProfile, getHistory, getProfile } from '../services/api';
import type { UserProfileData, UserStats, HistoryItem, Challenge } from '@/types';
import HabitHeatmap from './HabitHeatmap';
import NutritionTracker from './NutritionTracker';
import { useToast } from '@/context/ToastContext';
import { SlidersHorizontal, Footprints, Timer, Share2, ChevronDown } from 'lucide-react';
import HabitSettings from './HabitSettings';
import BodyCompositionModal from './BodyCompositionModal';
import HabitCard from './HabitCard';
import ViceToggle from './ViceToggle';
import { logHabitAction, deleteHistoryItemAction, resetHabitTodayAction } from '@/app/actions';

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
  const [lastLoggedTs, setLastLoggedTs] = useState<number | null>(null);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const toast = useToast();

  // Edit Mode for Toggling Habits
  const [showSettings, setShowSettings] = useState(false);
  const [showBodyComp, setShowBodyComp] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ nutrition: false });

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);

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
      setLastLoggedTs(result.timestamp);
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

  // Compute 7-day dots for a habit: true if goal was met that day
  const getWeekDots = (habitId: string, goal: number): boolean[] => {
    const dots: boolean[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const dayStart = Math.floor(d.getTime() / 1000);
      const dayEnd = dayStart + 86400;
      const dayTotal = history
        .filter(h => h.exercise_id === habitId && h.timestamp >= dayStart && h.timestamp < dayEnd)
        .reduce((sum, h) => sum + Number(h.raw_value || h.value || 0), 0);
      dots.push(dayTotal >= goal);
    }
    return dots;
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

        {/* 1. NUTRITION */}
        {(() => {
          const nutritionMetrics = [
            { id: 'macro_protein', target: profile?.nutrition_targets?.protein || 150 },
            { id: 'macro_carbs', target: profile?.nutrition_targets?.carbs || 150 },
            { id: 'macro_fat', target: profile?.nutrition_targets?.fat || 60 },
            { id: 'habit_water', target: profile?.nutrition_targets?.water || 100 },
          ];
          const nutritionComplete = nutritionMetrics.filter(m => (totals[m.id] || 0) >= m.target).length;

          return (
        <div>
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, nutrition: !prev.nutrition }))}
            className="w-full flex items-center justify-between py-2"
          >
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">🥗 Nutrition</span>
            <span className="text-[10px] text-zinc-600 font-normal normal-case tracking-normal ml-2">Track macros, water & calories</span>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${nutritionComplete === nutritionMetrics.length ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                {nutritionComplete}/{nutritionMetrics.length}
              </span>
              <ChevronDown size={16} className={`text-zinc-600 transition-transform ${expandedSections.nutrition ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {expandedSections.nutrition && (
            <div className="space-y-3 animate-fade-in">

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
          );
        })()}

        {/* 2. HABITS — Grouped by Category */}
        {(() => {
          const categories = [
            {
              id: 'health',
              label: '💪 Health',
              desc: 'Steps, sleep & daily activity',
              habits: [
                { type: 'card', id: 'habit_steps', label: 'Steps', icon: <Footprints size={14} className="text-orange-500" />, unit: 'steps', color: 'bg-orange-500', heatColor: 'bg-orange-500 shadow-orange-500/50 shadow-[0_0_5px]', goalKey: 'habit_steps', defaultGoal: 10000, xp: 150, setOnly: true, enableTotalSync: true },
                { type: 'card', id: 'habit_sleep', label: 'Sleep', icon: '💤', unit: 'hrs', color: 'bg-purple-500', heatColor: 'bg-purple-500 shadow-purple-500/50 shadow-[0_0_5px]', goalKey: 'habit_sleep', defaultGoal: 8, xp: 16 },
                { type: 'card', id: 'habit_exercise_minutes', label: 'Exercise', icon: '💪', unit: 'mins', color: 'bg-green-500', heatColor: 'bg-green-500 shadow-green-500/50 shadow-[0_0_5px]', goalKey: 'habit_exercise_minutes', defaultGoal: 30, xp: 0 },
                { type: 'card', id: 'habit_stand_hours', label: 'Stand', icon: '🚶', unit: 'hrs', color: 'bg-blue-400', heatColor: 'bg-blue-400 shadow-blue-400/50 shadow-[0_0_5px]', goalKey: 'habit_stand_hours', defaultGoal: 12, xp: 2 },
                { type: 'tap', id: 'habit_creatine', label: 'Supplements', icon: '🧪', doneIcon: '✅', xp: 25, color: 'bg-blue-500' },
              ],
            },
            {
              id: 'recovery',
              label: '🧘 Recovery',
              desc: 'Rest, mobility & mindfulness',
              habits: [
                { type: 'card', id: 'habit_cold_plunge', label: 'Cold Plunge', icon: '🧊', unit: 'mins', color: 'bg-blue-500', heatColor: 'bg-blue-500 shadow-blue-500/50 shadow-[0_0_5px]', goalKey: 'habit_cold_plunge', defaultGoal: 3, xp: 5 },
                { type: 'card', id: 'habit_sauna', label: 'Sauna', icon: '🔥', unit: 'mins', color: 'bg-red-500', heatColor: 'bg-red-500 shadow-red-500/50 shadow-[0_0_5px]', goalKey: 'habit_sauna', defaultGoal: 15, xp: 2 },
                { type: 'card', id: 'habit_mobility', label: 'Mobility', icon: '🧘', unit: 'mins', color: 'bg-teal-500', heatColor: 'bg-pink-500 shadow-pink-500/50 shadow-[0_0_5px]', goalKey: 'habit_mobility', defaultGoal: 15, xp: 2 },
                { type: 'card', id: 'habit_meditation', label: 'Meditation', icon: '🧠', unit: 'mins', color: 'bg-indigo-500', heatColor: 'bg-indigo-500 shadow-indigo-500/50 shadow-[0_0_5px]', goalKey: 'habit_meditation', defaultGoal: 10, xp: 3 },
              ],
            },
            {
              id: 'discipline',
              label: '🛡️ Discipline',
              desc: 'Streaks, journaling & self-control',
              habits: [
                { type: 'vice', id: 'habit_no_alcohol', viceId: 'habit_no_alcohol', label: 'Avoid Alcohol', icon: '🍺', heatColor: 'bg-emerald-500 shadow-emerald-500/50 shadow-[0_0_5px]' },
                { type: 'vice', id: 'habit_no_vice', viceId: 'habit_no_vice', label: 'Avoid Vice', icon: '🛡️', heatColor: 'bg-fuchsia-500 shadow-fuchsia-500/50 shadow-[0_0_5px]' },
                { type: 'vice', id: 'habit_no_sugar', viceId: 'habit_sugar', label: 'Avoid Sugar', icon: '🍬', heatColor: 'bg-amber-500 shadow-amber-500/50 shadow-[0_0_5px]' },
                { type: 'tap', id: 'habit_journaling', label: 'Journaling', icon: '📓', doneIcon: '✅', xp: 25, color: 'bg-yellow-500', heatColor: 'bg-yellow-500 shadow-yellow-500/50 shadow-[0_0_5px]' },
                { type: 'card', id: 'habit_reading', label: 'Reading', icon: '📖', unit: 'pages', color: 'bg-pink-500', heatColor: 'bg-blue-500 shadow-blue-500/50 shadow-[0_0_5px]', goalKey: 'habit_reading', defaultGoal: 10, xp: 1 },
                { type: 'card', id: 'habit_fasting', label: 'Intermit. Fasting', icon: <Timer size={14} className="text-violet-500" />, unit: 'hours', color: 'bg-violet-500', heatColor: 'bg-violet-500 shadow-violet-500/50 shadow-[0_0_5px]', goalKey: 'habit_fasting', defaultGoal: 16, xp: 25 },
              ],
            },
          ];

          return categories.map(cat => {
            const visibleHabits = cat.habits.filter(h => {
              const checkId = h.type === 'vice' ? (h as any).viceId : h.id;
              return !isHidden(checkId);
            });
            if (visibleHabits.length === 0) return null;

            const completed = visibleHabits.filter(h => {
              if (h.type === 'vice') return (totals[h.id] || 0) > 0;
              if (h.type === 'tap') return (totals[h.id] || 0) > 0;
              const goalKey = (h as any).goalKey;
              const goal = goalKey ? (profile?.habit_targets?.[goalKey] || (h as any).defaultGoal) : 1;
              return (totals[h.id] || 0) >= goal;
            }).length;

            const isExpanded = expandedSections[cat.id] !== false; // default open

            return (
              <div key={cat.id}>
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, [cat.id]: !isExpanded }))}
                  className="w-full flex items-center justify-between py-2"
                >
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{cat.label}</span>
                  <span className="text-[10px] text-zinc-600 font-normal normal-case tracking-normal ml-2">{cat.desc}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${completed === visibleHabits.length ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                      {completed}/{visibleHabits.length}
                    </span>
                    <ChevronDown size={16} className={`text-zinc-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-2 animate-fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      {visibleHabits.map(h => {
                        if (h.type === 'card') {
                          const habit = h as any;
                          const habitGoal = profile?.habit_targets?.[habit.goalKey] || habit.defaultGoal;
                          return (
                            <HabitCard
                              key={h.id}
                              habitId={h.id}
                              label={h.label}
                              icon={h.icon}
                              current={totals[h.id] || 0}
                              goal={habitGoal}
                              unit={habit.unit}
                              colorClass={habit.color}
                              onLog={(val, label) => handleLog(h.id, val, label)}
                              onUndo={lastLoggedTs ? () => { handleDelete(lastLoggedTs); setLastLoggedTs(null); } : undefined}
                              onReset={() => { resetHabitTodayAction(userId, h.id).then(() => fetchProgress()); }}
                              loading={loading === h.id}
                              xp={habit.xp}
                              weekDots={getWeekDots(h.id, habitGoal)}
                              {...(habit.setOnly ? { setOnly: true } : {})}
                              {...(habit.enableTotalSync ? { enableTotalSync: true } : {})}
                            />
                          );
                        }
                        if (h.type === 'vice') {
                          const vice = h as any;
                          return (
                            <ViceToggle
                              key={h.id}
                              virtueId={h.id}
                              viceId={vice.viceId}
                              label={h.label}
                              icon={h.icon as string}
                              history={history}
                              viewDateStartTs={viewDateStartTs}
                              onLog={handleLog}
                              onDelete={handleDelete}
                              loading={loading === vice.viceId || loading === h.id}
                              weekDots={getWeekDots(h.id, 1)}
                            />
                          );
                        }
                        if (h.type === 'tap') {
                          const tap = h as any;
                          const done = (totals[h.id] || 0) > 0;
                          return (
                            <div key={h.id} className="p-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50 transition-all duration-300">
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{h.icon}</span>
                                  <span className="text-[10px] uppercase font-bold text-zinc-400">{h.label}</span>
                                </div>
                                {done && <span className="text-[10px] font-bold text-emerald-400">✓</span>}
                              </div>
                              {done ? (
                                <span className="text-xs text-emerald-400 font-bold">Complete</span>
                              ) : (
                                <button
                                  onClick={() => handleLog(h.id, 1, h.label)}
                                  disabled={loading === h.id}
                                  className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-emerald-600 text-zinc-400 hover:text-white text-xs font-bold uppercase transition-all border border-zinc-700 hover:border-emerald-500"
                                >
                                  {loading === h.id ? '...' : `Log +${tap.xp} XP`}
                                </button>
                              )}
                              {/* Week dots */}
                              <div className="flex gap-0.5 mt-1.5 justify-end">
                                {getWeekDots(h.id, 1).map((met, i) => (
                                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${met ? (tap.color || 'bg-emerald-500') : 'bg-zinc-800'}`} />
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                    {/* Inline heatmaps per category */}
                    <button
                      onClick={() => setExpandedSections(prev => ({ ...prev, [`${cat.id}_heatmap`]: !prev[`${cat.id}_heatmap`] }))}
                      className="w-full py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors flex items-center justify-center gap-1"
                    >
                      📊 {expandedSections[`${cat.id}_heatmap`] ? 'Hide' : 'Show'} Streaks
                    </button>
                    {expandedSections[`${cat.id}_heatmap`] && (
                      <div className="space-y-3 animate-fade-in">
                        {visibleHabits.filter(h => h.heatColor).map(h => {
                          const heatId = h.type === 'vice' ? h.id : h.id;
                          const goal = (h as any).goalKey ? (profile?.habit_targets?.[(h as any).goalKey] || (h as any).defaultGoal) : undefined;
                          return (
                            <HabitHeatmap
                              key={heatId}
                              history={history}
                              habitId={heatId}
                              label={`${h.label} (30d)`}
                              colorClass={h.heatColor!}
                              daysBack={30}
                              {...(goal ? { goal } : {})}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          });
        })()}

      </div>

    </div >
  );
}