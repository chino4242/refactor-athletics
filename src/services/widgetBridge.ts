/** Writes daily progress data to native SharedPreferences for the Android widget */

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
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    if (Capacitor.getPlatform() !== 'android') return;

    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: 'widget_data', value: JSON.stringify(data) });
  } catch (e) {
    console.error('[Widget] Failed to write widget data:', e);
  }
}
