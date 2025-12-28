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

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
}

// ==========================================
// Phone Authentication (OTP)
// ==========================================

/**
 * Send OTP to phone number
 */
export async function sendOTP(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Format phone number (ensure it starts with +966)
    const formattedPhone = formatSaudiPhone(phone);
    
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      console.error('OTP Send Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('OTP Error:', err);
    return { success: false, error: err.message || 'فشل إرسال رمز التحقق' };
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedPhone = formatSaudiPhone(phone);
    
    if (!isValidSaudiPhone(phone)) {
      return { success: false, error: 'رقم الجوال غير صحيح' };
    }

    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: code,
      type: 'sms',
    });

    if (error) {
      console.error('OTP Verify Error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = error.message;
      if (error.message.includes('expired')) {
        errorMessage = 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد';
      } else if (error.message.includes('invalid')) {
        errorMessage = 'رمز التحقق غير صحيح';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'تم تجاوز عدد المحاولات المسموح به. يرجى المحاولة لاحقاً';
      }
      
      return { success: false, error: errorMessage };
    }

    if (data.user) {
      // Ensure profile exists after successful verification
      await ensureProfileExists(data.user.id);
      return { success: true };
    }

    return { success: false, error: 'فشل التحقق من الرمز' };
  } catch (err: any) {
    console.error('Verify Error:', err);
    return { success: false, error: err.message || 'فشل التحقق' };
  }
}

// ==========================================
// Social Authentication
// ==========================================


// Check if running in Capacitor (mobile app)
function isCapacitor(): boolean {
  return typeof (window as any)?.Capacitor !== 'undefined';
}

/**
 * OAuth flow result with popup reference for cancellation
 */
export interface OAuthFlowResult {
  success: boolean;
  error?: string;
  popup?: Window | null;
  cancel?: () => void;
}

/**
 * Start OAuth flow - returns immediately with popup reference
 * UI shows a modal while waiting for auth to complete
 */
export function startOAuthFlow(
  provider: 'google' | 'apple',
  onSuccess: () => void,
  onError: (error: string) => void
): { cancel: () => void } {
  
  let popup: Window | null = null;
  let cancelled = false;
  let authSubscription: { unsubscribe: () => void } | null = null;
  let checkInterval: ReturnType<typeof setInterval> | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    cancelled = true;
    // NOTE: Don't clear popup flag here - the popup will clear it after showing success
    // This prevents race condition where main window clears flag before popup can read it
    if (authSubscription) {
      authSubscription.unsubscribe();
    }
    if (checkInterval) {
      clearInterval(checkInterval);
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (popup && !popup.closed) {
      popup.close();
    }
  };

  const cancel = () => {
    cleanup();
    onError('تم إلغاء تسجيل الدخول');
  };

  // Start the flow
  (async () => {
    try {
    if (typeof window === 'undefined') {
        onError('البيئة غير مدعومة');
        return;
      }

      // Mobile: Use redirect flow
      if (isCapacitor()) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: window.location.origin,
            queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
          },
        });
        
        if (error) {
          onError(error.message || `فشل الدخول بحساب ${provider === 'google' ? 'Google' : 'Apple'}`);
        }
        // Redirect will happen, no need to call onSuccess
        return;
      }

      // Web: Use popup flow
      // Add popup=true to the redirect URL so popup can identify itself
      const popupRedirectUrl = `${window.location.origin}?popup=true`;
      
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
      options: {
          redirectTo: popupRedirectUrl,
          skipBrowserRedirect: true,
          queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
      },
    });

      if (error || !data?.url) {
        onError(error?.message || `فشل الدخول بحساب ${provider === 'google' ? 'Google' : 'Apple'}`);
        return;
      }

      if (cancelled) return;

      // Open popup
      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      // Set localStorage flag to help identify popup on callback
      localStorage.setItem('abeely_oauth_popup_active', 'true');
      
      popup = window.open(
        data.url,
        `${provider}-auth-popup`,
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        localStorage.removeItem('abeely_oauth_popup_active');
        onError('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة في المتصفح');
        return;
      }

      // Focus the popup
      popup.focus();

      // Listen for successful auth
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session && !cancelled) {
          // Wait a moment to ensure session is fully saved
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Double-check session exists before calling onSuccess
          const { data: { session: verifiedSession } } = await supabase.auth.getSession();
          if (verifiedSession && verifiedSession.user) {
            // Don't clear popup flag here - let the popup clear it after showing success
            // This ensures the popup can detect itself correctly
            cleanup();
            onSuccess();
          }
        }
      });
      authSubscription = authListener.subscription;

      // Check if popup is closed manually
      checkInterval = setInterval(() => {
        if (popup?.closed && !cancelled) {
          cleanup();
          
          // Check if auth happened anyway
          supabase.auth.getSession().then(({ data: sessionData }) => {
            if (sessionData?.session) {
              onSuccess();
            } else {
              onError('تم إلغاء تسجيل الدخول');
            }
          });
        }
      }, 500);

      // Timeout after 5 minutes
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          cleanup();
          onError('انتهت مهلة تسجيل الدخول');
        }
      }, 5 * 60 * 1000);

  } catch (err: any) {
      if (!cancelled) {
        cleanup();
        onError('حدث خطأ أثناء الدخول');
      }
    }
  })();

  return { cancel };
}

