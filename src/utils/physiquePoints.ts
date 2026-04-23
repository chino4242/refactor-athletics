const TAPE_METRICS = ['weight', 'waist', 'arms', 'legs', 'chest', 'shoulders'] as const;
const SCALE_METRICS = ['weight', 'body_fat_percentage', 'left_arm_muscle', 'right_arm_muscle', 'trunk_muscle', 'left_leg_muscle', 'right_leg_muscle', 'left_arm_fat', 'right_arm_fat', 'trunk_fat', 'left_leg_fat', 'right_leg_fat'] as const;

export function calculatePhysiquePoints(
    bodyCompHistory: Array<Record<string, any>>,
    goals: Record<string, string>,
    mode: 'tape' | 'scale' = 'tape'
): { score: number; status: string; color: string; leanMassDelta?: number; fatPctDelta?: number } {
    if (bodyCompHistory.length < 2) return { score: 0, status: 'No Data', color: 'text-zinc-400' };

    const metrics = mode === 'scale' ? SCALE_METRICS : TAPE_METRICS;
    let score = 0;

    // Track lean mass and fat % deltas for scale mode
    let leanMassDelta: number | undefined;
    let fatPctDelta: number | undefined;

    if (mode === 'scale') {
        const muscleMetrics = ['left_arm_muscle', 'right_arm_muscle', 'trunk_muscle', 'left_leg_muscle', 'right_leg_muscle'] as const;
        let totalMuscleBase = 0, totalMuscleCurr = 0, hasMuscle = false;
        for (const m of muscleMetrics) {
            let base: number | null = null, curr: number | null = null;
            for (const row of bodyCompHistory) {
                const v = row[m];
                if (v !== undefined && v !== null) { if (base === null) base = Number(v); curr = Number(v); }
            }
            if (base !== null && curr !== null) { totalMuscleBase += base; totalMuscleCurr += curr; hasMuscle = true; }
        }
        if (hasMuscle) leanMassDelta = Math.round((totalMuscleCurr - totalMuscleBase) * 10) / 10;

        let fatBase: number | null = null, fatCurr: number | null = null;
        for (const row of bodyCompHistory) {
            const v = row.body_fat_percentage;
            if (v !== undefined && v !== null) { if (fatBase === null) fatBase = Number(v); fatCurr = Number(v); }
        }
        if (fatBase !== null && fatCurr !== null) fatPctDelta = Math.round((fatCurr - fatBase) * 10) / 10;
    }

    metrics.forEach(metric => {
        const goal = goals[metric];
        if (!goal) return;

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

    return { score: roundedScore, status, color, leanMassDelta, fatPctDelta };
}
