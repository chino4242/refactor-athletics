'use client';

import { isNative } from '@/utils/platform';

interface HealthData {
  steps?: number;
  sleep?: number; // hours
  activeCalories?: number;
  weight?: number; // lbs
  bodyFat?: number; // percentage
  heartRate?: number; // bpm
  hrv?: number; // ms
  exerciseMinutes?: number;
}

export async function requestHealthPermissions(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { CapacitorHealth } = await import('@capgo/capacitor-health');
    const result = await CapacitorHealth.requestAuthorization({
      read: ['steps', 'sleep', 'calories.active', 'weight', 'body_fat', 'heart_rate', 'heart_rate_variability', 'exercise'],
      write: ['exercise'],
    });
    return result.granted || false;
  } catch (e) {
    console.error('Health permission request failed:', e);
    return false;
  }
}

export async function isHealthAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { CapacitorHealth } = await import('@capgo/capacitor-health');
    const result = await CapacitorHealth.isAvailable();
    return result.available || false;
  } catch {
    return false;
  }
}

export async function readTodayHealth(): Promise<HealthData> {
  if (!isNative()) return {};
  try {
    const { CapacitorHealth } = await import('@capgo/capacitor-health');
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end = now.toISOString();

    const data: HealthData = {};

    // Steps
    try {
      const steps = await CapacitorHealth.readSamples({ type: 'steps', startDate: startOfDay, endDate: end });
      data.steps = steps.samples?.reduce((s: number, r: any) => s + (r.value || 0), 0) || 0;
    } catch {}

    // Sleep (last night)
    try {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(18, 0, 0, 0);
      const sleep = await CapacitorHealth.readSamples({ type: 'sleep', startDate: yesterday.toISOString(), endDate: end });
      const totalMin = sleep.samples?.reduce((s: number, r: any) => s + (r.duration || 0), 0) || 0;
      data.sleep = Math.round(totalMin / 60 * 10) / 10;
    } catch {}

    // Active calories
    try {
      const cals = await CapacitorHealth.readSamples({ type: 'calories.active', startDate: startOfDay, endDate: end });
      data.activeCalories = Math.round(cals.samples?.reduce((s: number, r: any) => s + (r.value || 0), 0) || 0);
    } catch {}

    // Weight (latest)
    try {
      const weight = await CapacitorHealth.readSamples({ type: 'weight', startDate: new Date(Date.now() - 7 * 86400000).toISOString(), endDate: end });
      const latest = weight.samples?.[weight.samples.length - 1];
      if (latest?.value) data.weight = Math.round(latest.value * 2.20462 * 10) / 10; // kg to lbs
    } catch {}

    // Body fat (latest)
    try {
      const bf = await CapacitorHealth.readSamples({ type: 'body_fat', startDate: new Date(Date.now() - 30 * 86400000).toISOString(), endDate: end });
      const latest = bf.samples?.[bf.samples.length - 1];
      if (latest?.value) data.bodyFat = Math.round(latest.value * 1000) / 10; // 0.xx to xx.x%
    } catch {}

    // HRV (latest)
    try {
      const hrv = await CapacitorHealth.readSamples({ type: 'heart_rate_variability', startDate: startOfDay, endDate: end });
      const latest = hrv.samples?.[hrv.samples.length - 1];
      if (latest?.value) data.hrv = Math.round(latest.value * 10) / 10;
    } catch {}

    // Exercise minutes
    try {
      const exercise = await CapacitorHealth.readSamples({ type: 'exercise', startDate: startOfDay, endDate: end });
      data.exerciseMinutes = Math.round(exercise.samples?.reduce((s: number, r: any) => s + ((r.duration || 0) / 60), 0) || 0);
    } catch {}

    return data;
  } catch (e) {
    console.error('Failed to read health data:', e);
    return {};
  }
}

export async function syncNativeHealth(userId: string): Promise<string[]> {
  const data = await readTodayHealth();
  if (!Object.keys(data).length) return [];

  // Send to our sync endpoint
  const payload: any[] = [];
  if (data.steps) payload.push({ type: 'steps', value: data.steps });
  if (data.sleep) payload.push({ type: 'sleep', value: data.sleep });
  if (data.activeCalories) payload.push({ type: 'calories_burned', value: data.activeCalories });
  if (data.weight) payload.push({ type: 'weight', value: data.weight });
  if (data.exerciseMinutes) payload.push({ type: 'exercise_minutes', value: data.exerciseMinutes });

  if (payload.length === 0) return [];

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('sync_token')}` },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    return result.synced?.map((r: any) => `${r.type}: ${r.status}`) || [];
  } catch {
    return [];
  }
}
