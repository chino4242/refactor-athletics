/** Native health service — SSR-safe, no-op on web, fires on native iOS/Android */

const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();

let healthPlugin: any = null;

function getHealth(): any {
  if (!healthPlugin) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerPlugin } = require('@capacitor/core');
    healthPlugin = registerPlugin('Health');
  }
  return healthPlugin;
}

const READ_TYPES = ['steps', 'calories', 'sleep', 'weight', 'heart_rate', 'heart_rate_variability', 'body_fat_percentage', 'lean_body_mass', 'exercise'];

export async function isHealthAvailable(): Promise<boolean> {
  if (!isNative) return false;
  try { const h = getHealth(); return (await h.isAvailable()).available; } catch { return false; }
}

export async function requestPermissions(): Promise<boolean> {
  if (!isNative) return false;
  try { const h = getHealth(); return (await h.requestAuthorization({ read: READ_TYPES as any, write: ['exercise'] })).granted; } catch { return false; }
}

/** Open device health settings so user can manually grant permissions */
export async function openHealthSettings(): Promise<void> {
  if (!isNative) return;
  try { const h = getHealth(); await h.openHealthConnectSettings?.(); } catch {
    // Fallback: try opening app settings on Android
    try {
      const { App } = await (Function('return import("@capacitor/app")')() as Promise<any>);
      // No direct API — user must be guided verbally
    } catch {}
  }
}

export async function getSteps(startDate: string, endDate: string): Promise<number> {
  if (!isNative) return 0;
  try { const h = getHealth(); return (await h.queryAggregated({ dataType: 'steps', startDate, endDate })).value || 0; } catch { return 0; }
}

export async function getCaloriesBurned(startDate: string, endDate: string): Promise<number> {
  if (!isNative) return 0;
  try { const h = getHealth(); return Math.round((await h.queryAggregated({ dataType: 'calories', startDate, endDate })).value || 0); } catch { return 0; }
}

export async function getSleep(startDate: string, endDate: string): Promise<number> {
  if (!isNative) return 0;
  try { const h = getHealth(); return Math.round(((await h.queryAggregated({ dataType: 'sleep', startDate, endDate })).value || 0) / 60); } catch { return 0; }
}

export async function getWeight(): Promise<number | null> {
  if (!isNative) return null;
  try { const h = getHealth(); const { results } = await h.query({ dataType: 'weight', startDate: new Date(Date.now() - 30 * 86400000).toISOString(), endDate: new Date().toISOString(), limit: 1 }); return results?.[0]?.value || null; } catch { return null; }
}

export async function getHRV(startDate: string, endDate: string): Promise<number | null> {
  if (!isNative) return null;
  try { const h = getHealth(); const { results } = await h.query({ dataType: 'heart_rate_variability', startDate, endDate, limit: 1 }); return results?.[0]?.value || null; } catch { return null; }
}

export async function getRestingHR(startDate: string, endDate: string): Promise<number | null> {
  if (!isNative) return null;
  try { const h = getHealth(); const { results } = await h.query({ dataType: 'heart_rate', startDate, endDate, limit: 1 }); return results?.[0]?.value || null; } catch { return null; }
}

export async function getBodyFat(): Promise<number | null> {
  if (!isNative) return null;
  try { const h = getHealth(); const { results } = await h.query({ dataType: 'body_fat_percentage', startDate: new Date(Date.now() - 30 * 86400000).toISOString(), endDate: new Date().toISOString(), limit: 1 }); return results?.[0]?.value || null; } catch { return null; }
}

export async function syncTodayHealth() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = now.toISOString();
  const sleepStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 20, 0).toISOString();

  const [steps, caloriesBurned, sleep, weight, hrv, restingHR, bodyFat] = await Promise.all([
    getSteps(startOfDay, endOfDay),
    getCaloriesBurned(startOfDay, endOfDay),
    getSleep(sleepStart, startOfDay),
    getWeight(),
    getHRV(sleepStart, startOfDay),
    getRestingHR(sleepStart, startOfDay),
    getBodyFat(),
  ]);

  return { steps, caloriesBurned, sleep, weight, hrv, restingHR, bodyFat };
}
