"use client";

import { useMemo, useState } from 'react';
import type { HistoryItem } from '@/types';
import { Check, X } from 'lucide-react';

interface ViceToggleProps {
    virtueId: string;
    viceId: string;
    label: string;
    icon: string | React.ReactNode;
    history: HistoryItem[];
    viewDateStartTs: number;
    onLog: (habitId: string, value: number, label: string) => Promise<void>;
    onDelete: (timestamp: number) => Promise<void>;
    loading?: boolean;
}

export default function ViceToggle({
    virtueId, viceId, label, icon, history, viewDateStartTs, onLog, onDelete, loading = false
}: ViceToggleProps) {
    const [localLoading, setLocalLoading] = useState(false);

    const { virtueLogs, viceLogs, status } = useMemo(() => {
        const endTs = viewDateStartTs + 86400;
        const dayLogs = history.filter(h => h.timestamp >= viewDateStartTs && h.timestamp < endTs);
        const vLogs = dayLogs.filter(h => h.exercise_id === virtueId);
        const badLogs = dayLogs.filter(h => h.exercise_id === viceId);
        let currentStatus: 'pending' | 'success' | 'failed' = 'pending';
        if (badLogs.length > 0) currentStatus = 'failed';
        else if (vLogs.length > 0) currentStatus = 'success';
        return { virtueLogs: vLogs, viceLogs: badLogs, status: currentStatus };
    }, [history, viewDateStartTs, virtueId, viceId]);

    const isLoading = loading || localLoading;

    const handleMarkSafe = async () => {
        if (isLoading) return;
        setLocalLoading(true);
        try {
            if (status === 'failed') await Promise.all(viceLogs.map(log => onDelete(log.timestamp)));
            if (status !== 'success') await onLog(virtueId, 1, `Success: ${label}`);
        } finally { setLocalLoading(false); }
    };

    const handleMarkFail = async () => {
        if (isLoading) return;
        setLocalLoading(true);
        try {
            if (status === 'success') await Promise.all(virtueLogs.map(log => onDelete(log.timestamp)));
            await onLog(viceId, 1, label);
        } finally { setLocalLoading(false); }
    };

    const iconEl = typeof icon === 'string' ? <span className="text-sm">{icon}</span> : icon;

    return (
        <div className="p-2 bg-zinc-900/50 rounded-xl border border-zinc-800/50 transition-all duration-300">
            {/* Header — matches HabitCard */}
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    {iconEl}
                    <span className="text-[10px] uppercase font-bold text-zinc-400">{label}</span>
                </div>
                {status === 'success' && <span className="text-[10px] font-bold text-emerald-400">✓</span>}
                {status === 'failed' && <span className="text-[10px] font-bold text-red-400">✗ {viceLogs.length}</span>}
            </div>

            {/* Action buttons */}
            {status === 'pending' && (
                <div className="grid grid-cols-2 gap-1">
                    <button
                        onClick={handleMarkSafe}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-1 py-2 rounded-lg bg-zinc-800 hover:bg-emerald-600 text-zinc-500 hover:text-white text-xs font-bold uppercase transition-all border border-zinc-700 hover:border-emerald-500"
                    >
                        <Check size={12} /> Yes
                    </button>
                    <button
                        onClick={handleMarkFail}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-1 py-2 rounded-lg bg-zinc-800 hover:bg-red-600 text-zinc-500 hover:text-white text-xs font-bold uppercase transition-all border border-zinc-700 hover:border-red-500"
                    >
                        <X size={12} /> No
                    </button>
                </div>
            )}

            {status === 'success' && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400 font-bold">Complete</span>
                    <button
                        onClick={handleMarkFail}
                        className="text-[10px] text-zinc-600 hover:text-red-400 transition px-2 py-1"
                        title="Undo"
                    >
                        Undo
                    </button>
                </div>
            )}

            {status === 'failed' && (
                <div className="flex items-center justify-between">
                    <button
                        onClick={handleMarkFail}
                        className="text-[10px] text-red-400 hover:text-red-300 font-bold px-2 py-1 bg-red-500/10 rounded transition"
                    >
                        +1
                    </button>
                    <button
                        onClick={handleMarkSafe}
                        className="text-[10px] text-zinc-600 hover:text-emerald-400 transition px-2 py-1"
                        title="Revert"
                    >
                        Undo
                    </button>
                </div>
            )}
        </div>
    );
}
