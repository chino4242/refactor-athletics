import { createClient } from '@/utils/supabase/client';
import { PATH_KEY_EXERCISES } from '@/data/pathExercises';

/** Decay windows: how long a rank level stays valid */
const DECAY_WINDOWS_DAYS: Record<number, number> = {
  1: 90, 2: 90,
  3: 60, 4: 60,
  5: 45,
};

export interface RankedExercise {
  exerciseId: string;
  name: string;
  level: number;
  bestValue: number;
  lastLoggedDate: string;
  daysUntilExpiry: number;
  expired: boolean;
}

export interface PowerLevelV2Data {
  powerLevel: number;
  maxPossible: number;
  exercises: RankedExercise[];
  expiringExercises: RankedExercise[];
  closestRankUps: { name: string; exerciseId: string; currentLevel: number; gap: string }[];
  recentPRs: { name: string; value: string; date: string }[];
}

export async function getPowerLevelV2(userId: string): Promise<PowerLevelV2Data> {
  const supabase = createClient();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');

  const [{ data: workouts }, { data: catalog }, { data: profile }] = await Promise.all([
    supabase.from('workouts').select('exercise_id, level, raw_value, date, timestamp, sets').eq('user_id', userId).gte('date', ninetyDaysAgo),
    supabase.from('catalog').select('id, name, standards, normalizes_to'),
    supabase.from('users').select('selected_path, age, sex, bodyweight').eq('id', userId).single(),
  ]);

  const userPath = profile?.selected_path || 'hybrid';
  const keyExerciseIds = PATH_KEY_EXERCISES[userPath] || PATH_KEY_EXERCISES['hybrid'];
  const keySet = new Set(keyExerciseIds);

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');
  const catalogMap = new Map((catalog || []).map((c: any) => [c.id, c]));

  // Build variant → base normalization map
  const variantToBase = new Map<string, string>();
  for (const c of catalog || []) {
    if ((c as any).normalizes_to) variantToBase.set(c.id, (c as any).normalizes_to);
  }

  // For each key exercise, find best level within its decay window
  const exercises: RankedExercise[] = [];

  for (const exId of keyExerciseIds) {
    const catItem = catalogMap.get(exId);
    const name = catItem?.name || exId.replace(/_/g, ' ');

    // Get all workouts for this exercise (including variants that normalize to it)
    const exWorkouts = (workouts || []).filter((w: any) => {
      const effectiveId = variantToBase.get(w.exercise_id) || w.exercise_id;
      return effectiveId === exId && w.level > 0;
    });

    if (exWorkouts.length === 0) {
      exercises.push({ exerciseId: exId, name, level: 0, bestValue: 0, lastLoggedDate: '', daysUntilExpiry: 0, expired: false });
      continue;
    }

    // Find best level and when it was achieved
    let bestLevel = 0;
    let bestValue = 0;
    let lastLoggedDate = '';

    for (const w of exWorkouts) {
      const wDate = w.date || new Date(w.timestamp * 1000).toLocaleDateString('en-CA');
      const windowDays = DECAY_WINDOWS_DAYS[w.level] || 90;
      const daysSince = Math.floor((today.getTime() - new Date(wDate + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24));

      // Only count if within the decay window for that level
      if (daysSince <= windowDays) {
        if (w.level > bestLevel) {
          bestLevel = w.level;
          bestValue = w.raw_value || 0;
          lastLoggedDate = wDate;
        }
      }
    }

    // If no valid entries within window, find the most recent log date anyway (for "last logged" display)
    if (bestLevel === 0) {
      const sorted = exWorkouts.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
      lastLoggedDate = sorted[0]?.date || '';
    }

    // Calculate days until expiry for the current best level
    let daysUntilExpiry = 0;
    let expired = false;
    if (bestLevel > 0 && lastLoggedDate) {
      const windowDays = DECAY_WINDOWS_DAYS[bestLevel] || 90;
      const daysSince = Math.floor((today.getTime() - new Date(lastLoggedDate + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24));
      daysUntilExpiry = windowDays - daysSince;
      expired = daysUntilExpiry <= 0;
    } else if (exWorkouts.length > 0 && bestLevel === 0) {
      expired = true;
    }

    exercises.push({ exerciseId: exId, name, level: expired ? 0 : bestLevel, bestValue, lastLoggedDate, daysUntilExpiry, expired });
  }

  // Power Level = sum of valid (non-expired) levels
  const powerLevel = exercises.reduce((sum, ex) => sum + ex.level, 0);

  // Expiring soon: within 14 days of expiry, not already expired, level > 0
  const expiringExercises = exercises
    .filter(ex => ex.level > 0 && ex.daysUntilExpiry > 0 && ex.daysUntilExpiry <= 14)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  // Closest rank-ups: exercises with level < 5, sorted by how close they are to next threshold
  const closestRankUps: { name: string; exerciseId: string; currentLevel: number; gap: string }[] = [];
  const userAge = profile?.age || 25;
  const userSex = (profile?.sex || 'male').toLowerCase();
  const userBw = profile?.bodyweight || 180;

  for (const ex of exercises) {
    if (ex.level >= 5) continue;
    const catItem = catalogMap.get(ex.exerciseId);
    if (!catItem?.standards?.brackets) continue;
    const sexKey = userSex === 'female' ? 'female' : 'male';
    const brackets = catItem.standards.brackets[sexKey];
    if (!brackets?.length) continue;
    const bracket = brackets.find((b: any) => userAge >= b.min && userAge <= b.max) || brackets[0];
    if (!bracket?.levels) continue;

    const nextThreshold = bracket.levels[ex.level]; // levels[0] = threshold for level 1
    if (!nextThreshold) continue;

    const unit = (catItem.standards.unit || '').toLowerCase();
    let gap: string;
    if (unit === 'xbw') {
      const targetLbs = Math.round(nextThreshold * userBw);
      const diff = targetLbs - Math.round(ex.bestValue || 0);
      gap = diff > 0 ? `est. 1RM ${Math.round(ex.bestValue || 0)} → ${targetLbs}` : 'Ready!';
    } else if (unit === 'sec' && catItem.standards.scoring === 'lower_is_better') {
      const diff = Math.round((ex.bestValue || 9999) - nextThreshold);
      const targetSec = Math.round(nextThreshold);
      const min = Math.floor(targetSec / 60);
      const sec = targetSec % 60;
      const targetStr = min > 0 ? `${min}:${String(sec).padStart(2, '0')}` : `${targetSec}s`;
      gap = diff > 0 ? `need ${targetStr}` : 'Ready!';
    } else if (unit === 'sec') {
      const diff = Math.round(nextThreshold - (ex.bestValue || 0));
      gap = diff > 0 ? `need ${Math.round(nextThreshold)}s` : 'Ready!';
    } else {
      const diff = Math.round(nextThreshold - (ex.bestValue || 0));
      gap = diff > 0 ? `need ${Math.round(nextThreshold)} reps` : 'Ready!';
    }

    closestRankUps.push({ name: ex.name, exerciseId: ex.exerciseId, currentLevel: ex.level, gap });
  }

  // Sort by closest to ranking up (smallest gap first) — limit to 3
  closestRankUps.sort((a, b) => {
    if (a.gap === 'Ready!') return -1;
    if (b.gap === 'Ready!') return 1;
    return a.currentLevel - b.currentLevel;
  });

  // Recent PRs: workouts in last 7 days with level > 0
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA');
  const recentPRs = (workouts || [])
    .filter((w: any) => (keySet.has(w.exercise_id) || keySet.has(variantToBase.get(w.exercise_id) || '')) && w.level > 0 && (w.date || '') >= sevenDaysAgo)
    .reduce((acc: any[], w: any) => {
      // Keep only the best per exercise in last 7 days
      const existing = acc.find(a => a.exercise_id === w.exercise_id);
      if (!existing || w.level > existing.level) {
        const filtered = acc.filter(a => a.exercise_id !== w.exercise_id);
        filtered.push(w);
        return filtered;
      }
      return acc;
    }, [])
    .map((w: any) => {
      const catItem = catalogMap.get(w.exercise_id);
      const name = catItem?.name || w.exercise_id.replace(/_/g, ' ');
      const unit = catItem?.standards?.unit || '';
      let value = '';
      if (unit === 'xBW') {
        // Show actual lift + est 1RM
        const sets = Array.isArray(w.sets) ? w.sets : [];
        const bestSet = sets.reduce((best: any, s: any) => (!best || (s.weight || 0) > (best.weight || 0)) ? s : best, null);
        if (bestSet && bestSet.weight) {
          value = `${bestSet.weight} × ${bestSet.reps || 1} (est. ${Math.round(w.raw_value)} lbs)`;
        } else value = `${Math.round(w.raw_value)} lbs`;
      } else if (unit === 'Sec') {
        const min = Math.floor(w.raw_value / 60);
        const sec = Math.round(w.raw_value % 60);
        value = min > 0 ? `${min}:${String(sec).padStart(2, '0')}` : `${sec}s`;
      } else value = `${Math.round(w.raw_value)} ${unit.toLowerCase()}`;
      return { name, value, date: w.date || '' };
    })
    .slice(0, 5);

  return {
    powerLevel,
    maxPossible: 60,
    exercises,
    expiringExercises,
    closestRankUps: closestRankUps.slice(0, 3),
    recentPRs,
  };
}
