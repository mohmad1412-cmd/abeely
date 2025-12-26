import type { CapacitorConfig } from '@capacitor/cli';

// Live Reload Configuration
// للاستخدام: CAPACITOR_LIVE_RELOAD=true npm run android:run
// أو فعّل Live Reload دائماً بتعليق الشرط أدناه
const liveReload = process.env.CAPACITOR_LIVE_RELOAD === 'true';
const liveReloadIP = process.env.LIVE_RELOAD_IP || '172.20.10.2'; // IP جهازك الحالي

const config: CapacitorConfig = {
  appId: 'com.servicelink.app',
  appName: 'ServiceLink',
  webDir: 'dist',
  // فعّل Live Reload دائماً - احذف الشرط إذا أردت تفعيله دائماً
  ...(liveReload || true  // ← غيّر true إلى false لإيقاف Live Reload
    ? {
        server: {
          // استخدم IP جهازك للجوال، أو 10.0.2.2 للمحاكي
          url: `http://${liveReloadIP}:3005`,
          cleartext: true,
        },
      }
    : {}),
};

export default config;
