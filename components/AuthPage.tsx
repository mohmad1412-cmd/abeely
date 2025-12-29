import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
  Phone, 
  Mail, 
  ArrowRight, 
  Check, 
  User,
  ChevronLeft,
  Shield,
  AlertCircle,
  X
} from 'lucide-react';
import {
  sendOTP,
  verifyOTP,
  signInWithOAuth,
  signInWithEmail,
  isValidSaudiPhone,
} from '../services/authService';
import { BrandSpinner } from './ui/LoadingSkeleton';

interface AuthPageProps {
  onAuthenticated: () => void;
  onGuestMode: () => void;
}

type AuthStep = 'welcome' | 'phone' | 'otp' | 'email' | 'email-sent';

// Toast notification component
const AuthToast: React.FC<{ message: string; type?: 'error' | 'info'; onClose: () => void }> = ({ message, type = 'error', onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: -50, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -30, scale: 0.95 }}
    transition={{ type: "spring", stiffness: 400, damping: 30 }}
    className="fixed top-4 left-4 right-4 z-[200] mt-[env(safe-area-inset-top,0px)]"
  >
    <div className={`mx-auto max-w-sm ${type === 'error' ? 'bg-gradient-to-r from-red-500/90 to-orange-500/90' : 'bg-gradient-to-r from-blue-500/90 to-cyan-500/90'} backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden`}>
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

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated, onGuestMode }) => {
  const [step, setStep] = useState<AuthStep>('welcome');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'error' | 'info'>('error');
  const [showSuccess, setShowSuccess] = useState(false);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle phone submission
  const handlePhoneSubmit = async () => {
    // تنظيف الرقم من المسافات
    const cleanPhone = phone.replace(/\s/g, '');
    
    if (!isValidSaudiPhone(cleanPhone)) {
      setError('يرجى إدخال رقم جوال سعودي صحيح (9 أو 10 أرقام)');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await sendOTP(cleanPhone);
    
    setIsLoading(false);
    
    if (result.success) {
      setStep('otp');
      setPhone(cleanPhone); // حفظ الرقم المنظف
    } else {
      setError(result.error || 'فشل إرسال رمز التحقق');
    }
  };

  // Handle OTP verification
  const handleOTPVerify = async () => {
    if (otp.length !== 6) {
      setError('يرجى إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }

    setIsLoading(true);
    setError('');
    setShowSuccess(false);

    const result = await verifyOTP(phone, otp);
    
    setIsLoading(false);
    
    if (result.success) {
      // إظهار ومضة النجاح
      setShowSuccess(true);
      
      // الانتقال بعد ثانية واحدة
      setTimeout(() => {
        onAuthenticated();
      }, 1000);
    } else {
      setError(result.error || 'رمز التحقق غير صحيح');
    }
  };

  // تفعيل Enter عند اكتمال الرقم (6 أرقام)
  useEffect(() => {
    if (step !== 'otp') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && otp.length === 6 && !isLoading && !showSuccess) {
        e.preventDefault();
        handleOTPVerify();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, otp, isLoading, showSuccess]);

  // Handle email submission
  const handleEmailSubmit = async () => {
    if (!email || !email.includes('@')) {
      setError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await signInWithEmail(email);
    
    setIsLoading(false);
    
    if (result.success) {
      setStep('email-sent');
    } else {
      setError(result.error || 'فشل إرسال رابط الدخول');
    }
  };

  // Handle OAuth sign in (Google/Apple) - يستخدم redirect مباشرة
  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    setError('');
    setIsLoading(true);
    setToastMessage(`جاري التحويل إلى ${provider === 'google' ? 'Google' : 'Apple'}...`);
    setToastType('info');
    
    const result = await signInWithOAuth(provider);
    
    // لن نصل هنا عادةً لأن المتصفح سيعيد التوجيه
    // لكن في حالة الخطأ:
    if (!result.success && result.error) {
      setIsLoading(false);
      setToastMessage(result.error);
      setToastType('error');
    }
  };

  // Go back
  const goBack = () => {
    setError('');
    if (step === 'otp') {
      setStep('phone');
      setOtp('');
    } else if (step === 'phone' || step === 'email' || step === 'email-sent') {
      setStep('welcome');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#153659] via-[#0d9488] to-[#153659] flex flex-col relative">
      {isLoading && (
        <div className="absolute inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <BrandSpinner size="lg" />
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
      
      {/* Back Button */}
      <AnimatePresence>
        {step !== 'welcome' && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={goBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="absolute top-4 right-4 mt-[env(safe-area-inset-top,0px)] w-10 h-10 rounded-full flex items-center justify-center transition-all text-white focus:outline-none bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg hover:bg-white/20"
          >
            <ArrowRight size={22} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Content */}
      <LayoutGroup>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo - Animates position between steps */}
        <motion.div
          layout
          className="mb-8"
          transition={{ 
            layout: { 
              type: "spring",
              stiffness: 300,
              damping: 30
            }
          }}
        >
          <motion.div
            layout
            className="w-28 h-28 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl border border-white/30"
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ 
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              rotate: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              layout: { type: "spring", stiffness: 300, damping: 30 }
            }}
          >
            <span className="text-6xl font-black text-white drop-shadow-lg">أ</span>
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.div
          layout
          className="text-center mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            delay: 0.1,
            layout: { type: "spring", stiffness: 300, damping: 30 }
          }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            {step === 'welcome' && 'مرحباً بك في أبيلي'}
            {step === 'phone' && 'الدخول برقم الجوال'}
            {step === 'otp' && 'أدخل رمز التحقق'}
            {step === 'email' && 'الدخول بالبريد الإلكتروني'}
            {step === 'email-sent' && 'تفقد بريدك 📧'}
          </h1>
          <p className="text-white/70 text-sm">
            {step === 'welcome' && 'السوق العكسي الذكي - أنت تطلب والعروض تجيك'}
            {step === 'phone' && 'سنرسل لك رمز تحقق على رقم جوالك'}
            {step === 'otp' && `أرسلنا رمز التحقق إلى ${phone}`}
            {step === 'email' && 'سنرسل لك رابط دخول على بريدك'}
            {step === 'email-sent' && `أرسلنا رابط الدخول إلى ${email}`}
          </p>
        </motion.div>

        {/* Content Area */}
        <motion.div
          layout
          className="w-full max-w-sm"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            delay: 0.2,
            layout: { type: "spring", stiffness: 300, damping: 30 }
          }}
        >
          <AnimatePresence mode="popLayout">
            {/* Welcome Screen */}
            {step === 'welcome' && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ 
                  type: "spring",
                  stiffness: 400,
                  damping: 35
                }}
                className="space-y-4"
              >
                {/* Google Login - Primary */}
                <button
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={isLoading}
                  className="w-full py-4 px-6 rounded-2xl bg-white text-[#153659] font-bold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>الدخول عبر Google</span>
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-white/20" />
                  <span className="text-white/50 text-sm">أو</span>
                  <div className="flex-1 h-px bg-white/20" />
                </div>

                {/* Phone Login */}
                <button
                  onClick={() => setStep('phone')}
                  disabled={isLoading}
                  className="w-full py-3 px-6 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Phone size={18} />
                  <span>الدخول برقم الجوال</span>
                </button>

                {/* Email Login */}
                <button
                  onClick={() => setStep('email')}
                  disabled={isLoading}
                  className="w-full py-3 px-6 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Mail size={18} />
                  <span>الدخول بالبريد الإلكتروني</span>
                </button>

                {/* Apple Login */}
                <button
                  onClick={() => handleOAuthSignIn('apple')}
                  disabled={isLoading}
                  className="w-full py-3 px-6 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <span>الدخول عبر Apple</span>
                </button>

                {/* Guest Mode */}
                <div className="pt-4">
                  <button
                    onClick={onGuestMode}
                    disabled={isLoading}
                    className="w-full py-3 px-6 rounded-xl border-2 border-white/30 text-white font-medium flex items-center justify-center gap-2 hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    <User size={18} />
                    <span>الاستمرار كضيف</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Phone Input */}
            {step === 'phone' && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="space-y-4"
              >
                <div className="relative flex items-center gap-2" dir="ltr">
                  <div className="text-white/70 font-bold text-lg shrink-0">
                    +966
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      // السماح بـ 0 في البداية أو بدون
                      const value = e.target.value.replace(/\D/g, '');
                      // يقبل حتى 10 أرقام (مع 0) أو 9 (بدون 0)
                      if (value.length <= 10) {
                        setPhone(value);
                      }
                    }}
                    placeholder="0501234567 أو 501234567"
                    dir="ltr"
                    className="flex-1 py-4 px-4 rounded-2xl bg-white/10 border-2 border-white/20 text-white text-left text-xl font-medium placeholder:text-white/40 focus:border-white/50 outline-none transition-all"
                    maxLength={10}
                  />
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-300 text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  onClick={handlePhoneSubmit}
                  disabled={isLoading || !isValidSaudiPhone(phone)}
                  className="w-full py-4 px-6 rounded-2xl bg-white text-[#153659] font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  <span>إرسال رمز التحقق</span>
                  <ChevronLeft size={20} />
                </button>
              </motion.div>
            )}

            {/* OTP Input */}
            {step === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="space-y-4 relative"
              >
                <div className="flex justify-center gap-2" dir="ltr">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <input
                      key={i}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[i] || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        const newOtp = otp.split('');
                        newOtp[i] = val;
                        const updatedOtp = newOtp.join('');
                        setOtp(updatedOtp);
                        
                        // Auto-focus next input
                        if (val && i < 5) {
                          const next = document.querySelector(`input[data-index="${i + 1}"]`) as HTMLInputElement;
                          next?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !otp[i] && i > 0) {
                          const prev = document.querySelector(`input[data-index="${i - 1}"]`) as HTMLInputElement;
                          prev?.focus();
                        } else if (e.key === 'Enter') {
                          // تفعيل Enter عند اكتمال الرقم (6 أرقام)
                          const currentOtp = otp.split('');
                          currentOtp[i] = e.currentTarget.value.replace(/\D/g, '');
                          const fullOtp = currentOtp.join('');
                          
                          if (fullOtp.length === 6 && !isLoading && !showSuccess) {
                            e.preventDefault();
                            setOtp(fullOtp);
                            // تأخير بسيط للتأكد من تحديث state
                            setTimeout(() => {
                              handleOTPVerify();
                            }, 50);
                          }
                        }
                      }}
                      data-index={i}
                      className="w-12 h-14 rounded-xl bg-white/10 border-2 border-white/20 text-white text-center text-2xl font-bold focus:border-white/50 outline-none transition-all"
                    />
                  ))}
                </div>

                {/* Success Flash Animation */}
                <AnimatePresence>
                  {showSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                      className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.2, 1] }}
                        transition={{ duration: 0.5, times: [0, 0.5, 1] }}
                        className="w-24 h-24 rounded-full bg-green-500/90 backdrop-blur-xl flex items-center justify-center shadow-2xl border-4 border-white/30"
                      >
                        <motion.div
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                        >
                          <Check size={48} className="text-white" strokeWidth={4} />
                        </motion.div>
                      </motion.div>
                      <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="absolute top-1/2 mt-20 text-white font-bold text-lg"
                      >
                        تم التحقق بنجاح! ✅
                      </motion.p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && !showSuccess && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-300 text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  onClick={handleOTPVerify}
                  disabled={isLoading || otp.length !== 6 || showSuccess}
                  className="w-full py-4 px-6 rounded-2xl bg-white text-[#153659] font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {showSuccess ? (
                    <>
                      <Check size={22} className="text-green-500" />
                      <span className="text-green-500">تم التحقق</span>
                    </>
                  ) : (
                    <>
                      <Check size={22} />
                      <span>تأكيد الدخول</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handlePhoneSubmit()}
                  disabled={isLoading}
                  className="w-full py-3 text-white/60 hover:text-white text-sm transition-colors disabled:opacity-50"
                >
                  لم يصلك الرمز؟ إعادة الإرسال
                </button>
              </motion.div>
            )}

            {/* Email Input */}
            {step === 'email' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="space-y-4"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  dir="ltr"
                  className="w-full py-4 px-6 rounded-2xl bg-white/10 border-2 border-white/20 text-white text-center text-lg placeholder:text-white/40 focus:border-white/50 outline-none transition-all"
                />

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-300 text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  onClick={handleEmailSubmit}
                  disabled={isLoading || !email.includes('@')}
                  className="w-full py-4 px-6 rounded-2xl bg-white text-[#153659] font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  <span>إرسال رابط الدخول</span>
                  <ChevronLeft size={20} />
                </button>
              </motion.div>
            )}

            {/* Email Sent Confirmation */}
            {step === 'email-sent' && (
              <motion.div
                key="email-sent"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="text-center space-y-6"
              >
                <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check size={40} className="text-green-400" />
                </div>
                
                <div>
                  <p className="text-white/80 mb-4">
                    أرسلنا رابط الدخول إلى بريدك الإلكتروني
                  </p>
                  <p className="text-white/50 text-sm">
                    افتح الرابط في البريد للدخول مباشرة
                  </p>
                </div>

                <button
                  onClick={() => setStep('welcome')}
                  className="text-white/60 hover:text-white text-sm transition-colors"
                >
                  العودة لخيارات الدخول
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      </LayoutGroup>

      {/* Security Note */}
      <div className="pb-8 px-6 text-center pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
          <Shield size={14} />
          <span>بياناتك محمية ومشفرة بالكامل</span>
        </div>
      </div>
    </div>
  );
};
