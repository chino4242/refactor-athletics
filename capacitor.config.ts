import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.refactorathletics.app',
  appName: 'Refactor Athletics',
  webDir: 'out',
  server: {
    url: 'https://www.refactorathletics.com',
    cleartext: false,
    allowNavigation: [
      'refactorathletics.com',
      '*.refactorathletics.com',
      '*.supabase.co',
      'api.prod.whoop.com',
      'accounts.google.com',
    ],
    hostname: 'www.refactorathletics.com',
  },
  ios: {
    scheme: 'Refactor Athletics',
    contentInset: 'automatic',
  },
  android: {
    backgroundColor: '#09090b',
    allowMixedContent: true,
    includePlugins: ['@capacitor/splash-screen'],
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
