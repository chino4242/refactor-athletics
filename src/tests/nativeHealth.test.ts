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
