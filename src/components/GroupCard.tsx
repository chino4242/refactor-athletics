'use client';

import { useState, useEffect } from 'react';
import { Users, Copy, LogOut, Plus, Check } from 'lucide-react';
import { useExperienceMode } from '@/context/ExperienceModeContext';
import { createGroup, joinGroup, leaveGroup, getUserGroup, createChallenge, getGroupChallengeProgress } from '@/services/groupApi';
import { CHALLENGE_PRESETS, type ChallengeMetric, type Group, type GroupMember, type GroupChallenge } from '@/types';

interface GroupCardProps {
    userId: string;
}

export default function GroupCard({ userId }: GroupCardProps) {
    const { isClassic } = useExperienceMode();
    const [group, setGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [challenge, setChallenge] = useState<GroupChallenge | null>(null);
    const [progress, setProgress] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showJoin, setShowJoin] = useState(false);
    const [showNewChallenge, setShowNewChallenge] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [inviteInput, setInviteInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    const partyLabel = isClassic ? 'Group' : 'Party';
    const challengeLabel = isClassic ? 'Weekly Challenge' : 'Party Quest';

    useEffect(() => {
        loadGroup();
    }, [userId]);

    const loadGroup = async () => {
        try {
            const data = await getUserGroup(userId);
            if (data) {
                setGroup(data.group);
                setMembers(data.members);
                setChallenge(data.challenge);
                if (data.challenge) {
                    const prog = await getGroupChallengeProgress(data.group.id);
                    setProgress(prog);
                }
            }
        } catch (e) {
            console.error('Failed to load group:', e);
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
            await loadGroup();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleJoin = async () => {
        if (!inviteInput.trim()) return;
        setError('');
        try {
            await joinGroup(userId, inviteInput.trim());
            setShowJoin(false);
            setInviteInput('');
            await loadGroup();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleLeave = async () => {
        if (!group || !confirm(`Leave this ${partyLabel.toLowerCase()}?`)) return;
        await leaveGroup(userId, group.id);
        setGroup(null);
        setMembers([]);
        setChallenge(null);
        setProgress({});
    };

    const handleCreateChallenge = async (metric: ChallengeMetric) => {
        if (!group) return;
        const preset = CHALLENGE_PRESETS[metric];
        await createChallenge(group.id, metric, preset.defaultTarget);
        setShowNewChallenge(false);
        await loadGroup();
    };

    const copyInvite = () => {
        if (!group) return;
        navigator.clipboard.writeText(group.invite_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-1/3 mb-3" />
                <div className="h-20 bg-zinc-800 rounded" />
            </div>
        );
    }

    // No group — show join/create
    if (!group) {
        return (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Users size={18} className="text-orange-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        {isClassic ? 'Join a Group' : 'Join Your Party'}
                    </h3>
                </div>

                {!showCreate && !showJoin && (
                    <div className="text-center py-4 space-y-3">
                        <p className="text-sm text-zinc-400">
                            {isClassic
                                ? 'Team up with friends for weekly challenges and accountability.'
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
        );
    }

    // Has group — show members + challenge
    const totalProgress = Object.values(progress).reduce((sum, v) => sum + v, 0);
    const preset = challenge ? CHALLENGE_PRESETS[challenge.metric as ChallengeMetric] : null;
    const progressPercent = challenge ? Math.min(100, (totalProgress / challenge.target) * 100) : 0;
    const isLeader = group.leader_id === userId;

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
            {/* Group Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users size={18} className="text-orange-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{group.name}</h3>
                    <span className="text-xs text-zinc-600">{members.length} {members.length === 1 ? 'member' : 'members'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={copyInvite} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition px-2 py-1 bg-zinc-800 rounded">
                        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        {copied ? 'Copied!' : group.invite_code}
                    </button>
                    <button onClick={handleLeave} className="text-zinc-600 hover:text-red-400 transition p-1">
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

            {/* Challenge */}
            {challenge && preset ? (
                <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span>{preset.emoji}</span>
                            <span className="text-xs font-bold text-white uppercase">{challengeLabel}</span>
                        </div>
                        <span className="text-xs text-zinc-500">{preset.label}</span>
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-2.5 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-600 to-red-600'}`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">{totalProgress.toLocaleString()} / {challenge.target.toLocaleString()} {preset.unit}</span>
                        <span className={progressPercent >= 100 ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>{Math.round(progressPercent)}%</span>
                    </div>
                    {/* Per-member breakdown */}
                    <div className="space-y-1 pt-1">
                        {members.map(m => {
                            const memberVal = progress[m.user_id] || 0;
                            return (
                                <div key={m.user_id} className="flex justify-between text-[10px]">
                                    <span className="text-zinc-500">{m.display_name}</span>
                                    <span className="text-zinc-300 font-bold">{memberVal.toLocaleString()} {preset.unit}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : isLeader ? (
                !showNewChallenge ? (
                    <button onClick={() => setShowNewChallenge(true)} className="w-full py-2.5 bg-zinc-800 text-zinc-400 text-xs font-bold uppercase rounded-lg hover:bg-zinc-700 hover:text-white transition flex items-center justify-center gap-1">
                        <Plus size={14} />
                        Set {challengeLabel}
                    </button>
                ) : (
                    <div className="space-y-2">
                        <p className="text-xs text-zinc-400">Choose this week&apos;s challenge:</p>
                        <div className="grid grid-cols-2 gap-2">
                            {(Object.entries(CHALLENGE_PRESETS) as [ChallengeMetric, typeof CHALLENGE_PRESETS[ChallengeMetric]][]).map(([key, preset]) => (
                                <button
                                    key={key}
                                    onClick={() => handleCreateChallenge(key)}
                                    className="p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition text-left"
                                >
                                    <div className="text-xl mb-1">{preset.emoji}</div>
                                    <div className="text-xs font-bold text-white">{preset.label}</div>
                                    <div className="text-[10px] text-zinc-500">{preset.defaultTarget.toLocaleString()} {preset.unit}</div>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowNewChallenge(false)} className="w-full py-2 bg-zinc-800 text-zinc-500 text-xs rounded-lg hover:bg-zinc-700">Cancel</button>
                    </div>
                )
            ) : (
                <div className="text-center py-2">
                    <p className="text-xs text-zinc-500">No challenge set this week. Ask your {isClassic ? 'group leader' : 'party leader'} to pick one!</p>
                </div>
            )}
        </div>
    );
}
