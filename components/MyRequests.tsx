import React, { useState, useRef, useMemo, useEffect } from "react";
import { Request, Offer } from "../types";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  MapPin,
  Calendar,
  Briefcase,
  Archive,
  ArchiveRestore,
  MessageCircle,
  ArrowUpDown,
  Clock,
  User,
} from "lucide-react";
import { FaHandPointUp } from "react-icons/fa";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FloatingFilterIsland } from "./ui/FloatingFilterIsland";
import { UnifiedHeader } from "./ui/UnifiedHeader";

type RequestFilter = "active" | "approved" | "all" | "completed";
type SortOrder = "updatedAt" | "createdAt";

interface MyRequestsProps {
  requests: Request[];
  archivedRequests?: Request[];
  receivedOffersMap?: Map<string, Offer[]>;
  onSelectRequest: (req: Request) => void;
  onArchiveRequest?: (requestId: string) => void;
  onUnarchiveRequest?: (requestId: string) => void;
  onOpenChat?: (requestId: string, offer: Offer) => void;
  userId?: string;
  viewedRequestIds?: Set<string>;
  // Profile dropdown props
  user?: any;
  isGuest?: boolean;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  onSignOut?: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  onOpenLanguagePopup?: () => void;
  // Create Request navigation
  onCreateRequest?: () => void;
  // Is this page currently active
  isActive?: boolean;
}

