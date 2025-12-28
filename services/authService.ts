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

export function isValidSaudiPhone(phone: string) {
  return phone.length >= 9;
}

export async function sendOTP(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedPhone = phone.startsWith('+966') ? phone : `+966${phone.replace(/^0/, '')}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ أثناء إرسال رمز التحقق' };
  }
}

export async function verifyOTP(phone: string, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedPhone = phone.startsWith('+966') ? phone : `+966${phone.replace(/^0/, '')}`;
    const { error } = await supabase.auth.verifyOtp({ phone: formattedPhone, token, type: 'sms' });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
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
