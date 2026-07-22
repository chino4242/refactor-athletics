"use client";

/**
 * FuelVibrant v3 — One unified screen.
 * 
 * Everything flows inside a single surface:
 * rings → input → favorites → journal
 * No separation. The rings show progress, the input fills them.
 */

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Totals { protein: number; carbs: number; fat: number; calsIn: number; burned: number; }
interface Targets { protein: number; carbs: number; fat: number; calories: number; }
interface Favorite { id: string; name: string; meal_tag: string | null; total_protein: number; total_carbs: number; total_fat: number; total_calories: number; items: any[]; }
interface ParsedMeal { protein: number; carbs: number; fat: number; calories: number; items?: { name: string; protein: number; carbs: number; fat: number; calories: number }[]; _favoriteId?: string; }
interface Meal { timestamp: number; label: string; meal_tag: string; protein: number; carbs: number; fat: number; calories: number; }

interface Props {
  totals: Totals;
  targets: Targets;
  favorites: Favorite[];
  meals: Meal[];
  nudge: string | null;
  pending: ParsedMeal | null;
  loading: boolean;
  mealTag: string;
  text: string;
  weeklyDots: boolean[];
  tierIndex: number;
  onTextChange: (t: string) => void;
  onMealTagChange: (tag: string) => void;
  onSubmit: () => void;
  onConfirm: () => void;
  onConfirmWithMultiplier: (multiplier: number) => void;
  onDismiss: () => void;
  onPhotoCapture: () => void;
  onPhotoUpload: () => void;
  onFavoriteTap: (fav: Favorite) => void;
  onFavoriteLongPress: (fav: Favorite) => void;
  onMealDelete: (meal: Meal) => void;
  onNudgeTap: () => void;
  onNudgeDismiss: () => void;
  onCoachOpen: () => void;
  deletingTimestamp: number | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MEAL_TAGS = [
  { key: 'breakfast', emoji: '🌅', label: 'Breakfast' },
  { key: 'lunch', emoji: '☀️', label: 'Lunch' },
  { key: 'snack', emoji: '🍎', label: 'Snack' },
  { key: 'dinner', emoji: '🌙', label: 'Dinner' },
];

const MEAL_TAG_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];

const VIBRANT_ACCENTS: Record<string, { gradient: string; text: string }> = {
  athlete: { gradient: 'from-orange-500 to-amber-400', text: 'text-orange-400' },
  dragon: { gradient: 'from-red-500 to-orange-400', text: 'text-red-400' },
  samurai: { gradient: 'from-indigo-500 to-pink-400', text: 'text-pink-400' },
  viking: { gradient: 'from-sky-500 to-cyan-400', text: 'text-sky-300' },
  dinosaur: { gradient: 'from-green-500 to-emerald-400', text: 'text-emerald-400' },
};

// Themed narratives
type FuelState = 'empty' | 'under' | 'balanced' | 'over';

const FUEL_NARRATIVES: Record<string, Record<FuelState, string[]>> = {
  samurai: {
    empty: ['The blade hungers. Nourish it.', 'An empty stomach clouds the mind.'],
    under: ['Light provisions. Room to fuel.', 'The body awaits its rations.'],
    balanced: ['Balanced fuel. The blade stays sharp.', 'Discipline in every grain of rice.'],
    over: ['Running heavy — burn before nightfall.', 'Excess dulls the edge.'],
  },
  dragon: {
    empty: ['The flame flickers without fuel.', 'Feed the fire within.'],
    under: ['Embers need kindling.', 'The furnace runs low.'],
    balanced: ['The flame burns steady.', 'Properly fueled. Fire at the ready.'],
    over: ['Too much fuel — the fire rages.', 'Excess stokes a reckless flame.'],
  },
  viking: {
    empty: ['A warrior does not sail hungry.', 'The feast hall awaits.'],
    under: ['Light rations. Room for the hunt.', 'A lean day sharpens hunger.'],
    balanced: ['Well-provisioned for battle.', 'The longship is stocked.'],
    over: ['Too much mead — stay sharp.', 'Heavy belly, slow axe.'],
  },
  dinosaur: {
    empty: ['The predator must eat.', 'Energy reserves depleting.'],
    under: ['Still hunting. Fuel up soon.', 'The pack needs sustenance.'],
    balanced: ['Well-fed. Ready to hunt.', 'Optimal fuel for the apex.'],
    over: ['Overfed — digestion slows.', 'Too heavy to sprint.'],
  },
  athlete: {
    empty: ['Nothing logged yet — start fueling.', 'Day\'s still young.'],
    under: ['Under target. Room to eat.', 'On track — keep logging.'],
    balanced: ['Hitting your targets. Nice.', 'Macros on point.'],
    over: ['Over target. Hold here.', 'A bit above today.'],
  },
};

