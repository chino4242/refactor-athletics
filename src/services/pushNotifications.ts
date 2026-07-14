/**
 * Push Notification Service for Capacitor (iOS/Android)
 *
 * Handles registration, permission requests, token management,
 * and notification event listeners for native platforms.
 */

let listenerHandles: Array<{ remove: () => Promise<void> }> = [];
let currentUserId: string | null = null;

/**
 * Sends the device push token to the backend for storage.
 */
async function sendTokenToServer(token: string): Promise<void> {
  try {
    // Detect platform
    const { Capacitor } = await import('@capacitor/core');
    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';

    const response = await fetch('/api/notifications/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, push_token: token }),
    });

    if (!response.ok) {
      console.error('[Push] Failed to register token with server:', response.status);
    }
  } catch (error) {
    console.error('[Push] Error sending token to server:', error);
  }
}

/**
 * Handles deep link navigation when a notification is tapped.
 */
function handleNotificationTap(data: Record<string, unknown>): void {
  const url = data?.url as string | undefined;
  if (url && typeof window !== 'undefined') {
    window.location.href = url;
  }
}

/**
 * Registers the device for push notifications.
 *
 * - Checks if running on a native platform (iOS/Android)
 * - Requests notification permissions
 * - If granted, registers with APNs/FCM
 * - Sets up listeners for token delivery, errors, and notification events
 * - Sends the token to the backend
 *
 * @param userId - The authenticated user's ID
 * @returns Whether permission was granted
 */
export async function registerForPushNotifications(userId: string): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');

    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    const { PushNotifications } = await import('@capacitor/push-notifications');

    currentUserId = userId;

    // Request permission
    const permResult = await PushNotifications.requestPermissions();

    if (permResult.receive !== 'granted') {
      console.log('[Push] Permission not granted:', permResult.receive);
      return false;
    }

    // Remove any existing listeners before adding new ones
    await removeAllListeners();

    // Listen for successful registration (token delivery)
    const registrationHandle = await PushNotifications.addListener(
      'registration',
      async (token) => {
        console.log('[Push] Registration token received:', token.value.substring(0, 10) + '...');
        await sendTokenToServer(token.value);
      }
    );
    listenerHandles.push(registrationHandle);

    // Listen for registration errors
    const errorHandle = await PushNotifications.addListener(
      'registrationError',
      (error) => {
        console.error('[Push] Registration error:', error);
      }
    );
    listenerHandles.push(errorHandle);

    // Listen for notifications received while app is in foreground
    const foregroundHandle = await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        console.log('[Push] Notification received in foreground:', {
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });
      }
    );
    listenerHandles.push(foregroundHandle);

    // Listen for notification tap (user opened notification)
    const tapHandle = await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        console.log('[Push] Notification tapped:', action.notification.data);
        handleNotificationTap(action.notification.data);
      }
    );
    listenerHandles.push(tapHandle);

    // Register with APNs/FCM
    await PushNotifications.register();

    return true;
  } catch (error) {
    console.error('[Push] Error during registration:', error);
    return false;
  }
}

/**
 * Initializes push notification listeners for returning users.
 *
 * Sets up the token refresh listener (re-registers when token changes)
 * and the notification tap listener for deep linking.
 *
 * Should be called once on app mount for users who have already granted permission.
 */
export async function initPushListeners(): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');

    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Check if we already have permission
    const permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive !== 'granted') {
      return;
    }

    // Listen for token refresh (re-register when token changes)
    const registrationHandle = await PushNotifications.addListener(
      'registration',
      async (token) => {
        console.log('[Push] Token refreshed:', token.value.substring(0, 10) + '...');
        await sendTokenToServer(token.value);
      }
    );
    listenerHandles.push(registrationHandle);

    // Listen for registration errors on refresh
    const errorHandle = await PushNotifications.addListener(
      'registrationError',
      (error) => {
        console.error('[Push] Token refresh error:', error);
      }
    );
    listenerHandles.push(errorHandle);

    // Listen for foreground notifications
    const foregroundHandle = await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        console.log('[Push] Notification received in foreground:', {
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });
      }
    );
    listenerHandles.push(foregroundHandle);

    // Listen for notification taps (deep linking)
    const tapHandle = await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        console.log('[Push] Notification tapped:', action.notification.data);
        handleNotificationTap(action.notification.data);
      }
    );
    listenerHandles.push(tapHandle);

    // Re-register to get the current token (triggers 'registration' event)
    await PushNotifications.register();
  } catch (error) {
    console.error('[Push] Error initializing listeners:', error);
  }
}

/**
 * Removes all active push notification listeners.
 * Call on component unmount or when cleaning up.
 */
async function removeAllListeners(): Promise<void> {
  for (const handle of listenerHandles) {
    try {
      await handle.remove();
    } catch {
      // Listener may already be removed
    }
  }
  listenerHandles = [];
}

/**
 * Removes all push notification listeners and resets state.
 * Should be called on logout or app teardown.
 */
export function removePushListeners(): void {
  removeAllListeners();
  currentUserId = null;
}
