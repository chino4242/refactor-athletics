'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ChevronRight } from 'lucide-react';

interface PartyPulseProps {
  userId: string;
}

interface PartyEvent {
  id: string;
  user_id: string;
  event_type: string;
  summary: string;
  xp_value: number;
  created_at: string;
  display_name?: string;
}

export default function PartyPulse({ userId }: PartyPulseProps) {
  const [group, setGroup] = useState<{ id: string; name: string; party_xp: number; party_level: number } | null>(null);
  const [events, setEvents] = useState<PartyEvent[]>([]);
  const [members, setMembers] = useState<{ user_id: string; display_name: string; active: boolean }[]>([]);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      // Get user's group
      const { data: membership } = await supabase
        .from('group_members').select('group_id').eq('user_id', userId).limit(1).single();
      if (!membership) return;

      // Get group info
      const { data: grp } = await supabase
        .from('groups').select('id, name, party_xp, party_level').eq('id', membership.group_id).single();
      if (!grp) return;
      setGroup(grp);

      // Get members
      const { data: mems } = await supabase
        .from('group_members').select('user_id').eq('group_id', grp.id);

      // Get today's events
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: evts } = await supabase
        .from('party_events')
        .select('id, user_id, event_type, summary, xp_value, created_at')
        .eq('group_id', grp.id)
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      // Get display names
      const userIds = [...new Set([...(mems || []).map(m => m.user_id), ...(evts || []).map(e => e.user_id)])];
      const { data: profiles } = await supabase
        .from('users').select('id, display_name').in('id', userIds);
      const nameMap: Record<string, string> = {};
      for (const p of profiles || []) nameMap[p.id] = p.display_name || 'Teammate';

      // Determine who's active today
      const activeUserIds = new Set((evts || []).map(e => e.user_id));
      setMembers((mems || []).map(m => ({
        user_id: m.user_id,
        display_name: nameMap[m.user_id] || 'Teammate',
        active: activeUserIds.has(m.user_id),
      })));

      setEvents((evts || []).map(e => ({ ...e, display_name: nameMap[e.user_id] || 'Teammate' })));
    };
    load();
  }, [userId]);

  if (!group) return null;

  const todayXp = events.reduce((s, e) => s + (e.xp_value || 0), 0);
  const activeCount = members.filter(m => m.active).length;

  return (
    <>
      {/* Party Pulse Card */}
      <button onClick={() => setShowLog(!showLog)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 transition text-left">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚔️</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{group.name || 'Your Party'}</span>
            <span className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded font-bold">Lv{group.party_level}</span>
          </div>
          <ChevronRight size={14} className={`text-zinc-600 transition-transform ${showLog ? 'rotate-90' : ''}`} />
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          {members.map(m => (
            <div key={m.user_id} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${m.active ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-600'}`}>
              {m.display_name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
        <div className="text-[10px] text-zinc-500">
          {activeCount} of {members.length} active today · <span className="text-orange-400 font-bold">+{todayXp} party XP</span>
        </div>
      </button>

      {/* Party Log (expanded) */}
      {showLog && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mt-2 space-y-2 animate-fade-in">
          <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Party Log</div>
          {events.length === 0 && <p className="text-xs text-zinc-600 text-center py-3">No activity yet today</p>}
          {events.map(e => (
            <div key={e.id} className="flex items-start gap-2 text-xs">
              <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-400 shrink-0 mt-0.5">
                {e.display_name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-zinc-300 font-medium">{e.user_id === userId ? 'You' : e.display_name}</span>
                <span className="text-zinc-500"> {e.summary}</span>
                <div className="text-[9px] text-zinc-600 mt-0.5">
                  +{e.xp_value} party XP · {new Date(e.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
              {e.event_type === 'rank_up' && <span className="text-sm">⚡</span>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
