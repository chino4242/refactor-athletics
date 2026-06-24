"use client";

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';
import { createChallenge } from '@/services/duelApi';

interface Props {
  isOpen: boolean;
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}

const DURATIONS = [
  { label: '24H', days: 1 },
  { label: '48H', days: 2 },
  { label: '5D', days: 5 },
  { label: '7D', days: 7 },
];

export default function DuelModal({ isOpen, userId, onClose, onCreated }: Props) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [days, setDays] = useState(7);
  const [duelType, setDuelType] = useState('xp');
  const [startDate, setStartDate] = useState(new Date(Date.now() + 86400000).toLocaleDateString('en-CA'));
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setLoading(true);
    const duel = await createChallenge(userId, days, duelType, startDate);
    if (duel) {
      const url = `${window.location.origin}/arena/duel/${duel.id}`;
      setLink(url);
    }
    setLoading(false);
  };

  const copyLink = () => {
    if (link) {
      navigator.clipboard.writeText(link);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
      <div className={`w-full max-w-sm border-2 ${colors.primary} bg-zinc-900 relative`}>
        <div className={`absolute -top-[3px] -left-[3px] w-[6px] h-[6px] ${colors.corner}`} />
        <div className={`absolute -top-[3px] -right-[3px] w-[6px] h-[6px] ${colors.corner}`} />
        <div className={`absolute -bottom-[3px] -left-[3px] w-[6px] h-[6px] ${colors.corner}`} />
        <div className={`absolute -bottom-[3px] -right-[3px] w-[6px] h-[6px] ${colors.corner}`} />

        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <p className={`text-[10px] ${colors.headerText} uppercase tracking-wider`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            ⚡ CHALLENGE SOMEONE
          </p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xs">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {!link ? (
            <>
              <div>
                <p className="text-[8px] text-zinc-500 uppercase mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>DURATION</p>
                <div className="flex gap-2">
                  {DURATIONS.map(d => (
                    <button key={d.days} onClick={() => setDays(d.days)} className={`flex-1 py-2 border text-center ${days === d.days ? `${colors.primary} bg-zinc-800` : 'border-zinc-700 bg-zinc-900'}`}>
                      <span className={`text-[9px] ${days === d.days ? colors.secondary : 'text-zinc-400'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[8px] text-zinc-500 uppercase mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>START DATE</p>
                <input
                  type="date"
                  value={startDate}
                  min={new Date().toLocaleDateString('en-CA')}
                  onChange={e => setStartDate(e.target.value)}
                  className={`w-full bg-zinc-800 border ${colors.border} px-3 py-2 text-white text-[9px] rounded-sm`}
                  style={{ fontFamily: "var(--font-pixel), monospace" }}
                />
              </div>

              <div>
                <p className="text-[8px] text-zinc-500 uppercase mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>ARENA TYPE</p>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'xp', label: '⚡ XP', desc: 'All activity' },
                    { id: 'volume', label: '🏋️ Volume', desc: 'Weight lifted' },
                    { id: 'distance', label: '🏃 Distance', desc: 'Miles logged' },
                    { id: 'sessions', label: '📅 Sessions', desc: 'Days trained' },
                    { id: 'rank_ups', label: '⬆ Ranks', desc: 'Rank-ups' },
                    { id: 'prs', label: '★ PRs', desc: 'Records set' },
                  ].map(t => (
                    <button key={t.id} onClick={() => setDuelType(t.id)} className={`py-2 border text-center ${duelType === t.id ? `${colors.primary} bg-zinc-800` : 'border-zinc-700 bg-zinc-900'}`}>
                      <span className={`text-[8px] ${duelType === t.id ? colors.secondary : 'text-zinc-500'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={loading}
                className={`w-full py-3 border-2 ${colors.primary} bg-zinc-800 text-white disabled:opacity-40`}
                style={{ fontFamily: "var(--font-pixel), monospace" }}
              >
                <span className={`text-[10px] ${colors.secondary}`}>{loading ? 'CREATING...' : '⚡ CREATE DUEL'}</span>
              </button>
            </>
          ) : (
            <div className="text-center space-y-3">
              <p className={`text-[9px] ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>DUEL CREATED!</p>
              <p className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>Share this link with your opponent:</p>
              <div className={`border ${colors.border} bg-zinc-800 p-2`}>
                <p className="text-[7px] text-zinc-300 break-all">{link}</p>
              </div>
              <button onClick={copyLink} className={`w-full py-2 border ${colors.border} bg-zinc-800 text-zinc-300 text-[9px]`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                📋 COPY LINK
              </button>
              <button onClick={() => { onCreated(); onClose(); }} className="w-full py-2 text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                DONE
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
