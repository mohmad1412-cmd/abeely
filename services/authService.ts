import { supabase } from './supabaseClient';
import { logger } from '../utils/logger';

// ======================================
// 🔧 Test Phones - أرقام الاختبار (Development Only)
// ======================================
// أرقام وهمية للتطوير والاختبار - تعمل مع رمز 0000
// لتفعيل: أي رقم يبدأ بـ 555 مثل 0555555555
// ملاحظة: تعمل فقط في بيئة التطوير (DEV_MODE)
const IS_DEV_MODE = import.meta.env.DEV;
const TEST_PHONE_PREFIX = '555'; // أي رقم يبدأ بـ 555 يعتبر رقم اختبار
const TEST_OTP_CODE = '0000';

function isTestPhone(phone: string): boolean {
  // Test phones فقط في بيئة التطوير
  if (!IS_DEV_MODE) return false;
  
  const cleanPhone = phone.replace(/\D/g, '');
  // يقبل 0555... أو 555...
  return cleanPhone.startsWith('0555') || cleanPhone.startsWith('555');
}

// Types
export interface UserProfile {
  id: string;
  phone: string | null;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  role: 'user' | 'provider' | 'admin';
  is_guest: boolean;
  rating: number;
  reviews_count: number;
  preferred_categories: string[];
  preferred_cities: string[];
  is_verified: boolean;
  created_at: string;
}

// Google Identity Services types
interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: { credential: string }) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GooglePromptNotification {
  isNotDisplayed?: boolean;
  isSkippedMoment?: boolean;
  isDismissedMoment?: boolean;
}

interface GoogleOAuth2TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
  callback: (response: { access_token?: string; error?: string }) => void;
}

interface GoogleOAuth2CodeClient {
  requestCode: () => void;
  callback: (response: { code?: string; error?: string }) => void;
}

interface GoogleOAuth2ClientConfig {
  client_id: string;
  scope: string;
  callback?: (response: { access_token?: string; code?: string; error?: string }) => void;
  redirect_uri?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => void;
          prompt: (callback?: (notification: GooglePromptNotification) => void) => void;
          renderButton: (element: HTMLElement, config: GoogleIdConfiguration) => void;
          disableAutoSelect: () => void;
        };
        oauth2: {
          initTokenClient: (config: GoogleOAuth2ClientConfig) => GoogleOAuth2TokenClient;
          initCodeClient: (config: GoogleOAuth2ClientConfig) => GoogleOAuth2CodeClient;
        };
      };
    };
  }
}

// Check if running in Capacitor (mobile app)
function isCapacitor(): boolean {
  return typeof (window as any)?.Capacitor !== 'undefined';
}

// Google Client ID from environment
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * فتح نافذة منبثقة للـ OAuth
 */
function openPopupWindow(url: string, name: string): Window | null {
  const width = 500;
  const height = 600;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  
  return window.open(
    url,
    name,
    `width=${width},height=${height},left=${left},top=${top},popup=yes,scrollbars=yes,resizable=yes`
  );
}

/**
 * تسجيل الدخول عبر Google باستخدام نافذة منبثقة (popup)
 * يستخدم Supabase OAuth مع popup يدوي
 * الـ popup يشارك نفس localStorage مع النافذة الأصلية لذا PKCE يعمل!
 */
