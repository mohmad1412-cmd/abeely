import React, { useEffect, useRef, useState } from "react";
import { logger } from "../utils/logger";
import { Review, UserPreferences } from "../types";
import { Badge } from "./ui/Badge";
import {
  Bell,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  Edit,
  Edit2,
  Filter,
  MapPin,
  Plus,
  Search,
  User,
  X,
} from "lucide-react";
import { Button } from "./ui/Button";
import { UnifiedHeader } from "./ui/UnifiedHeader";
import { AnimatePresence, motion } from "framer-motion";
import { uploadAvatar } from "../services/storageService";
import { AVAILABLE_CATEGORIES } from "../data";
import { CityAutocomplete } from "./ui/CityAutocomplete";
import { createPortal } from "react-dom";

interface ProfileProps {
  userReviews: Review[];
  userRating: number;
  profileRole: "requester" | "provider";
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  onOpenLanguagePopup?: () => void;
  // Unified Header Props
  mode: "requests" | "offers";
  toggleMode: () => void;
  isModeSwitching: boolean;
  unreadCount: number;
  hasUnreadMessages: boolean;
  user: any;
  onUpdateProfile?: (updates: any) => Promise<void>;
  userPreferences?: UserPreferences;
  onUpdatePreferences?: (prefs: UserPreferences) => void;
  setView: (view: any) => void;
  setPreviousView: (view: any) => void;
  titleKey: number;
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  onNotificationClick?: (notification: any) => void;
  onClearAll: () => void;
  onSignOut: () => void;
  onBack: () => void;
  isGuest?: boolean;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  onSelectRequest?: (req: any) => void; // Added for request navigation
}

