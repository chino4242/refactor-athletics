"use client";

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

interface Props {
  isOpen: boolean;
  userId: string;
  groupId: string | null;
  onClose: () => void;
  onCreated: () => void;
}

const APP_METRICS = [
  { id: 'workout_count', label: 'Complete a workout', minimum: 1 },
  { id: 'habit_steps', label: 'Steps ≥', minimum: 7500 },
  { id: 'macro_protein', label: 'Protein ≥', minimum: 170 },
  { id: 'active_minutes', label: 'Active minutes ≥', minimum: 30 },
];

const DURATION_PRESETS = [30, 45, 75];

export default function CampaignModal({ isOpen, userId, groupId, onClose, onCreated }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);

  const [step, setStep] = useState(1);
  const [name, setName] = useState('75 Day Challenge');
  const [duration, setDuration] = useState(75);
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [scope, setScope] = useState<'solo' | 'group'>('solo');
  const [sharedFate, setSharedFate] = useState(false);

  // Metrics
  const [appMetrics, setAppMetrics] = useState<{ id: string; label: string; minimum: number }[]>([
    { id: 'workout_count', label: 'Complete a workout', minimum: 1 },
  ]);
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [newCustom, setNewCustom] = useState('');

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const addAppMetric = (m: typeof APP_METRICS[0]) => {
    if (!appMetrics.find(a => a.id === m.id)) {
      setAppMetrics([...appMetrics, { ...m }]);
    }
  };

  const removeAppMetric = (id: string) => setAppMetrics(appMetrics.filter(m => m.id !== id));

  const addCustomItem = () => {
    if (newCustom.trim()) {
      setCustomItems([...customItems, newCustom.trim()]);
      setNewCustom('');
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    const metrics = [
      ...appMetrics.map((m, i) => ({ type: 'app', id: m.id, label: m.label, minimum: m.minimum, sort_order: i })),
      ...customItems.map((item, i) => ({ type: 'custom', id: `custom_${i}`, label: item, minimum: 1, sort_order: appMetrics.length + i })),
    ];

    await fetch('/api/challenge-75', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        title: name,
        duration_days: duration,
        start_date: startDate,
        group_id: scope === 'group' ? groupId : null,
        shared_failure: sharedFate,
        metrics,
      }),
    });

    setLoading(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
      <div className={`w-full max-w-sm border-2 ${colors.primary} bg-zinc-900 relative max-h-[85vh] flex flex-col`}>
        {/* Corner dots */}
        <div className={`absolute -top-[3px] -left-[3px] w-[6px] h-[6px] ${colors.corner}`} />
        <div className={`absolute -top-[3px] -right-[3px] w-[6px] h-[6px] ${colors.corner}`} />
        <div className={`absolute -bottom-[3px] -left-[3px] w-[6px] h-[6px] ${colors.corner}`} />
        <div className={`absolute -bottom-[3px] -right-[3px] w-[6px] h-[6px] ${colors.corner}`} />

        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <p className={`text-[10px] ${colors.headerText} uppercase tracking-wider`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            FORGE A CAMPAIGN — {step}/3
          </p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xs">✕</button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {step === 1 && (
            <>
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>NAME</p>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={`w-full bg-zinc-800 border ${colors.border} px-3 py-2 text-white text-sm`}
                />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>DURATION</p>
                <div className="flex gap-2">
                  {DURATION_PRESETS.map(d => (
                    <button key={d} onClick={() => setDuration(d)} className={`flex-1 py-2 border text-center ${duration === d ? `${colors.primary} bg-zinc-800` : 'border-zinc-700 bg-zinc-900'}`}>
                      <span className={`text-xs ${duration === d ? colors.secondary : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{d}D</span>
                    </button>
                  ))}
                  <input
                    type="number"
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value) || 75)}
                    className={`w-16 bg-zinc-800 border ${colors.border} px-2 py-2 text-center text-white text-xs`}
                    style={{ fontFamily: "var(--font-pixel), monospace" }}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>START DATE</p>
                <input
                  type="date"
                  value={startDate}
                  min={new Date().toLocaleDateString('en-CA')}
                  onChange={e => setStartDate(e.target.value)}
                  className={`w-full bg-zinc-800 border ${colors.border} px-3 py-2 text-white text-xs rounded-sm`}
                  style={{ fontFamily: "var(--font-pixel), monospace" }}
                />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>SCOPE</p>
                <div className="flex gap-2">
                  <button onClick={() => setScope('solo')} className={`flex-1 py-2 border ${scope === 'solo' ? `${colors.primary} bg-zinc-800` : 'border-zinc-700 bg-zinc-900'}`}>
                    <span className={`text-xs ${scope === 'solo' ? colors.secondary : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>SOLO</span>
                  </button>
                  <button onClick={() => setScope('group')} disabled={!groupId} className={`flex-1 py-2 border ${scope === 'group' ? `${colors.primary} bg-zinc-800` : 'border-zinc-700 bg-zinc-900'} disabled:opacity-40`}>
                    <span className={`text-xs ${scope === 'group' ? colors.secondary : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>GROUP</span>
                  </button>
                </div>
              </div>
              {scope === 'group' && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>FAILURE MODE</p>
                  <div className="flex gap-2">
                    <button onClick={() => setSharedFate(false)} className={`flex-1 py-2 border ${!sharedFate ? `${colors.primary} bg-zinc-800` : 'border-zinc-700 bg-zinc-900'}`}>
                      <span className={`text-xs ${!sharedFate ? colors.secondary : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>INDIVIDUAL</span>
                    </button>
                    <button onClick={() => setSharedFate(true)} className={`flex-1 py-2 border ${sharedFate ? 'border-red-700 bg-zinc-800' : 'border-zinc-700 bg-zinc-900'}`}>
                      <span className={`text-xs ${sharedFate ? 'text-red-400' : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>SHARED FATE</span>
                    </button>
                  </div>
                  {sharedFate && <p className="text-xs text-red-500 mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>⚠ ONE FAILS = ALL FAIL</p>}
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>APP METRICS (AUTO-CHECK)</p>
                <div className="space-y-1 mb-2">
                  {appMetrics.map(m => (
                    <div key={m.id} className="flex items-center justify-between border border-zinc-700 bg-zinc-800 px-2 py-1.5">
                      <span className="text-xs text-zinc-200" style={{ fontFamily: "var(--font-pixel), monospace" }}>{m.label}</span>
                      <div className="flex items-center gap-1">
                        {m.id !== 'workout_count' && (
                          <input
                            type="number"
                            value={m.minimum}
                            onChange={e => setAppMetrics(appMetrics.map(a => a.id === m.id ? { ...a, minimum: Number(e.target.value) || 0 } : a))}
                            className="w-14 bg-zinc-900 border border-zinc-600 px-1 py-0.5 text-xs text-white text-center"
                            style={{ fontFamily: "var(--font-pixel), monospace" }}
                          />
                        )}
                        <button onClick={() => removeAppMetric(m.id)} className="text-zinc-600 hover:text-red-400 text-xs">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {APP_METRICS.filter(m => !appMetrics.find(a => a.id === m.id)).map(m => (
                    <button key={m.id} onClick={() => addAppMetric(m)} className="text-xs px-2 py-1 border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                      + {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>MANUAL HABITS (HONOR SYSTEM)</p>
                <div className="space-y-1 mb-2">
                  {customItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between border border-zinc-700 bg-zinc-800 px-2 py-1.5">
                      <span className="text-xs text-zinc-200" style={{ fontFamily: "var(--font-pixel), monospace" }}>{item}</span>
                      <button onClick={() => setCustomItems(customItems.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400 text-xs">✕</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input
                    value={newCustom}
                    onChange={e => setNewCustom(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                    placeholder="e.g. No alcohol"
                    className={`flex-1 bg-zinc-800 border ${colors.border} px-2 py-1.5 text-xs text-white`}
                    style={{ fontFamily: "var(--font-pixel), monospace" }}
                  />
                  <button onClick={addCustomItem} className={`px-2 border ${colors.border} bg-zinc-800 text-zinc-400 hover:text-white text-xs`} style={{ fontFamily: "var(--font-pixel), monospace" }}>+</button>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className={`text-xs ${colors.secondary} text-center`} style={{ fontFamily: "var(--font-pixel), monospace" }}>CONFIRM YOUR OATH</p>
              <div className="border border-zinc-700 bg-zinc-800 p-3 space-y-1">
                <p className="text-sm text-white">{name}</p>
                <p className="text-xs text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>{duration} DAYS · {scope.toUpperCase()}{sharedFate ? ' · SHARED FATE' : ''}</p>
              </div>
              <div className="space-y-1">
                {appMetrics.map(m => (
                  <div key={m.id} className="flex items-center gap-2 text-xs" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    <span className="text-green-500">✓</span>
                    <span className="text-zinc-300">{m.label}</span>
                    <span className="text-zinc-600 ml-auto">AUTO</span>
                  </div>
                ))}
                {customItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    <span className="text-zinc-500">○</span>
                    <span className="text-zinc-300">{item}</span>
                    <span className="text-zinc-600 ml-auto">HONOR</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-600 text-center" style={{ fontFamily: "var(--font-pixel), monospace" }}>STARTS TOMORROW · REWARD: 2,500 XP</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex gap-2 shrink-0">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className={`flex-1 py-3 border ${colors.border} bg-zinc-800 text-zinc-400`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              <span className="text-xs">◂ BACK</span>
            </button>
          )}
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} disabled={step === 2 && appMetrics.length === 0 && customItems.length === 0} className={`flex-1 py-3 border-2 ${colors.primary} bg-zinc-800 text-white disabled:opacity-40`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              <span className={`text-xs ${colors.secondary}`}>NEXT ▸</span>
            </button>
          ) : (
            <button onClick={handleCreate} disabled={loading} className={`flex-1 py-3 border-2 ${colors.primary} bg-zinc-800 text-white disabled:opacity-40`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              <span className={`text-xs ${colors.secondary}`}>{loading ? 'FORGING...' : '⚔ BEGIN CAMPAIGN'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
