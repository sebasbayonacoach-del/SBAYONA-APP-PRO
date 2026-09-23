import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.bayona.fit',
  appName: 'BAYONA',
  webDir: 'web-build',
  bundledWebRuntime: false,
  server: { androidScheme: 'https' },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'automatic',
    // Info.plist (lo genera cap add ios / lo editas en Xcode):
    // NSCameraUsageDescription: "Analiza tu postura en tu dispositivo para contar
    //   repeticiones y conducir tu personaje. El vídeo nunca sale de tu móvil."
  },
  plugins: {
    SplashScreen: { launchShowDuration: 800, backgroundColor: '#f7f4ef' },
  },
};

export default config;
