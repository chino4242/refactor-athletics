'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, Zap } from 'lucide-react';

interface WhileYouWereAwayProps {
  userId: string;
}

export default function WhileYouWereAway({ userId }: WhileYouWereAwayProps) {
  const [data, setData] = useState<{ total: number; breakdown: Record<string, number> } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      // Check unseen_xp
      const { data: user } = await supabase.from('users').select('unseen_xp').eq('id', userId).single();
      if (!user?.unseen_xp || user.unseen_xp <= 0) return;

      // Get recent background XP from ledger
      const { data: entries } = await supabase
        .from('xp_ledger')
        .select('amount, source_type')
        .eq('user_id', userId)
        .eq('is_background', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!entries?.length) {
        // No ledger entries yet — show simple total
        setData({ total: user.unseen_xp, breakdown: {} });
      } else {
        const breakdown: Record<string, number> = {};
        let total = 0;
        for (const e of entries) {
          breakdown[e.source_type] = (breakdown[e.source_type] || 0) + e.amount;
          total += e.amount;
        }
        setData({ total: total || user.unseen_xp, breakdown });
      }

      // Clear unseen_xp
      await supabase.from('users').update({ unseen_xp: 0 }).eq('id', userId);
    };
    load();
  }, [userId]);

  if (!data || dismissed) return null;

  const sourceLabels: Record<string, string> = {
    habit: '🏃 Habits',
    workout: '🏋️ Workouts',
    nutrition: '🥗 Nutrition',
    measurement: '📐 Body Comp',
  };

  return (
    <div className="mx-4 mb-4 bg-gradient-to-r from-orange-950/30 to-zinc-900 border border-orange-500/20 rounded-xl p-4 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={16} className="text-orange-400" />
          <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">While you were away</span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-zinc-600 hover:text-zinc-400 p-1"><X size={14} /></button>
      </div>
      <div className="text-2xl font-black text-white mb-1">+{data.total} XP</div>
      {Object.keys(data.breakdown).length > 0 && (
        <div className="flex gap-3 text-xs text-zinc-400">
          {Object.entries(data.breakdown).map(([type, amount]) => (
            <span key={type}>{sourceLabels[type] || type}: {amount}</span>
          ))}
        </div>
      )}
    </div>
  );
}
