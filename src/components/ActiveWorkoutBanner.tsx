'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

export default function ActiveWorkoutBanner() {
    const [active, setActive] = useState<{ path: string; date: string } | null>(null);
    const pathname = usePathname();
    const router = useRouter();
    const { currentTheme } = useTheme();
    const colors = getV2Theme(currentTheme);

    useEffect(() => {
        const check = () => {
            try {
                if (pathname.includes('/login') || pathname.includes('/register') || pathname.includes('/beta') || pathname.includes('/reset-password')) {
                    setActive(null);
                    return;
                }
                const saved = localStorage.getItem('active_workout');
                if (saved) {
                    const data = JSON.parse(saved);
                    const today = new Date().toLocaleDateString('en-CA');
                    if (data.date && data.date !== today) {
                        localStorage.removeItem('active_workout');
                        setActive(null);
                        return;
                    }
                    if (data.path && !pathname.includes('/train') && !pathname.includes('/workouts')) {
                        setActive(data);
                    } else {
                        setActive(null);
                    }
                } else {
                    setActive(null);
                }
            } catch { setActive(null); }
        };
        check();
        const interval = setInterval(check, 2000);
        return () => clearInterval(interval);
    }, [pathname]);

    if (!active) return null;

    return (
        <div className="fixed bottom-20 left-3 right-3 z-40 flex items-stretch gap-0 animate-in slide-in-from-bottom-4">
            <button
                onClick={() => router.push('/train/active')}
                className={`flex-1 border-2 ${colors.primary} bg-zinc-900 px-4 py-3 flex items-center justify-between transition-colors hover:bg-zinc-800`}
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm animate-pulse">⚔</span>
                    <span className={`text-[9px] ${colors.secondary} uppercase tracking-wider`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                        BATTLE IN PROGRESS
                    </span>
                </div>
                <span className="text-[8px] text-zinc-500" style={{ fontFamily: "var(--font-pixel), monospace" }}>TAP TO RETURN ▸</span>
            </button>
            <button
                onClick={() => { localStorage.removeItem('active_workout'); setActive(null); }}
                className={`border-2 border-l-0 ${colors.border} bg-zinc-900 px-3 flex items-center transition-colors hover:bg-zinc-800`}
                aria-label="Dismiss workout banner"
            >
                <span className="text-zinc-600 text-xs">✕</span>
            </button>
        </div>
    );
}
