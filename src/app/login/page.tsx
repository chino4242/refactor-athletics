import { login, signup } from './actions';
import Image from 'next/image';

export default function LoginPage({
    searchParams,
}: {
    searchParams?: { message?: string }
}) {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                            <span className="text-3xl">⚔️</span>
                        </div>
                        <h1 className="text-3xl font-black italic text-white tracking-widest uppercase">The Arena</h1>
                        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mt-2">v2.0 Next.js</p>
                    </div>

                    {searchParams?.message && (
                        <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-bold text-center">
                            {searchParams.message}
                        </div>
                    )}

                    <form className="space-y-5 flex flex-col px-2">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Email</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                                placeholder="gladiator@example.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="pt-4 space-y-3">
                            <button
                                formAction={login}
                                className="w-full bg-white text-black font-black uppercase tracking-widest text-sm py-4 rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                            >
                                Enter Arena
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                            <button
                                formAction={signup}
                                className="w-full bg-transparent border border-zinc-700 text-zinc-400 font-bold uppercase tracking-widest text-xs py-4 rounded-xl hover:border-zinc-500 hover:text-white transition-all"
                            >
                                Register New Profile
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <p className="mt-8 text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                Protected by Next.js & Supabase
            </p>
        </div>
    );
}
