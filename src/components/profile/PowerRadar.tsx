import { type UserStats } from '../../services/api';
import InfoTooltip from '../common/InfoTooltip';

interface PowerRadarProps {
    stats: UserStats | null;
    categoryStats: Record<string, number>;
}

export default function PowerRadar({ stats, categoryStats }: PowerRadarProps) {
    // --- CHART CONFIGS ---
    const radarData = [
        { label: "END", full: "Endurance", value: categoryStats["Endurance & Speed"] || 0 }, // 12 o'clock
        { label: "STR", full: "Strength", value: (categoryStats["Strength"] || categoryStats["Strength (5 Rep Max)"] || 0) }, // 9 o'clock
        { label: "MOB", full: "Mobility", value: categoryStats["Mobility"] || 0 }, // 6 o'clock
        { label: "PWR", full: "Power", value: categoryStats["Power & Capacity"] || 0 }, // 3 o'clock
    ];
    const maxScale = 1500;
    const radarPoints = radarData.map((d, i) => {
        const angle = (Math.PI / 2) + (i * (Math.PI * 2) / 4);
        const r = (Math.min(d.value, maxScale) / maxScale) * 40;
        const x = 50 + r * Math.cos(angle);
        const y = 50 - r * Math.sin(angle);
        return `${x},${y}`;
    }).join(" ");

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-2 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 p-1 rounded-2xl shadow-xl">
                <div className="bg-zinc-900/80 h-full rounded-xl p-6 flex flex-col justify-center relative overflow-hidden backdrop-blur-md">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <h3 className="text-orange-500 font-bold uppercase tracking-widest text-xs mb-2">Aggregate Score</h3>
                            <h2 className="text-4xl md:text-5xl font-black italic text-white tracking-tighter flex items-center">
                                POWER LEVEL
                                <InfoTooltip text="Your Power Level is the sum of your best lifts, cardio, and mobility scores. Raise it by hitting new standards across all categories." size={24} />
                            </h2>
                        </div>
                        <div className="text-right">
                            <span className="block text-7xl md:text-9xl font-black text-white drop-shadow-[0_0_30px_rgba(249,115,22,0.4)] tracking-tighter">
                                {stats?.power_level || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center relative shadow-lg overflow-hidden">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest absolute top-4 left-4">Attribute Balance</h4>
                <svg viewBox="-10 -10 120 120" className="w-full h-40 overflow-hidden mt-2" preserveAspectRatio="xMidYMid meet">
                    <polygon points="50,10 90,50 50,90 10,50" fill="none" stroke="#27272a" strokeWidth="1" />
                    <polygon points="50,30 70,50 50,70 30,50" fill="none" stroke="#27272a" strokeWidth="1" />
                    <line x1="50" y1="10" x2="50" y2="90" stroke="#27272a" strokeWidth="1" />
                    <line x1="10" y1="50" x2="90" y2="50" stroke="#27272a" strokeWidth="1" />
                    <polygon points={radarPoints} fill="rgba(249, 115, 22, 0.4)" stroke="#f97316" strokeWidth="2" strokeLinejoin="round" />
                    <text x="50" y="5" fontSize="6" fill="#a1a1aa" textAnchor="middle" fontWeight="bold">END</text>
                    <text x="95" y="52" fontSize="6" fill="#a1a1aa" textAnchor="start" fontWeight="bold">PWR</text>
                    <text x="50" y="98" fontSize="6" fill="#a1a1aa" textAnchor="middle" fontWeight="bold">MOB</text>
                    <text x="5" y="52" fontSize="6" fill="#a1a1aa" textAnchor="end" fontWeight="bold">STR</text>
                </svg>
            </div>
        </div>
    );
}
