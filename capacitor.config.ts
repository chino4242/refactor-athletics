import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.refactorathletics.app',
  appName: 'Refactor Athletics',
  webDir: 'out',
  server: {
    url: 'https://refactorathletics.com',
    cleartext: false,
    allowNavigation: ['refactorathletics.com', 'ohxysyzrwccieioWjwpi.supabase.co'],
    hostname: 'refactorathletics.com',
  },
  ios: {
    scheme: 'Refactor Athletics',
    contentInset: 'automatic',
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#09090b',
      showSpinner: false,
    },
  },
};

export default config;
