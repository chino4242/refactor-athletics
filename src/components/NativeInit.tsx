'use client';

import { useEffect } from 'react';
import { isNative } from '@/utils/platform';

export default function NativeInit() {
  useEffect(() => {
    if (!isNative()) return;

    (async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#09090b' });
      } catch {}

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({ fadeOutDuration: 300 });
      } catch {}
    })();
  }, []);

  return null;
}
