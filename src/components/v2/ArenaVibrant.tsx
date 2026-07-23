"use client";

/**
 * ArenaVibrant — Vibrant visual mode for the Arena screen.
 *
 * War room with mission boards. Competitive but clean.
 * Sections: Bounties (hero) → Campaign → Duels → Guild Quest → Party
 * RPG celebration moments stay dramatic (duel results, quest completion).
 */

import { useTheme } from '@/context/ThemeContext';

interface Bounty {
  id: string;
  description: string;
  current: number;
  target: number;
  completed: boolean;
  difficulty: string;
  difficultyLocked: boolean;
  xp: number;
}

interface Duel {
  id: string;
  status: string;
  duel_type: string;
  challenger_id: string;
  opponent_id: string;
  challenger_score: number;
  opponent_score: number;
  end_at: number;
}

interface GuildQuest {
  name: string;
  status: string;
  current: number;
  target: number;
  metric: string;
  daysLeft: number;
  members: { userId: string; displayName: string; contribution: number }[];
}

interface Campaign {
  id: string;
  title: string;
  status: string;
  start_date: string;
  duration_days: number;
  challenge_75_metrics: any[];
  challenge_75_days: any[];
  challenge_75_members: any[];
}

interface Props {
  userId: string;
  bounties: Bounty[];
  activeDuels: Duel[];
  guildQuest: GuildQuest | null;
  campaign: Campaign | null;
  groupId: string | null;
  tierIndex: number;
  onDifficultyChange: (id: string, difficulty: string) => void;
  onChallengeSomeone: () => void;
  onRallyParty: () => void;
  onStartCampaign: () => void;
  onInvite: () => void;
  onShowQR: () => void;
}

const VIBRANT_ACCENTS: Record<string, { gradient: string; text: string; glow: string }> = {
  athlete: { gradient: 'from-orange-500 to-amber-400', text: 'text-orange-400', glow: 'shadow-[0_0_30px_rgba(249,115,22,0.08)]' },
  dragon: { gradient: 'from-red-500 to-orange-400', text: 'text-red-400', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.08)]' },
  samurai: { gradient: 'from-[#c084a8] to-[#e8a0b8]', text: 'text-[#e8a0b8]', glow: 'shadow-[0_0_30px_rgba(232,160,184,0.08)]' },
  viking: { gradient: 'from-sky-500 to-cyan-400', text: 'text-sky-300', glow: 'shadow-[0_0_30px_rgba(56,189,248,0.08)]' },
  dinosaur: { gradient: 'from-green-500 to-emerald-400', text: 'text-emerald-400', glow: 'shadow-[0_0_30px_rgba(16,185,129,0.08)]' },
};

const ARENA_NARRATIVES: Record<string, string[]> = {
  samurai: ['The dojo is quiet. Seek a worthy opponent.', 'Steel sharpens steel.', 'Honor is earned in the arena.'],
  dragon: ['The arena smolders. Who dares challenge the flame?', 'Fire meets fire.', 'Let them burn.'],
  viking: ['The clash of shields echoes.', 'Glory awaits the bold.', 'Odin watches.'],
  dinosaur: ['The hunting grounds are open.', 'Only the apex survives.', 'The pack challenges.'],
  athlete: ['The arena is open.', 'Compete. Grow. Repeat.', 'Challenge drives progress.'],
};

