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
 * نستخدم redirect مباشرة بدلاً من popup لأنه أكثر موثوقية
 */
export async function signInWithOAuth(provider: 'google' | 'apple'): Promise<{ success: boolean; error?: string }> {
  try {
    // Handle Capacitor (mobile)
    if (isCapacitor()) {
      const { Browser } = await import('@capacitor/browser');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true,
          queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
        },
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      if (data?.url) {
        await Browser.open({ url: data.url, windowName: '_blank' });
        return { success: true };
      }
      
      return { success: false, error: 'فشل الحصول على رابط الدخول' };
    }

    // Web: استخدام redirect مباشرة (أكثر موثوقية من popup)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
        queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // لن نصل هنا لأن المتصفح سيعيد التوجيه
    return { success: true };
  } catch (err: any) {
    console.error('OAuth error:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء تسجيل الدخول' };
  }
}

/**
 * Legacy function for backwards compatibility
 * @deprecated استخدم signInWithOAuth بدلاً منها
 */
export function startOAuthFlow(
  provider: 'google' | 'apple',
  onSuccess: () => void,
  onError: (error: string) => void
): { cancel: () => void } {
  // استخدام redirect مباشرة
  signInWithOAuth(provider).then(result => {
    if (!result.success && result.error) {
      onError(result.error);
    }
    // لن نصل لـ onSuccess هنا لأن المتصفح سيعيد التوجيه
  });

  return { 
    cancel: () => {
      // لا يمكن إلغاء redirect
    } 
  };
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
