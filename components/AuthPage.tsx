import React, { useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronLeft,
  FileText,
  Lock,
  Mail,
  Shield,
  User,
  X,
} from "lucide-react";
import {
  isValidSaudiPhone,
  sendOTP,
  signInWithEmail,
  signInWithGooglePopup,
  signInWithOAuth,
  verifyOTP,
} from "../services/authService.ts";
import { BrandSpinner } from "./ui/LoadingSkeleton.tsx";
import { logger } from "../utils/logger.ts";
import { supabase } from "../services/supabaseClient.ts";

interface AuthPageProps {
  onAuthenticated: () => void;
  onGuestMode: () => void;
}

type AuthStep =
  | "welcome"
  | "phone"
  | "otp"
  | "email"
  | "email-sent"
  | "dev-login";

// Toast notification component
const AuthToast: React.FC<
  { message: string; type?: "error" | "info"; onClose: () => void }
> = ({ message, type = "error", onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: -50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -30, scale: 0.95 }}
    transition={{ type: "spring", stiffness: 400, damping: 30 }}
    className="fixed top-4 left-4 right-4 z-[200] mt-[env(safe-area-inset-top,0px)]"
  >
    <div
      className={`mx-auto max-w-sm ${
        type === "error"
          ? "bg-gradient-to-r from-red-500/90 to-orange-500/90"
          : "bg-gradient-to-r from-blue-500/90 to-cyan-500/90"
      } backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden`}
    >
      <div className="relative px-4 py-3 flex items-center gap-3">
        <motion.div
          className="absolute inset-0 bg-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.2, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="relative shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <AlertCircle size={22} className="text-white" />
        </div>
        <p className="relative flex-1 text-white text-sm font-medium leading-relaxed">
          {message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="relative shrink-0 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X size={16} className="text-white/80" />
        </button>
      </div>
      <motion.div
        className="h-1 bg-white/30"
        initial={{ scaleX: 1, originX: 0 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 4, ease: "linear" }}
      />
    </div>
  </motion.div>
);

