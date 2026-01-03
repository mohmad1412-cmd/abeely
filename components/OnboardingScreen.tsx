import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  BellOff, 
  ChevronLeft, 
  ChevronRight,
  Check,
  MapPin,
  Sparkles,
  AlertCircle,
  Grid3x3,
  X
} from 'lucide-react';
import { AVAILABLE_CATEGORIES } from '../data';
import { Category } from '../types';
import { BrandSpinner } from './ui/LoadingSkeleton';
import { Capacitor } from '@capacitor/core';

interface OnboardingScreenProps {
  onComplete: (preferences: {
    name: string;
    categories: string[];
    cities: string[];
    notificationsEnabled: boolean;
  }) => void;
  isLoading?: boolean;
  initialName?: string | null;
}

// قائمة المدن السعودية
const CITIES = [
  "الرياض", "جدة", "الدمام", "مكة", "المدينة", "الخبر", "أبها", "الطائف", "تبوك", "القصيم",
  "بريدة", "خميس مشيط", "الهفوف", "المبرز", "حفر الباطن", "حائل", "نجران", "الجبيل", "القطيف", "ينبع",
  "الخرج", "الثقبة", "عرعر", "جيزان", "القريات", "الظهران", "الباحة"
];

// مجموعات التصنيفات للعرض المنظم
const CATEGORY_GROUPS = [
  { 
    title: 'تقنية وتطوير', 
    ids: ['software-dev', 'web-dev', 'mobile-apps', 'it-support', 'ai-services'] 
  },
  { 
    title: 'تصميم وإبداع', 
    ids: ['graphic-design', 'ui-ux', 'logo-branding', 'interior-design', 'photography', 'videography'] 
  },
  { 
    title: 'صيانة ومنزل', 
    ids: ['plumbing', 'electrical', 'ac-services', 'home-repair', 'painting', 'home-cleaning'] 
  },
  { 
    title: 'نقل وتوصيل', 
    ids: ['moving', 'shipping', 'delivery', 'driver-services'] 
  },
  { 
    title: 'سيارات', 
    ids: ['car-repair', 'car-wash', 'car-rental'] 
  },
  { 
    title: 'تسويق ومحتوى', 
    ids: ['digital-marketing', 'social-media', 'content-writing', 'translation'] 
  },
  { 
    title: 'مناسبات', 
    ids: ['event-planning', 'catering', 'entertainment', 'flowers-decor'] 
  },
  { 
    title: 'خدمات مهنية', 
    ids: ['legal-services', 'accounting', 'consulting', 'hr-services'] 
  },
  { 
    title: 'صحة وجمال', 
    ids: ['medical-consult', 'nutrition', 'fitness', 'hair-styling', 'makeup'] 
  },
  { 
    title: 'تعليم', 
    ids: ['tutoring', 'online-courses', 'language-learning', 'skills-training'] 
  },
];

