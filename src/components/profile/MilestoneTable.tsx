"use client";

import { useEffect, useState } from 'react';
import { getMilestones, type MilestoneResponse } from '../../services/api';

interface Props {
    userId: string;
    age: number;
    sex: string;
    bodyweight: number;
}

export default function MilestoneTable({ userId, age, sex, bodyweight }: Props) {
    const [milestones, setMilestones] = useState<MilestoneResponse[]>([]);
    const [loading, setLoading] = useState(true);

    // Accordion State moved up (Always called)
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    useEffect(() => {
        if (userId) {
            setLoading(true);
            getMilestones(userId, age, sex, bodyweight)
                .then(setMilestones)
                .finally(() => setLoading(false));
        }
    }, [userId, age, sex, bodyweight]);

    // Group by Category (Safe to calculate even if empty)
    const grouped = milestones.reduce((acc, item) => {
        const cat = item.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, MilestoneResponse[]>);

    // Sort categories
    const sortedCategories = Object.keys(grouped).sort();

    // Set default open once data is loaded
    useEffect(() => {
        if (!loading && sortedCategories.length > 0 && expandedCategory === null) {
            setExpandedCategory(sortedCategories[0]);
        }
    }, [loading, sortedCategories, expandedCategory]);

    const toggleCategory = (cat: string) => {
        if (expandedCategory === cat) {
            setExpandedCategory(null); // Collapse if clicking open one
        } else {
            setExpandedCategory(cat); // Expand new one
        }
    };

    if (loading) return <div className="text-zinc-500 animate-pulse font-mono text-sm">LOADING MILESTONES...</div>;

    return (
        <div className="space-y-4 animate-fade-in-up">
            {sortedCategories.map((category) => {
                const isOpen = expandedCategory === category;
                const count = grouped[category]?.length || 0;

                return (
                    <div key={category} className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm transition-all duration-300">
                        <button
                            onClick={() => toggleCategory(category)}
                            className={`w-full bg-zinc-900/50 px-6 py-5 border-b border-zinc-800 flex items-center justify-between gap-4 transition-colors ${isOpen ? 'bg-zinc-800/50' : 'hover:bg-zinc-800/30'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-1 h-5 rounded-full transition-colors ${isOpen ? 'bg-orange-500' : 'bg-zinc-600'}`}></div>
                                <h3 className={`text-sm font-bold uppercase tracking-widest text-left ${isOpen ? 'text-white' : 'text-zinc-400'}`}>
                                    {category} <span className="text-zinc-600 text-[10px] ml-2 font-mono">({count})</span>
                                </h3>
                            </div>

                            {/* Chevron */}
                            <svg
                                className={`w-5 h-5 text-zinc-500 transform transition-transform duration-300 ${isOpen ? 'rotate-180 text-orange-500' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="divide-y divide-zinc-800/50">
                                {grouped[category].map(item => (
                                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 py-4 items-center hover:bg-zinc-800/30 transition-colors">
                                        {/* Left: Exercise Info */}
                                        <div>
                                            <div className="font-bold text-zinc-200">{item.displayName}</div>
                                            <div className="text-xs font-mono mt-1 flex items-center gap-2">
                                                <span className={item.current_level > 0 ? "text-emerald-500" : "text-zinc-600"}>
                                                    {item.current_level > 0 ? `LVL ${item.current_level}` : 'UNRANKED'}
                                                </span>
                                                {item.current_value > 0 && (
                                                    <span className="text-zinc-500 border-l border-zinc-700 pl-2">
                                                        {item.current_value} {item.unit}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right: Next Goal */}
                                        <div className="flex items-center justify-between md:justify-end gap-6 text-right">
                                            {item.next_milestone ? (
                                                <>
                                                    <div>
                                                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">Next Level Target</div>
                                                        <div className="font-black text-orange-500 text-lg md:text-xl tracking-tight leading-none">
                                                            {item.next_milestone}
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-emerald-500 font-bold text-xs uppercase tracking-widest border border-emerald-900/30 bg-emerald-900/10 px-3 py-1 rounded-full">
                                                    Max Level Reached
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    );
}