// ترجمة رسائل الخطأ من Supabase للعربية
const translateAuthError = (error: string): string => {
  const errorMap: Record<string, string> = {
    "Token has expired or is invalid":
      "انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.",
    "Invalid OTP": "رمز التحقق غير صحيح",
    "OTP expired": "انتهت صلاحية رمز التحقق",
    "Phone number is invalid": "رقم الجوال غير صحيح",
    "Rate limit exceeded":
      "تم تجاوز الحد المسموح. انتظر قليلاً ثم حاول مرة أخرى.",
    "For security purposes, you can only request this after":
      "لأسباب أمنية، يمكنك طلب رمز جديد بعد",
    "Invalid login credentials": "بيانات الدخول غير صحيحة",
    "Email not confirmed": "البريد الإلكتروني غير مؤكد",
    "User not found": "المستخدم غير موجود",
  };

  // البحث عن ترجمة مطابقة أو جزئية
  for (const [key, value] of Object.entries(errorMap)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  return error;
};

export const AuthPage: React.FC<AuthPageProps> = (
  { onAuthenticated, onGuestMode },
) => {
  const [step, setStep] = useState<AuthStep>("welcome");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [devPassword, setDevPassword] = useState(""); // 🔧 للتطوير فقط
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"error" | "info">("error");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // OTP Cooldown Timer - 60 seconds between resends
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownIntervalRef = React.useRef<
    ReturnType<typeof setInterval> | null
  >(null);

  // Refs للتركيز التلقائي
  const phoneInputRef = React.useRef<HTMLInputElement>(null);
  const otpFirstInputRef = React.useRef<HTMLInputElement>(null);
  const successTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // تنظيف timeout عند إلغاء المكون
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownIntervalRef.current) {
              clearInterval(cooldownIntervalRef.current);
              cooldownIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, [resendCooldown]);

  // Auto-focus على الحقول عند فتح الصفحة
  useEffect(() => {
    if (step === "welcome") {
      // تركيز على حقل رقم الهاتف في شاشة الترحيب
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 100);
    } else if (step === "otp") {
      // تركيز على أول خانة OTP بعد تأخير قصير
      setTimeout(() => {
        otpFirstInputRef.current?.focus();
      }, 100);
    }
  }, [step]);

  // Handle phone submission
  const handlePhoneSubmit = async () => {
    // تنظيف الرقم من المسافات
    const cleanPhone = phone.replace(/\s/g, "");

    if (!isValidSaudiPhone(cleanPhone)) {
      setError("يرجى إدخال رقم جوال سعودي صحيح (9 أو 10 أرقام)");
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await sendOTP(cleanPhone);

    setIsLoading(false);

    if (result.success) {
      setStep("otp");
      setPhone(cleanPhone); // حفظ الرقم المنظف
      setResendCooldown(60); // بدء العد التنازلي 60 ثانية
    } else {
      // ترجمة رسالة الخطأ للعربية
      const translatedError = translateAuthError(
        result.error || "فشل إرسال رمز التحقق",
      );
      setError(translatedError);
    }
  };

  // Handle OTP verification
  const handleOTPVerify = async (otpOverride?: string) => {
    const otpToVerify = otpOverride || otp;

    if (otpToVerify.length !== 4) {
      setError("يرجى إدخال رمز التحقق المكون من 4 أرقام");
      return;
    }

    // منع إرسال متعدد
    if (isLoading) {
      console.log("⚠️ Already verifying, ignoring duplicate request");
      return;
    }

    // إلغاء أي timeout سابق
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }

    setIsLoading(true);
    setError("");
    setShowSuccess(false);

    try {
      // إضافة timeout للتحقق من OTP
      // زيادة المهلة للأرقام الاختبارية لأنها تحتاج لـ anonymous sign-in
      const isTestNumber = phone.startsWith("0555") ||
        phone.startsWith("555") ||
        phone.startsWith("+966555") || phone.includes("555") ||
        phone.startsWith("0551") || phone.startsWith("551") ||
        phone.startsWith("+966551") || phone.includes("5511111") ||
        phone.includes("1111111") || phone.includes("2222222");
      // زيادة المهلة إلى 15 ثانية للأرقام الاختبارية (تم تحسين السرعة)
      const timeoutDuration = isTestNumber ? 15000 : 12000; // 15 ثانية للأرقام الاختبارية، 12 ثانية للأرقام العادية

      const verifyPromise = verifyOTP(phone, otpToVerify);

      // استخدام AbortController بدلاً من Promise.race لتحسين التحكم
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<{ success: false; error: string }>((
        resolve,
      ) => {
        timeoutId = setTimeout(
          () =>
            resolve({
              success: false,
              error: "انتهت مهلة التحقق. يرجى المحاولة مرة أخرى.",
            }),
          timeoutDuration,
        );
      });

      const result = await Promise.race([verifyPromise, timeoutPromise]);

      // إلغاء timeout إذا اكتمل التحقق قبل انتهاء المهلة
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (result.success) {
        setShowSuccess(true);

        // 🔧 استدعاء onAuthenticated فوراً بدون انتظار أو تحقق إضافي
        // الـ authService.ts يتأكد من الجلسة، لا حاجة للتحقق مرة أخرى
        setTimeout(() => {
          setIsLoading(false);
          onAuthenticated();
        }, 300); // تأخير قصير فقط للـ UI animation
      } else {
        setIsLoading(false);
        const translatedError = translateAuthError(
          result.error || "رمز التحقق غير صحيح",
        );
        setError(translatedError);
        setOtp("");
        otpFirstInputRef.current?.focus();
      }
    } catch (error) {
      setIsLoading(false);
      logger.error("Error verifying OTP:", error);
      setError("حدث خطأ أثناء التحقق. يرجى المحاولة مرة أخرى.");
      setOtp("");
      otpFirstInputRef.current?.focus();
    }
  };

  // تفعيل Enter عند اكتمال الرقم (4 أرقام)
  useEffect(() => {
    if (step !== "otp") return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter" && otp.length === 4 && !isLoading && !showSuccess) {
        e.preventDefault();
        handleOTPVerify();
      }
    };

    globalThis.addEventListener("keydown", handleKeyPress);
    return () => globalThis.removeEventListener("keydown", handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, otp, isLoading, showSuccess]);

  // Handle email submission
  const handleEmailSubmit = async () => {
    if (!email || !email.includes("@")) {
      setError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await signInWithEmail(email);

    setIsLoading(false);

    if (result.success) {
      setStep("email-sent");
    } else {
      setError(result.error || "فشل إرسال رابط الدخول");
    }
  };

  // Handle OAuth sign in
  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    setError("");
    setIsLoading(true);

    if (provider === "google") {
      // استخدام Google popup الحقيقي
      setToastMessage("جاري فتح نافذة Google...");
      setToastType("info");

      const result = await signInWithGooglePopup();

      setIsLoading(false);

      if (result.success) {
        setToastMessage("تم تسجيل الدخول بنجاح! ✅");
        setToastType("info");
        setShowSuccess(true);

        setTimeout(() => {
          onAuthenticated();
        }, 800);
      } else if (result.error) {
        setToastMessage(result.error);
        setToastType("error");
      }
    } else {
      // Apple يستخدم redirect
      setToastMessage("جاري التحويل إلى Apple...");
      setToastType("info");

      const result = await signInWithOAuth(provider);

      if (!result.success && result.error) {
        setIsLoading(false);
        setToastMessage(result.error);
        setToastType("error");
      }
    }
  };

  // 🔧 DEV: تسجيل دخول مباشر بالإيميل وكلمة السر - للتطوير فقط
  const handleDevLogin = async () => {
    if (!email || !devPassword) {
      setError("يرجى إدخال الإيميل وكلمة السر");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // محاولة تسجيل الدخول أولاً
      const { data, error: signInError } = await supabase.auth
        .signInWithPassword({
          email,
          password: devPassword,
        });

      if (signInError) {
        // إذا كان المستخدم غير موجود، حاول إنشاءه
        if (signInError.message.includes("Invalid login credentials")) {
          logger.log("🔧 DEV: User not found, creating...");

          const { data: signUpData, error: signUpError } = await supabase.auth
            .signUp({
              email,
              password: devPassword,
            });

          if (signUpError) {
            setError("فشل إنشاء الحساب: " + signUpError.message);
            setIsLoading(false);
            return;
          }

          if (signUpData?.user) {
            logger.log("✅ DEV: User created, signing in...");
            // المستخدم الجديد - حاول تسجيل الدخول مرة أخرى
            const { data: retryData, error: retryError } = await supabase.auth
              .signInWithPassword({
                email,
                password: devPassword,
              });

            if (retryError) {
              // قد يحتاج لتأكيد الإيميل
              setError("تم إنشاء الحساب! يرجى المحاولة مرة أخرى.");
              setIsLoading(false);
              return;
            }

            // نجح تسجيل الدخول بعد إنشاء الحساب
            if (retryData?.user) {
              logger.log("✅ DEV: Login successful after signup!");
              setShowSuccess(true);
              setToastMessage("تم تسجيل الدخول! ✅");
              setToastType("info");
              setIsLoading(false);
              onAuthenticated();
              return;
            }
          }
        } else {
          setError(signInError.message);
          setIsLoading(false);
          return;
        }
      }

      // تسجيل الدخول نجح من المحاولة الأولى
      if (data?.user) {
        logger.log("✅ DEV: Login successful!");
        setShowSuccess(true);
        setToastMessage("تم تسجيل الدخول! ✅");
        setToastType("info");
        setIsLoading(false);
        onAuthenticated();
      }
    } catch (err) {
      logger.error("DEV Login error:", err);
      setError("حدث خطأ أثناء تسجيل الدخول");
      setIsLoading(false);
    }
  };

  // Go back
  const goBack = () => {
    setError("");
    if (step === "otp") {
      setStep("phone");
      setOtp("");
    } else if (
      step === "phone" || step === "email" || step === "email-sent" ||
      step === "dev-login"
    ) {
      setStep("welcome");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#153659] via-[#0d9488] to-[#153659] flex flex-col relative overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <BrandSpinner size="lg" />
            <p className="text-white/70 text-sm">جاري التحقق...</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <AuthToast
            message={toastMessage}
            type={toastType}
            onClose={() => setToastMessage(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="pt-[env(safe-area-inset-top,0px)]" />

      {/* Back Button - إخفاء عند النجاح في OTP */}
      <AnimatePresence>
        {step !== "welcome" && !(step === "otp" && showSuccess) && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={goBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 mt-[env(safe-area-inset-top,0px)] w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all text-white focus:outline-none bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg hover:bg-white/20"
          >
            <ArrowRight size={20} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Content */}
      <LayoutGroup>
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-10 overflow-hidden">
          {/* Logo - Animates position between steps - Responsive for 6.3" screens */}
          <motion.div
            layout
            className="mb-5 sm:mb-8"
            transition={{
              layout: {
                type: "spring",
                stiffness: 300,
                damping: 30,
              },
            }}
          >
            <motion.div
              layout
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl border border-white/30"
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0],
              }}
              transition={{
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                layout: { type: "spring", stiffness: 300, damping: 30 },
              }}
            >
              <span className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg">
                أ
              </span>
            </motion.div>
          </motion.div>

          {/* Title */}
          <AnimatePresence>
            {!(step === "otp" && showSuccess) && (
              <motion.div
                layout
                className="text-center mb-5 sm:mb-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  delay: 0.1,
                  layout: { type: "spring", stiffness: 300, damping: 30 },
                }}
              >
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-5">
                  {step === "welcome" && "مرحباً بك في أبيلي"}
                  {step === "otp" && "أدخل رمز التحقق"}
                  {step === "email" && "الدخول بالبريد الإلكتروني"}
                  {step === "email-sent" && "تفقد بريدك 📧"}
                </h1>
                <div className="text-white/70 text-sm px-2 space-y-3">
                  {step === "welcome" && (
                    <>
                      <p>السوق العكسي الذكي</p>
                      <p className="text-white/50">أنت تطلب والعروض تجيك ✨</p>
                    </>
                  )}
                  {step === "otp" && <p>{`أرسلنا رمز التحقق إلى ${phone}`}</p>}
                  {step === "email" && <p>سنرسل لك رابط دخول على بريدك</p>}
                  {step === "email-sent" && (
                    <p>{`أرسلنا رابط الدخول إلى ${email}`}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content Area */}
          <motion.div
            layout
            className="w-full max-w-sm min-w-0 overflow-hidden"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              delay: 0.2,
              layout: { type: "spring", stiffness: 300, damping: 30 },
            }}
          >
            <AnimatePresence mode="popLayout">
              {/* Welcome Screen - حقل إدخال الجوال مباشرة */}
              {step === "welcome" && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 35,
                  }}
                  className="space-y-5"
                >
                  {/* Phone Input Card - تصميم متناسق */}
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-xl overflow-hidden">
                    <div className="flex items-center gap-3 w-full" dir="ltr">
                      <div className="bg-white/20 rounded-xl px-4 py-3 text-white font-bold text-lg shrink-0 border border-white/10">
                        966+
                      </div>
                      <input
                        ref={phoneInputRef}
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          if (value.length <= 10) {
                            setPhone(value);
                          }
                        }}
                        placeholder="5XXXXXXXX"
                        dir="ltr"
                        data-testid="phone-input"
                        className="w-full min-w-0 py-3 px-4 rounded-xl bg-white/10 border border-white/20 text-white text-left text-xl font-semibold placeholder:text-white/30 placeholder:text-base placeholder:font-normal focus:border-white/50 focus:bg-white/15 outline-none transition-all"
                        maxLength={10}
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-300 text-sm text-center bg-red-500/10 rounded-xl py-2 px-4"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="button"
                    onClick={handlePhoneSubmit}
                    disabled={isLoading || !isValidSaudiPhone(phone)}
                    data-testid="send-otp-button"
                    className="w-full py-4 px-6 rounded-2xl bg-white/90 hover:bg-white text-[#153659] font-bold flex items-center justify-center gap-2 shadow-xl shadow-black/10 hover:shadow-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] text-base"
                  >
                    <span>إرسال رمز التحقق</span>
                    <ChevronLeft size={18} />
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-white/20"></div>
                    <span className="text-white/40 text-xs">أو</span>
                    <div className="flex-1 h-px bg-white/20"></div>
                  </div>

                  {/* Guest Mode - أوضح وأكثر تناسقاً */}
                  <button
                    type="button"
                    onClick={onGuestMode}
                    disabled={isLoading}
                    data-testid="guest-mode-button"
                    className="w-full py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 text-white/70 hover:text-white font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                  >
                    <User size={16} />
                    <span>تصفح كضيف</span>
                  </button>

                  {/* 🔧 DEV: زر تسجيل الدخول بالإيميل - للتطوير فقط */}
                  <button
                    type="button"
                    onClick={() => setStep("dev-login")}
                    disabled={isLoading}
                    className="w-full py-2 px-4 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 hover:text-yellow-200 text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Lock size={14} />
                    <span>🔧 DEV: دخول بالإيميل</span>
                  </button>

                  {/* Terms & Privacy Notice */}
                  <p className="text-white/50 text-[10px] text-center leading-relaxed mt-2">
                    بتسجيل دخولك، أنت توافق على{" "}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-white/80 underline underline-offset-2 hover:text-white transition-colors"
                    >
                      شروط الاستخدام
                    </button>{" "}
                    و{" "}
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="text-white/80 underline underline-offset-2 hover:text-white transition-colors"
                    >
                      سياسة الخصوصية
                    </button>
                  </p>

                  {
                    /* ============================================
                    خيارات الدخول المخفية مؤقتاً - يمكن إعادتها لاحقاً
                    لإعادة التفعيل: غيّر false إلى true
                    ============================================ */
                  }
                  {false && (
                    <>
                      {/* Google Login */}
                      <button
                        type="button"
                        onClick={() => handleOAuthSignIn("google")}
                        disabled={isLoading}
                        className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-white text-[#153659] font-bold flex items-center justify-center gap-2.5 sm:gap-3 shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 text-sm sm:text-base"
                      >
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6"
                          viewBox="0 0 24 24"
                        >
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        <span>الدخول عبر Google</span>
                      </button>

                      {/* Email Login */}
                      <button
                        type="button"
                        onClick={() => setStep("email")}
                        disabled={isLoading}
                        className="w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm sm:text-base"
                      >
                        <Mail size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span>الدخول بالبريد الإلكتروني</span>
                      </button>

                      {/* Apple Login */}
                      <button
                        type="button"
                        onClick={() => handleOAuthSignIn("apple")}
                        disabled={isLoading}
                        className="w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm sm:text-base"
                      >
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                        </svg>
                        <span>الدخول عبر Apple</span>
                      </button>
                    </>
                  )}
                  {/* ============================================ */}
                </motion.div>
              )}

              {/* Phone Input - محسن لشاشات 6.3 بوصة */}
              {step === "phone" && (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  className="space-y-3 sm:space-y-4"
                >
                  <div
                    className="relative flex items-center gap-2 w-full"
                    dir="ltr"
                  >
                    <div className="text-white/70 font-bold text-base sm:text-lg shrink-0">
                      +966
                    </div>
                    <input
                      ref={phoneInputRef}
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        // السماح بـ 0 في البداية أو بدون
                        const value = e.target.value.replace(/\D/g, "");
                        // يقبل حتى 10 أرقام (مع 0) أو 9 (بدون 0)
                        if (value.length <= 10) {
                          setPhone(value);
                        }
                      }}
                      placeholder="0501234567"
                      dir="ltr"
                      className="flex-1 min-w-0 py-3 sm:py-4 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-white/10 border-2 border-white/20 text-white text-left text-lg sm:text-xl font-medium placeholder:text-white/40 placeholder:text-sm sm:placeholder:text-base focus:border-white/50 outline-none transition-all"
                      maxLength={10}
                    />
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-300 text-xs sm:text-sm text-center"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="button"
                    onClick={handlePhoneSubmit}
                    disabled={isLoading || !isValidSaudiPhone(phone)}
                    className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-white text-[#153659] font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-sm sm:text-base"
                  >
                    <span>إرسال رمز التحقق</span>
                    <ChevronLeft size={18} />
                  </button>

                  {/* Terms & Privacy Notice */}
                  <p className="text-white/60 text-[10px] sm:text-xs text-center leading-relaxed">
                    بتسجيل دخولك، أنت توافق على{" "}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-white/90 underline underline-offset-2 hover:text-white transition-colors"
                    >
                      شروط الاستخدام
                    </button>{" "}
                    و{" "}
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="text-white/90 underline underline-offset-2 hover:text-white transition-colors"
                    >
                      سياسة الخصوصية
                    </button>
                  </p>
                </motion.div>
              )}

              {/* OTP Input - تصميم حديث وأنيق - محسن لشاشات 6.3 بوصة */}
              {step === "otp" && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  className="space-y-4 sm:space-y-6 relative"
                >
                  {/* OTP Boxes Container - إخفاء عند النجاح */}
                  <AnimatePresence>
                    {!showSuccess && (
                      <>
                        <motion.div
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0, scale: 0.9, y: -20 }}
                          transition={{ duration: 0.3 }}
                          className="relative"
                        >
                          {/* Glow effect behind inputs */}
                          <div className="absolute inset-0 bg-gradient-to-r from-teal-400/20 via-cyan-400/30 to-teal-400/20 blur-2xl rounded-3xl" />

                          <div
                            className="relative flex justify-center gap-2.5 sm:gap-4"
                            dir="ltr"
                          >
                            {[0, 1, 2, 3].map((i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{
                                  delay: i * 0.08,
                                  type: "spring",
                                  stiffness: 300,
                                }}
                                className="relative"
                              >
                                <input
                                  ref={i === 0 ? otpFirstInputRef : undefined}
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={1}
                                  value={otp[i] || ""}
                                  data-testid={`otp-input-${i}`}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(
                                      /\D/g,
                                      "",
                                    );
                                    const newOtp = otp.split("");
                                    newOtp[i] = val;
                                    const updatedOtp = newOtp.join("");
                                    setOtp(updatedOtp);

                                    // مسح الخطأ عند الكتابة
                                    if (error) setError("");

                                    // Auto-focus next input
                                    if (val && i < 3) {
                                      const next = document.querySelector(
                                        `input[data-index="${i + 1}"]`,
                                      ) as HTMLInputElement;
                                      next?.focus();
                                    }

                                    // Auto-verify when complete - استخدام updatedOtp مباشرة لتجنب مشاكل الـ closure
                                    if (
                                      updatedOtp.length === 4 && !isLoading &&
                                      !showSuccess
                                    ) {
                                      setTimeout(
                                        () =>
                                          handleOTPVerify(updatedOtp),
                                        100,
                                      );
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (
                                      e.key === "Backspace" && !otp[i] && i > 0
                                    ) {
                                      const prev = document.querySelector(
                                        `input[data-index="${i - 1}"]`,
                                      ) as HTMLInputElement;
                                      prev?.focus();
                                      if (error) setError("");
                                    } else if (e.key === "Enter") {
                                      // تفعيل Enter عند اكتمال الرقم (4 أرقام)
                                      const currentOtp = otp.split("");
                                      currentOtp[i] = e.currentTarget.value
                                        .replace(/\D/g, "");
                                      const fullOtp = currentOtp.join("");

                                      if (
                                        fullOtp.length === 4 && !isLoading &&
                                        !showSuccess
                                      ) {
                                        e.preventDefault();
                                        setOtp(fullOtp);
                                        handleOTPVerify(fullOtp);
                                      }
                                    }
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  data-index={i}
                                  className={`w-14 h-16 sm:w-16 sm:h-20 rounded-xl sm:rounded-2xl text-center text-2xl sm:text-3xl font-black outline-none transition-all duration-300 ${
                                    otp[i]
                                      ? "bg-white text-[#153659] shadow-xl shadow-white/30 border-2 border-white"
                                      : "bg-white/15 text-white border-2 border-white/30 hover:border-white/50 focus:border-white focus:bg-white/25"
                                  }`}
                                  style={{
                                    caretColor: "transparent",
                                  }}
                                />
                                {/* Dot indicator under each box */}
                                <motion.div
                                  className={`absolute -bottom-2 sm:-bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-300 ${
                                    otp[i]
                                      ? "bg-teal-400 shadow-lg shadow-teal-400/50"
                                      : "bg-white/30"
                                  }`}
                                  animate={otp[i] ? { scale: [1, 1.3, 1] } : {}}
                                  transition={{ duration: 0.3 }}
                                />
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>

                        {/* Progress bar */}
                        <motion.div
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          className="flex justify-center gap-1 mt-5 sm:mt-8"
                        >
                          {[0, 1, 2, 3].map((i) => (
                            <motion.div
                              key={i}
                              className={`h-0.5 sm:h-1 rounded-full transition-all duration-300 ${
                                i < otp.length
                                  ? "w-6 sm:w-8 bg-teal-400"
                                  : "w-3 sm:w-4 bg-white/20"
                              }`}
                              animate={i < otp.length
                                ? { opacity: [0.5, 1] }
                                : {}}
                            />
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>

                  {/* Success Flash Animation */}
                  <AnimatePresence>
                    {showSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{
                          duration: 0.4,
                          type: "spring",
                          stiffness: 200,
                        }}
                        className="flex flex-col items-center justify-center mt-6 sm:mt-8"
                      >
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: [0, 1.2, 1], rotate: 0 }}
                          transition={{ duration: 0.6, times: [0, 0.6, 1] }}
                          className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-primary flex items-center justify-center shadow-2xl shadow-primary/40"
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: "spring" }}
                          >
                            <Check
                              size={40}
                              className="text-white sm:hidden"
                              strokeWidth={3}
                            />
                            <Check
                              size={56}
                              className="text-white hidden sm:block"
                              strokeWidth={3}
                            />
                          </motion.div>
                        </motion.div>
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="mt-3 sm:mt-4 text-white font-bold text-lg sm:text-xl"
                        >
                          تم التحقق بنجاح
                        </motion.p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {error && !showSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3"
                    >
                      <AlertCircle
                        size={18}
                        className="text-red-300 shrink-0"
                      />
                      <p className="text-red-200 text-xs sm:text-sm">{error}</p>
                    </motion.div>
                  )}

                  {/* زر التأكيد - يظهر دائماً */}
                  <motion.button
                    type="button"
                    onClick={() => handleOTPVerify()}
                    disabled={isLoading || otp.length !== 4 || showSuccess}
                    data-testid="verify-otp-button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-3 sm:py-4 px-5 sm:px-6 rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 sm:gap-3 shadow-xl transition-all duration-300 disabled:cursor-not-allowed text-sm sm:text-base ${
                      showSuccess
                        ? "bg-primary text-white shadow-primary/30"
                        : otp.length === 4
                        ? "bg-white text-[#153659] hover:shadow-2xl hover:shadow-white/30"
                        : "bg-white/50 text-[#153659]/70"
                    }`}
                  >
                    {showSuccess
                      ? (
                        <>
                          <Check size={20} />
                          <span>جاري الدخول...</span>
                        </>
                      )
                      : (
                        <>
                          <Shield size={18} />
                          <span>تأكيد الدخول</span>
                        </>
                      )}
                  </motion.button>

                  {/* أزرار إعادة الإرسال وتغيير الرقم - إخفاء عند النجاح */}
                  <AnimatePresence>
                    {!showSuccess && (
                      <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center justify-center gap-1.5 sm:gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (resendCooldown === 0) {
                              handlePhoneSubmit();
                            }
                          }}
                          disabled={isLoading || resendCooldown > 0}
                          className={`py-1.5 px-3 sm:py-2 sm:px-4 text-xs sm:text-sm transition-colors disabled:opacity-50 ${
                            resendCooldown > 0
                              ? "text-white/40 cursor-not-allowed"
                              : "text-white/60 hover:text-white hover:underline"
                          }`}
                        >
                          {resendCooldown > 0
                            ? (
                              <span className="flex items-center gap-1">
                                <span>إعادة الإرسال</span>
                                <span className="font-mono bg-white/10 rounded px-1.5 py-0.5">
                                  {String(Math.floor(resendCooldown / 60))
                                    .padStart(1, "0")}:{String(
                                      resendCooldown % 60,
                                    ).padStart(2, "0")}
                                </span>
                              </span>
                            )
                            : (
                              "إعادة الإرسال"
                            )}
                        </button>
                        <span className="text-white/30">•</span>
                        <button
                          type="button"
                          onClick={goBack}
                          disabled={isLoading}
                          className="py-1.5 px-3 sm:py-2 sm:px-4 text-white/60 hover:text-white text-xs sm:text-sm transition-colors disabled:opacity-50 hover:underline"
                        >
                          تغيير الرقم
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Email Input - محسن لشاشات 6.3 بوصة */}
              {step === "email" && (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  className="space-y-3 sm:space-y-4"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    dir="ltr"
                    data-testid="email-input"
                    className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-white/10 border-2 border-white/20 text-white text-center text-base sm:text-lg placeholder:text-white/40 focus:border-white/50 outline-none transition-all"
                  />

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-300 text-xs sm:text-sm text-center"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="button"
                    onClick={handleEmailSubmit}
                    disabled={isLoading || !email.includes("@")}
                    data-testid="send-email-link-button"
                    className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-white text-[#153659] font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-sm sm:text-base"
                  >
                    <span>إرسال رابط الدخول</span>
                    <ChevronLeft size={18} />
                  </button>
                </motion.div>
              )}

              {/* 🔧 DEV: تسجيل دخول مباشر بالإيميل وكلمة السر */}
              {step === "dev-login" && (
                <motion.div
                  key="dev-login"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  className="space-y-4"
                >
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center">
                    <p className="text-yellow-300 text-xs">
                      🔧 وضع التطوير - للتجربة فقط
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                        size={18}
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="البريد الإلكتروني"
                        dir="ltr"
                        className="w-full py-3 px-4 pl-10 rounded-xl bg-white/10 border border-white/20 text-white text-left placeholder:text-white/40 focus:border-white/50 outline-none transition-all"
                      />
                    </div>

                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                        size={18}
                      />
                      <input
                        type="password"
                        value={devPassword}
                        onChange={(e) => setDevPassword(e.target.value)}
                        placeholder="كلمة السر"
                        dir="ltr"
                        className="w-full py-3 px-4 pl-10 rounded-xl bg-white/10 border border-white/20 text-white text-left placeholder:text-white/40 focus:border-white/50 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-300 text-sm text-center bg-red-500/10 rounded-xl py-2 px-4"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="button"
                    onClick={handleDevLogin}
                    disabled={isLoading || !email || !devPassword}
                    className="w-full py-4 px-6 rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold flex items-center justify-center gap-2 shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] text-base"
                  >
                    {isLoading ? <>جاري الدخول...</> : (
                      <>
                        <Lock size={18} />
                        <span>دخول</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={goBack}
                    disabled={isLoading}
                    className="w-full py-2 text-white/60 hover:text-white text-sm transition-colors"
                  >
                    العودة
                  </button>
                </motion.div>
              )}
              {/* Email Sent Confirmation - محسن لشاشات 6.3 بوصة */}
              {step === "email-sent" && (
                <motion.div
                  key="email-sent"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  className="text-center space-y-4 sm:space-y-6"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                    <Check size={32} className="text-primary sm:hidden" />
                    <Check size={40} className="text-primary hidden sm:block" />
                  </div>

                  <div>
                    <p className="text-white/80 mb-3 sm:mb-4 text-sm sm:text-base">
                      أرسلنا رابط الدخول إلى بريدك الإلكتروني
                    </p>
                    <p className="text-white/50 text-xs sm:text-sm">
                      افتح الرابط في البريد للدخول مباشرة
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep("welcome")}
                    className="text-white/60 hover:text-white text-xs sm:text-sm transition-colors"
                  >
                    العودة لخيارات الدخول
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </LayoutGroup>

      {/* Security Note - محسن لشاشات 6.3 بوصة */}
      <div className="pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-6 px-4 sm:px-6 text-center">
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-white/40 text-[10px] sm:text-xs">
          <Shield size={12} className="sm:w-[14px] sm:h-[14px]" />
          <span>بياناتك محمية ومشفرة بالكامل</span>
        </div>
      </div>

      {/* Terms of Service Modal */}
      <AnimatePresence>
        {showTermsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowTermsModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">شروط الاستخدام</h3>
                    <p className="text-xs text-muted-foreground">
                      آخر تحديث: يناير 2026
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                >
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm text-foreground leading-relaxed">
                <section>
                  <h4 className="font-bold text-base mb-2">
                    1. القبول بالشروط
                  </h4>
                  <p className="text-muted-foreground">
                    باستخدامك لمنصة أبيلي، فإنك توافق على الالتزام بهذه الشروط
                    والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يُرجى عدم
                    استخدام المنصة.
                  </p>
                </section>

                <section>
                  <h4 className="font-bold text-base mb-2">2. وصف الخدمة</h4>
                  <p className="text-muted-foreground">
                    أبيلي هي منصة سوق عكسي تربط بين طالبي الخدمات ومقدميها. نحن
                    نوفر البنية التحتية للتواصل ولا نتدخل في التفاصيل التعاقدية
                    بين الأطراف.
                  </p>
                </section>

                <section>
                  <h4 className="font-bold text-base mb-2">
                    3. مسؤوليات المستخدم
                  </h4>
                  <ul className="text-muted-foreground space-y-2 list-disc list-inside">
                    <li>تقديم معلومات صحيحة ودقيقة</li>
                    <li>عدم استخدام المنصة لأغراض غير قانونية</li>
                    <li>احترام الآخرين والتعامل بأخلاق مهنية</li>
                    <li>الحفاظ على سرية بيانات الحساب</li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-bold text-base mb-2">
                    4. حدود المسؤولية
                  </h4>
                  <p className="text-muted-foreground">
                    أبيلي ليست مسؤولة عن جودة الخدمات المقدمة من مقدمي الخدمات،
                    ولا عن أي نزاعات تنشأ بين المستخدمين. نحن نوفر أدوات للتقييم
                    والإبلاغ لضمان تجربة آمنة.
                  </p>
                </section>

                <section>
                  <h4 className="font-bold text-base mb-2">
                    5. الدفع والعمولات
                  </h4>
                  <p className="text-muted-foreground">
                    جميع المعاملات المالية تتم مباشرة بين المستخدمين. قد تفرض
                    أبيلي رسوم خدمة على بعض المعاملات، وسيتم الإعلان عنها بوضوح قبل
                    إتمام أي عملية.
                  </p>
                </section>

                <section>
                  <h4 className="font-bold text-base mb-2">6. إنهاء الحساب</h4>
                  <p className="text-muted-foreground">
                    يحق لنا تعليق أو إنهاء حسابك في حال مخالفة هذه الشروط، مع
                    إشعارك بالسبب عند الإمكان.
                  </p>
                </section>

                <section>
                  <h4 className="font-bold text-base mb-2">7. التعديلات</h4>
                  <p className="text-muted-foreground">
                    نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إشعارك بأي
                    تغييرات جوهرية عبر البريد الإلكتروني أو إشعار داخل التطبيق.
                  </p>
                </section>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
                >
                  فهمت، موافق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {showPrivacyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowPrivacyModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Lock size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">
                      سياسة الخصوصية
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      آخر تحديث: يناير 2026
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(false)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                >
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm text-foreground leading-relaxed">
                <section>
                  <h4 className="font-bold text-base mb-2">
                    1. البيانات التي نجمعها
                  </h4>
                  <ul className="text-muted-foreground space-y-2 list-disc list-inside">
                    <li>معلومات الحساب: الاسم، رقم الجوال، البريد الإلكتروني</li>
                    <li>بيانات الاستخدام: سجل الطلبات والعروض</li>
                    <li>معلومات الجهاز: نوع الجهاز، نظام التشغيل</li>
                    <li>الموقع الجغرافي: عند الموافقة فقط</li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-bold text-base mb-2">
                    2. كيف نستخدم بياناتك
                  </h4>
                  <ul className="text-muted-foreground space-y-2 list-disc list-inside">
                    <li>تقديم خدمات المنصة وتحسينها</li>
                    <li>التواصل معك بخصوص حسابك</li>
                    <li>إرسال إشعارات عن العروض والطلبات</li>
                    <li>تحليل الاستخدام لتطوير المنصة</li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-bold text-base mb-2">
                    3. مشاركة البيانات
                  </h4>
                  <p className="text-muted-foreground">
                    لا نبيع بياناتك لأطراف ثالثة. قد نشارك معلومات محدودة مع مقدمي
                    الخدمات الضروريين لتشغيل المنصة (مثل خدمات الرسائل النصية).
                  </p>
                </section>

                <section>
                  <h4 className="font-bold text-base mb-2">
                    4. حماية البيانات
                  </h4>
                  <p className="text-muted-foreground">
                    نستخدم تقنيات تشفير متقدمة لحماية بياناتك. جميع الاتصالات
                    مشفرة بتقنية SSL/TLS، ونخزن البيانات في خوادم آمنة.
                  </p>
                </section>

                <section>
                  <h4 className="font-bold text-base mb-2">5. حقوقك</h4>
                  <ul className="text-muted-foreground space-y-2 list-disc list-inside">
                    <li>الوصول إلى بياناتك الشخصية</li>
                    <li>تصحيح البيانات غير الدقيقة</li>
                    <li>طلب حذف حسابك وبياناتك</li>
                    <li>الانسحاب من الرسائل التسويقية</li>
                  </ul>
                </section>

                <section>
                  <h4 className="font-bold text-base mb-2">
                    6. ملفات تعريف الارتباط
                  </h4>
                  <p className="text-muted-foreground">
                    نستخدم ملفات تعريف الارتباط لتحسين تجربتك. يمكنك التحكم في
                    إعدادات الكوكيز من متصفحك، لكن قد يؤثر ذلك على بعض الوظائف.
                  </p>
                </section>

                <section>
                  <h4 className="font-bold text-base mb-2">7. التواصل معنا</h4>
                  <p className="text-muted-foreground">
                    لأي استفسارات حول الخصوصية، تواصل معنا عبر البريد الإلكتروني:
                    privacy@abily.sa
                  </p>
                </section>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(false)}
                  className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
                >
                  فهمت، موافق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
