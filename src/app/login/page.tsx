import { login, signup, resetPassword } from './actions';

export default async function LoginPage({
    searchParams,
}: {
    searchParams?: Promise<{ message?: string; redirect?: string }>
}) {
    const params = await searchParams;

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex flex-col items-center mb-6">
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">
                            Refactor <span className="text-orange-500">Athletics</span>
                        </h1>
                        <div className="w-12 h-0.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-full mt-3 mb-4"></div>
                        <p className="text-zinc-400 text-base text-center leading-relaxed max-w-xs">
                            Every rep counts. Track workouts, nutrition, and daily habits — earn ranks based on real performance, and watch your Power Level grow over time.
                        </p>
                    </div>

                    {params?.message && (
                        <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-base font-bold text-center">
                            {params.message}
                        </div>
                    )}

                    <form className="space-y-5 flex flex-col px-2">
                        {params?.redirect && <input type="hidden" name="redirect" value={params.redirect} />}
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Email</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-zinc-500 transition-colors"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-zinc-500 transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="pt-4 space-y-3">
                            <button
                                formAction={login}
                                className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl hover:from-orange-500 hover:to-red-500 transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                            >
                                Log In
                            </button>
                            <button
                                formAction={signup}
                                className="w-full bg-transparent border border-zinc-700 text-zinc-400 font-bold uppercase tracking-widest text-xs py-4 rounded-xl hover:border-zinc-600/50 hover:text-white transition-all"
                            >
                                Begin Your Journey
                            </button>
                        </div>

                        <div className="text-center mt-3">
                            <button
                                formAction={resetPassword}
                                formNoValidate
                                className="text-xs text-zinc-500 hover:text-orange-400 transition-colors"
                            >
                                Forgot password?
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <p className="mt-8 text-xs text-zinc-600 font-mono uppercase tracking-widest">
                Built with Next.js & Supabase
            </p>
        </div>
    );
}
