import { supabase } from './supabaseClient';

// ======================================
// 🔧 Test Phones - أرقام الاختبار
// ======================================
// أرقام وهمية للتطوير والاختبار - تعمل مع رمز 0000
// لتفعيل: أي رقم يبدأ بـ 555 مثل 0555555555
// ملاحظة: تعمل في جميع البيئات للاختبار
const TEST_PHONE_PREFIX = '555'; // أي رقم يبدأ بـ 555 يعتبر رقم اختبار
const TEST_OTP_CODE = '0000';

function isTestPhone(phone: string): boolean {
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
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          disableAutoSelect: () => void;
        };
        oauth2: {
          initTokenClient: (config: any) => any;
          initCodeClient: (config: any) => any;
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
      
      console.log("🔐 Starting Google popup sign-in...");

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
        console.error("❌ OAuth error:", error);
        resolve({ success: false, error: error.message });
        return;
      }

      if (!data?.url) {
        resolve({ success: false, error: 'فشل الحصول على رابط الدخول' });
        return;
      }

      console.log("✅ Got OAuth URL, opening popup...");
      
      // فتح popup
      const popup = openPopupWindow(data.url, 'google_signin');
      
      if (!popup) {
        console.error("❌ Popup blocked!");
        resolve({ success: false, error: 'تم حظر النافذة المنبثقة. يرجى السماح للنوافذ المنبثقة.' });
        return;
      }

      // الاستماع لتغييرات auth state
      let resolved = false;
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log("🔐 Auth state in popup flow:", event);
        
        if (event === 'SIGNED_IN' && session?.user && !resolved) {
          resolved = true;
          console.log("✅ User signed in via popup:", session.user.email);
          
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
          console.log("⚠️ Popup closed by user");
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

    } catch (err: any) {
      console.error('❌ Google Sign-In exception:', err);
      resolve({ success: false, error: err.message || 'حدث خطأ أثناء تسجيل الدخول' });
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
    
    console.log("🔐 Starting OAuth redirect to:", redirectUrl);

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

    // Web: استخدام redirect في نفس النافذة
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
    // المتصفح سيعيد التوجيه تلقائياً في نفس النافذة
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
        console.error('Error creating profile:', upsertError);
        return null;
      }

      profile = upserted as any;
    }

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
      console.error('❌ Error updating profile:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Profile updated:', data);
    return { success: true, data: data as UserProfile };
  } catch (err: any) {
    console.error('❌ Exception updating profile:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء تحديث الملف الشخصي' };
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
 * 
 * 🔧 للتطوير: الأرقام التي تبدأ بـ 555 (مثل 0555555555) تعتبر أرقام اختبار
 *    ويمكن استخدام الرمز 0000 للدخول
 */
export async function sendOTP(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    // تنسيق الرقم للصيغة الدولية
    const formattedPhone = formatPhoneToInternational(phone);
    
    console.log('📱 Sending OTP to:', formattedPhone);
    
    // 🔧 وضع التطوير - أرقام الاختبار
    if (isTestPhone(phone)) {
      console.log('🔧 DEV MODE: Test phone detected, skipping real SMS');
      console.log('🔑 Use OTP code: 0000');
      return { success: true };
    }
    
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
 * 
 * 🔧 للتطوير: الأرقام التي تبدأ بـ 555 تقبل الرمز 0000
 */
export async function verifyOTP(phone: string, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    // تنسيق الرقم للصيغة الدولية
    const formattedPhone = formatPhoneToInternational(phone);
    
    console.log('🔐 Verifying OTP for:', formattedPhone);
    
    // 🔧 وضع التطوير - أرقام الاختبار
    if (isTestPhone(phone)) {
      console.log('🔧 DEV MODE: Test phone verification');
      
      if (token === TEST_OTP_CODE) {
        console.log('✅ DEV MODE: Test OTP accepted');
        
        // إنشاء مستخدم وهمي للتطوير عبر signInAnonymously
        // يجب تفعيل Anonymous Auth في Supabase Dashboard:
        // Authentication → Settings → Anonymous Sign Ins → Enable
        try {
          const { data, error } = await supabase.auth.signInAnonymously();
          
          if (error) {
            console.error('❌ Anonymous sign-in error:', error);
            console.log('💡 تأكد من تفعيل Anonymous Auth في Supabase Dashboard');
            console.log('   Authentication → Settings → Enable Anonymous Sign Ins');
            
            // Fallback: استخدام guest mode مع تخزين الرقم
            localStorage.setItem('dev_test_phone', formattedPhone);
            localStorage.setItem('abeely_guest_mode', 'true');
            return { success: true };
          }
          
          if (data.user) {
            console.log('✅ DEV MODE: Anonymous user created:', data.user.id);
            
            // محاولة إنشاء profile للمستخدم
            await supabase.from('profiles').upsert({
              id: data.user.id,
              phone: formattedPhone,
              display_name: 'مستخدم اختبار',
              role: 'user',
              is_guest: false,
              is_verified: true,
            }).then(() => console.log('✅ Profile created'))
              .catch(() => console.log('Profile creation skipped'));
            
            return { success: true };
          }
        } catch (e) {
          console.error('❌ Dev auth error:', e);
          // Fallback لـ guest mode
          localStorage.setItem('abeely_guest_mode', 'true');
        }
        
        return { success: true };
      } else {
        console.log('❌ DEV MODE: Wrong test OTP (expected 0000)');
        return { success: false, error: 'رمز التحقق غير صحيح (استخدم 0000 للأرقام الوهمية)' };
      }
    }
    
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
