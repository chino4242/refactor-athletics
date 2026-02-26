"use client";

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Scale } from 'lucide-react';

interface BodyCompSummaryProps {
    profile: {
        bodyweight?: number;
        body_composition_goals?: Record<string, string>;
    } | null;
    bodyCompHistory: Array<{
        date: string;
        weight?: number;
        waist?: number;
        arms?: number;
        chest?: number;
        legs?: number;
        shoulders?: number;
        [key: string]: string | number | undefined;
    }>;
    refactorScore: {
        score: number;
        status: string;
        color: string;
    };
    onOpenModal: () => void;
}

export default function BodyCompSummary({ profile, bodyCompHistory, refactorScore, onOpenModal }: BodyCompSummaryProps) {
    const metrics = useMemo(() => {
        if (bodyCompHistory.length === 0) return [];

        const latest = bodyCompHistory[bodyCompHistory.length - 1];
        const previous = bodyCompHistory.length > 1 ? bodyCompHistory[bodyCompHistory.length - 2] : null;
        const goals = profile?.body_composition_goals || {};

        const metricList = [
            { id: 'weight', label: 'Weight', unit: 'lbs' },
            { id: 'waist', label: 'Waist', unit: '"' },
            { id: 'arms', label: 'Arms', unit: '"' },
        ];

        return metricList.map(m => {
            const current = latest[m.id];
            const prev = previous?.[m.id];
            const goal = goals[m.id] || 'Maintain';
            
            let delta = 0;
            let isOnTrack = true;
            
            if (current !== undefined && prev !== undefined) {
                delta = Number(current) - Number(prev);
                
                if (goal.toLowerCase() === 'shrink') {
                    isOnTrack = delta <= 0;
                } else if (goal.toLowerCase() === 'grow') {
                    isOnTrack = delta >= 0;
                } else {
                    isOnTrack = Math.abs(delta) < 0.5;
                }
            }

            return {
                ...m,
                current: current !== undefined ? Number(current) : null,
                delta,
                goal,
                isOnTrack
            };
        }).filter(m => m.current !== null);
    }, [bodyCompHistory, profile]);

    const getGoalIcon = (goal: string) => {
        if (goal.toLowerCase() === 'shrink') return <TrendingDown size={12} className="text-blue-400" />;
        if (goal.toLowerCase() === 'grow') return <TrendingUp size={12} className="text-emerald-400" />;
        return <Minus size={12} className="text-zinc-500" />;
    };

    if (bodyCompHistory.length === 0) {
        return (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-emerald-500/10 p-2 rounded-lg">
                        <Scale className="text-emerald-500" size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-white">Body Composition</h3>
                        <p className="text-xs text-zinc-500">Track your evolution</p>
                    </div>
                </div>
                
                <div className="text-center py-8 text-zinc-500">
                    <p className="text-sm mb-4">No measurements logged yet</p>
                    <button
                        onClick={onOpenModal}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                    >
                        Log First Measurement
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6 hover:border-zinc-700 transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/10 p-2 rounded-lg">
                        <Scale className="text-emerald-500" size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-white">Body Composition</h3>
                        <p className="text-xs text-zinc-500">Track your evolution</p>
                    </div>
                </div>

                {/* Refactor Score Badge */}
                <div className="bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-700">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Score</div>
                    <div className={`text-xl font-black ${refactorScore.color}`}>
                        {refactorScore.score > 0 ? '+' : ''}{refactorScore.score}
                    </div>
                </div>
            </div>

            {/* Status Bar */}
            <div className={`mb-4 p-3 rounded-lg border ${
                refactorScore.score > 0 
                    ? 'bg-emerald-500/10 border-emerald-500/20' 
                    : refactorScore.score < 0 
                    ? 'bg-rose-500/10 border-rose-500/20'
                    : 'bg-zinc-800/50 border-zinc-700'
            }`}>
                <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${refactorScore.color}`}>
                        {refactorScore.status}
                    </span>
                    <div className="w-2/3 bg-zinc-800 rounded-full h-2">
                        <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                                refactorScore.score > 0 ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(Math.abs(refactorScore.score) * 5, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                {metrics.map(metric => (
                    <div key={metric.id} className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                                {metric.label}
                            </span>
                            {getGoalIcon(metric.goal)}
                        </div>
                        <div className="text-lg font-black text-white mb-1">
                            {metric.current}{metric.unit}
                        </div>
                        <div className={`text-[10px] font-mono ${
                            metric.isOnTrack ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                            {metric.delta > 0 ? '+' : ''}{metric.delta.toFixed(1)}{metric.unit} {metric.isOnTrack ? '✓' : '✗'}
                        </div>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={onOpenModal}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                >
                    Log Measurements
                </button>
                <button
                    onClick={onOpenModal}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-zinc-700"
                >
                    View History →
                </button>
            </div>
        </div>
    );
}
