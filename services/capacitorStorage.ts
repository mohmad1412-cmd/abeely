/**
 * Capacitor Storage Adapter for Supabase
 * يوفر تخزين دائم على Android/iOS باستخدام Capacitor Preferences
 * مع fallback إلى localStorage على الويب
 */

import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";

/**
 * واجهة تخزين متوافقة مع Supabase
 * تستخدم SharedPreferences على Android (تخزين دائم)
 */
export const capacitorStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Capacitor.isNativePlatform()) {
      try {
        const { value } = await Preferences.get({ key });
        return value;
      } catch (error) {
        console.error("❌ Capacitor storage getItem error:", error);
        return null;
      }
    }
    return localStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await Preferences.set({ key, value });
      } catch (error) {
        console.error("❌ Capacitor storage setItem error:", error);
      }
    } else {
      localStorage.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await Preferences.remove({ key });
      } catch (error) {
        console.error("❌ Capacitor storage removeItem error:", error);
      }
    } else {
      localStorage.removeItem(key);
    }
  },
};
