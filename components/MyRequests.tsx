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
  X,
  ChevronDown,
  CheckCircle,
} from "lucide-react";
import { FaHandPointUp } from "react-icons/fa";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { UnifiedFilterIsland } from "./ui/UnifiedFilterIsland";
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
  // External filter control
  defaultFilter?: RequestFilter;
  onFilterChange?: (filter: RequestFilter) => void;
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
  defaultFilter,
  onFilterChange,
}) => {
  // Header compression state - for smooth scroll animations
  const [isHeaderCompressed, setIsHeaderCompressed] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Filter & Sort States
  const [reqFilter, setReqFilter] = useState<RequestFilter>(defaultFilter || "active");
  const [sortOrder, setSortOrder] = useState<SortOrder>("createdAt");
  
  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchInputOpen, setIsSearchInputOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // تحديث الفلتر عند تغييره من الخارج
  useEffect(() => {
    if (defaultFilter !== undefined && defaultFilter !== reqFilter) {
      setReqFilter(defaultFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultFilter]);
  
  // إشعار الوالد عند تغيير الفلتر
  const handleFilterChange = (newFilter: RequestFilter) => {
    setReqFilter(newFilter);
    onFilterChange?.(newFilter);
  };
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openFilterDropdownId, setOpenFilterDropdownId] = useState<string | null>(null);
  const filterDropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openFilterDropdownId) {
        const dropdownRef = filterDropdownRefs.current.get(openFilterDropdownId);
        if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
          setOpenFilterDropdownId(null);
        }
      }
    };
    
    if (openFilterDropdownId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openFilterDropdownId]);

  // Prevent body scroll when dropdown is open
  useEffect(() => {
    if (openFilterDropdownId) {
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
  }, [openFilterDropdownId]);

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

    // Text search filter
    if (searchTerm) {
      result = result.filter(req => 
        req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
  }, [requests, archivedRequests, reqFilter, sortOrder, searchTerm]);

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
      onChange: (value: string) => handleFilterChange(value as RequestFilter),
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
          {/* Unified Filter Island with Search - inside scaled container */}
          <div className="px-4 pt-4 bg-transparent relative z-10">
            <UnifiedFilterIsland 
              isActive={isActive}
              isSearchOpen={isSearchInputOpen || !!searchTerm}
            >
              {/* Center Content - Filter Dropdown or Search Input */}
              <div className="flex-1 flex items-center relative min-w-0 overflow-visible">
                <AnimatePresence mode="popLayout">
                  {isSearchInputOpen || searchTerm ? (
                    /* Search Input Mode */
                    <motion.div
                      key="search-input"
                      initial={{ x: 100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 100, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                      className="flex items-center gap-1.5 flex-1 px-2 min-w-0 overflow-hidden relative"
                      dir="rtl"
                    >
                      {/* Animated Placeholder */}
                      {!searchTerm && (
                        <div className="absolute inset-0 flex items-center pointer-events-none pl-20 pr-2 overflow-hidden rtl">
                          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1 w-full">
                            <span className="shrink-0">ابحث في</span>
                            <span className="inline-block" style={{ paddingLeft: '0.25rem' }}>
                              طلباتك...
                            </span>
                          </span>
                        </div>
                      )}
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder=""
                        dir="rtl"
                        className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-foreground py-2 text-right min-w-0 relative z-10 pl-20"
                        autoFocus
                        onBlur={() => {
                          setTimeout(() => {
                            if (!searchTerm) {
                              setIsSearchInputOpen(false);
                            }
                          }, 150);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setSearchTerm("");
                            setIsSearchInputOpen(false);
                          }
                        }}
                      />
                      {searchTerm && (
                        <motion.button
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          onClick={() => {
                            setSearchTerm("");
                            searchInputRef.current?.focus();
                          }}
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors shrink-0"
                        >
                          <X size={14} strokeWidth={2.5} />
                        </motion.button>
                      )}
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.15 }}
                        onClick={() => {
                          setSearchTerm("");
                          setIsSearchInputOpen(false);
                        }}
                        className="text-[11px] font-medium text-primary/70 hover:text-primary px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors shrink-0"
                      >
                        إلغاء
                      </motion.button>
                    </motion.div>
                  ) : (
                    /* Filter Dropdown Mode */
                    <motion.div
                      key="filter-dropdown"
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 40, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                      className="flex items-center justify-center flex-1 relative min-w-0 gap-1.5"
                    >
                      {filterConfigs.map((filter, idx) => (
                        <React.Fragment key={filter.id}>
                          {idx > 0 && (
                            <div className="w-px h-6 bg-border/50" />
                          )}
                          <div
                            ref={(el) => {
                              if (el) filterDropdownRefs.current.set(filter.id, el);
                            }}
                            className="relative"
                          >
                            <motion.button
                              onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                setOpenFilterDropdownId(openFilterDropdownId === filter.id ? null : filter.id);
                              }}
                              whileTap={{ scale: 0.96 }}
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-full transition-all whitespace-nowrap ${
                                openFilterDropdownId === filter.id
                                  ? "bg-primary/15 text-primary"
                                  : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span className="text-primary">{filter.icon}</span>
                              <span className="text-xs font-bold">
                                {filter.getLabel()}
                              </span>
                              {filter.showCount !== false && filter.options.find(o => o.value === filter.value)?.count !== undefined && (
                                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[10px] font-bold bg-primary text-white">
                                  {filter.options.find(o => o.value === filter.value)?.count}
                                </span>
                              )}
                              <motion.div
                                animate={{ rotate: openFilterDropdownId === filter.id ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronDown size={12} className="text-muted-foreground" />
                              </motion.div>
                            </motion.button>
                          
                            {/* Dropdown Menu */}
                            <AnimatePresence>
                              {openFilterDropdownId === filter.id && (
                                <>
                                  {/* Backdrop */}
                                  <div
                                    className="fixed inset-0 z-40 touch-none"
                                    onClick={() => setOpenFilterDropdownId(null)}
                                    onWheel={(e) => e.preventDefault()}
                                    onTouchMove={(e) => e.preventDefault()}
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="absolute w-64 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden right-0 mt-2"
                                    style={{
                                      maxHeight: 'calc(100vh - 120px)',
                                      overflowY: 'auto',
                                    }}
                                  >
                                    <div className="p-2 flex flex-col gap-1">
                                      {filter.options.map((option) => (
                                        <motion.button
                                          key={option.value}
                                          whileTap={{ scale: 0.98 }}
                                          onClick={() => {
                                            if (navigator.vibrate) navigator.vibrate(10);
                                            filter.onChange(option.value);
                                            setOpenFilterDropdownId(null);
                                          }}
                                          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                            filter.value === option.value 
                                              ? "bg-primary/15 text-primary border border-primary/20" 
                                              : "text-foreground hover:bg-secondary/80 border border-transparent"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5 text-right">
                                            {option.icon && <span className={filter.value === option.value ? "text-primary" : "text-muted-foreground"}>{option.icon}</span>}
                                            <span className="font-bold">{option.label}</span>
                                          </div>
                                          {option.count !== undefined ? (
                                            <span
                                              className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 rounded-full px-2 text-[11px] font-bold ${
                                                filter.value === option.value
                                                  ? "bg-primary text-white"
                                                  : "bg-secondary text-muted-foreground"
                                              }`}
                                            >
                                              {option.count}
                                            </span>
                                          ) : filter.value === option.value ? (
                                            <CheckCircle size={16} className="text-primary" />
                                          ) : null}
                                        </motion.button>
                                      ))}
                                    </div>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        </React.Fragment>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Search Button - Moves from right to left when clicked */}
              <button
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(10);
                  if (!isSearchInputOpen && !searchTerm) {
                    setIsSearchInputOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }
                }}
                className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-colors shrink-0 bg-transparent active:scale-95 ${
                  isSearchInputOpen || searchTerm
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Search size={15} strokeWidth={2.5} />
              </button>
            </UnifiedFilterIsland>
          </div>
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
