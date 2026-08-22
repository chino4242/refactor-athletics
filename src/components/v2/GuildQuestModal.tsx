"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';
import { proposeChallenge, type ChallengeMetric } from '@/services/groupChallengeService';

interface Props {
  isOpen: boolean;
  groupId: string;
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}

const METRICS: { key: ChallengeMetric; label: string; icon: string; unit: string; defaultTarget: number }[] = [
  { key: 'volume', label: 'WEIGHT LIFTED', icon: '🏋️', unit: 'lbs', defaultTarget: 20000 },
  { key: 'xp', label: 'XP EARNED', icon: '⚡', unit: 'XP', defaultTarget: 1500 },
  { key: 'steps', label: 'STEPS', icon: '👟', unit: 'steps', defaultTarget: 25000 },
  { key: 'active_minutes', label: 'ACTIVE MIN', icon: '⏱', unit: 'min', defaultTarget: 300 },
];

// Local YYYY-MM-DD (matches app-wide date convention; avoids UTC shift)
function toDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA');
}

export default function GuildQuestModal({ isOpen, groupId, userId, onClose, onCreated }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [metric, setMetric] = useState<ChallengeMetric>('volume');
  const [target, setTarget] = useState('20000');
  const [startDate, setStartDate] = useState(() => toDateStr(new Date()));
  const [endDate, setEndDate] = useState(() => toDateStr(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)));
  const [memberCount, setMemberCount] = useState(1);
  const [loading, setLoading] = useState(false);

  // Inclusive day count (start and end both count). Min 1.
  const durationDays = Math.max(
    1,
    Math.round((new Date(endDate + 'T12:00:00').getTime() - new Date(startDate + 'T12:00:00').getTime()) / (24 * 60 * 60 * 1000)) + 1
  );
  const invalidRange = endDate < startDate;

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { count } = await supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', groupId);
      setMemberCount(count || 1);
    })();
  }, [isOpen, groupId]);

  if (!isOpen) return null;

  const metricInfo = METRICS.find(m => m.key === metric)!;
  const perMember = Math.round(Number(target) / memberCount);

  const handleMetricChange = (m: ChallengeMetric) => {
    setMetric(m);
    setTarget(String(METRICS.find(x => x.key === m)!.defaultTarget));
  };

  const handleCreate = async () => {
    const targetNum = Number(target);
    if (!targetNum || targetNum <= 0) return;
    if (invalidRange) return;

    setLoading(true);

    const result = await proposeChallenge({
      groupId,
      createdBy: userId,
      name: `${metricInfo.icon} ${metricInfo.label} Quest`,
      metric,
      target: targetNum,
      startDate,
      endDate,
    });

    setLoading(false);
    if (result) {
      onCreated();
      onClose();
      // Brief alert so user knows it worked
      setTimeout(() => alert('Quest proposed! Your party can now see it.'), 100);
    } else {
      alert('Failed to create quest. Try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
      <div className={`w-full max-w-sm border-2 ${colors.primary} bg-zinc-900 shadow-[inset_0_0_0_2px_#18181b,inset_0_0_0_4px_#27272a] relative`}>
        {/* Corner dots */}
        <div className={`absolute -top-[3px] -left-[3px] w-[6px] h-[6px] ${colors.corner}`} />
        <div className={`absolute -top-[3px] -right-[3px] w-[6px] h-[6px] ${colors.corner}`} />
        <div className={`absolute -bottom-[3px] -left-[3px] w-[6px] h-[6px] ${colors.corner}`} />
        <div className={`absolute -bottom-[3px] -right-[3px] w-[6px] h-[6px] ${colors.corner}`} />

        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <p className={`text-xs ${colors.headerText} uppercase tracking-wider`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            ⚔ RALLY YOUR PARTY
          </p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xs">✕</button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Metric */}
          <div>
            <p className="text-xs text-zinc-500 uppercase mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>METRIC</p>
            <div className="grid grid-cols-2 gap-2">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => handleMetricChange(m.key)}
                  className={`p-2 border text-left transition-colors ${metric === m.key ? `${colors.primary} bg-zinc-800` : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800'}`}
                >
                  <span className="text-sm">{m.icon}</span>
                  <p className={`text-xs mt-1 ${metric === m.key ? colors.secondary : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    {m.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Target */}
          <div>
            <p className="text-xs text-zinc-500 uppercase mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>TARGET ({metricInfo.unit})</p>
            <input
              type="number"
              inputMode="numeric"
              value={target}
              onChange={e => setTarget(e.target.value)}
              className={`w-full bg-zinc-800 border ${colors.border} px-3 py-2 text-white text-sm`}
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            />
            <p className="text-xs text-zinc-500 mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              ~{perMember.toLocaleString()} {metricInfo.unit} per member ({memberCount} {memberCount === 1 ? 'member' : 'members'})
            </p>
          </div>

          {/* Duration — date range picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-zinc-500 uppercase" style={{ fontFamily: "var(--font-pixel), monospace" }}>DATES</p>
              <p className={`text-xs ${invalidRange ? 'text-red-400' : colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {invalidRange ? 'END BEFORE START' : `${durationDays} ${durationDays === 1 ? 'DAY' : 'DAYS'}`}
              </p>
            </div>
            <div className="flex gap-2">
              <label className="flex-1 min-w-0">
                <span className="block text-xs text-zinc-600 mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>START</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    const v = e.target.value;
                    setStartDate(v);
                    // Keep end on or after start
                    if (endDate < v) setEndDate(v);
                  }}
                  className={`w-full min-w-0 box-border bg-zinc-800 border ${colors.border} px-1.5 py-2 text-white text-xs`}
                  style={{ colorScheme: 'dark' }}
                />
              </label>
              <label className="flex-1 min-w-0">
                <span className="block text-xs text-zinc-600 mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>END</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className={`w-full min-w-0 box-border bg-zinc-800 border ${invalidRange ? 'border-red-500' : colors.border} px-1.5 py-2 text-white text-xs`}
                  style={{ colorScheme: 'dark' }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={handleCreate}
            disabled={loading || !Number(target) || invalidRange}
            className={`w-full py-3 border-2 ${colors.primary} bg-zinc-800 text-white hover:bg-zinc-700 transition-colors disabled:opacity-50`}
            style={{ fontFamily: "var(--font-pixel), monospace" }}
          >
            <span className="text-xs uppercase">{loading ? 'PROPOSING...' : '▸ PROPOSE QUEST'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
