"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface XpEntry {
  source_type: string;
  source_label: string;
  amount: number;
}

const SOURCE_COLORS: Record<string, string> = {
  workout: 'bg-blue-500',
  nutrition: 'bg-green-500',
  habit: 'bg-purple-500',
  bounty: 'bg-amber-500',
  challenge: 'bg-red-500',
};

const SOURCE_ICONS: Record<string, string> = {
  workout: '🏋️',
  nutrition: '🥦',
  habit: '👟',
  bounty: '🎯',
  challenge: '⚔',
};

export default function DailyXpSheet({ isOpen, onClose }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [entries, setEntries] = useState<XpEntry[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const today = new Date().toLocaleDateString('en-CA');
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

      const { data } = await supabase
        .from('xp_ledger')
        .select('source_type, source_label, amount')
        .gte('created_at', todayStart)
        .order('amount', { ascending: false });

      setEntries(data || []);
      setTotal((data || []).reduce((s, e) => s + (e.amount || 0), 0));
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  // Group by source_type
  const grouped: Record<string, { total: number; entries: XpEntry[] }> = {};
  for (const e of entries) {
    if (!grouped[e.source_type]) grouped[e.source_type] = { total: 0, entries: [] };
    grouped[e.source_type].total += e.amount;
    grouped[e.source_type].entries.push(e);
  }
  const sortedGroups = Object.entries(grouped).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/60" />
      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 max-h-[55vh] bg-zinc-900 border-t-2 border-zinc-700 rounded-t-lg overflow-y-auto animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <p className={`text-xs ${colors.secondary} font-bold`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
              ⚡ TODAY&apos;S XP
            </p>
            <span className="text-lg font-bold text-white">{total} XP</span>
          </div>

          {/* Stacked bar */}
          {total > 0 && (
            <div className="h-2 rounded-full overflow-hidden flex mb-4">
              {sortedGroups.map(([type, data]) => (
                <div
                  key={type}
                  className={`${SOURCE_COLORS[type] || 'bg-zinc-600'} h-full`}
                  style={{ width: `${(data.total / total) * 100}%` }}
                />
              ))}
            </div>
          )}

          {/* Breakdown */}
          {total === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-6">No XP earned yet today — go get some 💪</p>
          ) : (
            <div className="space-y-2">
              {sortedGroups.map(([type, data]) => (
                <div key={type}>
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{SOURCE_ICONS[type] || '⚡'}</span>
                      <span className="text-sm text-zinc-300 capitalize">{type}</span>
                    </div>
                    <span className="text-sm font-bold text-white">{data.total} XP</span>
                  </div>
                  {/* Individual entries */}
                  <div className="pl-7 space-y-0.5">
                    {data.entries.slice(0, 5).map((e, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500 truncate max-w-[200px]">{e.source_label}</span>
                        <span className="text-xs text-zinc-400">{e.amount}</span>
                      </div>
                    ))}
                    {data.entries.length > 5 && (
                      <p className="text-xs text-zinc-600">+{data.entries.length - 5} more</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sync status */}
          <SyncStatus />
        </div>
      </div>
    </div>
  );
}

function SyncStatus() {
  const [status, setStatus] = useState<{ ts: number; exercises: number; steps: number } | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('health_sync_last');
      if (raw) setStatus(JSON.parse(raw));
      setNeedsReconnect(localStorage.getItem('health_sync_needs_reconnect') === '1');
    } catch {}
  }, []);
  if (needsReconnect) {
    return (
      <div className="mt-4 pt-3 border-t border-zinc-800 text-center">
        <p className="text-xs text-amber-400">⚠ Health sync returning empty — permissions may have been revoked</p>
        <p className="text-xs text-zinc-500 mt-1">Go to Settings → Health → Refactor Athletics to re-enable</p>
      </div>
    );
  }
  if (!status) return null;
  const ago = Math.round((Date.now() - status.ts) / 60000);
  const label = ago < 1 ? 'just now' : ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`;
  return (
    <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      <span className="text-xs text-zinc-600">Synced {label}{status.exercises > 0 ? ` · ${status.exercises} exercise${status.exercises > 1 ? 's' : ''} found` : ''}</span>
    </div>
  );
}
