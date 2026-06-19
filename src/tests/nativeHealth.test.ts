import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock window.Capacitor for different platform scenarios
const mockCapacitor = (isNative: boolean) => {
  (globalThis as any).window = {
    Capacitor: isNative ? { isNativePlatform: () => true } : undefined,
  };
};

describe('nativeHealth — platform safety', () => {
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as any).window;
  });

  it('returns false/0/null on web (non-native)', async () => {
    mockCapacitor(false);
    const { isHealthAvailable, syncTodayHealth, requestPermissions } = await import('@/services/nativeHealth');

    expect(await isHealthAvailable()).toBe(false);
    expect(await requestPermissions()).toBe(false);

    const data = await syncTodayHealth();
    expect(data.steps).toBe(0);
    expect(data.caloriesBurned).toBe(0);
    expect(data.sleep).toBe(0);
    expect(data.weight).toBeNull();
    expect(data.hrv).toBeNull();
    expect(data.restingHR).toBeNull();
    expect(data.bodyFat).toBeNull();
  });

  it('returns false/0/null when window is undefined (SSR)', async () => {
    // No window at all — simulates server-side rendering
    const { isHealthAvailable, syncTodayHealth } = await import('@/services/nativeHealth');

    expect(await isHealthAvailable()).toBe(false);
    const data = await syncTodayHealth();
    expect(data.steps).toBe(0);
    expect(data.weight).toBeNull();
  });

  it('exports the expected API surface for native callers', async () => {
    // Verify that nativeHealth exports all required functions
    const mod = await import('@/services/nativeHealth');
    expect(typeof mod.isHealthAvailable).toBe('function');
    expect(typeof mod.requestPermissions).toBe('function');
    expect(typeof mod.getSteps).toBe('function');
    expect(typeof mod.getCaloriesBurned).toBe('function');
    expect(typeof mod.getSleep).toBe('function');
    expect(typeof mod.getWeight).toBe('function');
    expect(typeof mod.getHRV).toBe('function');
    expect(typeof mod.getRestingHR).toBe('function');
    expect(typeof mod.getBodyFat).toBe('function');
    expect(typeof mod.syncTodayHealth).toBe('function');
  });

  it('gracefully handles plugin errors without crashing', async () => {
    mockCapacitor(true);

    vi.doMock('@capacitor/core', () => ({
      registerPlugin: () => ({
        isAvailable: () => { throw new Error('HC not installed'); },
        queryAggregated: () => { throw new Error('Permission denied'); },
        query: () => { throw new Error('No data'); },
      }),
    }));

    const { isHealthAvailable, getSteps, getWeight } = await import('@/services/nativeHealth');

    // Should not throw — returns safe defaults
    expect(await isHealthAvailable()).toBe(false);
    expect(await getSteps('2026-06-05T00:00:00Z', '2026-06-05T23:59:59Z')).toBe(0);
    expect(await getWeight()).toBeNull();
  });
});

describe('nativeHealth — type identifier validation', () => {
  // These are the valid identifiers accepted by @capgo/capacitor-health plugin
  // Source: node_modules/@capgo/capacitor-health/ios/Sources/HealthPlugin/Health.swift (HealthDataType enum)
  const VALID_PLUGIN_TYPES = new Set([
    'steps', 'distance', 'calories', 'heartRate', 'weight', 'sleep',
    'respiratoryRate', 'oxygenSaturation', 'restingHeartRate', 'heartRateVariability',
    'bloodPressure', 'bloodGlucose', 'bodyTemperature', 'height', 'flightsClimbed',
    'exerciseTime', 'distanceCycling', 'bodyFat', 'basalBodyTemperature',
    'basalCalories', 'totalCalories', 'mindfulness',
    'workouts', // special case handled separately by plugin
  ]);

  it('IOS_READ_TYPES only contains valid @capgo plugin identifiers', async () => {
    // This test prevents the bug where invalid type names cause requestAuthorization
    // to throw before the iOS permission prompt ever shows
    const mod = await import('@/services/nativeHealth');
    const iosTypes = (mod as any).IOS_READ_TYPES || [];

    // If IOS_READ_TYPES isn't exported, read it from source
    if (iosTypes.length === 0) {
      const fs = await import('fs');
      const source = fs.readFileSync('src/services/nativeHealth.ts', 'utf-8');
      const match = source.match(/IOS_READ_TYPES\s*=\s*\[(.*?)\]/s);
      if (match) {
        const types = match[1].match(/'([^']+)'/g)?.map(s => s.replace(/'/g, '')) || [];
        for (const type of types) {
          expect(VALID_PLUGIN_TYPES.has(type), `"${type}" is not a valid @capgo plugin type. Valid types: ${[...VALID_PLUGIN_TYPES].join(', ')}`).toBe(true);
        }
      }
    }
  });

  it('ANDROID_READ_TYPES only contains valid @capgo plugin identifiers', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/services/nativeHealth.ts', 'utf-8');
    const match = source.match(/ANDROID_READ_TYPES\s*=\s*\[(.*?)\]/s);
    if (match) {
      const types = match[1].match(/'([^']+)'/g)?.map(s => s.replace(/'/g, '')) || [];
      for (const type of types) {
        expect(VALID_PLUGIN_TYPES.has(type), `"${type}" is not a valid @capgo plugin type. Valid types: ${[...VALID_PLUGIN_TYPES].join(', ')}`).toBe(true);
      }
    }
  });

  it('query dataType strings in getCaloriesBurned/getSleep/getBodyFat use valid identifiers', async () => {
    const fs = await import('fs');
    const source = fs.readFileSync('src/services/nativeHealth.ts', 'utf-8');

    // Extract all dataType values from queryAggregated and readSamples calls
    const dataTypeMatches = source.matchAll(/dataType:\s*'([^']+)'/g);
    for (const match of dataTypeMatches) {
      expect(VALID_PLUGIN_TYPES.has(match[1]), `queryAggregated/readSamples uses invalid dataType "${match[1]}"`).toBe(true);
    }
  });
});
