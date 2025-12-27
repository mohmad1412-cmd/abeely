import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeftRight, 
  Bell, 
  Menu, 
  X, 
  MessageCircle, 
  LogOut, 
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
  hasUnreadMessages: boolean;
  user: any;
  setView: (view: any) => void;
  setPreviousView: (view: any) => void;
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
  currentView?: string;
  transparent?: boolean;
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  mode,
  toggleMode,
  isModeSwitching,
  unreadCount,
  hasUnreadMessages,
  user,
  setView,
  setPreviousView,
  titleKey,
  notifications,
  onMarkAsRead,
  onClearAll,
  onSignOut,
  backButton,
  onBack,
  title,
  isScrolled = true,
  currentView,
  transparent = false,
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const headerContent = (
    <div className="h-16 flex items-center justify-between pt-[env(safe-area-inset-top,0px)]">
      <div className="flex items-center gap-3">
        {backButton ? (
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
            {!backButton && <span className="text-xs text-muted-foreground mt-1.5">أبيلي</span>}
            <AnimatePresence mode="wait">
              {backButton && isScrolled ? (
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
                  initial={{ scale: 1 }}
                  animate={{
                    scale: [1, 1.08, 1],
                    x: [0, -2, 2, -2, 2, 0],
                  }}
                  transition={{
                    duration: 0.4,
                    ease: "easeInOut",
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
        <button
          onClick={toggleMode}
          className={`flex items-center justify-center h-11 w-11 rounded-xl transition-all duration-300 active:scale-95 group ${
            isModeSwitching 
              ? "bg-primary/20 border-primary/40 shadow-[0_0_15px_rgba(30,150,140,0.3)]" 
              : "bg-secondary/50 hover:bg-primary/10 border border-border hover:border-primary/30"
          }`}
        >
          <motion.div
            animate={isModeSwitching ? { 
              rotate: 360,
              scale: [1, 1.2, 1],
            } : { 
              rotate: 0,
              scale: 1 
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <ArrowLeftRight 
              size={18} 
              strokeWidth={2} 
              className={`transition-all duration-300 ${
                isModeSwitching ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              }`} 
            />
          </motion.div>
        </button>

        {/* Messages Button */}
        {user && (
          <button
            onClick={() => {
              if (currentView) setPreviousView(currentView);
              setView("messages");
            }}
            className="p-2.5 rounded-xl hover:bg-primary/10 relative text-muted-foreground hover:text-primary transition-all duration-300 active:scale-95 group"
            title="الرسائل"
          >
            <MessageCircle size={22} strokeWidth={2} className="group-hover:text-primary transition-colors duration-300" />
            {hasUnreadMessages && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
          </button>
        )}

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2.5 rounded-xl hover:bg-primary/10 relative text-muted-foreground hover:text-primary transition-all duration-300 active:scale-95 group"
          >
            <Bell size={22} strokeWidth={2} className="group-hover:text-primary transition-colors duration-300" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
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

        {/* Sign Out (if logged in) */}
        {user && (
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
      <div className={`shrink-0 ${transparent ? "" : "px-4 sticky top-0 z-30 bg-white/80 dark:bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-gray-200/30 dark:border-white/10 shadow-sm"}`}>
        <div className="flex flex-col">
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

