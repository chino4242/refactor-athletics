import { type UserStats } from '../../services/api';

interface StatsOverviewProps {
    stats: UserStats | null;
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
    if (!stats) return null;

    // Use values with fallbacks
    const dailyHigh = stats.highest_daily_xp || 0;
    const weeklyHigh = stats.highest_weekly_xp || 0;
    const alcStreak = stats.no_alcohol_streak || 0;
    const viceStreak = stats.no_vice_streak || 0;

    return (
        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-sm animate-fade-in-up">
            <div className="flex items-center gap-2 mb-6 border-b border-zinc-700 pb-4">
                <span className="text-2xl">📚</span>
                <div>
                    <h3 className="text-xl font-black italic text-white tracking-tighter">RECORD BOOK</h3>
                    <p className="text-xs text-zinc-400 font-medium">Lifetime Bests & Winning Streaks</p>
                </div>
            </div>

            <div className="space-y-6">

                {/* 1. STREAKS ROW */}
                <div>
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 pl-1">Active Streaks</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`border rounded-xl p-4 flex flex-col justify-between transition-colors h-24 ${stats.habit_no_alcohol_tracked_today ? 'bg-emerald-900/10 border-emerald-900/30' : 'bg-zinc-900 border-zinc-800'}`}>
                            <div className="flex justify-between items-start">
                                <span className="text-xs uppercase font-bold text-cyan-500">No Alcohol</span>
                                <span className="text-xl">🍺</span>
                            </div>
                            <div className="text-2xl font-black text-white font-mono">{alcStreak} <span className="text-[10px] text-zinc-500 font-bold uppercase">Days</span></div>
                        </div>

                        <div className={`border rounded-xl p-4 flex flex-col justify-between transition-colors h-24 ${stats.habit_no_vice_tracked_today ? 'bg-emerald-900/10 border-emerald-900/30' : 'bg-zinc-900 border-zinc-800'}`}>
                            <div className="flex justify-between items-start">
                                <span className="text-xs uppercase font-bold text-fuchsia-500">No Vice</span>
                                <span className="text-xl">🛡️</span>
                            </div>
                            <div className="text-2xl font-black text-white font-mono">{viceStreak} <span className="text-[10px] text-zinc-500 font-bold uppercase">Days</span></div>
                        </div>
                    </div>
                </div>

                {/* 2. RECORDS ROW */}
                <div>
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 pl-1">Lifetime Records</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-center h-24">
                            <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Max Daily XP</div>
                            <div className="text-2xl font-black text-white font-mono">{dailyHigh.toLocaleString()}</div>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-center h-24">
                            <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Max Weekly XP</div>
                            <div className="text-2xl font-black text-white font-mono">{weeklyHigh.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
