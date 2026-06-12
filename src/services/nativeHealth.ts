/** Native health service — SSR-safe, no-op on web, fires on native iOS/Android */

function isNative(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
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
const READ_TYPES = ['steps', 'totalCalories', 'sleep', 'weight', 'heartRate', 'heartRateVariability', 'bodyFat', 'workouts'];

export async function isHealthAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try { const h = getHealth(); return (await h.isAvailable()).available; } catch { return false; }
}

export async function requestPermissions(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const h = getHealth();
    const result = await h.requestAuthorization({ read: READ_TYPES as any, write: ['workouts'] });
    // v8 returns AuthorizationStatus with readAuthorized array — treat as granted if any types authorized
    return (result.readAuthorized?.length > 0) || result.granted === true;
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
    const result = await h.queryAggregated({ dataType: 'totalCalories', startDate, endDate });
    return Math.round(sumAggregated(result));
  } catch { return 0; }
}

export async function getSleep(startDate: string, endDate: string): Promise<number> {
  if (!isNative()) return 0;
  try {
    const h = getHealth();
    const result = await h.queryAggregated({ dataType: 'sleep', startDate, endDate });
    const val = sumAggregated(result);
    // Plugin returns minutes on both platforms for sleep aggregation
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
    return samples?.[0]?.value || null;
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
    return samples?.[0]?.value || null;
  } catch { return null; }
}

export async function syncTodayHealth() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
  const endOfDay = now.toISOString();
  const sleepStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 20, 0).toISOString();
  // Query 36h window for exercises (yesterday's run might not show until today)
  const exerciseStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, now.getHours() - 12, 0).toISOString();

  const [stepsToday, stepsYesterday, caloriesBurned, caloriesYesterday, sleep, weight, hrv, restingHR, bodyFat, exercises] = await Promise.all([
    getSteps(startOfToday, endOfDay),
    getSteps(startOfYesterday, startOfToday),
    getCaloriesBurned(startOfToday, endOfDay),
    getCaloriesBurned(startOfYesterday, startOfToday),
    getSleep(sleepStart, startOfToday),
    getWeight(),
    getHRV(sleepStart, startOfToday),
    getRestingHR(sleepStart, startOfToday),
    getBodyFat(),
    getExerciseSessions(exerciseStart, endOfDay),
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
