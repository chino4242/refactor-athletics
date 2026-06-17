/** Native health service — SSR-safe, no-op on web, fires on native iOS/Android */

function isNative(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
}

function isIOS(): boolean {
  return typeof window !== 'undefined' && (window as any).Capacitor?.getPlatform?.() === 'ios';
}

let healthPlugin: any = null;

function getHealth(): any {
  if (!healthPlugin) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerPlugin } = require('@capacitor/core');
    healthPlugin = registerPlugin('Health');
  }
  return healthPlugin;
}

// v8 data type strings (camelCase per definitions.ts)
const ANDROID_READ_TYPES = ['steps', 'totalCalories', 'sleep', 'weight', 'heartRate', 'heartRateVariability', 'bodyFat', 'workouts'];
const IOS_READ_TYPES = ['steps', 'activeEnergyBurned', 'basalEnergyBurned', 'sleepAnalysis', 'weight', 'heartRate', 'heartRateVariability', 'bodyFatPercentage', 'workouts', 'restingHeartRate'];

export async function isHealthAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try { const h = getHealth(); return (await h.isAvailable()).available; } catch { return false; }
}

export async function requestPermissions(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const h = getHealth();
    const types = isIOS() ? IOS_READ_TYPES : ANDROID_READ_TYPES;
    await h.requestAuthorization({ read: types as any, write: [] });
    // On iOS, Apple NEVER reveals read authorization status (always returns empty/notDetermined).
    // We must always return true after requesting and attempt reads — HealthKit will return
    // empty data for denied types but real data for granted types. Gating on the return
    // value would block ALL iOS health syncing.
    return true;
  } catch { return false; }
}

/** Open device health settings so user can manually grant permissions */
export async function openHealthSettings(): Promise<void> {
  if (!isNative()) return;
  try { const h = getHealth(); await h.openHealthConnectSettings(); } catch {}
}

/** Helper: extract aggregated value from queryAggregated response */
function sumAggregated(result: any): number {
  // v8 returns { samples: [{ value, ... }] }
  if (result.samples?.length) {
    return result.samples.reduce((s: number, sample: any) => s + (sample.value || 0), 0);
  }
  // Legacy fallback
  return result.value || 0;
}

export async function getSteps(startDate: string, endDate: string): Promise<number> {
  if (!isNative()) return 0;
  try {
    const h = getHealth();
    const result = await h.queryAggregated({ dataType: 'steps', startDate, endDate });
    return Math.round(sumAggregated(result));
  } catch { return 0; }
}

export async function getCaloriesBurned(startDate: string, endDate: string): Promise<number> {
  if (!isNative()) return 0;
  try {
    const h = getHealth();
    if (isIOS()) {
      // iOS: sum basal + active energy for total calories burned
      const [basal, active] = await Promise.all([
        h.queryAggregated({ dataType: 'basalEnergyBurned', startDate, endDate }).catch(() => ({ samples: [] })),
        h.queryAggregated({ dataType: 'activeEnergyBurned', startDate, endDate }).catch(() => ({ samples: [] })),
      ]);
      const total = sumAggregated(basal) + sumAggregated(active);
      return Math.round(total);
    }
    // Android: try total calories first, fall back to active-only
    const result = await h.queryAggregated({ dataType: 'totalCalories', startDate, endDate });
    const total = sumAggregated(result);
    if (total > 0) return Math.round(total);
    const active = await h.queryAggregated({ dataType: 'calories', startDate, endDate });
    return Math.round(sumAggregated(active));
  } catch { return 0; }
}

export async function getSleep(startDate: string, endDate: string): Promise<number> {
  if (!isNative()) return 0;
  try {
    const h = getHealth();
    if (isIOS()) {
      // iOS: HealthKit doesn't support aggregated sleep queries; use readSamples
      const { samples } = await h.readSamples({ dataType: 'sleepAnalysis', startDate, endDate, limit: 100 });
      if (!samples?.length) return 0;
      // Sum duration of all sleep samples (value is minutes in Capgo plugin)
      return Math.round(samples.reduce((s: number, sample: any) => s + (sample.value || 0), 0));
    }
    // Android: aggregated query works
    const result = await h.queryAggregated({ dataType: 'sleep', startDate, endDate });
    const val = sumAggregated(result);
    return Math.round(val);
  } catch { return 0; }
}

