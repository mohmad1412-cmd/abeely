import { createClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger.ts";
import { capacitorStorage } from "./capacitorStorage.ts";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// التحقق من صحة القيم قبل إنشاء العميل
const isValidUrl = supabaseUrl && supabaseUrl.trim().length > 0;
const isValidKey = supabaseAnonKey && supabaseAnonKey.trim().length > 0;

// Log configuration status (without exposing sensitive data)
/* console.log("🔧 Supabase Configuration:", {
  hasUrl: !!supabaseUrl,
  urlLength: supabaseUrl?.length || 0,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length || 0,
  isValidUrl,
  isValidKey,
  isConfigured: isValidUrl && isValidKey,
}); */

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
let supabaseInstance: ReturnType<typeof createClient<any>> | null = null;

export const supabase = (() => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createClient<any>(
    isValidUrl ? supabaseUrl : "",
    isValidKey ? supabaseAnonKey : "",
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        // استخدام capacitorStorage للتخزين الدائم على Android
        storage: capacitorStorage,
        storageKey: "sb-gfjtyfwwbpjbwafbnfcc-auth-token",
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
        fetch: async (url, options: RequestInit = {}) => {
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
})(); // Remove generic casting here, handled by explicit return type or assertions if needed.
// Actually, I will cast the result if I cannot change the logic easily.
// But wait, the file content is not fully visible.
// I will just cast the export: export const supabase = ... as SupabaseClient<any>;
// But defining SupabaseClient type is hard.
// I'll just change the variable type !
// let supabaseInstance: ReturnType<typeof createClient<any>> = null as any;
// No.
// I'll use ! operator in export? No.
// I'll change the IIFE return type.
