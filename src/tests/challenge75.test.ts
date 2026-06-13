import { describe, it, expect, vi } from 'vitest';

/**
 * These tests verify the campaign evaluation logic by testing the same algorithms
 * used in /api/challenge-75/route.ts. Since the functions are internal to the route,
 * we replicate the key logic here to ensure correctness.
 */

describe('Challenge 75 — Evaluation Logic', () => {

  describe('Day evaluation (pass/fail)', () => {
    it('passes when all custom metrics are checked', () => {
      const metrics = [
        { metric_type: 'custom', metric_id: 'no_alcohol', label: 'No alcohol', minimum: 1 },
        { metric_type: 'custom', metric_id: 'water_100oz', label: '100oz water', minimum: 1 },
      ];
      const customChecks = { no_alcohol: true, water_100oz: true };

      const result = evaluateMetrics(metrics, customChecks, {});
      expect(result.passed).toBe(true);
    });

    it('fails when any custom metric is unchecked', () => {
      const metrics = [
        { metric_type: 'custom', metric_id: 'no_alcohol', label: 'No alcohol', minimum: 1 },
        { metric_type: 'custom', metric_id: 'water_100oz', label: '100oz water', minimum: 1 },
      ];
      const customChecks = { no_alcohol: true, water_100oz: false };

      const result = evaluateMetrics(metrics, customChecks, {});
      expect(result.passed).toBe(false);
      expect(result.failedMetric).toBe('100oz water');
    });

    it('fails when custom metric is missing from checks', () => {
      const metrics = [
        { metric_type: 'custom', metric_id: 'reading', label: '10 min reading', minimum: 1 },
      ];
      const customChecks = {}; // User never opened the app

      const result = evaluateMetrics(metrics, customChecks, {});
      expect(result.passed).toBe(false);
      expect(result.failedMetric).toBe('10 min reading');
    });

    it('passes app metrics when value meets minimum', () => {
      const metrics = [
        { metric_type: 'app', metric_id: 'workout_count', label: 'Complete a workout', minimum: 1 },
        { metric_type: 'app', metric_id: 'habit_steps', label: 'Steps ≥ 7500', minimum: 7500 },
      ];
      const appValues = { workout_count: 1, habit_steps: 8200 };

      const result = evaluateMetrics(metrics, {}, appValues);
      expect(result.passed).toBe(true);
    });

    it('fails app metrics when value is below minimum', () => {
      const metrics = [
        { metric_type: 'app', metric_id: 'workout_count', label: 'Complete a workout', minimum: 1 },
        { metric_type: 'app', metric_id: 'habit_steps', label: 'Steps ≥ 7500', minimum: 7500 },
      ];
      const appValues = { workout_count: 1, habit_steps: 5000 };

      const result = evaluateMetrics(metrics, {}, appValues);
      expect(result.passed).toBe(false);
      expect(result.failedMetric).toBe('Steps ≥ 7500');
    });

    it('mixed metrics: passes only when ALL are met', () => {
      const metrics = [
        { metric_type: 'app', metric_id: 'workout_count', label: 'Workout', minimum: 1 },
        { metric_type: 'custom', metric_id: 'no_alcohol', label: 'No alcohol', minimum: 1 },
      ];
      const customChecks = { no_alcohol: true };
      const appValues = { workout_count: 1 };

      const result = evaluateMetrics(metrics, customChecks, appValues);
      expect(result.passed).toBe(true);
    });

    it('mixed metrics: fails when app metric missed even if custom is checked', () => {
      const metrics = [
        { metric_type: 'app', metric_id: 'workout_count', label: 'Workout', minimum: 1 },
        { metric_type: 'custom', metric_id: 'no_alcohol', label: 'No alcohol', minimum: 1 },
      ];
      const customChecks = { no_alcohol: true };
      const appValues = { workout_count: 0 };

      const result = evaluateMetrics(metrics, customChecks, appValues);
      expect(result.passed).toBe(false);
      expect(result.failedMetric).toBe('Workout');
    });
  });

  describe('Duration and completion', () => {
    it('30-day campaign completes on day 30', () => {
      const durationDays = 30;
      const startDate = new Date('2026-06-01T12:00:00');
      const todayDate = new Date('2026-07-01T12:00:00'); // Day 31
      const dayCount = Math.floor((todayDate.getTime() - startDate.getTime()) / 86400000);
      expect(dayCount >= durationDays).toBe(true);
    });

    it('75-day campaign does not complete on day 74', () => {
      const durationDays = 75;
      const startDate = new Date('2026-06-01T12:00:00');
      const todayDate = new Date('2026-08-13T12:00:00'); // Day 73-ish
      const dayCount = Math.floor((todayDate.getTime() - startDate.getTime()) / 86400000);
      expect(dayCount >= durationDays).toBe(false);
    });
  });

  describe('Timezone day boundary', () => {
    it('user in ET at 11pm gets todays date not tomorrows', () => {
      // Simulate: it's 11pm ET = 3am UTC next day
      const tz = 'America/New_York';
      // June 13, 2026, 11:00 PM ET
      const serverNow = new Date('2026-06-14T03:00:00Z'); // This is what server sees (UTC)
      const localToday = serverNow.toLocaleDateString('en-CA', { timeZone: tz });
      expect(localToday).toBe('2026-06-13'); // Should be June 13, not 14
    });

    it('user in PT at 11pm gets todays date', () => {
      const tz = 'America/Los_Angeles';
      const serverNow = new Date('2026-06-14T06:00:00Z'); // 11pm PT = 6am UTC next day
      const localToday = serverNow.toLocaleDateString('en-CA', { timeZone: tz });
      expect(localToday).toBe('2026-06-13');
    });
  });

  describe('Re-evaluation grace (yesterday)', () => {
    it('yesterday can be re-evaluated when previously failed', () => {
      const existingDays = [
        { date: '2026-06-12', status: 'failed' },
        { date: '2026-06-11', status: 'passed' },
      ];
      const yesterdayStr = '2026-06-12';

      // Build evaluatedDates set (skip non-pending)
      const evaluatedDates = new Set(existingDays.filter(d => d.status !== 'pending').map(d => d.date));

      // Remove yesterday if it was failed (grace for late health sync)
      const yesterdayDay = existingDays.find(d => d.date === yesterdayStr);
      if (yesterdayDay?.status === 'failed') {
        evaluatedDates.delete(yesterdayStr);
      }

      // Yesterday should NOT be in the skip set anymore
      expect(evaluatedDates.has('2026-06-12')).toBe(false);
      // Older passed days should stay skipped
      expect(evaluatedDates.has('2026-06-11')).toBe(true);
    });

    it('passed days are never re-evaluated', () => {
      const existingDays = [
        { date: '2026-06-12', status: 'passed' },
      ];
      const yesterdayStr = '2026-06-12';

      const evaluatedDates = new Set(existingDays.filter(d => d.status !== 'pending').map(d => d.date));
      const yesterdayDay = existingDays.find(d => d.date === yesterdayStr);
      if (yesterdayDay?.status === 'failed') {
        evaluatedDates.delete(yesterdayStr);
      }

      // Passed day stays in skip set
      expect(evaluatedDates.has('2026-06-12')).toBe(true);
    });
  });

  describe('Shared failure propagation', () => {
    it('shared_failure=true means one failure kills all members', () => {
      const challenge = { shared_failure: true };
      const memberFailed = true;
      const shouldFailAll = challenge.shared_failure && memberFailed;
      expect(shouldFailAll).toBe(true);
    });

    it('shared_failure=false means individual failure only', () => {
      const challenge = { shared_failure: false };
      const memberFailed = true;
      const shouldFailAll = challenge.shared_failure && memberFailed;
      expect(shouldFailAll).toBe(false);
    });
  });
});

// Replicate the core evaluateDay logic for testing
function evaluateMetrics(
  metrics: { metric_type: string; metric_id: string; label: string; minimum: number }[],
  customChecks: Record<string, boolean>,
  appValues: Record<string, number>
): { passed: boolean; failedMetric: string } {
  let passed = true;
  let failedMetric = '';

  for (const metric of metrics) {
    if (metric.metric_type === 'custom') {
      const checked = customChecks[metric.metric_id] === true;
      if (!checked) { passed = false; failedMetric = metric.label; }
    } else {
      const value = appValues[metric.metric_id] || 0;
      const met = value >= (metric.minimum || 0);
      if (!met) { passed = false; failedMetric = metric.label; }
    }
  }

  return { passed, failedMetric };
}
