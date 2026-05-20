"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { getToday } from '@/utils/date';
import FirstVisitTooltip from './common/FirstVisitTooltip';
import { getHabitProgress, getHistory, getProfile, saveProfile } from '@/services/api';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/data/themes';
import { logHabitAction, deleteHistoryItemAction, resetHabitTodayAction } from '@/app/actions';
import { useToast } from '@/context/ToastContext';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import LevelUpOverlay from './LevelUpOverlay';
import NutritionTracker from './NutritionTracker';
import HabitCard from './HabitCard';
import ViceToggle from './ViceToggle';
import HabitSettings from './HabitSettings';
import BodyCompHome from './BodyCompHome';
import { BodyCompositionService } from '@/services/BodyCompositionService';
import { SlidersHorizontal } from 'lucide-react';
import type { UserStats, UserProfileData, HistoryItem } from '@/types';

interface TrackPageProps {
  userId: string;
  bodyweight: number;
  initialProfile?: UserProfileData | null;
  initialStats?: UserStats | null;
  onLogComplete?: () => void;
}

const ALL_TABS = [
  { id: 'health', label: 'Health', icon: '💪' },
  { id: 'nutrition', label: 'Nutrition', icon: '🥗' },
  { id: 'recovery', label: 'Recovery', icon: '🧘' },
  { id: 'discipline', label: 'Discipline', icon: '🛡️' },
  { id: 'body', label: 'Body', icon: '📐' },
] as const;

type TabId = typeof ALL_TABS[number]['id'];

