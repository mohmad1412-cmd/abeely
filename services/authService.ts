import { supabase } from './supabaseClient';

// Types
export interface UserProfile {
  id: string;
  phone: string | null;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'provider' | 'admin';
  is_guest: boolean;
  rating: number;
  reviews_count: number;
  preferred_categories: string[];
  preferred_cities: string[];
  is_verified: boolean;
  created_at: string;
}

// Check if running in Capacitor (mobile app)
function isCapacitor(): boolean {
  return typeof (window as any)?.Capacitor !== 'undefined';
}

/**
 * بدء تسجيل الدخول عبر OAuth (Google/Apple)
 * Supabase يتعامل مع الـ callback تلقائياً بسبب detectSessionInUrl: true
 */
export async function signInWithOAuth(provider: 'google' | 'apple'): Promise<{ success: boolean; error?: string }> {
  try {
    // مسح guest mode قبل بدء OAuth
    localStorage.removeItem("abeely_guest_mode");
    
    // الحصول على الـ redirect URL الصحيح
    // يجب أن يكون نفس الـ URL المسجل في Supabase Dashboard و Google Console
    const redirectUrl = window.location.origin;
    
    console.log("🔐 Starting OAuth with redirect to:", redirectUrl);

    // Handle Capacitor (mobile)
    if (isCapacitor()) {
      const { Browser } = await import('@capacitor/browser');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
        },
      });
      
      if (error) {
        console.error("❌ OAuth error (Capacitor):", error);
        return { success: false, error: error.message };
      }
      
      if (data?.url) {
        await Browser.open({ url: data.url, windowName: '_blank' });
        return { success: true };
      }
      
      return { success: false, error: 'فشل الحصول على رابط الدخول' };
    }

    // Web: استخدام redirect مباشرة
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
      },
    });

    if (error) {
      console.error("❌ OAuth error:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ OAuth initiated, redirecting...", data);
    // المتصفح سيعيد التوجيه تلقائياً
    return { success: true };
  } catch (err: any) {
    console.error('❌ OAuth exception:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء تسجيل الدخول' };
  }
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return profile as UserProfile;
  } catch (err) {
    console.error('Error getting current user:', err);
    return null;
  }
}

export async function signOut() {
  await supabase.auth.signOut();
  localStorage.removeItem('abeely_guest_mode');
  window.location.href = '/';
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function signInWithEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ أثناء إرسال رابط الدخول' };
  }
}

/**
 * التحقق من صحة رقم الجوال السعودي
 * يقبل الأرقام مع أو بدون 0 في البداية
 * أمثلة صحيحة: 501234567, 0501234567, 512345678
 */
export function isValidSaudiPhone(phone: string) {
  // إزالة أي مسافات أو أحرف غير رقمية
  const cleanPhone = phone.replace(/\D/g, '');
  
  // يقبل 9 أرقام (بدون 0) أو 10 أرقام (مع 0)
  // الأرقام السعودية تبدأ بـ 5 أو 0 ثم 5
  if (cleanPhone.length === 9) {
    // بدون 0: يجب أن يبدأ بـ 5
    return cleanPhone.startsWith('5');
  } else if (cleanPhone.length === 10) {
    // مع 0: يجب أن يبدأ بـ 05
    return cleanPhone.startsWith('05');
  }
  
  return false;
}

/**
 * تنسيق رقم الهاتف للصيغة الدولية
 * يقبل: 501234567, 0501234567, +966501234567
 * يخرج: +966501234567
 */
function formatPhoneToInternational(phone: string): string {
  // إزالة أي مسافات أو أحرف غير رقمية
  let cleanPhone = phone.replace(/\D/g, '');
  
  // إذا كان يبدأ بـ +966، أزل + فقط
  if (phone.startsWith('+966')) {
    cleanPhone = phone.replace(/\+966/, '').replace(/\D/g, '');
  }
  
  // إذا كان 10 أرقام (يبدأ بـ 0)، أزل الـ 0
  if (cleanPhone.length === 10 && cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1);
  }
  
  // التأكد من أنه 9 أرقام ويبدأ بـ 5
  if (cleanPhone.length === 9 && cleanPhone.startsWith('5')) {
    return `+966${cleanPhone}`;
  }
  
  // إذا كان بالفعل بصيغة دولية
  if (phone.startsWith('+966')) {
    return phone;
  }
  
  // افتراضي: أضف +966
  return `+966${cleanPhone}`;
}

/**
 * إرسال رمز التحقق عبر Supabase Auth (يستخدم Twilio كـ provider)
 * تأكد من تكوين Twilio في Supabase Dashboard:
 * Authentication → Providers → Phone → Twilio
 */
export async function sendOTP(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    // تنسيق الرقم للصيغة الدولية
    const formattedPhone = formatPhoneToInternational(phone);
    
    console.log('📱 Sending OTP to:', formattedPhone);
    
    // إرسال OTP عبر Supabase Auth (يستخدم Twilio تلقائياً)
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: {
        shouldCreateUser: true
      }
    });
    
    if (error) {
      console.error('❌ Supabase OTP Error:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ OTP sent successfully');
    return { success: true };
  } catch (err: any) {
    console.error('Error sending OTP:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء إرسال رمز التحقق' };
  }
}

/**
 * التحقق من رمز OTP عبر Supabase Auth
 * Supabase يتعامل مع Twilio تلقائياً
 */
export async function verifyOTP(phone: string, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    // تنسيق الرقم للصيغة الدولية
    const formattedPhone = formatPhoneToInternational(phone);
    
    console.log('🔐 Verifying OTP for:', formattedPhone);
    
    // التحقق من الرمز عبر Supabase Auth
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: token,
      type: 'sms'
    });
    
    if (error) {
      console.error('❌ Supabase Verify Error:', error);
      return { success: false, error: error.message };
    }
    
    if (data.user) {
      console.log('✅ OTP verified, user logged in:', data.user.id);
      return { success: true };
    }
    
    return { success: false, error: 'رمز التحقق غير صحيح' };
  } catch (err: any) {
    console.error('Error verifying OTP:', err);
    return { success: false, error: err.message || 'رمز التحقق غير صحيح' };
  }
}

// Guest phone verification functions
export async function verifyGuestPhone(phone: string): Promise<{ success: boolean; error?: string }> {
  return sendOTP(phone);
}

export async function confirmGuestPhone(phone: string, token: string): Promise<{ success: boolean; error?: string }> {
  return verifyOTP(phone, token);
}
