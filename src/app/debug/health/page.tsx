"use client";

import { useState } from 'react';
import { logHabitAction } from '@/app/actions';

export default function DebugHealthPage() {
  const [logs, setLogs] = useState<string[]>([]);

  const log = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} | ${msg}`]);

  const runTests = async () => {
    setLogs([]);
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    log(`isNative: ${isNative}`);
    if (!isNative) { log('NOT NATIVE — cannot test plugin'); return; }

    try {
      const { registerPlugin } = await import('@capacitor/core');
      const h: any = registerPlugin('Health');
      log('Plugin registered');

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
      log(`Range: ${startOfToday} → ${endOfDay}`);

      // Test steps (known working)
      try {
        const steps = await h.queryAggregated({ dataType: 'steps', startDate: startOfToday, endDate: endOfDay });
        log(`steps → ${JSON.stringify(steps)}`);
      } catch (e: any) { log(`steps THREW: ${e.message}`); }

      // Test all calorie variants
      for (const dt of ['calories', 'totalCalories', 'totalCaloriesBurned', 'activeCaloriesBurned']) {
        try {
          const result = await h.queryAggregated({ dataType: dt, startDate: startOfToday, endDate: endOfDay });
          log(`${dt} → ${JSON.stringify(result)}`);
        } catch (e: any) { log(`${dt} THREW: ${e.message}`); }
      }

      // Test the FULL getCaloriesBurned() function (confirms deployed code path)
      try {
        const { getCaloriesBurned } = await import('@/services/nativeHealth');
        const cals = await getCaloriesBurned(startOfToday, endOfDay);
        log(`getCaloriesBurned() → ${cals}`);
      } catch (e: any) { log(`getCaloriesBurned() THREW: ${e.message}`); }

      // Test sleep
      try {
        const sleep = await h.queryAggregated({ dataType: 'sleep', startDate: startOfToday, endDate: endOfDay });
        log(`sleep → ${JSON.stringify(sleep)}`);
      } catch (e: any) { log(`sleep THREW: ${e.message}`); }

      // Test readSamples weight
      try {
        const w = await h.readSamples({ dataType: 'weight', startDate: new Date(Date.now() - 30 * 86400000).toISOString(), endDate: endOfDay, limit: 1, ascending: false });
        log(`weight → ${JSON.stringify(w)}`);
      } catch (e: any) { log(`weight THREW: ${e.message}`); }

      // Test via exported functions (what the app actually uses)
      try {
        const { getCaloriesBurned, getSteps } = await import('@/services/nativeHealth');
        const burned = await getCaloriesBurned(startOfToday, endOfDay);
        log(`getCaloriesBurned() → ${burned}`);
        const steps = await getSteps(startOfToday, endOfDay);
        log(`getSteps() → ${steps}`);
      } catch (e: any) { log(`Function tests THREW: ${e.message}`); }

    } catch (e: any) { log(`FATAL: ${e.message}`); }
  };

  const runSyncTest = async () => {
    setLogs(prev => [...prev, '--- FULL SYNC TEST ---']);
    try {
      const { syncTodayHealth } = await import('@/services/nativeHealth');
      const data = await syncTodayHealth();
      setLogs(prev => [...prev, `syncTodayHealth result: ${JSON.stringify(data, null, 2)}`]);
    } catch (e: any) {
      setLogs(prev => [...prev, `syncTodayHealth THREW: ${e.message}`]);
    }
  };

  const checkDB = async () => {
    setLogs(prev => [...prev, '--- DB CHECK ---']);
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const today = new Date().toLocaleDateString('en-CA');
      const { data, error } = await supabase.from('nutrition_logs').select('macro_type, amount, label').eq('date', today).eq('macro_type', 'calories_burned');
      setLogs(prev => [...prev, `calories_burned rows today: ${JSON.stringify(data)}`, `error: ${error?.message || 'none'}`]);
    } catch (e: any) {
      setLogs(prev => [...prev, `DB check THREW: ${e.message}`]);
    }
  };

  const forceWrite = async () => {
    setLogs(prev => [...prev, '--- FORCE WRITE ---']);
    try {
      const { syncTodayHealth } = await import('@/services/nativeHealth');
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLogs(prev => [...prev, 'No authenticated user']); return; }

      const data = await syncTodayHealth();
      if (!data) { setLogs(prev => [...prev, 'syncTodayHealth returned null']); return; }
      setLogs(prev => [...prev, `caloriesBurned=${data.caloriesBurned}, steps=${data.steps}`]);
      if (data.caloriesBurned > 0) {
        await logHabitAction(user.id, 'macro_calories_burned', data.caloriesBurned, undefined, 'Calories Burned');
        setLogs(prev => [...prev, `✓ Wrote ${data.caloriesBurned} to macro_calories_burned`]);
      } else {
        setLogs(prev => [...prev, 'caloriesBurned is 0, skipping write']);
      }
    } catch (e: any) {
      setLogs(prev => [...prev, `FORCE WRITE THREW: ${e.message}`]);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 font-mono text-xs">
      <h1 className="text-lg font-bold mb-4">🔧 Health Debug</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={runTests} className="bg-zinc-800 border border-zinc-600 px-4 py-2 hover:bg-zinc-700">PLUGIN TESTS</button>
        <button onClick={runSyncTest} className="bg-zinc-800 border border-zinc-600 px-4 py-2 hover:bg-zinc-700">FULL SYNC</button>
        <button onClick={checkDB} className="bg-zinc-800 border border-zinc-600 px-4 py-2 hover:bg-zinc-700">CHECK DB</button>
        <button onClick={forceWrite} className="bg-green-900 border border-green-600 px-4 py-2 hover:bg-green-800">FORCE WRITE</button>
      </div>
      <div className="space-y-1 bg-zinc-900 p-3 border border-zinc-700 max-h-[70vh] overflow-y-auto">
        {logs.length === 0 && <p className="text-zinc-600">Tap a button to test</p>}
        {logs.map((l, i) => (
          <p key={i} className={l.includes('THREW') || l.includes('FATAL') ? 'text-red-400' : l.includes('→') ? 'text-green-400' : 'text-zinc-400'}>
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}
