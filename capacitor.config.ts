import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.refactorathletics.app',
  appName: 'Refactor Athletics',
  webDir: 'out',
  server: {
    url: 'https://refactorathletics.com',
    cleartext: false,
    allowNavigation: [
      'refactorathletics.com',
      '*.refactorathletics.com',
      '*.supabase.co',
      'api.prod.whoop.com',
      'accounts.google.com',
    ],
    hostname: 'refactorathletics.com',
  },
  ios: {
    scheme: 'Refactor Athletics',
    contentInset: 'automatic',
  },
  android: {
    backgroundColor: '#09090b',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 3000,
      backgroundColor: '#09090b',
      showSpinner: true,
      spinnerColor: '#f97316',
    },
  },
};

export default config;
