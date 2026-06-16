"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme, getThemeIdentity } from '@/data/v2themes';
import { signout } from '@/app/login/actions';

function DailyXpPill({ colors }: { colors: any }) {
  const [xp, setXp] = useState(0);
  useEffect(() => {
    (async () => {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const today = new Date().toLocaleDateString('en-CA');
      const { data } = await supabase.from('workouts').select('xp').eq('date', today);
      const total = (data || []).reduce((s: number, w: any) => s + (w.xp || 0), 0);
      setXp(total);
    })();
  }, []);
  if (xp === 0) return null;
  return <span className={`text-[9px] ${colors.secondary}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>⚡{xp}</span>;
}

export default function TopHeader() {
    const pathname = usePathname();
    const { currentTheme } = useTheme();
    const colors = getV2Theme(currentTheme);

    // Hide on login/onboarding pages
    if (pathname?.startsWith('/login') || pathname?.startsWith('/signup')) return null;

    const { emoji: themeEmoji } = getThemeIdentity(currentTheme);

    return (
        <>
            {/* Mobile HUD — themed banner */}
            <header className={`md:hidden flex items-center justify-between px-3 py-2 border-b-2 ${colors.border} bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-zinc-900`}>
                <div className="flex items-center gap-2">
                    <span className={`text-base`}>{themeEmoji}</span>
                    <span className={`text-[9px] ${colors.secondary} tracking-widest font-bold`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                        REFACTOR ATHLETICS
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <DailyXpPill colors={colors} />
                    <Link href="/profile">
                        <div className={`w-7 h-7 border-2 ${colors.primary} bg-zinc-900 flex items-center justify-center`}>
                            <span className="text-[10px]">👤</span>
                        </div>
                    </Link>
                </div>
            </header>

            {/* Desktop nav */}
            <header className={`hidden md:flex items-center justify-between px-4 py-3 border-b-2 ${colors.border}`}>
                <nav className="flex items-center gap-1">
                    {[
                        { href: '/', label: 'POWER' },
                        { href: '/arena', label: 'ARENA' },
                        { href: '/train', label: 'TRAIN' },
                    ].map((tab) => (
                        <Link key={tab.href} href={tab.href}>
                            <button className={`px-3 py-2 text-[9px] uppercase tracking-wider transition-colors ${
                                (tab.href === '/' && (pathname === '/' || pathname === '/dashboard')) || (tab.href !== '/' && pathname?.startsWith(tab.href))
                                    ? `${colors.secondary} ${colors.navActive}`
                                    : 'text-zinc-600 hover:text-zinc-300'
                            }`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                                {tab.label}
                            </button>
                        </Link>
                    ))}
                </nav>
                <h1 className={`text-[10px] ${colors.secondary} tracking-widest`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    REFACTOR ATHLETICS
                </h1>
                <div className="flex items-center gap-2">
                    <Link href="/profile">
                        <button className={`text-[8px] text-zinc-600 hover:text-zinc-300 transition-colors px-2 py-1 border ${colors.border}`} style={{ fontFamily: "var(--font-pixel), monospace" }}>
                            PROFILE
                        </button>
                    </Link>
                    <form action={signout}>
                        <button className="text-[8px] text-zinc-600 hover:text-red-400 transition-colors px-2 py-1 border border-zinc-800" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                            OUT
                        </button>
                    </form>
                </div>
            </header>
        </>
    );
}
