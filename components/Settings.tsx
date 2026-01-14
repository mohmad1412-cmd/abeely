import React, { useState } from "react";
import { logger } from "../utils/logger.ts";
import {
  Bell,
  ChevronDown,
  Edit,
  Filter,
  Globe,
  Home,
  MapPin,
  Plus,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { AVAILABLE_CATEGORIES } from "../data.ts";
import { AppNotification, UserPreferences } from "../types.ts";
import { CityAutocomplete } from "./ui/CityAutocomplete.tsx";

type HomePageConfig =
  | "marketplace:all"
  | "marketplace:interests"
  | "my-requests:all"
  | "my-requests:active"
  | "my-requests:approved"
  | "my-offers:all"
  | "my-offers:pending"
  | "my-offers:accepted";
import { sendOTP, UserProfile, verifyOTP } from "../services/authService.ts";
import { supabase } from "../services/supabaseClient.ts";
import { UnifiedHeader } from "./ui/UnifiedHeader.tsx";
import { Button } from "./ui/Button.tsx";
import { hapticService } from "../services/hapticService.ts";

interface SettingsProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  onBack?: () => void;
  userPreferences?: UserPreferences;
  onUpdatePreferences?: (prefs: UserPreferences) => void;
  user?: UserProfile | null;
  onUpdateProfile?: (updates: Partial<UserProfile>) => Promise<void>;
  onSignOut?: () => void;
  // Unified Header Props
  mode: "requests" | "offers";
  toggleMode: () => void;
  isModeSwitching: boolean;
  unreadCount: number;
  hasUnreadMessages: boolean;
  setView: (view: string) => void;
  setPreviousView: (view: string) => void;
  titleKey: number;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onNotificationClick?: (notification: AppNotification) => void;
  onClearAll: () => void;
  isGuest?: boolean;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  onBack,
  userPreferences = {
    interestedCategories: [],
    interestedCities: [],
    notifyOnInterest: true,
    roleMode: "requester",
    showNameToApprovedProvider: true,
    radarWords: [],
    homePage: "marketplace:all" as HomePageConfig,
  },
  onUpdatePreferences,
  user = null,
  onUpdateProfile,
  onSignOut,
  mode,
  toggleMode,
  isModeSwitching,
  unreadCount,
  hasUnreadMessages,
  setView,
  setPreviousView,
  titleKey,
  notifications,
  onMarkAsRead,
  onNotificationClick,
  onClearAll,
  isGuest = false,
  onNavigateToProfile,
  onNavigateToSettings,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editedName, setEditedName] = useState(user?.display_name || "");
  const [editedEmail, setEditedEmail] = useState(user?.email || "");
  const [editedPhone, setEditedPhone] = useState(user?.phone || "");

  // Loading states for save operations
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  // Phone verification states
  const [phoneVerificationStep, setPhoneVerificationStep] = useState<
    "none" | "phone" | "otp"
  >("none");
  const [phoneOTP, setPhoneOTP] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [tempPhone, setTempPhone] = useState("");

  // Initialize edited values when user changes
  React.useEffect(() => {
    setEditedName(user?.display_name || "");
    setEditedEmail(user?.email || "");
    setEditedPhone(user?.phone || "");
  }, [user]);
  const [notifyOnInterest, setNotifyOnInterest] = useState(
    userPreferences.notifyOnInterest,
  );
  const [notifyOnOffers, setNotifyOnOffers] = useState(true);
  const [notifyOnMessages, setNotifyOnMessages] = useState(true);
  const [showNameToApprovedProvider, setShowNameToApprovedProvider] = useState(
    userPreferences.showNameToApprovedProvider ?? true,
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    userPreferences.interestedCategories,
  );
  const [selectedCities, setSelectedCities] = useState<string[]>(
    userPreferences.interestedCities,
  );
  const [selectedRadarWords, setSelectedRadarWords] = useState<string[]>([]);
  const [isManageInterestsOpen, setIsManageInterestsOpen] = useState(false);
  const [tempCategories, setTempCategories] = useState<string[]>(
    selectedCategories,
  );
  const [tempCities, setTempCities] = useState<string[]>(selectedCities);
  const [tempRadarWords, setTempRadarWords] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [isCitiesExpanded, setIsCitiesExpanded] = useState(false);
  const [isRadarWordsExpanded, setIsRadarWordsExpanded] = useState(false);
  const [newRadarWord, setNewRadarWord] = useState("");
  const [isInterestsPreviewExpanded, setIsInterestsPreviewExpanded] = useState(
    false,
  );
  const [selectedHomePage, setSelectedHomePage] = useState<HomePageConfig>(
    (userPreferences as any).homePage || "marketplace:all",
  );
  const [isHomePageDropdownOpen, setIsHomePageDropdownOpen] = useState(false);

  // Update selectedHomePage when userPreferences change
  React.useEffect(() => {
    setSelectedHomePage((userPreferences as any).homePage || "marketplace:all");
  }, [(userPreferences as any).homePage]);

  const handleSaveInterests = async () => {
    setIsSavingPreferences(true);
    try {
      setSelectedCategories(tempCategories);
      setSelectedCities(tempCities);
      setSelectedRadarWords(tempRadarWords);
      if (onUpdatePreferences) {
        await onUpdatePreferences({
          ...userPreferences,
          interestedCategories: tempCategories,
          interestedCities: tempCities,
          notifyOnInterest,
        });
      }
      setIsManageInterestsOpen(false);
    } catch (error) {
      logger.error("خطأ في حفظ الإعدادات:", error, "service");
      alert("حدث خطأ أثناء حفظ الإعدادات. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const toggleCategory = (catId: string) => {
    hapticService.tap();
    setTempCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId]
    );
  };

  const toggleCity = (city: string) => {
    hapticService.tap();
    setTempCities((prev) => {
      if (prev.includes(city)) {
        return prev.filter((c) => c !== city);
      } else {
        // إذا اختار "كل المدن"، نزيل المدن الأخرى (ما عدا "عن بعد")
        if (city === "كل المدن") {
          const remoteOnly = prev.filter((c) => c === "عن بعد");
          return [...remoteOnly, city];
        }
        // إذا اختار مدينة معينة، نزيل "كل المدن"
        const filtered = prev.filter((c) => c !== "كل المدن");
        return [...filtered, city];
      }
    });
  };

  const filteredCategories = AVAILABLE_CATEGORIES.filter((
    cat: { id: string; label: string; emoji: string },
  ) => cat.label.toLowerCase().includes(categorySearch.toLowerCase()));

  const addRadarWord = () => {
    const trimmedWord = newRadarWord.trim();
    if (trimmedWord && !tempRadarWords.includes(trimmedWord)) {
      setTempRadarWords([...tempRadarWords, trimmedWord]);
      setNewRadarWord("");
    }
  };

  const removeRadarWord = (word: string) => {
    setTempRadarWords(tempRadarWords.filter((w) => w !== word));
  };

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
    };

    for (const [key, value] of Object.entries(errorMap)) {
      if (error.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    return error;
  };

  const handleSendPhoneOTP = async () => {
    if (!tempPhone.trim()) {
      setPhoneError("الرجاء إدخال رقم الجوال");
      return;
    }

    setIsSendingOTP(true);
    setPhoneError(null);

    try {
      const result = await sendOTP(tempPhone.trim());
      if (result.success) {
        setPhoneVerificationStep("otp");
      } else {
        setPhoneError(
          translateAuthError(result.error || "حدث خطأ أثناء إرسال رمز التحقق"),
        );
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setPhoneError(
        translateAuthError(error.message || "حدث خطأ أثناء إرسال رمز التحقق"),
      );
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleVerifyPhoneOTP = async () => {
    if (!phoneOTP.trim()) {
      setPhoneError("الرجاء إدخال رمز التحقق");
      return;
    }

    setIsVerifyingOTP(true);
    setPhoneError(null);

    try {
      const result = await verifyOTP(tempPhone.trim(), phoneOTP.trim());
      if (result.success) {
        // Update profile with new phone
        if (onUpdateProfile) {
          await onUpdateProfile({ phone: tempPhone.trim() });
        }
        setEditedPhone(tempPhone.trim());
        setPhoneVerificationStep("none");
        setIsEditingPhone(false);
        setPhoneOTP("");
        setTempPhone("");
      } else {
        setPhoneError(
          translateAuthError(result.error || "رمز التحقق غير صحيح"),
        );
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setPhoneError(translateAuthError(error.message || "رمز التحقق غير صحيح"));
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Unified Header */}
      <UnifiedHeader
        mode={mode}
        toggleMode={toggleMode}
        isModeSwitching={isModeSwitching}
        unreadCount={unreadCount}
        hasUnreadMessages={hasUnreadMessages}
        user={user}
        setView={setView}
        setPreviousView={setPreviousView}
        titleKey={titleKey}
        notifications={notifications}
        onMarkAsRead={onMarkAsRead}
        onNotificationClick={onNotificationClick}
        onClearAll={onClearAll}
        onSignOut={onSignOut || (() => {})}
        backButton
        onBack={onBack}
        showBackButtonOnDesktop={true}
        title="الإعدادات"
        currentView="settings"
        hideModeToggle
        isGuest={isGuest}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToSettings={onNavigateToSettings}
      />

      <div className="flex-1 overflow-y-auto relative no-scrollbar pb-24">
        <div className="max-w-2xl mx-auto p-6">
          <div className="space-y-4">
            {/* Account Settings - First */}
            <div className="p-4 bg-secondary/50 rounded-lg border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <User size={20} />
                </div>
                <h3 className="font-bold text-base">الحساب</h3>
              </div>

              <div className="space-y-3">
                {/* Name */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-right">
                    <p className="font-medium text-sm">الاسم</p>
                    {isEditingName
                      ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="flex-1 h-8 px-2 text-xs rounded-lg border border-border bg-background text-right"
                            dir="rtl"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (onUpdateProfile && editedName.trim()) {
                                setIsSavingName(true);
                                try {
                                  await onUpdateProfile({
                                    display_name: editedName.trim(),
                                  });
                                  // انتظر قليلاً للتأكد من تحديث user state
                                  await new Promise((resolve) =>
                                    setTimeout(resolve, 100)
                                  );
                                  setIsEditingName(false);
                                } catch (error) {
                                  logger.error(
                                    "خطأ في حفظ الاسم:",
                                    error,
                                    "service",
                                  );
                                  alert(
                                    "حدث خطأ أثناء حفظ الاسم. يرجى المحاولة مرة أخرى.",
                                  );
                                } finally {
                                  setIsSavingName(false);
                                }
                              } else {
                                setIsEditingName(false);
                              }
                            }}
                            disabled={isSavingName}
                            className="text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            {isSavingName
                              ? (
                                <>
                                  <span className="inline-flex items-center gap-0.5">
                                    <span className="animate-[bounce_1s_infinite]">
                                      .
                                    </span>
                                    <span className="animate-[bounce_1s_infinite_0.2s]">
                                      .
                                    </span>
                                    <span className="animate-[bounce_1s_infinite_0.4s]">
                                      .
                                    </span>
                                  </span>
                                  انتظار
                                </>
                              )
                              : (
                                "حفظ"
                              )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditedName(user?.display_name || "");
                              setIsEditingName(false);
                            }}
                            className="text-xs text-muted-foreground hover:underline"
                          >
                            إلغاء
                          </button>
                        </div>
                      )
                      : (
                        <p className="text-xs text-muted-foreground" dir="rtl">
                          {user?.display_name || "غير محدد"}
                        </p>
                      )}
                  </div>
                  {!isEditingName && (
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="text-xs text-primary hover:underline shrink-0 mr-2"
                    >
                      تعديل
                    </button>
                  )}
                </div>

                {/* Email */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-right">
                    <p className="font-medium text-sm">البريد الإلكتروني</p>
                    {isEditingEmail
                      ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="email"
                            value={editedEmail}
                            onChange={(e) => setEditedEmail(e.target.value)}
                            className="flex-1 h-8 px-2 text-xs rounded-lg border border-border bg-background text-left"
                            dir="ltr"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (
                                onUpdateProfile && editedEmail.trim() &&
                                editedEmail !== user?.email
                              ) {
                                setIsSavingEmail(true);
                                try {
                                  // تحديث البريد الإلكتروني في Supabase Auth
                                  const { error: authError } = await supabase
                                    .auth.updateUser({
                                      email: editedEmail.trim(),
                                    });

                                  if (authError) {
                                    logger.error(
                                      "Error updating email:",
                                      authError,
                                      "service",
                                    );
                                    alert(
                                      "حدث خطأ أثناء تحديث البريد الإلكتروني: " +
                                        authError.message,
                                    );
                                    return;
                                  }

                                  // تحديث في جدول profiles أيضاً
                                  await onUpdateProfile({
                                    email: editedEmail.trim(),
                                  });
                                  setIsEditingEmail(false);
                                } catch (err: unknown) {
                                  logger.error(
                                    "Error updating email:",
                                    err,
                                    "service",
                                  );
                                  alert("حدث خطأ أثناء تحديث البريد الإلكتروني");
                                } finally {
                                  setIsSavingEmail(false);
                                }
                              } else {
                                setIsEditingEmail(false);
                              }
                            }}
                            disabled={isSavingEmail}
                            className="text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            {isSavingEmail
                              ? (
                                <>
                                  <span className="inline-flex items-center gap-0.5">
                                    <span className="animate-[bounce_1s_infinite]">
                                      .
                                    </span>
                                    <span className="animate-[bounce_1s_infinite_0.2s]">
                                      .
                                    </span>
                                    <span className="animate-[bounce_1s_infinite_0.4s]">
                                      .
                                    </span>
                                  </span>
                                  انتظار
                                </>
                              )
                              : (
                                "حفظ"
                              )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditedEmail(user?.email || "");
                              setIsEditingEmail(false);
                            }}
                            className="text-xs text-muted-foreground hover:underline"
                          >
                            إلغاء
                          </button>
                        </div>
                      )
                      : (
                        <p className="text-xs text-muted-foreground" dir="ltr">
                          {user?.email || "غير محدد"}
                        </p>
                      )}
                  </div>
                  {!isEditingEmail && (
                    <button
                      type="button"
                      onClick={() => setIsEditingEmail(true)}
                      className="text-xs text-primary hover:underline shrink-0 mr-2"
                    >
                      تعديل
                    </button>
                  )}
                </div>

                {/* Phone */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-right">
                    <p className="font-medium text-sm">رقم الجوال</p>
                    {isEditingPhone
                      ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="tel"
                            value={editedPhone}
                            onChange={(e) => setEditedPhone(e.target.value)}
                            className="flex-1 h-8 px-2 text-xs rounded-lg border border-border bg-background text-left"
                            dir="ltr"
                            autoFocus
                            disabled={phoneVerificationStep !== "none"}
                          />
                          {phoneVerificationStep === "none"
                            ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempPhone(editedPhone.trim());
                                    setPhoneVerificationStep("phone");
                                    setPhoneError(null);
                                  }}
                                  disabled={!editedPhone.trim() ||
                                    editedPhone.trim() === user?.phone}
                                  className="text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  حفظ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditedPhone(user?.phone || "");
                                    setIsEditingPhone(false);
                                    setPhoneVerificationStep("none");
                                    setPhoneError(null);
                                  }}
                                  className="text-xs text-muted-foreground hover:underline"
                                >
                                  إلغاء
                                </button>
                              </>
                            )
                            : null}
                        </div>
                      )
                      : (
                        <p className="text-xs text-muted-foreground" dir="ltr">
                          {user?.phone || "غير محدد"}
                        </p>
                      )}
                  </div>
                  {!isEditingPhone && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPhone(true);
                        setEditedPhone(user?.phone || "");
                        setPhoneVerificationStep("none");
                      }}
                      className="text-xs text-primary hover:underline shrink-0 mr-2"
                    >
                      تعديل
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Privacy Section */}
            <div className="p-4 bg-secondary/50 rounded-lg border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h3 className="font-bold text-base">الخصوصية</h3>
              </div>

              <div className="space-y-3">
                {/* Show Name to Approved Provider */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {showNameToApprovedProvider
                        ? "اظهار اسمي لمقدم العرض بعد اعتماده"
                        : "إبقاء اسمي غير ظاهر دائماً"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {showNameToApprovedProvider
                        ? "سيظهر اسمك لمقدم الخدمة بعد اعتماد عرضه"
                        : "لن يظهر اسمك لمقدمي الخدمات، سيظهر رقم الطلب فقط"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      hapticService.impact();
                      const newValue = !showNameToApprovedProvider;
                      setShowNameToApprovedProvider(newValue);
                      if (onUpdatePreferences) {
                        onUpdatePreferences({
                          ...userPreferences,
                          showNameToApprovedProvider: newValue,
                        });
                      }
                    }}
                    className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                      showNameToApprovedProvider ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <motion.div
                      animate={{ x: showNameToApprovedProvider ? -28 : 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className="w-5 h-5 bg-white rounded-full shadow-lg"
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Home Page Customization Section */}
            <div className="p-4 bg-secondary/50 rounded-lg border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <Home size={20} />
                </div>
                <h3 className="font-bold text-base">تخصيص صفحة البداية</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="font-medium text-sm mb-2">
                    اختر الصفحة التي تريد أن تبدأ بها عندما تفتح التطبيق
                  </p>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        hapticService.tap();
                        setIsHomePageDropdownOpen(!isHomePageDropdownOpen);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-secondary/50 transition-colors text-sm"
                    >
                      <span className="text-foreground">
                        {selectedHomePage === "marketplace:all" &&
                          "السوق (كل الطلبات)"}
                        {selectedHomePage === "marketplace:interests" &&
                          "السوق (اهتماماتي)"}
                        {selectedHomePage === "my-requests:all" &&
                          "طلباتي (كل طلباتي)"}
                        {selectedHomePage === "my-requests:active" &&
                          "طلباتي (الطلبات النشطة)"}
                        {selectedHomePage === "my-requests:approved" &&
                          "طلباتي (الطلبات المعتمدة)"}
                        {selectedHomePage === "my-offers:all" &&
                          "عروضي (كل عروضي)"}
                        {selectedHomePage === "my-offers:pending" &&
                          "عروضي (عروضي قيد الانتظار)"}
                        {selectedHomePage === "my-offers:accepted" &&
                          "عروضي (عروضي المقبولة)"}
                      </span>
                      <ChevronDown
                        size={18}
                        className={`text-muted-foreground transition-transform duration-200 ${
                          isHomePageDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {isHomePageDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-80 overflow-y-auto"
                        >
                          {/* السوق */}
                          <button
                            type="button"
                            onClick={() => {
                              hapticService.tap();
                              const newHomePage: HomePageConfig =
                                "marketplace:all";
                              setSelectedHomePage(newHomePage);
                              setIsHomePageDropdownOpen(false);
                              if (onUpdatePreferences) {
                                onUpdatePreferences({
                                  ...userPreferences,
                                  homePage: newHomePage,
                                });
                              }
                            }}
                            className={`w-full text-right px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors ${
                              selectedHomePage === "marketplace:all"
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground"
                            }`}
                          >
                            السوق (كل الطلبات)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              hapticService.tap();
                              const newHomePage: HomePageConfig =
                                "marketplace:interests";
                              setSelectedHomePage(newHomePage);
                              setIsHomePageDropdownOpen(false);
                              if (onUpdatePreferences) {
                                onUpdatePreferences({
                                  ...userPreferences,
                                  homePage: newHomePage,
                                });
                              }
                            }}
                            className={`w-full text-right px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors ${
                              selectedHomePage === "marketplace:interests"
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground"
                            }`}
                          >
                            السوق (اهتماماتي)
                          </button>

                          {/* طلباتي */}
                          <div className="border-t border-border my-1"></div>
                          <button
                            type="button"
                            onClick={() => {
                              hapticService.tap();
                              const newHomePage: HomePageConfig =
                                "my-requests:all";
                              setSelectedHomePage(newHomePage);
                              setIsHomePageDropdownOpen(false);
                              if (onUpdatePreferences) {
                                onUpdatePreferences({
                                  ...userPreferences,
                                  homePage: newHomePage,
                                });
                              }
                            }}
                            className={`w-full text-right px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors ${
                              selectedHomePage === "my-requests:all"
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground"
                            }`}
                          >
                            طلباتي (كل طلباتي)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              hapticService.tap();
                              const newHomePage: HomePageConfig =
                                "my-requests:active";
                              setSelectedHomePage(newHomePage);
                              setIsHomePageDropdownOpen(false);
                              if (onUpdatePreferences) {
                                onUpdatePreferences({
                                  ...userPreferences,
                                  homePage: newHomePage,
                                });
                              }
                            }}
                            className={`w-full text-right px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors ${
                              selectedHomePage === "my-requests:active"
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground"
                            }`}
                          >
                            طلباتي (الطلبات النشطة)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              hapticService.tap();
                              const newHomePage: HomePageConfig =
                                "my-requests:approved";
                              setSelectedHomePage(newHomePage);
                              setIsHomePageDropdownOpen(false);
                              if (onUpdatePreferences) {
                                onUpdatePreferences({
                                  ...userPreferences,
                                  homePage: newHomePage,
                                });
                              }
                            }}
                            className={`w-full text-right px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors ${
                              selectedHomePage === "my-requests:approved"
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground"
                            }`}
                          >
                            طلباتي (الطلبات المعتمدة)
                          </button>

                          {/* عروضي */}
                          <div className="border-t border-border my-1"></div>
                          <button
                            type="button"
                            onClick={() => {
                              hapticService.tap();
                              const newHomePage: HomePageConfig =
                                "my-offers:all";
                              setSelectedHomePage(newHomePage);
                              setIsHomePageDropdownOpen(false);
                              if (onUpdatePreferences) {
                                onUpdatePreferences({
                                  ...userPreferences,
                                  homePage: newHomePage,
                                });
                              }
                            }}
                            className={`w-full text-right px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors ${
                              selectedHomePage === "my-offers:all"
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground"
                            }`}
                          >
                            عروضي (كل عروضي)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              hapticService.tap();
                              const newHomePage: HomePageConfig =
                                "my-offers:pending";
                              setSelectedHomePage(newHomePage);
                              setIsHomePageDropdownOpen(false);
                              if (onUpdatePreferences) {
                                onUpdatePreferences({
                                  ...userPreferences,
                                  homePage: newHomePage,
                                });
                              }
                            }}
                            className={`w-full text-right px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors ${
                              selectedHomePage === "my-offers:pending"
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground"
                            }`}
                          >
                            عروضي (عروضي قيد الانتظار)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              hapticService.tap();
                              const newHomePage: HomePageConfig =
                                "my-offers:accepted";
                              setSelectedHomePage(newHomePage);
                              setIsHomePageDropdownOpen(false);
                              if (onUpdatePreferences) {
                                onUpdatePreferences({
                                  ...userPreferences,
                                  homePage: newHomePage,
                                });
                              }
                            }}
                            className={`w-full text-right px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors ${
                              selectedHomePage === "my-offers:accepted"
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-foreground"
                            }`}
                          >
                            عروضي (عروضي المقبولة)
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications Section */}
            <div className="p-4 bg-secondary/50 rounded-lg border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <Bell size={20} />
                </div>
                <h3 className="font-bold text-base">الإشعارات</h3>
              </div>

              <div className="space-y-3">
                {/* Notify on Interest */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      إشعارات الطلبات الجديدة
                    </p>
                    <p className="text-xs text-muted-foreground">
                      إشعار عند وجود طلبات جديدة حسب اهتماماتك
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Haptic feedback
                      hapticService.impact();
                      setNotifyOnInterest(!notifyOnInterest);
                    }}
                    className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                      notifyOnInterest ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <motion.div
                      animate={{ x: notifyOnInterest ? -28 : 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className="w-5 h-5 bg-white rounded-full shadow-lg"
                    />
                  </button>
                </div>

                {/* Notify on Offers */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">إشعارات العروض</p>
                    <p className="text-xs text-muted-foreground">
                      إشعار عند استلام عروض جديدة على طلباتك
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Haptic feedback
                      hapticService.impact();
                      setNotifyOnOffers(!notifyOnOffers);
                    }}
                    className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                      notifyOnOffers ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <motion.div
                      animate={{ x: notifyOnOffers ? -28 : 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className="w-5 h-5 bg-white rounded-full shadow-lg"
                    />
                  </button>
                </div>

                {/* Notify on Messages */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">إشعارات الرسائل</p>
                    <p className="text-xs text-muted-foreground">
                      إشعار عند استلام رسائل جديدة
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Haptic feedback
                      hapticService.impact();
                      setNotifyOnMessages(!notifyOnMessages);
                    }}
                    className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                      notifyOnMessages ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <motion.div
                      animate={{ x: notifyOnMessages ? -28 : 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className="w-5 h-5 bg-white rounded-full shadow-lg"
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Interests & Cities Section */}
            <div className="p-4 bg-secondary/50 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <Filter size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base">إدارة الاهتمامات</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedCategories.length > 0 ||
                          selectedCities.length > 0 ||
                          selectedRadarWords.length > 0
                        ? [
                          selectedCategories.length > 0 &&
                          `${selectedCategories.length} تصنيف`,
                          selectedCities.length > 0 &&
                          `${selectedCities.length} مدينة`,
                          selectedRadarWords.length > 0 &&
                          `${selectedRadarWords.length} كلمة رادار`,
                        ].filter(Boolean).join("، ")
                        : "لم يتم تحديد أي اهتمامات"}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTempCategories(selectedCategories);
                    setTempCities(selectedCities);
                    setTempRadarWords(selectedRadarWords);
                    setCategorySearch("");
                    setNewRadarWord("");
                    setIsManageInterestsOpen(true);
                  }}
                  className="gap-2 h-9 rounded-xl border-primary/20 hover:bg-primary/5 text-primary text-xs font-bold shrink-0"
                >
                  <Edit size={14} />
                  تعديل الاهتمامات
                </Button>
              </div>

              {/* Preview Section - Collapsible */}
              {(selectedCategories.length > 0 || selectedCities.length > 0 ||
                selectedRadarWords.length > 0) && (
                <div className="border-t border-border pt-3">
                  <div
                    onClick={() =>
                      setIsInterestsPreviewExpanded(
                        !isInterestsPreviewExpanded,
                      )}
                    className="flex items-center justify-between cursor-pointer hover:bg-secondary/50 rounded-lg p-2 -mx-2 transition-all"
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      عرض التفاصيل
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-muted-foreground transition-transform duration-200 ${
                        isInterestsPreviewExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  <AnimatePresence>
                    {isInterestsPreviewExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 space-y-3">
                          {/* Categories Preview */}
                          {selectedCategories.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-muted-foreground mb-2">
                                التصنيفات المختارة:
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedCategories.map((catId) => {
                                  const cat = AVAILABLE_CATEGORIES.find((
                                    c: {
                                      id: string;
                                      label: string;
                                      emoji: string;
                                    },
                                  ) => c.id === catId);
                                  return cat
                                    ? (
                                      <div
                                        key={catId}
                                        className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2 py-1 rounded-lg text-xs"
                                      >
                                        <span>{cat.emoji}</span>
                                        <span className="text-primary font-medium">
                                          {cat.label}
                                        </span>
                                      </div>
                                    )
                                    : null;
                                })}
                              </div>
                            </div>
                          )}

                          {/* Cities Preview */}
                          {selectedCities.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-muted-foreground mb-2">
                                المدن المختارة:
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedCities.map((city) => (
                                  <div
                                    key={city}
                                    className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary font-medium"
                                  >
                                    {city}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Radar Words Preview */}
                          {selectedRadarWords.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-muted-foreground mb-2">
                                كلمات الرادار:
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedRadarWords.map((word) => (
                                  <div
                                    key={word}
                                    className="px-2 py-1 bg-accent/15 border border-accent/25 rounded-lg text-xs text-accent-foreground font-medium"
                                  >
                                    📡 {word}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manage Interests Modal */}
      <AnimatePresence>
        {isManageInterestsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-bold">إدارة الاهتمامات</h3>
                <button
                  type="button"
                  onClick={() => setIsManageInterestsOpen(false)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {/* Notification Toggle - Moved to top */}
                <div className="p-4 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell size={18} className="text-primary" />
                      <div>
                        <h4 className="font-bold text-sm">إشعارات الاهتمامات</h4>
                        <p className="text-xs text-muted-foreground">
                          تنبيهات فورية للطلبات التي تهمك
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // Haptic feedback
                        hapticService.impact();
                        setNotifyOnInterest(!notifyOnInterest);
                      }}
                      className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                        notifyOnInterest ? "bg-primary" : "bg-gray-300"
                      }`}
                    >
                      <motion.div
                        animate={{ x: notifyOnInterest ? -28 : 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                        className="w-5 h-5 bg-white rounded-full shadow-lg"
                      />
                    </button>
                  </div>
                </div>

                {/* Categories - Collapsible */}
                <div className="bg-secondary/50 rounded-lg border border-border overflow-hidden">
                  <div
                    onClick={() =>
                      setIsCategoriesExpanded(!isCategoriesExpanded)}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/70 transition-all"
                  >
                    <h4 className="font-bold text-sm">التصنيفات والمهام</h4>
                    <ChevronDown
                      size={18}
                      className={`text-muted-foreground transition-transform duration-200 ${
                        isCategoriesExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  <AnimatePresence>
                    {isCategoriesExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="overflow-hidden border-t border-border"
                      >
                        <div className="p-3 space-y-3">
                          <input
                            type="text"
                            placeholder="بحث..."
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 rounded-lg border-2 border-[#1E968C]/30 bg-background focus:border-[#178075] focus:outline-none transition-all"
                          />
                          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto no-scrollbar">
                            {filteredCategories.map((
                              cat: { id: string; label: string; emoji: string },
                            ) => (
                              <button
                                type="button"
                                key={cat.id}
                                onClick={() => toggleCategory(cat.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                  tempCategories.includes(cat.id)
                                    ? "bg-primary text-white"
                                    : "bg-background text-foreground hover:bg-secondary/80 border border-border"
                                }`}
                              >
                                {cat.emoji} {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Cities - Collapsible */}
                <div className="bg-secondary/50 rounded-lg border border-border overflow-hidden">
                  <div
                    onClick={() => {
                      const newState = !isCitiesExpanded;
                      setIsCitiesExpanded(newState);
                      if (newState) {
                        setIsCategoriesExpanded(false);
                        setIsRadarWordsExpanded(false);
                      }
                    }}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/70 transition-all"
                  >
                    <h4 className="font-bold text-sm">المدن والمناطق</h4>
                    <ChevronDown
                      size={18}
                      className={`text-muted-foreground transition-transform duration-200 ${
                        isCitiesExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  <AnimatePresence>
                    {isCitiesExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="overflow-hidden border-t border-border"
                      >
                        <div className="p-3 space-y-3">
                          {/* Options: جميع المدن or مدن محددة */}
                          <div className="flex gap-2 w-full">
                            <button
                              type="button"
                              onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                // اختيار "جميع المدن" = نزيل كل المدن المحددة ونضيف "كل المدن"
                                setTempCities(["كل المدن"]);
                              }}
                              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                tempCities.includes("كل المدن")
                                  ? "bg-primary text-white shadow-sm"
                                  : "bg-background text-foreground hover:bg-secondary/80 border border-border"
                              }`}
                            >
                              <MapPin size={16} />
                              <div className="flex flex-col items-center">
                                <span>جميع المدن</span>
                                <span className="text-[10px] opacity-75">
                                  يشمل عن بُعد
                                </span>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                // اختيار "مدن محددة" = نزيل "كل المدن" ونبقي على أي مدن موجودة
                                const filtered = tempCities.filter((c) =>
                                  c !== "كل المدن"
                                );
                                // إذا ما فيه مدن بعد الفلترة، نحط مصفوفة فارغة (يعني waiting for user to select)
                                setTempCities(filtered);
                              }}
                              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                !tempCities.includes("كل المدن")
                                  ? "bg-primary text-white shadow-sm"
                                  : "bg-background text-foreground hover:bg-secondary/80 border border-border"
                              }`}
                            >
                              <MapPin size={16} />
                              <span>مدن محددة</span>
                            </button>
                          </div>

                          {/* Selected Cities Chips - فقط عندما تكون "مدن محددة" */}
                          {tempCities.length > 0 &&
                            !tempCities.includes("كل المدن") &&
                            tempCities.filter((c) => c !== "عن بعد").length >
                              0 &&
                            (
                              <div className="flex flex-wrap justify-start gap-1.5 w-full">
                                {tempCities.filter((c) => c !== "عن بعد").map((
                                  city,
                                ) => (
                                  <motion.span
                                    key={city}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-sm border border-primary/30"
                                  >
                                    <MapPin size={12} />
                                    <span>{city}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (navigator.vibrate) {
                                          navigator.vibrate(10);
                                        }
                                        toggleCity(city);
                                      }}
                                      className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                                    >
                                      <X size={12} />
                                    </button>
                                  </motion.span>
                                ))}
                                {tempCities.includes("عن بعد") && (
                                  <motion.span
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-sm border border-primary/30"
                                  >
                                    <Globe size={12} />
                                    <span>عن بعد</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (navigator.vibrate) {
                                          navigator.vibrate(10);
                                        }
                                        toggleCity("عن بعد");
                                      }}
                                      className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                                    >
                                      <X size={12} />
                                    </button>
                                  </motion.span>
                                )}
                              </div>
                            )}

                          {/* City Autocomplete - فقط عندما تكون "مدن محددة" */}
                          {!tempCities.includes("كل المدن") && (
                            <CityAutocomplete
                              value=""
                              onChange={() => {}}
                              placeholder="ابحث عن مدن، معالم، أو محلات..."
                              multiSelect={true}
                              showAllCitiesOption={true}
                              selectedCities={tempCities}
                              onSelectCity={(city) => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                toggleCity(city);
                              }}
                              onRemoveCity={(city) => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                toggleCity(city);
                              }}
                              showRemoteOption={true}
                              showGPSOption={true}
                              showMapOption={true}
                              onOpenMap={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                // فتح Google Maps في نافذة جديدة
                                const mapsUrl =
                                  `https://www.google.com/maps/search/?api=1&query=المملكة+العربية+السعودية`;
                                window.open(mapsUrl, "_blank");
                              }}
                              hideChips={true}
                              dropdownDirection="up"
                            />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Radar Words - Collapsible */}
                <div className="bg-secondary/50 rounded-lg border border-border overflow-hidden">
                  <div
                    onClick={() =>
                      setIsRadarWordsExpanded(!isRadarWordsExpanded)}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/70 transition-all"
                  >
                    <h4 className="font-bold text-sm">رادار الكلمات</h4>
                    <ChevronDown
                      size={18}
                      className={`text-muted-foreground transition-transform duration-200 ${
                        isRadarWordsExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  <AnimatePresence>
                    {isRadarWordsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="overflow-hidden border-t border-border"
                      >
                        <div className="p-3 space-y-3">
                          <p className="text-xs text-muted-foreground">
                            إذا كان الطلب يتضمن إحدى هذه الكلمات، سيتم إشعارك
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="اكتب الكلمة..."
                              value={newRadarWord}
                              onChange={(e) => setNewRadarWord(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addRadarWord();
                                }
                              }}
                              className="flex-1 text-xs px-3 py-1.5 rounded-lg border-2 border-[#1E968C]/30 bg-background focus:border-[#178075] focus:outline-none transition-all"
                            />
                            <button
                              type="button"
                              onClick={addRadarWord}
                              disabled={!newRadarWord.trim()}
                              className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          {tempRadarWords.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {tempRadarWords.map((word) => (
                                <div
                                  key={word}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm"
                                >
                                  <span>{word}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeRadarWord(word)}
                                    className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 p-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsManageInterestsOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Haptic feedback
                    hapticService.impact();
                    handleSaveInterests();
                  }}
                  disabled={isSavingPreferences}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {isSavingPreferences
                    ? (
                      <>
                        <span className="inline-flex items-center gap-0.5">
                          <span className="animate-[bounce_1s_infinite]">
                            .
                          </span>
                          <span className="animate-[bounce_1s_infinite_0.2s]">
                            .
                          </span>
                          <span className="animate-[bounce_1s_infinite_0.4s]">
                            .
                          </span>
                        </span>
                        انتظار
                      </>
                    )
                    : (
                      "حفظ"
                    )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Phone Verification Modal */}
      <AnimatePresence>
        {phoneVerificationStep !== "none" && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-bold">التحقق من رقم الجوال</h3>
                <button
                  type="button"
                  onClick={() => {
                    setPhoneVerificationStep("none");
                    setPhoneOTP("");
                    setPhoneError(null);
                    setTempPhone("");
                  }}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 space-y-4">
                {phoneVerificationStep === "phone"
                  ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        سيتم إرسال رمز التحقق إلى الرقم:{" "}
                        <span className="font-medium text-foreground">
                          {tempPhone}
                        </span>
                      </p>
                      {phoneError && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                          {phoneError}
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPhoneVerificationStep("none");
                            setPhoneError(null);
                            setTempPhone("");
                          }}
                          className="flex-1 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors font-medium"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          onClick={handleSendPhoneOTP}
                          disabled={isSendingOTP}
                          className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSendingOTP ? "جاري الإرسال..." : "إرسال الرمز"}
                        </button>
                      </div>
                    </>
                  )
                  : phoneVerificationStep === "otp"
                  ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        أدخل رمز التحقق المرسل إلى:{" "}
                        <span className="font-medium text-foreground">
                          {tempPhone}
                        </span>
                      </p>
                      <input
                        type="text"
                        value={phoneOTP}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(
                            0,
                            6,
                          );
                          setPhoneOTP(value);
                          setPhoneError(null);
                        }}
                        className="w-full h-12 px-4 text-center text-2xl font-bold rounded-lg border-2 border-border bg-background focus:border-primary focus:outline-none"
                        placeholder="000000"
                        dir="ltr"
                        autoFocus
                        maxLength={6}
                      />
                      {phoneError && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                          {phoneError}
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPhoneVerificationStep("phone");
                            setPhoneOTP("");
                            setPhoneError(null);
                          }}
                          className="flex-1 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors font-medium"
                        >
                          الرجوع
                        </button>
                        <button
                          type="button"
                          onClick={handleVerifyPhoneOTP}
                          disabled={isVerifyingOTP || phoneOTP.length < 4}
                          className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isVerifyingOTP ? "جاري التحقق..." : "تحقق"}
                        </button>
                      </div>
                    </>
                  )
                  : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
