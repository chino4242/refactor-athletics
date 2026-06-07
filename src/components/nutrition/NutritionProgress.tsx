'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { NutritionTargets } from '@/types';

interface NutritionProgressProps {
  totals: Record<string, number>;
  targets: NutritionTargets;
  userId: string;
}

export default function NutritionProgress({ totals, targets, userId }: NutritionProgressProps) {
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<'daily' | 'weekly'>('daily');
  const [weeklyData, setWeeklyData] = useState<{ date: string; p: number; c: number; f: number; calsIn: number; burned: number; net: number }[] | null>(null);

  const protein = Math.round(totals['macro_protein'] || 0);
  const carbs = Math.round(totals['macro_carbs'] || 0);
  const fat = Math.round(totals['macro_fat'] || 0);
  const water = Math.round(totals['habit_water'] || 0);
  const caloriesIn = Math.round(totals['macro_calories'] || 0);
  const caloriesBurned = Math.round(totals['macro_calories_burned'] || 0);
  const netToday = caloriesIn - caloriesBurned;
  const netTarget = targets.net_calorie_target || -500;

  // Fetch weekly data when weekly view is opened
  useEffect(() => {
    if (view !== 'weekly' || weeklyData) return;
    const fetchWeekly = async () => {
      const supabase = createClient();
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(d.toLocaleDateString('en-CA'));
      }

      const { data: nutrition } = await supabase
        .from('nutrition_logs').select('date, macro_type, amount')
        .eq('user_id', userId).gte('date', dates[0]).lte('date', dates[6]);

      const { data: meals } = await supabase
        .from('meal_entries').select('date, protein, carbs, fat')
        .eq('user_id', userId).gte('date', dates[0]).lte('date', dates[6]);

      const buckets = dates.map(date => {
        const dayNutrition = (nutrition || []).filter(n => n.date === date);
        const dayMeals = (meals || []).filter(m => m.date === date);
        const burned = dayNutrition.filter(n => n.macro_type === 'calories_burned').reduce((s, n) => s + (n.amount || 0), 0);
        const p = dayMeals.reduce((s, m) => s + (m.protein || 0), 0) || dayNutrition.filter(n => n.macro_type === 'protein').reduce((s, n) => s + (n.amount || 0), 0);
        const c = dayMeals.reduce((s, m) => s + (m.carbs || 0), 0) || dayNutrition.filter(n => n.macro_type === 'carbs').reduce((s, n) => s + (n.amount || 0), 0);
        const f = dayMeals.reduce((s, m) => s + (m.fat || 0), 0) || dayNutrition.filter(n => n.macro_type === 'fat').reduce((s, n) => s + (n.amount || 0), 0);
        const calsIn = p * 4 + c * 4 + f * 9;
        return { date, p, c, f, calsIn, burned, net: calsIn - burned };
      });
      setWeeklyData(buckets);
    };
    fetchWeekly();
  }, [view, userId, weeklyData]);

  const bars: { label: string; value: number; target: number; color: string; unit: string }[] = [
    { label: 'Calories', value: caloriesIn, target: targets.calories || 2000, color: 'bg-green-500', unit: 'kcal' },
    { label: 'Protein', value: protein, target: targets.protein || 150, color: 'bg-blue-500', unit: 'g' },
    { label: 'Carbs', value: carbs, target: targets.carbs || 200, color: 'bg-orange-500', unit: 'g' },
    { label: 'Fat', value: fat, target: targets.fat || 65, color: 'bg-yellow-500', unit: 'g' },
    { label: 'Water', value: water, target: targets.water || 100, color: 'bg-cyan-500', unit: 'oz' },
  ];

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayIdx = ((new Date().getDay() + 6) % 7); // 0=Mon

  // Weekly totals
  const weeklyNet = weeklyData?.reduce((s, d) => s + d.net, 0) ?? 0;
  const weeklyTargetTotal = netTarget * 7;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Collapsed summary — always visible */}
      <button onClick={() => setExpanded(!expanded)} className="w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] font-medium">
          <span className={protein >= (targets.protein || 150) ? 'text-blue-400' : 'text-zinc-400'}>P:{protein}/{targets.protein || 150}</span>
          <span className={carbs >= (targets.carbs || 200) ? 'text-orange-400' : 'text-zinc-400'}>C:{carbs}/{targets.carbs || 200}</span>
          <span className={fat >= (targets.fat || 65) ? 'text-yellow-400' : 'text-zinc-400'}>F:{fat}/{targets.fat || 65}</span>
          <span className={netToday <= netTarget ? 'text-emerald-400' : 'text-zinc-400'}>
            Today: {netToday > 0 ? '+' : ''}{netToday.toLocaleString()}
          </span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
      </button>

      {/* Expanded view */}
      {expanded && (
        <div className="px-4 pb-4">
          {/* Daily / Weekly toggle */}
          <div className="flex bg-zinc-800 rounded-lg p-0.5 mb-3">
            <button onClick={() => setView('daily')} className={`flex-1 py-1.5 text-[10px] font-bold rounded ${view === 'daily' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>TODAY</button>
            <button onClick={() => setView('weekly')} className={`flex-1 py-1.5 text-[10px] font-bold rounded ${view === 'weekly' ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>THIS WEEK</button>
          </div>

          {view === 'daily' ? (
            <div className="space-y-3">
              {bars.map(bar => {
                const pct = bar.target > 0 ? Math.min((bar.value / bar.target) * 100, 100) : 0;
                return (
                  <div key={bar.label}>
                    <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase mb-1">
                      <span>{bar.label}</span>
                      <span className={bar.value >= bar.target ? bar.color.replace('bg-', 'text-') : 'text-zinc-400'}>
                        {bar.value} / {bar.target} {bar.unit}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${bar.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}

              {/* Daily Net */}
              <div className={`p-3 rounded-lg border ${netToday <= netTarget ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-zinc-950/50 border-zinc-800'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-zinc-400">Today&apos;s Net</span>
                  <div>
                    <span className={`text-lg font-black ${netToday <= 0 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                      {netToday > 0 ? '+' : ''}{netToday.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-zinc-500 ml-1">/ {netTarget} kcal</span>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                  <span>In: {caloriesIn.toLocaleString()}</span>
                  <span>Burned: {caloriesBurned.toLocaleString()}{caloriesBurned > 3000 ? ' (WHOOP total)' : ''}</span>
                  <span className={netToday <= netTarget ? 'text-emerald-400 font-bold' : ''}>
                    {netToday <= netTarget ? '✓ On Target' : `${Math.round(netToday - netTarget).toLocaleString()} over`}
                  </span>
                </div>
                {caloriesBurned > 3000 && (
                  <p className="text-[9px] text-zinc-600 mt-1">Includes BMR — WHOOP reports total daily expenditure, not just active calories.</p>
                )}
              </div>
            </div>
          ) : (
            /* Weekly View */
            <div className="space-y-3">
              {/* Weekly net summary */}
              <div className={`p-3 rounded-lg border ${weeklyNet <= weeklyTargetTotal ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-zinc-950/50 border-zinc-800'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-zinc-400">Weekly Net</span>
                  <div>
                    <span className={`text-lg font-black ${weeklyNet <= weeklyTargetTotal ? 'text-emerald-400' : 'text-zinc-300'}`}>
                      {weeklyNet > 0 ? '+' : ''}{weeklyNet.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-zinc-500 ml-1">/ {weeklyTargetTotal.toLocaleString()} kcal</span>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">One day doesn&apos;t make or break the plan — weekly trend matters more.</p>
              </div>

              {/* Day-by-day breakdown */}
              {weeklyData ? (
                <div className="space-y-1.5">
                  {weeklyData.map((day, i) => {
                    const isFuture = i > todayIdx;
                    const isToday = i === todayIdx;
                    return (
                      <div key={i} className={`flex items-center gap-2 text-[11px] ${isFuture ? 'opacity-30' : ''}`}>
                        <span className={`w-4 text-center font-bold ${isToday ? 'text-orange-400' : 'text-zinc-500'}`}>{dayLabels[i]}</span>
                        <div className="flex-1 h-4 bg-zinc-800 rounded-sm overflow-hidden relative">
                          {!isFuture && day.calsIn > 0 && (
                            <div
                              className={`h-full ${day.net <= netTarget ? 'bg-emerald-500' : day.net <= 0 ? 'bg-cyan-500' : 'bg-red-500'} rounded-sm`}
                              style={{ width: `${Math.min(Math.abs(day.net) / Math.abs(netTarget) * 50, 100)}%` }}
                            />
                          )}
                          {!isFuture && day.calsIn === 0 && i < todayIdx && (
                            <div className="h-full flex items-center justify-center text-[8px] text-zinc-600">—</div>
                          )}
                        </div>
                        <span className={`w-16 text-right font-medium ${isFuture ? 'text-zinc-600' : day.net <= netTarget ? 'text-emerald-400' : 'text-zinc-400'}`}>
                          {isFuture ? '—' : `${day.net > 0 ? '+' : ''}${day.net.toLocaleString()}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-[11px] text-zinc-500">Loading weekly data...</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
