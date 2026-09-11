import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ahmed.supapro',
  appName: 'المحاسب الزراعي',
  webDir: 'dist',
  server: {
    url: 'https://supa-pro-v1.vercel.app',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
      scrollAssist: true,
      style: 'dark',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchFadeOutDuration: 500,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: true,
      spinnerColor: '#10B981',
    },
  },
};

export default config;
