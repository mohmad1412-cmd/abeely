import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppMode, Offer, Request } from "../types";
import {
  Archive,
  ArchiveRestore,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  PlusCircle,
  Settings,
  User,
  Moon,
  Sun,
  Languages,
  ArrowLeftRight,
  X,
  GripVertical,
} from "lucide-react";
import { Button } from "./ui/Button";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { UserProfile } from "../services/authService";
import { getConversations, Conversation, subscribeToConversations } from "../services/messagesService";

interface SidebarProps {
  mode: AppMode;
  isOpen: boolean;
  onClose?: () => void;
  userRequests: Request[];
  allRequests?: Request[];
  userOffers: Offer[];
  archivedRequests?: Request[];
  archivedOffers?: Offer[];
  onSelectRequest: (req: Request, scrollToOffer?: boolean, fromSidebar?: boolean) => void;
  onSelectOffer: (off: Offer, fromSidebar?: boolean) => void;
  onCreateRequest: () => void;
  onNavigate: (view: any) => void;
  onOpenWhatsApp?: (phoneNumber: string, offer: Offer) => void;
  onOpenChat?: (requestId: string, offer: Offer) => void;
  onArchiveRequest?: (requestId: string) => void;
  onUnarchiveRequest?: (requestId: string) => void;
  onArchiveOffer?: (offerId: string) => void;
  onUnarchiveOffer?: (offerId: string) => void;
  // Auth props
  isGuest?: boolean;
  user?: UserProfile | null;
  onSignOut?: () => void;
  // Messages notification
  onUnreadMessagesChange?: (hasUnread: boolean) => void;
  // Theme
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  // Language
  onOpenLanguagePopup?: () => void;
  // Profile role switcher
  profileRole?: 'requester' | 'provider';
  onProfileRoleChange?: (role: 'requester' | 'provider') => void;
}


