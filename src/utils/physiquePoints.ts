const METRICS = ['waist', 'arms', 'legs', 'chest', 'shoulders', 'weight',
    'left_arm_muscle', 'right_arm_muscle', 'trunk_muscle', 'left_leg_muscle', 'right_leg_muscle'] as const;

export function calculatePhysiquePoints(
    bodyCompHistory: Array<Record<string, any>>,
    goals: Record<string, string>
): { score: number; status: string; color: string } {
    if (bodyCompHistory.length < 2) return { score: 0, status: 'No Data', color: 'text-zinc-400' };

    let score = 0;

    METRICS.forEach(metric => {
        const goal = goals[metric];
        if (!goal) return;

        // Find earliest and latest non-null values for this metric
        let baseVal: number | null = null;
        let currVal: number | null = null;

        for (let i = 0; i < bodyCompHistory.length; i++) {
            const v = bodyCompHistory[i][metric];
            if (v !== undefined && v !== null) {
                if (baseVal === null) baseVal = Number(v);
                currVal = Number(v);
            }
        }

        if (baseVal === null || currVal === null || baseVal === currVal) return;

        const delta = currVal - baseVal;
        if (goal.toLowerCase() === 'shrink') {
            score -= delta;
        } else if (goal.toLowerCase() === 'grow') {
            score += delta;
        }
    });

    const roundedScore = Math.round(score * 10) / 10;

    let status = 'Maintaining';
    let color = 'text-zinc-400';

    if (roundedScore > 10) { status = '🔥 Crushing It'; color = 'text-emerald-400'; }
    else if (roundedScore > 5) { status = '🎯 On Track'; color = 'text-emerald-400'; }
    else if (roundedScore > 0) { status = '✓ Progressing'; color = 'text-green-400'; }
    else if (roundedScore < -5) { status = '🚨 Off Track'; color = 'text-rose-400'; }
    else if (roundedScore < 0) { status = '⚠️ Slipping'; color = 'text-yellow-400'; }

    return { score: roundedScore, status, color };
}