export default function ArenaVibrant({
  userId, bounties, activeDuels, guildQuest, campaign, groupId, tierIndex,
  onDifficultyChange, onChallengeSomeone, onRallyParty, onStartCampaign, onInvite, onShowQR,
}: Props) {
  const { currentTheme } = useTheme();
  const accent = VIBRANT_ACCENTS[currentTheme] || VIBRANT_ACCENTS.athlete;
  const narrative = ARENA_NARRATIVES[currentTheme]?.[new Date().getDate() % 3] || ARENA_NARRATIVES.athlete[0];
  const completedBounties = bounties.filter(b => b.completed).length;
  const totalXp = bounties.filter(b => b.completed).reduce((s, b) => s + b.xp, 0);

  return (
    <div className="space-y-4">

      {/* ── HEADER ── */}
      <div className="flex items-start gap-3">
        {currentTheme !== 'athlete' && (
          <img
            src={`/avatars/${currentTheme}/male_t${tierIndex}.png`}
            alt=""
            className="w-10 h-10 shrink-0"
            style={{ imageRendering: 'pixelated' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="flex-1">
          <p className="text-lg font-bold text-white">Arena</p>
          <p className={`text-xs ${accent.text} italic opacity-80`}>{narrative}</p>
        </div>
        <button onClick={onChallengeSomeone} className={`text-xs font-bold px-3 py-1.5 rounded-lg bg-gradient-to-r ${accent.gradient} text-white`}>
          ⚡ Duel
        </button>
      </div>

      {/* ── WEEKLY BOUNTIES (hero section) ── */}
      <div className={`rounded-2xl bg-gradient-to-b from-zinc-800/60 to-zinc-900/70 border border-zinc-700/20 overflow-hidden ${accent.glow}`}>
        {/* Brush stroke accent */}
        <svg viewBox="0 0 400 12" className="w-full h-3" preserveAspectRatio="none">
          <path d="M0 6 Q20 2 60 6 Q100 10 150 5 Q200 2 250 7 Q300 10 350 4 Q380 2 400 6" stroke="url(#brushGrad)" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7" />
          <defs>
            <linearGradient id="brushGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={currentTheme === 'samurai' ? '#c084a8' : currentTheme === 'dragon' ? '#ef4444' : currentTheme === 'viking' ? '#38bdf8' : currentTheme === 'dinosaur' ? '#22c55e' : '#f97316'} />
              <stop offset="100%" stopColor={currentTheme === 'samurai' ? '#e8a0b8' : currentTheme === 'dragon' ? '#f97316' : currentTheme === 'viking' ? '#06b6d4' : currentTheme === 'dinosaur' ? '#10b981' : '#fbbf24'} />
            </linearGradient>
          </defs>
        </svg>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-zinc-200">Weekly Bounties</p>
            <span className={`text-xs font-bold ${completedBounties === bounties.length && bounties.length > 0 ? 'text-emerald-400' : accent.text}`}>
              {completedBounties}/{bounties.length}
              {totalXp > 0 && <span className="text-zinc-500 ml-1.5">+{totalXp} XP</span>}
            </span>
          </div>

          {bounties.length === 0 && (
            <p className="text-xs text-zinc-500 text-center py-2">Bounties refresh weekly</p>
          )}

          {bounties.map(b => {
            const pct = Math.min((b.current / b.target) * 100, 100);
            return (
              <div key={b.id} className={`rounded-xl p-3 border ${b.completed ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-zinc-800/50 bg-zinc-900/40'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${b.completed ? 'text-emerald-300' : 'text-zinc-200'}`}>{b.description}</span>
                  {b.completed ? (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">Done</span>
                  ) : (
                    <span className="text-xs text-zinc-500">+{b.xp} XP</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${b.completed ? 'bg-emerald-500' : `bg-gradient-to-r ${accent.gradient}`}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-zinc-500 w-16 text-right">{b.current}/{b.target}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ACTIVE DUELS ── */}
      {activeDuels.length > 0 && (
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/30 p-4 space-y-3">
          <p className="text-sm font-bold text-zinc-200">Active Duels</p>
          {activeDuels.map(duel => {
            const isChallenger = duel.challenger_id === userId;
            const myScore = isChallenger ? (duel.challenger_score || 0) : (duel.opponent_score || 0);
            const theirScore = isChallenger ? (duel.opponent_score || 0) : (duel.challenger_score || 0);
            const timeLeft = Math.max(0, duel.end_at - Date.now() / 1000);
            const daysLeft = Math.floor(timeLeft / 86400);
            const isPending = duel.status === 'PENDING';
            const winning = myScore > theirScore;
            const totalScore = myScore + theirScore;

            return (
              <div key={duel.id} className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">
                    {isPending ? 'Awaiting opponent' : `${myScore} - ${theirScore}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{duel.duel_type === 'xp' ? '⚡ XP' : duel.duel_type}</span>
                    <span className={`text-xs font-bold ${daysLeft <= 1 ? 'text-amber-400' : 'text-zinc-500'}`}>{daysLeft}d</span>
                  </div>
                </div>
                {!isPending && totalScore > 0 && (
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                    <div className={`${winning ? 'bg-emerald-500' : 'bg-zinc-500'} transition-all rounded-l-full`} style={{ width: `${(myScore / totalScore) * 100}%` }} />
                    <div className="bg-red-500/60 flex-1 rounded-r-full" />
                  </div>
                )}
                {!isPending && (
                  <p className={`text-xs mt-1 ${winning ? 'text-emerald-400' : myScore === theirScore ? 'text-zinc-400' : 'text-red-400'}`}>
                    {winning ? 'You\'re ahead' : myScore === theirScore ? 'Tied' : 'They\'re ahead'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── CAMPAIGN ── */}
      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-zinc-200">Campaign</p>
          {!campaign && (
            <button onClick={onStartCampaign} className={`text-xs font-semibold ${accent.text}`}>
              + New
            </button>
          )}
        </div>
        {campaign ? (
          <div>
            <p className="text-sm text-zinc-300">{campaign.title}</p>
            <p className="text-xs text-zinc-500 mt-1">
              Day {Math.floor((Date.now() - new Date(campaign.start_date + 'T12:00:00').getTime()) / 86400000) + 1} of {campaign.duration_days}
            </p>
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Set daily goals for 30-75 days. All or nothing.</p>
        )}
      </div>

      {/* ── GUILD QUEST ── */}
      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-zinc-200">Guild Quest</p>
          {!guildQuest && groupId && (
            <button onClick={onRallyParty} className={`text-xs font-semibold ${accent.text}`}>
              + Rally
            </button>
          )}
        </div>
        {guildQuest && guildQuest.status === 'active' ? (
          <div className="space-y-2">
            <p className="text-sm text-zinc-300">{guildQuest.name}</p>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{guildQuest.current.toLocaleString()}/{guildQuest.target.toLocaleString()}</span>
              <span>{guildQuest.daysLeft}d left</span>
            </div>
            <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${accent.gradient} transition-all`} style={{ width: `${Math.min((guildQuest.current / guildQuest.target) * 100, 100)}%` }} />
            </div>
            {guildQuest.members.length > 0 && (
              <div className="space-y-1 pt-1">
                {guildQuest.members.map(m => (
                  <div key={m.userId} className="flex items-center justify-between">
                    <span className={`text-xs ${m.contribution > 0 ? 'text-zinc-300' : 'text-zinc-600'}`}>{m.displayName}</span>
                    <span className={`text-xs ${m.contribution > 0 ? accent.text : 'text-zinc-700'}`}>{m.contribution > 0 ? m.contribution.toLocaleString() : '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : !groupId ? (
          <p className="text-xs text-zinc-600">Join a party to unlock guild quests</p>
        ) : (
          <p className="text-xs text-zinc-600">Rally your party around a shared goal</p>
        )}
      </div>

      {/* ── PARTY ── */}
      <div className="rounded-2xl bg-zinc-900/30 border border-zinc-800/20 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-zinc-300">Party</p>
          <div className="flex gap-2">
            <button onClick={onInvite} className={`text-xs font-semibold ${accent.text} bg-zinc-800/80 px-2.5 py-1 rounded-lg`}>Invite</button>
            <button onClick={onShowQR} className="text-xs text-zinc-400 bg-zinc-800/80 px-2 py-1 rounded-lg">QR</button>
          </div>
        </div>
        {!groupId && <p className="text-xs text-zinc-600 mt-2">Invite friends to compete together</p>}
      </div>
    </div>
  );
}
