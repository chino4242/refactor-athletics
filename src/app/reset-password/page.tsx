import { updatePassword } from '@/app/login/actions';

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams?: Promise<{ message?: string }>
}) {
    const params = await searchParams;

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex flex-col items-center mb-6">
                        <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                            Reset Password
                        </h1>
                        <div className="w-12 h-0.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-full mt-3 mb-4"></div>
                        <p className="text-zinc-400 text-sm text-center">Enter your new password below.</p>
                    </div>

                    {params?.message && (
                        <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-bold text-center">
                            {params.message}
                        </div>
                    )}

                    <form className="space-y-5 flex flex-col px-2">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">New Password</label>
                            <input
                                name="password"
                                type="password"
                                required
                                minLength={6}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-zinc-500 transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Confirm Password</label>
                            <input
                                name="confirmPassword"
                                type="password"
                                required
                                minLength={6}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-zinc-500 transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                formAction={updatePassword}
                                className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl hover:from-orange-500 hover:to-red-500 transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                            >
                                Update Password
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