export const Sidebar: React.FC<SidebarProps> = ({
  mode,
  isOpen,
  onClose,
  userRequests,
  allRequests = [],
  userOffers,
  archivedRequests = [],
  archivedOffers = [],
  onSelectRequest,
  onSelectOffer,
  onCreateRequest,
  onNavigate,
  onOpenWhatsApp,
  onOpenChat,
  onArchiveRequest,
  onUnarchiveRequest,
  onArchiveOffer,
  onUnarchiveOffer,
  isGuest = false,
  user = null,
  onSignOut,
  onUnreadMessagesChange,
  isDarkMode = false,
  toggleTheme,
  onOpenLanguagePopup,
  profileRole = 'provider',
  onProfileRoleChange,
}) => {
  const [reqFilter, setReqFilter] = useState<"active" | "approved" | "all" | "completed">("active");
  const [offerFilter, setOfferFilter] = useState<"all" | "accepted" | "pending" | "completed">("all");
  const [hideUnacceptable, setHideUnacceptable] = useState(true);
  const [isRequestsConversationsOpen, setIsRequestsConversationsOpen] = useState(false);
  const [isOffersConversationsOpen, setIsOffersConversationsOpen] = useState(false);
  
  const [requestsSheetLevel, setRequestsSheetLevel] = useState(0);
  const [offersSheetLevel, setOffersSheetLevel] = useState(0);
  
  // Sidebar width resize state
  const DEFAULT_WIDTH = 340;
  const MIN_WIDTH = 340;
  const MAX_WIDTH = 600;
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const isExpanded = sidebarWidth > DEFAULT_WIDTH;
  
  const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsSidebarResizing(true);
  }, []);
  
  const handleSidebarMouseMove = useCallback((e: MouseEvent) => {
    if (!isSidebarResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    setSidebarWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)));
  }, [isSidebarResizing]);
  
  const handleSidebarMouseUp = useCallback(() => {
    setIsSidebarResizing(false);
  }, []);
  
  const resetWidth = useCallback(() => {
    setSidebarWidth(DEFAULT_WIDTH);
  }, []);
  
  useEffect(() => {
    if (isSidebarResizing) {
      document.addEventListener("mousemove", handleSidebarMouseMove);
      document.addEventListener("mouseup", handleSidebarMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleSidebarMouseMove);
      document.removeEventListener("mouseup", handleSidebarMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isSidebarResizing, handleSidebarMouseMove, handleSidebarMouseUp]);
  
  const [requestsConvsHeight, setRequestsConvsHeight] = useState(0);
  const [offersConvsHeight, setOffersConvsHeight] = useState(0);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  const lastResizeEventRef = useRef<{ y: number; t: number } | null>(null);
  const dragStartedRef = useRef(false);
  const currentDraggingHeightRef = useRef(0);

  const getSnapPoints = () => {
    const sidebarHeight = window.innerHeight;
    const midPoint = sidebarHeight * 0.5;
    const maxPoint = sidebarHeight - 180;
    return { mid: midPoint, max: maxPoint };
  };

  const handleHandleClick = (type: 'requests' | 'offers') => {
    const { max } = getSnapPoints();
    // المستوى 1: الضغطة ترفع للمستوى 2
    // المستوى 2: الضغطة تغلق البانل بأنيميشن سلس
    if (type === 'requests') {
      if (requestsSheetLevel === 1) {
        setRequestsSheetLevel(2);
        setRequestsConvsHeight(max);
      } else if (requestsSheetLevel === 2) {
        // أنيميشن الإغلاق: نزل الارتفاع أولاً ثم أغلق
        setRequestsSheetLevel(0);
        setRequestsConvsHeight(0);
        // تأخير إغلاق الحالة لإتاحة الأنيميشن
        setTimeout(() => setIsRequestsConversationsOpen(false), 350);
      }
    } else {
      if (offersSheetLevel === 1) {
        setOffersSheetLevel(2);
        setOffersConvsHeight(max);
      } else if (offersSheetLevel === 2) {
        // أنيميشن الإغلاق: نزل الارتفاع أولاً ثم أغلق
        setOffersSheetLevel(0);
        setOffersConvsHeight(0);
        // تأخير إغلاق الحالة لإتاحة الأنيميشن
        setTimeout(() => setIsOffersConversationsOpen(false), 350);
      }
    }
  };

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, type: 'requests' | 'offers') => {
    e.stopPropagation();
    
    // Immediate haptic feedback on touch
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    setIsResizing(true);
    dragStartedRef.current = false;
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startTime = Date.now();
    lastResizeEventRef.current = { y: clientY, t: startTime };

    const startHeight = type === 'requests' ? requestsConvsHeight : offersConvsHeight;
    currentDraggingHeightRef.current = startHeight;
    const setHeight = type === 'requests' ? setRequestsConvsHeight : setOffersConvsHeight;
    const setLevel = type === 'requests' ? setRequestsSheetLevel : setOffersSheetLevel;

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const deltaY = Math.abs(currentY - clientY);
      
      if (deltaY > 5) dragStartedRef.current = true;

      if (moveEvent.cancelable) moveEvent.preventDefault();
      moveEvent.stopPropagation();
      
      const currentTime = Date.now();
      lastResizeEventRef.current = { y: currentY, t: currentTime };
      
      const delta = clientY - currentY;
      const { max } = getSnapPoints();
      
      const newHeight = Math.min(max + 40, Math.max(0, startHeight + delta));
      
      requestAnimationFrame(() => {
        currentDraggingHeightRef.current = newHeight;
        setHeight(newHeight);
      });
    };

    const handleEnd = () => {
      setIsResizing(false);
      
      if (!dragStartedRef.current) {
        handleHandleClick(type);
      } else {
        const { mid, max } = getSnapPoints();
        const currentHeight = currentDraggingHeightRef.current;
        const endTime = Date.now();
        
        const duration = endTime - startTime;
        const hVelocity = duration > 0 ? (currentHeight - startHeight) / duration : 0;
        const vThreshold = 0.2;
        
        let finalHeight = 0;
        let finalLevel = 0;
        
        if (startHeight === mid) {
          // Rule: Drag UP from mid -> Max. Drag DOWN from mid -> Close.
          if (hVelocity > vThreshold || currentHeight > mid + 30) {
            finalHeight = max;
            finalLevel = 2;
          } else if (hVelocity < -vThreshold || currentHeight < mid - 60) {
            finalHeight = 0;
            finalLevel = 0;
            if (type === 'requests') setIsRequestsConversationsOpen(false);
            else setIsOffersConversationsOpen(false);
          } else {
            finalHeight = mid;
            finalLevel = 1;
          }
        } else if (startHeight === max) {
          // Rule: Drag DOWN from max -> Close.
          if (hVelocity < -vThreshold || currentHeight < max - 80) {
            finalHeight = 0;
            finalLevel = 0;
            if (type === 'requests') setIsRequestsConversationsOpen(false);
            else setIsOffersConversationsOpen(false);
          } else {
            finalHeight = max;
            finalLevel = 2;
          }
        } else {
          // Anywhere else (e.g. from 0)
          if (currentHeight > (max + mid) / 2) {
            finalHeight = max;
            finalLevel = 2;
          } else if (currentHeight > mid / 2) {
            finalHeight = mid;
            finalLevel = 1;
          } else {
            finalHeight = 0;
            finalLevel = 0;
            if (type === 'requests') setIsRequestsConversationsOpen(false);
            else setIsOffersConversationsOpen(false);
          }
        }
        
        setHeight(finalHeight);
        setLevel(finalLevel);
      }

      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  };

  const toggleSheet = (type: 'requests' | 'offers') => {
    const { mid, max } = getSnapPoints();
    if (type === 'requests') {
      if (requestsSheetLevel === 0) {
        setIsRequestsConversationsOpen(true);
        setRequestsSheetLevel(1);
        setRequestsConvsHeight(mid);
      } else {
        setIsRequestsConversationsOpen(false);
        setRequestsSheetLevel(0);
        setRequestsConvsHeight(0);
      }
    } else {
      if (offersSheetLevel === 0) {
        setIsOffersConversationsOpen(true);
        setOffersSheetLevel(1);
        setOffersConvsHeight(mid);
      } else {
        setIsOffersConversationsOpen(false);
        setOffersSheetLevel(0);
        setOffersConvsHeight(0);
      }
    }
  };

  const [isOffersDropdownOpen, setIsOffersDropdownOpen] = useState(false);
  const [isRequestsDropdownOpen, setIsRequestsDropdownOpen] = useState(false);
  const [requestsConversations, setRequestsConversations] = useState<Conversation[]>([]);
  const [offersConversations, setOffersConversations] = useState<Conversation[]>([]);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const offersDropdownRef = useRef<HTMLDivElement>(null);
  const requestsDropdownRef = useRef<HTMLDivElement>(null);
  const requestsConversationsRef = useRef<HTMLDivElement>(null);
  const offersConversationsRef = useRef<HTMLDivElement>(null);

  // Swipe to close sidebar state
  const [sidebarSwipeStart, setSidebarSwipeStart] = useState<{ x: number; y: number } | null>(null);
  const [sidebarSwipeOffset, setSidebarSwipeOffset] = useState(0);
  const sidebarRef = useRef<HTMLElement>(null);

  const handleSidebarSwipeStart = useCallback((e: React.TouchEvent) => {
    setSidebarSwipeStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setSidebarSwipeOffset(0);
  }, []);

  const handleSidebarSwipeMove = useCallback((e: React.TouchEvent) => {
    if (!sidebarSwipeStart) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - sidebarSwipeStart.x;
    const dy = currentY - sidebarSwipeStart.y;
    
    // Only handle horizontal swipes to the right
    if (Math.abs(dx) > Math.abs(dy) && dx > 0) {
      // Prevent default to avoid scrolling while swiping
      e.preventDefault();
      setSidebarSwipeOffset(Math.min(dx, sidebarWidth));
    }
  }, [sidebarSwipeStart, sidebarWidth]);

  const handleSidebarSwipeEnd = useCallback(() => {
    if (sidebarSwipeOffset > 80) {
      // Close sidebar if swiped more than 80px to the right
      if (navigator.vibrate) navigator.vibrate(10);
      onClose?.();
    }
    setSidebarSwipeStart(null);
    setSidebarSwipeOffset(0);
  }, [sidebarSwipeOffset, onClose]);

  useEffect(() => {
    if (isRequestsConversationsOpen && user?.id && !isGuest) {
      let isMounted = true;
      const loadConversations = async () => {
        try {
          const conversations = await getConversations();
          if (!isMounted) return;
          // تصفية المحادثات: المحادثات المرتبطة بطلباتي (أنا صاحب الطلب)
          const myRequestIds = new Set(userRequests.map(r => r.id));
          const requestsConvs = conversations.filter(conv => 
            conv.request_id !== null && myRequestIds.has(conv.request_id)
          );
          setRequestsConversations(requestsConvs);
          const allUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
          if (isMounted && typeof setHasUnreadMessages === 'function') {
            setHasUnreadMessages(allUnread > 0);
            onUnreadMessagesChange?.(allUnread > 0);
          }
        } catch (error) {
          console.error('Error loading requests conversations:', error);
          if (isMounted && typeof setHasUnreadMessages === 'function') {
            setRequestsConversations([]);
            setHasUnreadMessages(false);
            onUnreadMessagesChange?.(false);
          }
        }
      };
      loadConversations();
      
      // Subscribe to conversation updates
      const unsubscribe = subscribeToConversations(user.id, () => {
        loadConversations();
      });

      return () => { 
        isMounted = false; 
        unsubscribe();
      };
    } else { setRequestsConversations([]); }
  }, [isRequestsConversationsOpen, user?.id, isGuest, onUnreadMessagesChange, userRequests]);

  useEffect(() => {
    if (isOffersConversationsOpen && user?.id && !isGuest) {
      let isMounted = true;
      const loadConversations = async () => {
        try {
          const conversations = await getConversations();
          if (!isMounted) return;
          // تصفية المحادثات: المحادثات المرتبطة بعروضي (أنا مقدم العرض)
          const myOfferIds = new Set(userOffers.map(o => o.id));
          const offersConvs = conversations.filter(conv => 
            conv.offer_id !== null && myOfferIds.has(conv.offer_id)
          );
          setOffersConversations(offersConvs);
          const allUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
          if (isMounted && typeof setHasUnreadMessages === 'function') {
            setHasUnreadMessages(allUnread > 0);
            onUnreadMessagesChange?.(allUnread > 0);
          }
        } catch (error) {
          console.error('Error loading offers conversations:', error);
          if (isMounted && typeof setHasUnreadMessages === 'function') {
            setOffersConversations([]);
            setHasUnreadMessages(false);
            onUnreadMessagesChange?.(false);
          }
        }
      };
      loadConversations();
      
      // Subscribe to conversation updates
      const unsubscribe = subscribeToConversations(user.id, () => {
        loadConversations();
      });

      return () => { 
        isMounted = false; 
        unsubscribe();
      };
    } else { setOffersConversations([]); }
  }, [isOffersConversationsOpen, user?.id, isGuest, onUnreadMessagesChange, userOffers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (offersDropdownRef.current && !offersDropdownRef.current.contains(event.target as Node) && isOffersDropdownOpen) setIsOffersDropdownOpen(false);
      if (requestsDropdownRef.current && !requestsDropdownRef.current.contains(event.target as Node) && isRequestsDropdownOpen) setIsRequestsDropdownOpen(false);
    };
    if (isOffersDropdownOpen || isRequestsDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOffersDropdownOpen, isRequestsDropdownOpen]);

  const filteredRequests = (() => {
    const allReqs = [...userRequests, ...(archivedRequests || [])];
    if (reqFilter === "all") return allReqs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    if (reqFilter === "active") return userRequests.filter(req => req.status === "active" || req.status === "draft");
    if (reqFilter === "approved") return userRequests.filter(req => req.status === "assigned");
    return allReqs.filter(req => req.status === "completed" || req.status === "archived");
  })();

  const filteredOffers = (() => {
    const allOffers = [...userOffers, ...(archivedOffers || [])];
    if (offerFilter === "all") {
      let offers = allOffers.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      if (hideUnacceptable) offers = offers.filter(offer => offer.status !== "rejected");
      return offers;
    }
    if (offerFilter === "accepted") return userOffers.filter(offer => offer.status === "accepted");
    if (offerFilter === "pending") return userOffers.filter(offer => offer.status === "pending" || offer.status === "negotiating");
    return allOffers.filter(offer => offer.status === "archived");
  })();

  const counts = {
    requests: {
      all: userRequests.length + (archivedRequests?.length || 0),
      active: userRequests.filter(req => req.status === "active" || req.status === "draft").length,
      approved: userRequests.filter(req => req.status === "assigned").length,
      completed: [...userRequests, ...(archivedRequests || [])].filter(req => req.status === "completed" || req.status === "archived").length
    },
    offers: {
      all: userOffers.length + (archivedOffers?.length || 0),
      pending: userOffers.filter(offer => offer.status === "pending" || offer.status === "negotiating").length,
      accepted: userOffers.filter(offer => offer.status === "accepted").length,
      completed: [...userOffers, ...(archivedOffers || [])].filter(offer => offer.status === "archived").length
    }
  };

  return (
    <aside 
      ref={sidebarRef}
      style={{ 
        width: `${sidebarWidth}px`,
        transform: sidebarSwipeOffset > 0 ? `translateX(${sidebarSwipeOffset}px)` : undefined
      }}
      className={`fixed inset-y-0 right-0 z-[90] bg-card border-l border-border md:translate-x-0 md:static md:block shadow-2xl md:shadow-none flex flex-col transition-transform duration-300 ease-out pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] ${isOpen ? "translate-x-0" : "translate-x-full"} ${isSidebarResizing ? "transition-none" : ""} ${sidebarSwipeOffset > 0 ? "transition-none" : ""}`}
      onTouchStart={handleSidebarSwipeStart}
      onTouchMove={handleSidebarSwipeMove}
      onTouchEnd={handleSidebarSwipeEnd}
    >
      {/* Resize Handle - Left side */}
      <div
        onMouseDown={handleSidebarMouseDown}
        className="hidden md:flex absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize items-center justify-center group z-50 hover:bg-primary/5 transition-colors"
      >
        <div className="flex flex-col gap-1">
          <div className={`w-1 h-6 rounded-full transition-all ${isSidebarResizing ? "bg-primary" : "bg-primary/40 group-hover:bg-primary"}`} />
          <div className={`w-1 h-6 rounded-full transition-all ${isSidebarResizing ? "bg-primary" : "bg-primary/40 group-hover:bg-primary"}`} />
        </div>
      </div>
      
      {/* Close button when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={resetWidth}
            className="hidden md:flex absolute left-4 top-3 z-50 w-8 h-8 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors"
            title="إعادة الحجم الافتراضي"
          >
            <X size={16} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
      {/* Top Section - User Profile - Reduced height and simplified styling */}
      <div className="h-12 px-4 flex items-center bg-card shrink-0 md:border-b-0">
        <div className="flex items-center gap-2.5 w-full">
          {/* Language & Theme buttons - left side */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenLanguagePopup && (
              <motion.button 
                onClick={onOpenLanguagePopup} 
                whileHover={{ scale: 1.05, y: -1 }} 
                whileTap={{ scale: 0.95 }} 
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border shadow-sm text-muted-foreground hover:text-primary hover:border-primary/30 transition-all duration-200 group" 
                title="تغيير اللغة"
              >
                <Languages size={18} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
              </motion.button>
            )}
            {toggleTheme && (
              <motion.button 
                onClick={() => { if (navigator.vibrate) navigator.vibrate(15); toggleTheme(); }} 
                whileHover={{ scale: 1.05, y: -1 }} 
                whileTap={{ scale: 0.95 }} 
                className={`w-9 h-9 flex items-center justify-center rounded-xl border shadow-sm transition-all duration-200 group ${isDarkMode ? 'bg-card border-border text-amber-500 hover:border-amber-500/30' : 'bg-card border-border text-indigo-500 hover:border-indigo-500/30'}`}
                title={isDarkMode ? "الوضع الفاتح" : "الوضع الداكن"}
              >
                {isDarkMode ? <Sun size={18} strokeWidth={2} className="group-hover:scale-110 transition-transform" /> : <Moon size={18} strokeWidth={2} className="group-hover:scale-110 transition-transform" />}
              </motion.button>
            )}
          </div>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border shrink-0">
            {user?.avatar_url ? <img src={user.avatar_url} alt="User" className="w-full h-full object-cover" /> : isGuest ? <User size={18} className="text-muted-foreground" /> : <span className="text-sm font-bold text-primary">{user?.display_name?.charAt(0) || "م"}</span>}
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            {isGuest ? (
              <p className="text-xs text-muted-foreground line-clamp-1 leading-tight">سجّل للحصول على المزيد من المميزات</p>
            ) : user ? (
              <>
                <span className="font-bold text-sm leading-tight">{user.display_name || "مستخدم أبيلي"}</span>
                <button onClick={() => onNavigate("profile")} className="text-[10px] text-primary hover:underline text-right mt-0.5">عرض الملف الشخصي</button>
              </>
            ) : (
              <span className="font-bold text-sm leading-tight">مستخدم أبيلي</span>
            )}
          </div>
          {isGuest && onSignOut && (
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              onClick={onSignOut} 
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 transition-all duration-200 shrink-0 group" 
              title="تسجيل الدخول"
            >
              <LogIn size={18} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
            </motion.button>
          )}
          {user && !isGuest && (
            <motion.button 
              whileHover={{ scale: 1.05, y: -1 }} 
              whileTap={{ scale: 0.95 }} 
              onClick={() => onNavigate("settings")} 
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border shadow-sm text-muted-foreground hover:text-primary hover:border-primary/30 transition-all duration-200 shrink-0 group" 
              title="الإعدادات"
            >
              <Settings size={18} strokeWidth={2} className="group-hover:rotate-90 transition-transform duration-300" />
            </motion.button>
          )}
        </div>
      </div>


      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar px-2 touch-pan-y relative z-10 pt-2" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {mode === "requests" ? (
          <>
            {/* Create Request Button - Between switch and dropdown */}
            <motion.button 
              id="sidebar-create-button"
              onClick={onCreateRequest} 
              whileHover={{ scale: 1.02, y: -2 }} 
              whileTap={{ scale: 0.98 }} 
              className="w-full mb-3 magic-border focus:outline-none"
            >
              <motion.span 
                className="w-full gap-2 bg-gradient-to-r from-primary/10 via-background to-primary/5 text-primary h-12 text-sm font-bold rounded-xl flex items-center justify-center relative z-10 overflow-hidden"
                whileHover={{ background: "linear-gradient(to right, rgba(30, 150, 140, 0.2), var(--background), rgba(30, 150, 140, 0.1))" }}
                whileTap={{ background: "linear-gradient(to right, rgba(30, 150, 140, 0.35), rgba(30, 150, 140, 0.2), rgba(30, 150, 140, 0.3))" }}
                transition={{ duration: 0.15 }}
              >
                <motion.span whileTap={{ scale: 0.85 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                  <PlusCircle size={20} strokeWidth={2} />
                </motion.span>
                <span>إنشاء طلب جديد</span>
              </motion.span>
            </motion.button>

            <div className="mb-3 relative" ref={requestsDropdownRef}>
              <button onClick={() => setIsRequestsDropdownOpen(!isRequestsDropdownOpen)} className={`w-full text-right flex items-center justify-between px-3 py-3.5 rounded-2xl border transition-all ${isRequestsDropdownOpen ? "bg-primary/10 border-primary text-primary" : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15"}`}>
                <div className="flex items-center gap-2"><span className="text-sm font-bold">{reqFilter === "active" ? "طلباتي النشطة" : reqFilter === "approved" ? "طلباتي المعتمدة" : reqFilter === "all" ? "كل طلباتي" : "المكتملة والمؤرشفة"}</span><span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold transition-colors ${isRequestsDropdownOpen ? "bg-primary text-white" : "bg-primary text-white"}`}>{reqFilter === "active" ? counts.requests.active : reqFilter === "approved" ? counts.requests.approved : reqFilter === "all" ? counts.requests.all : counts.requests.completed}</span></div>
                <motion.div animate={{ rotate: isRequestsDropdownOpen ? 180 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}><ChevronUp size={18} className="text-primary" /></motion.div>
              </button>
              <AnimatePresence>
                {isRequestsDropdownOpen && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-2xl shadow-lg z-50 overflow-hidden">
                    <motion.button whileTap={{ scale: 0.98, backgroundColor: "rgba(30, 150, 140, 0.15)" }} onClick={() => { setReqFilter("all"); setIsRequestsDropdownOpen(false); }} className={`w-full text-right px-3 py-3 text-sm font-bold transition-colors flex items-center justify-between focus:outline-none ${reqFilter === "all" ? "bg-primary/10 text-primary" : "hover:bg-secondary/50"}`}><motion.span whileTap={{ scale: 1.02 }} className="transition-transform">كل طلباتي</motion.span><span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold ${reqFilter === "all" ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>{counts.requests.all}</span></motion.button>
                    <motion.button whileTap={{ scale: 0.98, backgroundColor: "rgba(30, 150, 140, 0.15)" }} onClick={() => { setReqFilter("active"); setIsRequestsDropdownOpen(false); }} className={`w-full text-right px-3 py-3 text-sm font-bold transition-colors border-t border-border flex items-center justify-between focus:outline-none ${reqFilter === "active" ? "bg-primary/10 text-primary" : "hover:bg-secondary/50"}`}><motion.span whileTap={{ scale: 1.02 }} className="transition-transform">طلباتي النشطة</motion.span><span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold ${reqFilter === "active" ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>{counts.requests.active}</span></motion.button>
                    <motion.button whileTap={{ scale: 0.98, backgroundColor: "rgba(30, 150, 140, 0.15)" }} onClick={() => { setReqFilter("approved"); setIsRequestsDropdownOpen(false); }} className={`w-full text-right px-3 py-3 text-sm font-bold transition-colors border-t border-border flex items-center justify-between focus:outline-none ${reqFilter === "approved" ? "bg-primary/10 text-primary" : "hover:bg-secondary/50"}`}><motion.span whileTap={{ scale: 1.02 }} className="transition-transform">طلباتي المعتمدة</motion.span><span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold ${reqFilter === "approved" ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>{counts.requests.approved}</span></motion.button>
                    <motion.button whileTap={{ scale: 0.98, backgroundColor: "rgba(30, 150, 140, 0.15)" }} onClick={() => { setReqFilter("completed"); setIsRequestsDropdownOpen(false); }} className={`w-full text-right px-3 py-3 text-sm font-bold transition-colors border-t border-border flex items-center justify-between focus:outline-none ${reqFilter === "completed" ? "bg-primary/10 text-primary" : "hover:bg-secondary/50"}`}><motion.span whileTap={{ scale: 1.02 }} className="transition-transform">المكتملة والمؤرشفة</motion.span><span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold ${reqFilter === "completed" ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>{counts.requests.completed}</span></motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div key={reqFilter} className="space-y-4 min-h-[100px] animate-in slide-in-from-right-2 duration-300 pt-2">
              {filteredRequests.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
                  <motion.div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-brand flex items-center justify-center" animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                    <span className="text-xl font-black text-white">أ</span>
                  </motion.div>
                  <p className="text-sm text-muted-foreground">لا توجد طلبات</p>
                </motion.div>
              )}
              {filteredRequests.map((req, index) => (
                <motion.button key={req.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 30 }} whileHover={{ scale: 1.02, x: -4 }} whileTap={{ scale: 0.98 }} onClick={() => onSelectRequest(req, false, true)} className="w-full text-right bg-card hover:bg-secondary/80 border border-border p-3 mt-3 rounded-xl transition-colors group relative shadow-sm hover:shadow-md">
                  <span className="absolute -top-2.5 right-3 bg-card px-2 text-[11px] font-bold text-primary">طلبي:</span>
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-bold text-sm truncate max-w-[70%]">{req.title}</span>
                    {req.status === "active" && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Browse Requests Button - Between switch and dropdown */}
            <motion.button 
              onClick={() => onNavigate("marketplace")} 
              whileHover={{ scale: 1.02, y: -2 }} 
              whileTap={{ scale: 0.98 }} 
              className="w-full h-12 mb-3 text-right flex items-center justify-between px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-lg transition-all group"
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard size={22} strokeWidth={2} />
                <span className="font-bold text-sm">تصفح طلبات الآخرين</span>
              </div>
              <ChevronLeft size={20} strokeWidth={2.5} className="group-hover:-translate-x-1 transition-transform" />
            </motion.button>

            <div className="mb-3 relative" ref={offersDropdownRef}>
              <button onClick={() => setIsOffersDropdownOpen(!isOffersDropdownOpen)} className={`w-full text-right flex items-center justify-between px-3 py-3.5 rounded-2xl border transition-all ${isOffersDropdownOpen ? "bg-primary/10 border-primary text-primary" : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15"}`}>
                <div className="flex items-center gap-2"><span className="text-sm font-bold">{offerFilter === "all" ? "كل عروضي" : offerFilter === "accepted" ? "عروضي المقبولة" : offerFilter === "pending" ? "عروضي قيد الانتظار" : "المكتملة والمؤرشفة"}</span><span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold transition-colors ${isOffersDropdownOpen ? "bg-primary text-white" : "bg-primary text-white"}`}>{offerFilter === "all" ? counts.offers.all : offerFilter === "accepted" ? counts.offers.accepted : offerFilter === "pending" ? counts.offers.pending : counts.offers.completed}</span></div>
                <motion.div animate={{ rotate: isOffersDropdownOpen ? 180 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}><ChevronUp size={18} className="text-primary" /></motion.div>
              </button>
              <AnimatePresence>
                {isOffersDropdownOpen && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-2xl shadow-lg z-50 overflow-hidden">
                    <motion.button whileTap={{ scale: 0.98, backgroundColor: "rgba(30, 150, 140, 0.15)" }} onClick={() => { setOfferFilter("all"); setIsOffersDropdownOpen(false); }} className={`w-full text-right px-3 py-3 text-sm font-bold transition-colors flex items-center justify-between focus:outline-none ${offerFilter === "all" ? "bg-primary/10 text-primary" : "hover:bg-secondary/50"}`}><motion.span whileTap={{ scale: 1.02 }} className="transition-transform">كل عروضي</motion.span><span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold ${offerFilter === "all" ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>{counts.offers.all}</span></motion.button>
                    <motion.button whileTap={{ scale: 0.98, backgroundColor: "rgba(30, 150, 140, 0.15)" }} onClick={() => { setOfferFilter("pending"); setIsOffersDropdownOpen(false); }} className={`w-full text-right px-3 py-3 text-sm font-bold transition-colors border-t border-border flex items-center justify-between focus:outline-none ${offerFilter === "pending" ? "bg-primary/10 text-primary" : "hover:bg-secondary/50"}`}><motion.span whileTap={{ scale: 1.02 }} className="transition-transform">عروضي قيد الانتظار</motion.span><span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold ${offerFilter === "pending" ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>{counts.offers.pending}</span></motion.button>
                    <motion.button whileTap={{ scale: 0.98, backgroundColor: "rgba(30, 150, 140, 0.15)" }} onClick={() => { setOfferFilter("accepted"); setIsOffersDropdownOpen(false); }} className={`w-full text-right px-3 py-3 text-sm font-bold transition-colors border-t border-border flex items-center justify-between focus:outline-none ${offerFilter === "accepted" ? "bg-primary/10 text-primary" : "hover:bg-secondary/50"}`}><motion.span whileTap={{ scale: 1.02 }} className="transition-transform">عروضي المقبولة</motion.span><span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold ${offerFilter === "accepted" ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>{counts.offers.accepted}</span></motion.button>
                    <motion.button whileTap={{ scale: 0.98, backgroundColor: "rgba(30, 150, 140, 0.15)" }} onClick={() => { setOfferFilter("completed"); setIsOffersDropdownOpen(false); }} className={`w-full text-right px-3 py-3 text-sm font-bold transition-colors border-t border-border flex items-center justify-between focus:outline-none ${offerFilter === "completed" ? "bg-primary/10 text-primary" : "hover:bg-secondary/50"}`}><motion.span whileTap={{ scale: 1.02 }} className="transition-transform">المكتملة والمؤرشفة</motion.span><span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold ${offerFilter === "completed" ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>{counts.offers.completed}</span></motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div key={offerFilter} className="space-y-4 min-h-[100px] animate-in slide-in-from-right-2 duration-300">
              {filteredOffers.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
                  <motion.div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-brand flex items-center justify-center" animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                    <span className="text-xl font-black text-white">أ</span>
                  </motion.div>
                  <p className="text-sm text-muted-foreground">لا توجد عروض</p>
                </motion.div>
              )}
              {filteredOffers.map((offer, index) => {
                return (
                  <motion.button key={offer.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 30 }} whileHover={{ scale: 1.02, x: -4 }} whileTap={{ scale: 0.98 }} onClick={() => onSelectOffer(offer, true)} className="w-full text-right bg-card hover:bg-secondary/80 border border-border p-3 pt-4 rounded-xl transition-colors group relative shadow-sm hover:shadow-md">
                    <span className="absolute -top-2.5 right-3 bg-card px-2 text-[11px] font-bold text-primary">عرضي:</span>
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-bold text-base truncate text-primary max-w-[70%]">{offer.title}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col shrink-0">
        {mode === "requests" && (
          <div className="border-t border-border bg-card z-20 shrink-0 relative flex flex-col" ref={requestsConversationsRef}>
            <AnimatePresence>
              {isRequestsConversationsOpen && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: requestsConvsHeight }}
                  exit={{ height: 0 }}
                  transition={isResizing ? { type: "tween", duration: 0 } : { type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
                  className={`absolute bottom-full left-0 right-0 bg-card border-t border-border shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col z-30 transition-[border-radius] duration-300 ${requestsSheetLevel === 2 ? "rounded-t-none" : "rounded-t-[2.5rem]"}`}
                >
                  <div
                    onMouseDown={(e) => handleResizeStart(e, 'requests')}
                    onTouchStart={(e) => handleResizeStart(e, 'requests')}
                    className="h-14 cursor-ns-resize flex items-center justify-center select-none bg-transparent shrink-0"
                    style={{ touchAction: "none" }}
                  >
                    <div
                      className={`flex flex-col items-center justify-center transition-all duration-200 text-primary mt-1.5 ${isResizing ? "scale-125" : ""}`}
                    >
                      <div 
                        className={`h-1.5 rounded-full bg-current shadow-[0_0_10px_rgba(30,150,140,0.3)] transition-all duration-200 ${isResizing ? "w-16" : "w-12"}`}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6">
                    {requestsConversations.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/50 flex items-center justify-center"><MessageCircle size={24} className="opacity-20" /></div>
                        <p className="text-sm font-medium">لا توجد محادثات نشطة</p>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2">
                        {requestsConversations.map((conv, index) => (
                          <motion.button key={conv.id} onClick={() => onNavigate("messages")} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="w-full text-right bg-secondary/20 hover:bg-secondary/40 border border-border/40 p-3 rounded-2xl transition-all group active:scale-[0.98]">
                            <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{conv.other_user?.display_name || "مستخدم"}</div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <button onClick={() => toggleSheet('requests')} className={`w-full text-right flex items-center justify-between px-4 py-3 transition-all relative z-40 ${isRequestsConversationsOpen ? "bg-primary/10 border-primary text-primary" : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15"}`}>
              <div className="flex items-center gap-3">
                <MessageCircle size={18} strokeWidth={2} />
                <span className="text-sm font-bold">محادثات طلباتي</span>
                {requestsConversations.length > 0 && <span className="bg-primary text-white text-[11px] px-2 py-0.5 rounded-full font-bold">{requestsConversations.length}</span>}
              </div>
              <motion.div animate={{ rotate: isRequestsConversationsOpen ? 90 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                {isRequestsConversationsOpen ? <X size={18} /> : <ChevronUp size={18} />}
              </motion.div>
            </button>
          </div>
        )}


        {mode === "offers" && (
          <div className="border-t border-border bg-card z-20 shrink-0 relative flex flex-col" ref={offersConversationsRef}>
            <AnimatePresence>
              {isOffersConversationsOpen && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: offersConvsHeight }}
                  exit={{ height: 0 }}
                  transition={isResizing ? { type: "tween", duration: 0 } : { type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
                  className={`absolute bottom-full left-0 right-0 bg-card border-t border-border shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col z-30 transition-[border-radius] duration-300 ${offersSheetLevel === 2 ? "rounded-t-none" : "rounded-t-[2.5rem]"}`}
                >
                  <div
                    onMouseDown={(e) => handleResizeStart(e, 'offers')}
                    onTouchStart={(e) => handleResizeStart(e, 'offers')}
                    className="h-14 cursor-ns-resize flex items-center justify-center select-none bg-transparent shrink-0"
                    style={{ touchAction: "none" }}
                  >
                    <div
                      className={`flex flex-col items-center justify-center transition-all duration-200 text-primary mt-1.5 ${isResizing ? "scale-125" : ""}`}
                    >
                      <div 
                        className={`h-1.5 rounded-full bg-current shadow-[0_0_10px_rgba(30,150,140,0.3)] transition-all duration-200 ${isResizing ? "w-16" : "w-12"}`}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6">
                    {offersConversations.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/50 flex items-center justify-center"><MessageCircle size={24} className="opacity-20" /></div>
                        <p className="text-sm font-medium">لا توجد محادثات نشطة</p>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2">
                        {offersConversations.map((conv, index) => (
                          <motion.button key={conv.id} onClick={() => onNavigate("messages")} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="w-full text-right bg-secondary/20 hover:bg-secondary/40 border border-border/40 p-3 rounded-2xl transition-all group active:scale-[0.98]">
                            <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{conv.other_user?.display_name || "مستخدم"}</div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <button onClick={() => toggleSheet('offers')} className={`w-full text-right flex items-center justify-between px-4 py-3 transition-all relative z-40 ${isOffersConversationsOpen ? "bg-primary/10 border-primary text-primary" : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15"}`}>
              <div className="flex items-center gap-3">
                <MessageCircle size={18} strokeWidth={2} />
                <span className="text-sm font-bold">محادثات عروضي</span>
                {offersConversations.length > 0 && <span className="bg-primary text-white text-[11px] px-2 py-0.5 rounded-full font-bold">{offersConversations.length}</span>}
              </div>
              <motion.div animate={{ rotate: isOffersConversationsOpen ? 90 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                {isOffersConversationsOpen ? <X size={18} /> : <ChevronUp size={18} />}
              </motion.div>
            </button>
          </div>
        )}


        {/* Mode Switcher - moved below conversations */}
        <div className="px-2 py-2 border-t border-border bg-card z-20 shrink-0">
          <div className="flex bg-secondary/30 rounded-2xl p-1 border border-border/30 relative min-w-[200px]">
            <button onClick={() => { 
              if (navigator.vibrate) navigator.vibrate(15); onNavigate("requests-mode"); 
            }} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors duration-200 relative flex items-center justify-center gap-2 ${mode === "requests" ? "text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {mode === "requests" && (
                <motion.div 
                  layoutId="active-sidebar-tab"
                  className="absolute inset-0 rounded-xl bg-primary shadow-lg z-0"
                  transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.5 }}
                />
              )}
              <span className="relative z-10">طلباتي</span>
              <span className={`relative z-10 inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold transition-colors ${mode === "requests" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>{userRequests.length}</span>
            </button>
            <button onClick={() => { 
              if (navigator.vibrate) navigator.vibrate(15); onNavigate("offers-mode"); 
            }} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors duration-200 relative flex items-center justify-center gap-2 ${mode === "offers" ? "text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {mode === "offers" && (
                <motion.div 
                  layoutId="active-sidebar-tab"
                  className="absolute inset-0 rounded-xl bg-primary shadow-lg z-0"
                  transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.5 }}
                />
              )}
              <span className="relative z-10">عروضي</span>
              <span className={`relative z-10 inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold transition-colors ${mode === "offers" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>{userOffers.length}</span>
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-card z-20 shrink-0">
          <div className="flex items-center gap-3 w-full">
            {toggleTheme && (
              <motion.button onClick={() => { if (navigator.vibrate) navigator.vibrate(15); toggleTheme(); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`flex-1 flex items-center justify-center gap-3 h-11 rounded-xl border transition-all ${isDarkMode ? 'bg-white border-white text-slate-900 hover:bg-white/90' : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'}`} title={isDarkMode ? "الوضع الفاتح" : "الوضع الداكن"}>
                <div className="flex items-center gap-2.5">
                  <Sun size={20} className={!isDarkMode ? "text-amber-500 opacity-100" : "text-slate-400 opacity-60"} />
                  <ArrowLeftRight size={16} className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} transition-transform duration-300 ${isDarkMode ? 'rotate-180' : ''}`} />
                  <Moon size={20} className={isDarkMode ? "text-indigo-600 opacity-100" : "text-slate-400 opacity-60"} />
                </div>
              </motion.button>
            )}
            {onOpenLanguagePopup && (
              <motion.button onClick={onOpenLanguagePopup} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-border bg-secondary/50 hover:bg-secondary/80 text-foreground transition-all" title="تغيير اللغة">
                <Languages size={18} className="text-muted-foreground" /><span className="text-xs font-bold">العربية</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
