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
    
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: code,
      type: 'sms',
    });

    if (error) {
      console.error('OTP Verify Error:', error);
      return { success: false, error: error.message };
    }

    if (data.user) {
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

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Sign in with Apple
 */
export async function signInWithApple(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// Email Authentication
// ==========================================

/**
 * Sign in with email (magic link)
 */
export async function signInWithEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
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
 */
export async function confirmGuestPhone(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedPhone = formatSaudiPhone(phone);
    
    const { data, error } = await supabase
      .from('verified_guests')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('verification_code', code)
      .gte('code_expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return { success: false, error: 'رمز التحقق غير صحيح أو منتهي الصلاحية' };
    }

    // Mark as verified
    await supabase
      .from('verified_guests')
      .update({ is_verified: true })
      .eq('phone', formattedPhone);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// Session Management
// ==========================================

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return profile || null;
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
 */
export async function updateProfile(updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: 'غير مسجل الدخول' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
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
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
}

