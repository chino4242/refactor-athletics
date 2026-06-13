"use client";

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';
import PixelBox, { ScreenWrapper } from './PixelBox';
import { getWeeklyBounties, setDifficulty, type BountyWithProgress, type Difficulty } from '@/services/bountyService';
import { getGroupChallengeWithProgress, getMetricLabel, type GroupChallengeWithProgress } from '@/services/groupChallengeService';
import GuildQuestModal from './GuildQuestModal';
import CampaignModal from './CampaignModal';
import DuelModal from './DuelModal';

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
        <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
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
        <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
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
        <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>DAY {dayNum}/{duration}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-zinc-800 border border-zinc-700 flex">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className={`flex-1 border-r border-zinc-900 ${i < Math.round((dayNum / duration) * 20) ? colors.barFill : ''}`} />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[8px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>🔥 {streak} DAY STREAK</span>
        <span className="text-[8px] text-zinc-400" style={{ fontFamily: "var(--font-pixel), monospace" }}>✓ {checkedCount}/{metrics.length} TODAY</span>
      </div>

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
  const { data } = await supabase.from('group_members').select('group_id').eq('user_id', userId).limit(1).single();
  if (!data) return { quest: null, groupId: null };
  const quest = await getGroupChallengeWithProgress(data.group_id);
  return { quest, groupId: data.group_id };
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
        const active = (campaignData?.challenges || []).find((c: any) => c.status === 'active');
        setCampaign(active || null);

        // Fetch duels
        const { getActiveDuels } = await import('@/services/duelApi');
        setActiveDuels(await getActiveDuels(userId));
      } catch { /* empty state */ }
      setLoading(false);
    })();
  }, [userId]);

  const handleDifficultyChange = async (bountyId: string, difficulty: Difficulty) => {
    await setDifficulty(bountyId, difficulty);
    const data = await getWeeklyBounties(userId);
    setBounties(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <p className="text-zinc-500 text-xs animate-pulse" style={{ fontFamily: "var(--font-pixel), monospace" }}>
          LOADING...
        </p>
      </div>
    );
  }

  return (
    <ScreenWrapper>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className={`text-[10px] ${colors.headerText} uppercase tracking-widest`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          ARENA
        </p>
      </div>

      {/* Active Campaign / CTA */}
      <PixelBox highlight={!!campaign} className="p-4 mb-4">
        <p className={`text-[9px] ${colors.headerText} mb-3 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          ★ CAMPAIGN
        </p>
        {campaign ? (
          <CampaignCard campaign={campaign} userId={userId} colors={colors} onUpdate={setCampaign} />
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-zinc-600 mb-3">No active campaign</p>
            <button
              onClick={() => setShowCampaignModal(true)}
              className={`text-[8px] px-3 py-2 border ${colors.border} bg-zinc-800 text-zinc-400 hover:text-white transition-colors`}
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
          <p className={`text-[9px] ${colors.secondary} uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
            ★ WEEKLY BOUNTIES
          </p>
          <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {bounties.filter(b => b.completed).length}/{bounties.length}
          </span>
        </div>
        <div className="space-y-3">
          {bounties.map((b) => <BountyCard key={b.id} bounty={b} colors={colors} onDifficultyChange={handleDifficultyChange} />)}
        </div>
      </PixelBox>

      {/* Guild Quest */}
      <PixelBox className="p-4 mb-4">
        <p className={`text-[9px] ${colors.headerText} mb-3 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
          ⚔ GUILD QUEST
        </p>
        {guildQuest && guildQuest.status === 'active' ? (
          <>
            <p className="text-xs text-zinc-200 mb-1">{guildQuest.name}</p>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {guildQuest.current.toLocaleString()}/{guildQuest.target.toLocaleString()} {getMetricLabel(guildQuest.metric)}
              </span>
              <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>
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
                {guildQuest.members.slice(0, 3).map((m) => (
                  <div key={m.userId} className="flex items-center justify-between">
                    <span className="text-[8px] text-zinc-400">{m.displayName}</span>
                    <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>{m.contribution.toLocaleString()}</span>
                  </div>
                ))}
                {guildQuest.members.length > 3 && (
                  <p className="text-[8px] text-zinc-600">+{guildQuest.members.length - 3} more</p>
                )}
              </div>
            )}
          </>
        ) : guildQuest && guildQuest.status === 'proposed' ? (
          <div className="text-center py-2">
            <p className="text-xs text-amber-400 mb-1">⏳ Pending Approval</p>
            <p className="text-[8px] text-zinc-500">{guildQuest.name}</p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-zinc-600 mb-3">No active quest</p>
            <button
              onClick={() => setShowQuestModal(true)}
              disabled={!groupId}
              className={`text-[8px] px-3 py-2 border ${colors.border} bg-zinc-800 text-zinc-400 hover:text-white transition-colors disabled:opacity-50`}
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              ▸ RALLY YOUR PARTY
            </button>
            {!groupId && <p className="text-[8px] text-zinc-600 mt-2">Join a party first</p>}
          </div>
        )}
      </PixelBox>

      {/* Duels */}
      <PixelBox className="p-4">
        <p className={`text-[9px] ${colors.headerText} mb-3 uppercase`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
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
                    <span className="text-[7px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>{daysLeft}D LEFT</span>
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
          <p className="text-xs text-zinc-600 text-center py-4">No active duels</p>
        )}
        <div className="flex justify-center mt-3">
          <button
            onClick={() => setShowDuelModal(true)}
            className={`text-[8px] px-3 py-2 border ${colors.border} bg-zinc-800 text-zinc-400 hover:text-white transition-colors`}
            style={{ fontFamily: "var(--font-pixel), monospace" }}
          >
            ▸ CHALLENGE SOMEONE
          </button>
        </div>
      </PixelBox>

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
        onCreated={() => {
          setShowCampaignModal(false);
          // TODO: refresh campaign state
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