// Keep old functions for backwards compatibility
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    startOAuthFlow(
      'google',
      () => resolve({ success: true }),
      (error) => resolve({ success: false, error })
    );
  });
}

export async function signInWithApple(): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    startOAuthFlow(
      'apple',
      () => resolve({ success: true }),
      (error) => resolve({ success: false, error })
    );
  });
}

// ==========================================
// Email Authentication
// ==========================================

/**
 * Sign in with email (magic link)
 */
export async function signInWithEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Basic email validation
    if (!email || !email.includes('@')) {
      return { success: false, error: 'يرجى إدخال بريد إلكتروني صحيح' };
    }

    // استخدم الرابط الحالي للموقع (يعمل مع localhost و Vercel)
    const redirectUrl = window.location.origin;
    
    // استخدام رابط Vercel للإنتاج أو localhost للتطوير
    const isProduction = window.location.hostname.includes('vercel.app') || 
                         window.location.hostname.includes('abeely');
    const baseUrl = isProduction 
      ? 'https://copy-of-copy-of-servicelink-ai-platform-r1q77wvmr.vercel.app'
      : redirectUrl;
    
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: baseUrl,
      },
    });

    if (error) {
      console.error('Email sign in error:', error);
      
      let errorMessage = error.message;
      if (error.message.includes('rate limit')) {
        errorMessage = 'تم تجاوز عدد المحاولات المسموح به. يرجى المحاولة لاحقاً';
      } else if (error.message.includes('invalid')) {
        errorMessage = 'البريد الإلكتروني غير صحيح';
      }
      
      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Email sign in error:', err);
    return { success: false, error: err.message || 'فشل إرسال رابط الدخول' };
  }
}

// ==========================================
// Guest Mode
// ==========================================

/**
 * Continue as guest (anonymous session)
 */
