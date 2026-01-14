import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  Briefcase,
  ChevronUp,
  FileText,
  Globe,
  LogIn,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  User,
} from "lucide-react";

export type BottomNavTab =
  | "marketplace"
  | "my-requests"
  | "create"
  | "my-offers"
  | "profile"
  | "messages";

interface BottomNavigationProps {
  activeTab: BottomNavTab;
  onTabChange: (tab: BottomNavTab) => void;
  onCreateRequest?: () => void;
  // User & Auth
  user?: {
    display_name?: string | null;
    avatar_url?: string | null;
    email?: string | null;
    phone?: string | null;
    [key: string]: any;
  };
  isGuest?: boolean;
  onSignOut?: () => void;
  // Profile dropdown navigation
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  // Theme
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  onOpenLanguagePopup?: () => void;
  // Badges - فقط الرسائل غير المقروءة (بدون الإشعارات)
  unreadMessagesForMyRequests?: number;
  unreadMessagesForMyOffers?: number;
  unreadInterestsCount?: number;
  // نقطة إشعار على زر "أنت" عندما يحتاج المستخدم لإكمال ملفه الشخصي
  needsProfileSetup?: boolean;
  // إخفاء الـ bottom navigation في وضع الجوال (مثلاً عند فتح صفحة create-request أو request-detail)
  hideOnMobile?: boolean;
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
  unreadMessagesForMyRequests = 0,
  unreadMessagesForMyOffers = 0,
  unreadInterestsCount = 0,
  needsProfileSetup = false,
  hideOnMobile = false,
}) => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    bottom: 0,
    left: 0,
    top: 0,
    right: 0,
  });
  const [isDesktop, setIsDesktop] = useState(false);

  // حساب الـ badge: الرسائل غير المقروءة فقط (بدون الإشعارات)
  // الـ badges على البطاقات نفسها تم إزالتها بناءً على طلب المستخدم
  const badgeCounts: Record<BottomNavTab | "profile", number> = {
    marketplace: Math.max(0, unreadInterestsCount || 0),
    "my-requests": Math.max(0, unreadMessagesForMyRequests || 0),
    create: 0,
    "my-offers": Math.max(0, unreadMessagesForMyOffers || 0),
    profile: 0, // لا نعرض badge على زر "أنت"
    messages: 0, // Placeholder for messages tab
  };

  const renderBadge = (count?: number) => {
    if (!count || count <= 0) return null;
    const display = count > 99 ? "99+" : count;
    return (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute -top-1.5 -right-3 w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md aspect-square"
      >
        {display}
      </motion.span>
    );
  };

  // Check if desktop view
  useEffect(() => {
    const handleResize = () => {
      if (typeof globalThis !== "undefined") {
        setIsDesktop(globalThis.innerWidth >= 768);
        // Update position if window resizes while open
        if (isProfileDropdownOpen && profileButtonRef.current) {
          requestAnimationFrame(() => {
            if (!profileButtonRef.current) return;

            const rect = profileButtonRef.current.getBoundingClientRect();
            const dropdownWidth = 224; // w-56 = 14rem = 224px
            const padding = 16;

            if (globalThis.innerWidth >= 768) {
              // Desktop: Dropdown appears to the left of sidebar
              setDropdownPosition({
                bottom: 0,
                left: 0,
                top: rect.top,
                right: globalThis.innerWidth - rect.left + 8, // 8px gap from sidebar
              });
            } else {
              // Mobile: Dropdown appears above button
              const buttonCenterX = rect.left + (rect.width / 2);
              let leftPos = buttonCenterX - (dropdownWidth / 2);

              const maxLeft = globalThis.innerWidth - dropdownWidth - padding;
              const minLeft = padding;

              if (leftPos > maxLeft) {
                leftPos = maxLeft;
              } else if (leftPos < minLeft) {
                leftPos = minLeft;
              }

              setDropdownPosition({
                bottom: globalThis.innerHeight - rect.top + 8,
                left: leftPos,
                top: 0,
                right: 0,
              });
            }
          });
        }
      }
    };
    handleResize();
    globalThis.addEventListener("resize", handleResize);
    return () => globalThis.removeEventListener("resize", handleResize);
  }, [isProfileDropdownOpen, isDesktop]);

  // Update dropdown position when opening
  useEffect(() => {
    if (isProfileDropdownOpen && profileButtonRef.current) {
      // استخدام requestAnimationFrame لضمان الحصول على القيم الصحيحة بعد render
      requestAnimationFrame(() => {
        if (!profileButtonRef.current) return;

        const rect = profileButtonRef.current.getBoundingClientRect();
        const dropdownWidth = 224; // w-56 = 14rem = 224px
        const padding = 16;

        if (globalThis.innerWidth >= 768) {
          // Desktop: Dropdown appears to the left of sidebar
          setDropdownPosition({
            bottom: 0,
            left: 0,
            top: rect.top,
            right: globalThis.innerWidth - rect.left + 8, // 8px gap from sidebar
          });
        } else {
          // Mobile: Dropdown appears above button
          const buttonCenterX = rect.left + (rect.width / 2);
          let leftPos = buttonCenterX - (dropdownWidth / 2);

          const maxLeft = globalThis.innerWidth - dropdownWidth - padding;
          const minLeft = padding;

          if (leftPos > maxLeft) {
            leftPos = maxLeft;
          } else if (leftPos < minLeft) {
            leftPos = minLeft;
          }

          setDropdownPosition({
            bottom: globalThis.innerHeight - rect.top + 8,
            left: leftPos,
            top: 0,
            right: 0,
          });
        }
      });
    }
  }, [isProfileDropdownOpen, isDesktop]);

  // Prevent body scroll when dropdown is open
  useEffect(() => {
    if (isProfileDropdownOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [isProfileDropdownOpen]);

  const tabs = [
    {
      id: "marketplace" as BottomNavTab,
      label: "اكتشف",
      icon: Search,
      subtitle: "تصفح طلبات الآخرين وقدم عروضك",
    },
    {
      id: "my-requests" as BottomNavTab,
      label: "طلباتي",
      icon: FileText,
      subtitle: "متابعة الطلبات التي أنشأتها",
    },
    {
      id: "create" as BottomNavTab,
      label: "أنشئ طلب",
      icon: Plus,
      isCreate: true,
    },
    {
      id: "my-offers" as BottomNavTab,
      label: "عروضي",
      icon: Briefcase,
      subtitle: "متابعة عروضي التي قدمتها",
    },
    {
      id: "profile" as BottomNavTab,
      label: "أنت",
      icon: User,
      isProfile: true,
    },
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
      {/* Mobile: Bottom Navigation */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl backdrop-saturate-150 border-t border-border/50 shadow-lg safe-area-bottom md:hidden ${
          hideOnMobile ? "hidden" : ""
        }`}
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
          <LayoutGroup id="bottom-nav">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isCreate = tab.isCreate;
              const isProfile = tab.isProfile;
              const badgeCount = badgeCounts[tab.id];

              // زر إنشاء طلب المميز - في المنتصف
              if (isCreate) {
                return (
                  <motion.button
                    type="button"
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    data-testid={`nav-tab-create`}
                    className="relative flex items-center justify-center h-full px-3"
                    whileTap={{ scale: 0.9 }}
                  >
                    {/* فقاعة التوجيه المتحركة - مباشرة فوق الزر */}
                    <motion.div
                      className="absolute bottom-full mb-2 inset-x-0 z-20 flex flex-col items-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        y: [10, 0, 0, -5],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        repeatDelay: 8,
                        times: [0, 0.1, 0.9, 1],
                        ease: "easeInOut",
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
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <svg
                          width="16"
                          height="12"
                          viewBox="0 0 16 12"
                          fill="currentColor"
                        >
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
                          "0 10px 40px -10px rgba(var(--foreground-rgb), 0.18)",
                        ],
                      }}
                      transition={{
                        boxShadow: {
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        },
                      }}
                    >
                      {renderBadge(badgeCount)}
                      {/* External Pulsing Glow */}
                      <motion.div
                        className="absolute -inset-2 rounded-3xl bg-[rgba(var(--foreground-rgb),0.18)] blur-xl -z-10"
                        animate={{
                          opacity: [0.3, 0.6, 0.3],
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
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
                            ease: "easeInOut",
                          }}
                        />
                      </div>

                      {/* Plus Icon with Glow */}
                      <motion.div
                        animate={{ rotate: [0, 90, 0] }}
                        transition={{
                          duration: 8,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <Plus
                          size={24}
                          strokeWidth={2.5}
                          className="text-white relative z-10 drop-shadow-lg"
                        />
                      </motion.div>
                    </motion.div>
                  </motion.button>
                );
              }

              // زر أنت (الملف الشخصي)
              if (isProfile) {
                return (
                  <motion.button
                    type="button"
                    key={tab.id}
                    ref={profileButtonRef}
                    onClick={() => handleTabClick(tab.id)}
                    data-testid={`nav-tab-profile`}
                    className="relative flex flex-col items-center justify-center flex-1 h-full gap-1.5"
                    whileTap={{ scale: 0.94 }}
                  >
                    {/* أيقونة الملف الشخصي */}
                    <motion.div
                      animate={{
                        y: isProfileDropdownOpen ? -1 : 0,
                        scale: isProfileDropdownOpen ? 1.05 : 1,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                      }}
                      className="relative flex items-center justify-center h-5"
                    >
                      {isGuest
                        ? (
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
                              fill={isProfileDropdownOpen
                                ? "currentColor"
                                : "none"}
                            />
                            {/* Badge صغير جداً ومبسط مع سهم دخول - تم إزاحته لليمين أكثر لتوضيح الباب */}
                            <motion.div
                              className="absolute -top-1.5 -right-3 w-3 h-3 rounded-full bg-white border border-primary/20 shadow-sm flex items-center justify-center"
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{
                                repeat: Infinity,
                                duration: 2,
                                ease: "easeInOut",
                              }}
                            >
                              <ChevronUp
                                size={7}
                                className="text-primary"
                                strokeWidth={3}
                              />
                            </motion.div>
                          </div>
                        )
                        : (
                          // لمسجل الدخول - صورة الملف الشخصي
                          <div className="relative w-8 h-8 rounded-full bg-primary/10 border-2 border-primary/30 overflow-hidden flex items-center justify-center">
                            {user?.avatar_url
                              ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user?.display_name || "User"}
                                  className="w-full h-full object-cover"
                                />
                              )
                              : (
                                <span className="text-xs font-bold text-primary">
                                  {user?.display_name?.charAt(0) || "م"}
                                </span>
                              )}
                            {/* نقطة إشعار حمراء على الأيقونة نفسها */}
                            {needsProfileSetup && (
                              <motion.div
                                className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-card shadow-md"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{
                                  repeat: Infinity,
                                  duration: 1.5,
                                  ease: "easeInOut",
                                }}
                              />
                            )}
                          </div>
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
                        {isGuest ? "تسجيل الدخول" : "حسابي"}
                      </span>
                    </div>
                  </motion.button>
                );
              }

              // الأزرار العادية
              return (
                <motion.button
                  type="button"
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  data-testid={`nav-tab-${tab.id}`}
                  className="relative flex flex-col items-center justify-center flex-1 h-full gap-1.5"
                  whileTap={{ scale: 0.94 }}
                >
                  {/* Icon */}
                  <motion.div
                    animate={{
                      y: isActive ? -1 : 0,
                      scale: isActive ? 1.05 : 1,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                    }}
                    className={`relative flex items-center justify-center transition-colors duration-300 ${
                      isActive ? "text-primary" : "text-muted-foreground/40"
                    }`}
                  >
                    {renderBadge(badgeCount)}
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.2 : 1.5}
                      fill={isActive ? "currentColor" : "none"}
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
                          mass: 0.8,
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

      {/* Tablet/Desktop: Right Sidebar Navigation */}
      <motion.nav
        animate={{ x: 0, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.8,
          opacity: { duration: 0.2 },
        }}
        className="hidden md:flex fixed right-0 top-0 bottom-0 z-[100] w-72 bg-card/95 backdrop-blur-xl border-l border-border shadow-lg flex-col py-6 overflow-y-auto pointer-events-auto"
      >
        <LayoutGroup id="sidebar-nav">
          {/* User Section - Top */}
          <div className="px-4 pb-6 border-b border-border/50 mb-4">
            {!isGuest && user
              ? (
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/30 overflow-hidden flex items-center justify-center shrink-0">
                    {user?.avatar_url
                      ? (
                        <img
                          src={user.avatar_url}
                          alt={user?.display_name || "User"}
                          className="w-full h-full object-cover"
                        />
                      )
                      : (
                        <span className="text-base font-bold text-primary">
                          {user?.display_name?.charAt(0) || "م"}
                        </span>
                      )}
                    {needsProfileSetup && (
                      <motion.div
                        className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500 border-2 border-card shadow-md"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.5,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {!user?.display_name
                      ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            onNavigateToProfile?.();
                          }}
                          className="w-full px-3 py-2 rounded-lg border-2 border-dashed border-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors text-right"
                        >
                          <p className="font-bold text-xs text-red-600 dark:text-red-400">
                            ⚠️ أدخل اسمك
                          </p>
                        </button>
                      )
                      : (
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
              )
              : (
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center shrink-0">
                    <LogIn size={20} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log(
                          "🔐 Login button clicked, calling onSignOut...",
                        );
                        setIsProfileDropdownOpen(false);
                        // إعطاء وقت للـ dropdown ليغلق قبل الانتقال
                        setTimeout(() => {
                          console.log("🔐 Calling onSignOut now...");
                          onSignOut?.();
                        }, 100);
                      }}
                      className="w-full text-right font-bold text-sm text-foreground hover:text-primary transition-colors"
                    >
                      تسجيل الدخول
                    </button>
                  </div>
                </div>
              )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {!isGuest && (
                <>
                  <button
                    type="button"
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
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      onNavigateToSettings?.();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <Settings size={18} className="text-muted-foreground" />
                    <span>الإعدادات</span>
                  </button>
                </>
              )}

              {/* Theme & Language */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(10);
                    toggleTheme?.();
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    isDarkMode
                      ? "bg-white/10 text-white hover:bg-white/20"
                      : "bg-gray-900/20 text-gray-900 hover:bg-gray-900/30"
                  }`}
                >
                  {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                  <span className="text-xs">
                    {isDarkMode ? "نهاري" : "ليلي"}
                  </span>
                </button>

                <button
                  type="button"
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

              {/* Sign Out Button (only for logged in users) */}
              {!isGuest && (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    onSignOut?.();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-red-500 hover:bg-red-500/10"
                >
                  <LogOut size={18} />
                  <span>تسجيل الخروج</span>
                </button>
              )}
            </div>
          </div>

          {/* Create Request Button - Prominent at Top */}
          <div className="px-4 mb-4">
            <motion.button
              onClick={() => handleTabClick("create")}
              data-testid="nav-sidebar-create"
              className="relative w-full"
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.02 }}
            >
              <motion.div
                className="create-request-btn relative w-full h-12 rounded-2xl bg-[linear-gradient(135deg,rgba(var(--foreground-rgb),0.42)_0%,rgba(var(--foreground-rgb),0.28)_55%,rgba(var(--foreground-rgb),0.18)_100%)] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 px-4 overflow-hidden"
                whileHover={{ scale: 1.02 }}
                animate={{
                  boxShadow: [
                    "0 10px 40px -10px rgba(var(--foreground-rgb), 0.18)",
                    "0 15px 50px -10px rgba(var(--foreground-rgb), 0.26)",
                    "0 10px 40px -10px rgba(var(--foreground-rgb), 0.18)",
                  ],
                }}
                transition={{
                  boxShadow: {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }}
              >
                {/* Animated border glow */}
                <div className="create-request-border" />
                {/* Inner shimmer glow */}
                <div className="create-request-shimmer" />
                <motion.div
                  animate={{ rotate: [0, 90, 0] }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="relative z-10"
                >
                  <Plus
                    size={20}
                    strokeWidth={2.5}
                    className="text-white drop-shadow-lg"
                  />
                </motion.div>
                <span className="text-white font-bold text-sm relative z-10">
                  أنشئ طلب
                </span>
              </motion.div>
            </motion.button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 flex flex-col gap-1 px-2">
            {tabs.filter((tab) => !tab.isCreate && !tab.isProfile).map(
              (tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const badgeCount = badgeCounts[tab.id];

                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    data-testid={`nav-sidebar-${tab.id}`}
                    className={`relative flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary/50"
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    {renderBadge(badgeCount)}
                    <Icon
                      size={22}
                      strokeWidth={isActive ? 2.2 : 1.5}
                      fill={isActive ? "currentColor" : "none"}
                      className="transition-all duration-300 shrink-0"
                    />
                    <div className="flex-1 text-right flex flex-col gap-0.5">
                      <span className="font-medium text-sm">{tab.label}</span>
                      {tab.subtitle && (
                        <span
                          className={`text-xs ${
                            isActive
                              ? "text-primary/70"
                              : "text-muted-foreground/70"
                          }`}
                        >
                          {tab.subtitle}
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-nav-indicator"
                        className="absolute right-0 w-1 h-8 bg-primary rounded-l-full"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                          mass: 0.8,
                        }}
                      />
                    )}
                  </motion.button>
                );
              },
            )}
          </div>
        </LayoutGroup>
      </motion.nav>

      {/* Profile Dropdown - Mobile Only */}
      {isProfileDropdownOpen && !isDesktop && ReactDOM.createPortal(
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
              style={{
                WebkitTouchCallout: "none",
                WebkitUserSelect: "none",
                userSelect: "none",
                touchAction: "none", // منع scroll والسلوك الافتراضي للـ touch events
              }}
            />

            {/* Dropdown Menu - Opens Upward (Mobile) / Left (Desktop) */}
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
                scale: 0.95,
                x: isDesktop ? 20 : 0,
              }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, y: 20, scale: 0.95, x: isDesktop ? 20 : 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`fixed w-56 bg-card rounded-2xl border border-border shadow-2xl overflow-hidden pointer-events-auto ${
                isDesktop ? "" : ""
              }`}
              style={{
                bottom: isDesktop ? "auto" : dropdownPosition.bottom,
                left: isDesktop ? "auto" : dropdownPosition.left,
                top: isDesktop ? dropdownPosition.top : "auto",
                right: isDesktop ? dropdownPosition.right : "auto",
                zIndex: 99999,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* User Info - فقط للمستخدمين المسجلين */}
              {!isGuest && (
                <div className="p-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 bg-primary/10 border border-primary/20">
                      {user?.avatar_url
                        ? (
                          <img
                            src={user.avatar_url}
                            alt={user?.display_name || "User"}
                            className="w-full h-full object-cover"
                          />
                        )
                        : (
                          <span className="text-sm font-bold text-primary">
                            {user?.display_name?.charAt(0) || "؟"}
                          </span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* إذا كان الاسم فارغ، أظهر تنبيه بحدود حمراء */}
                      {!user?.display_name
                        ? (
                          <button
                            type="button"
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
                        )
                        : (
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
                      type="button"
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
                    type="button"
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(10);
                      toggleTheme?.();
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isDarkMode
                        ? "bg-white/10 text-white hover:bg-white/20"
                        : "bg-gray-900/20 text-gray-900 hover:bg-gray-900/30"
                    }`}
                  >
                    {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                    <span className="text-xs">
                      {isDarkMode ? "نهاري" : "ليلي"}
                    </span>
                  </button>

                  {/* Language Toggle */}
                  <button
                    type="button"
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
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsProfileDropdownOpen(false);
                    // إعطاء وقت للـ dropdown ليغلق قبل الانتقال
                    setTimeout(() => {
                      onSignOut?.();
                    }, 100);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isGuest
                      ? "text-primary hover:bg-primary/10"
                      : "text-red-500 hover:bg-red-500/10"
                  }`}
                >
                  {isGuest
                    ? (
                      <>
                        <LogIn size={18} />
                        <span>تسجيل الدخول</span>
                      </>
                    )
                    : (
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
        document.body,
      )}
    </>
  );
};
