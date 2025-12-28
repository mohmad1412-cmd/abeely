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
 * Start OAuth flow - returns immediately with popup reference
 */
export function startOAuthFlow(
  provider: 'google' | 'apple',
  onSuccess: () => void,
  onError: (error: string) => void
): { cancel: () => void } {
  
  let popup: Window | null = null;
  let cancelled = false;
  let authSubscription: { unsubscribe: () => void } | null = null;

  const cleanup = () => {
    cancelled = true;
    if (authSubscription) authSubscription.unsubscribe();
    if (popup && !popup.closed) popup.close();
  };

  const cancel = () => {
    cleanup();
    onError('تم إلغاء تسجيل الدخول');
  };

  (async () => {
    try {
      if (isCapacitor()) {
        const { Browser } = await import('@capacitor/browser');
        const { data } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}?oauth_callback=true`,
            skipBrowserRedirect: true,
            queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
          },
        });
        
        if (data?.url) {
          await Browser.open({ url: data.url, windowName: '_blank' });
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
              Browser.close();
              cleanup();
              onSuccess();
            }
          });
          authSubscription = subscription;
        }
        return;
      }

      // Web: Popup Flow
      console.log('🚀 Starting OAuth flow for:', provider);
      
      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}?popup=true`,
          skipBrowserRedirect: true,
          queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
        },
      });

      if (error) {
        console.error('❌ OAuth error:', error);
        onError(error.message || 'فشل البدء');
        return;
      }

      if (!data?.url) {
        console.error('❌ No OAuth URL returned');
        onError('فشل الحصول على رابط الدخول');
        return;
      }

      console.log('✅ Got OAuth URL, opening popup...');
      localStorage.setItem('abeely_oauth_popup_active', 'true');
      
      popup = window.open(
        data.url,
        'auth-popup',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        console.error('❌ Popup was blocked or failed to open');
        localStorage.removeItem('abeely_oauth_popup_active');
        onError('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة في المتصفح');
        return;
      }

      console.log('✅ Popup opened successfully');
      popup.focus();

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.id);
        if (event === 'SIGNED_IN' && session) {
          console.log('✅ User signed in, cleaning up...');
          cleanup();
          onSuccess();
        }
      });
      authSubscription = subscription;

    } catch (err) {
      if (!cancelled) onError('حدث خطأ');
    }
  })();

  return { cancel };
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return profile as UserProfile;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.reload();
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function signInWithEmail(email: string) {
  return await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin }
  });
}

export function isValidSaudiPhone(phone: string) {
  return phone.length >= 9;
}

export async function sendOTP(phone: string) {
  return await supabase.auth.signInWithOtp({ phone });
}

export async function verifyOTP(phone: string, token: string) {
  return await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
}

// Guest phone verification functions
export async function verifyGuestPhone(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ أثناء إرسال رمز التحقق' };
  }
}

export async function confirmGuestPhone(phone: string, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'رمز التحقق غير صحيح' };
  }
}
