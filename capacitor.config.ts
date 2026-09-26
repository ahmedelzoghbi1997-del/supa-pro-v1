import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ahmed.supapro',
  appName: 'المحاسب الزراعي',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_notification",
      iconColor: "#10B981",
    },
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
