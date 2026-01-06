import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// التحقق من صحة القيم قبل إنشاء العميل
const isValidUrl = supabaseUrl && supabaseUrl.trim().length > 0;
const isValidKey = supabaseAnonKey && supabaseAnonKey.trim().length > 0;

if (!isValidUrl || !isValidKey) {
  const errorMsg = 'Supabase: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY';
  logger.error(errorMsg, undefined, 'SupabaseClient');
  
  // في بيئة الإنتاج، throw error لمنع الأخطاء الصامتة
  if (import.meta.env.PROD) {
    throw new Error('Supabase configuration is missing. Please check your environment variables configuration.');
  } else {
    logger.warn('⚠️ Supabase client initialized with empty values. Some features may not work correctly.');
  }
}

// Singleton pattern to prevent multiple instances
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createClient(
    isValidUrl ? supabaseUrl : '', 
    isValidKey ? supabaseAnonKey : '', 
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'sb-iwfvlrtmbixequntufjr-auth-token'
      },
      realtime: {
        // تحسين إعدادات WebSocket
        params: {
          eventsPerSecond: 10
        },
        // إعدادات إعادة الاتصال
        heartbeatIntervalMs: 30000,
        reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 30000),
        // إعدادات timeout
        timeout: 20000
      },
      global: {
        // زيادة timeout للطلبات
        headers: {
          'x-client-info': 'servicelink-ai-platform'
        },
        fetch: (url, options = {}) => {
          // Create timeout controller for better browser compatibility
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
          
          return fetch(url, {
            ...options,
            signal: options.signal 
              ? (() => {
                  // If there's already a signal, combine it with timeout
                  const combinedController = new AbortController();
                  options.signal.addEventListener('abort', () => combinedController.abort());
                  controller.signal.addEventListener('abort', () => combinedController.abort());
                  return combinedController.signal;
                })()
              : controller.signal
          }).finally(() => {
            clearTimeout(timeoutId);
          });
        }
      }
    }
  );

  return supabaseInstance;
})();
