import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c022cebaad0a4ac08901b8709fc22724',
  appName: 'AgroDrone PRO',
  webDir: 'dist',
  server: {
    url: 'https://c022ceba-ad0a-4ac0-8901-b8709fc22724.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