export async function continueAsGuest(): Promise<{ success: boolean; error?: string }> {
  try {
    // We don't create an anonymous user, just return success
    // Guest state will be handled in the app
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Verify guest phone for request creation
 */
export async function verifyGuestPhone(phone: string): Promise<{ success: boolean; verificationCode?: string; error?: string }> {
  try {
    const formattedPhone = formatSaudiPhone(phone);
    
    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in verified_guests table
    const { error } = await supabase
      .from('verified_guests')
      .upsert({
        phone: formattedPhone,
        verification_code: code,
        code_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        is_verified: false,
      }, {
        onConflict: 'phone',
      });

    if (error) {
      console.error('Guest verification error:', error);
      return { success: false, error: 'فشل إرسال رمز التحقق' };
    }

    // In production, send SMS here via Twilio/etc
    // For now, we'll log it (remove in production!)
    console.log(`🔐 Guest verification code for ${formattedPhone}: ${code}`);

    return { success: true, verificationCode: code };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Confirm guest phone verification
 * Uses the database function for better security
 */
export async function confirmGuestPhone(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedPhone = formatSaudiPhone(phone);
    
    if (!isValidSaudiPhone(phone)) {
      return { success: false, error: 'رقم الجوال غير صحيح' };
    }

    // Use the database function for verification (more secure)
    const { data, error } = await supabase
      .rpc('verify_guest_phone', {
        phone_number: formattedPhone,
        verification_code: code
      });

    if (error) {
      console.error('Guest verification error:', error);
      return { success: false, error: 'رمز التحقق غير صحيح أو منتهي الصلاحية' };
    }

    if (data === true) {
      return { success: true };
    }

    return { success: false, error: 'رمز التحقق غير صحيح أو منتهي الصلاحية' };
  } catch (err: any) {
    console.error('Confirm guest phone error:', err);
    return { success: false, error: err.message || 'فشل التحقق من الرمز' };
  }
}

// ==========================================
// Session Management
// ==========================================

/**
 * Get current user profile
 * Automatically creates profile if it doesn't exist
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      return null;
    }
    
    if (!user) return null;

    // Try to get profile
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist, try to create it
    if (profileError || !profile) {
      console.warn('Profile not found, attempting to create...', profileError);
      
      // Try to create profile using the database function
      const { data: createResult, error: createError } = await supabase
        .rpc('create_profile_for_user', { user_id: user.id });
      
      if (createError) {
        console.error('Failed to create profile:', createError);
        // Fallback: try manual insert
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            phone: user.phone || null,
            email: user.email || null,
            display_name: user.user_metadata?.display_name || 
                         user.user_metadata?.full_name || 
                         user.user_metadata?.name || null,
            avatar_url: user.user_metadata?.avatar_url || 
                       user.user_metadata?.picture || null,
            role: 'user',
            is_guest: false,
            is_verified: !!(user.email_confirmed_at || user.phone_confirmed_at),
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Failed to insert profile:', insertError);
          return null;
        }
        
        profile = newProfile;
      } else {
        // Retry getting the profile after creation
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        profile = retryProfile || null;
      }
    }

    // Convert JSONB arrays to regular arrays if needed
    if (profile) {
      return {
        ...profile,
        preferred_categories: Array.isArray(profile.preferred_categories) 
          ? profile.preferred_categories 
          : (profile.preferred_categories ? JSON.parse(profile.preferred_categories) : []),
        preferred_cities: Array.isArray(profile.preferred_cities) 
          ? profile.preferred_cities 
          : (profile.preferred_cities ? JSON.parse(profile.preferred_cities) : []),
      } as UserProfile;
    }

    return null;
  } catch (err) {
    console.error('Get user error:', err);
    return null;
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update user profile
 * Ensures profile exists before updating
 */
export async function updateProfile(updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'غير مسجل الدخول' };
    }

    // Ensure profile exists before updating
    const profileExists = await ensureProfileExists(user.id);
    if (!profileExists) {
      return { success: false, error: 'فشل في إنشاء الملف الشخصي' };
    }

    // Prepare updates (handle JSONB arrays)
    const profileUpdates: any = {
      ...updates,
    };

    // Convert arrays to JSONB if needed
    if (updates.preferred_categories) {
      profileUpdates.preferred_categories = Array.isArray(updates.preferred_categories)
        ? updates.preferred_categories
        : JSON.parse(updates.preferred_categories as any);
    }

    if (updates.preferred_cities) {
      profileUpdates.preferred_cities = Array.isArray(updates.preferred_cities)
        ? updates.preferred_cities
        : JSON.parse(updates.preferred_cities as any);
    }

    const { error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', user.id);

    if (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message || 'فشل تحديث الملف الشخصي' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Update profile error:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء التحديث' };
  }
}

// ==========================================
// Helpers
// ==========================================

/**
 * Format Saudi phone number
 */
export function formatSaudiPhone(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('966')) {
    return '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    return '+966' + cleaned.substring(1);
  } else if (cleaned.startsWith('5')) {
    return '+966' + cleaned;
  }
  
  return '+966' + cleaned;
}

/**
 * Validate Saudi phone number
 */
export function isValidSaudiPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  
  // Saudi mobile numbers: 05XXXXXXXX or +9665XXXXXXXX
  if (cleaned.startsWith('966')) {
    return cleaned.length === 12 && cleaned[3] === '5';
  } else if (cleaned.startsWith('0')) {
    return cleaned.length === 10 && cleaned[1] === '5';
  } else if (cleaned.startsWith('5')) {
    return cleaned.length === 9;
  }
  
  return false;
}

/**
 * Ensure profile exists for a user
 * Returns true if profile exists or was created successfully
 */
export async function ensureProfileExists(userId: string): Promise<boolean> {
  try {
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      return true;
    }

    // Try to create profile using database function
    const { data: createResult, error: createError } = await supabase
      .rpc('create_profile_for_user', { user_id: userId });

    if (createError) {
      console.error('Failed to create profile via function:', createError);
      
      // Fallback: get user data and create manually
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user || user.id !== userId) {
        return false;
      }

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          phone: user.phone || null,
          email: user.email || null,
          display_name: user.user_metadata?.display_name || 
                       user.user_metadata?.full_name || 
                       user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || 
                     user.user_metadata?.picture || null,
          role: 'user',
          is_guest: false,
          is_verified: !!(user.email_confirmed_at || user.phone_confirmed_at),
        });

      if (insertError) {
        console.error('Failed to insert profile:', insertError);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('Ensure profile exists error:', err);
    return false;
  }
}

/**
 * Check if profile exists for current user
 */
export async function checkProfileExists(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    return !!data;
  } catch (err) {
    return false;
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    const user = session?.user || null;
    
    // If user signed in, ensure profile exists
    if (user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
      await ensureProfileExists(user.id);
    }
    
    callback(user);
  });
}

