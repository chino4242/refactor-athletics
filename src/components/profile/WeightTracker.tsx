import { type HistoryItem } from '../../services/api';

interface WeightTrackerProps {
    currentWeight: number;
    goalWeight: number;
    weightHistory: HistoryItem[];
}

export default function WeightTracker({ currentWeight, goalWeight, weightHistory }: WeightTrackerProps) {

    // --- SPARKLINE GENERATOR (Weight) ---
    const renderWeightSparkline = () => {
        if (weightHistory.length < 2) return null;

        const values = weightHistory
            .map(h => parseFloat(h.value))
            .filter(v => !isNaN(v) && isFinite(v));

        if (values.length < 2) return null;
        const minW = Math.min(...values);
        const maxW = Math.max(...values);
        const range = maxW - minW || 1;

        const padding = 5; // 5% padding on sides to prevent clipping
        const availableWidth = 100 - (padding * 2);

        const points = values.map((val, i) => {
            const x = padding + (i / (values.length - 1)) * availableWidth;
            const y = 100 - ((val - minW) / range) * 80 - 10;
            return `${x},${y}`;
        }).join(" ");

        return (
            <div className="absolute inset-0 w-full h-full" aria-hidden="true">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full" role="presentation">
                    <polyline fill="none" stroke="#f97316" strokeWidth="2" points={points} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                    {points.split(' ').slice(-1).map((p, i) => {
                        const [cx, cy] = p.split(',');
                        return <circle key={i} cx={cx} cy={cy} r="3" fill="#f97316" stroke="white" strokeWidth="1" vectorEffect="non-scaling-stroke" />;
                    })}
                </svg>
            </div>
        );
    };

    const getProximityColor = (current: number, target: number) => {
        if (!target) return 'text-zinc-500';
        const diff = Math.abs(current - target);
        const percentage = (diff / target) * 100;

        if (percentage <= 2) return 'text-emerald-400'; // Super close
        if (percentage <= 5) return 'text-green-500';    // Close
        if (percentage <= 10) return 'text-yellow-500';  // Getting there
        if (percentage <= 20) return 'text-orange-500';  // Far
        return 'text-red-500';                           // Very far
    };

    const diff = goalWeight > 0 ? Math.abs(currentWeight - goalWeight).toFixed(1) : null;

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between relative shadow-lg overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-2 gap-2 w-full">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest shrink-0">Body Comp</h4>
                {goalWeight > 0 && diff && (
                    <div className="flex flex-col items-end gap-0.5 sm:gap-0 self-end sm:self-auto max-w-full">
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full mb-0 sm:mb-1 break-words text-right max-w-full">Target: {goalWeight}</span>
                        <span className={`text-[10px] font-bold ${getProximityColor(currentWeight, goalWeight)} break-words text-right max-w-full`}>
                            {diff} lbs to go
                        </span>
                    </div>
                )}
            </div>

            <div className="flex-1 hidden sm:flex items-end gap-4">
                <div className="w-full h-16 relative">
                    {renderWeightSparkline()}
                    {weightHistory.length < 2 && (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-700 text-center leading-tight">
                            Log weight twice<br />to see trend
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-2 pt-2 border-t border-zinc-800 flex justify-between items-center">
                <div className="text-xs text-zinc-400">Current</div>
                <div className="font-mono font-bold text-white">{currentWeight} lbs</div>
            </div>
        </div>
    );
}
