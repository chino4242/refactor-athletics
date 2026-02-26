import { type UserStats } from '../../services/api';
import InfoTooltip from '../common/InfoTooltip';

interface CareerXpBarProps {
    stats: UserStats | null;
    progressGradient?: string;
}

export default function CareerXpBar({ stats, progressGradient = "from-orange-600 to-red-600" }: CareerXpBarProps) {
    // Extract a solid color approximating the gradient for the border (optional, or just use a neutral/white)
    // For now, let's keep the border orange or make it white/neutral to match any theme.
    // Actually, let's just use the gradient for the bar.

    return (
        <div className="bg-black/40 rounded-full p-1 mb-6 border border-zinc-800 flex items-center relative overflow-hidden backdrop-blur-sm max-w-full">
            <div className={`absolute top-0 left-0 h-full bg-gradient-to-r ${progressGradient} opacity-80 transition-all duration-1000`} style={{ width: `${stats?.level_progress_percent || 0}%` }}></div>
            <div className="bg-zinc-100 text-black font-black text-xs h-8 w-8 flex items-center justify-center rounded-full z-10 shadow-lg border-2 border-zinc-400">
                {stats?.player_level || 1}
            </div>
            <div className="flex justify-between w-full px-4 text-xs font-bold z-10 text-white drop-shadow-md">
                <span className="tracking-wider flex items-center">
                    CAREER XP
                    <InfoTooltip text="Earn XP by logging workouts (Volume) or hitting new Rank Milestones (Intensity). Complete Daily Quests for bonus XP." size={14} className="ml-2" />
                </span>
                <span>{stats?.total_career_xp || 0} XP <span className="opacity-70 font-normal">({stats?.xp_to_next_level || 0} to next lvl)</span></span>
            </div>
        </div>
    );
}
