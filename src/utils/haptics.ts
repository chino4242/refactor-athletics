/** Haptic feedback utility — Capacitor native on iOS/Android, vibrate fallback on web */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning';

export async function haptic(style: HapticStyle = 'light') {
  try {
    const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
    if (isNative) {
      try {
        const mod = await (Function('return import("@capacitor/haptics")')() as Promise<any>);
        const { Haptics, ImpactStyle, NotificationType } = mod;
        if (style === 'success') { await Haptics.notification({ type: NotificationType.Success }); return; }
        if (style === 'warning') { await Haptics.notification({ type: NotificationType.Warning }); return; }
        const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
        await Haptics.impact({ style: map[style] || ImpactStyle.Medium });
        return;
      } catch {}
    }
    if ('vibrate' in navigator) {
      const patterns: Record<HapticStyle, number[]> = { light: [10], medium: [20], heavy: [30], success: [10, 50, 20], warning: [30, 50, 30] };
      navigator.vibrate(patterns[style]);
    }
  } catch {}
}
