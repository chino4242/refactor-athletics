import type { DuelResponse, Challenge, ChallengeGoal } from '@/types';
import { createClient } from '@/utils/supabase/client';

export const getDuel = async (duelId: string): Promise<DuelResponse | null> => {
    const supabase = createClient();
    const { data, error } = await supabase.from('duels').select('*').eq('id', duelId).single();
    if (error) {
        console.error("Error fetching duel:", error);
        return null;
    }
    return data;
};

export const getActiveDuels = async (userId: string): Promise<DuelResponse[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('duels')
        .select('*')
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .in('status', ['PENDING', 'ACTIVE'])
        .order('start_at', { ascending: false });

    if (error) {
        console.error("Error fetching active duels:", error);
        return [];
    }
    return data || [];
};

export const getDuelHistory = async (userId: string): Promise<DuelResponse[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('duels')
        .select('*')
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .in('status', ['COMPLETED', 'CANCELLED'])
        .order('end_at', { ascending: false });

    if (error) {
        console.error("Error fetching duel history:", error);
        return [];
    }
    return data || [];
};

export const createChallenge = async (userId: string, durationDays: number): Promise<DuelResponse | null> => {
    const supabase = createClient();
    const startAt = Math.floor(Date.now() / 1000);
    const endAt = startAt + (durationDays * 86400);

    const { data, error } = await supabase.from('duels').insert([{
        challenger_id: userId,
        status: 'PENDING',
        start_at: startAt,
        end_at: endAt
    }]).select().single();

    if (error) {
        console.error("Error creating duel challenge:", error);
        return null;
    }
    return data;
};

export const acceptChallenge = async (duelId: string, opponentId: string): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase.from('duels').update({
        opponent_id: opponentId,
        status: 'ACTIVE'
    }).eq('id', duelId);

    if (error) {
        console.error("Error accepting challenge:", error);
        return false;
    }
    return true;
};

export const finalizeDuel = async (duelId: string, challengerXp: number, opponentXp: number, winnerId: string | null): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase.from('duels').update({
        challenger_xp: challengerXp,
        opponent_xp: opponentXp,
        winner_id: winnerId,
        status: 'COMPLETED'
    }).eq('id', duelId);

    if (error) {
        console.error("Error finalizing duel:", error);
        return false;
    }
    return true;
};

export const cancelDuel = async (duelId: string): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase.from('duels').update({
        status: 'CANCELLED'
    }).eq('id', duelId);

    if (error) {
        console.error("Error canceling duel:", error);
        return false;
    }
    return true;
};

// --- Custom Challenges ---
export const createCustomChallenge = async (challengeData: Partial<Challenge>): Promise<Challenge | null> => {
    const supabase = createClient();
    const { data, error } = await supabase.from('challenges').insert([{
        user_id: challengeData.user_id,
        name: challengeData.name,
        duration_days: challengeData.duration_days,
        start_date: challengeData.start_date,
        goals: challengeData.goals,
        status: 'alive',
        current_streak: 0,
        history: {}
    }]).select().single();

    if (error) {
        console.error("Error creating custom challenge:", error);
        return null;
    }
    return data;
};

export const checkChallengeStatus = async (id: string): Promise<Challenge | null> => {
    const supabase = createClient();
    const { data, error } = await supabase.from('challenges').select('*').eq('id', id).single();
    if (error) {
        console.error("Error checking challenge status:", error);
        return null;
    }
    return data;
};

export const cancelChallenge = async (id: string): Promise<boolean> => {
    const supabase = createClient();
    const { error } = await supabase.from('challenges').update({ status: 'failed' }).eq('id', id);
    if (error) {
        console.error("Error scaling challenge:", error);
        return false;
    }
    return true;
};

