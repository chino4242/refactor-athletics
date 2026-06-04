'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Hide Capacitor splash screen once app is rendered
    try {
      import('@capacitor/splash-screen').then(({ SplashScreen }) => {
        SplashScreen.hide();
      }).catch(() => {});
    } catch {}

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Service Worker registered
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
