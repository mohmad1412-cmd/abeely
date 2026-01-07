import { createClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// التحقق من صحة القيم قبل إنشاء العميل
const isValidUrl = supabaseUrl && supabaseUrl.trim().length > 0;
const isValidKey = supabaseAnonKey && supabaseAnonKey.trim().length > 0;

// Log configuration status (without exposing sensitive data)
console.log("🔧 Supabase Configuration:", {
  hasUrl: !!supabaseUrl,
  urlLength: supabaseUrl?.length || 0,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length || 0,
  isValidUrl,
  isValidKey,
  isConfigured: isValidUrl && isValidKey,
});

if (!isValidUrl || !isValidKey) {
  const errorMsg =
    "Supabase: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY";
  console.error("❌", errorMsg);
  logger.error(errorMsg, undefined, "SupabaseClient");

  // في بيئة الإنتاج، throw error لمنع الأخطاء الصامتة
  if (import.meta.env.PROD) {
    throw new Error(
      "Supabase configuration is missing. Please check your environment variables configuration.",
    );
  } else {
    console.warn(
      "⚠️ Supabase client initialized with empty values. Some features may not work correctly.",
    );
    logger.warn(
      "⚠️ Supabase client initialized with empty values. Some features may not work correctly.",
    );
  }
}

// Singleton pattern to prevent multiple instances
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createClient(
    isValidUrl ? supabaseUrl : "",
    isValidKey ? supabaseAnonKey : "",
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storage: typeof window !== "undefined"
          ? window.localStorage
          : undefined,
        storageKey: "sb-iwfvlrtmbixequntufjr-auth-token",
      },
      realtime: {
        // تحسين إعدادات WebSocket
        params: {
          eventsPerSecond: 10,
        },
        // إعدادات إعادة الاتصال
        heartbeatIntervalMs: 30000,
        reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 30000),
        // إعدادات timeout
        timeout: 20000,
      },
      global: {
        // زيادة timeout للطلبات
        headers: {
          "x-client-info": "servicelink-ai-platform",
        },
        fetch: async (url, options = {}) => {
          // Don't add timeout if there's already a signal (to avoid conflicts)
          if (options.signal) {
            return fetch(url, options);
          }

          // Create timeout controller for better browser compatibility
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
          }, 45000); // 45 second timeout (increased from 30s)

          try {
            const response = await fetch(url, {
              ...options,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response;
          } catch (error: any) {
            clearTimeout(timeoutId);
            throw error;
          }
        },
      },
    },
  );

  return supabaseInstance;
})();
