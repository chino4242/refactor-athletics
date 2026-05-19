'use client';

import { X, Check, Zap } from 'lucide-react';

interface PaywallProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

const FREE_FEATURES = [
  'Log unlimited workouts',
  'Track macros & habits',
  'Body composition tracking',
  'Rank calculator & Power Level',
  '1 workout program',
];

const PREMIUM_FEATURES = [
  'Everything in Free',
  'RPG mode & themes',
  'Unlimited workout programs',
  'AI screenshot auto-log',
  'Arena (duels & challenges)',
  'Groups & Party system',
  'Consistency heatmaps & streaks',
  'Weekly workout reports',
];

export default function Paywall({ isOpen, onClose, feature }: PaywallProps) {
  if (!isOpen) return null;

  const handleSubscribe = async (plan: 'monthly' | 'annual') => {
    // TODO: Wire to RevenueCat (native) or Stripe (web) based on platform
    // import { Capacitor } from '@capacitor/core';
    // if (Capacitor.isNativePlatform()) { RevenueCat purchase } else { Stripe checkout }
    console.log(`Subscribe: ${plan}`);
  };

  const handleRestore = async () => {
    // TODO: Wire to RevenueCat restorePurchases
    console.log('Restore purchases');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative p-6 pb-4 bg-gradient-to-b from-orange-950/30 to-transparent">
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1">
            <X size={20} />
          </button>
          <div className="text-center">
            <div className="text-4xl mb-2">⚡</div>
            <h2 className="text-xl font-black italic text-white uppercase tracking-tight">Go Elite</h2>
            {feature && (
              <p className="text-sm text-orange-400 mt-1">{feature} is a premium feature</p>
            )}
            <p className="text-xs text-zinc-500 mt-2">Unlock the full RPG experience</p>
          </div>
        </div>

        {/* Plans */}
        <div className="px-6 pb-4 space-y-3">
          <button onClick={() => handleSubscribe('annual')} className="w-full p-4 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl text-left relative overflow-hidden group">
            <div className="absolute top-2 right-2 text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded uppercase">Best Value</div>
            <div className="text-white font-black text-lg">$59.99 / year</div>
            <div className="text-white/70 text-xs">$5.00/mo · Save 37%</div>
            <div className="text-white/50 text-[10px] mt-1">14-day free trial</div>
          </button>

          <button onClick={() => handleSubscribe('monthly')} className="w-full p-4 bg-zinc-800 border border-zinc-700 rounded-xl text-left hover:border-zinc-600 transition">
            <div className="text-white font-black text-lg">$7.99 / month</div>
            <div className="text-zinc-500 text-xs">Cancel anytime</div>
          </button>
        </div>

        {/* Features */}
        <div className="px-6 pb-4">
          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Premium includes</h3>
          <div className="space-y-1.5">
            {PREMIUM_FEATURES.map(f => (
              <div key={f} className="flex items-center gap-2 text-xs text-zinc-300">
                <Check size={12} className="text-orange-500 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Restore + Terms */}
        <div className="px-6 pb-6 space-y-2">
          <button onClick={handleRestore} className="w-full text-center text-[10px] text-zinc-600 hover:text-zinc-400 font-bold uppercase tracking-wider py-2 transition">
            Restore Purchases
          </button>
          <p className="text-[9px] text-zinc-700 text-center">
            Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless canceled at least 24 hours before the end of the current period.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Inline CTA for gated features */
export function UpgradeCTA({ feature }: { feature: string }) {
  return (
    <div className="text-center py-6 px-4">
      <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
        <Zap size={24} className="text-orange-500" />
      </div>
      <p className="text-sm font-bold text-white mb-1">{feature}</p>
      <p className="text-xs text-zinc-500 mb-3">This is a premium feature</p>
    </div>
  );
}
