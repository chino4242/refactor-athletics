'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

type SubscriptionStatus = 'free' | 'active' | 'trialing' | 'canceled' | 'past_due';

interface SubscriptionState {
  status: SubscriptionStatus;
  isPremium: boolean;
  isLoading: boolean;
  source: 'stripe' | 'apple' | 'google' | null;
  endsAt: string | null;
  isTrialing: boolean;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const [status, setStatus] = useState<SubscriptionStatus>('free');
  const [source, setSource] = useState<'stripe' | 'apple' | 'google' | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data } = await supabase
        .from('users')
        .select('subscription_status, subscription_source, subscription_ends_at')
        .eq('id', user.id)
        .single();

      if (data) {
        setStatus(data.subscription_status || 'free');
        setSource(data.subscription_source || null);
        setEndsAt(data.subscription_ends_at || null);
      }
    } catch (e) {
      console.error('useSubscription error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return {
    status,
    isPremium: status === 'active' || status === 'trialing',
    isLoading,
    source,
    endsAt,
    isTrialing: status === 'trialing',
    refresh: load,
  };
}
