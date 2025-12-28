import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeftRight, 
  Bell, 
  Menu, 
  X, 
  LogOut, 
  LogIn,
  ArrowRight 
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
  title?: string;
  isScrolled?: boolean;
  showTabs?: boolean;
  currentView?: string; // kept for compatibility, not used
  transparent?: boolean;
  hideModeToggle?: boolean; // Hide the mode toggle button
  showSidebarButton?: boolean; // Show sidebar button instead of back button (for pages accessed from sidebar)
  isGuest?: boolean; // Guest mode - show login button instead of sign out
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
  title,
  isScrolled = true,
  transparent = false,
  hideModeToggle = false,
  showSidebarButton = false,
  isGuest = false,
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

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
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all text-foreground focus:outline-none bg-card/80 backdrop-blur-sm border border-border shadow-lg hover:bg-card"
          >
            <ArrowRight size={22} strokeWidth={2.5} />
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
                  className="font-bold text-sm truncate max-w-[120px] sm:max-w-xs text-foreground"
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
        {/* Mode Switch Button */}
        {!hideModeToggle && (
          <button
            onClick={toggleMode}
            className={`flex items-center justify-center h-11 w-11 rounded-xl transition-all duration-300 active:scale-95 group ${
              isModeSwitching 
                ? "bg-primary/20 border border-primary/40 shadow-[0_0_15px_rgba(30,150,140,0.3)]" 
                : "bg-card border border-border hover:text-primary"
            }`}
          >
            <motion.div
              animate={isModeSwitching ? { 
                rotate: 180,
                scale: 1.05,
              } : { 
                rotate: 0,
                scale: 1 
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <ArrowLeftRight 
                size={18} 
                strokeWidth={2} 
                className={`transition-all duration-200 ${
                  isModeSwitching ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                }`} 
              />
            </motion.div>
          </button>
        )}

        {/* Notification Bell */}
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

