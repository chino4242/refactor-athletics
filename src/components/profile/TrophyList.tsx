import { THEMES } from '../../data/themes';
import { type HistoryItem } from '../../services/api';

interface TrophyListProps {
    groupedTrophies: Record<string, any[]>;
    categoryStats: Record<string, number>;
    sex: string;
    currentTheme: string;
    onDelete: (item: HistoryItem) => void;
    getExerciseName: (id: string) => string;
}

export default function TrophyList({
    groupedTrophies,
    categoryStats,
    sex,
    currentTheme,
    onDelete,
    getExerciseName
}: TrophyListProps) {

    // 🟢 HELPER: Now checks sex for female images
    const getRankImage = (level: number) => {
        const theme = THEMES[currentTheme] || THEMES['dragon'];
        const rankKey = `level${level}` as keyof typeof theme.ranks;
        const rankData = theme.ranks[rankKey] || theme.ranks['level0'];

        // If user is female AND specific image exists, use it.
        if (sex === 'female' && rankData.femaleImage) {
            return rankData.femaleImage;
        }

        // Otherwise return default (male) image
        return rankData.image;
    };

    const renderStatCell = (item: HistoryItem, isBest: boolean) => {
        const imageSrc = getRankImage(item.level);

        return (
            <div className={`flex items-center gap-4 ${isBest ? 'justify-end' : 'justify-start'} group/cell`}>
                {!isBest && <img src={imageSrc} alt={`Lvl ${item.level}`} className="w-12 h-12 rounded-md object-cover border border-zinc-700 bg-zinc-800 shrink-0 shadow-sm" />}
                <div className={`flex flex-col justify-center ${isBest ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-bold font-mono ${isBest ? 'text-orange-400' : 'text-white'}`}>{item.value}</span>
                        {!isBest && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                                className="text-zinc-600 hover:text-red-500 transition-all p-2 hover:bg-zinc-800 rounded ml-2"
                                title="Delete entry"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                            </button>
                        )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${item.level >= 3 ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : item.level >= 1 ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-900 text-zinc-600 border-zinc-800'}`}>Level {item.level}</span>
                    <span className="text-[9px] text-zinc-500 mt-1">{item.date}</span>
                </div>
                {isBest && <img src={imageSrc} alt={`Lvl ${item.level}`} className="w-12 h-12 rounded-md object-cover border border-zinc-700 bg-zinc-800 shrink-0 shadow-sm" />}
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {Object.keys(groupedTrophies).length === 0 && (
                <div className="bg-zinc-900/40 border-2 border-dashed border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center animate-fade-in group hover:border-zinc-700 transition">
                    <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4 text-3xl group-hover:scale-110 transition-transform">
                        🏆
                    </div>
                    <h3 className="text-zinc-400 font-bold uppercase tracking-wider mb-2">Trophy Case Empty</h3>
                    <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                        Log your first <span className="text-zinc-300 font-bold">Bench Press</span> or <span className="text-zinc-300 font-bold">Squat</span> to unlock this slot.
                    </p>
                </div>
            )}

            {["Strength", "Strength (5 Rep Max)", "Endurance & Speed", "Power & Capacity", "Mobility", "Other"].map((category) => {
                const items = groupedTrophies[category];
                if (!items || items.length === 0) return null;

                // Handle legacy category merging for display
                const displayCategory = category === "Strength (5 Rep Max)" ? "Strength" : category;

                return (
                    <div key={category} className="bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden">
                        <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
                            <h3 className="font-bold text-zinc-300 flex items-center gap-2 uppercase tracking-wider text-xs">
                                {displayCategory.includes("Strength") && "⚔️"}
                                {displayCategory.includes("Endurance") && "🏃"}
                                {displayCategory.includes("Power") && "⚡"}
                                {displayCategory.includes("Mobility") && "🧘"}
                                {displayCategory}
                            </h3>
                            <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-2 py-1 rounded">
                                Total Score: {categoryStats[category] || 0}
                            </span>
                        </div>
                        <div className="overflow-x-auto w-full max-w-full">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-800 bg-zinc-900/30">
                                        <th className="py-3 pl-6 font-bold w-1/3">Exercise</th>
                                        <th className="py-3 pl-4 font-bold w-1/3">Most Recent</th>
                                        <th className="py-3 pr-6 text-right font-bold w-1/3">Personal Best</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-zinc-800">
                                    {items.map((trophy) => (
                                        <tr key={trophy.exerciseId} className="hover:bg-zinc-800/50 transition group">
                                            <td className="py-3 pl-6 align-middle"><span className="font-bold text-white block text-sm">{getExerciseName(trophy.exerciseId.replace(/^(five_rm_|one_rm_)/, ''))}</span></td>
                                            <td className="py-3 pl-4 align-middle">{renderStatCell(trophy.recent, false)}</td>
                                            <td className="py-3 pr-6 align-middle">{renderStatCell(trophy.best, true)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
