import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kaoyan.workbench',
  appName: '考研工作台',
  webDir: 'dist',
  android: {
    backgroundColor: '#FAF6F0',
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
