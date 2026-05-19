import { Capacitor } from '@capacitor/core';
import { CapacitorHealth, type HealthDataType } from '@capgo/capacitor-health';

const isNative = Capacitor.isNativePlatform();

const READ_TYPES: HealthDataType[] = [
  'steps',
  'calories',
  'sleep',
  'weight',
  'heart_rate',
  'heart_rate_variability',
  'body_fat_percentage',
  'lean_body_mass',
  'exercise',
];

export async function isHealthAvailable(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const { available } = await CapacitorHealth.isAvailable();
    return available;
  } catch { return false; }
}

export async function requestPermissions(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const { granted } = await CapacitorHealth.requestAuthorization({ read: READ_TYPES, write: ['exercise'] });
    return granted;
  } catch { return false; }
}

export async function getSteps(startDate: string, endDate: string): Promise<number> {
  if (!isNative) return 0;
  try {
    const { value } = await CapacitorHealth.queryAggregated({ dataType: 'steps', startDate, endDate });
    return value || 0;
  } catch { return 0; }
}

export async function getCaloriesBurned(startDate: string, endDate: string): Promise<number> {
  if (!isNative) return 0;
  try {
    const { value } = await CapacitorHealth.queryAggregated({ dataType: 'calories', startDate, endDate });
    return Math.round(value || 0);
  } catch { return 0; }
}

export async function getSleep(startDate: string, endDate: string): Promise<number> {
  if (!isNative) return 0;
  try {
    const { value } = await CapacitorHealth.queryAggregated({ dataType: 'sleep', startDate, endDate });
    return Math.round((value || 0) / 60); // minutes → hours
  } catch { return 0; }
}

export async function getWeight(): Promise<number | null> {
  if (!isNative) return null;
  try {
    const { results } = await CapacitorHealth.query({ dataType: 'weight', startDate: new Date(Date.now() - 30 * 86400000).toISOString(), endDate: new Date().toISOString(), limit: 1 });
    return results?.[0]?.value || null;
  } catch { return null; }
}

export async function getHRV(startDate: string, endDate: string): Promise<number | null> {
  if (!isNative) return null;
  try {
    const { results } = await CapacitorHealth.query({ dataType: 'heart_rate_variability', startDate, endDate, limit: 1 });
    return results?.[0]?.value || null;
  } catch { return null; }
}

export async function getRestingHR(startDate: string, endDate: string): Promise<number | null> {
  if (!isNative) return null;
  try {
    const { results } = await CapacitorHealth.query({ dataType: 'heart_rate', startDate, endDate, limit: 1 });
    return results?.[0]?.value || null;
  } catch { return null; }
}

export async function getBodyFat(): Promise<number | null> {
  if (!isNative) return null;
  try {
    const { results } = await CapacitorHealth.query({ dataType: 'body_fat_percentage', startDate: new Date(Date.now() - 30 * 86400000).toISOString(), endDate: new Date().toISOString(), limit: 1 });
    return results?.[0]?.value || null;
  } catch { return null; }
}

/** Sync today's health data and return structured results */
export async function syncTodayHealth(): Promise<{
  steps: number;
  caloriesBurned: number;
  sleep: number;
  weight: number | null;
  hrv: number | null;
  restingHR: number | null;
  bodyFat: number | null;
}> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = now.toISOString();
  // Sleep looks at last night
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
