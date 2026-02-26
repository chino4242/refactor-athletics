"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signout } from '@/app/login/actions';

export default function TopHeader() {
    const pathname = usePathname();
    const isTrainingPage = pathname === '/' || pathname === '/train';

    return (
        <header className={`flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-zinc-900/50 backdrop-blur-md p-4 rounded-2xl border border-zinc-800 shadow-xl z-50 transition-all ${isTrainingPage ? 'relative' : 'sticky top-4'}`}>

            {/* 1. DESKTOP NAV */}
            <div className="hidden md:flex flex-1 justify-start">
                <nav className="flex items-center gap-1 bg-zinc-950/50 p-1 rounded-xl border border-zinc-800">
                    <Link href="/track">
                        <button className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${pathname === '/track' || pathname === '/' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>
                            Track
                        </button>
                    </Link>
                    <Link href="/train">
                        <button className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${pathname === '/train' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>
                            Train
                        </button>
                    </Link>
                    <Link href="/programs">
                        <button className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${pathname === '/programs' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>
                            Programs
                        </button>
                    </Link>
                    <Link href="/arena">
                        <button className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${pathname === '/arena' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>
                            Arena
                        </button>
                    </Link>
                    <Link href="/profile">
                        <button className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${pathname === '/profile' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}>
                            Profile
                        </button>
                    </Link>
                </nav>
            </div>

            {/* 2. TITLE */}
            <h1 className="text-2xl font-black italic tracking-tighter text-white flex items-center gap-2 shrink-0">
                REFACTOR <span className="text-orange-500">ATHLETICS</span>
            </h1>

            {/* 3. SETTINGS */}
            <div className="hidden md:flex flex-1 justify-end items-center gap-2">
                <Link href="/settings">
                    <button className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-orange-500 transition-colors border border-zinc-800 hover:border-orange-900/30 px-3 py-3 rounded-lg">
                        Settings
                    </button>
                </Link>
                <form action={signout}>
                    <button className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-red-500 transition-colors border border-zinc-800 hover:border-red-900/30 px-3 py-3 rounded-lg">
                        Sign Out
                    </button>
                </form>
            </div>
        </header>
    );
}
