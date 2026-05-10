'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getSubscriptionStatus, initPurchases, type SubscriptionTier } from '@/services/purchases';
import { isNative } from '@/utils/platform';

interface SubscriptionContextType {
  tier: SubscriptionTier;
  isPro: boolean;
  loading: boolean;
  refresh: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType>({ tier: 'free', isPro: false, loading: true, refresh: () => {} });

export function SubscriptionProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const status = await getSubscriptionStatus();
    setTier(status.tier);
    setLoading(false);
  };

  useEffect(() => {
    if (userId && isNative()) {
      initPurchases(userId).then(refresh);
    } else {
      setLoading(false);
    }
  }, [userId]);

  return (
    <SubscriptionContext.Provider value={{ tier, isPro: tier === 'pro', loading, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
