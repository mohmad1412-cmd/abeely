import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { 
  Menu, 
  Bell, 
  Search, 
  User, 
  ArrowLeftRight,
  ChevronDown,
  Settings,
  LogOut,
  X,
  Filter,
  Sparkles,
  LayoutGrid,
  List,
  Layers
} from "lucide-react";

interface SmartHeaderProps {
  title?: string;
  subtitle?: string;
  scrollY: number;
  onMenuClick: () => void;
  onSearchClick?: () => void;
  onModeToggle?: () => void;
  mode?: 'requests' | 'offers';
  unreadCount?: number;
  user?: any;
  isGuest?: boolean;
  // View mode switching
  viewMode?: 'cards' | 'list' | 'fullscreen';
  onViewModeChange?: (mode: 'cards' | 'list' | 'fullscreen') => void;
  // Notifications
  onNotificationsClick?: () => void;
  // Profile
  onProfileClick?: () => void;
  // Custom actions
  rightActions?: React.ReactNode;
  leftActions?: React.ReactNode;
  // Transparency control
  transparent?: boolean;
  // Hide on scroll
  hideOnScroll?: boolean;
}

export const SmartHeader: React.FC<SmartHeaderProps> = ({
  title = "أبيلي",
  subtitle,
  scrollY,
  onMenuClick,
  onSearchClick,
  onModeToggle,
  mode = 'offers',
  unreadCount = 0,
  user,
  isGuest = false,
  viewMode = 'cards',
  onViewModeChange,
  onNotificationsClick,
  onProfileClick,
  rightActions,
  leftActions,
  transparent = false,
  hideOnScroll = true,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isCompact, setIsCompact] = useState(false);
  const [showViewModeMenu, setShowViewModeMenu] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout>();

  // Smooth spring animation for header position
  const headerY = useSpring(0, { stiffness: 300, damping: 30 });
  
  // Calculate opacity based on scroll
  const opacity = Math.max(0, Math.min(1, 1 - scrollY / 100));
  const bgOpacity = Math.min(1, scrollY / 50);
  
  // Blur amount
  const blurAmount = Math.min(12, scrollY / 10);

  // Handle scroll direction
  useEffect(() => {
    if (!hideOnScroll) {
      setIsVisible(true);
      setIsCompact(scrollY > 50);
      return;
    }

    const scrollDelta = scrollY - lastScrollY.current;
    
    // Threshold for showing/hiding
    const showThreshold = 50;
    
    if (scrollY < 20) {
      // Always show at top
      setIsVisible(true);
      setIsCompact(false);
    } else if (scrollDelta > 10 && scrollY > showThreshold) {
      // Scrolling down - hide
      setIsVisible(false);
      setIsCompact(true);
    } else if (scrollDelta < -10) {
      // Scrolling up - show
      setIsVisible(true);
      setIsCompact(scrollY > showThreshold);
    }
    
    lastScrollY.current = scrollY;
    
    // Debounce to prevent jitter
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      lastScrollY.current = scrollY;
    }, 100);
    
    return () => clearTimeout(scrollTimeout.current);
  }, [scrollY, hideOnScroll]);

  // Update spring value
  useEffect(() => {
    headerY.set(isVisible ? 0 : -100);
  }, [isVisible, headerY]);

  // View mode icons
  const viewModeIcons = {
    cards: LayoutGrid,
    list: List,
    fullscreen: Layers,
  };
  
  const viewModeLabels = {
    cards: "كروت",
    list: "قائمة",
    fullscreen: "ملء الشاشة",
  };

  const CurrentViewIcon = viewModeIcons[viewMode];

  return (
    <>
      <motion.header
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
          transparent && scrollY < 20 
            ? "bg-transparent" 
            : "backdrop-blur-xl"
        }`}
        style={{
          y: headerY,
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        {/* Background with dynamic opacity */}
        <motion.div 
          className="absolute inset-0 bg-card/80 border-b border-border/50"
          style={{ 
            opacity: transparent ? bgOpacity : 1,
          }}
        />
        
        <div className="relative px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            
            {/* Right Section - Menu & Title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Menu Button */}
              <motion.button
                onClick={onMenuClick}
                className="w-10 h-10 rounded-xl bg-secondary/50 hover:bg-secondary flex items-center justify-center text-foreground transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <Menu size={20} />
              </motion.button>
              
              {/* Title Section */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={isCompact ? "compact" : "full"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 min-w-0"
                >
                  <h1 className={`font-bold text-foreground truncate ${isCompact ? "text-base" : "text-lg"}`}>
                    {title}
                  </h1>
                  {subtitle && !isCompact && (
                    <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                  )}
                </motion.div>
              </AnimatePresence>
              
              {leftActions}
            </div>

            {/* Center Section - Mode Toggle */}
            {onModeToggle && (
              <motion.button
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(10);
                  onModeToggle();
                }}
                className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                  mode === 'requests' 
                    ? "bg-primary text-white" 
                    : "bg-accent text-white"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ArrowLeftRight size={16} />
                <span className="hidden sm:inline">
                  {mode === 'requests' ? "أطلب خدمة" : "أقدم عروض"}
                </span>
              </motion.button>
            )}

            {/* Left Section - Actions */}
            <div className="flex items-center gap-2">
              {rightActions}
              
              {/* View Mode Toggle */}
              {onViewModeChange && (
                <div className="relative">
                  <motion.button
                    onClick={() => setShowViewModeMenu(!showViewModeMenu)}
                    className="w-10 h-10 rounded-xl bg-secondary/50 hover:bg-secondary flex items-center justify-center text-foreground transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    <CurrentViewIcon size={18} />
                  </motion.button>
                  
                  <AnimatePresence>
                    {showViewModeMenu && (
                      <>
                        <motion.div
                          className="fixed inset-0 z-[90]"
                          onClick={() => setShowViewModeMenu(false)}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        />
                        <motion.div
                          className="absolute left-0 top-full mt-2 bg-card rounded-xl shadow-xl border border-border overflow-hidden z-[100] min-w-[140px]"
                          initial={{ opacity: 0, scale: 0.9, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        >
                          {(['cards', 'list', 'fullscreen'] as const).map((vm) => {
                            const Icon = viewModeIcons[vm];
                            return (
                              <button
                                key={vm}
                                onClick={() => {
                                  if (navigator.vibrate) navigator.vibrate(10);
                                  onViewModeChange(vm);
                                  setShowViewModeMenu(false);
                                }}
                                className={`w-full px-4 py-3 flex items-center gap-3 text-sm transition-colors ${
                                  viewMode === vm 
                                    ? "bg-primary/10 text-primary" 
                                    : "hover:bg-secondary text-foreground"
                                }`}
                              >
                                <Icon size={18} />
                                <span className="font-medium">{viewModeLabels[vm]}</span>
                              </button>
                            );
                          })}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
              
              {/* Search Button */}
              {onSearchClick && (
                <motion.button
                  onClick={onSearchClick}
                  className="w-10 h-10 rounded-xl bg-secondary/50 hover:bg-secondary flex items-center justify-center text-foreground transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  <Search size={18} />
                </motion.button>
              )}
              
              {/* Notifications */}
              {onNotificationsClick && (
                <motion.button
                  onClick={onNotificationsClick}
                  className="w-10 h-10 rounded-xl bg-secondary/50 hover:bg-secondary flex items-center justify-center text-foreground transition-colors relative"
                  whileTap={{ scale: 0.95 }}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </motion.span>
                  )}
                </motion.button>
              )}
              
              {/* Profile */}
              {onProfileClick && (
                <motion.button
                  onClick={onProfileClick}
                  className="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors overflow-hidden"
                  whileTap={{ scale: 0.95 }}
                >
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={18} />
                  )}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.header>
      
      {/* Spacer to prevent content overlap */}
      <div className="h-14" style={{ marginTop: "env(safe-area-inset-top)" }} />
    </>
  );
};

export default SmartHeader;

