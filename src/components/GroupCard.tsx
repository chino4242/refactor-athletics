'use client';

import { useState, useEffect } from 'react';
import { Users, Copy, LogOut, Plus, Check, Trophy, Crown, History, ChevronDown, ChevronUp } from 'lucide-react';
import { useExperienceMode } from '@/context/ExperienceModeContext';
import {
    createGroup, joinGroup, leaveGroup, getUserGroups,
    getGroupChallengeProgress, finalizeGroupChallenge, isChallengeExpired,
    getGroupChallengeHistory, type GroupWithDetails,
} from '@/services/groupApi';
import { CHALLENGE_PRESETS, BADGE_TYPES, type ChallengeMetric, type Group, type GroupMember, type GroupChallenge } from '@/types';
import GroupChallengeModal from './GroupChallengeModal';

interface GroupCardProps {
    userId: string;
}

export default function GroupCard({ userId }: GroupCardProps) {
    const { isClassic } = useExperienceMode();
    const [groups, setGroups] = useState<GroupWithDetails[]>([]);
    const [progressMap, setProgressMap] = useState<Record<string, Record<string, number>>>({});
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showJoin, setShowJoin] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [inviteInput, setInviteInput] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [challengeModalGroupId, setChallengeModalGroupId] = useState<string | null>(null);
    const [historyGroupId, setHistoryGroupId] = useState<string | null>(null);
    const [challengeHistory, setChallengeHistory] = useState<GroupChallenge[]>([]);

    const partyLabel = isClassic ? 'Group' : 'Party';
    const challengeLabel = isClassic ? 'Group Challenge' : 'Party Quest';

    useEffect(() => { loadGroups(); }, [userId]);

    const loadGroups = async () => {
        try {
            const data = await getUserGroups(userId);
            setGroups(data);

            // Load progress for active challenges & handle lazy completion
            const progMap: Record<string, Record<string, number>> = {};
            for (const g of data) {
                if (g.activeChallenge) {
                    const progress = await getGroupChallengeProgress(g.group.id, g.activeChallenge);
                    progMap[g.group.id] = progress;

                    // Lazy finalize if expired
                    if (isChallengeExpired(g.activeChallenge) && !g.activeChallenge.completed) {
                        await finalizeGroupChallenge(g.activeChallenge, progress);
                        // Reload to get updated state
                        const refreshed = await getUserGroups(userId);
                        setGroups(refreshed);
                        return;
                    }
                }
            }
            setProgressMap(progMap);
        } catch (e) {
            console.error('Failed to load groups:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!groupName.trim()) return;
        setError('');
        try {
            await createGroup(userId, groupName.trim());
            setShowCreate(false);
            setGroupName('');
            await loadGroups();
        } catch (e: any) { setError(e.message); }
    };

    const handleJoin = async () => {
        if (!inviteInput.trim()) return;
        setError('');
        try {
            await joinGroup(userId, inviteInput.trim());
            setShowJoin(false);
            setInviteInput('');
            await loadGroups();
        } catch (e: any) { setError(e.message); }
    };

    const handleLeave = async (groupId: string) => {
        if (!confirm(`Leave this ${partyLabel.toLowerCase()}?`)) return;
        await leaveGroup(userId, groupId);
        await loadGroups();
    };

    const copyInvite = (group: Group) => {
        const url = `${window.location.origin}/join/${group.invite_code}`;
        navigator.clipboard.writeText(url);
        setCopiedId(group.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const loadHistory = async (groupId: string) => {
        if (historyGroupId === groupId) { setHistoryGroupId(null); return; }
        const history = await getGroupChallengeHistory(groupId);
        setChallengeHistory(history);
        setHistoryGroupId(groupId);
    };

    if (loading) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-1/3 mb-3" />
                <div className="h-20 bg-zinc-800 rounded" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Existing groups */}
            {groups.map(({ group, members, activeChallenge }) => {
                const progress = progressMap[group.id] || {};
                const totalProgress = Object.values(progress).reduce((sum, v) => sum + v, 0);
                const preset = activeChallenge ? CHALLENGE_PRESETS[activeChallenge.metric as ChallengeMetric] : null;
                const progressPercent = activeChallenge ? Math.min(100, (totalProgress / activeChallenge.target) * 100) : 0;
                const isExpired = activeChallenge ? isChallengeExpired(activeChallenge) : false;
                const isCompleted = activeChallenge?.completed;

                // Find MVP
                let mvpUserId: string | null = null;
                let mvpValue = 0;
                Object.entries(progress).forEach(([uid, val]) => {
                    if (val > mvpValue) { mvpValue = val; mvpUserId = uid; }
                });
                const mvpName = members.find(m => m.user_id === mvpUserId)?.display_name;

                return (
                    <div key={group.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
                        {/* Group Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users size={18} className="text-orange-500" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{group.name}</h3>
                                <span className="text-xs text-zinc-600">{members.length} {members.length === 1 ? 'member' : 'members'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => copyInvite(group)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition px-2 py-1 bg-zinc-800 rounded">
                                    {copiedId === group.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                    {copiedId === group.id ? 'Copied!' : 'Invite Link'}
                                </button>
                                <button onClick={() => handleLeave(group.id)} className="text-zinc-600 hover:text-red-400 transition p-1">
                                    <LogOut size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Members */}
                        <div className="flex flex-wrap gap-2">
                            {members.map(m => (
                                <div key={m.user_id} className="flex items-center gap-1.5 bg-zinc-800 rounded-full px-2.5 py-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-xs text-zinc-300">{m.display_name}</span>
                                    {m.user_id === group.leader_id && <span className="text-[10px] text-orange-500">★</span>}
                                </div>
                            ))}
                        </div>

                        {/* Active Challenge */}
                        {activeChallenge && preset ? (
                            <div className={`rounded-lg p-3 space-y-2 ${isCompleted ? 'bg-emerald-900/20 border border-emerald-800/30' : 'bg-zinc-800/50'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span>{preset.emoji}</span>
                                        <span className="text-xs font-bold text-white uppercase">{activeChallenge.name || challengeLabel}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isCompleted && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">✓ COMPLETE</span>}
                                        {isExpired && !isCompleted && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">FAILED</span>}
                                        <span className="text-[10px] text-zinc-600">{activeChallenge.start_date} → {activeChallenge.end_date}</span>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="w-full bg-zinc-700 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-600 to-red-600'}`}
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-400">{totalProgress.toLocaleString()} / {activeChallenge.target.toLocaleString()} {preset.unit}</span>
                                    <span className={progressPercent >= 100 ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>{Math.round(progressPercent)}%</span>
                                </div>

                                {/* Per-member breakdown */}
                                <div className="space-y-1 pt-1">
                                    {members
                                        .sort((a, b) => (progress[b.user_id] || 0) - (progress[a.user_id] || 0))
                                        .map(m => {
                                            const memberVal = progress[m.user_id] || 0;
                                            const isMvp = m.user_id === mvpUserId && mvpValue > 0;
                                            return (
                                                <div key={m.user_id} className="flex justify-between text-[10px]">
                                                    <span className="text-zinc-500 flex items-center gap-1">
                                                        {isMvp && <Crown size={10} className="text-yellow-500" />}
                                                        {m.display_name}
                                                    </span>
                                                    <span className="text-zinc-300 font-bold">{memberVal.toLocaleString()} {preset.unit}</span>
                                                </div>
                                            );
                                        })}
                                </div>

                                {/* MVP callout on completed challenges */}
                                {isCompleted && mvpName && (
                                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-700/50">
                                        <Crown size={14} className="text-yellow-500" />
                                        <span className="text-xs text-yellow-400 font-bold">MVP: {mvpName}</span>
                                        <span className="text-[10px] text-zinc-600">({mvpValue.toLocaleString()} {preset.unit})</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => setChallengeModalGroupId(group.id)}
                                className="w-full py-2.5 bg-zinc-800 text-zinc-400 text-xs font-bold uppercase rounded-lg hover:bg-zinc-700 hover:text-white transition flex items-center justify-center gap-1"
                            >
                                <Plus size={14} />
                                Set {challengeLabel}
                            </button>
                        )}

                        {/* History toggle */}
                        <button
                            onClick={() => loadHistory(group.id)}
                            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition uppercase tracking-wider font-bold"
                        >
                            <History size={12} />
                            Past Challenges
                            {historyGroupId === group.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        {historyGroupId === group.id && (
                            <div className="space-y-2">
                                {challengeHistory.length === 0 ? (
                                    <p className="text-[10px] text-zinc-600 text-center py-2">No completed challenges yet</p>
                                ) : challengeHistory.map(ch => {
                                    const p = CHALLENGE_PRESETS[ch.metric as ChallengeMetric];
                                    const total = ch.results ? Object.values(ch.results).reduce((s: number, v: any) => s + (v as number), 0) : 0;
                                    const mvp = ch.mvp_user_id ? members.find(m => m.user_id === ch.mvp_user_id)?.display_name : null;
                                    return (
                                        <div key={ch.id} className="bg-zinc-800/30 rounded-lg p-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">{p?.emoji || '🏆'}</span>
                                                <div>
                                                    <div className="text-[10px] text-zinc-300 font-bold">{ch.name || `${p?.label} Challenge`}</div>
                                                    <div className="text-[10px] text-zinc-600">{ch.start_date} → {ch.end_date}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-[10px] font-bold ${ch.completed ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {ch.completed ? '✓ Complete' : '✗ Failed'}
                                                </div>
                                                <div className="text-[10px] text-zinc-600">{total.toLocaleString()} / {ch.target.toLocaleString()}</div>
                                                {mvp && <div className="text-[10px] text-yellow-500 flex items-center gap-0.5 justify-end"><Crown size={8} /> {mvp}</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Join / Create section */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Users size={18} className="text-orange-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        {groups.length === 0
                            ? (isClassic ? 'Join a Group' : 'Join Your Party')
                            : (isClassic ? 'Join Another Group' : 'Join Another Party')}
                    </h3>
                </div>

                {!showCreate && !showJoin && (
                    <div className="text-center py-4 space-y-3">
                        <p className="text-sm text-zinc-400">
                            {isClassic
                                ? 'Team up with friends for challenges and accountability.'
                                : 'Form a party to take on quests together and earn bonus XP.'}
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setShowCreate(true)} className="flex-1 py-2.5 px-4 bg-orange-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-orange-500 transition">
                                Create {partyLabel}
                            </button>
                            <button onClick={() => setShowJoin(true)} className="flex-1 py-2.5 px-4 bg-zinc-800 text-white text-xs font-bold uppercase rounded-lg hover:bg-zinc-700 transition">
                                Join {partyLabel}
                            </button>
                        </div>
                    </div>
                )}

                {showCreate && (
                    <div className="space-y-3">
                        <input
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                            placeholder={isClassic ? 'Group name...' : 'Party name...'}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        />
                        {error && <p className="text-xs text-red-400">{error}</p>}
                        <div className="flex gap-2">
                            <button onClick={handleCreate} className="flex-1 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-500">Create</button>
                            <button onClick={() => { setShowCreate(false); setError(''); }} className="flex-1 py-2 bg-zinc-800 text-white text-xs font-bold rounded-lg hover:bg-zinc-700">Cancel</button>
                        </div>
                    </div>
                )}

                {showJoin && (
                    <div className="space-y-3">
                        <input
                            value={inviteInput}
                            onChange={e => setInviteInput(e.target.value)}
                            placeholder="Enter invite code..."
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm uppercase tracking-wider"
                            onKeyDown={e => e.key === 'Enter' && handleJoin()}
                        />
                        {error && <p className="text-xs text-red-400">{error}</p>}
                        <div className="flex gap-2">
                            <button onClick={handleJoin} className="flex-1 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-500">Join</button>
                            <button onClick={() => { setShowJoin(false); setError(''); }} className="flex-1 py-2 bg-zinc-800 text-white text-xs font-bold rounded-lg hover:bg-zinc-700">Cancel</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Challenge Creation Modal */}
            {challengeModalGroupId && (
                <GroupChallengeModal
                    isOpen={true}
                    groupId={challengeModalGroupId}
                    userId={userId}
                    onClose={() => setChallengeModalGroupId(null)}
                    onCreated={() => { setChallengeModalGroupId(null); loadGroups(); }}
                />
            )}
        </div>
    );
}
