"use client";

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';
import PixelBox, { ScreenWrapper } from './PixelBox';
import { ArenaSkeleton } from './Skeletons';
import { getWeeklyBounties, setDifficulty, type BountyWithProgress, type Difficulty } from '@/services/bountyService';
import { getGroupChallengeWithProgress, getMetricLabel, type GroupChallengeWithProgress } from '@/services/groupChallengeService';
import GuildQuestModal from './GuildQuestModal';
import CampaignModal from './CampaignModal';
import DuelModal from './DuelModal';
import PartyStatusStrip from './PartyStatusStrip';
import GuildEventTicker from './GuildEventTicker';
import PartyLeaderboard from './PartyLeaderboard';

interface ArenaScreenProps {
  userId: string;
}

function BountyCard({ bounty, colors, onDifficultyChange }: { bounty: BountyWithProgress; colors: ReturnType<typeof getV2Theme>; onDifficultyChange: (id: string, d: Difficulty) => void }) {
  const pct = Math.min((bounty.current / bounty.target) * 100, 100);

  return (
    <div className={`border ${bounty.completed ? 'border-green-600 bg-green-900/10' : `${colors.border} bg-zinc-800/30`} p-3`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-200">{bounty.description}</span>
        {bounty.completed && (
          <span className="text-[8px] text-green-400 border border-green-600 px-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            DONE
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-zinc-500">
          {bounty.current.toLocaleString()}/{bounty.target.toLocaleString()}
        </span>
        {!bounty.difficultyLocked ? (
          <select
            value={bounty.difficulty}
            onChange={(e) => onDifficultyChange(bounty.id, e.target.value as Difficulty)}
            className="text-[8px] bg-zinc-800 border border-zinc-600 text-zinc-300 px-1 py-0.5"
            style={{ fontFamily: "var(--font-pixel), monospace" }}
          >
            <option value="easy">▼ EASY</option>
            <option value="normal">● NORMAL</option>
            <option value="hard">▲ HARD</option>
          </select>
        ) : (
          <span className={`text-[8px] ${colors.secondary} border ${colors.border} px-1`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {bounty.difficulty.toUpperCase()}
          </span>
        )}
      </div>
      <div className="h-2 bg-zinc-800 border border-zinc-700 flex">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 border-r border-zinc-900 ${i < Math.round(pct / 10) ? (bounty.completed ? 'bg-green-500' : colors.barFill) : ''}`}
          />
        ))}
      </div>
      <div className="mt-1 text-right">
        <span className="text-[11px] text-zinc-500">
          +{bounty.xp} XP
        </span>
      </div>
    </div>
  );
}

function CampaignCard({ campaign, userId, colors, onUpdate }: { campaign: any; userId: string; colors: any; onUpdate: (c: any) => void }) {
  const today = new Date().toLocaleDateString('en-CA');
  const startDate = new Date(campaign.start_date + 'T12:00:00');
  const dayNum = Math.floor((Date.now() - startDate.getTime()) / (86400000)) + 1;
  const duration = campaign.duration_days || 75;
  const metrics = campaign.challenge_75_metrics || [];
  const days = campaign.challenge_75_days || [];

  // Milestone celebration
  const milestones = [Math.round(duration * 0.25), Math.round(duration * 0.5), Math.round(duration * 0.75)];
  const isMilestoneDay = milestones.includes(dayNum);
  const milestoneKey = `milestone_${campaign.id}_${dayNum}`;
  const [showMilestone, setShowMilestone] = useState(() => isMilestoneDay && !localStorage.getItem(milestoneKey));
  const dismissMilestone = () => { localStorage.setItem(milestoneKey, '1'); setShowMilestone(false); };
  const members = campaign.challenge_75_members || [];
  const myMembership = members.find((m: any) => m.user_id === userId);

  // Completed state
  if (campaign.status === 'completed' || myMembership?.status === 'completed') {
    return (
      <div className="text-center space-y-2">
        <p className={`text-[10px] ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>⚔ CAMPAIGN COMPLETE ⚔</p>
        <p className="text-xs text-white">{campaign.title}</p>
        <p className="text-[11px] text-zinc-400">{duration} DAYS · +2,500 XP EARNED</p>
      </div>
    );
  }

  // Failed state
  if (campaign.status === 'failed' || myMembership?.status === 'failed') {
    const failedDay = myMembership?.failed_on || campaign.failed_on;
    const failedMetric = myMembership?.failed_metric || campaign.failed_metric || 'Unknown';
    const daysCompleted = failedDay ? Math.max(0, Math.floor((new Date(failedDay + 'T12:00:00').getTime() - startDate.getTime()) / 86400000)) : 0;
    const passedDays = days.filter((d: any) => d.user_id === userId && d.status === 'passed').length;
    return (
      <div className="space-y-3">
        <div className="text-center">
          <p className="text-[10px] text-red-400 mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>CAMPAIGN FALLEN</p>
          <p className="text-xs text-zinc-400">{campaign.title}</p>
          <p className="text-[8px] text-zinc-500 mt-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            FELL ON DAY {daysCompleted + 1} — {failedMetric}
          </p>
        </div>
        <div className="flex justify-center gap-4 text-[9px] text-zinc-500">
          <span>{passedDays} days completed</span>
          <span>{daysCompleted > 0 ? Math.round((passedDays / daysCompleted) * 100) : 0}% success rate</span>
        </div>
        <button
          onClick={async () => {
            await fetch('/api/challenge-75', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'restart', challenge_id: campaign.id }) });
            const data = await fetch('/api/challenge-75').then(r => r.json());
            const active = (data?.challenges || []).find((c: any) => c.status === 'active');
            onUpdate(active || null);
          }}
          className={`w-full text-[8px] py-2 border ${colors.border} bg-zinc-800 text-zinc-400 hover:text-white transition-colors`}
          style={{ fontFamily: "var(--font-pixel), monospace" }}
        >
          ▸ FORGE ANEW
        </button>
      </div>
    );
  }

  const todayDay = days.find((d: any) => d.date === today && d.user_id === userId);
  const customChecks = todayDay?.custom_checks || {};
  const metricsSnapshot = todayDay?.metrics_snapshot || {};

  // Streak: count consecutive passed days ending yesterday
  const passedDays = days.filter((d: any) => d.user_id === userId && d.status === 'passed').map((d: any) => d.date).sort();
  let streak = 0;
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  let checkDate = yesterday;
  while (true) {
    const dateStr = checkDate.toLocaleDateString('en-CA');
    if (passedDays.includes(dateStr)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
    else break;
  }

  const handleCheck = async (metricId: string, checked: boolean) => {
    await fetch('/api/challenge-75', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check_custom', challenge_id: campaign.id, metric_id: metricId, checked }),
    });
    // Optimistic update
    const updatedDays = [...days];
    const existingIdx = updatedDays.findIndex((d: any) => d.date === today && d.user_id === userId);
    const newChecks = { ...customChecks, [metricId]: checked };
    if (existingIdx >= 0) updatedDays[existingIdx] = { ...updatedDays[existingIdx], custom_checks: newChecks };
    else updatedDays.push({ date: today, user_id: userId, status: 'pending', custom_checks: newChecks, metrics_snapshot: {} });
    onUpdate({ ...campaign, challenge_75_days: updatedDays });
  };

  const checkedCount = metrics.filter((m: any) => {
    if (m.metric_type === 'custom') return customChecks[m.metric_id];
    return metricsSnapshot[m.metric_id]?.met;
  }).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white">{campaign.title}</p>
        <span className="text-[11px] text-zinc-500">DAY {dayNum}/{duration}</span>
      </div>

      {/* Progress bar with milestone markers */}
      <div className="relative">
        <div className="h-2 bg-zinc-800 border border-zinc-700 flex">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className={`flex-1 border-r border-zinc-900 ${i < Math.round((dayNum / duration) * 20) ? colors.barFill : ''}`} />
          ))}
        </div>
        {/* Milestone markers at 25%, 50%, 75% */}
        {[0.25, 0.5, 0.75].map(pct => (
          <div key={pct} className="absolute top-0 h-2 w-0.5" style={{ left: `${pct * 100}%`, backgroundColor: dayNum / duration >= pct ? '#fbbf24' : '#3f3f46' }} />
        ))}
      </div>
      {/* Milestone labels */}
      <div className="flex justify-between text-[7px] text-zinc-600" style={{ fontFamily: "var(--font-pixel), monospace" }}>
        <span>{dayNum >= Math.round(duration * 0.25) ? '✓' : ''} {Math.round(duration * 0.25)}</span>
        <span>{dayNum >= Math.round(duration * 0.5) ? '✓' : ''} {Math.round(duration * 0.5)}</span>
        <span>{dayNum >= Math.round(duration * 0.75) ? '✓' : ''} {Math.round(duration * 0.75)}</span>
        <span>{duration}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-400">🔥 {streak} DAY STREAK</span>
        <span className="text-[11px] text-zinc-400">✓ {checkedCount}/{metrics.length} TODAY</span>
      </div>

      {/* Milestone celebration */}
      {showMilestone && (
        <button onClick={dismissMilestone} className={`w-full p-3 border-2 border-amber-600 bg-amber-950/30 text-center space-y-1`}>
          <p className="text-[10px] text-amber-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>🏆 MILESTONE — DAY {dayNum}</p>
          <p className="text-[8px] text-zinc-400">
            {dayNum === milestones[0] ? 'Quarter way there!' : dayNum === milestones[1] ? 'Halfway! Keep pushing.' : 'Almost there. Final stretch.'}
          </p>
          <p className="text-[7px] text-zinc-600">tap to dismiss</p>
        </button>
      )}

      {/* Partner status */}
      {members.length > 1 && (
        <div className="space-y-1">
          {members.filter((m: any) => m.user_id !== userId).map((m: any) => {
            const partnerDay = days.find((d: any) => d.user_id === m.user_id && d.date === today);
            const partnerDone = partnerDay?.status === 'passed';
            const partnerPending = !partnerDay || partnerDay.status === 'pending';
            const name = m.users?.display_name || 'Partner';
            return (
              <div key={m.user_id} className={`flex items-center justify-between px-2 py-1 border ${partnerDone ? 'border-green-800/50 bg-green-900/10' : 'border-zinc-800 bg-zinc-900/50'}`}>
                <span className="text-[8px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  {partnerDone ? '✓' : partnerPending ? '○' : '✕'} {name}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-[7px] ${partnerDone ? 'text-green-500' : 'text-zinc-600'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    {partnerDone ? 'DONE' : partnerPending ? 'PENDING' : 'MISSED'}
                  </span>
                  {partnerPending && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const nudgeKey = `nudge_${campaign.id}_${m.user_id}_${today}`;
                        if (localStorage.getItem(nudgeKey)) return;
                        localStorage.setItem(nudgeKey, '1');
                        await fetch('/api/challenge-75', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'nudge', challenge_id: campaign.id, target_user_id: m.user_id }) });
                        (e.target as HTMLElement).textContent = '✓';
                      }}
                      className="text-[7px] text-amber-500 hover:text-amber-400" style={{ fontFamily: "var(--font-pixel), monospace" }}
                    >
                      NUDGE
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Today's checklist */}
      <div className="space-y-1.5">
        {metrics.sort((a: any, b: any) => a.sort_order - b.sort_order).map((m: any) => {
          const isAuto = m.metric_type === 'app';
          const isChecked = isAuto ? metricsSnapshot[m.metric_id]?.met : customChecks[m.metric_id];
          return (
            <button
              key={m.id}
              onClick={() => !isAuto && handleCheck(m.metric_id, !isChecked)}
              disabled={isAuto}
              className={`w-full flex items-center gap-2 px-2 py-1.5 border ${isChecked ? 'border-green-800/50 bg-green-900/10' : 'border-zinc-700 bg-zinc-800/50'} text-left transition-colors`}
            >
              <span className={`text-[9px] ${isChecked ? 'text-green-500' : 'text-zinc-600'}`}>
                {isChecked ? '✓' : '○'}
              </span>
              <span className={`text-[8px] ${isChecked ? 'text-zinc-500' : 'text-zinc-300'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {m.label}{m.minimum && m.metric_type === 'app' ? ` ≥ ${m.minimum}` : ''}
              </span>
              {isAuto && <span className="text-[7px] text-zinc-600 ml-auto" style={{ fontFamily: "var(--font-pixel), monospace" }}>AUTO</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

async function getUserGuildQuest(userId: string): Promise<{ quest: GroupChallengeWithProgress | null; groupId: string | null }> {
  const { createClient } = await import('@/utils/supabase/client');
  const supabase = createClient();
  const { data } = await supabase.from('group_members').select('group_id').eq('user_id', userId).limit(1);
  if (!data || data.length === 0) return { quest: null, groupId: null };
  const quest = await getGroupChallengeWithProgress(data[0].group_id);
  return { quest, groupId: data[0].group_id };
}

export default function ArenaScreen({ userId }: ArenaScreenProps) {
  const { currentTheme } = useTheme();
  const colors = getV2Theme(currentTheme);
  const [bounties, setBounties] = useState<BountyWithProgress[]>([]);
  const [guildQuest, setGuildQuest] = useState<GroupChallengeWithProgress | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<any>(null);
  const [showQuestModal, setShowQuestModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showDuelModal, setShowDuelModal] = useState(false);
  const [activeDuels, setActiveDuels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bountyReveal, setBountyReveal] = useState(() => {
    const key = `bounty_reveal_${new Date().toLocaleDateString('en-CA')}`;
    const isMonday = new Date().getDay() === 1;
    return isMonday && !localStorage.getItem(key);
  });

  // Dismiss reveal after animation
  useEffect(() => {
    if (bountyReveal) {
      const key = `bounty_reveal_${new Date().toLocaleDateString('en-CA')}`;
      setTimeout(() => { localStorage.setItem(key, '1'); setBountyReveal(false); }, 3000);
    }
  }, [bountyReveal]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [bountyData, questResult, campaignData] = await Promise.all([
          getWeeklyBounties(userId),
          getUserGuildQuest(userId),
          fetch('/api/challenge-75').then(r => r.json()),
        ]);
        setBounties(bountyData);
        setGuildQuest(questResult?.quest || null);
        setGroupId(questResult?.groupId || null);
        const active = (campaignData?.challenges || []).find((c: any) => c.status === 'active')
          || (campaignData?.challenges || []).find((c: any) => {
            // Show completed campaigns for 7 days after completion
            if (c.status !== 'completed') return false;
            const completedAt = c.completed_at ? new Date(c.completed_at) : null;
            return completedAt && (Date.now() - completedAt.getTime()) < 7 * 86400000;
          })
          || (campaignData?.challenges || []).find((c: any) => {
            // Show failed campaign for 7 days after failure (for restart flow)
            if (c.status !== 'failed') return false;
            const members = c.challenge_75_members || [];
            const myMember = members.find((m: any) => m.user_id === userId);
            if (!myMember?.failed_on) return false;
            const failedAt = new Date(myMember.failed_on + 'T12:00:00');
            return (Date.now() - failedAt.getTime()) < 7 * 86400000;
          });
        setCampaign(active || null);

        // Check for joinable campaigns from group
        if (!active && campaignData?.joinable?.length > 0) {
          setCampaign({ _joinable: true, ...campaignData.joinable[0] });
        }

        // Fetch duels
        const { getActiveDuels } = await import('@/services/duelApi');
        setActiveDuels(await getActiveDuels(userId));
      } catch { /* empty state */ }
      setLoading(false);
    })();
  }, [userId, refreshKey]);

  const handleDifficultyChange = async (bountyId: string, difficulty: Difficulty) => {
    await setDifficulty(bountyId, difficulty);
    const data = await getWeeklyBounties(userId);
    setBounties(data);
  };

  if (loading) {
    return <ArenaSkeleton />;
  }

  return (
    <ScreenWrapper onRefresh={async () => { setRefreshKey(k => k + 1); }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className={`text-[10px] ${colors.headerText} uppercase tracking-widest`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          ARENA
        </p>
      </div>

      {/* Party Status */}
      <PartyStatusStrip userId={userId} />

      {/* Guild Event Ticker */}
      <GuildEventTicker userId={userId} />

      {/* Party Power Leaderboard */}
      <PartyLeaderboard userId={userId} />

      {/* Active Campaign / CTA */}
      <PixelBox highlight={!!campaign} className="p-4 mb-4">
        <p className={`text-[10px] ${colors.headerText} mb-3 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          ★ CAMPAIGN
        </p>
        {campaign ? (
          campaign._joinable ? (
            <div className="text-center py-3">
              <p className={`text-[9px] ${colors.secondary} mb-1`} style={{ fontFamily: "var(--font-pixel), monospace" }}>CAMPAIGN AVAILABLE</p>
              <p className="text-xs text-zinc-400 mb-3">{campaign.title}</p>
              <a
                href="/challenge-75"
                className={`text-[10px] px-3 py-2 border ${colors.primary} bg-zinc-800 text-white hover:bg-zinc-700 transition-colors`}
                style={{ fontFamily: "var(--font-pixel), monospace" }}
              >
                ▸ VIEW & JOIN
              </a>
            </div>
          ) : (
            <CampaignCard campaign={campaign} userId={userId} colors={colors} onUpdate={setCampaign} />
          )
        ) : (
          <div className="text-center py-3">
            <p className="text-[9px] text-zinc-500 mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>NO ACTIVE CAMPAIGN</p>
            <p className="text-[8px] text-zinc-600 mb-3">Set daily goals for 30-75 days. All or nothing.</p>
            <button
              onClick={() => setShowCampaignModal(true)}
              className={`text-[10px] px-3 py-2 border ${colors.border} bg-zinc-800 text-zinc-400 hover:text-white transition-colors`}
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              ▸ FORGE A CAMPAIGN
            </button>
          </div>
        )}
      </PixelBox>

      {/* Weekly Bounties */}
      <PixelBox highlight className="p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className={`text-[10px] ${colors.secondary} uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            ★ WEEKLY BOUNTIES
          </p>
          <span className="text-[11px] text-zinc-500">
            {bounties.filter(b => b.completed).length}/{bounties.length}
          </span>
        </div>
        {bountyReveal && (
          <p className="text-[9px] text-zinc-500 italic text-center mb-2">This week&apos;s challenges await...</p>
        )}
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <div className="space-y-3">
          {bounties.map((b, i) => (
            <div key={b.id} style={{ opacity: bountyReveal ? 0 : 1, animation: bountyReveal ? `fadeIn 0.4s ease-out ${i * 0.3 + 0.5}s forwards` : undefined }}>
              <BountyCard bounty={b} colors={colors} onDifficultyChange={handleDifficultyChange} />
            </div>
          ))}
        </div>
      </PixelBox>

      {/* Bounty Sweep Celebration */}
      {bounties.length > 0 && bounties.every(b => b.completed) && (
        <div className={`border-2 border-amber-600 bg-amber-950/20 p-3 mb-4 text-center`}>
          <p className="text-[11px] text-amber-400 font-bold" style={{ fontFamily: "var(--font-pixel), monospace" }}>⚔ BOUNTY SWEEP ⚔</p>
          <p className="text-[9px] text-zinc-400 mt-1">All bounties complete — sweep bonus earned!</p>
        </div>
      )}

      {/* Bounty History */}
      {bounties.length > 0 && <BountyHistory userId={userId} colors={colors} />}

      {/* ─── Secondary ─── */}
      <div className="opacity-80 space-y-4">
      {/* Guild Quest */}
      <PixelBox className="p-4">
        <p className={`text-[10px] ${colors.headerText} mb-3 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          ⚔ GUILD QUEST
        </p>
        {guildQuest && guildQuest.status === 'active' ? (
          <>
            <p className="text-xs text-zinc-200 mb-1">{guildQuest.name}</p>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-zinc-500">
                {guildQuest.current.toLocaleString()}/{guildQuest.target.toLocaleString()} {getMetricLabel(guildQuest.metric)}
              </span>
              <span className="text-[11px] text-zinc-500">
                {guildQuest.daysLeft}D LEFT
              </span>
            </div>
            <div className="h-3 bg-zinc-800 border border-zinc-700 flex mb-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={`flex-1 border-r border-zinc-900 ${i < Math.round(Math.min(guildQuest.current / guildQuest.target, 1) * 10) ? colors.barFill : ''}`} />
              ))}
            </div>
            {guildQuest.members.length > 0 && (
              <div className="space-y-1">
                {guildQuest.members.map((m) => (
                  <div key={m.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${m.contribution > 0 ? 'bg-green-500' : 'bg-zinc-700'}`} />
                      <span className={`text-[8px] ${m.contribution > 0 ? 'text-zinc-300' : 'text-zinc-600'}`}>{m.displayName}</span>
                    </div>
                    <span className={`text-[8px] ${m.contribution > 0 ? colors.secondary : 'text-zinc-700'}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                      {m.contribution > 0 ? m.contribution.toLocaleString() : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : guildQuest && guildQuest.status === 'proposed' ? (
          <div className="text-center py-2">
            <p className="text-xs text-amber-400 mb-1">⏳ Pending Approval</p>
            <p className="text-[8px] text-zinc-500">{guildQuest.name}</p>
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-[9px] text-zinc-500 mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>NO ACTIVE QUEST</p>
            <p className="text-[8px] text-zinc-600 mb-3">Rally your party to hit a shared goal this week.</p>
            <button
              onClick={() => setShowQuestModal(true)}
              disabled={!groupId}
              className={`text-[10px] px-3 py-2 border ${colors.border} bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-50`}
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              ▸ RALLY YOUR PARTY
            </button>
            {!groupId && <p className="text-[7px] text-zinc-600 mt-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>JOIN A PARTY FIRST</p>}
          </div>
        )}
      </PixelBox>

      {/* Duels */}
      <PixelBox className="p-4">
        <p className={`text-[10px] ${colors.headerText} mb-3 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          ⚡ DUELS
        </p>
        {activeDuels.length > 0 ? (
          <div className="space-y-2">
            {activeDuels.map((duel) => {
              const isChallenger = duel.challenger_id === userId;
              const myScore = isChallenger ? (duel.challenger_score || 0) : (duel.opponent_score || 0);
              const theirScore = isChallenger ? (duel.opponent_score || 0) : (duel.challenger_score || 0);
              const timeLeft = Math.max(0, duel.end_at - Date.now() / 1000);
              const daysLeft = Math.floor(timeLeft / 86400);
              const isPending = duel.status === 'PENDING';
              return (
                <div key={duel.id} className={`border ${colors.border} bg-zinc-800/50 p-2`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] text-zinc-300" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                      {isPending ? '⏳ AWAITING OPPONENT' : `YOU ${myScore} - ${theirScore} THEM`}
                    </span>
                    <span className="text-[10px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>{daysLeft}D LEFT</span>
                  </div>
                  {!isPending && (
                    <div className="h-1.5 bg-zinc-900 flex">
                      <div className={`${colors.barFill} transition-all`} style={{ width: `${myScore + theirScore > 0 ? (myScore / (myScore + theirScore)) * 100 : 50}%` }} />
                      <div className="bg-zinc-600 flex-1" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <p className="text-[9px] text-zinc-500 text-center" style={{ fontFamily: "var(--font-pixel), monospace" }}>NO ACTIVE DUELS</p>
            <p className="text-[8px] text-zinc-600 text-center py-2">Challenge a friend to a 1v1 XP race.</p>
          </>
        )}
        <div className="flex justify-center mt-3">
          <button
            onClick={() => setShowDuelModal(true)}
            className={`text-[10px] px-3 py-2 border ${colors.border} bg-zinc-800 text-zinc-400 hover:text-white transition-colors`}
            style={{ fontFamily: "var(--font-pixel), monospace" }}
          >
            ▸ CHALLENGE SOMEONE
          </button>
        </div>
      </PixelBox>

      {/* Invite to Party */}
      <PixelBox className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-[10px] ${colors.headerText} uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>⚔ PARTY</p>
            <p className="text-[8px] text-zinc-500 mt-1">Grow your adventuring company</p>
          </div>
          <button
            onClick={async () => {
              const code = groupId || '';
              const url = `https://refactorathletics.com/join/${code}`;
              const themeMessages: Record<string, string> = {
                samurai: 'The dojo has an opening. Join the company.',
                dragon: 'The hoard grows. We need another flame.',
                viking: 'The longship has room. Join the raid.',
                dinosaur: 'The pack hunts better in numbers.',
                athlete: 'Join my training group on Refactor Athletics.',
              };
              const text = `${themeMessages[currentTheme] || themeMessages['athlete']} ${url}`;
              try {
                if (navigator.share) await navigator.share({ text, url });
                else await navigator.clipboard.writeText(text);
              } catch {}
            }}
            className={`text-[9px] px-3 py-2 border ${colors.primary} bg-zinc-800 ${colors.secondary} hover:bg-zinc-700 transition-colors`}
            style={{ fontFamily: "var(--font-pixel), monospace" }}
          >
            ▸ INVITE
          </button>
        </div>
      </PixelBox>

      </div>{/* end secondary */}

      {/* Guild Quest Modal */}
      {groupId && (
        <GuildQuestModal
          isOpen={showQuestModal}
          groupId={groupId}
          userId={userId}
          onClose={() => setShowQuestModal(false)}
          onCreated={async () => {
            const result = await getUserGuildQuest(userId);
            setGuildQuest(result?.quest || null);
          }}
        />
      )}

      {/* Campaign Modal */}
      <CampaignModal
        isOpen={showCampaignModal}
        userId={userId}
        groupId={groupId}
        onClose={() => setShowCampaignModal(false)}
        onCreated={async () => {
          setShowCampaignModal(false);
          const campaignData = await fetch('/api/challenge-75').then(r => r.json());
          const active = (campaignData?.challenges || []).find((c: any) => c.status === 'active');
          setCampaign(active || null);
        }}
      />

      {/* Duel Modal */}
      <DuelModal
        isOpen={showDuelModal}
        userId={userId}
        onClose={() => setShowDuelModal(false)}
        onCreated={async () => {
          const { getActiveDuels } = await import('@/services/duelApi');
          setActiveDuels(await getActiveDuels(userId));
        }}
      />
    </ScreenWrapper>
  );
}

function BountyHistory({ userId, colors }: { userId: string; colors: any }) {
  const [history, setHistory] = useState<{ week: string; completed: number; total: number }[]>([]);
  const [show, setShow] = useState(false);

  const loadHistory = async () => {
    if (history.length > 0) { setShow(!show); return; }
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    const eightWeeksAgo = new Date(Date.now() - 56 * 86400000).toLocaleDateString('en-CA');
    const { data } = await supabase.from('bounties').select('week_start, completed').eq('user_id', userId).gte('week_start', eightWeeksAgo).order('week_start', { ascending: false });
    const weeks: Record<string, { completed: number; total: number }> = {};
    for (const b of data || []) {
      if (!weeks[b.week_start]) weeks[b.week_start] = { completed: 0, total: 0 };
      weeks[b.week_start].total++;
      if (b.completed) weeks[b.week_start].completed++;
    }
    setHistory(Object.entries(weeks).map(([week, d]) => ({ week, ...d })));
    setShow(true);
  };

  const sweepCount = history.filter(w => w.completed === w.total && w.total > 0).length;

  return (
    <div className="mb-4">
      <button onClick={loadHistory} className="text-[8px] text-zinc-600 hover:text-zinc-400 w-full text-center" style={{ fontFamily: "var(--font-pixel), monospace" }}>
        {show ? '▾ HIDE HISTORY' : '▸ BOUNTY HISTORY'}
      </button>
      {show && history.length > 0 && (
        <div className="mt-2 space-y-1 px-2">
          {sweepCount > 0 && <p className="text-[8px] text-amber-400 text-center mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>Swept {sweepCount}/{history.length} weeks</p>}
          {history.map(w => (
            <div key={w.week} className="flex items-center justify-between text-[8px] text-zinc-500">
              <span>{w.week}</span>
              <span>{w.completed === w.total && w.total > 0 ? '⚔ SWEEP' : `${w.completed}/${w.total}`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
