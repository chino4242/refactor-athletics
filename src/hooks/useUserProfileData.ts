import { useState, useEffect, useCallback } from 'react';
import {
    getHistory,
    getUserStats,
    getProfile,
    type HistoryItem,
} from '../services/api';
import type { UserStats } from '@/types';

export function useUserProfileData(userId: string) {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [initialGoalWeight, setInitialGoalWeight] = useState<number>(0);

    const loadUserData = useCallback(async () => {
        if (userId) {
            getHistory(userId).then(setHistory);
            getUserStats(userId).then(setStats);

            try {
                const profile = await getProfile(userId);
                if (profile && profile.goal_weight) {
                    setInitialGoalWeight(Number(profile.goal_weight));
                }
            } catch (e) {
                console.error("Failed to load goal weight", e);
            }
        }
    }, [userId]);

    useEffect(() => {
        loadUserData();
    }, [loadUserData]);

    return { history, stats, initialGoalWeight, loadUserData };
}
