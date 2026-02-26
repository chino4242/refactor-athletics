"use client";

import { useMemo, useState } from 'react';
import type { HistoryItem } from '@/types';
import { Check, X } from 'lucide-react';

interface ViceToggleProps {
    virtueId: string; // e.g. "habit_no_alcohol"
    viceId: string;   // e.g. "habit_alcohol"
    label: string;    // e.g. "Alcohol"
    icon: string | React.ReactNode;
    history: HistoryItem[];
    viewDateStartTs: number; // Start of the day timestamp
    onLog: (habitId: string, value: number, label: string) => Promise<void>;
    onDelete: (timestamp: number) => Promise<void>;
    loading?: boolean;
}

export default function ViceToggle({
    virtueId,
    viceId,
    label,
    icon,
    history,
    viewDateStartTs,
    onLog,
    onDelete,
    loading = false
}: ViceToggleProps) {

    const [localLoading, setLocalLoading] = useState(false);

    // Analyze History for Status
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
            // If currently failed, clear failures first
            if (status === 'failed') {
                await Promise.all(viceLogs.map(log => onDelete(log.timestamp)));
            }
            // Log Success
            if (status !== 'success') {
                await onLog(virtueId, 1, `Success: ${label}`);
            }
        } catch (e) {
            console.error("Failed to mark safe", e);
        } finally {
            setLocalLoading(false);
        }
    };

    const handleMarkFail = async () => {
        if (isLoading) return;
        setLocalLoading(true);
        try {
            // If currently success, clear success first
            if (status === 'success') {
                await Promise.all(virtueLogs.map(log => onDelete(log.timestamp)));
            }
            // Log Failure (Value 1)
            // Note: If already failed, we log ANOTHER one (count goes up), or just ignore?
            // For toggle purposes, usually we just want to ensure at least one exists.
            // But if user wants to log "3 drinks", they might click multiple times?
            // Since this is a toggle UI, let's treat it as "Ensure Failed State".
            // But user might want to track count.
            // Let's just log 1.
            await onLog(viceId, 1, label);
        } catch (e) {
            console.error("Failed to mark fail", e);
        } finally {
            setLocalLoading(false);
        }
    };

    // RENDER STATES

    if (status === 'success') {
        return (
            <div className="p-3 rounded-xl border border-emerald-500/50 bg-emerald-900/20 flex flex-col items-center justify-center gap-1 relative overflow-hidden group h-24 transition-all">
                <div className="absolute top-1 right-1 opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleMarkFail(); }}
                        className="p-2 bg-black/40 hover:bg-red-500 rounded-full text-white/70 hover:text-white"
                        title={`Actually, I had ${label}`}
                    >
                        <X size={12} />
                    </button>
                </div>

                <span className="text-2xl">✅</span>
                <div className="text-center">
                    <span className="block text-xs font-black uppercase text-white tracking-tight">{label}</span>
                    <span className="text-[9px] font-bold text-emerald-400">COMPLETE</span>
                </div>
            </div>
        );
    }

    if (status === 'failed') {
        // const count = viceLogs.reduce((acc, l) => acc + (l.raw_value || 1), 0);
        // actually history item uses 'value' or 'raw_value'. type api says value/raw_value.
        // Let's assume just counting items for now if raw_value missing.

        return (
            <div className="p-3 rounded-xl border border-red-500 bg-red-900/40 flex flex-col items-center justify-center gap-1 relative overflow-hidden group h-24 animate-pulse-slow">
                <div className="absolute top-1 right-1 opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleMarkSafe(); }}
                        className="p-2 bg-black/40 hover:bg-emerald-500 rounded-full text-white/70 hover:text-white"
                        title={`Mistake - Revert`}
                    >
                        <Check size={12} />
                    </button>
                </div>

                <span className="text-2xl">{typeof icon === 'string' ? icon : icon}</span>
                <div className="text-center">
                    <span className="block text-xs font-black uppercase text-white tracking-tight">{label}</span>
                    <span className="text-[9px] font-bold text-red-400">FAILED ({viceLogs.length})</span>
                </div>

                {/* Helper to add more (if counting) */}
                <button
                    onClick={(e) => { e.stopPropagation(); handleMarkFail(); }}
                    className="absolute bottom-1 right-1 px-3 py-1 bg-red-500/20 hover:bg-red-500 rounded text-xs font-bold text-red-200 border border-red-500/50 opacity-100 transition-opacity"
                >
                    +1
                </button>
            </div>
        );
    }

    // PENDING STATE
    return (
        <div className="p-1 rounded-xl border border-zinc-700 bg-zinc-900 h-24 flex flex-col gap-1 relative">
            <div className="flex-1 flex items-center justify-center gap-2">
                <span className="text-xl">{typeof icon === 'string' ? icon : icon}</span>
                <span className="text-xs font-bold text-zinc-400 uppercase">{label}?</span>
            </div>

            <div className="grid grid-cols-2 gap-1 h-8">
                <button
                    onClick={handleMarkSafe}
                    disabled={isLoading}
                    className="bg-zinc-800 hover:bg-emerald-500 hover:text-white text-zinc-500 rounded-lg flex items-center justify-center transition-colors border border-zinc-700 hover:border-emerald-400"
                    title={`Success: ${label}`}
                >
                    <Check size={14} />
                </button>
                <button
                    onClick={handleMarkFail}
                    disabled={isLoading}
                    className="bg-zinc-800 hover:bg-red-500 hover:text-white text-zinc-500 rounded-lg flex items-center justify-center transition-colors border border-zinc-700 hover:border-red-400"
                    title={`Failed: ${label}`}
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );

}
