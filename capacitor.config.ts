import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.refactorathletics.app',
  appName: 'Refactor Athletics',
  webDir: 'out',
  server: {
    // Use the deployed Vercel URL for server-rendered content
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
      backgroundColor: '#09090b', // zinc-950
      showSpinner: false,
      launchFadeOutDuration: 300,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#09090b',
    },
  },
};

export default config;
