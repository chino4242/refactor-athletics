'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

const BETA_CODE = 'BETA2026';

export default function BetaPage() {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (code.toUpperCase().trim() !== BETA_CODE) {
      setError('Invalid beta code');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    // Record beta signup
    await supabase.from('beta_signups').insert({ email, user_id: user.id });

    // Grant beta access + premium for beta testers
    await supabase.from('users').update({ beta_access: true, subscription_status: 'active' }).eq('id', user.id);

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col items-center mb-6">
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">
              Beta <span className="text-orange-500">Access</span>
            </h1>
            <div className="w-12 h-0.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-full mt-3 mb-4" />
            <p className="text-zinc-400 text-sm text-center leading-relaxed max-w-xs">
              You&apos;re early! Refactor Athletics is in closed beta. Enter your access code below to get started. Don&apos;t have one? Reach out to the team.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">
                Beta Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white uppercase tracking-widest focus:outline-none focus:border-orange-500 transition-colors"
                placeholder="ENTER CODE"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white font-black uppercase tracking-widest text-sm py-4 rounded-xl hover:from-orange-500 hover:to-red-500 transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Unlock Beta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
