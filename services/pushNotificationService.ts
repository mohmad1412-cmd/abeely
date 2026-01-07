import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { supabase } from "./supabaseClient";

/**
 * Push Notifications Service
 * يدير تسجيل الجهاز وحفظ FCM token في Supabase
 */

let isInitialized = false;
let currentToken: string | null = null;

/**
 * تهيئة Push Notifications
 * يجب استدعاؤها مرة واحدة عند بدء التطبيق
 */
export async function initPushNotifications(): Promise<void> {
  // فقط للأجهزة الحقيقية (ليس المتصفح)
  if (!Capacitor.isNativePlatform()) {
    console.log("📱 Push Notifications: Not a native platform, skipping...");
    return;
  }

  if (isInitialized) {
    console.log("📱 Push Notifications: Already initialized");
    return;
  }

  try {
    // طلب الإذن
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive !== "granted") {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== "granted") {
      console.warn("📱 Push Notifications: Permission not granted");
      return;
    }

    // تسجيل الجهاز
    await PushNotifications.register();

    // استلام التوكن
    PushNotifications.addListener("registration", async (token) => {
      console.log(
        "📱 FCM Token received:",
        token.value.substring(0, 20) + "...",
      );
      currentToken = token.value;

      // حفظ التوكن في Supabase
      await saveTokenToSupabase(token.value);
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("📱 Push registration error:", err);
    });

    // عند استلام إشعار والتطبيق مفتوح
    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log("📱 Push received (foreground):", notification);
        // يمكن إظهار Toast أو تحديث البيانات هنا
      },
    );

    // عند النقر على إشعار
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        console.log("📱 Push action performed:", action);
        // يمكن التنقل لصفحة معينة بناءً على الـ data
        const data = action.notification.data;
        if (data?.requestId) {
          // التنقل للطلب - سيتم تنفيذه من App.tsx
          window.dispatchEvent(
            new CustomEvent("push-navigate", {
              detail: { type: "request", id: data.requestId },
            }),
          );
        }
      },
    );

    isInitialized = true;
    console.log("📱 Push Notifications: Initialized successfully");
  } catch (error) {
    console.error("📱 Push Notifications: Init error:", error);
  }
}

/**
 * حفظ FCM Token في Supabase
 */
async function saveTokenToSupabase(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log("📱 No user logged in, token not saved");
      return;
    }

    const platform = Capacitor.getPlatform(); // 'android' or 'ios'

    // Upsert - إضافة أو تحديث
    const { error } = await supabase
      .from("fcm_tokens")
      .upsert({
        user_id: user.id,
        token: token,
        device_type: platform,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,token",
      });

    if (error) {
      console.error("📱 Error saving FCM token:", error);
    } else {
      console.log("📱 FCM token saved successfully");
    }
  } catch (error) {
    console.error("📱 Error in saveTokenToSupabase:", error);
  }
}

/**
 * تحديث التوكن عند تسجيل الدخول
 * يجب استدعاؤها بعد تسجيل دخول المستخدم
 */
export async function refreshPushToken(): Promise<void> {
  if (currentToken) {
    await saveTokenToSupabase(currentToken);
  }
}

/**
 * حذف التوكن عند تسجيل الخروج
 */
export async function removePushToken(): Promise<void> {
  if (!currentToken) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("fcm_tokens")
        .delete()
        .eq("user_id", user.id)
        .eq("token", currentToken);

      console.log("📱 FCM token removed");
    }
  } catch (error) {
    console.error("📱 Error removing FCM token:", error);
  }
}

/**
 * الحصول على التوكن الحالي
 */
export function getCurrentToken(): string | null {
  return currentToken;
}
