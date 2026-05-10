'use client';

import { isNative } from '@/utils/platform';

export async function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'medium') {
  if (isNative()) {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] });
  } else {
    try { navigator.vibrate?.(style === 'heavy' ? 200 : style === 'medium' ? 100 : 50); } catch {}
  }
}

export async function hapticNotification(type: 'success' | 'warning' | 'error' = 'success') {
  if (isNative()) {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    const map = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error };
    await Haptics.notification({ type: map[type] });
  } else {
    try { navigator.vibrate?.(type === 'error' ? [100, 50, 200] : [100, 50, 100]); } catch {}
  }
}

export async function hapticSelection() {
  if (isNative()) {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  }
}
