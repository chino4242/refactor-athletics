"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import { getV2Theme } from '@/data/v2themes';

export default function MobileNav() {
    const pathname = usePathname();
    const { currentTheme } = useTheme();
    const colors = getV2Theme(currentTheme);

    const isActive = (path: string) => {
        if (path === '/' && (pathname === '/' || pathname === '/dashboard')) return true;
        return pathname?.startsWith(path) && path !== '/';
    };

    const tabs = [
        { href: '/', icon: '⚡', label: 'POWER' },
        { href: '/arena', icon: '⚔', label: 'ARENA' },
        { href: '/train', icon: '◆', label: 'TRAIN' },
    ];

    return (
        <nav className={`md:hidden fixed bottom-0 left-0 w-full ${colors.bgTint} border-t-2 ${colors.border} z-50 pb-safe`}>
            <div className="grid grid-cols-3 h-14">
                {tabs.map((tab) => (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                            isActive(tab.href)
                                ? `${colors.secondary} ${colors.navActive}`
                                : 'text-zinc-600 hover:text-zinc-400'
                        }`}
                    >
                        <span className="text-base">{tab.icon}</span>
                        <span
                            className="text-[8px] uppercase tracking-wider"
                            style={{ fontFamily: "var(--font-pixel), monospace" }}
                        >
                            {tab.label}
                        </span>
                    </Link>
                ))}
            </div>
        </nav>
    );
}
