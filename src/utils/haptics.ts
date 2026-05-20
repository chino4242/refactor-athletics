/** Haptic feedback utility — no-op on web, fires on native iOS/Android */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning';

export async function haptic(style: HapticStyle = 'light') {
  try {
    // Use navigator.vibrate as a fallback for Android web
    if ('vibrate' in navigator) {
      const patterns: Record<HapticStyle, number[]> = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 50, 20],
        warning: [30, 50, 30],
      };
      navigator.vibrate(patterns[style]);
    }
  } catch {}
}