const MACRO_CELEBRATIONS: Record<string, string> = {
  samurai: '⚔️ All macros aligned. The warrior is fully fueled.',
  dragon: '🔥 All macros aligned. The dragon is sated.',
  viking: '⚡ All macros aligned. Ready for Valhalla.',
  dinosaur: '🦖 All macros aligned. Apex nutrition.',
  athlete: '💪 All macros hit. Great day.',
};

const PROTEIN_CELEBRATIONS: Record<string, string> = {
  samurai: '⚔️ Protein forged.',
  dragon: '🔥 The forge burns bright.',
  viking: '⚡ Meat on the bone.',
  dinosaur: '🦖 Protein consumed.',
  athlete: '💪 Protein target hit!',
};

function getFuelState(totals: Totals, targets: Targets): FuelState {
  if (totals.calsIn === 0) return 'empty';
  const net = totals.calsIn - totals.burned;
  if (net > targets.calories * 0.15) return 'over';
  if (totals.calsIn < targets.calories * 0.4) return 'under';
  return 'balanced';
}

function getNarrative(theme: string, state: FuelState): string {
  const lines = FUEL_NARRATIVES[theme]?.[state] || FUEL_NARRATIVES.athlete[state];
  return lines[new Date().getDate() % lines.length];
}

// ─── Macro Ring ───────────────────────────────────────────────────────────────

