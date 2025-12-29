import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeftRight, 
  Bell, 
  Menu, 
  X, 
  LogOut, 
  LogIn,
  ArrowRight,
  Share2,
  Check,
  Link,
  Plus,
  ArrowLeft,
  Send,
  ChevronsDown
} from "lucide-react";
import { NotificationsPopover } from "../NotificationsPopover";

interface UnifiedHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
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
  backButton?: boolean;
  onBack?: () => void;
  closeIcon?: boolean; // Use X icon instead of arrow for back button
  title?: string;
  isScrolled?: boolean;
  showTabs?: boolean;
  currentView?: string; // kept for compatibility, not used
  transparent?: boolean;
  hideModeToggle?: boolean; // Hide the mode toggle button
  showSidebarButton?: boolean; // Show sidebar button instead of back button (for pages accessed from sidebar)
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
  // Scroll to offer button (for RequestDetail page)
  showScrollToOffer?: boolean;
  onScrollToOffer?: () => void;
  isOfferSectionVisible?: boolean; // Hide button when offer section is visible
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
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
  backButton,
  onBack,
  closeIcon = false,
  title,
  isScrolled = true,
  transparent = false,
  hideModeToggle = false,
  showSidebarButton = false,
  isGuest = false,
  showShareButton = false,
  onShare,
  shareUrl,
  showSubmitButton = false,
  canSubmit = false,
  onSubmit,
  justBecameReady = false,
  showScrollToOffer = false,
  onScrollToOffer,
  isOfferSectionVisible = false,
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [showCreateHint, setShowCreateHint] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  
  // Show "Create Request" hint every 35 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCreateHint(true);
      // Hide after 8 seconds
      setTimeout(() => setShowCreateHint(false), 8000);
    }, 35000);

    return () => clearInterval(interval);
  }, []);
  
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
    <div className="h-16 flex items-center justify-between pt-[env(safe-area-inset-top,0px)]">
      <div className="flex items-center gap-3">
        {showSidebarButton ? (
          <button
            className="p-2.5 hover:bg-primary/10 rounded-xl transition-all duration-300 active:scale-95 group"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? (
              <X size={22} className="text-muted-foreground group-hover:text-primary transition-colors duration-300" />
            ) : (
              <Menu size={22} className="text-muted-foreground group-hover:text-primary transition-colors duration-300" />
            )}
          </button>
        ) : backButton ? (
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-foreground focus:outline-none bg-card/80 backdrop-blur-sm border border-border shadow-lg hover:bg-card group"
          >
            {/* Pulse ring effect - only on active/touch */}
            <span className="absolute inset-0 rounded-full border-2 border-primary/50 opacity-0 group-active:opacity-100 group-active:animate-ping" />
            {closeIcon ? <X size={22} strokeWidth={2.5} className="relative z-10" /> : <ArrowRight size={22} strokeWidth={2.5} className="relative z-10" />}
          </motion.button>
        ) : (
          <button
            className="md:hidden p-2.5 hover:bg-primary/10 rounded-xl transition-all duration-300 active:scale-95 group"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? (
              <X size={22} className="text-muted-foreground group-hover:text-primary transition-colors duration-300" />
            ) : (
              <Menu size={22} className="text-muted-foreground group-hover:text-primary transition-colors duration-300" />
            )}
          </button>
        )}
        
        <div className="flex items-start gap-3">
          <h1 className="font-bold text-base text-foreground flex flex-col gap-0.5">
            {!backButton && !showSidebarButton && <span className="text-xs text-muted-foreground mt-1.5">أبيلي</span>}
            <AnimatePresence mode="wait">
              {(backButton || showSidebarButton) && isScrolled ? (
                <motion.span
                  key="scrolled-title"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className={`font-bold text-sm truncate text-foreground transition-all duration-300 ${
                    showScrollToOffer && isOfferSectionVisible 
                      ? 'max-w-[200px] sm:max-w-md' 
                      : 'max-w-[120px] sm:max-w-xs'
                  }`}
                >
                  {title}
                </motion.span>
              ) : (
                <motion.span
                  key={titleKey}
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: 0.2,
                    ease: "easeOut",
                  }}
                  className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm inline-block"
                >
                  {mode === "requests" ? "إنشاء الطلبات" : "تقديم العروض"}
                </motion.span>
              )}
            </AnimatePresence>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Share Button */}
        {showShareButton && (shareUrl || onShare) && (
          <motion.button
            onClick={handleShare}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center justify-center h-11 w-11 rounded-xl transition-all duration-300 active:scale-95 group ${
              isLinkCopied 
                ? "bg-green-500/20 border border-green-500/40 text-green-500" 
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
                  <Check size={18} strokeWidth={2.5} className="text-green-500" />
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

        {/* Scroll to Offer Button - Replaces both mode toggle and notifications */}
        <AnimatePresence mode="popLayout">
          {showScrollToOffer && !isOfferSectionVisible && (
            <motion.button
              key="scroll-to-offer-btn"
              onClick={onScrollToOffer}
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
              exit={{ 
                opacity: 0, 
                scale: 0.8, 
                x: 20,
                filter: "blur(8px)",
                transition: {
                  duration: 0.25,
                  ease: [0.4, 0, 1, 1],
                }
              }}
              className="relative flex items-center gap-2 h-11 px-4 rounded-xl group active:scale-95 bg-primary/10 border border-primary/30 hover:border-primary/50 hover:bg-primary/15 overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Content */}
              <span className="relative z-10 text-sm font-medium text-primary whitespace-nowrap">
                قدّم عرض
              </span>
              <motion.div
                className="relative z-10"
                animate={{ 
                  y: [0, 3, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <ChevronsDown 
                  size={18} 
                  strokeWidth={2.5}
                  className="text-primary"
                />
              </motion.div>
            </motion.button>
          )}
        </AnimatePresence>
        
        {!showScrollToOffer && (
          <>
            {/* Submit Button OR Notification Bell */}
            {showSubmitButton ? (
              <motion.button
                onClick={onSubmit}
                disabled={!canSubmit}
                className={`relative flex items-center gap-2 h-11 px-4 rounded-full group transition-all duration-500 overflow-visible ${
                  canSubmit 
                    ? "cursor-pointer" 
                    : "cursor-not-allowed opacity-50"
                }`}
                whileHover={canSubmit ? { scale: 1.05 } : {}}
                whileTap={canSubmit ? { scale: 0.95 } : {}}
                animate={justBecameReady ? {
                  scale: [1, 1.1, 1],
                } : {}}
                transition={justBecameReady ? { duration: 0.4, repeat: 2 } : {}}
              >
                {/* Ping Ring - Pulsing border effect */}
                {canSubmit && (
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
                
                {/* Outer Glow - Only when canSubmit */}
                {canSubmit && (
                  <div className="absolute inset-[-6px] rounded-full bg-gradient-to-br from-primary/30 via-teal-500/20 to-primary/30 blur-md group-hover:blur-lg transition-all duration-500 animate-pulse pointer-events-none" />
                )}
                
                {/* Main Button Body */}
                <div className={`absolute inset-0 rounded-full transition-all duration-500 pointer-events-none ${
                  canSubmit 
                    ? "bg-gradient-to-br from-primary via-primary to-teal-600 shadow-[0_8px_25px_rgba(30,150,140,0.4),0_4px_12px_rgba(30,150,140,0.3)] group-hover:shadow-[0_10px_35px_rgba(30,150,140,0.5),0_5px_18px_rgba(30,150,140,0.4)]"
                    : "bg-muted"
                }`} />
                
                {/* Inner shine - Only when canSubmit */}
                {canSubmit && (
                  <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-transparent" />
                  </div>
                )}

                {/* Content */}
                <span className={`relative z-10 text-sm font-medium transition-colors duration-300 ${
                  canSubmit ? "text-white" : "text-muted-foreground"
                }`}>
                  إرسال الطلب
                </span>
                <motion.div
                  className="relative z-10"
                  animate={canSubmit ? { 
                    x: [0, -3, 0],
                  } : {}}
                  transition={canSubmit ? {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  } : {}}
                >
                  <Send 
                    size={16} 
                    className={`-rotate-90 transition-colors duration-300 ${
                      canSubmit ? "text-white" : "text-muted-foreground"
                    }`}
                  />
                </motion.div>

                {/* Sparkles - Only when canSubmit */}
                {canSubmit && (
                  <>
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-white/50 rounded-full blur-[2px] animate-pulse pointer-events-none" />
                    <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-teal-300/40 rounded-full blur-[1px] animate-bounce pointer-events-none" />
                  </>
                )}
              </motion.button>
            ) : (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="flex items-center justify-center h-11 w-11 rounded-xl transition-all duration-300 active:scale-95 group bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary/30 relative"
                >
                  <Bell size={20} strokeWidth={2} className="group-hover:text-primary transition-colors duration-300" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-red-500 text-[11px] text-white font-bold">
                        {unreadCount}
                      </span>
                    </span>
                  )}
                </button>

                <NotificationsPopover
                  isOpen={isNotifOpen}
                  notifications={notifications}
                  onClose={() => setIsNotifOpen(false)}
                  onMarkAsRead={onMarkAsRead}
                  onClearAll={onClearAll}
                />
              </div>
            )}
          </>
        )}

        {/* Sign Out (if logged in) or Login (if guest) */}
        {isGuest ? (
          <button
            onClick={onSignOut}
            className="hidden sm:flex p-2.5 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all active:scale-95 group"
            title="تسجيل الدخول"
          >
            <LogIn size={20} strokeWidth={2} className="group-hover:text-primary transition-colors duration-300" />
          </button>
        ) : user && (
          <button
            onClick={onSignOut}
            className="hidden sm:flex p-2.5 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all active:scale-95 group"
            title="تسجيل الخروج"
          >
            <LogOut size={20} strokeWidth={2} className="group-hover:text-red-500 transition-colors duration-300" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className={transparent ? "" : "sticky top-0 z-30 px-4 bg-white/80 dark:bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-gray-200/30 dark:border-white/10 shadow-sm shrink-0"}>
        <div className={transparent ? "" : "flex flex-col"}>
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

