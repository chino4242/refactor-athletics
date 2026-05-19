import type { CatalogItem } from '@/types';
import { createClient } from '@/utils/supabase/client';
import { getLocalDateStr } from '@/utils/date';

export interface RankResponse {
    rank_level: string;
    rank_name: string;
    description: string;
    next_milestone: string | null;
    xp_earned?: number;
}

export const calculateRank = async (
    exerciseId: string,
    value: number,
    age: number,
    sex: string,
    bodyweight: number,
    userId: string
): Promise<RankResponse> => {
    const supabase = createClient();

    const { data: item } = await supabase
        .from('catalog')
        .select('*')
        .eq('id', exerciseId)
        .single();

    if (!item) throw new Error(`Exercise ${exerciseId} not found`);

    const standards = item.standards || {};
    const scoring = standards.scoring || 'higher_is_better';
    const isXBW = standards.unit === 'xBW';

    // 1. Calculate the comparison value based on xBW and special cases
    let finalValue = value;
    if (exerciseId === 'weighted_pullup' || exerciseId === 'five_rm_weighted_pull_up') {
        finalValue = value + bodyweight;
    }
    const comparisonValue = isXBW ? finalValue / bodyweight : finalValue;

    // 2. Find the correct brackets (age + sex)
    const sexKey = (sex || 'male').toLowerCase() === 'female' ? 'female' : 'male';
    const brackets = standards.brackets?.[sexKey] || [];

    const userAge = age > 0 ? age : 25;
    let ageBracket = brackets.find((b: any) => userAge >= b.min && userAge <= b.max);
    if (!ageBracket && brackets.length > 0) {
        if (userAge > 99) ageBracket = brackets[brackets.length - 1];
        else ageBracket = brackets[0];
    }
    const levels = ageBracket ? ageBracket.levels : [];

    // 3. Find current level
    let currentLevelIndex = -1; // -1 means Level 0 (Peasant)
    for (let i = 0; i < levels.length; i++) {
        const threshold = levels[i];
        const passes = scoring === 'lower_is_better' ? comparisonValue <= threshold : comparisonValue >= threshold;
        if (passes) {
            currentLevelIndex = i;
        }
    }

    const rankLevel = `level${currentLevelIndex + 1}`;

    const rankNames = ["Peasant", "Rookie", "Amateur", "Contender", "Pro", "Champion", "Legend"];
    const rankName = rankNames[currentLevelIndex + 1] || "Vikingur";

    let nextMilestone: string | null = null;
    const nextLevelIndex = currentLevelIndex + 1;
    if (nextLevelIndex < levels.length) {
        let rawNextThreshold = levels[nextLevelIndex];
        if (isXBW) {
            rawNextThreshold *= bodyweight;
        }
        rawNextThreshold = Math.round(rawNextThreshold);
        nextMilestone = `${rawNextThreshold} ${isXBW ? 'lbs' : (standards.unit || '')} to reach Level ${nextLevelIndex + 1}`;
    } else {
        nextMilestone = 'MAX RANK ACHIEVED';
    }

    const ts = Math.floor(Date.now() / 1000);
    const dateStr = getLocalDateStr(new Date(ts * 1000));
    const userLevelNum = currentLevelIndex + 1;
    const xpEarned = userLevelNum > 0 ? userLevelNum * 50 : 0;

    await supabase.from('workouts').insert({
        user_id: userId,
        exercise_id: exerciseId,
        timestamp: ts,
        date: dateStr,
        value: `${value}`,
        raw_value: value,
        level: userLevelNum,
        xp: xpEarned,
        rank_name: rankName,
        sets: null
    });

    return {
        rank_level: rankLevel,
        rank_name: rankName,
        description: `Your ${item.name} result: ${value}`,
        next_milestone: nextMilestone,
        xp_earned: xpEarned,
    };
};

export const getPreviewRank = async (
    exerciseId: string,
    currentValue: number,
    age: number,
    sex: string,
    bodyweight: number
): Promise<{ next_milestone: string | null }> => {
    const supabase = createClient();

    const { data: item } = await supabase
        .from('catalog')
        .select('*')
        .eq('id', exerciseId)
        .single();

    if (!item) return { next_milestone: null };

    const standards = item.standards || {};
    const scoring = standards.scoring || 'higher_is_better';
    const isXBW = standards.unit === 'xBW';

    let finalValue = currentValue;
    if (exerciseId === 'weighted_pullup' || exerciseId === 'five_rm_weighted_pull_up') {
        finalValue = currentValue + bodyweight;
    }
    const comparisonValue = isXBW ? finalValue / bodyweight : finalValue;

    const sexKey = (sex || 'male').toLowerCase() === 'female' ? 'female' : 'male';
    const brackets = standards.brackets?.[sexKey] || [];

    const userAge = age > 0 ? age : 25;
    let ageBracket = brackets.find((b: any) => userAge >= b.min && userAge <= b.max);
    if (!ageBracket && brackets.length > 0) {
        if (userAge > 99) ageBracket = brackets[brackets.length - 1];
        else ageBracket = brackets[0];
    }
    const levels = ageBracket ? ageBracket.levels : [];

    let userLevelIndex = -1;
    for (let i = 0; i < levels.length; i++) {
        const threshold = levels[i];
        const passes = scoring === 'lower_is_better' ? comparisonValue <= threshold : comparisonValue >= threshold;
        if (passes) {
            userLevelIndex = i;
        }
    }

    const nextIndex = userLevelIndex + 1;
    if (nextIndex < levels.length) {
        let rawNextThreshold = levels[nextIndex];
        if (isXBW) {
            rawNextThreshold *= bodyweight;
        }
        rawNextThreshold = Math.round(rawNextThreshold);
        return { next_milestone: `${rawNextThreshold} ${isXBW ? 'lbs' : (standards.unit || '')} to reach Level ${nextIndex + 1}` };
    }

    return { next_milestone: null };
};

