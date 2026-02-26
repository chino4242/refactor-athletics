
import { motion } from 'framer-motion';
import InfoTooltip from './common/InfoTooltip';

interface RankCardProps {
  exerciseName: string;
  resultValue: string;
  rankName: string;
  rankDescription: string;
  bodyweight: number;
  calculationDetails: string;
  rankImage: string;
  nextMilestone?: string; // Optional: Only shows if backend provides it
}

export default function RankCard({
  exerciseName,
  resultValue,
  rankName,
  rankDescription,
  rankImage,
  calculationDetails,
  nextMilestone
}: RankCardProps) {

  // Simple helper to get tooltip text based on rank
  const getRankTooltip = (name: string) => {
    if (name.includes("Drake")) return "Drake (Level 2) means you are stronger than 40% of men your age. Lift 15 more lbs to reach Dragon.";
    if (name.includes("Dragon")) return "Dragon (Level 3) is a respectable strength standard. Keep training to reach Ancient status.";
    if (name.includes("Ancient")) return "Ancient (Level 4) represents elite strength. You are in the top 10%.";
    return "Your Rank represents your relative strength compared to age-matched standards.";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm"
    >
      {/* 1. HEADER IMAGE */}
      <div className="relative h-48 bg-zinc-900">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>
        <img
          src={rankImage}
          alt={rankName}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-3 left-4 z-20">
          <h3 className="text-white text-lg font-bold shadow-black drop-shadow-md">{exerciseName}</h3>
        </div>
      </div>

      <div className="p-6">
        {/* 2. RESULT VALUE */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">RESULT</span>
            <div className="text-2xl font-black text-zinc-900">{resultValue}</div>
          </div>
        </div>

        {/* 3. RANK TITLE & DESCRIPTION */}
        <div className="mb-6">
          <h2 className={`text-3xl font-black mb-1 uppercase tracking-tight
            ${rankName.includes('Dragon') || rankName.includes('Arch') ? 'text-orange-600' : 'text-zinc-800'}`}>
            {rankName}
            <InfoTooltip text={getRankTooltip(rankName)} size={20} className="ml-3" />
          </h2>
          <p className="text-sm text-zinc-500 italic font-medium leading-relaxed">"{rankDescription}"</p>
        </div>

        {/* 4. NEXT LEVEL INDICATOR (New) */}
        {nextMilestone && (
          <div className="mb-6 bg-zinc-100 p-3 rounded-lg border border-zinc-200">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Next Level Goal</span>
              <span className="text-xs font-bold text-zinc-700">{nextMilestone}</span>
            </div>
            {/* Visual Progress Bar (Static fill for visual effect) */}
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div className="h-full bg-zinc-400 w-2/3 rounded-full"></div>
            </div>
          </div>
        )}

        {/* 5. CALCULATION FOOTER */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-md">
          <p className="text-xs text-blue-800 font-medium">
            {calculationDetails}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