export async function signInWithGooglePopup(): Promise<{ success: boolean; error?: string }> {
  return new Promise(async (resolve) => {
    try {
      // مسح guest mode
      localStorage.removeItem("abeely_guest_mode");
      
      logger.log("🔐 Starting Google popup sign-in...");

      // الحصول على رابط OAuth من Supabase
      // نستخدم نفس الـ origin - الـ popup يشارك localStorage مع النافذة الأصلية
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true, // لا تقم بـ redirect، سنفتح popup
          queryParams: { prompt: 'select_account' },
        },
      });

      if (error) {
        logger.error("❌ OAuth error:", error, 'service');
        resolve({ success: false, error: error.message });
        return;
      }

      if (!data?.url) {
        resolve({ success: false, error: 'فشل الحصول على رابط الدخول' });
        return;
      }

      logger.log("✅ Got OAuth URL, opening popup...");
      
      // فتح popup
      const popup = openPopupWindow(data.url, 'google_signin');
      
      if (!popup) {
        logger.error("❌ Popup blocked!");
        resolve({ success: false, error: 'تم حظر النافذة المنبثقة. يرجى السماح للنوافذ المنبثقة.' });
        return;
      }

      // الاستماع لتغييرات auth state
      let resolved = false;
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        logger.log("🔐 Auth state in popup flow:", event);
        
        if (event === 'SIGNED_IN' && session?.user && !resolved) {
          resolved = true;
          logger.log("✅ User signed in via popup:", session.user.email);
          
          // إغلاق الـ popup إذا كان مفتوحاً
          try {
            if (popup && !popup.closed) {
              popup.close();
            }
          } catch (e) {
            // تجاهل أخطاء إغلاق النافذة
          }
          
          subscription.unsubscribe();
          clearInterval(popupChecker);
          resolve({ success: true });
        }
      });

      // تحقق دوري إذا أغلق المستخدم الـ popup
      const popupChecker = setInterval(() => {
        if (popup.closed && !resolved) {
          logger.log("⚠️ Popup closed by user");
          resolved = true;
          subscription.unsubscribe();
          clearInterval(popupChecker);
          resolve({ success: false, error: 'تم إغلاق نافذة تسجيل الدخول' });
        }
      }, 500);

      // Timeout بعد 2 دقيقة
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          subscription.unsubscribe();
          clearInterval(popupChecker);
          try { popup.close(); } catch (e) {}
          resolve({ success: false, error: 'انتهت مهلة تسجيل الدخول' });
        }
      }, 120000);

    } catch (err: unknown) {
      const error = err as Error;
      logger.error('Google Sign-In exception', error, 'service');
      resolve({ success: false, error: error.message || 'حدث خطأ أثناء تسجيل الدخول' });
    }
  });
}

/**
 * بدء تسجيل الدخول عبر OAuth (Apple فقط أو كـ fallback لـ Google)
 * يستخدم redirect في نفس النافذة
 */
export async function signInWithOAuth(provider: 'google' | 'apple'): Promise<{ success: boolean; error?: string }> {
  try {
    // مسح guest mode قبل بدء OAuth
    localStorage.removeItem("abeely_guest_mode");
    
    // الحصول على الـ redirect URL الصحيح
    const redirectUrl = window.location.origin;
    
    logger.log("🔐 Starting OAuth redirect to:", redirectUrl);

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
        logger.error("❌ OAuth error (Capacitor):", error, 'service');
        return { success: false, error: error.message };
      }
      
      if (data?.url) {
        await Browser.open({ url: data.url, windowName: '_blank' });
        return { success: true };
      }
      
      return { success: false, error: 'فشل الحصول على رابط الدخول' };
    }

    // Web: استخدام redirect في نفس النافذة
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
      },
    });

    if (error) {
      logger.error("❌ OAuth error:", error, 'service');
      return { success: false, error: error.message };
    }

    logger.log("✅ OAuth initiated, redirecting...", data);
    // المتصفح سيعيد التوجيه تلقائياً في نفس النافذة
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('OAuth exception', error, 'service');
    return { success: false, error: error.message || 'حدث خطأ أثناء تسجيل الدخول' };
  }
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    // Try cached user first
    let user: { id: string; phone?: string } | null = null;
    try {
      const { data: { user: fetchedUser }, error } = await supabase.auth.getUser();
      user = fetchedUser || null;
      if (error) {
        logger.warn('Supabase getUser warning:', error.message);
      }
    } catch (getUserErr) {
      logger.warn('Supabase getUser exception:', getUserErr);
    }

    // If access token is stale, try to recover the session before giving up
    if (!user) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        user = sessionData?.session?.user || null;
      } catch (sessionErr) {
        logger.warn('Supabase getSession warning:', sessionErr);
      }
    }

    // Last resort: explicit refresh (helps avoid surprise logouts mid-action)
    if (!user) {
      try {
        logger.log('Refreshing Supabase session because user is missing...');
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          const message = refreshError.message?.toLowerCase?.() || '';
          if (!message.includes('network')) {
            logger.warn('Supabase refreshSession error:', refreshError);
          } else {
            logger.warn('Network issue while refreshing session; keeping user state intact');
          }
        }
        user = refreshed?.session?.user || null;
      } catch (refreshErr) {
        logger.warn('Supabase refreshSession exception:', refreshErr);
      }
    }

    if (!user) return null;

    // حاول جلب الـ profile
    let { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // إذا لم يوجد profile، أنشئ واحداً سريعاً
    if ((!profile || error) && user.id) {
      // للمستخدمين الجدد: الاسم فارغ حتى يدخله المستخدم بنفسه
      // فقط Google/Apple يأتي معهم اسم من user_metadata
      const displayName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        null; // فارغ للمستخدمين الجدد عبر الجوال

      const { data: upserted, error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          phone: user.phone ?? null,
          email: user.email ?? null,
          display_name: displayName,
          role: 'user',
          is_guest: false,
          is_verified: !!(user.phone || user.email),
          // ملاحظة: لا نضع has_onboarded هنا لأن العمود قد لا يكون موجوداً
          // الـ onboarding يعتمد على localStorage + التحقق من الاهتمامات والاسم
        })
        .select()
        .single();

      if (upsertError) {
        logger.error('Error creating profile:', upsertError, 'service');
        return null;
      }

      profile = upserted as any;
    }

    return profile as UserProfile;
  } catch (err) {
    logger.error('Error getting current user:', err, 'service');
    return null;
  }
}

