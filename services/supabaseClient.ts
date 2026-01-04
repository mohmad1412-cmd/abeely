import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = '❌ Supabase: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY';
  console.error(errorMsg);
  // في بيئة الإنتاج، قد نريد إظهار رسالة خطأ للمستخدم
  if (import.meta.env.PROD) {
    console.error('Please check your environment variables configuration.');
  }
}

// التحقق من صحة القيم قبل إنشاء العميل
const isValidUrl = supabaseUrl && supabaseUrl.trim().length > 0;
const isValidKey = supabaseAnonKey && supabaseAnonKey.trim().length > 0;

if (!isValidUrl || !isValidKey) {
  console.warn('⚠️ Supabase client initialized with empty values. Some features may not work correctly.');
}

export const supabase = createClient(
  isValidUrl ? supabaseUrl : '', 
  isValidKey ? supabaseAnonKey : '', 
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }
);
