import { useMemo } from 'react';
import { type HistoryItem } from '../services/api';

interface TrophyEntry {
    exerciseId: string;
    category: string;
    recent: HistoryItem;
    best: HistoryItem;
}

export function useTrophies(history: HistoryItem[], exercises: any[]) {
    const groupedTrophies = useMemo(() => {
        const map: Record<string, TrophyEntry> = {};

        const validCatalogIds = new Set(
            exercises
                .filter((ex) => ex.standards)
                .map((ex) => ex.id)
        );

        const normalizeId = (id: string) => {
            return id.replace(/^(five_rm_|one_rm_|est_1rm_)/, '');
        };

        history.forEach((item) => {
            const cleanId = normalizeId(item.exercise_id);
            const originalId = item.exercise_id;

            let shouldShow = validCatalogIds.has(cleanId) || validCatalogIds.has(originalId) || Number(item.level) > 0;

            if (item.exercise_id.startsWith('habit_')) shouldShow = false;
            if (item.exercise_id === 'body_weight') shouldShow = false;

            if (!shouldShow) return;

            if (!map[originalId]) {
                let meta = exercises.find(e => e.id === cleanId);
                if (!meta) meta = exercises.find(e => e.id === originalId);
                if (!meta) meta = { displayName: cleanId, category: 'Strength' }; // Default to Strength if unknown

                let displayCategory = meta.category || 'Strength';

                // Map sub-categories to the 4 main Radar buckets
                if (displayCategory.includes("Strength") || displayCategory === "Gymnastics" || displayCategory === "Weightlifting") {
                    displayCategory = "Strength";
                } else if (displayCategory === "Cardio" || displayCategory === "Endurance") {
                    displayCategory = "Endurance & Speed";
                } else if (displayCategory === "Metcon" || displayCategory === "Power") {
                    displayCategory = "Power & Capacity";
                } else if (displayCategory === "Mobility" || displayCategory === "Flexibility") {
                    displayCategory = "Mobility";
                }

                map[originalId] = {
                    exerciseId: originalId,
                    category: displayCategory,
                    recent: item,
                    best: item
                };
            } else {
                if (item.timestamp > map[originalId].recent.timestamp) {
                    map[originalId].recent = item;
                }
            }
            if (item.level > map[originalId].best.level) {
                map[originalId].best = item;
            }
        });

        const groups: Record<string, TrophyEntry[]> = {};
        Object.values(map).forEach(entry => {
            const cat = entry.category;
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(entry);
        });

        return groups;
    }, [history, exercises]);

    const weightHistory = useMemo(() => {
        return history
            .filter(h => h.exercise_id === 'body_weight')
            .sort((a, b) => a.timestamp - b.timestamp);
    }, [history]);

    const categoryStats = useMemo(() => {
        const scores: Record<string, number> = {
            "Strength": 0,
            "Endurance & Speed": 0,
            "Power & Capacity": 0,
            "Mobility": 0
        };
        Object.values(groupedTrophies).flat().forEach(t => {
            const level = t.best?.level || 0;
            if (scores[t.category] !== undefined) {
                scores[t.category] += (level * 100);
            }
        });
        return scores;
    }, [groupedTrophies]);

    return { groupedTrophies, weightHistory, categoryStats };
}