export const MyRequests: React.FC<MyRequestsProps> = ({
  requests,
  archivedRequests = [],
  receivedOffersMap = new Map(),
  onSelectRequest,
  onArchiveRequest,
  onUnarchiveRequest,
  onOpenChat,
  userId,
  viewedRequestIds = new Set(),
  user,
  isGuest = false,
  onNavigateToProfile,
  onNavigateToSettings,
  onSignOut,
  isDarkMode = false,
  toggleTheme,
  onOpenLanguagePopup,
  onCreateRequest,
  isActive = true,
}) => {
  // Header compression state - for smooth scroll animations
  const [isHeaderCompressed, setIsHeaderCompressed] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Filter & Sort States
  const [reqFilter, setReqFilter] = useState<RequestFilter>("active");
  const [sortOrder, setSortOrder] = useState<SortOrder>("createdAt");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Scroll Listener for header compression - same logic as Marketplace
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollDelta = scrollTop - lastScrollY.current;
      
      if (scrollTop < 50) {
        // Always show when near top
        setIsHeaderCompressed(false);
      } else if (scrollDelta > 10) {
        // Scrolling down - compress header
        setIsHeaderCompressed(true);
      } else if (scrollDelta < -10) {
        // Scrolling up - expand header
        setIsHeaderCompressed(false);
      }
      lastScrollY.current = scrollTop;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Counts
  const counts = useMemo(() => {
    const allReqs = [...requests, ...archivedRequests];
    return {
      all: allReqs.length,
      active: requests.filter(req => req.status === "active" || (req.status as any) === "draft").length,
      approved: requests.filter(req => req.status === "assigned").length,
      completed: allReqs.filter(req => req.status === "completed" || req.status === "archived").length
    };
  }, [requests, archivedRequests]);

  // Filtered & Sorted Requests
  const filteredRequests = useMemo(() => {
    const allReqs = [...requests, ...archivedRequests];
    let result: Request[] = [];
    
    if (reqFilter === "all") {
      result = allReqs;
    } else if (reqFilter === "active") {
      result = requests.filter(req => req.status === "active" || (req.status as any) === "draft");
    } else if (reqFilter === "approved") {
      result = requests.filter(req => req.status === "assigned");
    } else {
      result = allReqs.filter(req => req.status === "completed" || req.status === "archived");
    }

    // Sort
    return result.sort((a, b) => {
      if (sortOrder === "updatedAt") {
        const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bDate - aDate;
      } else {
        const aDate = new Date(a.createdAt || 0).getTime();
        const bDate = new Date(b.createdAt || 0).getTime();
        return bDate - aDate;
      }
    });
  }, [requests, archivedRequests, reqFilter, sortOrder]);

  // Filter configurations for FloatingFilterIsland
  const filterConfigs = useMemo(() => [
    {
      id: "sortOrder",
      icon: <ArrowUpDown size={14} />,
      options: [
        { value: "createdAt", label: "وقت الإنشاء", icon: <Calendar size={12} /> },
        { value: "updatedAt", label: "آخر تحديث", icon: <Clock size={12} /> },
      ],
      value: sortOrder,
      onChange: (value: string) => setSortOrder(value as SortOrder),
      getLabel: () => sortOrder === "updatedAt" ? "آخر تحديث" : "تاريخ الإنشاء",
      showCount: false,
    },
    {
      id: "reqFilter",
      icon: <FileText size={14} />,
      options: [
        { value: "all", label: "كل طلباتي", count: counts.all },
        { value: "active", label: "طلباتي النشطة", count: counts.active },
        { value: "approved", label: "طلباتي المعتمدة", count: counts.approved },
        { value: "completed", label: "المكتملة والمؤرشفة", count: counts.completed },
      ],
      value: reqFilter,
      onChange: (value: string) => setReqFilter(value as RequestFilter),
      getLabel: () => {
        switch (reqFilter) {
          case "all": return "كل طلباتي";
          case "active": return "النشطة";
          case "approved": return "المعتمدة";
          case "completed": return "المكتملة";
        }
      },
      showCount: true,
    },
  ], [reqFilter, sortOrder, counts]);

  const getStatusConfig = (req: Request) => {
    if (req.status === 'assigned' || req.status === 'completed') {
      return { text: "تم اعتماد عرض", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: "✅" };
    }
    if (req.status === 'archived') {
      return { text: "مؤرشف", color: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400", icon: "📦" };
    }
    return { text: "نشط", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: "🟢" };
  };

  return (
    <div 
      ref={scrollContainerRef}
      className="h-full overflow-x-hidden container mx-auto max-w-6xl relative no-scrollbar overflow-y-auto"
    >
      {/* Sticky Header Wrapper - Unified with main header - same structure as Marketplace */}
      <div 
        ref={headerRef}
        className="sticky top-0 z-[60] overflow-visible"
      >
        {/* Container for header and filter island - fixed compact size */}
        <div 
          className="flex flex-col overflow-visible origin-top"
          style={{
            transform: 'scale(0.92) translateY(4px)',
          }}
        >
          {/* Main Header Content */}
          <div className="px-4">
            <UnifiedHeader
              mode="requests"
              toggleMode={() => {}}
              isModeSwitching={false}
              unreadCount={0}
              hasUnreadMessages={false}
              user={user}
              setView={() => {}}
              setPreviousView={() => {}}
              titleKey={reqFilter === "all" ? 0 : reqFilter === "active" ? 1 : reqFilter === "approved" ? 2 : 3}
              notifications={[]}
              onMarkAsRead={() => {}}
              onNotificationClick={() => {}}
              onClearAll={() => {}}
              onSignOut={onSignOut || (() => {})}
              currentView="my-requests"
              transparent={true}
              hideActionButtons={true}
              onNavigateToProfile={onNavigateToProfile}
              onNavigateToSettings={onNavigateToSettings}
              isGuest={isGuest}
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
              onOpenLanguagePopup={onOpenLanguagePopup}
              title="طلباتي"
              isScrolled={!isHeaderCompressed}
              showCreateRequestButton={true}
              onCreateRequest={onCreateRequest}
              isActive={isActive}
            />
          </div>
          
          {/* Filter Island - inside scaled container */}
          <FloatingFilterIsland 
            filters={filterConfigs}
            scrollContainerRef={scrollContainerRef}
            isActive={isActive}
          />
        </div>
      </div>


      {/* Content */}
      <div className="px-4 pb-24">
        <div key={reqFilter} className="grid grid-cols-1 gap-6 min-h-[100px] pt-2">
          {filteredRequests.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-8">
              <motion.div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-brand flex items-center justify-center" animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                <span className="text-xl font-black text-white">أ</span>
              </motion.div>
              <p className="text-sm text-muted-foreground">لا توجد طلبات</p>
            </motion.div>
          )}
          {filteredRequests.map((req, index) => {
            const requestOffers = receivedOffersMap.get(req.id) || [];
            const acceptedOffer = requestOffers.find(o => o.status === 'accepted');
            const pendingOffers = requestOffers.filter(o => o.status === 'pending' || o.status === 'negotiating');
            const requestNumber = req.requestNumber || req.id.slice(-4).toUpperCase();
            const statusConfig = getStatusConfig(req);

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 30,
                  delay: index < 9 ? index * 0.03 : 0
                }}
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => onSelectRequest(req)}
                className="bg-card border border-border rounded-2xl p-4 pt-5 transition-colors cursor-pointer relative shadow-sm group text-right"
              >
                {/* Floating Label */}
                <span className="absolute -top-3 right-4 bg-card px-2 py-0.5 text-[11px] font-bold text-primary flex items-center gap-1 rounded-full border border-border">
                  <FaHandPointUp size={12} className="text-primary" />
                  طلبي ({requestNumber})
                </span>
                
                {/* Title & Status */}
                <div className="flex items-start justify-between mb-2">
                  <span className="font-bold text-base truncate text-primary max-w-[70%]">
                    {req.title}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusConfig.color}`}>
                      {statusConfig.text}
                    </span>
                    {onArchiveRequest && req.status !== 'archived' && (
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
                    {onUnarchiveRequest && req.status === 'archived' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnarchiveRequest(req.id);
                        }}
                        className="p-1 hover:bg-secondary/80 rounded transition-colors text-muted-foreground hover:text-foreground"
                        title="إلغاء الأرشفة"
                      >
                        <ArchiveRestore size={14} />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Location & Date */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 flex-wrap">
                  {req.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {req.location}
                    </span>
                  )}
                  {req.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {format(new Date(req.createdAt), "dd MMM", { locale: ar })}
                    </span>
                  )}
                  {req.categories && req.categories.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Briefcase size={14} />
                      {req.categories[0]}
                    </span>
                  )}
                </div>
                
                {/* Budget */}
                {(req.budgetMin || req.budgetMax) && (
                  <div className="flex items-center gap-2 text-sm mb-2 flex-wrap">
                    <span className="text-muted-foreground">الميزانية:</span>
                    <span className="font-bold text-foreground">
                      {req.budgetMin && req.budgetMax 
                        ? `${req.budgetMin} - ${req.budgetMax} ر.س`
                        : req.budgetMax 
                          ? `حتى ${req.budgetMax} ر.س`
                          : `من ${req.budgetMin} ر.س`
                      }
                    </span>
                  </div>
                )}
                
                {/* Offers Summary Box */}
                {requestOffers.length > 0 && (
                  <div className="mt-3 p-2.5 pt-3 rounded-lg bg-secondary/50 border border-border/50 space-y-1.5 relative">
                    <span className="absolute -top-2.5 right-3 bg-card px-2 text-[11px] font-bold text-muted-foreground">
                      العروض المستلمة ({requestOffers.length})
                    </span>
                    
                    <div className="flex flex-wrap gap-2 text-xs">
                      {pendingOffers.length > 0 && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                          ⏳ {pendingOffers.length} قيد الانتظار
                        </span>
                      )}
                      {acceptedOffer && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                          ✅ عرض معتمد
                        </span>
                      )}
                    </div>
                    
                    {acceptedOffer && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">العرض المعتمد:</span>
                          <span className="font-bold text-primary">{acceptedOffer.price} ر.س</span>
                        </div>
                        {acceptedOffer.providerName && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <User size={12} />
                            <span>{acceptedOffer.providerName}</span>
                          </div>
                        )}
                        {onOpenChat && (req.contactMethod === 'chat' || req.contactMethod === 'both' || !req.contactMethod) && (
                          <div className="flex items-center gap-1.5 mt-2 justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenChat(req.id, acceptedOffer);
                              }}
                              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground transition-all shadow-sm"
                              title="فتح المحادثة"
                            >
                              <MessageCircle size={12} />
                              محادثة
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!acceptedOffer && pendingOffers.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>أقل عرض:</span>
                          <span className="font-bold text-foreground">
                            {Math.min(...pendingOffers.map(o => parseFloat(o.price) || 0))} ر.س
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {requestOffers.length === 0 && req.status === 'active' && (
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <span className="text-amber-500">⏳</span>
                    <span>بانتظار العروض...</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