export async function signOut() {
  await supabase.auth.signOut();
  localStorage.removeItem('abeely_guest_mode');
}

import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * تحديث الملف الشخصي للمستخدم
 */
export async function updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('❌ Error updating profile:', error, 'service');
      return { success: false, error: error.message };
    }

    logger.log('✅ Profile updated:', data);
    return { success: true, data: data as UserProfile };
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('Exception updating profile', error, 'service');
    return { success: false, error: error.message || 'حدث خطأ أثناء تحديث الملف الشخصي' };
  }
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
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error.message || 'حدث خطأ أثناء إرسال رابط الدخول' };
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
 * 
 * 🔧 للتطوير: الأرقام التي تبدأ بـ 555 (مثل 0555555555) تعتبر أرقام اختبار
 *    ويمكن استخدام الرمز 0000 للدخول
 */
export async function sendOTP(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    // تنسيق الرقم للصيغة الدولية
    const formattedPhone = formatPhoneToInternational(phone);
    
    logger.log('📱 Sending OTP to:', formattedPhone);
    logger.log('📱 Original phone input:', phone);
    
    // 🔧 وضع التطوير - أرقام الاختبار
    if (isTestPhone(phone)) {
      logger.log('🔧 DEV MODE: Test phone detected, skipping real SMS');
      logger.log('🔑 Use OTP code: 0000');
      return { success: true };
    }
    
    // إرسال OTP عبر Supabase Auth (يستخدم Twilio تلقائياً)
    logger.log('📤 Calling Supabase signInWithOtp with phone:', formattedPhone);
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: {
        shouldCreateUser: true,
        // إضافة channel للتأكد من استخدام SMS
        channel: 'sms'
      }
    });
    
    if (error) {
      logger.error('❌ Supabase OTP Error:', error, 'service');
      logger.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      
      // تحسين رسائل الخطأ
      let errorMessage = error.message;
      
      if (error.message.includes('Invalid phone number') || error.message.includes('phone')) {
        errorMessage = 'رقم الجوال غير صحيح. يرجى التأكد من إدخال رقم سعودي صحيح';
      } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
        errorMessage = 'تم تجاوز الحد المسموح. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى';
      } else if (error.message.includes('provider') || error.message.includes('Twilio')) {
        errorMessage = 'مشكلة في إعدادات Twilio. يرجى التحقق من إعدادات Supabase Dashboard';
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = 'مشكلة في الاتصال. يرجى التحقق من اتصالك بالإنترنت';
      }
      
      return { success: false, error: errorMessage };
    }
    
    logger.log('✅ OTP sent successfully');
    logger.log('✅ Response data:', data);
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('❌ Exception in sendOTP:', error, 'service');
    logger.error('❌ Error stack:', error.stack);
    return { success: false, error: error.message || 'حدث خطأ أثناء إرسال رمز التحقق' };
  }
}

