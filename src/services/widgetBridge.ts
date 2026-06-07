/** Writes daily progress data to native SharedPreferences for the Android widget */

const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();

export interface WidgetData {
  streak: number;
  level: number;
  xp: number;
  questsDone: number;
  questsTotal: number;
  steps: number;
  sleep: number;
  protein: number;
}

export async function updateWidget(data: WidgetData): Promise<void> {
  if (!isNative) return;
  try {
    const { Preferences } = await (Function('return import("@capacitor/preferences")')() as Promise<any>);
    await Preferences.set({ key: 'widget_data', value: JSON.stringify(data) });
    // Trigger widget refresh via broadcast
    try {
      const { App } = await (Function('return import("@capacitor/app")')() as Promise<any>);
      // Widget auto-refreshes on next interval; explicit broadcast requires native plugin
    } catch {}
  } catch {}
}
