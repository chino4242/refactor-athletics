'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function AuthGuard() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (event === 'SIGNED_OUT') {
          router.push('/login');
        }
      }
    });

    // Also check on visibility change (app returning from background)
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/beta')) {
          router.push('/login');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => { subscription.unsubscribe(); document.removeEventListener('visibilitychange', handleVisibility); };
  }, [router]);

  return null;
}
