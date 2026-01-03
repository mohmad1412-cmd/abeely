import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeftRight, 
  Bell, 
  X, 
  LogOut, 
  LogIn,
  DoorOpen,
  Briefcase,
  User,
  ArrowRight,
  Share2,
  Check,
  Link,
  Plus,
  ArrowLeft,
  Send,
  ChevronsDown,
  Loader2,
  FileText,
  FileEdit,
  Search,
  Filter,
  Settings,
  ChevronDown,
  Moon,
  Sun,
  Globe,
  MoreVertical
} from "lucide-react";
import { DropdownMenu, DropdownMenuItem } from "./DropdownMenu";
import { NotificationsPopover } from "../NotificationsPopover";

interface UnifiedHeaderProps {
  mode: 'requests' | 'offers';
  toggleMode: () => void;
  isModeSwitching: boolean;
  unreadCount: number;
  hasUnreadMessages?: boolean; // kept for compatibility, not used
  user: any;
  setView?: (view: any) => void; // kept for compatibility, not used
  setPreviousView?: (view: any) => void; // kept for compatibility, not used
  titleKey: number;
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onSignOut: () => void;
  onNotificationClick?: (notification: any) => void; // Callback للتنقل عند النقر على الإشعار
  backButton?: boolean;
  onBack?: () => void;
  closeIcon?: boolean; // Use X icon instead of arrow for back button
  title?: string;
  isScrolled?: boolean;
  showTabs?: boolean;
  currentView?: string; // kept for compatibility, not used
  transparent?: boolean;
  hideModeToggle?: boolean; // Hide the mode toggle button
  isGuest?: boolean; // Guest mode - show login button instead of sign out
  // Share functionality
  showShareButton?: boolean;
  onShare?: () => void;
  shareUrl?: string; // Optional: URL to copy directly
  // Submit button (replaces notifications in CreateRequestV2)
  showSubmitButton?: boolean;
  canSubmit?: boolean;
  onSubmit?: () => void;
  justBecameReady?: boolean; // For celebration animation
  // Submit states for animation
  isSubmitting?: boolean;
  submitSuccess?: boolean;
  onGoToRequest?: () => void; // Navigate to created request
  isEditMode?: boolean; // Edit mode - changes button text to "حفظ التعديلات"
  editButtonIsSaved?: boolean; // In edit mode: true = "تم الحفظ", false = "حفظ التعديلات"
  // Scroll to offer button (for RequestDetail page)
  showScrollToOffer?: boolean;
  onScrollToOffer?: () => void;
  isOfferSectionVisible?: boolean; // Hide button when offer section is visible
  // Offer submit button (for RequestDetail - like submit request button)
  canSubmitOffer?: boolean;
  onSubmitOffer?: () => void;
  isSubmittingOffer?: boolean;
  offerSubmitSuccess?: boolean;
  // My Request button (for viewing own request)
  showMyRequestButton?: boolean;
  myRequestOffersCount?: number;
  onMyRequestClick?: () => void;
  // Back to marketplace
  onGoToMarketplace?: () => void; // If provided, mobile back button navigates to marketplace
  // Search functionality
  showSearchButton?: boolean;
  onSearchClick?: () => void;
  hasActiveFilters?: boolean;
  activeFiltersCount?: number;
  hideActionButtons?: boolean; // Hide action buttons (search, notifications, etc.) to merge with other elements
  // Profile dropdown navigation
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  // Theme and language
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  onOpenLanguagePopup?: () => void;
  // Hide profile button
  hideProfileButton?: boolean;
  // Create Request button (for Marketplace)
  showCreateRequestButton?: boolean;
  onCreateRequest?: () => void;
  // Three-dot menu (for RequestDetail)
  showThreeDotsMenu?: boolean;
  threeDotsMenuItems?: DropdownMenuItem[];
  // Is this page currently active
  isActive?: boolean;
  // Title edit button (for CreateRequestV2)
  showTitleEditButton?: boolean;
  onTitleEdit?: () => void;
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  mode,
  toggleMode,
  isModeSwitching,
  unreadCount,
  user,
  titleKey,
  notifications,
  onMarkAsRead,
  onClearAll,
  onSignOut,
  onNotificationClick,
  backButton,
  onBack,
  closeIcon = false,
  title,
  isScrolled = true,
  currentView,
  transparent = false,
  hideModeToggle = false,
  isGuest = false,
  showShareButton = false,
  onShare,
  shareUrl,
  showSubmitButton = false,
  canSubmit = false,
  onSubmit,
  justBecameReady = false,
  isSubmitting = false,
  submitSuccess = false,
  onGoToRequest,
  isEditMode = false,
  editButtonIsSaved = false,
  showScrollToOffer = false,
  onScrollToOffer,
  isOfferSectionVisible = false,
  canSubmitOffer = false,
  onSubmitOffer,
  isSubmittingOffer = false,
  offerSubmitSuccess = false,
  showMyRequestButton = false,
  myRequestOffersCount = 0,
  onMyRequestClick,
  onGoToMarketplace,
  showSearchButton = false,
  onSearchClick,
  hasActiveFilters = false,
  activeFiltersCount = 0,
  hideActionButtons = false,
  onNavigateToProfile,
  onNavigateToSettings,
  isDarkMode = false,
  toggleTheme,
  onOpenLanguagePopup,
  hideProfileButton = false,
  showCreateRequestButton = false,
  onCreateRequest,
  showThreeDotsMenu = false,
  threeDotsMenuItems = [],
  isActive = true,
  showTitleEditButton = false,
  onTitleEdit,
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [showCreateHint, setShowCreateHint] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const [iconToggle, setIconToggle] = useState(false);

