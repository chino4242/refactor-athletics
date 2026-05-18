import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.refactorathletics.app',
  appName: 'Refactor Athletics',
  webDir: 'out',
  server: {
    url: 'https://refactorathletics.com',
    cleartext: false,
  },
  ios: {
    scheme: 'Refactor Athletics',
    contentInset: 'automatic',
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