export default function TrackPage({ userId, bodyweight, initialProfile, initialStats, onLogComplete }: TrackPageProps) {
  const toast = useToast();
  const { theme: _theme } = useTheme();
  const theme = _theme || THEMES.athlete;

  // --- Date navigation ---
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const selectedDateTs = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  }, [selectedDate]);

  const goToPreviousDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); };
  const goToNextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); };
  const goToToday = () => setSelectedDate(new Date());
  const isToday = useMemo(() => selectedDate.toDateString() === new Date().toDateString(), [selectedDate]);
  const isFuture = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sel = new Date(selectedDate); sel.setHours(0, 0, 0, 0);
    return sel > today;
  }, [selectedDate]);

  // --- Tab state ---
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('track_tab') as TabId;
      if (saved) return saved;
      // First visit: suggest tab based on time of day
      const hour = new Date().getHours();
      if (hour < 10) return 'health';       // Morning: check sleep, steps
      if (hour < 15) return 'nutrition';     // Midday: log lunch
      if (hour < 20) return 'health';        // Afternoon: check habits
      return 'recovery';                     // Evening: wind down
    }
    return 'health';
  });
  const handleTabChange = (tab: TabId) => { setActiveTab(tab); localStorage.setItem('track_tab', tab); };

  // --- Data state ---
  const [loading, setLoading] = useState<string | null>(null);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [pageReady, setPageReady] = useState(false);

  // Progressive disclosure: show Recovery/Discipline tabs only if user has relevant data or habits visible
  const TABS = useMemo(() => {
    const hasRecoveryData = totals['habit_cold_plunge'] > 0 || totals['habit_sauna'] > 0 || totals['habit_mobility'] > 0 || totals['habit_meditation'] > 0;
    const hasDisciplineData = totals['habit_no_alcohol'] > 0 || totals['habit_no_vice'] > 0;
    const hasUsedBefore = localStorage.getItem('track_tab') === 'recovery' || localStorage.getItem('track_tab') === 'discipline';
    return ALL_TABS.filter(tab => {
      if (tab.id === 'recovery') return hasRecoveryData || hasUsedBefore;
      if (tab.id === 'discipline') return hasDisciplineData || hasUsedBefore;
      return true;
    });
  }, [totals]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showTodayLog, setShowTodayLog] = useState(true);
  const [todayLog, setTodayLog] = useState<any[]>([]);

  const loadTodayLog = useCallback(async () => {
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    const todayDate = getToday();
    // Also check tomorrow's date to catch entries saved with UTC before timezone fix
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toLocaleDateString('en-CA', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    const dates = [todayDate, tomorrowDate];
    const [w, n, h] = await Promise.all([
      supabase.from('workouts').select('id, exercise_id, value, xp, timestamp, date').eq('user_id', userId).in('date', dates),
      supabase.from('nutrition_logs').select('id, macro_type, amount, xp, timestamp, date, label').eq('user_id', userId).in('date', dates),
      supabase.from('habit_logs').select('id, habit_id, value, xp, timestamp, date').eq('user_id', userId).in('date', dates),
    ]);
    const items = [
      ...(w.data || []).map(r => ({ name: r.exercise_id?.replace(/_/g, ' '), value: r.value, xp: r.xp, timestamp: r.timestamp })),
      ...(n.data || []).map(r => ({ name: r.label || r.macro_type, value: `${r.amount}`, xp: r.xp, timestamp: r.timestamp })),
      ...(h.data || []).map(r => ({ name: r.habit_id?.replace('habit_', '').replace(/_/g, ' '), value: `${r.value}`, xp: r.xp, timestamp: r.timestamp })),
    ].sort((a, b) => b.timestamp - a.timestamp);
    setTodayLog(items);
  }, [userId]);
  const [profile, setProfile] = useState<UserProfileData | null>(initialProfile || null);
  const [showSettings, setShowSettings] = useState(false);
  const [bodyCompHistory, setBodyCompHistory] = useState<any[]>([]);

  // --- Level up ---
  const [showLevelUp, setShowLevelUp] = useState<number | null>(null);
  const prevLevelRef = useRef<number | null>(null);
  useEffect(() => {
    if (!initialStats) return;
    const newLevel = initialStats.player_level || 0;
    if (prevLevelRef.current !== null && newLevel > prevLevelRef.current) setShowLevelUp(newLevel);
    prevLevelRef.current = newLevel;
  }, [initialStats]);

  // --- Fetch data ---
  const fetchProgress = useCallback(async () => {
    const data = await getHabitProgress(userId, selectedDateTs);
    if (data.status === 'success') setTotals(data.totals);
    getHistory(userId).then(setHistory);
    loadTodayLog();
    setPageReady(true);
  }, [userId, selectedDateTs, loadTodayLog]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);
  useEffect(() => { if (initialProfile) setProfile(initialProfile); }, [initialProfile]);
  useEffect(() => { if (userId) BodyCompositionService.getHistory(userId).then(setBodyCompHistory); }, [userId]);

  // --- Handlers ---
  const handleLog = async (habitId: string, value: number, label: string) => {
    setLoading(habitId);
    try {
      const result = await logHabitAction(userId, habitId, value, bodyweight, label, selectedDateTs || undefined);
      toast.xp(`+${result.xp_earned} XP · ${label}`);
      onLogComplete?.();
      fetchProgress();
    } catch { toast.error("Failed to log."); }
    finally { setLoading(null); }
  };

  const handleDelete = async (timestamp: number) => {
    try { await deleteHistoryItemAction(userId, timestamp); fetchProgress(); }
    catch { toast.error("Failed to undo."); }
  };

  const isHidden = (id: string) => profile?.hidden_habits?.includes(id);

  const getWeekDots = (habitId: string, goal: number): boolean[] => {
    const dots: boolean[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const dayStart = Math.floor(d.getTime() / 1000);
      const dayEnd = dayStart + 86400;
      const dayTotal = history.filter(h => h.exercise_id === habitId && h.timestamp >= dayStart && h.timestamp < dayEnd)
        .reduce((sum, h) => sum + Number(h.raw_value || h.value || 0), 0);
      dots.push(dayTotal >= goal);
    }
    return dots;
  };

  // --- Progress calculation ---
  const questProgress = useMemo(() => {
    const habits = [
      { id: 'habit_steps', goal: profile?.habit_targets?.habit_steps || profile?.habit_targets?.steps || 10000 },
      { id: 'habit_sleep', goal: profile?.habit_targets?.habit_sleep || profile?.habit_targets?.sleep || 7 },
      { id: 'habit_exercise_minutes', goal: profile?.habit_targets?.habit_exercise_minutes || profile?.habit_targets?.exercise_minutes || 30 },
      { id: 'habit_stand_hours', goal: profile?.habit_targets?.habit_stand_hours || profile?.habit_targets?.stand_hours || 8 },
      { id: 'habit_cold_plunge', goal: profile?.habit_targets?.habit_cold_plunge || profile?.habit_targets?.cold_plunge || 3 },
      { id: 'habit_sauna', goal: profile?.habit_targets?.habit_sauna || profile?.habit_targets?.sauna || 15 },
      { id: 'habit_mobility', goal: profile?.habit_targets?.habit_mobility || profile?.habit_targets?.mobility || 10 },
      { id: 'habit_meditation', goal: profile?.habit_targets?.habit_meditation || profile?.habit_targets?.meditation || 10 },
      { id: 'habit_reading', goal: profile?.habit_targets?.habit_reading || profile?.habit_targets?.reading || 20 },
      { id: 'habit_fasting', goal: profile?.habit_targets?.habit_fasting || profile?.habit_targets?.fasting || 16 },
    ].filter(h => !isHidden(h.id));

    const completed = habits.filter(h => (totals[h.id] || 0) >= h.goal).length;
    // Add nutrition check
    const nutritionDone = (totals['macro_protein'] || 0) > 0;
    const total = habits.length + (nutritionDone ? 0 : 1) + 1; // +1 for nutrition
    return { completed: completed + (nutritionDone ? 1 : 0), total };
  }, [totals, profile]);

  const progressPercent = questProgress.total > 0 ? Math.round((questProgress.completed / questProgress.total) * 100) : 0;

  // --- Render helpers ---
  const renderHabitCard = (habitId: string, label: string, icon: string, goal: number, unit: string, color: string, opts?: { sync?: boolean; setOnly?: boolean }) => {
    if (isHidden(habitId)) return null;
    return (
      <HabitCard
        key={habitId}
        habitId={habitId}
        label={label}
        icon={icon}
        current={totals[habitId] || 0}
        goal={goal}
        unit={unit}
        colorClass={color}
        onLog={(val, lbl) => handleLog(habitId, val, lbl)}
        onReset={() => { resetHabitTodayAction(userId, habitId).then(() => fetchProgress()); }}
        enableTotalSync={opts?.sync}
        setOnly={opts?.setOnly}
        loading={loading === habitId}
        xp={0}
        weekDots={getWeekDots(habitId, goal)}
      />
    );
  };

  if (!pageReady) return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4 pb-32 animate-pulse px-2">
      <div className="h-10 bg-zinc-900 rounded-xl" />
      <div className="flex gap-1.5">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 flex-1 bg-zinc-900 rounded-xl" />)}</div>
      <div className="space-y-2.5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-zinc-900 rounded-xl border border-zinc-800" />)}</div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4 relative pb-32" style={{ backgroundImage: theme.bgTexture }}>
      <FirstVisitTooltip id="track" message="Log meals, habits, and body measurements here. Everything earns XP." />
      {showLevelUp && <LevelUpOverlay level={showLevelUp} onClose={() => setShowLevelUp(null)} />}

      {/* Date Navigation */}
      <div className="flex items-center justify-between px-2 py-3">
        <button onClick={goToPreviousDay} className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700 transition active:scale-95">
          <span className="text-base font-bold">‹</span>
        </button>
        <button onClick={isToday ? undefined : goToToday} className="text-center px-4">
          <span className="text-sm font-semibold text-white tracking-wide">
            {isToday ? '📅 Today' : selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          {!isToday && <span className="block text-[10px] text-orange-400 font-medium mt-0.5">Tap to return</span>}
        </button>
        <button onClick={goToNextDay} disabled={isFuture} className={`w-9 h-9 flex items-center justify-center rounded-full transition active:scale-95 ${isFuture ? 'bg-zinc-900 text-zinc-800 cursor-not-allowed' : 'bg-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}>
          <span className="text-base font-bold">›</span>
        </button>
      </div>

      {/* Progress Ring + Summary */}
      <div className="mx-2 p-4 rounded-2xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border border-zinc-700/40 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#1c1c1e" strokeWidth="5" />
              <circle cx="32" cy="32" r="28" fill="none"
                stroke={progressPercent >= 100 ? 'url(#grad-done)' : 'url(#grad-progress)'}
                strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPercent / 100)}`}
                strokeLinecap="round" className="transition-all duration-700" />
              <defs>
                <linearGradient id="grad-progress" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={theme.accentHex} />
                  <stop offset="100%" stopColor={theme.accentHex} stopOpacity="0.7" />
                </linearGradient>
                <linearGradient id="grad-done" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-black ${progressPercent >= 100 ? 'text-emerald-400' : ''}`} style={progressPercent < 100 ? { color: theme.accentHex } : {}}>{progressPercent}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-white">{questProgress.completed} <span className="text-zinc-500 font-normal">of</span> {questProgress.total} <span className="text-zinc-500 font-normal">{theme.labels.questsComplete}</span></p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {progressPercent >= 100 ? theme.labels.motivational[2] : progressPercent >= 50 ? theme.labels.motivational[1] : theme.labels.motivational[0]}
            </p>
          </div>
          <button onClick={() => setShowSettings(true)} className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800/60 text-zinc-500 hover:text-white hover:bg-zinc-700 transition shrink-0">
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Nutrition Running Total — always visible */}
      {(totals['macro_protein'] > 0 || totals['macro_carbs'] > 0 || totals['macro_fat'] > 0) && (() => {
        const p = Math.round(totals['macro_protein'] || 0);
        const c = Math.round(totals['macro_carbs'] || 0);
        const f = Math.round(totals['macro_fat'] || 0);
        const cal = Math.round(p * 4 + c * 4 + f * 9);
        const targets = profile?.nutrition_targets;
        // Calculate grade: A (within 10%), B (within 20%), C (>20% off) based on protein target
        let grade = '';
        let gradeColor = '';
        if (targets?.protein && p > 0) {
          const pctOff = Math.abs(p - targets.protein) / targets.protein;
          if (p >= targets.protein) { grade = 'A'; gradeColor = 'text-emerald-400'; }
          else if (pctOff <= 0.1) { grade = 'A'; gradeColor = 'text-emerald-400'; }
          else if (pctOff <= 0.2) { grade = 'B'; gradeColor = 'text-yellow-400'; }
          else { grade = 'C'; gradeColor = 'text-zinc-500'; }
        }
        return (
          <div className="mx-2 px-4 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/40 flex items-center justify-between">
            <div className="flex gap-3 text-[11px] font-bold">
              <span className="text-red-400">{p}g P</span>
              <span className="text-orange-400">{c}g C</span>
              <span className="text-yellow-400">{f}g F</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500 font-mono">{cal} cal</span>
              {grade && <span className={`text-xs font-black ${gradeColor}`}>{grade}</span>}
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <div className="flex gap-1.5 px-2 overflow-x-auto no-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-b from-zinc-700/80 to-zinc-800/80 text-white border border-zinc-600/50 shadow-lg shadow-black/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
            }`}
            style={activeTab === tab.id ? { borderColor: `${theme.accentHex}30` } : {}}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px] px-2">
        {/* HEALTH TAB */}
        {activeTab === 'health' && (
          <div className="flex flex-col gap-2.5 animate-fade-in-up">
            <div className="grid grid-cols-2 gap-2.5">
              {renderHabitCard('habit_steps', 'Steps', '🚶', profile?.habit_targets?.habit_steps || 10000, 'steps', 'bg-orange-500', { sync: true, setOnly: true })}
              {renderHabitCard('habit_sleep', 'Sleep', '😴', profile?.habit_targets?.habit_sleep || 8, 'hrs', 'bg-indigo-500', { sync: true })}
              {renderHabitCard('habit_exercise_minutes', 'Exercise', '🏋️', profile?.habit_targets?.habit_exercise_minutes || 30, 'min', 'bg-red-500', { sync: true })}
              {renderHabitCard('habit_stand_hours', 'Stand', '🧍', profile?.habit_targets?.habit_stand_hours || 12, 'hrs', 'bg-sky-500', { sync: true })}
            </div>
            {!isHidden('habit_day_strain') && renderHabitCard('habit_day_strain', 'Day Strain', '🔥', profile?.habit_targets?.habit_day_strain || 14, 'strain', 'bg-amber-500', { sync: true, setOnly: true })}
            {!isHidden('habit_recovery') && renderHabitCard('habit_recovery', 'Recovery', '💚', profile?.habit_targets?.habit_recovery || 100, '%', 'bg-emerald-500', { sync: true, setOnly: true })}
            {!isHidden('habit_hrv') && renderHabitCard('habit_hrv', 'HRV', '💓', profile?.habit_targets?.habit_hrv || 100, 'ms', 'bg-purple-500', { sync: true, setOnly: true })}
            {!isHidden('habit_resting_hr') && renderHabitCard('habit_resting_hr', 'Resting HR', '❤️', profile?.habit_targets?.habit_resting_hr || 60, 'bpm', 'bg-red-500', { sync: true, setOnly: true })}
            {!isHidden('habit_supplements') && (
              <button
                onClick={() => handleLog('habit_supplements', 1, 'Supplements')}
                disabled={loading === 'habit_supplements'}
                className={`w-full p-3.5 rounded-xl border text-left text-sm font-medium transition-all active:scale-[0.98] ${
                  (totals['habit_supplements'] || 0) > 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/5'
                    : 'bg-zinc-900/60 border-zinc-700/40 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/60'
                }`}
              >
                💊 Supplements {(totals['habit_supplements'] || 0) > 0 ? '✓' : '— tap to log'}
              </button>
            )}

            {/* Today's Log */}
            {todayLog.length > 0 && (
              <div className="mt-2">
                <button onClick={() => setShowTodayLog(!showTodayLog)} className="flex items-center justify-between w-full text-left px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Today&apos;s Log ({todayLog.length})</span>
                  {showTodayLog ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
                </button>
                {showTodayLog && (
                  <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
                    {todayLog.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 bg-zinc-900/30 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-zinc-300 truncate capitalize">{item.name}</div>
                          <div className="text-[10px] text-zinc-600">{item.value} · {item.xp || 0} XP</div>
                        </div>
                        <button
                          onClick={async () => {
                            await deleteHistoryItemAction(userId, item.timestamp);
                            fetchProgress();
                          }}
                          className="ml-2 p-1.5 text-zinc-600 hover:text-red-400 active:text-red-500 transition flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* NUTRITION TAB */}
        {activeTab === 'nutrition' && (
          <div className="animate-fade-in-up">
            <NutritionTracker
              userId={userId}
              userProfile={profile!}
              totals={totals}
              onUpdate={fetchProgress}
              onLogHabit={async (id, val, lbl) => handleLog(id, val, lbl)}
            />
          </div>
        )}

        {/* RECOVERY TAB */}
        {activeTab === 'recovery' && (
          <div className="grid grid-cols-2 gap-2.5 animate-fade-in-up">
            {renderHabitCard('habit_cold_plunge', 'Cold Plunge', '🧊', profile?.habit_targets?.habit_cold_plunge || 3, 'min', 'bg-cyan-500')}
            {renderHabitCard('habit_sauna', 'Sauna', '🔥', profile?.habit_targets?.habit_sauna || 15, 'min', 'bg-red-500')}
            {renderHabitCard('habit_mobility', 'Mobility', '🧘', profile?.habit_targets?.habit_mobility || 10, 'min', 'bg-purple-500')}
            {renderHabitCard('habit_meditation', 'Meditation', '🧠', profile?.habit_targets?.habit_meditation || 10, 'min', 'bg-violet-500')}
          </div>
        )}

        {/* DISCIPLINE TAB */}
        {activeTab === 'discipline' && (
          <div className="flex flex-col gap-2.5 animate-fade-in-up">
            {!isHidden('habit_no_alcohol') && (
              <ViceToggle
                label="No Alcohol" icon="🍺" virtueId="habit_no_alcohol" viceId="habit_alcohol"
                history={history} viewDateStartTs={selectedDateTs}
                onLog={async (id, val, lbl) => handleLog(id, val, lbl)}
                onDelete={handleDelete}
                loading={loading === 'habit_no_alcohol' || loading === 'habit_alcohol'}
              />
            )}
            {!isHidden('habit_no_vice') && (
              <ViceToggle
                label="No Bad Habits" icon="🚫" virtueId="habit_no_vice" viceId="habit_bad_habit"
                history={history} viewDateStartTs={selectedDateTs}
                onLog={async (id, val, lbl) => handleLog(id, val, lbl)}
                onDelete={handleDelete}
                loading={loading === 'habit_no_vice' || loading === 'habit_bad_habit'}
              />
            )}
            {renderHabitCard('habit_reading', 'Reading', '📖', profile?.habit_targets?.habit_reading || 10, 'pages', 'bg-amber-500')}
            {!isHidden('habit_journaling') && (
              <button
                onClick={() => handleLog('habit_journaling', 1, 'Journaling')}
                disabled={loading === 'habit_journaling'}
                className={`w-full p-3.5 rounded-xl border text-left text-sm font-medium transition-all active:scale-[0.98] ${
                  (totals['habit_journaling'] || 0) > 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/5'
                    : 'bg-zinc-900/60 border-zinc-700/40 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/60'
                }`}
              >
                ✍️ Journaling {(totals['habit_journaling'] || 0) > 0 ? '✓' : '— tap to log'}
              </button>
            )}
            {renderHabitCard('habit_fasting', 'Fasting', '⏰', profile?.habit_targets?.habit_fasting || 16, 'hrs', 'bg-orange-500')}
          </div>
        )}

        {/* BODY TAB */}
        {activeTab === 'body' && (
          <div className="animate-fade-in-up">
            <BodyCompHome
              userId={userId}
              bodyweight={bodyweight}
              bodyCompHistory={bodyCompHistory}
              goals={initialProfile?.body_composition_goals || {}}
              measurementMode={initialProfile?.measurement_mode || 'tape'}
              onRefresh={() => BodyCompositionService.getHistory(userId).then(setBodyCompHistory)}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showSettings && profile && (
        <HabitSettings
          isOpen={showSettings}
          userProfile={profile}
          onUpdate={async () => {
            const fresh = await getProfile(userId);
            setProfile(fresh);
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div className="h-40 md:h-0 w-full shrink-0" />
    </div>
  );
}
