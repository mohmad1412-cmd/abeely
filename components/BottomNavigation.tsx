import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { 
  Search, 
  FileText, 
  Briefcase, 
  Plus,
  DoorOpen,
  User,
  LogIn,
  LogOut,
  Settings,
  Moon,
  Sun,
  Globe,
  ChevronUp
} from "lucide-react";

export type BottomNavTab = "marketplace" | "my-requests" | "create" | "my-offers" | "profile";

interface BottomNavigationProps {
  activeTab: BottomNavTab;
  onTabChange: (tab: BottomNavTab) => void;
  onCreateRequest?: () => void;
  // User & Auth
  user?: any;
  isGuest?: boolean;
  onSignOut?: () => void;
  // Profile dropdown navigation
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  // Theme
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  onOpenLanguagePopup?: () => void;
  // نقطة إشعار على زر "أنت" عندما يحتاج المستخدم لإكمال ملفه الشخصي
  needsProfileSetup?: boolean;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  onCreateRequest,
  user,
  isGuest = false,
  onSignOut,
  onNavigateToProfile,
  onNavigateToSettings,
  isDarkMode = false,
  toggleTheme,
  onOpenLanguagePopup,
  needsProfileSetup = false,
}) => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ bottom: 0, right: 0 });

  // Update dropdown position when opening
  useEffect(() => {
    if (isProfileDropdownOpen && profileButtonRef.current) {
      const rect = profileButtonRef.current.getBoundingClientRect();
      const dropdownWidth = 224; // w-56 = 14rem = 224px
      const padding = 8;
      
      // للعربي - نستخدم left بدلاً من right لأن الاتجاه RTL
      // نضع الدروب داون على اليمين (قريب من زر "أنت")
      let leftPos = rect.left + (rect.width / 2) - (dropdownWidth / 2);
      
      // Make sure it doesn't go off the right edge
      if (leftPos + dropdownWidth > window.innerWidth - padding) {
        leftPos = window.innerWidth - dropdownWidth - padding;
      }
      
      // Make sure it doesn't go off the left edge
      if (leftPos < padding) {
        leftPos = padding;
      }
      
      setDropdownPosition({
        bottom: window.innerHeight - rect.top + 8,
        right: leftPos, // سنستخدمه كـ left في الـ style
      });
    }
  }, [isProfileDropdownOpen]);

  // Prevent body scroll when dropdown is open
  useEffect(() => {
    if (isProfileDropdownOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isProfileDropdownOpen]);

  const tabs = [
    { id: "marketplace" as BottomNavTab, label: "اكتشف", icon: Search },
    { id: "my-requests" as BottomNavTab, label: "طلباتي", icon: FileText },
    { id: "create" as BottomNavTab, label: "أنشئ طلب", icon: Plus, isCreate: true },
    { id: "my-offers" as BottomNavTab, label: "عروضي", icon: Briefcase },
    { id: "profile" as BottomNavTab, label: "أنت", icon: User, isProfile: true },
  ];

  const handleTabClick = (tabId: BottomNavTab) => {
    if (navigator.vibrate) navigator.vibrate(10);
    
    if (tabId === "create") {
      // زر إنشاء طلب - يفتح الصفحة مباشرة
      onCreateRequest?.();
    } else if (tabId === "profile") {
      // زر أنت - يفتح الدروب داون
      setIsProfileDropdownOpen(!isProfileDropdownOpen);
    } else {
      onTabChange(tabId);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border shadow-lg safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
          <LayoutGroup id="bottom-nav">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isCreate = tab.isCreate;
              const isProfile = tab.isProfile;
              
              // زر إنشاء طلب المميز - في المنتصف
              if (isCreate) {
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className="relative flex items-center justify-center h-full px-3"
                    whileTap={{ scale: 0.9 }}
                  >
                    {/* فقاعة التوجيه المتحركة - مباشرة فوق الزر */}
                    <motion.div
                      className="absolute bottom-full mb-2 inset-x-0 z-20 flex flex-col items-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: [0, 1, 1, 0],
                        y: [10, 0, 0, -5]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        repeatDelay: 8,
                        times: [0, 0.1, 0.9, 1],
                        ease: "easeInOut"
                      }}
                    >
                      {/* الفقاعة */}
                      <div className="relative bg-gradient-to-br from-primary to-teal-600 text-white text-[10px] font-bold px-3 py-2 rounded-xl shadow-lg shadow-primary/30 whitespace-nowrap">
                        <motion.span
                          animate={{ opacity: [0.7, 1, 0.7] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          ✨ أنشئ طلبك من هنا
                        </motion.span>
                      </div>
                      {/* سهم متحرك يؤشر للأسفل */}
                      <motion.div
                        className="text-primary mt-1"
                        animate={{ y: [0, 4, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
                          <path d="M8 12L0 0h16L8 12z" />
                        </svg>
                      </motion.div>
                    </motion.div>

                    {/* الزر المميز الفخم - بوسط الشريط */}
                    <motion.div
                      className="relative w-12 h-12 rounded-2xl bg-[linear-gradient(135deg,rgba(var(--foreground-rgb),0.42)_0%,rgba(var(--foreground-rgb),0.28)_55%,rgba(var(--foreground-rgb),0.18)_100%)] shadow-xl shadow-primary/20 flex items-center justify-center z-10 mx-auto"
                      whileHover={{ scale: 1.08, y: -3 }}
                      whileTap={{ scale: 0.95 }}
                      animate={{ 
                        boxShadow: [
                          "0 10px 40px -10px rgba(var(--foreground-rgb), 0.18)",
                          "0 15px 50px -10px rgba(var(--foreground-rgb), 0.26)",
                          "0 10px 40px -10px rgba(var(--foreground-rgb), 0.18)"
                        ]
                      }}
                      transition={{ 
                        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      }}
                    >
                      {/* External Pulsing Glow */}
                      <motion.div 
                        className="absolute -inset-2 rounded-3xl bg-[rgba(var(--foreground-rgb),0.18)] blur-xl -z-10"
                        animate={{ 
                          opacity: [0.3, 0.6, 0.3],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                      
                      {/* Internal Effects Container */}
                      <div className="absolute inset-0 rounded-2xl overflow-hidden">
                        {/* Subtle Glass Gradient - أقل إضاءة */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/20" />
                        
                        {/* Premium Border Highlight - نفس لون العنوان */}
                        <div className="absolute inset-0 rounded-2xl border border-[rgba(var(--foreground-rgb),0.8)]" />
                        
                        {/* Moving Shine Effect - أخف */}
                        <motion.div
                          className="absolute top-0 bottom-0 w-[200%] bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-25deg]"
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ 
                            repeat: Infinity, 
                            repeatDelay: 3, 
                            duration: 1.2, 
                            ease: "easeInOut" 
                          }}
                        />
                      </div>
                      
                      {/* Plus Icon with Glow */}
                      <motion.div
                        animate={{ rotate: [0, 90, 0] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Plus size={24} strokeWidth={2.5} className="text-white relative z-10 drop-shadow-lg" />
                      </motion.div>
                    </motion.div>
                  </motion.button>
                );
              }
              
              // زر أنت (الملف الشخصي)
              if (isProfile) {
                return (
                  <motion.button
                    key={tab.id}
                    ref={profileButtonRef}
                    onClick={() => handleTabClick(tab.id)}
                    className="relative flex flex-col items-center justify-center flex-1 h-full gap-1.5"
                    whileTap={{ scale: 0.94 }}
                  >
                    {/* أيقونة الملف الشخصي */}
                    <motion.div
                      animate={{
                        y: isProfileDropdownOpen ? -1 : 0,
                        scale: isProfileDropdownOpen ? 1.05 : 1,
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="relative flex items-center justify-center h-5"
                    >
                      {isGuest ? (
                        // للزائر - أيقونة الدخول تتحول للأخضر فقط عند فتح الدروب داون
                        <div className="relative flex items-center justify-center">
                          <LogIn 
                            size={18.5} 
                            className={`transition-colors duration-300 ${
                              isProfileDropdownOpen 
                                ? "text-primary" 
                                : "text-muted-foreground/40"
                            }`} 
                            strokeWidth={isProfileDropdownOpen ? 2 : 1.5} 
                          />
                          {/* Badge صغير جداً ومبسط مع سهم دخول - تم إزاحته لليمين أكثر لتوضيح الباب */}
                          <motion.div 
                            className="absolute -top-1.5 -right-3 w-3 h-3 rounded-full bg-white border border-primary/20 shadow-sm flex items-center justify-center"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                          >
                            <ChevronUp size={7} className="text-primary" strokeWidth={3} />
                          </motion.div>
                        </div>
                      ) : (
                        // لمسجل الدخول - صورة الملف الشخصي
                        <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary/30 overflow-hidden flex items-center justify-center">
                          {user?.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user?.display_name || "User"} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <span className="text-xs font-bold text-primary">
                              {user?.display_name?.charAt(0) || "م"}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Dropdown arrow indicator - فقط للمستخدمين المسجلين */}
                      {!isGuest && (
                        <motion.div 
                          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-card border border-border shadow-sm flex items-center justify-center"
                          animate={{ rotate: isProfileDropdownOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronUp size={10} strokeWidth={2.5} className="text-muted-foreground" />
                        </motion.div>
                      )}
                      {/* نقطة إشعار حمراء عندما يحتاج المستخدم لإكمال ملفه */}
                      {!isGuest && needsProfileSetup && (
                        <motion.div 
                          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-card shadow-md"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        />
                      )}
                    </motion.div>

                    {/* Label - على نفس مستوى الأزرار الأخرى */}
                    <div className="relative h-[22px] flex items-center">
                      <span 
                        className={`text-[10px] tracking-tight transition-all duration-300 ${
                          isProfileDropdownOpen 
                            ? "text-primary font-medium" 
                            : "text-muted-foreground/40 font-medium"
                        }`}
                      >
                        {tab.label}
                      </span>
                    </div>
                  </motion.button>
                );
              }
              
              // الأزرار العادية
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className="relative flex flex-col items-center justify-center flex-1 h-full gap-1.5"
                  whileTap={{ scale: 0.94 }}
                >
                  {/* Icon */}
                  <motion.div
                    animate={{
                      y: isActive ? -1 : 0,
                      scale: isActive ? 1.05 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`relative flex items-center justify-center transition-colors duration-300 ${
                      isActive ? "text-primary" : "text-muted-foreground/40"
                    }`}
                  >
                    <Icon 
                      size={20} 
                      strokeWidth={isActive ? 2.2 : 1.5}
                      className="transition-all duration-300"
                    />
                  </motion.div>

                  {/* Label with animated pill background */}
                  <div className="relative h-[22px] flex items-center">
                    {isActive && (
                      <motion.div
                        layoutId="bottom-nav-pill"
                        className="absolute inset-0 bg-primary rounded-full"
                        transition={{ 
                          type: "spring", 
                          stiffness: 400, 
                          damping: 30,
                          mass: 0.8
                        }}
                      />
                    )}
                    <span 
                      className={`relative z-10 block text-[10px] tracking-tight px-2.5 py-0.5 rounded-full transition-all duration-300 ${
                        isActive 
                          ? "text-white font-medium" 
                          : "text-muted-foreground/40 font-medium"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </LayoutGroup>
        </div>
      </nav>

      {/* Profile Dropdown - Opens Upward */}
      {isProfileDropdownOpen && ReactDOM.createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99998]"
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 touch-none pointer-events-auto bg-black/20" 
              onClick={(e) => {
                e.stopPropagation();
                setIsProfileDropdownOpen(false);
              }}
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              onWheel={(e) => e.preventDefault()}
              onTouchMove={(e) => e.preventDefault()}
              style={{ 
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none'
              }}
            />
            
            {/* Dropdown Menu - Opens Upward */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed w-56 bg-card rounded-2xl border border-border shadow-2xl overflow-hidden pointer-events-auto"
              style={{ 
                bottom: dropdownPosition.bottom,
                left: dropdownPosition.right, // استخدام left بدلاً من right للـ RTL
                zIndex: 99999,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* User Info - فقط للمستخدمين المسجلين */}
              {!isGuest && (
                <div className="p-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 bg-primary/10 border border-primary/20">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt={user?.display_name || "User"} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-primary">{user?.display_name?.charAt(0) || "؟"}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* إذا كان الاسم فارغ، أظهر تنبيه بحدود حمراء */}
                      {!user?.display_name ? (
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            onNavigateToProfile?.();
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border-2 border-dashed border-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
                        >
                          <p className="font-bold text-xs text-red-600 dark:text-red-400">
                            ⚠️ أدخل اسمك
                          </p>
                          <p className="text-[10px] text-red-500/70 dark:text-red-400/70">
                            اضغط هنا لإكمال ملفك
                          </p>
                        </button>
                      ) : (
                        <>
                          <p className="font-bold text-sm text-foreground truncate">
                            {user?.display_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user?.email || user?.phone || ""}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Menu Items */}
              <div className="p-2">
                {!isGuest && (
                  <>
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onNavigateToProfile?.();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
                    >
                      <User size={18} className="text-muted-foreground" />
                      <span>الملف الشخصي</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onNavigateToSettings?.();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
                    >
                      <Settings size={18} className="text-muted-foreground" />
                      <span>الإعدادات</span>
                    </button>
                    
                    <div className="my-1 border-t border-border/50" />
                  </>
                )}
                
                {/* Theme & Language Section */}
                <div className="flex items-center gap-2 px-2 py-1.5">
                  {/* Dark Mode Toggle */}
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(10);
                      toggleTheme?.();
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isDarkMode 
                        ? 'bg-white/10 text-white hover:bg-white/20' 
                        : 'bg-gray-900/20 text-gray-900 hover:bg-gray-900/30'
                    }`}
                  >
                    {isDarkMode ? (
                      <Sun size={16} />
                    ) : (
                      <Moon size={16} />
                    )}
                    <span className="text-xs">{isDarkMode ? 'نهاري' : 'ليلي'}</span>
                  </button>
                  
                  {/* Language Toggle */}
                  <button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(10);
                      setIsProfileDropdownOpen(false);
                      onOpenLanguagePopup?.();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-secondary/50 text-muted-foreground hover:bg-secondary transition-all"
                  >
                    <Globe size={16} />
                    <span className="text-xs">العربية</span>
                  </button>
                </div>
                
                <div className="my-1 border-t border-border/50" />
                
                {/* Sign Out / Sign In Button */}
                <button
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    onSignOut?.();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isGuest 
                      ? 'text-primary hover:bg-primary/10' 
                      : 'text-red-500 hover:bg-red-500/10'
                  }`}
                >
                  {isGuest ? (
                    <>
                      <LogIn size={18} />
                      <span>تسجيل الدخول</span>
                    </>
                  ) : (
                    <>
                      <LogOut size={18} />
                      <span>تسجيل الخروج</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
