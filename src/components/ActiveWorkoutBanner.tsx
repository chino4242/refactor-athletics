'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Timer } from 'lucide-react';

export default function ActiveWorkoutBanner() {
    const [active, setActive] = useState<{ path: string; date: string } | null>(null);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const check = () => {
            try {
                const saved = localStorage.getItem('active_workout');
                if (saved) {
                    const data = JSON.parse(saved);
                    // Only show on pages that aren't the workout page itself
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
        <button
            onClick={() => router.push('/train')}
            className="fixed bottom-20 left-4 right-4 z-40 bg-orange-600 hover:bg-orange-500 text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-lg shadow-orange-900/30 transition-colors animate-in slide-in-from-bottom-4"
        >
            <div className="flex items-center gap-2">
                <Timer size={18} className="animate-pulse" />
                <span className="text-sm font-bold">Workout in progress</span>
            </div>
            <span className="text-xs font-medium opacity-80">Tap to return →</span>
        </button>
    );
}
