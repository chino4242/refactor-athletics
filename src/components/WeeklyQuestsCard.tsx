'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

interface Quest {
  id: string;
  status: string;
  target_value: number;
  current_value: number;
  xp_awarded: number;
  quest_templates: { name: string; description: string; icon: string; category: string; metric: string };
}

export default function WeeklyQuestsCard({ userId }: { userId: string }) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState('');

  useEffect(() => { load(); }, [userId]);

  const load = async () => {
    // Generate slate if needed
    await fetch('/api/quests', { method: 'POST' });
    // Fetch current slate
    const res = await fetch('/api/quests');
    if (res.ok) {
      const data = await res.json();
      setQuests(data.quests || []);
      setWeek(data.week);
    }
    setLoading(false);
  };

  const accept = async (questId: string) => {
    await fetch('/api/quests/accept', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quest_id: questId, action: 'accept' }),
    });
    setQuests(prev => prev.map(q => q.id === questId ? { ...q, status: 'accepted' } : q));
  };

  if (loading) return null;

  const offered = quests.filter(q => q.status === 'offered');
  const accepted = quests.filter(q => q.status === 'accepted');
  const completed = quests.filter(q => q.status === 'completed');

  if (quests.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">⚔️</span>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Weekly Quests</span>
        </div>
        <span className="text-[9px] text-zinc-600">{completed.length}/{accepted.length + completed.length} complete</span>
      </div>

      {/* Offered quests — pick to accept */}
      {offered.length > 0 && (
        <div className="mb-3">
          <div className="text-[9px] text-orange-400 font-bold uppercase mb-1.5">Choose your quests:</div>
          <div className="space-y-1.5">
            {offered.map(q => (
              <button key={q.id} onClick={() => accept(q.id)}
                className="w-full flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 hover:border-orange-500/30 rounded-lg p-2.5 transition text-left">
                <span className="text-lg">{q.quest_templates.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white">{q.quest_templates.name}</div>
                  <div className="text-[10px] text-zinc-500">{q.quest_templates.description.replace('{target}', String(Math.round(q.target_value)))}</div>
                </div>
                <span className="text-[9px] text-orange-400 font-bold uppercase shrink-0">Accept</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Accepted quests — show progress */}
      {accepted.length > 0 && (
        <div className="space-y-2">
          {accepted.map(q => {
            const pct = Math.min(100, (q.current_value / q.target_value) * 100);
            return (
              <div key={q.id} className="bg-zinc-800/30 rounded-lg p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{q.quest_templates.icon}</span>
                  <span className="text-xs font-medium text-white flex-1">{q.quest_templates.name}</span>
                  <span className="text-[9px] text-zinc-500">{Math.round(q.current_value)}/{Math.round(q.target_value)}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed quests */}
      {completed.length > 0 && (
        <div className="space-y-1 mt-2">
          {completed.map(q => (
            <div key={q.id} className="flex items-center gap-2 text-xs text-emerald-400">
              <Check size={12} /> <span>{q.quest_templates.name}</span>
              <span className="text-[9px] text-zinc-600 ml-auto">+{q.xp_awarded} XP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
