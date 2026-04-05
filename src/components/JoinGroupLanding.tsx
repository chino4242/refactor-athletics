"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { joinGroup } from '@/services/groupApi';
import { createClient } from '@/utils/supabase/client';

interface Props {
    currentUserId: string;
    inviteCode: string;
}

export default function JoinGroupLanding({ currentUserId, inviteCode }: Props) {
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'preview' | 'joining' | 'success' | 'error'>('loading');
    const [groupName, setGroupName] = useState<string | null>(null);
    const [memberCount, setMemberCount] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        loadGroupPreview();
    }, [inviteCode]);

    const loadGroupPreview = async () => {
        try {
            const supabase = createClient();
            const { data: group } = await supabase
                .from('groups')
                .select('id, name')
                .eq('invite_code', inviteCode.toUpperCase())
                .single();

            if (!group) {
                setError('This invite link is invalid or expired.');
                setStatus('error');
                return;
            }

            const { count } = await supabase
                .from('group_members')
                .select('*', { count: 'exact', head: true })
                .eq('group_id', group.id);

            setGroupName(group.name);
            setMemberCount(count || 0);
            setStatus('preview');
        } catch {
            setError('Failed to load group info.');
            setStatus('error');
        }
    };

    const handleJoin = async () => {
        setStatus('joining');
        try {
            await joinGroup(currentUserId, inviteCode);
            setStatus('success');
            setTimeout(() => router.push('/arena'), 1500);
        } catch (e: any) {
            if (e.message === 'Already a member') {
                setStatus('success');
                setTimeout(() => router.push('/arena'), 1000);
            } else {
                setError(e.message || 'Failed to join group.');
                setStatus('error');
            }
        }
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-600" />

                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        {status === 'success' ? (
                            <CheckCircle2 size={40} className="text-emerald-500" />
                        ) : status === 'error' ? (
                            <AlertTriangle size={40} className="text-red-500" />
                        ) : (
                            <Users size={40} className="text-emerald-500" />
                        )}
                    </div>

                    {status === 'loading' && (
                        <>
                            <Loader2 size={24} className="animate-spin text-zinc-500 mx-auto mb-4" />
                            <p className="text-zinc-500">Loading group info...</p>
                        </>
                    )}

                    {status === 'preview' && (
                        <>
                            <h1 className="text-3xl font-black italic text-white uppercase tracking-tight mb-2">
                                You&apos;re Invited!
                            </h1>
                            <p className="text-zinc-400 mb-6">You&apos;ve been invited to join a group.</p>

                            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6">
                                <div className="text-lg font-bold text-white mb-1">{groupName}</div>
                                <div className="text-sm text-zinc-500">{memberCount} {memberCount === 1 ? 'member' : 'members'}</div>
                            </div>

                            <button
                                onClick={handleJoin}
                                className="w-full py-4 bg-emerald-500 text-black font-black uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10"
                            >
                                Join Group
                            </button>
                        </>
                    )}

                    {status === 'joining' && (
                        <>
                            <Loader2 size={24} className="animate-spin text-emerald-500 mx-auto mb-4" />
                            <p className="text-zinc-400">Joining {groupName}...</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <h1 className="text-3xl font-black italic text-white uppercase tracking-tight mb-2">
                                You&apos;re In!
                            </h1>
                            <p className="text-zinc-400">Welcome to {groupName}. Redirecting...</p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <h1 className="text-xl font-bold text-white mb-2">Something Went Wrong</h1>
                            <p className="text-zinc-500 mb-6">{error}</p>
                            <button
                                onClick={() => router.push('/arena')}
                                className="text-emerald-500 hover:text-white underline text-sm"
                            >
                                Go to Arena
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