function MacroRing({ label, current, target, color }: { label: string; current: number; target: number; color: string; }) {
  const pct = Math.min(current / target, 1);
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const hit = current >= target;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#27272a" strokeWidth="5" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={hit ? '#22c55e' : color} strokeWidth="5" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-sm font-black leading-none ${hit ? 'text-emerald-400' : 'text-white'}`}>{current}</span>
        </div>
      </div>
      <p className="text-xs text-zinc-400">{label} <span className="text-zinc-600">/ {target}g</span></p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FuelVibrant({
  totals, targets, favorites, meals, nudge, pending, loading,
  mealTag, text, weeklyDots, tierIndex,
  onTextChange, onMealTagChange, onSubmit, onConfirm, onConfirmWithMultiplier, onDismiss,
  onPhotoCapture, onPhotoUpload, onFavoriteTap, onFavoriteLongPress,
  onMealDelete, onNudgeTap, onNudgeDismiss, onCoachOpen,
  deletingTimestamp,
}: Props) {
  const { currentTheme } = useTheme();
  const accent = VIBRANT_ACCENTS[currentTheme] || VIBRANT_ACCENTS.athlete;
  const net = totals.calsIn - totals.burned;
  const netStatus = net < -200 ? 'under' : net > 200 ? 'over' : 'on-track';
  const [portions, setPortions] = useState(1);
  const [celebration, setCelebration] = useState<string | null>(null);
  const currentMealTag = MEAL_TAGS.find(m => m.key === mealTag);
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const fuelState = getFuelState(totals, targets);
  const narrative = getNarrative(currentTheme, fuelState);
  const proteinHit = totals.protein >= targets.protein;
  const allMacrosHit = proteinHit && totals.carbs >= targets.carbs && totals.fat >= targets.fat;

  const checkCelebration = () => {
    if (allMacrosHit) {
      setCelebration(MACRO_CELEBRATIONS[currentTheme] || MACRO_CELEBRATIONS.athlete);
    } else if (proteinHit) {
      setCelebration(PROTEIN_CELEBRATIONS[currentTheme] || PROTEIN_CELEBRATIONS.athlete);
    }
    if (celebration) setTimeout(() => setCelebration(null), 3500);
  };

  // Group meals by tag
  const mealsByTag: Record<string, Meal[]> = {};
  for (const meal of meals) {
    const tag = meal.meal_tag || 'snack';
    if (!mealsByTag[tag]) mealsByTag[tag] = [];
    mealsByTag[tag].push(meal);
  }

  return (
    <div className="rounded-3xl bg-gradient-to-b from-zinc-800/50 to-zinc-900/70 border border-zinc-700/20 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.3)]">
      {/* Accent bar */}
      <div className={`h-1 bg-gradient-to-r ${accent.gradient}`} />

      <div className="p-5 space-y-5">

        {/* ── HEADER: Avatar + Net + Narrative ── */}
        <div className="flex items-start gap-3">
          {currentTheme !== 'athlete' && (
            <img
              src={`/avatars/${currentTheme}/male_t${tierIndex}.png`}
              alt=""
              className="w-10 h-10 shrink-0 mt-0.5"
              style={{ imageRendering: 'pixelated' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-black tracking-tight leading-none ${
                netStatus === 'under' ? 'text-emerald-400' : netStatus === 'over' ? 'text-amber-400' : 'text-white'
              }`}>
                {net > 0 ? '+' : ''}{net}
              </p>
              <span className="text-xs text-zinc-500">net cal</span>
            </div>
            <p className={`text-xs ${accent.text} mt-1 italic opacity-80`}>{narrative}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-zinc-500">IN {totals.calsIn.toLocaleString()}</span>
              {totals.burned > 0 && <span className="text-xs text-zinc-500">BURN {totals.burned.toLocaleString()}</span>}
            </div>
          </div>
          {/* Coach button */}
          <button onClick={onCoachOpen} className={`text-xs ${accent.text} bg-zinc-800/80 px-2 py-1 rounded-lg shrink-0`}>
            🧠
          </button>
        </div>

        {/* ── MACRO RINGS ── */}
        <div className="flex items-start justify-around py-1">
          <MacroRing label="Protein" current={totals.protein} target={targets.protein} color="#3b82f6" />
          <MacroRing label="Carbs" current={totals.carbs} target={targets.carbs} color="#f97316" />
          <MacroRing label="Fat" current={totals.fat} target={targets.fat} color="#eab308" />
        </div>

        {/* Weekly dots (compact) */}
        {weeklyDots.length > 0 && (
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-[10px] text-zinc-600">Protein wk</span>
            {dayLabels.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${weeklyDots[i] ? 'bg-blue-500' : 'bg-zinc-700'}`} />
            ))}
          </div>
        )}

        {/* ── CELEBRATION TOAST ── */}
        {celebration && (
          <p className={`text-center text-sm font-bold ${accent.text} animate-fade-in`}>{celebration}</p>
        )}

        {/* ── NUDGE ── */}
        {nudge && !pending && !loading && (
          <button onClick={onNudgeTap} className="w-full flex items-start gap-2 text-left">
            <span className="text-xs shrink-0">📊</span>
            <span className="text-xs text-zinc-300 flex-1">{nudge}</span>
            <span onClick={(e) => { e.stopPropagation(); onNudgeDismiss(); }} className="text-zinc-700 text-xs">✕</span>
          </button>
        )}

        {/* ── DIVIDER ── */}
        <div className="border-t border-zinc-800/50" />

        {/* ── LOADING ── */}
        {loading && (
          <div className="flex items-center gap-3 py-2 animate-pulse">
            <span className="text-lg">🧠</span>
            <span className="text-sm text-zinc-400">Analyzing...</span>
          </div>
        )}

        {/* ── PENDING CONFIRMATION ── */}
        {pending && !loading && (
          <div className="space-y-3">
            {pending.items && pending.items.length > 0 && (
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {pending.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-200 truncate max-w-[180px]">{item.name}</span>
                    <span className="text-xs text-zinc-500">{Math.round(item.calories * portions)} cal</span>
                  </div>
                ))}
              </div>
            )}
            {/* Portion stepper */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-white">{Math.round(pending.calories * portions)} cal</p>
                <p className="text-xs text-zinc-500">P:{Math.round(pending.protein * portions)} C:{Math.round(pending.carbs * portions)} F:{Math.round(pending.fat * portions)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPortions(Math.max(0.5, portions - 0.5))} className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center">−</button>
                <span className="text-sm font-bold text-white w-8 text-center">{portions === 1 ? '1' : portions.toFixed(1).replace('.0', '')}×</span>
                <button onClick={() => setPortions(portions + 0.5)} className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold flex items-center justify-center">+</button>
              </div>
            </div>
            {/* Confirm */}
            <div className="flex items-center justify-between">
              <button onClick={() => { const idx = MEAL_TAGS.findIndex(m => m.key === mealTag); onMealTagChange(MEAL_TAGS[(idx + 1) % MEAL_TAGS.length].key); }} className="text-sm text-zinc-400 flex items-center gap-1">
                {currentMealTag?.emoji} <span className="text-xs">{currentMealTag?.label}</span>
              </button>
              <div className="flex gap-2">
                <button onClick={() => { onDismiss(); setPortions(1); }} className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm">Cancel</button>
                <button onClick={() => { onConfirmWithMultiplier(portions); setPortions(1); setTimeout(checkCelebration, 300); }} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold">Log</button>
              </div>
            </div>
          </div>
        )}

        {/* ── INPUT COMPOSER ── */}
        {!pending && !loading && (
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-3 py-2.5">
              <textarea
                value={text}
                onChange={e => onTextChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
                placeholder="What did you eat?"
                rows={1}
                className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none resize-none"
              />
            </div>
            <button onClick={onPhotoCapture} className="w-9 h-9 rounded-xl bg-zinc-900/60 border border-zinc-800/50 flex items-center justify-center shrink-0">
              <span className="text-sm">📷</span>
            </button>
            <button
              onClick={onSubmit}
              disabled={!text.trim()}
              className={`h-9 px-3 rounded-xl font-bold text-sm shrink-0 transition-all ${text.trim() ? `bg-gradient-to-r ${accent.gradient} text-white` : 'bg-zinc-900/60 border border-zinc-800/50 text-zinc-600'}`}
            >
              →
            </button>
          </div>
        )}

        {/* ── FAVORITES TRAY ── */}
        {!pending && !loading && favorites.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none -mx-1 px-1">
            {favorites.map(fav => (
              <button
                key={fav.id}
                onClick={() => onFavoriteTap(fav)}
                onContextMenu={(e) => { e.preventDefault(); onFavoriteLongPress(fav); }}
                className="flex-shrink-0 bg-zinc-900/60 border border-zinc-800/40 rounded-lg px-2.5 py-1.5 active:scale-95 transition-transform"
              >
                <span className="text-xs text-zinc-300 whitespace-nowrap">{fav.name.length > 18 ? fav.name.slice(0, 18) + '…' : fav.name}</span>
                <span className="text-[10px] text-zinc-600 ml-1.5">{fav.total_calories}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── DIVIDER (only if journal has content) ── */}
        {meals.length > 0 && <div className="border-t border-zinc-800/50" />}

        {/* ── MEAL JOURNAL ── */}
        {meals.length > 0 && (
          <div className="space-y-0.5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Today</p>
            {MEAL_TAG_ORDER.filter(tag => mealsByTag[tag]?.length > 0).map(tag => (
              <div key={tag}>
                {mealsByTag[tag].map(meal => (
                  <div
                    key={meal.timestamp}
                    className={`flex items-center justify-between py-2 transition-opacity ${deletingTimestamp === meal.timestamp ? 'opacity-30' : ''}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm shrink-0">{MEAL_TAGS.find(m => m.key === tag)?.emoji}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-200 truncate">{meal.label || 'Meal'}</p>
                        <p className="text-[10px] text-zinc-600">{meal.calories} cal · P:{meal.protein} C:{meal.carbs} F:{meal.fat}</p>
                      </div>
                    </div>
                    <button onClick={() => onMealDelete(meal)} className="text-zinc-700 text-xs px-2 py-1 hover:text-red-400 transition-colors shrink-0">✕</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {meals.length === 0 && !pending && !loading && (
          <p className="text-xs text-zinc-600 text-center py-2">Your meals will show up here</p>
        )}

      </div>
    </div>
  );
}
