"use client";

import { useState, useCallback, useEffect } from 'react';
import { getActiveDuels, getDuelHistory, type DuelResponse } from '@/services/api';
import { useToast } from '@/context/ToastContext';
import { useExperienceMode } from '@/context/ExperienceModeContext';
import ChallengeModal from './arena/ChallengeModal';
import ActiveDuelCard from './arena/ActiveDuelCard';
import DuelHistoryCard from './arena/DuelHistoryCard';
import DuelVictoryModal from './arena/DuelVictoryModal';
import GroupCard from './GroupCard';
import { useTheme } from '@/context/ThemeContext';
import { THEMES } from '@/data/themes';
import { Swords, Plus } from 'lucide-react';

interface ArenaProps {
  userId: string;
}

const TABS = [
  { id: 'duels', label: 'Duels', rpgLabel: 'Battles', icon: '⚔️' },
  { id: 'party', label: 'Groups', rpgLabel: 'Party', icon: '👥' },
  { id: 'history', label: 'History', rpgLabel: 'History', icon: '📜' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function Arena({ userId }: ArenaProps) {
  const toast = useToast();
  const { isClassic } = useExperienceMode();
  const { theme: _theme } = useTheme();
  const theme = _theme || THEMES.athlete;
  const [activeTab, setActiveTab] = useState<TabId>('duels');
  const [isLoading, setIsLoading] = useState(true);

  const [activeDuels, setActiveDuels] = useState<DuelResponse[]>([]);
  const [historyDuels, setHistoryDuels] = useState<DuelResponse[]>([]);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [victoryDuel, setVictoryDuel] = useState<DuelResponse | null>(null);

  const loadDuels = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [active, history] = await Promise.all([
        getActiveDuels(userId),
        getDuelHistory(userId),
      ]);
      setActiveDuels(active);
      setHistoryDuels(history);
    } catch (e) {
      console.error('Failed to load duels:', e);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadDuels(); }, [loadDuels]);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4 pb-32" style={{ backgroundImage: theme.bgTexture }}>

      {/* Header */}
      <div className="flex items-center justify-between px-2 pt-2">
        <div>
          <h1 className="text-xl font-black text-white">{isClassic ? 'Social' : theme.labels.arena}</h1>
          <p className="text-xs text-zinc-500">{isClassic ? 'Challenge friends' : 'Prove your strength'}</p>
        </div>
        <button
          onClick={() => setIsChallengeModalOpen(true)}
          className={`flex items-center gap-1.5 bg-gradient-to-r ${theme.accentGradient} text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg`}
          style={{ boxShadow: `0 10px 15px -3px ${theme.accentHex}20` }}
        >
          <Plus size={14} />
          Challenge
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 px-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-b from-zinc-700/80 to-zinc-800/80 text-white border border-zinc-600/50 shadow-lg shadow-black/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
            }`}
            style={activeTab === tab.id ? { borderColor: `${theme.accentHex}30` } : {}}
          >
            <span>{tab.icon}</span>
            <span>{isClassic ? tab.label : tab.rpgLabel}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px] px-2">

        {/* DUELS TAB */}
        {activeTab === 'duels' && (
          <div className="flex flex-col gap-3 animate-fade-in-up">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-24 bg-zinc-900/60 rounded-xl border border-zinc-800/50 animate-pulse" />
                ))}
              </div>
            ) : activeDuels.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-4xl mb-3">{isClassic ? '🤝' : '⚔️'}</div>
                <p className="text-sm font-semibold text-zinc-400">{isClassic ? 'No active challenges' : 'The arena awaits'}</p>
                <p className="text-xs text-zinc-600 mt-1 max-w-xs mx-auto">
                  {isClassic ? 'Challenge a friend to compare progress.' : 'Challenge a rival and prove your worth.'}
                </p>
                <button
                  onClick={() => setIsChallengeModalOpen(true)}
                  className="mt-4 text-xs text-orange-400 hover:text-orange-300 font-medium"
                >
                  Create a challenge →
                </button>
              </div>
            ) : (
              activeDuels.map(d => (
                <ActiveDuelCard
                  key={d.id}
                  duel={d}
                  currentUserId={userId}
                  onRefresh={loadDuels}
                  onShowVictory={setVictoryDuel}
                />
              ))
            )}
          </div>
        )}

        {/* PARTY TAB */}
        {activeTab === 'party' && (
          <div className="animate-fade-in-up">
            <GroupCard userId={userId} />
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-2 animate-fade-in-up">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-zinc-900/60 rounded-xl border border-zinc-800/50 animate-pulse" />
                ))}
              </div>
            ) : historyDuels.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-4xl mb-3">📜</div>
                <p className="text-sm font-semibold text-zinc-400">No history yet</p>
                <p className="text-xs text-zinc-600 mt-1">Completed challenges will appear here.</p>
              </div>
            ) : (
              historyDuels.map(d => (
                <DuelHistoryCard key={d.id} duel={d} currentUserId={userId} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ChallengeModal
        isOpen={isChallengeModalOpen}
        challengerId={userId}
        onClose={() => setIsChallengeModalOpen(false)}
        onChallengeCreated={() => { loadDuels(); toast.success("Challenge created!"); }}
      />

      {victoryDuel && (
        <DuelVictoryModal
          duel={victoryDuel}
          currentUserId={userId}
          onClose={() => setVictoryDuel(null)}
        />
      )}
    </div>
  );
}