// خطوات الـ onboarding
type OnboardingStep = 'welcome' | 'name' | 'categories' | 'cities' | 'notifications' | 'complete';

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ 
  onComplete,
  isLoading = false,
  initialName = null
}) => {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [userName, setUserName] = useState(initialName || '');
  const [nameError, setNameError] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [showCategorySearch, setShowCategorySearch] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // تحقق من حالة إذن الإشعارات عند التحميل
  useEffect(() => {
    checkNotificationPermission();
  }, []);

  // التحقق من إذن الإشعارات
  const checkNotificationPermission = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Mobile: استخدام Capacitor Push Notifications (سيتم إضافتها لاحقاً)
        // حالياً نفترض أن المستخدم لم يمنح الإذن بعد
        setNotificationPermission('default');
      } else if ('Notification' in window) {
        // Web
        setNotificationPermission(Notification.permission as 'default' | 'granted' | 'denied');
      }
    } catch (error) {
      console.error('Error checking notification permission:', error);
    }
  };

  // طلب إذن الإشعارات
  const requestNotificationPermission = async () => {
    setIsRequestingPermission(true);
    
    try {
      if (Capacitor.isNativePlatform()) {
        // Mobile: سيتم التعامل معها لاحقاً عند إضافة PushNotifications plugin
        // حالياً نقبل كإذن ممنوح افتراضياً
        setNotificationPermission('granted');
        setNotificationsEnabled(true);
      } else if ('Notification' in window) {
        // Web
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission as 'default' | 'granted' | 'denied');
        setNotificationsEnabled(permission === 'granted');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // تبديل التصنيف
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // تبديل المدينة
  const toggleCity = (city: string) => {
    setSelectedCities(prev => 
      prev.includes(city) 
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  // الحصول على التصنيف بالـ ID
  const getCategoryById = (id: string): Category | undefined => {
    return AVAILABLE_CATEGORIES.find(cat => cat.id === id);
  };

  // التصنيفات المفلترة
  const filteredCategories = categorySearch 
    ? AVAILABLE_CATEGORIES.filter(cat => 
        cat.label.includes(categorySearch) || 
        cat.label_en?.toLowerCase().includes(categorySearch.toLowerCase())
      )
    : null;

  // المدن المفلترة
  const filteredCities = citySearch 
    ? CITIES.filter(city => city.includes(citySearch))
    : CITIES;

  // الانتقال للخطوة التالية
  const nextStep = () => {
    // إذا كنا في خطوة الاسم، تحقق من أن الاسم غير فارغ
    if (step === 'name') {
      const trimmedName = userName.trim();
      if (!trimmedName || trimmedName.length < 2) {
        setNameError('الرجاء إدخال اسم صحيح (حرفين على الأقل)');
        return;
      }
      setNameError('');
    }
    
    const steps: OnboardingStep[] = ['welcome', 'name', 'categories', 'cities', 'notifications', 'complete'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  // الرجوع للخطوة السابقة
  const prevStep = () => {
    const steps: OnboardingStep[] = ['welcome', 'name', 'categories', 'cities', 'notifications', 'complete'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  // إنهاء الـ onboarding
  const handleComplete = async () => {
    setIsSubmitting(true);
    
    try {
      await onComplete({
        name: userName.trim(),
        categories: selectedCategories,
        cities: selectedCities,
        notificationsEnabled: notificationsEnabled && notificationPermission === 'granted'
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  // حساب نسبة التقدم
  const getProgress = () => {
    const steps: OnboardingStep[] = ['welcome', 'name', 'categories', 'cities', 'notifications', 'complete'];
    return ((steps.indexOf(step)) / (steps.length - 1)) * 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#153659] via-[#0d7377] to-[#153659] flex flex-col relative overflow-hidden">
      {/* Loading Overlay */}
      {(isLoading || isSubmitting) && (
        <div className="absolute inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center">
          <BrandSpinner size="lg" />
        </div>
      )}

      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-40 -right-20 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* Safe area padding */}
      <div className="pt-[env(safe-area-inset-top,0px)]" />

      {/* Progress bar */}
      {step !== 'welcome' && step !== 'complete' && (
        <div className="px-6 pt-4">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-teal-400 to-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${getProgress()}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {/* Welcome Step */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center px-6 py-8"
            >
              {/* Logo */}
              <motion.div
                className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl border border-white/30 mb-8"
                animate={{ 
                  scale: [1, 1.05, 1],
                  rotate: [0, 3, -3, 0]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Sparkles size={48} className="text-white" />
              </motion.div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-white text-center mb-4">
                مرحباً بك في أبيلي! 🎉
              </h1>
              
              <p className="text-white/70 text-center text-lg mb-2 max-w-xs">
                خطوة واحدة بسيطة لتجربة أفضل
              </p>
              
              <p className="text-white/50 text-center text-sm mb-12 max-w-xs">
                حدد اهتماماتك وسنرسل لك إشعارات عندما يتم نشر طلبات تناسبك
              </p>

              {/* Features preview */}
              <div className="w-full max-w-sm space-y-3 mb-12">
                {[
                  { icon: Grid3x3, text: 'اختر التصنيفات اللي تهمك' },
                  { icon: MapPin, text: 'حدد المدن اللي تخدمها' },
                  { icon: Bell, text: 'فعّل الإشعارات لتبقى على اطلاع' }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-4 bg-white/10 rounded-2xl p-4 border border-white/10"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <item.icon size={20} className="text-white" />
                    </div>
                    <span className="text-white/90 font-medium">{item.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Start button */}
              <motion.button
                onClick={nextStep}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full max-w-sm py-4 px-6 rounded-2xl bg-white text-[#153659] font-bold text-lg shadow-xl shadow-black/20 flex items-center justify-center gap-2"
              >
                <span>يلا نبدأ!</span>
                <ChevronLeft size={20} />
              </motion.button>
            </motion.div>
          )}

          {/* Name Step */}
          {step === 'name' && (
            <motion.div
              key="name"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center px-6 py-8"
            >
              {/* Icon */}
              <motion.div
                className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-xl border border-white/30 mb-6"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="text-4xl">👤</span>
              </motion.div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white text-center mb-2">
                عرّفنا بنفسك! 🤝
              </h2>
              
              <p className="text-white/60 text-center text-sm mb-8 max-w-xs">
                أدخل اسمك اللي سيظهر للمستخدمين الآخرين
              </p>

              {/* Name Input */}
              <div className="w-full max-w-sm">
                <div className={`relative rounded-2xl overflow-hidden transition-all ${
                  nameError 
                    ? 'ring-2 ring-red-500 bg-red-500/10' 
                    : 'bg-white/10 focus-within:ring-2 focus-within:ring-teal-400'
                }`}>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => {
                      setUserName(e.target.value);
                      if (nameError) setNameError('');
                    }}
                    placeholder="اسمك هنا..."
                    className="w-full px-5 py-4 bg-transparent text-white text-lg placeholder:text-white/40 outline-none text-center"
                    autoFocus
                    maxLength={50}
                    dir="rtl"
                  />
                </div>
                
                {/* Error message */}
                {nameError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-2 mt-3 text-red-400 text-sm"
                  >
                    <AlertCircle size={16} />
                    <span>{nameError}</span>
                  </motion.div>
                )}

                {/* Helper text */}
                <p className="text-white/40 text-xs text-center mt-3">
                  مثال: محمد أحمد، أبو سلطان، شركة النور...
                </p>
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-3 w-full max-w-sm mt-10">
                <motion.button
                  onClick={prevStep}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-4 px-4 rounded-2xl bg-white/10 border border-white/20 text-white font-medium flex items-center justify-center gap-2"
                >
                  <ChevronRight size={18} />
                  <span>رجوع</span>
                </motion.button>
                <motion.button
                  onClick={nextStep}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!userName.trim()}
                  className={`flex-1 py-4 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                    userName.trim() 
                      ? 'bg-white text-[#153659] shadow-xl' 
                      : 'bg-white/20 text-white/50 cursor-not-allowed'
                  }`}
                >
                  <span>التالي</span>
                  <ChevronLeft size={18} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Categories Step */}
          {step === 'categories' && (
            <motion.div
              key="categories"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col px-4 py-6"
            >
              {/* Header */}
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-white mb-2">
                  اختر اهتماماتك 📋
                </h2>
                <p className="text-white/60 text-sm">
                  سنرسل لك إشعارات عند نشر طلبات في هذه التصنيفات
                </p>
              </div>

              {/* Selected count */}
              {selectedCategories.length > 0 && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-sm font-medium">
                    {selectedCategories.length} تصنيف محدد
                  </span>
                </div>
              )}

              {/* Search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="ابحث عن تصنيف..."
                  className="w-full py-3 px-4 pr-10 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/15 outline-none transition-all"
                />
                {categorySearch && (
                  <button 
                    onClick={() => setCategorySearch('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Categories list */}
              <div className="flex-1 overflow-y-auto -mx-4 px-4 pb-4">
                {categorySearch ? (
                  // نتائج البحث
                  <div className="grid grid-cols-2 gap-2">
                    {filteredCategories?.map(cat => (
                      <motion.button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        whileTap={{ scale: 0.95 }}
                        className={`p-3 rounded-xl text-right transition-all ${
                          selectedCategories.includes(cat.id)
                            ? 'bg-teal-500/30 border-2 border-teal-400'
                            : 'bg-white/10 border-2 border-transparent hover:bg-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{cat.emoji}</span>
                          <span className="text-white text-sm font-medium flex-1 truncate">{cat.label}</span>
                          {selectedCategories.includes(cat.id) && (
                            <Check size={16} className="text-teal-400 shrink-0" />
                          )}
                        </div>
                      </motion.button>
                    ))}
                    {filteredCategories?.length === 0 && (
                      <div className="col-span-2 text-center py-8 text-white/50">
                        لا توجد نتائج للبحث
                      </div>
                    )}
                  </div>
                ) : (
                  // عرض المجموعات
                  <div className="space-y-4">
                    {CATEGORY_GROUPS.map((group, groupIndex) => (
                      <div key={group.title}>
                        <h3 className="text-white/70 text-sm font-medium mb-2 px-1">
                          {group.title}
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {group.ids.map(id => {
                            const cat = getCategoryById(id);
                            if (!cat) return null;
                            return (
                              <motion.button
                                key={cat.id}
                                onClick={() => toggleCategory(cat.id)}
                                whileTap={{ scale: 0.95 }}
                                className={`p-3 rounded-xl text-right transition-all ${
                                  selectedCategories.includes(cat.id)
                                    ? 'bg-teal-500/30 border-2 border-teal-400'
                                    : 'bg-white/10 border-2 border-transparent hover:bg-white/15'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{cat.emoji}</span>
                                  <span className="text-white text-sm font-medium flex-1 truncate">{cat.label}</span>
                                  {selectedCategories.includes(cat.id) && (
                                    <Check size={16} className="text-teal-400 shrink-0" />
                                  )}
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-white/10">
                <button
                  onClick={prevStep}
                  className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium flex items-center gap-2 hover:bg-white/20 transition-colors"
                >
                  <ChevronRight size={18} />
                  <span>رجوع</span>
                </button>
                <button
                  onClick={nextStep}
                  className="flex-1 py-3 px-6 rounded-xl bg-white text-[#153659] font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>التالي</span>
                  <ChevronLeft size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Cities Step */}
          {step === 'cities' && (
            <motion.div
              key="cities"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col px-4 py-6"
            >
              {/* Header */}
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-white mb-2">
                  اختر المدن 📍
                </h2>
                <p className="text-white/60 text-sm">
                  حدد المدن التي تهتم بطلباتها
                </p>
              </div>

              {/* Selected count */}
              {selectedCities.length > 0 && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-sm font-medium">
                    {selectedCities.length} مدينة محددة
                  </span>
                </div>
              )}

              {/* Search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="ابحث عن مدينة..."
                  className="w-full py-3 px-4 pr-10 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/15 outline-none transition-all"
                />
                {citySearch && (
                  <button 
                    onClick={() => setCitySearch('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Cities grid */}
              <div className="flex-1 overflow-y-auto -mx-4 px-4 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  {filteredCities.map(city => (
                    <motion.button
                      key={city}
                      onClick={() => toggleCity(city)}
                      whileTap={{ scale: 0.95 }}
                      className={`p-3 rounded-xl text-center transition-all ${
                        selectedCities.includes(city)
                          ? 'bg-cyan-500/30 border-2 border-cyan-400'
                          : 'bg-white/10 border-2 border-transparent hover:bg-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-white text-sm font-medium">{city}</span>
                        {selectedCities.includes(city) && (
                          <Check size={14} className="text-cyan-400 shrink-0" />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
                {filteredCities.length === 0 && (
                  <div className="text-center py-8 text-white/50">
                    لا توجد نتائج للبحث
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-white/10">
                <button
                  onClick={prevStep}
                  className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium flex items-center gap-2 hover:bg-white/20 transition-colors"
                >
                  <ChevronRight size={18} />
                  <span>رجوع</span>
                </button>
                <button
                  onClick={nextStep}
                  className="flex-1 py-3 px-6 rounded-xl bg-white text-[#153659] font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>التالي</span>
                  <ChevronLeft size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Notifications Step */}
          {step === 'notifications' && (
            <motion.div
              key="notifications"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center px-6 py-8"
            >
              {/* Bell Icon */}
              <motion.div
                className={`w-28 h-28 rounded-full flex items-center justify-center mb-8 ${
                  notificationPermission === 'granted'
                    ? 'bg-gradient-to-br from-teal-400 to-cyan-500'
                    : 'bg-white/20'
                }`}
                animate={notificationPermission === 'granted' ? {
                  scale: [1, 1.1, 1],
                } : {
                  rotate: [-10, 10, -10, 10, 0],
                }}
                transition={{ 
                  duration: notificationPermission === 'granted' ? 0.5 : 2,
                  repeat: notificationPermission === 'granted' ? 0 : Infinity,
                  repeatDelay: 2
                }}
              >
                {notificationPermission === 'granted' ? (
                  <Bell size={56} className="text-white" />
                ) : (
                  <Bell size={56} className="text-white/70" />
                )}
              </motion.div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white text-center mb-3">
                {notificationPermission === 'granted' 
                  ? 'تم تفعيل الإشعارات! 🎉'
                  : 'فعّل الإشعارات 🔔'}
              </h2>

              {/* Description */}
              <p className="text-white/70 text-center text-base mb-6 max-w-xs leading-relaxed">
                {notificationPermission === 'granted' 
                  ? 'سنرسل لك إشعارات عند نشر طلبات جديدة تناسب اهتماماتك'
                  : 'عند تفعيل الإشعارات، ستصلك تنبيهات فورية عند نشر طلبات جديدة تناسب اهتماماتك'}
              </p>

              {/* Info Card */}
              <div className="w-full max-w-sm bg-white/10 rounded-2xl p-4 mb-8 border border-white/10">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                    <AlertCircle size={20} className="text-accent" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm mb-1">ملاحظة مهمة</h4>
                    <p className="text-white/60 text-xs leading-relaxed">
                      تأكد من تفعيل الإشعارات في إعدادات جهازك للتطبيق. بدون ذلك لن تصلك الإشعارات حتى لو فعّلتها هنا.
                    </p>
                  </div>
                </div>
              </div>

              {/* Permission Button */}
              {notificationPermission !== 'granted' && (
                <motion.button
                  onClick={requestNotificationPermission}
                  disabled={isRequestingPermission || notificationPermission === 'denied'}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full max-w-sm py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 mb-4 ${
                    notificationPermission === 'denied'
                      ? 'bg-red-500/20 text-red-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-xl shadow-teal-500/30'
                  }`}
                >
                  {isRequestingPermission ? (
                    <BrandSpinner size="sm" />
                  ) : notificationPermission === 'denied' ? (
                    <>
                      <BellOff size={22} />
                      <span>الإشعارات محظورة</span>
                    </>
                  ) : (
                    <>
                      <Bell size={22} />
                      <span>تفعيل الإشعارات</span>
                    </>
                  )}
                </motion.button>
              )}

              {/* Denied message */}
              {notificationPermission === 'denied' && (
                <p className="text-red-300/80 text-xs text-center max-w-xs mb-4">
                  تم حظر الإشعارات. يمكنك تفعيلها من إعدادات المتصفح أو الجهاز.
                </p>
              )}

              {/* Switch for notifications preference */}
              <div className="w-full max-w-sm flex items-center justify-between bg-white/10 rounded-xl p-4 mb-8">
                <div className="flex items-center gap-3">
                  <Bell size={20} className="text-white/70" />
                  <span className="text-white font-medium">إشعارات الاهتمامات</span>
                </div>
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    notificationsEnabled ? 'bg-teal-500' : 'bg-white/20'
                  }`}
                >
                  <motion.div
                    className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md"
                    animate={{ left: notificationsEnabled ? 28 : 4 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              {/* Navigation buttons */}
              <div className="w-full max-w-sm flex gap-3">
                <button
                  onClick={prevStep}
                  className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium flex items-center gap-2 hover:bg-white/20 transition-colors"
                >
                  <ChevronRight size={18} />
                  <span>رجوع</span>
                </button>
                <button
                  onClick={() => setStep('complete')}
                  className="flex-1 py-3 px-6 rounded-xl bg-white text-[#153659] font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>إنهاء</span>
                  <ChevronLeft size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <motion.div
              key="complete"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center px-6 py-8"
            >
              {/* Success Icon */}
              <motion.div
                className="w-28 h-28 rounded-full bg-primary flex items-center justify-center mb-8 shadow-2xl shadow-primary/30"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  <Check size={56} className="text-white" strokeWidth={3} />
                </motion.div>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-white text-center mb-3"
              >
                تم إعداد حسابك! 🎊
              </motion.h2>

              {/* Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full max-w-sm bg-white/10 rounded-2xl p-4 mb-8 border border-white/10"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">التصنيفات</span>
                    <span className="text-white font-medium">
                      {selectedCategories.length > 0 ? `${selectedCategories.length} تصنيف` : 'لم تحدد'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">المدن</span>
                    <span className="text-white font-medium">
                      {selectedCities.length > 0 ? `${selectedCities.length} مدينة` : 'لم تحدد'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">الإشعارات</span>
                    <span className={`font-medium ${
                      notificationsEnabled && notificationPermission === 'granted' 
                        ? 'text-primary' 
                        : 'text-white/50'
                    }`}>
                      {notificationsEnabled && notificationPermission === 'granted' ? 'مفعّلة ✓' : 'غير مفعّلة'}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Info */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-white/60 text-center text-sm mb-8 max-w-xs"
              >
                يمكنك تعديل اهتماماتك في أي وقت من الإعدادات
              </motion.p>

              {/* Start button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={handleComplete}
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full max-w-sm py-4 px-6 rounded-2xl bg-white text-[#153659] font-bold text-lg shadow-xl shadow-black/20 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <BrandSpinner size="sm" />
                ) : (
                  <>
                    <span>ابدأ الآن!</span>
                    <Sparkles size={20} />
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Safe area padding */}
      <div className="pb-[env(safe-area-inset-bottom,0px)]" />
    </div>
  );
};

