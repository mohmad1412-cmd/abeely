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
  Search,
  Plus,
  MoreVertical,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { FaHandPointUp } from "react-icons/fa";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FloatingFilterIsland } from "./ui/FloatingFilterIsland";
import { AVAILABLE_CATEGORIES } from "../data";

type RequestFilter = "active" | "approved" | "all" | "completed";
type SortOrder = "updatedAt" | "createdAt";

interface MyRequestsProps {
  requests: Request[];
  archivedRequests?: Request[];
  receivedOffersMap?: Map<string, Offer[]>;
  onSelectRequest: (req: Request) => void;
  onArchiveRequest?: (requestId: string) => void;
  onUnarchiveRequest?: (requestId: string) => void;
  onHideRequest?: (requestId: string) => void;
  onUnhideRequest?: (requestId: string) => void;
  onBumpRequest?: (requestId: string) => void;
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
  onHideRequest,
  onUnhideRequest,
  onBumpRequest,
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
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
    // Removed sortOrder filter - hiding "تاريخ التقديم" and "تاريخ الإنشاء" options
    {
      id: "reqFilter",
      icon: <FileText size={14} />,
      options: [
        { value: "all", label: "كل طلباتي", count: counts.all },
        { value: "active", label: "طلباتي النشطة", count: counts.active },
        { value: "approved", label: "طلباتي المعتمدة", count: counts.approved },
        { value: "completed", label: "طلباتي المكتملة والمؤرشفة", count: counts.completed },
      ],
      value: reqFilter,
      onChange: (value: string) => setReqFilter(value as RequestFilter),
      getLabel: () => {
        switch (reqFilter) {
          case "all": return "كل طلباتي";
          case "active": return "طلباتي النشطة";
          case "approved": return "طلباتي المعتمدة";
          case "completed": return "طلباتي المكتملة والمؤرشفة";
        }
      },
      showCount: true,
    },
  ], [reqFilter, counts]);

  const getStatusConfig = (req: Request) => {
    if (req.status === 'assigned' || req.status === 'completed') {
      return { text: "تم اعتماد عرض", color: "bg-primary/15 text-primary", icon: "✅" };
    }
    if (req.status === 'archived') {
      return { text: "مؤرشف", color: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400", icon: "📦" };
    }
    return { text: "نشط", color: "bg-primary/15 text-primary", icon: "🟢" };
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
        {/* طبقة متدرجة خلف عناصر الهيدر - تعزل الكروت */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: '-50px',
            height: 'calc(100% + 100px)',
            background: `linear-gradient(to bottom,
              rgba(var(--background-rgb), 1) 0%,
              rgba(var(--background-rgb), 1) 60%,
              rgba(var(--background-rgb), 0.8) 75%,
              rgba(var(--background-rgb), 0) 100%
            )`,
            zIndex: -1,
          }}
        />
        {/* Gradient separator between filters and cards */}
        <div
          className="absolute left-0 right-0 bottom-0 h-16 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(var(--background-rgb), 0), rgba(var(--background-rgb), 0.6), rgba(var(--background-rgb), 1))',
          }}
        />
        {/* Container for header and filter island - fixed compact size */}
        <div 
          className="flex flex-col overflow-visible origin-top"
          style={{
            transform: 'scale(0.92) translateY(4px)',
          }}
        >
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
            <div className="flex flex-col items-center justify-center py-20 text-center min-h-[50vh]">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
                {reqFilter === "all" ? (
                  <FileText className="text-muted-foreground" size={24} />
                ) : (
                  <Search className="text-muted-foreground" size={24} />
                )}
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {reqFilter === "all" 
                  ? "لا توجد طلبات" 
                  : reqFilter === "active"
                  ? "لا توجد طلبات نشطة"
                  : reqFilter === "approved"
                  ? "لا توجد طلبات معتمدة"
                  : "لا توجد طلبات مكتملة"}
              </h3>
              <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed">
                {reqFilter === "all"
                  ? "لم تقم بإنشاء أي طلبات بعد. ابدأ بإنشاء طلبك الأول لتجد مزودي الخدمات المناسبين."
                  : reqFilter === "active"
                  ? "لا توجد طلبات نشطة حالياً. يمكنك إنشاء طلب جديد أو التحقق من الطلبات الأخرى."
                  : reqFilter === "approved"
                  ? "لا توجد طلبات معتمدة بعد. عندما تقبل عرضاً من مزود خدمة، سيظهر هنا."
                  : "لا توجد طلبات مكتملة أو مؤرشفة. الطلبات المكتملة أو المؤرشفة ستظهر هنا."}
              </p>
              {reqFilter === "all" && onCreateRequest && (
                <button
                  onClick={onCreateRequest}
                  className="mt-6 px-4 py-2 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors flex items-center gap-2"
                >
                  <Plus size={18} />
                  إنشاء طلب جديد
                </button>
              )}
            </div>
          )}
          {filteredRequests.map((req, index) => {
            const requestOffers = receivedOffersMap.get(req.id) || [];
            const acceptedOffer = requestOffers.find(o => o.status === 'accepted');
            const pendingOffers = requestOffers.filter(o => o.status === 'pending' || o.status === 'negotiating');
            const requestNumber = req.requestNumber || req.id.slice(-4).toUpperCase();
            const statusConfig = getStatusConfig(req);
            const isHidden = req.isPublic === false;
            const lastUpdated = req.updatedAt ? new Date(req.updatedAt) : new Date(req.createdAt);
            const sixHoursMs = 6 * 60 * 60 * 1000;
            const elapsedSinceUpdate = Date.now() - lastUpdated.getTime();
            const canBump = elapsedSinceUpdate >= sixHoursMs;
            const bumpHoursLeft = Math.max(0, Math.ceil((sixHoursMs - elapsedSinceUpdate) / (60 * 60 * 1000)));

            return (
              <motion.div
                key={req.id}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
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
                  <div className="flex items-center gap-1.5 relative">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusConfig.color}`}>
                      {statusConfig.text}
                    </span>
                    {isHidden && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        مخفي
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === req.id ? null : req.id);
                      }}
                      className="p-1 hover:bg-secondary/80 rounded transition-colors text-muted-foreground hover:text-foreground"
                      title="خيارات الطلب"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === req.id && (
                      <div
                        className="absolute left-0 top-7 w-48 bg-card border border-border rounded-lg shadow-lg z-20 text-sm overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="w-full text-right px-3 py-2 hover:bg-secondary flex items-center gap-2"
                          onClick={() => {
                            setOpenMenuId(null);
                            if (isHidden) {
                              onUnhideRequest && onUnhideRequest(req.id);
                            } else {
                              onHideRequest && onHideRequest(req.id);
                            }
                          }}
                        >
                          {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                          <span>{isHidden ? "إظهار في السوق" : "إخفاء من السوق"}</span>
                        </button>
                        {onArchiveRequest && req.status !== 'archived' && (
                          <button
                            className="w-full text-right px-3 py-2 hover:bg-secondary flex items-center gap-2"
                            onClick={() => {
                              setOpenMenuId(null);
                              onArchiveRequest(req.id);
                            }}
                          >
                            <Archive size={14} />
                            <span>أرشفة الطلب</span>
                          </button>
                        )}
                        {onUnarchiveRequest && req.status === 'archived' && (
                          <button
                            className="w-full text-right px-3 py-2 hover:bg-secondary flex items-center gap-2"
                            onClick={() => {
                              setOpenMenuId(null);
                              onUnarchiveRequest(req.id);
                            }}
                          >
                            <ArchiveRestore size={14} />
                            <span>إلغاء الأرشفة</span>
                          </button>
                        )}
                        <button
                          disabled={!canBump || req.status === 'archived'}
                          className={`w-full text-right px-3 py-2 flex items-center gap-2 ${canBump && req.status !== 'archived' ? "hover:bg-secondary" : "opacity-50 cursor-not-allowed"}`}
                          onClick={() => {
                            if (!canBump || req.status === 'archived') return;
                            setOpenMenuId(null);
                            onBumpRequest && onBumpRequest(req.id);
                          }}
                        >
                          <RefreshCw size={14} />
                          <span>{canBump ? "تحديث ورفع الطلب" : `متاح بعد ${bumpHoursLeft} س`}</span>
                        </button>
                      </div>
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
                  {req.updatedAt && req.updatedAt !== req.createdAt && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-foreground">
                      <Clock size={12} />
                      محدث بتاريخ {format(new Date(req.updatedAt), "dd MMM", { locale: ar })}
                    </span>
                  )}
                  {req.categories && req.categories.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Briefcase size={14} />
                      {(() => {
                        const catLabel = req.categories[0];
                        const categoryObj = AVAILABLE_CATEGORIES.find(c => c.label === catLabel || c.id === catLabel);
                        return categoryObj?.label || catLabel;
                      })()}
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
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/15 text-primary">
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
                    <span className="text-accent">⏳</span>
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
