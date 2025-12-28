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
 * Start OAuth flow - opens popup IMMEDIATELY to preserve user gesture
 */
export function startOAuthFlow(
  provider: 'google' | 'apple',
  onSuccess: () => void,
  onError: (error: string) => void
): { cancel: () => void } {
  
  let popup: Window | null = null;
  let cancelled = false;
  let authSubscription: { unsubscribe: () => void } | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let storageHandler: ((e: StorageEvent) => void) | null = null;

  const cleanup = () => {
    cancelled = true;
    if (authSubscription) authSubscription.unsubscribe();
    if (pollInterval) clearInterval(pollInterval);
    if (storageHandler) window.removeEventListener('storage', storageHandler);
    if (popup && !popup.closed) popup.close();
    localStorage.removeItem('abeely_oauth_popup_active');
  };

  const cancel = () => {
    cleanup();
    onError('تم إلغاء تسجيل الدخول');
  };

  // Handle Capacitor (mobile)
  if (isCapacitor()) {
    (async () => {
      try {
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
      } catch (err) {
        if (!cancelled) onError('حدث خطأ');
      }
    })();
    return { cancel };
  }

  // ===== WEB: Open popup IMMEDIATELY to preserve user gesture =====
  console.log('🚀 Starting OAuth flow for:', provider);
  
  const width = 500;
  const height = 650;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  
  // Open popup IMMEDIATELY with a loading page (before any await)
  // This preserves the user gesture context
  localStorage.setItem('abeely_oauth_popup_active', 'true');
  
  popup = window.open(
    'about:blank',
    'oauth-popup',
    `popup=yes,width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no`
  );

  if (!popup || popup.closed) {
    console.error('❌ Popup was blocked');
    localStorage.removeItem('abeely_oauth_popup_active');
    onError('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة في المتصفح');
    return { cancel };
  }

  // Show loading in popup
  popup.document.write(`
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>جاري التحميل...</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          background: linear-gradient(135deg, #153659 0%, #0d9488 50%, #153659 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          color: white;
        }
        .loader {
          text-align: center;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="loader">
        <div class="spinner"></div>
        <p>جاري التحويل إلى ${provider === 'google' ? 'Google' : 'Apple'}...</p>
      </div>
    </body>
    </html>
  `);

  console.log('✅ Popup opened, fetching OAuth URL...');
  popup.focus();

  // Now get the OAuth URL and redirect the popup
  (async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}?popup=true`,
          skipBrowserRedirect: true,
          queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
        },
      });

      if (error || !data?.url) {
        console.error('❌ OAuth error:', error);
        if (popup && !popup.closed) popup.close();
        cleanup();
        onError(error?.message || 'فشل الحصول على رابط الدخول');
        return;
      }

      if (cancelled || !popup || popup.closed) {
        cleanup();
        return;
      }

      // Redirect popup to OAuth URL
      console.log('✅ Redirecting popup to OAuth URL...');
      popup.location.href = data.url;

      // Listen for auth state changes (works when session is shared via localStorage)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔐 Auth state changed:', event);
        if (event === 'SIGNED_IN' && session && !cancelled) {
          console.log('✅ User signed in via onAuthStateChange!');
          cleanup();
          onSuccess();
        }
      });
      authSubscription = subscription;

      // Also listen for storage events (when popup saves to localStorage)
      storageHandler = async (e: StorageEvent) => {
        if (e.key === 'abeely_auth_success' && e.newValue && !cancelled) {
          console.log('✅ Auth success detected via storage event!');
          // Verify session exists
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            cleanup();
            onSuccess();
          }
        }
      };
      window.addEventListener('storage', storageHandler);

      // Poll for popup close and session
      pollInterval = setInterval(async () => {
        if (cancelled) {
          cleanup();
          return;
        }

        // Check if popup closed
        if (popup?.closed) {
          console.log('📭 Popup closed, checking session...');
          clearInterval(pollInterval!);
          pollInterval = null;
          
          // Wait a bit for session to sync
          await new Promise(r => setTimeout(r, 500));
          
          const { data: { session } } = await supabase.auth.getSession();
          if (session && !cancelled) {
            console.log('✅ Session found after popup closed!');
            cleanup();
            onSuccess();
          } else if (!cancelled) {
            // Check localStorage flag
            const authSuccess = localStorage.getItem('abeely_auth_success');
            if (authSuccess) {
              localStorage.removeItem('abeely_auth_success');
              // Try getting session again
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession) {
                cleanup();
                onSuccess();
                return;
              }
            }
            cleanup();
            onError('تم إلغاء تسجيل الدخول');
          }
        }
      }, 500);

      // Timeout after 5 minutes
      setTimeout(() => {
        if (!cancelled && popup && !popup.closed) {
          cleanup();
          onError('انتهت مهلة تسجيل الدخول');
        }
      }, 5 * 60 * 1000);

    } catch (err) {
      console.error('❌ Error:', err);
      if (!cancelled) {
        cleanup();
        onError('حدث خطأ');
      }
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
