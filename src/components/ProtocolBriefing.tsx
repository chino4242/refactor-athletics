import { Clock, Dumbbell, Target } from "lucide-react";

interface ProtocolBriefingProps {
    workout: any[];
    date: string | null;
    onStart: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function ProtocolBriefing({ workout, date, onStart, onCancel }: ProtocolBriefingProps) {

    // Synthesize Stats
    const totalBlocks = workout.length;
    // If first block is "Today's Protocol" list, don't count it as a "work block" for the tally
    const hasSummaryBlock = workout.length > 0 && workout[0].name === "Today's Protocol";
    const workBlocks = hasSummaryBlock ? workout.slice(1) : workout;
    // const totalSets removed
    const totalXP = workBlocks.reduce((acc, b) => acc + (b.xp_value || 0), 0);

    // Estimate Time
    // 1. Sum timer intervals
    let totalSeconds = 0;
    workBlocks.forEach(b => {
        if (b.type === 'timer') {
            b.intervals.forEach((i: any) => {
                if (i.seconds) totalSeconds += i.seconds;
            });
        } else if (b.type === 'checklist_exercise') {
            // Estimate 3 mins per set?
            totalSeconds += (b.sets || 1) * 120; // 2 mins per set
        }
    });
    const estMinutes = Math.round(totalSeconds / 60);


    return (
        <div className="w-full max-w-md mx-auto h-[80vh] md:h-[600px] bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative border border-zinc-800 animate-fade-in-up md:mt-0">

            {/* BACKGROUND GRAPHIC */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            {/* HEADER */}
            <div className="p-8 pb-4 relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-2">
                            Protocol Briefing
                        </h2>
                        <h1 className="text-white text-3xl font-black italic leading-tight mb-2">
                            {date || "TODAY'S PROTOCOL"}
                        </h1>
                    </div>
                    <button
                        onClick={onCancel}
                        className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 p-2 rounded-lg transition"
                    >
                        ✕
                    </button>
                </div>

                {/* HIGH LEVEL STATS */}
                <div className="flex gap-4 mt-6">
                    <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 flex-1">
                        <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1 flex items-center gap-1">
                            <Target size={12} /> XP
                        </div>
                        <div className="text-xl font-black text-white">{totalXP > 0 ? `+${totalXP}` : '---'}</div>
                    </div>
                    <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 flex-1">
                        <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1 flex items-center gap-1">
                            <Clock size={12} /> Time
                        </div>
                        <div className="text-xl font-black text-white">{estMinutes}m</div>
                    </div>
                    <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 flex-1">
                        <div className="text-zinc-500 text-[10px] uppercase font-bold mb-1 flex items-center gap-1">
                            <Dumbbell size={12} /> Blocks
                        </div>
                        <div className="text-xl font-black text-white">{totalBlocks}</div>
                    </div>
                </div>
            </div>

            {/* BLOCK LIST */}
            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4">
                {hasSummaryBlock ? (
                    <div className="space-y-3">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Overview</div>
                        {/* Use the already generated summary from parser if available */}
                        {workout[0].intervals.map((item: any, i: number) => {
                            // Filter out non-content
                            if (item.type === 'header' || !item.text) return null;
                            return (
                                <div key={i} className="flex gap-3 items-start group">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0 group-hover:scale-150 transition-transform"></div>
                                    <div className="text-sm text-zinc-300 font-medium leading-relaxed">
                                        {item.text.replace(/^\d+\.\s*/, '')}
                                        {item.details && item.details.length > 0 && (
                                            <span className="block text-xs text-zinc-600 mt-0.5">{item.details[0]}</span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Sequence of Events</div>
                        {workBlocks.map((block, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 bg-zinc-900 rounded-2xl border border-zinc-800/50 shadow-sm">
                                <div className="flex flex-col items-center justify-center w-12 h-12 bg-black rounded-xl border border-zinc-800 shadow-inner">
                                    <span className="text-xs font-bold text-zinc-600">BLK</span>
                                    <span className="text-lg font-black text-white leading-none">{i + 1}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm uppercase tracking-wide">{block.name}</h3>
                                    <div className="text-xs text-zinc-500 font-mono mt-0.5 flex gap-2">
                                        {block.type === 'timer' && <span className="text-orange-400">Intervals</span>}
                                        {block.type === 'checklist_exercise' && <span className="text-blue-400">{block.sets} Sets</span>}
                                        {block.xp_value > 0 && <span>• {block.xp_value} XP</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ACTION FOOTER */}
            <div className="p-6 bg-zinc-950 border-t border-zinc-900">
                <button
                    onClick={onStart}
                    className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-black italic uppercase tracking-widest rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-xl"
                >
                    Start Protocol
                </button>
            </div>

        </div>
    );
}
