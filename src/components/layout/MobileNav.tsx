"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileNav() {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/track' && pathname === '/') return 'text-orange-500 bg-orange-500/10';
        return pathname === path ? 'text-orange-500 bg-orange-500/10' : 'text-zinc-500 hover:text-zinc-300';
    }

    return (
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 z-50 pb-safe">
            <div className="grid grid-cols-4 h-16">
                <Link href="/track" className={`flex flex-col items-center justify-center gap-1 transition-colors ${isActive('/track')}`}>
                    <span className="text-xl">📝</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Track</span>
                </Link>
                <Link href="/train" className={`flex flex-col items-center justify-center gap-1 transition-colors ${isActive('/train')}`}>
                    <span className="text-xl">🏋️‍♀️</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Train</span>
                </Link>
                <Link href="/arena" className={`flex flex-col items-center justify-center gap-1 transition-colors ${isActive('/arena')}`}>
                    <span className="text-xl">⚔️</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Arena</span>
                </Link>
                <Link href="/profile" className={`flex flex-col items-center justify-center gap-1 transition-colors ${isActive('/profile')}`}>
                    <span className="text-xl">🏆</span>
                    <span className="text-xs font-bold uppercase tracking-wider">Profile</span>
                </Link>
            </div>
        </nav>
    );
}
