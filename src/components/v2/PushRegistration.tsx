"use client";

import { useEffect } from 'react';

interface Props {
  userId: string;
}

export default function PushRegistration({ userId }: Props) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!(window as any).Capacitor?.isNativePlatform?.()) return;
    if (localStorage.getItem('push_registered')) return;

    (async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== 'granted') return;

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
          // Store token on server for sending pushes later
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();
          await supabase.from('users').update({ push_token: token.value }).eq('id', userId);
          localStorage.setItem('push_registered', 'true');
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error('Push registration failed:', err);
        });
      } catch { /* Plugin not available — web/PWA */ }
    })();
  }, [userId]);

  return null;
}
