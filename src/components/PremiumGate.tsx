'use client';

import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import Paywall, { UpgradeCTA } from './Paywall';

interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
}

export default function PremiumGate({ feature, children }: PremiumGateProps) {
  const { isPremium, isLoading } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (isPremium) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <UpgradeCTA feature={feature} />
      <button
        onClick={() => setShowPaywall(true)}
        className="bg-gradient-to-r from-orange-600 to-red-600 text-white font-black uppercase text-sm px-6 py-3 rounded-xl tracking-wider"
      >
        Upgrade to Elite
      </button>
      <Paywall isOpen={showPaywall} onClose={() => setShowPaywall(false)} feature={feature} />
    </div>
  );
}
