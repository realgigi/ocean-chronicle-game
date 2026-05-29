import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.oceanchronicle.mutationtracking',
  appName: '海洋戰紀',
  webDir: 'dist-pwa',
  server: {
    androidScheme: 'https',
  },
};

export default config;
