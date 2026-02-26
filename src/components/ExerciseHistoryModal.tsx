import { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { type HistoryItem, type CatalogItem } from '../services/api';
import { format } from 'date-fns';

interface ExerciseHistoryModalProps {
    exercise: CatalogItem;
    history: HistoryItem[];
    onClose: () => void;
}

export default function ExerciseHistoryModal({ exercise, history, onClose }: ExerciseHistoryModalProps) {

    // 1. Filter history for this exercise only & Sort Oldest -> Newest (for Graph)
    const relevantHistory = useMemo(() => {
        return history
            .filter(h => h.exercise_id === exercise.id)
            .sort((a, b) => a.timestamp - b.timestamp);
    }, [history, exercise.id]);

    // 2. Calculate "Power Tier" (Max Level achieved)
    const maxLevel = useMemo(() => {
        if (relevantHistory.length === 0) return 0;
        return Math.max(...relevantHistory.map(h => h.level || 0));
    }, [relevantHistory]);

    // 3. Prepare Graph Data (Est. 1RM over time)
    // We try to extract a numeric value (Power/1RM) from the history.
    // If 'level' > 0, we can use a proxy, but ideally we calculate Est 1RM from the set data if available.
    const graphData = useMemo(() => {
        return relevantHistory.map(item => {
            // Try to find the best 1RM from the sets
            let best1RM = 0;
            if (item.data && Array.isArray(item.data)) {
                best1RM = Math.max(...item.data.map(s => {
                    if (s.weight > 0 && s.reps > 0) {
                        // Epley Formula: w * (1 + r/30)
                        return s.weight * (1 + s.reps / 30);
                    }
                    return 0;
                }));
            }

            // Fallback: If no set data, maybe use 'raw_value' if it looks numeric? 
            // Or just skip if 0.

            return {
                date: format(new Date(item.timestamp * 1000), 'MMM d'),
                // timestamp used for sorting if needed, but array is already sorted
                value: Math.round(best1RM),
                fullDate: format(new Date(item.timestamp * 1000), 'MMM d, yyyy')
            };
        }).filter(d => d.value > 0); // Only show points with valid data
    }, [relevantHistory]);

    // 4. Prepare Log List (Grouped by Date, Newest -> Oldest)
    const logGroups = useMemo(() => {
        // Re-sort Newest -> Oldest for the list
        const sortedDesc = [...relevantHistory].sort((a, b) => b.timestamp - a.timestamp);

        // Group
        const groups: { [key: string]: HistoryItem[] } = {};
        sortedDesc.forEach(item => {
            // Fix timezone offset for display
            const dateStr = format(new Date(item.timestamp * 1000), 'yyyy-MM-dd');
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(item);
        });

        return groups;
    }, [relevantHistory]);

    // 5. Rust Check (Days since last log)
    const daysSinceLastLog = useMemo(() => {
        if (relevantHistory.length === 0) return 999;
        const lastTimestamp = relevantHistory[relevantHistory.length - 1].timestamp;
        const now = Date.now() / 1000;
        const diff = now - lastTimestamp;
        return Math.floor(diff / (60 * 60 * 24));
    }, [relevantHistory]);

    const isRusty = daysSinceLastLog > 30;

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div
                className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up"
                onClick={e => e.stopPropagation()}
            >

                {/* HEADER */}
                <div className="p-6 border-b border-zinc-800 bg-zinc-950 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition"
                    >
                        ✕
                    </button>

                    <div className="flex justify-between items-start pr-10">
                        <div>
                            <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter mb-1">{exercise.name}</h2>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{exercise.category}</span>
                                {maxLevel > 0 && (
                                    <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                        Level {maxLevel} Power
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* RUST INDICATOR */}
                        {isRusty && (
                            <div className="flex flex-col items-end">
                                <div className="text-3xl">⚠️</div>
                                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Rusty</div>
                                <div className="text-[10px] text-zinc-600">{daysSinceLastLog} Days Inactive</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="overflow-y-auto custom-scrollbar flex-1">

                    {/* GRAPH SECTION */}
                    {graphData.length > 1 && (
                        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Estimated 1RM Trend</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={graphData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#666"
                                            tick={{ fontSize: 10 }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#666"
                                            tick={{ fontSize: 10 }}
                                            tickLine={false}
                                            axisLine={false}
                                            domain={['auto', 'auto']}
                                            hide={false}
                                            width={30}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                                            labelStyle={{ color: '#888', fontSize: '10px', marginBottom: '4px' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#f97316"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
                                            activeDot={{ r: 6, fill: '#fff' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* LOG LIST */}
                    <div className="p-6 space-y-8">
                        {Object.entries(logGroups).map(([date, items]) => (
                            <div key={date} className="relative pl-6 border-l-2 border-zinc-800">
                                {/* Dot on timeline */}
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-zinc-900 border-2 border-zinc-600"></div>

                                <div className="mb-4">
                                    <div className="text-sm font-bold text-white mb-2 ml-1">{format(new Date(date + 'T12:00:00'), 'MMM d, yyyy')}</div>

                                    <div className="space-y-3">
                                        {items.map((item, idx) => (
                                            <div key={idx} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="text-xs text-zinc-500 font-mono">
                                                        {format(new Date(item.timestamp * 1000), 'h:mm a')}
                                                    </div>
                                                    {item.xp && item.xp > 0 && (
                                                        <span className="text-xs font-bold text-emerald-500">+{item.xp} XP</span>
                                                    )}
                                                </div>

                                                {/* SETS DETAIL */}
                                                {item.data ? (
                                                    <div className="space-y-1">
                                                        {item.data.map((set, sIdx) => (
                                                            <div key={sIdx} className="flex items-center justify-between text-sm">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-zinc-600 font-mono w-4">{sIdx + 1}</span>
                                                                    <span className="font-bold text-zinc-300">
                                                                        {set.weight > 0 ? `${set.weight} lbs` :
                                                                            set.distance > 0 ? `${set.distance}m` : '-'}
                                                                    </span>
                                                                    <span className="text-zinc-500">x</span>
                                                                    <span className="font-bold text-white">
                                                                        {set.reps > 0 ? `${set.reps}` :
                                                                            set.duration > 0 ? `${set.duration}m` : '-'}
                                                                    </span>
                                                                </div>

                                                                {/* PR Badge Logic (Simple: if this set's calculated 1RM is reasonably high or just mark the session if item.level was high) */}
                                                                {/* For now, we trust the item level. If item.level > 0, we can show a trophy on the best set? */}
                                                                {/* Let's simplify: Show trophy on session if it was a rank up */}
                                                                {/* {item.level > 0 && sIdx === 0 && <span>🏆</span>} */}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-zinc-400 italic">
                                                        {item.value}
                                                        {item.description && <span className="text-zinc-600"> • {item.description}</span>}
                                                    </div>
                                                )}

                                                {/* SESSION PR BADGE */}
                                                {item.level > 0 && (
                                                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded inline-block">
                                                        <span>🏆</span>
                                                        <span>Level {item.level} Performance</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {Object.keys(logGroups).length === 0 && (
                            <div className="text-center py-12 text-zinc-500">
                                No history found for this exercise.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
