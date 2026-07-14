import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getMessaging as getAdminMessaging, type Messaging } from 'firebase-admin/messaging';

let app: App | null = null;

/**
 * Whether the FIREBASE_SERVICE_ACCOUNT env var is present and was parsed successfully.
 */
export let isFirebaseConfigured = false;

function initializeFirebase(): App | null {
  // Already initialized
  if (app) return app;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
    isFirebaseConfigured = true;
    return app;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountJson) {
    console.warn(
      '[Firebase Admin] FIREBASE_SERVICE_ACCOUNT env var is not set. Push notifications will be unavailable.'
    );
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    app = initializeApp({
      credential: cert(serviceAccount),
    });
    isFirebaseConfigured = true;
    return app;
  } catch (error) {
    console.warn(
      '[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/**
 * Returns the Firebase Admin App instance, initializing it if necessary.
 * Returns null if configuration is missing or invalid.
 */
export function getFirebaseAdmin(): App | null {
  return initializeFirebase();
}

/**
 * Returns the Firebase Admin Messaging instance for sending push notifications.
 * Returns null if Firebase is not configured.
 */
export function getMessaging(): Messaging | null {
  const firebaseApp = initializeFirebase();
  if (!firebaseApp) return null;
  return getAdminMessaging(firebaseApp);
}
