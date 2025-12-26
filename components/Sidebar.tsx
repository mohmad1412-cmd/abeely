import React, { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { Button } from "./ui/Button";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import { UserProfile } from "../services/authService";
import { getConversations, Conversation } from "../services/messagesService";

interface SidebarProps {
  mode: AppMode;
  isOpen: boolean;
  userRequests: Request[];
  allRequests?: Request[];
  userOffers: Offer[];
  archivedRequests?: Request[];
  archivedOffers?: Offer[];
  onSelectRequest: (req: Request, scrollToOffer?: boolean) => void;
  onSelectOffer: (off: Offer) => void;
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
}


export const Sidebar: React.FC<SidebarProps> = ({
  mode,
  isOpen,
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
}) => {
  const [reqFilter, setReqFilter] = useState<"active" | "approved" | "all" | "completed">("active");
  const [offerFilter, setOfferFilter] = useState<"all" | "accepted" | "pending" | "completed">("all");
  const [hideUnacceptable, setHideUnacceptable] = useState(true);
  const [isRequestsConversationsOpen, setIsRequestsConversationsOpen] = useState(false);
  const [isOffersConversationsOpen, setIsOffersConversationsOpen] = useState(false);
  const [isOffersDropdownOpen, setIsOffersDropdownOpen] = useState(false);
  const [isRequestsDropdownOpen, setIsRequestsDropdownOpen] = useState(false);
  const [requestsConversations, setRequestsConversations] = useState<Conversation[]>([]);
  const [offersConversations, setOffersConversations] = useState<Conversation[]>([]);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // Refs for dropdowns to detect outside clicks
  const offersDropdownRef = useRef<HTMLDivElement>(null);
  const requestsDropdownRef = useRef<HTMLDivElement>(null);
  const requestsConversationsRef = useRef<HTMLDivElement>(null);
  const offersConversationsRef = useRef<HTMLDivElement>(null);

  // Logic to distinguish swipe vs scroll
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null,
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const dx = touchEnd.x - touchStart.x;
    const dy = touchEnd.y - touchStart.y;

    if (Math.abs(dy) > Math.abs(dx)) {
      setTouchStart(null);
      return;
    }

    const minSwipeDistance = 60;

    if (Math.abs(dx) > minSwipeDistance) {
      if (dx > 0) {
        if (mode === "requests" && reqFilter === "active") {
          setReqFilter("completed");
        }
        if (mode === "offers" && offerFilter === "all") {
          setOfferFilter("accepted");
        }
      }
      if (dx < 0) {
        if (mode === "requests" && reqFilter === "completed") {
          setReqFilter("active");
        }
        if (mode === "offers" && offerFilter === "accepted") {
          setOfferFilter("all");
        }
      }
    }
    setTouchStart(null);
  };

  // Animation is handled via CSS classes, no early return

  // Load conversations when dropdowns open
  useEffect(() => {
    if (isRequestsConversationsOpen && user?.id && !isGuest) {
      let isMounted = true;
      const loadConversations = async () => {
        try {
          const conversations = await getConversations();
          if (!isMounted) return;
          
          // Filter conversations related to requests (has request_id but no offer_id)
          const requestsConvs = conversations.filter(conv => conv.request_id !== null && conv.offer_id === null);
          setRequestsConversations(requestsConvs);
          
          // Check for unread messages and notify parent
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
      
      return () => {
        isMounted = false;
      };
    } else {
      setRequestsConversations([]);
    }
  }, [isRequestsConversationsOpen, user?.id, isGuest, onUnreadMessagesChange]);

  useEffect(() => {
    if (isOffersConversationsOpen && user?.id && !isGuest) {
      let isMounted = true;
      const loadConversations = async () => {
        try {
          const conversations = await getConversations();
          if (!isMounted) return;
          
          // Filter conversations related to offers (has offer_id)
          const offersConvs = conversations.filter(conv => conv.offer_id !== null);
          setOffersConversations(offersConvs);
          
          // Check for unread messages and notify parent
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
      
      return () => {
        isMounted = false;
      };
    } else {
      setOffersConversations([]);
    }
  }, [isOffersConversationsOpen, user?.id, isGuest, onUnreadMessagesChange]);

  // Check for unread messages periodically - DISABLED on initial load to prevent white screen
  // This will only run when user explicitly opens conversations dropdown
  // useEffect(() => {
  //   if (!user?.id || isGuest) {
  //     setHasUnreadMessages(false);
  //     onUnreadMessagesChange?.(false);
  //     return;
  //   }
  //   // Disabled to prevent white screen on initial load
  // }, [user?.id, isGuest, onUnreadMessagesChange]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        offersDropdownRef.current &&
        !offersDropdownRef.current.contains(event.target as Node) &&
        isOffersDropdownOpen
      ) {
        setIsOffersDropdownOpen(false);
      }
      if (
        requestsDropdownRef.current &&
        !requestsDropdownRef.current.contains(event.target as Node) &&
        isRequestsDropdownOpen
      ) {
        setIsRequestsDropdownOpen(false);
      }
      if (
        requestsConversationsRef.current &&
        !requestsConversationsRef.current.contains(event.target as Node) &&
        isRequestsConversationsOpen
      ) {
        setIsRequestsConversationsOpen(false);
      }
      if (
        offersConversationsRef.current &&
        !offersConversationsRef.current.contains(event.target as Node) &&
        isOffersConversationsOpen
      ) {
        setIsOffersConversationsOpen(false);
      }
    };

    if (isOffersDropdownOpen || isRequestsDropdownOpen || isRequestsConversationsOpen || isOffersConversationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOffersDropdownOpen, isRequestsDropdownOpen, isRequestsConversationsOpen, isOffersConversationsOpen]);

  // Filter requests based on selected filter
  const filteredRequests = (() => {
    const allReqs = [...userRequests, ...(archivedRequests || [])];
    
    if (reqFilter === "all") {
      // كل طلباتي - بحسب الأحدث إنشاءً (بما في ذلك المكتملة والمؤرشفة)
      return allReqs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }
    if (reqFilter === "active") {
      // طلباتي النشطة
      return userRequests.filter(req => req.status === "active" || req.status === "draft");
    }
    if (reqFilter === "approved") {
      // طلباتي المعتمدة
      return userRequests.filter(req => req.status === "assigned");
    }
    // طلباتي المكتملة والمؤرشفة
    return allReqs.filter(req => req.status === "completed" || req.status === "archived");
  })();

  // Filter offers based on selected filter
  const filteredOffers = (() => {
    const allOffers = [...userOffers, ...(archivedOffers || [])];
    
    if (offerFilter === "all") {
      // كل عروضي - بحسب الأحدث (بما في ذلك المكتملة والمؤرشفة والغير مقبولة)
      let offers = allOffers.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      // فلتر إخفاء الغير مقبولة
      if (hideUnacceptable) {
        offers = offers.filter(offer => offer.status !== "rejected");
      }
      return offers;
    }
    if (offerFilter === "accepted") {
      // عروضي المقبولة
      return userOffers.filter(offer => offer.status === "accepted");
    }
    if (offerFilter === "pending") {
      // عروضي قيد الانتظار (بما في ذلك التفاوض)
      return userOffers.filter(offer => offer.status === "pending" || offer.status === "negotiating");
    }
    // عروضي المكتملة والمؤرشفة
    return allOffers.filter(offer => offer.status === "completed" || offer.status === "archived");
  })();

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-[90] w-[75vw] max-w-[340px] bg-card border-l border-border md:translate-x-0 md:static md:block md:w-[340px] shadow-2xl md:shadow-none flex flex-col transition-transform duration-300 ease-out pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >

      {/* Top Section - User Profile - Same height as header (h-16) */}
      <div className="h-16 px-4 flex items-center bg-secondary/10 shrink-0 md:border-b-0 border-b border-border">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
            {user?.avatar_url ? (
            <img
                src={user.avatar_url}
              alt="User"
              className="w-full h-full object-cover"
            />
            ) : isGuest ? (
              <User size={24} className="text-muted-foreground" />
            ) : (
              <span className="text-lg font-bold text-primary">
                {user?.display_name?.charAt(0) || "م"}
              </span>
            )}
          </div>
          
          {/* User Info */}
          <div className="flex-1 flex flex-col">
            {isGuest ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-yellow-500/10 text-yellow-600 px-1.5 py-0.5 rounded font-bold">
                    🎭 وضع الضيف
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  سجّل للحصول على المزيد من المميزات
                </p>
              </>
            ) : user ? (
              <>
                <span className="font-bold text-sm">
                  {user.display_name || "مستخدم أبيلي"}
                </span>
            <button
              onClick={() => onNavigate("profile")}
              className="text-xs text-primary hover:underline text-right"
            >
              عرض الملف الشخصي
            </button>
              </>
            ) : (
              <span className="font-bold text-sm">مستخدم أبيلي</span>
            )}
          </div>

          {/* Sign In/Out Button */}
          {isGuest && onSignOut && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSignOut}
              className="p-2.5 rounded-full text-primary hover:bg-primary/15 hover:shadow-[0_0_12px_rgba(30,150,140,0.4)] transition-all duration-200"
              title="تسجيل الدخول"
            >
              <LogIn size={18} />
            </motion.button>
          )}
          {user && !isGuest && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate("settings")}
              className="p-2.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/15 hover:shadow-[0_0_12px_rgba(30,150,140,0.4)] transition-all duration-200"
              title="الإعدادات"
            >
              <Settings size={18} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="px-4 pt-3 shrink-0 relative z-0">
        <div className="flex bg-secondary/30 rounded-xl p-1.5 border border-border/30 relative">
          {/* Animated Background Pill */}
          <motion.div
            layout
            className="absolute top-1.5 bottom-1.5 rounded-lg bg-primary shadow-lg"
            style={{
              width: 'calc(50% - 6px)',
              right: mode === "requests" ? '6px' : 'calc(50% + 2px)',
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
          <button
            onClick={() => onNavigate("requests-mode")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-md transition-colors duration-200 relative z-10 ${
              mode === "requests"
                ? "text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            طلباتي ({userRequests.length})
          </button>
          <button
            onClick={() => onNavigate("offers-mode")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-md transition-colors duration-200 relative z-10 ${
              mode === "offers"
                ? "text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            عروضي ({userOffers.length})
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar px-4 touch-pan-y relative z-10"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ paddingTop: '12px' }}
      >
        {mode === "requests"
          ? (
            <>
              {/* Requests Filter Dropdown */}
              <div className="mb-3 mt-2 relative" ref={requestsDropdownRef}>
                <button
                  onClick={() => setIsRequestsDropdownOpen(!isRequestsDropdownOpen)}
                  className={`w-full text-right flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                    isRequestsDropdownOpen
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-secondary/30 border-border hover:bg-secondary/50"
                  }`}
                >
                  <span className="text-xs font-bold">
                    {reqFilter === "active" ? "طلباتي النشطة" : 
                     reqFilter === "approved" ? "طلباتي المعتمدة" :
                     reqFilter === "all" ? "كل طلباتي" : "المكتملة والمؤرشفة"}
                  </span>
                  {isRequestsDropdownOpen ? (
                    <ChevronUp size={16} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={16} className="text-muted-foreground" />
                  )}
                </button>
                
                <AnimatePresence>
                  {isRequestsDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          setReqFilter("all");
                          setIsRequestsDropdownOpen(false);
                        }}
                        className={`w-full text-right px-3 py-2 text-xs font-bold transition-colors ${
                          reqFilter === "all"
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        كل طلباتي
                      </button>
                      <button
                        onClick={() => {
                          setReqFilter("active");
                          setIsRequestsDropdownOpen(false);
                        }}
                        className={`w-full text-right px-3 py-2 text-xs font-bold transition-colors border-t border-border ${
                          reqFilter === "active"
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        طلباتي النشطة
                      </button>
                      <button
                        onClick={() => {
                          setReqFilter("approved");
                          setIsRequestsDropdownOpen(false);
                        }}
                        className={`w-full text-right px-3 py-2 text-xs font-bold transition-colors border-t border-border ${
                          reqFilter === "approved"
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        طلباتي المعتمدة
                      </button>
                      <button
                        onClick={() => {
                          setReqFilter("completed");
                          setIsRequestsDropdownOpen(false);
                        }}
                        className={`w-full text-right px-3 py-2 text-xs font-bold transition-colors border-t border-border ${
                          reqFilter === "completed"
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        المكتملة والمؤرشفة
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div
                key={reqFilter}
                className="space-y-4 min-h-[100px] animate-in slide-in-from-right-2 duration-300 pt-2"
              >
                {filteredRequests.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-brand flex items-center justify-center"
                      animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className="text-xl font-black text-white">أ</span>
                    </motion.div>
                    <p className="text-sm text-muted-foreground">لا توجد طلبات</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">أنشئ طلبك، الجميع مستعد يخدمك! ✨</p>
                  </motion.div>
                )}
                {filteredRequests.map((req, index) => {
                  // Find accepted offer for this request
                  const acceptedOffer = req.offers?.find(o => o.status === 'accepted') || null;
                  
                  return (
                  <motion.button
                    key={req.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 30 }}
                    whileHover={{ scale: 1.02, x: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectRequest(req)}
                    className="w-full text-right bg-card hover:bg-secondary/80 border border-border p-3 mt-3 rounded-xl transition-colors group relative shadow-sm hover:shadow-md"
                  >

                    {/* Floating Label for Request */}
                    <span className="absolute -top-2.5 right-3 bg-card px-2 text-[11px] font-bold text-primary">
                      طلبي:
                    </span>
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-bold text-sm truncate max-w-[70%]">
                        {req.title}
                      </span>
                      <div className="flex items-center gap-1.5">
                      {req.status === "active" && (
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse">
                        </span>
                      )}
                        {onArchiveRequest && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onArchiveRequest(req.id);
                            }}
                            className="p-1 hover:bg-secondary/80 rounded transition-colors text-muted-foreground hover:text-foreground"
                            title="أرشفة الطلب"
                          >
                            <Archive size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {/* Hide offers count when there's an accepted offer */}
                      {!acceptedOffer && req.offers.length > 0 && (
                        <span className="flex items-center gap-1 bg-secondary px-1.5 py-0.5 rounded text-xs">
                          العروض الواردة: <span className="font-bold">{req.offers.length}</span>
                        </span>
                      )}
                      {req.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {req.location}
                        </span>
                      )}
                    </div>

                    
                    {/* Accepted Offer Box - Show when there's an accepted offer */}
                    {acceptedOffer && (
                      <div className="mt-5 p-2.5 pt-3 rounded-lg bg-green-500/10 border border-green-500/30 space-y-1.5 relative">

                        {/* Floating Label with checkmark */}
                        <span className="absolute -top-2.5 right-3 bg-white dark:bg-gray-900 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1 shadow-sm border border-green-300 dark:border-green-700">
                          ✅ العرض المقبول
                        </span>


                        
                        {/* Provider Name */}
                        <div className="flex items-center gap-1 text-sm text-foreground">
                          <span className="font-bold truncate max-w-[180px]">
                            {acceptedOffer.providerName}
                          </span>
                        </div>
                        
                        {/* Offer Details */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                          {acceptedOffer.location && (
                            <span className="flex items-center gap-0.5">
                              <MapPin size={12} />
                              {acceptedOffer.location}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5 text-green-600 font-medium">
                            💰 {acceptedOffer.price} ر.س
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            acceptedOffer.isNegotiable 
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {acceptedOffer.isNegotiable ? 'قابل للتفاوض' : 'غير قابل للتفاوض'}
                          </span>
                        </div>
                        
                        {/* Chat Button */}
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenChat) {
                                onOpenChat(req.id, acceptedOffer);
                              }
                            }}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white transition-colors"
                            title="فتح المحادثة مع مقدم العرض"
                          >
                            <MessageCircle size={12} />
                            تواصل مع العارض
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.button>
                  );
                })}
              </div>
            </>
          )
          : (
            <>
              {/* Offers Filter Dropdown */}
              <div className="mb-3 mt-2 relative" ref={offersDropdownRef}>
                <button
                  onClick={() => setIsOffersDropdownOpen(!isOffersDropdownOpen)}
                  className={`w-full text-right flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                    isOffersDropdownOpen
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-secondary/30 border-border hover:bg-secondary/50"
                  }`}
                >
                  <span className="text-xs font-bold">
                    {offerFilter === "all" ? "كل عروضي" : 
                     offerFilter === "accepted" ? "عروضي المقبولة" :
                     offerFilter === "pending" ? "عروضي قيد الانتظار" : "المكتملة والمؤرشفة"}
                  </span>
                  {isOffersDropdownOpen ? (
                    <ChevronUp size={16} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={16} className="text-muted-foreground" />
                  )}
                </button>
                
                <AnimatePresence>
                  {isOffersDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          setOfferFilter("all");
                          setIsOffersDropdownOpen(false);
                        }}
                        className={`w-full text-right px-3 py-2 text-xs font-bold transition-colors ${
                          offerFilter === "all"
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        كل عروضي
                      </button>
                      <button
                        onClick={() => {
                          setOfferFilter("pending");
                          setIsOffersDropdownOpen(false);
                        }}
                        className={`w-full text-right px-3 py-2 text-xs font-bold transition-colors border-t border-border ${
                          offerFilter === "pending"
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        عروضي قيد الانتظار
                      </button>
                      <button
                        onClick={() => {
                          setOfferFilter("accepted");
                          setIsOffersDropdownOpen(false);
                        }}
                        className={`w-full text-right px-3 py-2 text-xs font-bold transition-colors border-t border-border ${
                          offerFilter === "accepted"
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        عروضي المقبولة
                      </button>
                      <button
                        onClick={() => {
                          setOfferFilter("completed");
                          setIsOffersDropdownOpen(false);
                        }}
                        className={`w-full text-right px-3 py-2 text-xs font-bold transition-colors border-t border-border ${
                          offerFilter === "completed"
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        المكتملة والمؤرشفة
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Checkbox Filter for Unacceptable Offers - directly under tabs */}
              {offerFilter === "all" && (
                <div className="flex items-center gap-2 mb-3 px-1 animate-in fade-in slide-in-from-top-1">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      id="hideUnacceptable"
                      checked={hideUnacceptable}
                      onChange={(e) => setHideUnacceptable(e.target.checked)}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 bg-white checked:border-primary checked:bg-primary transition-all"
                    />
                    <svg className="pointer-events-none absolute right-0.5 top-0.5 h-4 w-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <label 
                    htmlFor="hideUnacceptable" 
                    className="text-xs font-medium text-muted-foreground select-none cursor-pointer hover:text-foreground transition-colors"
                  >
                    إخفاء العروض الغير مقبولة
                  </label>
                </div>
              )}

              <div
                key={offerFilter}
                className="space-y-4 min-h-[100px] animate-in slide-in-from-right-2 duration-300"
              >
                {filteredOffers.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-brand flex items-center justify-center"
                      animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className="text-xl font-black text-white">أ</span>
                    </motion.div>
                    <p className="text-sm text-muted-foreground">لا توجد عروض</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">تصفح الطلبات وقدم عروضك! ✨</p>
                  </motion.div>
                )}

                {filteredOffers.map((offer, index) => {
                  const relatedReq = allRequests.find((r) =>
                    r.id === offer.requestId
                  );
                  
                  // Contact status based on offer state
                  const getContactStatus = () => {
                    if (offer.status === "accepted") {
                      return { text: "عرضك مقبول، ابدأ التواصل", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400", icon: "✅" };
                    } else if (offer.status === "negotiating") {
                      return { text: "صاحب الطلب بدأ التفاوض معك", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400", icon: "💬" };
                    }
                    // For pending: show different text based on negotiable status
                    if (offer.isNegotiable) {
                      return { text: "انتظر قبول الطلب أو بدء التفاوض", color: "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400", icon: "⏳" };
                    }
                    return { text: "انتظر قبول الطلب", color: "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400", icon: "⏳" };
                  };
                  
                  const contactStatus = getContactStatus();
                  
                  return (
                    <motion.button
                      key={offer.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 30 }}
                      whileHover={{ scale: 1.02, x: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onSelectOffer(offer)}
                      className="w-full text-right bg-card hover:bg-secondary/80 border border-border p-3 pt-4 rounded-xl transition-colors group relative shadow-sm hover:shadow-md"
                    >
                      {/* Floating Label for Offer */}
                      <span className="absolute -top-2.5 right-3 bg-card px-2 text-[11px] font-bold text-primary">
                        عرضي:
                      </span>
                      {/* Offer Title & Status */}

                      <div className="flex items-start justify-between mb-2">
                        <span className="font-bold text-base truncate text-primary max-w-[70%]">
                          {offer.title}
                        </span>
                        <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            offer.status === "pending"
                              ? "bg-orange-100 text-orange-700"
                              : offer.status === "accepted"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {offer.status === "pending"
                            ? "انتظار"
                            : offer.status === "accepted"
                            ? "مقبول"
                            : "تفاوض"}
                        </span>
                          {onArchiveOffer && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onArchiveOffer(offer.id);
                              }}
                              className="p-1 hover:bg-secondary/80 rounded transition-colors text-muted-foreground hover:text-foreground"
                              title="أرشفة العرض"
                            >
                              <Archive size={14} />
                            </button>
                          )}
                        </div>
                      </div>


                      {/* Offer Details - Location, Date */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 flex-wrap">
                        {offer.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {offer.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {format(offer.createdAt, "dd MMM", { locale: ar })}
                        </span>
                      </div>
                      
                      {/* Offer Price & Negotiable */}
                      <div className="flex items-center gap-2 text-sm mb-2 flex-wrap">
                        <span className="text-muted-foreground">سعر عرضي:</span>
                        <span className="font-bold text-foreground">{offer.price} ر.س</span>
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          offer.isNegotiable 
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" 
                            : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                        }`}>
                          {offer.isNegotiable ? "قابل للتفاوض" : "غير قابل للتفاوض"}
                        </span>
                      </div>


                      {/* Related Request Box */}
                      {relatedReq && (
                        <div className="mt-5 p-2.5 pt-3 rounded-lg bg-secondary/50 border border-border/50 space-y-1.5 relative">

                          {/* Floating Label */}
                          <span className="absolute -top-2.5 right-3 bg-card px-2 text-[11px] font-bold text-muted-foreground">
                            على الطلب:
                          </span>

                          <div className="flex items-center gap-1 text-sm text-foreground">
                            <span className="font-bold truncate max-w-[180px]">
                              {relatedReq.title}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">

                            {relatedReq.location && (
                              <span className="flex items-center gap-0.5">
                                <MapPin size={12} />
                                {relatedReq.location}
                              </span>
                            )}
                            {relatedReq.budgetMin && relatedReq.budgetMax && (
                              <span className="flex items-center gap-0.5">
                                💰 {relatedReq.budgetMin}-{relatedReq.budgetMax} ر.س
                              </span>
                            )}
                            {relatedReq.deliveryTimeFrom && (
                              <span className="flex items-center gap-0.5">
                                ⏰ {relatedReq.deliveryTimeFrom}
                              </span>
                            )}
                          </div>
                          {/* Contact Status & Buttons */}
                          <div className="flex items-center justify-between gap-1.5 pt-1">
                            {/* Show status only for pending */}
                            {offer.status === 'pending' && (
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-muted-foreground">التواصل:</span>
                                <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${contactStatus.color}`}>
                                  {contactStatus.icon} {contactStatus.text}
                                </span>
                              </div>
                            )}
                            {/* Contact Buttons - Show only when accepted or negotiating */}
                            {(offer.status === 'accepted' || offer.status === 'negotiating') && (
                              <div className="flex items-center gap-1.5 w-full justify-end">
                                {/* WhatsApp Button - Show if contact method includes whatsapp or if created via WhatsApp */}
                                {(relatedReq.isCreatedViaWhatsApp || relatedReq.contactMethod === 'whatsapp' || relatedReq.contactMethod === 'both') && relatedReq.whatsappNumber && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onOpenWhatsApp && relatedReq.whatsappNumber) {
                                        onOpenWhatsApp(relatedReq.whatsappNumber, offer);
                                      } else {
                                        window.open(`https://wa.me/${relatedReq.whatsappNumber}`, '_blank');
                                      }
                                    }}
                                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-green-500 hover:bg-green-600 active:scale-95 active:bg-green-700 text-white transition-all shadow-sm"

                                    title="تواصل عبر واتساب"
                                  >
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                    </svg>
                                    واتساب
                                  </button>
                                )}
                                {/* In-App Chat Button - Show if not created via WhatsApp and contact method includes chat */}
                                {!relatedReq.isCreatedViaWhatsApp && (relatedReq.contactMethod === 'chat' || relatedReq.contactMethod === 'both' || !relatedReq.contactMethod) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onOpenChat) {
                                        onOpenChat(relatedReq.id, offer);
                                      }
                                    }}
                                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-primary hover:bg-primary/90 active:scale-95 active:bg-primary/80 text-primary-foreground transition-all shadow-sm"

                                    title="فتح المحادثة"
                                  >
                                    <MessageCircle size={12} />
                                    محادثة
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </>
          )}
      </div>

      {/* Bottom Fixed Section - All bottom elements grouped together */}
      <div className="flex flex-col shrink-0">
        {/* Conversations for Requests - Above Create Button - Only in Requests Mode */}
        {mode === "requests" && (
          <div className="border-t border-border bg-card z-20 shrink-0" ref={requestsConversationsRef}>
            <button
              onClick={() => setIsRequestsConversationsOpen(!isRequestsConversationsOpen)}
              className={`w-full text-right flex items-center justify-between px-4 py-3 transition-colors ${
                isRequestsConversationsOpen ? "bg-secondary hover:bg-secondary/90" : "hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageCircle size={18} strokeWidth={2} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">محادثات طلباتي</span>
                {(() => {
                  const totalUnread = requestsConversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
                  return totalUnread > 0 ? (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold min-w-[20px] flex items-center justify-center">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  ) : null;
                })()}
              </div>
              {isRequestsConversationsOpen ? (
                <ChevronDown
                  size={18}
                  className="text-muted-foreground transition-transform duration-200"
                />
              ) : (
                <ChevronUp
                  size={18}
                  className="text-muted-foreground transition-transform duration-200"
                />
              )}
            </button>

            {/* Conversations List - Collapsible */}
            <AnimatePresence>
              {isRequestsConversationsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 pt-2 space-y-2">
                    {requestsConversations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-xs">لا توجد محادثات</p>
                      </div>
                    ) : (
                      requestsConversations.map((conv, index) => {
                        const relatedReq = allRequests?.find(r => r.id === conv.request_id);
                        const relatedOffer = relatedReq?.offers?.find(o => o.id === conv.offer_id) || null;
                        const isAccepted = relatedOffer?.status === 'accepted';
                        const isNegotiating = relatedOffer?.status === 'negotiating';
                        
                        return (
                          <motion.button
                            key={conv.id}
                            onClick={() => {
                              onNavigate("messages");
                              // TODO: Navigate to specific conversation
                            }}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="w-full text-right bg-secondary/30 hover:bg-secondary/50 border border-border/50 p-2.5 rounded-lg transition-all group"
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1 text-right">
                                <div className="font-semibold text-sm truncate">
                                  {conv.other_user?.display_name || "مستخدم"}
                                </div>
                                {relatedReq && (
                                  <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    {relatedReq.title}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mr-2">
                                {(isAccepted || isNegotiating) && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    isAccepted 
                                      ? "bg-green-500/20 text-green-600 dark:text-green-400" 
                                      : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                                  }`}>
                                    {isAccepted ? "مقبول" : "تفاوض"}
                                  </span>
                                )}
                                {conv.unread_count && conv.unread_count > 0 && (
                                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] flex items-center justify-center">
                                    {conv.unread_count > 99 ? '99+' : conv.unread_count}
                                  </span>
                                )}
                              </div>
                            </div>
                            {conv.last_message_preview && (
                              <p className="text-xs text-muted-foreground line-clamp-1 text-right mt-1">
                                {conv.last_message_preview}
                              </p>
                            )}
                          </motion.button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Create Request Button - Fixed at Bottom - Only in Requests Mode */}
        {mode === "requests" && (
          <div className="border-t border-border bg-card z-20 shrink-0 px-4 py-3">
            <motion.button
              onClick={onCreateRequest}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full magic-border"
              style={{ position: 'relative', zIndex: 1 }}
            >
              <span className="w-full gap-2 bg-gradient-to-r from-primary/10 via-background to-primary/5 text-primary hover:from-primary/20 hover:to-primary/10 h-12 text-sm font-bold rounded-xl flex items-center justify-center transition-all relative z-10">
                <motion.span
                  animate={{ rotate: [0, 90, 0] }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  key={userRequests.length}
                  className="flex items-center justify-center"
                >
                  <PlusCircle size={20} strokeWidth={2} />
                </motion.span>
                إنشاء طلب جديد
              </span>
            </motion.button>
          </div>
        )}

        {/* Conversations for Offers - Above Browse Button - Only in Offers Mode */}
        {mode === "offers" && (
          <div className="border-t border-border bg-card z-20 shrink-0" ref={offersConversationsRef}>
            <button
              onClick={() => setIsOffersConversationsOpen(!isOffersConversationsOpen)}
              className={`w-full text-right flex items-center justify-between px-4 py-3 transition-colors ${
                isOffersConversationsOpen ? "bg-secondary hover:bg-secondary/90" : "hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageCircle size={18} strokeWidth={2} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">محادثات عروضي</span>
                {(() => {
                  const totalUnread = offersConversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
                  return totalUnread > 0 ? (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold min-w-[20px] flex items-center justify-center">
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                  ) : null;
                })()}
              </div>
              {isOffersConversationsOpen ? (
                <ChevronDown
                  size={18}
                  className="text-muted-foreground transition-transform duration-200"
                />
              ) : (
                <ChevronUp
                  size={18}
                  className="text-muted-foreground transition-transform duration-200"
                />
              )}
            </button>

            {/* Conversations List - Collapsible */}
            <AnimatePresence>
              {isOffersConversationsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 pt-2 space-y-2">
                    {offersConversations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-xs">لا توجد محادثات</p>
                      </div>
                    ) : (
                      offersConversations.map((conv, index) => {
                        const relatedReq = allRequests?.find(r => r.id === conv.request_id);
                        const relatedOffer = relatedReq?.offers?.find(o => o.id === conv.offer_id) || null;
                        const isAccepted = relatedOffer?.status === 'accepted';
                        const isNegotiating = relatedOffer?.status === 'negotiating';
                        
                        return (
                          <motion.button
                            key={conv.id}
                            onClick={() => {
                              onNavigate("messages");
                              // TODO: Navigate to specific conversation
                            }}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="w-full text-right bg-secondary/30 hover:bg-secondary/50 border border-border/50 p-2.5 rounded-lg transition-all group"
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1 text-right">
                                {relatedReq && (
                                  <div className="font-semibold text-sm truncate">
                                    {relatedReq.title}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mr-2">
                                {(isAccepted || isNegotiating) && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    isAccepted 
                                      ? "bg-green-500/20 text-green-600 dark:text-green-400" 
                                      : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                                  }`}>
                                    {isAccepted ? "مقبول" : "تفاوض"}
                                  </span>
                                )}
                                {conv.unread_count && conv.unread_count > 0 && (
                                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] flex items-center justify-center">
                                    {conv.unread_count > 99 ? '99+' : conv.unread_count}
                                  </span>
                                )}
                              </div>
                            </div>
                            {conv.last_message_preview && (
                              <p className="text-xs text-muted-foreground line-clamp-1 text-right mt-1">
                                {conv.last_message_preview}
                              </p>
                            )}
                          </motion.button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Browse Marketplace Button - Above Archive - Only in Offers Mode */}
        {mode === "offers" && (
          <div className="border-t border-border bg-card z-20 shrink-0 px-4 py-3">
            <motion.button
              onClick={() => onNavigate("marketplace")}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full h-12 text-right flex items-center justify-between px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-lg transition-all group"
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard size={22} strokeWidth={2} />
                <span className="font-bold text-sm">تصفح طلبات الآخرين</span>
              </div>
              <ChevronLeft
                size={20}
                strokeWidth={2.5}
                className="group-hover:-translate-x-1 transition-transform"
              />
            </motion.button>
          </div>
        )}

        {/* Theme Toggle & Language - Always at the very bottom */}
        <div className="p-4 border-t border-border bg-card z-20 shrink-0">
          <div className="flex items-center justify-center gap-3">
            {/* Theme Toggle */}
            {toggleTheme && (
              <motion.button
                onClick={toggleTheme}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  isDarkMode 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' 
                    : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/20'
                }`}
                title={isDarkMode ? "الوضع الفاتح" : "الوضع الداكن"}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                <span className="text-xs font-bold">{isDarkMode ? "فاتح" : "داكن"}</span>
              </motion.button>
            )}
            
            {/* Language Button */}
            {onOpenLanguagePopup && (
              <motion.button
                onClick={onOpenLanguagePopup}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 transition-all"
                title="تغيير اللغة"
              >
                <Languages size={18} />
                <span className="text-xs font-bold">العربية</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