export const Profile: React.FC<ProfileProps> = ({
  userReviews,
  userRating,
  profileRole,
  isDarkMode,
  toggleTheme,
  onOpenLanguagePopup,
  mode,
  toggleMode,
  isModeSwitching,
  unreadCount,
  hasUnreadMessages,
  user,
  onUpdateProfile,
  userPreferences = {
    interestedCategories: [],
    interestedCities: [],
    notifyOnInterest: true,
    roleMode: "requester",
    showNameToApprovedProvider: true,
    radarWords: [],
  },
  onUpdatePreferences,
  setView,
  setPreviousView,
  titleKey,
  notifications,
  onMarkAsRead,
  onNotificationClick,
  onClearAll,
  onSignOut,
  onBack,
  isGuest = false,
  onNavigateToProfile,
  onNavigateToSettings,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [bio, setBio] = useState((user as any)?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null,
  );
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interests management state
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    userPreferences.interestedCategories,
  );
  const [selectedCities, setSelectedCities] = useState<string[]>(
    userPreferences.interestedCities,
  );
  const [isManageInterestsOpen, setIsManageInterestsOpen] = useState(false);
  const [tempCategories, setTempCategories] = useState<string[]>(
    selectedCategories,
  );
  const [tempCities, setTempCities] = useState<string[]>(selectedCities);
  const [categorySearch, setCategorySearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [isCitiesExpanded, setIsCitiesExpanded] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  // Sync displayName and bio with user data when user changes
  useEffect(() => {
    setDisplayName(user?.display_name || "");
    setBio((user as any)?.bio || "");
    setAvatarUrl(user?.avatar_url || "");
  }, [user]);

  // Sync interests with userPreferences
  useEffect(() => {
    setSelectedCategories(userPreferences.interestedCategories);
    setSelectedCities(userPreferences.interestedCities);
  }, [userPreferences]);

  const handleSaveInterests = async () => {
    setIsSavingPreferences(true);
    try {
      setSelectedCategories(tempCategories);
      setSelectedCities(tempCities);
      if (onUpdatePreferences) {
        await onUpdatePreferences({
          ...userPreferences,
          interestedCategories: tempCategories,
          interestedCities: tempCities,
        });
      }
      setIsManageInterestsOpen(false);
    } catch (error) {
      logger.error("خطأ في حفظ الاهتمامات:", error, "service");
      alert("حدث خطأ أثناء حفظ الاهتمامات. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const toggleCategory = (catId: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setTempCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId]
    );
  };

  const toggleCity = (city: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
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

  const filteredCategories = AVAILABLE_CATEGORIES.filter((cat) =>
    cat.label.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Close modal when clicking outside or pressing Escape
  useEffect(() => {
    if (isManageInterestsOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsManageInterestsOpen(false);
        }
      };
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isManageInterestsOpen]);

  const handleSaveName = async () => {
    if (onUpdateProfile && displayName.trim()) {
      setIsSavingName(true);
      try {
        await onUpdateProfile({ display_name: displayName.trim() });
        // انتظر قليلاً للتأكد من تحديث user state
        await new Promise((resolve) => setTimeout(resolve, 100));
        setIsEditingName(false);
      } catch (error) {
        logger.error("خطأ في حفظ الاسم:", error, "service");
        alert("حدث خطأ أثناء حفظ الاسم. يرجى المحاولة مرة أخرى.");
      } finally {
        setIsSavingName(false);
      }
    } else {
      setIsEditingName(false);
    }
  };

  const handleSaveBio = async () => {
    if (onUpdateProfile) {
      setIsSavingBio(true);
      try {
        const trimmedBio = bio.trim();
        await onUpdateProfile({ bio: trimmedBio.length ? trimmedBio : null });
        setIsEditingBio(false);
      } catch (error) {
        logger.error("خطأ في حفظ التعريف:", error, "service");
        alert("حدث خطأ أثناء حفظ التعريف. يرجى المحاولة مرة أخرى.");
      } finally {
        setIsSavingBio(false);
      }
    } else {
      setIsEditingBio(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // حفظ الملف للرفع لاحقاً
      setSelectedAvatarFile(file);
      // معاينة الصورة
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = async () => {
    if (avatarPreview && selectedAvatarFile && onUpdateProfile && user?.id) {
      setIsUploadingAvatar(true);
      try {
        // رفع الصورة إلى Supabase Storage
        const uploadedUrl = await uploadAvatar(
          selectedAvatarFile,
          user.id,
          avatarUrl,
        );

        if (uploadedUrl) {
          // حفظ URL في قاعدة البيانات
          await onUpdateProfile({ avatar_url: uploadedUrl });

          // تحديث الـ state المحلي بعد الحفظ الناجح
          setAvatarUrl(uploadedUrl);
          setAvatarPreview(null);
          setSelectedAvatarFile(null);
          // إعادة تعيين input
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } else {
          logger.error("فشل رفع الصورة");
        }
      } catch (error) {
        logger.error("خطأ في حفظ الصورة:", error, "service");
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleCancelAvatar = () => {
    setAvatarPreview(null);
    setSelectedAvatarFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        onOpenLanguagePopup={onOpenLanguagePopup}
        setView={setView}
        setPreviousView={setPreviousView}
        titleKey={titleKey}
        notifications={notifications}
        onMarkAsRead={onMarkAsRead}
        onNotificationClick={onNotificationClick}
        onClearAll={onClearAll}
        onSignOut={onSignOut}
        onGoToMarketplace={onBack}
        title="الملف الشخصي"
        currentView="profile"
        hideModeToggle={true}
        isGuest={isGuest}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToSettings={onNavigateToSettings}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="container mx-auto max-w-4xl p-4 md:p-8">
          {/* Header Profile Card */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-l from-primary/10 to-transparent -z-0 rounded-t-xl">
            </div>

            <div className="relative w-24 h-24 md:w-32 md:h-32 shrink-0 z-10 group">
              <div className="w-full h-full rounded-full bg-secondary overflow-hidden border-4 border-background shadow-md">
                {avatarPreview || avatarUrl
                  ? (
                    <img
                      src={avatarPreview || avatarUrl}
                      alt="User"
                      className="w-full h-full object-cover"
                    />
                  )
                  : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                      <User
                        size={avatarUrl ? 40 : 32}
                        className="text-primary/40"
                      />
                    </div>
                  )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              {avatarPreview
                ? (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 rounded-full">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleSaveAvatar}
                      disabled={isUploadingAvatar}
                      className="p-2 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="حفظ"
                    >
                      {isUploadingAvatar
                        ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin">
                          </div>
                        )
                        : <Check size={18} />}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleCancelAvatar}
                      disabled={isUploadingAvatar}
                      className="p-2 rounded-full bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="إلغاء"
                    >
                      <X size={18} />
                    </motion.button>
                  </div>
                )
                : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAvatarClick}
                    className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors"
                    title="تعديل الصورة"
                  >
                    <Camera size={16} />
                  </motion.button>
                )}
            </div>

            <div className="flex-1 text-center md:text-right z-10 w-full">
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-2">
                <div className="flex-1 w-full">
                  {/* Name with Edit */}
                  <div className="w-full mb-2">
                    {isEditingName
                      ? (
                        <div className="flex flex-col gap-2 w-full">
                          <div className="relative">
                            <input
                              type="text"
                              value={displayName}
                              onChange={(e) => {
                                if (e.target.value.length <= 60) {
                                  setDisplayName(e.target.value);
                                }
                              }}
                              maxLength={60}
                              className="w-full text-2xl font-bold bg-background border border-border rounded-lg px-3 py-2 pr-20 focus:outline-none focus:border-primary"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveName();
                                } else if (e.key === "Escape") {
                                  setIsEditingName(false);
                                  setDisplayName(user?.display_name || "");
                                }
                              }}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                              <span
                                className={displayName.length >= 50
                                  ? "text-orange-500 font-medium"
                                  : ""}
                              >
                                {displayName.length}
                              </span>
                              <span className="text-muted-foreground">
                                / 60
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleSaveName}
                              disabled={isSavingName}
                              className="px-4 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                  <>
                                    <Check size={16} />
                                    حفظ
                                  </>
                                )}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setIsEditingName(false);
                                setDisplayName(user?.display_name || "");
                              }}
                              className="px-4 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium flex items-center gap-2"
                            >
                              <X size={16} />
                              إلغاء
                            </motion.button>
                          </div>
                        </div>
                      )
                      : (
                        displayName.trim() === ""
                          ? (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setIsEditingName(true)}
                              className="w-full text-center md:text-right py-3 px-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-secondary/20 hover:bg-secondary/40 transition-all text-muted-foreground hover:text-primary"
                            >
                              <div className="flex items-center justify-center md:justify-start gap-2">
                                <Edit2 size={18} />
                                <span className="text-sm font-medium">
                                  أضف اسمك
                                </span>
                              </div>
                            </motion.button>
                          )
                          : (
                            <div className="flex items-start justify-center md:justify-start gap-2 w-full">
                              <h1 className="text-2xl font-bold flex-1 break-words overflow-wrap-anywhere min-w-0">
                                {displayName}
                              </h1>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setIsEditingName(true)}
                                className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-primary shrink-0 mt-1"
                                title="تعديل الاسم"
                              >
                                <Edit2 size={18} />
                              </motion.button>
                            </div>
                          )
                      )}
                  </div>

                  {user?.created_at && (
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                      <Badge variant="outline">
                        <Calendar size={12} className="ml-1" />
                        عضو منذ {new Date(user.created_at).getFullYear()}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio with Edit */}
              <div className="relative">
                {isEditingBio
                  ? (
                    <div className="flex flex-col gap-2 w-full">
                      <div className="relative">
                        <textarea
                          value={bio}
                          onChange={(e) => {
                            if (e.target.value.length <= 200) {
                              setBio(e.target.value);
                            }
                          }}
                          rows={4}
                          maxLength={200}
                          className="w-full text-sm leading-relaxed bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary resize-none"
                          autoFocus
                        />
                        <div className="absolute bottom-2 left-3 text-xs text-muted-foreground">
                          <span
                            className={bio.length >= 180
                              ? "text-orange-500 font-medium"
                              : ""}
                          >
                            {bio.length}
                          </span>
                          <span className="text-muted-foreground">/ 200</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSaveBio}
                          disabled={isSavingBio}
                          className="px-4 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSavingBio
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
                              <>
                                <Check size={16} />
                                حفظ
                              </>
                            )}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setIsEditingBio(false);
                            setBio((user as any)?.bio || "");
                          }}
                          className="px-4 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          <X size={16} />
                          إلغاء
                        </motion.button>
                      </div>
                    </div>
                  )
                  : (
                    bio.trim() === ""
                      ? (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setIsEditingBio(true)}
                          className="w-full text-center md:text-right py-3 px-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-secondary/20 hover:bg-secondary/40 transition-all text-muted-foreground hover:text-primary"
                        >
                          <div className="flex items-center justify-center md:justify-start gap-2">
                            <Edit2 size={18} />
                            <span className="text-sm font-medium">
                              أضف تعريف بنفسك
                            </span>
                          </div>
                        </motion.button>
                      )
                      : (
                        <div className="flex items-start justify-center md:justify-start gap-3 w-full">
                          <p className="text-sm leading-relaxed text-muted-foreground flex-1 pr-0">
                            {bio}
                          </p>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsEditingBio(true)}
                            className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-primary shrink-0 mt-0.5"
                            title="تعديل التعريف"
                          >
                            <Edit2 size={16} />
                          </motion.button>
                        </div>
                      )
                  )}
              </div>
            </div>
          </div>

          {/* Interests Section */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <Filter size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base">الاهتمامات</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedCategories.length > 0 || selectedCities.length > 0
                      ? [
                        selectedCategories.length > 0 &&
                        `${selectedCategories.length} تصنيف`,
                        selectedCities.length > 0 &&
                        `${selectedCities.length} مدينة`,
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
                  setCitySearch("");
                  setCategorySearch("");
                  setIsManageInterestsOpen(true);
                }}
                className="gap-2 h-9 rounded-xl border-primary/20 hover:bg-primary/5 text-primary text-xs font-bold shrink-0"
              >
                <Edit size={14} />
                تعديل الاهتمامات
              </Button>
            </div>

            {/* Preview Section */}
            {(selectedCategories.length > 0 || selectedCities.length > 0) && (
              <div className="space-y-3 pt-3 border-t border-border">
                {/* Categories Preview */}
                {selectedCategories.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground mb-2">
                      التصنيفات المختارة:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCategories.map((catId) => {
                        const cat = AVAILABLE_CATEGORIES.find((c) =>
                          c.id === catId
                        );
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manage Interests Modal - Bottom Sheet Style */}
      <AnimatePresence>
        {isManageInterestsOpen && createPortal(
          <div className="fixed inset-0 z-[9999]">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsManageInterestsOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* Popup Content */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-x border-border/50"
            >
              {/* Handle Bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-4 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">
                  إدارة الاهتمامات
                </h2>
                <button
                  onClick={() => setIsManageInterestsOpen(false)}
                  className="p-2 hover:bg-secondary rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                {/* Categories - Collapsible */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const newState = !isCategoriesExpanded;
                      setIsCategoriesExpanded(newState);
                      if (newState) {
                        setIsCitiesExpanded(false);
                      }
                    }}
                    className="flex items-center justify-between w-full"
                  >
                    <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                      <Filter
                        size={16}
                        strokeWidth={2.5}
                        className="text-primary"
                      />
                      التصنيفات والمهام
                      {tempCategories.length > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-primary text-white px-1.5 text-[10px] font-bold">
                          {tempCategories.length}
                        </span>
                      )}
                    </h3>
                    <motion.div
                      animate={{ rotate: isCategoriesExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown
                        size={18}
                        className="text-muted-foreground"
                      />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {isCategoriesExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-3"
                      >
                        <div className="relative mt-3">
                          <Search
                            size={16}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          />
                          <input
                            type="text"
                            placeholder="ابحث عن تصنيف..."
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            className="w-full pr-10 pl-4 py-2 rounded-xl border-2 border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-all text-sm"
                          />
                        </div>
                        <div className="flex flex-wrap justify-start gap-2 max-h-48 overflow-y-auto no-scrollbar w-full">
                          {filteredCategories.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => toggleCategory(cat.id)}
                              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                tempCategories.includes(cat.id)
                                  ? "bg-primary text-white shadow-sm"
                                  : "bg-secondary/60 text-foreground hover:bg-secondary border border-border/50"
                              }`}
                            >
                              {cat.emoji} {cat.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Divider */}
                <div className="border-t border-border" />

                {/* Cities - Collapsible */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const newState = !isCitiesExpanded;
                      setIsCitiesExpanded(newState);
                      if (newState) {
                        setIsCategoriesExpanded(false);
                      }
                    }}
                    className="flex items-center justify-between w-full"
                  >
                    <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                      <MapPin
                        size={16}
                        strokeWidth={2.5}
                        className="text-red-500"
                      />
                      المدن والمناطق
                      {tempCities.length > 0 &&
                        !tempCities.includes("كل المدن") && (
                        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-red-500 text-white px-1.5 text-[10px] font-bold">
                          {tempCities.filter((c) => c !== "عن بعد").length}
                        </span>
                      )}
                    </h3>
                    <motion.div
                      animate={{ rotate: isCitiesExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown
                        size={18}
                        className="text-muted-foreground"
                      />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {isCitiesExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-3"
                      >
                        {/* Options: جميع المدن or مدن محددة */}
                        <div className="flex gap-2 mt-3 w-full">
                          <button
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(10);
                              setTempCities([
                                ...tempCities.filter((c) => c === "عن بعد"),
                                "كل المدن",
                              ]);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                              (tempCities.length === 0 ||
                                  tempCities.includes("كل المدن")) &&
                                tempCities.filter((c) =>
                                    c !== "كل المدن" && c !== "عن بعد"
                                  ).length === 0
                                ? "bg-primary text-white shadow-sm"
                                : "bg-secondary/60 text-foreground hover:bg-secondary border border-border/50"
                            }`}
                          >
                            <MapPin size={16} />
                            <span>جميع المدن</span>
                          </button>
                          <button
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(10);
                              if (tempCities.includes("كل المدن")) {
                                setTempCities(
                                  tempCities.filter((c) => c !== "كل المدن"),
                                );
                              }
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                              tempCities.length > 0 &&
                                !tempCities.includes("كل المدن") &&
                                tempCities.filter((c) => c !== "عن بعد")
                                    .length > 0
                                ? "bg-primary text-white shadow-sm"
                                : "bg-secondary/60 text-foreground hover:bg-secondary border border-border/50"
                            }`}
                          >
                            <MapPin size={16} />
                            <span>مدن محددة</span>
                          </button>
                        </div>

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
                              const mapsUrl =
                                `https://www.google.com/maps/search/?api=1&query=المملكة+العربية+السعودية`;
                              window.open(mapsUrl, "_blank");
                            }}
                            hideChips={true}
                            dropdownDirection="up"
                          />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Footer with Action Button */}
              <div className="border-t border-border/50 bg-card/95 backdrop-blur-xl px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsManageInterestsOpen(false)}
                    className="flex-1 h-12 px-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors font-bold text-sm"
                  >
                    إلغاء
                  </button>
                  <Button
                    className="flex-1 h-12 text-sm font-bold shadow-lg gap-2 rounded-xl"
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(15);
                      handleSaveInterests();
                    }}
                    disabled={isSavingPreferences}
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
                        "حفظ وتطبيق"
                      )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}
      </AnimatePresence>
    </div>
  );
};