  // Determine guest icon based on section
  const getGuestIcon = () => {
    if (title === "سوق الطلبات" || currentView === "marketplace") return Search;
    if (title === "طلباتي" || currentView === "my-requests") return FileText;
    if (title === "عروضي" || currentView === "my-offers") return Briefcase;
    return Search;
  };
  const GuestIcon = getGuestIcon();
  
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
  
  // Show "Create Request" hint every 35 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCreateHint(true);
      // Hide after 8 seconds
      setTimeout(() => setShowCreateHint(false), 8000);
    }, 35000);

    return () => clearInterval(interval);
  }, []);

  // Toggle between Search and Filter icons (only when no active filters)
  useEffect(() => {
    if (hasActiveFilters) return; // لا تبديل عند وجود فلاتر نشطة
    
    const interval = setInterval(() => {
      setIconToggle(prev => !prev);
    }, 3000); // تبديل كل 3 ثوان

    return () => clearInterval(interval);
  }, [hasActiveFilters]);
  
  // Handle share/copy link
  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }
    
    // If shareUrl is provided, copy it directly
    if (shareUrl) {
      try {
        // Try native share first (mobile)
        if (navigator.share) {
          await navigator.share({
            title: title || 'عبيلي',
            url: shareUrl,
          });
        } else {
          // Fallback to clipboard
          await navigator.clipboard.writeText(shareUrl);
          setIsLinkCopied(true);
          setTimeout(() => setIsLinkCopied(false), 2000);
        }
      } catch (err) {
        // User cancelled or error, try clipboard
        try {
          await navigator.clipboard.writeText(shareUrl);
          setIsLinkCopied(true);
          setTimeout(() => setIsLinkCopied(false), 2000);
        } catch (clipErr) {
          console.error('Failed to copy:', clipErr);
        }
      }
    }
  };

  const headerContent = (
    <>
      <div className="h-16 flex items-center justify-between pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center gap-3 flex-1 min-w-0">
        {backButton ? (
          <motion.button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(12);
              onBack?.();
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-foreground focus:outline-none bg-card/80 backdrop-blur-sm border border-border shadow-lg hover:bg-card group shrink-0"
          >
            {/* Pulse ring effect - only on active/touch */}
            <span className="absolute inset-0 rounded-full border-2 border-primary/50 opacity-0 group-active:opacity-100 group-active:animate-ping" />
            {closeIcon ? <X size={22} strokeWidth={2.5} className="relative z-10" /> : <ArrowRight size={22} strokeWidth={2.5} className="relative z-10" />}
          </motion.button>
        ) : onGoToMarketplace ? (
          <motion.button
            className="md:hidden relative w-10 h-10 rounded-full flex items-center justify-center text-foreground focus:outline-none bg-card/80 backdrop-blur-sm border border-border shadow-lg hover:bg-card group shrink-0"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(12);
              onGoToMarketplace?.();
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            {/* Pulse ring effect - only on active/touch */}
            <span className="absolute inset-0 rounded-full border-2 border-primary/50 opacity-0 group-active:opacity-100 group-active:animate-ping" />
            <ArrowRight size={22} strokeWidth={2.5} className="relative z-10" />
          </motion.button>
        ) : null}
        
        {!backButton && !hideProfileButton && title && isActive && (
            <>
              {/* Combined container for title and profile - styled like filter tabs */}
              <motion.div 
                layout
                layoutId="header-title-container"
                className="flex items-center gap-2 h-10 px-3 pr-1.5 rounded-full bg-card/95 backdrop-blur-xl border border-border shadow-lg min-w-0"
                initial={false}
                transition={{  
                  type: "spring", 
                  stiffness: 300, 
                  damping: 35,
                  layout: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }
                }}
              >
                {/* Profile Button - on the right (first in RTL) */}
                <div 
                  className="relative shrink-0" 
                  ref={profileDropdownRef}
                >
                <motion.button
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(8);
                    setIsProfileDropdownOpen(!isProfileDropdownOpen);
                  }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative flex items-center justify-center overflow-visible shrink-0 ${
                    isGuest 
                      ? 'w-8 h-8 rounded-full bg-gradient-to-br from-primary to-teal-600 border border-white/20 shadow-lg shadow-primary/30' 
                      : 'w-7 h-7 rounded-full bg-primary/10 border border-primary/20'
                  }`}
                >
                  {isGuest ? (
                    <GuestIcon size={16} className="text-white" />
                  ) : (
                    <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt={user?.display_name || "User"} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-primary">{user?.display_name?.charAt(0) || "م"}</span>
                      )}
                    </div>
                  )}
                  {/* Dropdown arrow indicator - only for logged in users */}
                  {!isGuest && (
                    <motion.div 
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-card border border-border shadow-sm flex items-center justify-center"
                      animate={{ rotate: isProfileDropdownOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={10} strokeWidth={2.5} className="text-muted-foreground" />
                    </motion.div>
                  )}
                </motion.button>
                
                {/* Profile Dropdown - For all users - Rendered via Portal */}
                {isProfileDropdownOpen && ReactDOM.createPortal(
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[99998]"
                    >
                      {/* Backdrop - blocks scroll and all interactions */}
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
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="fixed w-56 bg-card rounded-2xl border border-border shadow-2xl overflow-hidden pointer-events-auto"
                        style={{ 
                          top: profileDropdownRef.current ? profileDropdownRef.current.getBoundingClientRect().bottom + 8 : 60,
                          right: 16,
                          zIndex: 99999,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* User Info */}
                        <div className="p-4 border-b border-border/50">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 ${
                              isGuest 
                                ? 'bg-muted/30 border border-border/50' 
                                : 'bg-primary/10 border border-primary/20'
                            }`}>
                              {user?.avatar_url ? (
                                <img src={user.avatar_url} alt={user?.display_name || "User"} className="w-full h-full object-cover" />
                              ) : isGuest ? (
                                <User size={20} className="text-muted-foreground/50" />
                              ) : (
                                <span className="text-sm font-bold text-primary">{user?.display_name?.charAt(0) || "م"}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-foreground truncate">
                                {isGuest ? "زائر" : user?.display_name || "المستخدم"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {isGuest ? "سجل دخولك للمزيد" : user?.email || ""}
                              </p>
                            </div>
                          </div>
                        </div>
                        
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
                          
                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              onSignOut();
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
                </div>
                
                {/* Page Title - on the left (after profile in RTL) */}
                {title && (
                  <h1 className="text-sm font-medium text-foreground truncate flex-1">
                    {title}
                  </h1>
                )}
              </motion.div>
            </>
          )}
          
          {/* Standalone Profile Button - for pages without title */}
          {!backButton && !hideProfileButton && !title && (
            <div 
              className="relative" 
              ref={profileDropdownRef}
            >
              <motion.button
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(8);
                  setIsProfileDropdownOpen(!isProfileDropdownOpen);
                }}
                whileTap={{ scale: 0.95 }}
                className={`relative flex items-center justify-center overflow-visible shrink-0 shadow-lg hover:shadow-xl transition-shadow ${
                  isGuest 
                    ? 'w-9 h-9 rounded-full bg-gradient-to-br from-primary to-teal-600 border border-white/20' 
                    : 'w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm border border-white/20'
                }`}
              >
                {isGuest ? (
                  <GuestIcon size={18} className="text-white" />
                ) : (
                  <>
                    <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt={user?.display_name || "User"} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-primary">{user?.display_name?.charAt(0) || "م"}</span>
                      )}
                    </div>
                    {/* Decorative icon - arrow dropdown indicator */}
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-primary border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-lg">
                      <ChevronDown size={14} strokeWidth={3} className="text-white" />
                    </div>
                  </>
                )}
              </motion.button>
              
              {/* Profile Dropdown - Rendered via Portal */}
              {isProfileDropdownOpen && ReactDOM.createPortal(
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[99998]"
                  >
                    {/* Backdrop - blocks scroll and all interactions */}
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
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="fixed w-56 bg-card rounded-2xl border border-border shadow-2xl overflow-hidden pointer-events-auto"
                      style={{ 
                        top: profileDropdownRef.current ? profileDropdownRef.current.getBoundingClientRect().bottom + 8 : 60,
                        right: 16,
                        zIndex: 99999,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-4 border-b border-border/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 ${
                            isGuest 
                              ? 'bg-muted/30 border border-border/50' 
                              : 'bg-primary/10 border border-primary/20'
                          }`}>
                            {user?.avatar_url ? (
                              <img src={user.avatar_url} alt={user?.display_name || "User"} className="w-full h-full object-cover" />
                            ) : isGuest ? (
                              <User size={20} className="text-muted-foreground/50" />
                            ) : (
                              <span className="text-sm font-bold text-primary">{user?.display_name?.charAt(0) || "م"}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-foreground truncate">
                              {isGuest ? "زائر" : user?.display_name || "المستخدم"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {isGuest ? "سجل دخولك للمزيد" : user?.email || ""}
                            </p>
                          </div>
                        </div>
                      </div>
                      
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
                        
                        <div className="flex items-center gap-2 px-2 py-1.5">
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
                        
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            onSignOut();
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
            </div>
          )}
          
          {/* Title for pages with back button - only shows when scrolled, shrinks to fit */}
          {backButton && isScrolled && (
            <motion.div
              key="scrolled-title"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="px-4 h-10 flex items-center gap-2 rounded-full bg-card/95 backdrop-blur-xl border border-border shadow-lg min-w-0 flex-1"
            >
              <span className={`font-bold text-sm text-foreground truncate block flex-1 ${
                title === "إنشاء طلب جديد" || title === "تعديل الطلب" || title === "جاري كتابة العنوان..." 
                  ? "text-left" 
                  : "text-right"
              }`}>
                {title}
              </span>
              {/* Title edit button */}
              {showTitleEditButton && onTitleEdit && (
                <button
                  onClick={onTitleEdit}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                >
                  <FileEdit size={18} className="text-primary" />
                </button>
              )}
              {/* Three-dot menu in scrolled title */}
              {showThreeDotsMenu && threeDotsMenuItems.length > 0 && (
                <DropdownMenu
                  trigger={
                    <button className="p-1.5 rounded-lg hover:bg-black/5 transition-colors shrink-0">
                      <MoreVertical size={18} strokeWidth={2.5} className="text-muted-foreground" />
                    </button>
                  }
                  items={threeDotsMenuItems}
                  align="left"
                />
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Create Request Button - Always visible when enabled, independent of hideActionButtons */}
      {showCreateRequestButton && onCreateRequest && isActive && (
        <motion.button
          key="create-request-btn"
          layout
          layoutId="header-create-request-btn"
          onClick={onCreateRequest}
          initial={false}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="create-request-btn relative flex items-center gap-2 h-10 px-4 rounded-full group active:scale-95 overflow-hidden bg-card/95 backdrop-blur-xl shadow-lg hover:bg-card"
          transition={{  
            type: "spring", 
            stiffness: 300, 
            damping: 35,
            layout: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }
          }}
        >
          {/* Animated border glow */}
          <div className="create-request-border" />
          {/* Inner shimmer glow */}
          <div className="create-request-shimmer" />
          <Plus size={18} strokeWidth={2.5} className="relative z-10 text-foreground" />
          <span className="relative z-10 text-sm font-medium text-foreground whitespace-nowrap">
            أنشئ طلب
          </span>
        </motion.button>
      )}

      {!hideActionButtons && (
      <div className="flex items-center gap-2">
        {/* Share Button */}
        {showShareButton && (shareUrl || onShare) && (
          <motion.button
            onClick={handleShare}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center justify-center h-11 w-11 rounded-xl transition-all duration-300 active:scale-95 group ${
              isLinkCopied 
                ? "bg-primary/20 border border-primary/40 text-primary" 
                : "bg-card border border-border hover:text-primary hover:border-primary/30"
            }`}
            title={isLinkCopied ? "تم نسخ الرابط!" : "مشاركة الرابط"}
          >
            <AnimatePresence mode="wait">
              {isLinkCopied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <Check size={18} strokeWidth={2.5} className="text-primary" />
                </motion.div>
              ) : (
                <motion.div
                  key="share"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Share2 size={18} strokeWidth={2} className="text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}
        
        {!showScrollToOffer && (
          <>
            {/* Submit Button OR Notification Bell */}
            {showSubmitButton ? (
              <motion.button
                type="button"
                data-no-swipe="true"
                disabled={isSubmitting || (!canSubmit && !submitSuccess && !editButtonIsSaved)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  
                  // في وضع التعديل مع "تم الحفظ" - العودة للصفحة السابقة
                  if (isEditMode && editButtonIsSaved && onGoToRequest) {
                    if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
                    onGoToRequest();
                    return;
                  }
                  
                  // إذا نجح الإرسال (وضع الإنشاء)، انتقل للطلب
                  if (!isEditMode && submitSuccess && onGoToRequest) {
                    if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
                    onGoToRequest();
                    return;
                  }
                  
                  // إرسال/حفظ الطلب
                  console.log("Submit button clicked - checking conditions:", { 
                    canSubmit, 
                    hasOnSubmit: !!onSubmit, 
                    isSubmitting,
                    isEditMode,
                    editButtonIsSaved,
                    submitSuccess
                  });
                  
                  if (canSubmit && onSubmit && !isSubmitting) {
                    console.log("Conditions met - calling onSubmit");
                    if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
                    onSubmit();
                  } else {
                    console.log("Conditions NOT met - button click ignored");
                  }
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                }}
                whileTap={{ 
                  scale: 0.96,
                  transition: { duration: 0.1, ease: "easeOut" }
                }}
                animate={(submitSuccess || (isEditMode && editButtonIsSaved)) ? {
                  scale: 1,
                  transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }
                } : {
                  scale: 1
                }}
                className={`relative flex items-center gap-2 h-11 rounded-full overflow-visible select-none transition-all duration-300 translate-y-[1px] ${
                  (submitSuccess || (isEditMode && editButtonIsSaved))
                    ? "px-5 cursor-pointer" 
                    : isSubmitting 
                      ? "px-5 cursor-wait"
                      : canSubmit 
                        ? "px-4 cursor-pointer" 
                        : "px-4 cursor-default opacity-60"
                }`}
                style={{ 
                  touchAction: 'manipulation', 
                  WebkitTapHighlightColor: 'transparent',
                  pointerEvents: 'auto',
                  zIndex: 10,
                  position: 'relative'
                }}
              >
                {/* Ping Ring - Pulsing border effect (only when ready to submit, hide in edit mode) */}
                {canSubmit && !isSubmitting && !submitSuccess && !isEditMode && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary/50 pointer-events-none"
                    animate={{
                      scale: [1, 1.3, 1.5],
                      opacity: [0.5, 0.2, 0],
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      ease: "easeOut"
                    }}
                  />
                )}
                
                {/* Success celebration rings - subtle for edit mode */}
                {(submitSuccess || (isEditMode && editButtonIsSaved)) && (
                  isEditMode ? (
                    // وضع التعديل - بدون animation عند تم الحفظ (ثابت)
                    null
                  ) : (
                    // وضع الإنشاء - celebration كامل
                    <>
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-primary pointer-events-none"
                        initial={{ scale: 1, opacity: 0.8 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-primary pointer-events-none"
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{ scale: 1.7, opacity: 0 }}
                        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                      />
                    </>
                  )
                )}
                
                {/* Outer Glow - Subtle and smooth */}
                <motion.div 
                  className="absolute inset-[-4px] rounded-full blur-lg pointer-events-none"
                  initial={false}
                  animate={{
                    opacity: (submitSuccess || (isEditMode && editButtonIsSaved)) ? 0.5 
                      : isSubmitting ? 0.3 
                      : canSubmit ? 0.4 
                      : 0,
                    background: (submitSuccess || (isEditMode && editButtonIsSaved))
                      ? "radial-gradient(circle, rgba(16, 185, 129, 0.5) 0%, transparent 70%)"
                      : "radial-gradient(circle, rgba(30, 150, 140, 0.4) 0%, transparent 70%)"
                  }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                
                {/* Main Button Body */}
                <motion.div 
                  className="absolute inset-0 rounded-full pointer-events-none"
                  initial={false}
                  animate={{
                    background: (submitSuccess || (isEditMode && editButtonIsSaved))
                      ? "linear-gradient(135deg, #10b981 0%, #059669 50%, #10b981 100%)"
                      : isSubmitting
                        ? "linear-gradient(135deg, rgba(var(--primary-rgb), 0.85) 0%, rgb(var(--primary-rgb)) 50%, rgba(20, 150, 140, 0.85) 100%)"
                        : canSubmit 
                          ? "linear-gradient(135deg, rgb(var(--primary-rgb)) 0%, rgb(var(--primary-rgb)) 40%, rgb(20, 150, 140) 100%)"
                          : "var(--muted)",
                    boxShadow: (submitSuccess || (isEditMode && editButtonIsSaved))
                      ? "0 4px 16px rgba(16, 185, 129, 0.35), 0 2px 8px rgba(16, 185, 129, 0.25)"
                      : isSubmitting
                        ? "0 3px 12px rgba(var(--primary-rgb), 0.25)"
                        : canSubmit 
                          ? "0 6px 20px rgba(var(--primary-rgb), 0.3), 0 3px 10px rgba(var(--primary-rgb), 0.2)"
                          : "none"
                  }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  style={{
                    // Fallback for CSS variable
                    ['--primary-rgb' as any]: '30, 150, 140'
                  }}
                />
                
                {/* Inner shine - subtle top highlight */}
                {(canSubmit || isSubmitting || submitSuccess || (isEditMode && editButtonIsSaved)) && (
                  <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-black/5" />
                  </div>
                )}

                {/* Content with AnimatePresence for smooth transitions */}
                <AnimatePresence mode="popLayout">
                  {(submitSuccess || (isEditMode && editButtonIsSaved)) ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                      transition={{ 
                        duration: 0.35, 
                        ease: [0.34, 1.56, 0.64, 1]
                      }}
                      className="relative z-10 flex items-center gap-2"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ 
                          delay: 0.1,
                          duration: 0.4, 
                          ease: [0.34, 1.56, 0.64, 1]
                        }}
                      >
                        <Check size={16} className="text-white" strokeWidth={3} />
                      </motion.div>
                      <span className="text-sm font-semibold text-white whitespace-nowrap">
                        {isEditMode ? "تم الحفظ" : "طلبي"}
                      </span>
                      {!isEditMode && (
                        <motion.div
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2, duration: 0.3 }}
                        >
                          <motion.div
                            animate={{ x: [0, 3, 0] }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                          >
                            <ArrowLeft size={14} className="text-white/90" />
                          </motion.div>
                        </motion.div>
                      )}
                    </motion.div>
                  ) : isSubmitting ? (
                    <motion.div
                      key="submitting"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="relative z-10 flex items-center gap-2"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 size={16} className="text-white" />
                      </motion.div>
                      <span className="text-sm font-medium text-white whitespace-nowrap">
                        {isEditMode ? "جاري الحفظ..." : "جاري الإرسال..."}
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="relative z-10 flex items-center gap-2"
                    >
                      <span className={`text-sm font-medium transition-colors duration-300 ${
                        canSubmit ? "text-white" : "text-muted-foreground"
                      }`}>
                        {isEditMode ? "حفظ التعديلات" : "إرسال الطلب"}
                      </span>
                      {canSubmit && (
                        <Send 
                          size={16} 
                          className="-rotate-90 text-white"
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sparkles - Only when canSubmit and not submitting (hide in edit mode) */}
                {canSubmit && !isSubmitting && !submitSuccess && !isEditMode && (
                  <>
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-white/50 rounded-full blur-[2px] animate-pulse pointer-events-none" />
                    <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-teal-300/40 rounded-full blur-[1px] animate-bounce pointer-events-none" />
                  </>
                )}
                
                {/* Success sparkles - only for create mode */}
                {submitSuccess && !isEditMode && (
                  <>
                    <motion.div
                      className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-300 rounded-full pointer-events-none"
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: [0, 1.5, 0], opacity: [1, 0.8, 0] }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    />
                    <motion.div
                      className="absolute -bottom-2 -left-2 w-2 h-2 bg-primary rounded-full pointer-events-none"
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: [0, 1.5, 0], opacity: [1, 0.8, 0] }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    />
                    <motion.div
                      className="absolute top-0 left-1/2 w-2 h-2 bg-white rounded-full pointer-events-none"
                      initial={{ scale: 0, opacity: 1, y: 0 }}
                      animate={{ scale: [0, 1, 0], opacity: [1, 0.6, 0], y: -15 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    />
                  </>
                )}
              </motion.button>
            ) : showMyRequestButton ? (
              /* My Request Button - for viewing own request */
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
                  onMyRequestClick?.();
                }}
                initial={{ opacity: 0, scale: 0.8, x: 20, filter: "blur(8px)" }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  x: 0,
                  filter: "blur(0px)",
                  transition: {
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                    mass: 0.8,
                  }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className="relative flex items-center gap-2 h-11 px-4 rounded-xl group active:scale-95 bg-primary/10 border border-primary/30 hover:border-primary/50 hover:bg-primary/15 overflow-visible"
              >
                {/* Shimmer effect */}
                <span 
                  className="absolute inset-0 pointer-events-none animate-shimmer-diagonal rounded-xl overflow-hidden" 
                  style={{
                    background: 'linear-gradient(315deg, transparent 0%, transparent 35%, rgba(30, 150, 140, 0.1) 50%, transparent 65%, transparent 100%)',
                    backgroundSize: '200% 200%'
                  }} 
                />
                
                <FileText size={16} className="relative z-10 text-primary" />
                <span className="relative z-10 text-sm font-medium text-primary whitespace-nowrap flex items-center gap-1">
                  طلبي
                  {myRequestOffersCount > 0 && (
                    <span className="text-primary/70 text-[10px] font-bold animate-pulse">
                      (عروض جديدة!)
                    </span>
                  )}
                </span>
                
                {/* Notification badge for offers count */}
                {myRequestOffersCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2.5 -left-2.5 min-w-[20px] h-[20px] px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-lg z-30 border-2 border-white dark:border-gray-900"
                  >
                    {myRequestOffersCount}
                  </motion.span>
                )}
              </motion.button>
            ) : showSearchButton && onSearchClick ? (
              <button
                onClick={onSearchClick}
                className={`relative w-11 h-11 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${
                  hasActiveFilters 
                    ? 'bg-primary/10 border-primary/30 text-primary' 
                    : 'bg-card border-border text-muted-foreground hover:text-primary'
                }`}
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  {hasActiveFilters ? (
                    // أيقونة ثابتة عند وجود فلاتر نشطة
                    <Filter size={18} strokeWidth={2.5} />
                  ) : (
                    // أيقونة متحركة عند عدم وجود فلاتر - fade فقط بدون حركة جانبية لتجنب الارتجاج
                    <AnimatePresence mode="wait" initial={false}>
                      {iconToggle ? (
                        <motion.div
                          key="filter-icon"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="flex items-center justify-center"
                        >
                          <Filter size={18} strokeWidth={2} />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="search-icon"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="flex items-center justify-center"
                        >
                          <Search size={18} strokeWidth={2} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
                {/* Badge رقمي يظهر عدد الفلاتر النشطة */}
                {hasActiveFilters && activeFiltersCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-md"
                  >
                    {activeFiltersCount}
                  </motion.span>
                )}
              </button>
            ) : null}
          </>
        )}

        {/* Sign Out (if logged in) */}
        {!isGuest && user && (
          <button
            onClick={onSignOut}
            className="hidden sm:flex p-2.5 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all active:scale-95 group"
            title="تسجيل الخروج"
          >
            <LogOut size={20} strokeWidth={2} className="group-hover:text-red-500 transition-colors duration-300" />
          </button>
        )}
      </div>
      )}
    </>
  );

  return (
    <>
      <div className={transparent ? "" : "sticky top-0 z-50 shrink-0 relative"}>
        {/* تدريج من الأعلى - يغطي الهيدر ويمتد للأسفل */}
        {!transparent && (
          <div 
            className="absolute inset-x-0 top-0 h-32 pointer-events-none z-0"
            style={{
              background: 'linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--background) / 0.95) 25%, hsl(var(--background) / 0.7) 50%, hsl(var(--background) / 0.3) 75%, transparent 100%)'
            }}
          />
        )}
        <div className={transparent ? "" : "flex flex-col px-4 relative z-10"}>
          {headerContent}
        </div>
      </div>

      {/* Click-outside overlay for notifications */}
      {isNotifOpen && (
        <div
          className="fixed inset-0 z-20 bg-transparent"
          onClick={() => setIsNotifOpen(false)}
        />
      )}
    </>
  );
};