/**
 * التحقق من رمز OTP عبر Supabase Auth
 * Supabase يتعامل مع Twilio تلقائياً
 * 
 * 🔧 للتطوير: الأرقام التي تبدأ بـ 555 تقبل الرمز 0000
 */
export async function verifyOTP(phone: string, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    // تنسيق الرقم للصيغة الدولية
    const formattedPhone = formatPhoneToInternational(phone);
    
    logger.log('🔐 Verifying OTP for:', formattedPhone);
    
    // 🔧 وضع التطوير - أرقام الاختبار (Fast path - no Supabase calls)
    if (isTestPhone(phone)) {
      logger.log('🔧 DEV MODE: Test phone verification');
      
      if (token === TEST_OTP_CODE) {
        logger.log('✅ DEV MODE: Test OTP accepted - using instant path');
        
        // حفظ الرقم في localStorage
        localStorage.setItem('dev_test_phone', formattedPhone);
        
        // Fast path: إنشاء session فوري بدون انتظار Supabase
        // هذا يمنع التعليق تماماً
        localStorage.setItem('abeely_guest_mode', 'true');
        localStorage.setItem('dev_test_user_id', `test_${Date.now()}`);
        
        // محاولة إنشاء session حقيقي في الخلفية (غير متزامن - لا ننتظره)
        // هذا يحسن التجربة لكن لا يعلق الكود
        supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: TEST_OTP_CODE,
          type: 'sms'
        }).then(({ data, error }) => {
          if (data?.user) {
            logger.log('✅ DEV MODE: Background session created:', data.user.id);
            localStorage.setItem('dev_test_user_id', data.user.id);
            localStorage.removeItem('abeely_guest_mode');
          } else if (error) {
            logger.warn('⚠️ DEV MODE: Background verifyOtp failed (expected):', error.message);
          }
        }).catch((err) => {
          logger.warn('⚠️ DEV MODE: Background verifyOtp exception (expected):', err);
        });
        
        // إرجاع فوري - لا ننتظر Supabase
        logger.log('✅ DEV MODE: Guest mode activated instantly for test phone');
        return { success: true };
      } else {
        logger.log('❌ DEV MODE: Wrong test OTP (expected 0000)');
        return { success: false, error: 'رمز التحقق غير صحيح (استخدم 0000 للأرقام الوهمية)' };
      }
    }
    
    // التحقق من الرمز عبر Supabase Auth
    logger.log('📤 Calling Supabase verifyOtp with phone:', formattedPhone, 'token:', token);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: token,
      type: 'sms'
    });
    
    if (error) {
      logger.error('❌ Supabase Verify Error:', error, 'service');
      logger.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      
      // تحسين رسائل الخطأ
      let errorMessage = error.message;
      
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        errorMessage = 'رمز التحقق غير صحيح أو منتهي الصلاحية. يرجى طلب رمز جديد';
      } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
        errorMessage = 'تم تجاوز الحد المسموح. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى';
      }
      
      return { success: false, error: errorMessage };
    }
    
    if (data?.user) {
      logger.log('✅ OTP verified, user logged in:', data.user.id);
      logger.log('✅ Session data:', data);
      return { success: true };
    }
    
    logger.warn('⚠️ No user in verify response:', data);
    return { success: false, error: 'رمز التحقق غير صحيح' };
  } catch (err: unknown) {
    logger.error('Error verifying OTP', err as Error, 'service');
    return { success: false, error: 'رمز التحقق غير صحيح' };
  }
}

// Guest phone verification functions
export async function verifyGuestPhone(phone: string): Promise<{ success: boolean; error?: string }> {
  return sendOTP(phone);
}

export async function confirmGuestPhone(phone: string, token: string): Promise<{ success: boolean; error?: string }> {
  return verifyOTP(phone, token);
}