export async function getWeight(): Promise<number | null> {
  if (!isNative()) return null;
  try {
    const h = getHealth();
    const { samples } = await h.readSamples({
      dataType: 'weight',
      startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
      endDate: new Date().toISOString(),
      limit: 1,
      ascending: false,
    });
    // Plugin returns kg; app uses lbs
    const kg = samples?.[0]?.value || null;
    return kg ? Math.round(kg * 2.20462 * 10) / 10 : null;
  } catch { return null; }
}

export async function getHRV(startDate: string, endDate: string): Promise<number | null> {
  if (!isNative()) return null;
  try {
    const h = getHealth();
    const { samples } = await h.readSamples({
      dataType: 'heartRateVariability',
      startDate,
      endDate,
      limit: 1,
      ascending: false,
    });
    return samples?.[0]?.value || null;
  } catch { return null; }
}

export async function getRestingHR(startDate: string, endDate: string): Promise<number | null> {
  if (!isNative()) return null;
  try {
    const h = getHealth();
    const { samples } = await h.readSamples({
      dataType: 'restingHeartRate',
      startDate,
      endDate,
      limit: 1,
      ascending: false,
    });
    return samples?.[0]?.value || null;
  } catch { return null; }
}

export async function getBodyFat(): Promise<number | null> {
  if (!isNative()) return null;
  try {
    const h = getHealth();
    const { samples } = await h.readSamples({
      dataType: 'bodyFat',
      startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
      endDate: new Date().toISOString(),
      limit: 1,
      ascending: false,
    });
    const val = samples?.[0]?.value || null;
    if (!val) return null;
    // HealthKit returns fraction (0.0-1.0); convert to percentage if needed
    return val <= 1 ? Math.round(val * 1000) / 10 : Math.round(val * 10) / 10;
  } catch { return null; }
}

export async function syncTodayHealth(exerciseDaysBack?: number) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
  const sleepStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 20, 0).toISOString();
  // Default 36h window, or wider on first sync
  const exerciseStart = exerciseDaysBack
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - exerciseDaysBack).toISOString()
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, now.getHours() - 12, 0).toISOString();

  const [stepsToday, stepsYesterday, caloriesBurned, caloriesYesterday, sleep, weight, hrv, restingHR, bodyFat, exercises] = await Promise.all([
    getSteps(startOfToday, endOfToday),
    getSteps(startOfYesterday, startOfToday),
    getCaloriesBurned(startOfToday, endOfToday),
    getCaloriesBurned(startOfYesterday, startOfToday),
    getSleep(sleepStart, startOfToday),
    getWeight(),
    getHRV(sleepStart, startOfToday),
    getRestingHR(sleepStart, startOfToday),
    getBodyFat(),
    getExerciseSessions(exerciseStart, endOfToday),
  ]);

  const yesterdayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    .toLocaleDateString('en-CA');

  return {
    steps: stepsToday,
    stepsYesterday,
    caloriesBurned,
    caloriesYesterday,
    yesterdayDate: yesterdayStr,
    sleep,
    weight,
    hrv,
    restingHR,
    bodyFat,
    exercises,
    exerciseMinutes: Math.round(exercises.reduce((s: number, ex: any) => s + ((ex.duration || ex.duration_seconds || 0) / 60), 0)),
  };
}

/** Query last 7 days of steps + calories per-day for catch-up backfill.
 *  Runs once per day on first app open to fill gaps from missed syncs. */
export async function getCatchUpData(): Promise<{ date: string; steps: number; calories: number }[]> {
  if (!isNative()) return [];
  const now = new Date();

  const queries = [];
  for (let i = 1; i <= 7; i++) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
    const dateStr = dayStart.toLocaleDateString('en-CA');
    queries.push(
      Promise.all([
        getSteps(dayStart.toISOString(), dayEnd.toISOString()),
        getCaloriesBurned(dayStart.toISOString(), dayEnd.toISOString()),
      ]).then(([steps, calories]) => ({ date: dateStr, steps, calories }))
    );
  }

  try {
    return await Promise.all(queries);
  } catch { return []; }
}

/** Query exercise sessions via queryWorkouts (v8 API) */
export async function getExerciseSessions(startDate: string, endDate: string): Promise<any[]> {
  if (!isNative()) return [];
  try {
    const h = getHealth();
    const { workouts } = await h.queryWorkouts({ startDate, endDate, limit: 20 });
    return workouts || [];
  } catch { return []; }
}
