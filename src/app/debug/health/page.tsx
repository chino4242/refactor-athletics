"use client";

import { useState } from 'react';

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

    } catch (e: any) { log(`FATAL: ${e.message}`); }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 font-mono text-xs">
      <h1 className="text-lg font-bold mb-4">🔧 Health Debug</h1>
      <button onClick={runTests} className="bg-zinc-800 border border-zinc-600 px-4 py-2 mb-4 hover:bg-zinc-700">
        RUN ALL TESTS
      </button>
      <div className="space-y-1 bg-zinc-900 p-3 border border-zinc-700 max-h-[70vh] overflow-y-auto">
        {logs.length === 0 && <p className="text-zinc-600">Tap RUN to test health plugin calls</p>}
        {logs.map((l, i) => (
          <p key={i} className={l.includes('THREW') || l.includes('FATAL') ? 'text-red-400' : l.includes('→') ? 'text-green-400' : 'text-zinc-400'}>
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}
