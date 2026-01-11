import React, { useEffect, useMemo, useRef, useState } from "react";
import { Offer, Request } from "../types";
import { logger } from "../utils/logger";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  MapPin,
  MessageCircle,
  MoreVertical,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  User,
  X,
} from "lucide-react";
import { FaHandPointUp } from "react-icons/fa";
import { formatTimeAgo } from "../utils/timeFormat";
import { UnifiedFilterIsland } from "./ui/UnifiedFilterIsland";
import { AVAILABLE_CATEGORIES } from "../data";
import { DropdownMenu, DropdownMenuItem } from "./ui/DropdownMenu";

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
  onEditRequest?: (request: Request) => void; // Callback to edit the request
  onOpenChat?: (requestId: string, offer: Offer) => void;
  userId?: string;
  viewedRequestIds?: Set<string>;
  unreadMessagesPerRequest?: Map<string, number>; // عدد الرسائل غير المقروءة لكل طلب
  unreadMessagesPerOffer?: Map<string, number>; // عدد الرسائل غير المقروءة لكل عرض (للعرض المقبول)
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
  // Pull-to-refresh callback
  onRefresh?: () => void | Promise<void>;
  // تتبع الطلبات مع عروض جديدة
  requestsWithNewOffers?: Set<string>;
  onClearNewOfferHighlight?: (requestId: string) => void;
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
  onEditRequest,
  onOpenChat,
  userId,
  viewedRequestIds = new Set(),
  unreadMessagesPerRequest = new Map(),
  unreadMessagesPerOffer = new Map(),
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
  onRefresh,
  requestsWithNewOffers = new Set(),
  onClearNewOfferHighlight,
}) => {
  // Header compression state - for smooth scroll animations
  const [isHeaderCompressed, setIsHeaderCompressed] = useState(false);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLDivElement>(null);

  // Pull-to-refresh state
  const [pullToRefreshState, setPullToRefreshState] = useState<{
    isPulling: boolean;
    pullDistance: number;
    isRefreshing: boolean;
  }>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
  });
  // Flag to prevent click events after pull-to-refresh
  const preventClickAfterPullRef = useRef(false);

  const pullStartY = useRef<number>(0);
  const pullCurrentY = useRef<number>(0);
  const pullDistanceRef = useRef<number>(0);
  const isPullingActiveRef = useRef<boolean>(false);

  // تتبع موقع اللمس للتفريق بين السكرول والضغط
  const cardTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Filter & Sort States
  const [reqFilter, setReqFilter] = useState<RequestFilter>(
    defaultFilter || "active",
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>("createdAt");

  /* useEffect(() => {
    logger.log("📦 MyRequests: Component state updated", {
      requestsCount: requests.length,
      requestIds: requests.map(r => r.id.slice(-4)),
      requestStatuses: requests.map(r => ({ id: r.id.slice(-4), status: r.status, isPublic: r.isPublic })),
      archivedCount: archivedRequests.length,
      receivedOffersMapSize: receivedOffersMap.size,
      receivedOffersMapKeys: Array.from(receivedOffersMap.keys()).map(id => id.slice(-4)),
      reqFilter: reqFilter,
    });

    if (receivedOffersMap.size > 0) {
      logger.log("📦 MyRequests: receivedOffersMap updated", {
        size: receivedOffersMap.size,
        requestIds: Array.from(receivedOffersMap.keys()).map(id => id.slice(-4)),
        totalOffers: Array.from(receivedOffersMap.values()).reduce((sum, arr) => sum + arr.length, 0),
        offersPerRequest: Array.from(receivedOffersMap.entries()).map(([reqId, offers]) => ({
          requestId: reqId.slice(-4),
          offersCount: offers.length,
          offers: offers.map(o => ({ id: o.id.slice(-4), status: o.status, title: o.title })),
        })),
      });
    } else if (requests.length > 0) {
      logger.warn("⚠️ MyRequests: receivedOffersMap is empty but there are requests", {
        requestsCount: requests.length,
        requestIds: requests.map(r => r.id.slice(-4)),
      });
    }

    if (requests.length === 0 && archivedRequests.length === 0) {
      logger.warn("⚠️ MyRequests: NO REQUESTS AT ALL! Both requests and archivedRequests are empty!");
    }
  }, [receivedOffersMap, requests, archivedRequests, reqFilter]); */

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
  const [openFilterDropdownId, setOpenFilterDropdownId] = useState<
    string | null
  >(null);
  const filterDropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // States for dropdown actions
  const [isBumpingMap, setIsBumpingMap] = useState<Map<string, boolean>>(
    new Map(),
  );
  const [isHidingMap, setIsHidingMap] = useState<Map<string, boolean>>(
    new Map(),
  );
  const [isUnhidingMap, setIsUnhidingMap] = useState<Map<string, boolean>>(
    new Map(),
  );
  const [isArchivingMap, setIsArchivingMap] = useState<Map<string, boolean>>(
    new Map(),
  );

  // Handler functions for dropdown actions
  const handleBumpRequest = async (requestId: string) => {
    if (!onBumpRequest) return;
    setIsBumpingMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(requestId, true);
      return newMap;
    });
    try {
      await onBumpRequest(requestId);
    } catch (error) {
      console.error("Failed to bump request:", error);
    } finally {
      setIsBumpingMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(requestId, false);
        return newMap;
      });
    }
  };

  const handleHideRequest = async (requestId: string) => {
    if (!onHideRequest) return;
    setIsHidingMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(requestId, true);
      return newMap;
    });
    try {
      await onHideRequest(requestId);
    } catch (error) {
      console.error("Failed to hide request:", error);
    } finally {
      setIsHidingMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(requestId, false);
        return newMap;
      });
    }
  };

  const handleUnhideRequest = async (requestId: string) => {
    if (!onUnhideRequest) return;
    setIsUnhidingMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(requestId, true);
      return newMap;
    });
    try {
      await onUnhideRequest(requestId);
    } catch (error) {
      console.error("Failed to unhide request:", error);
    } finally {
      setIsUnhidingMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(requestId, false);
        return newMap;
      });
    }
  };

  const handleArchiveRequest = async (requestId: string) => {
    if (!onArchiveRequest) return;
    const confirmDelete = window.confirm(
      "سيتم حذف/أرشفة هذا الطلب. هل أنت متأكد؟",
    );
    if (!confirmDelete) return;
    setIsArchivingMap((prev) => {
      const newMap = new Map(prev);
      newMap.set(requestId, true);
      return newMap;
    });
    try {
      await onArchiveRequest(requestId);
    } catch (error) {
      console.error("Failed to archive request:", error);
    } finally {
      setIsArchivingMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(requestId, false);
        return newMap;
      });
    }
  };

  const handleEditRequest = (request: Request) => {
    if (onEditRequest) {
      onEditRequest(request);
    }
  };

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openFilterDropdownId) {
        const dropdownRef = filterDropdownRefs.current.get(
          openFilterDropdownId,
        );
        if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
          setOpenFilterDropdownId(null);
        }
      }
    };

    if (openFilterDropdownId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openFilterDropdownId]);

  // Prevent body scroll when dropdown is open
  useEffect(() => {
    if (openFilterDropdownId) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [openFilterDropdownId]);

  // Pull-to-refresh handlers
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !onRefresh) return;

    const PULL_THRESHOLD = 60;
    const MAX_PULL = 90;

    const handleTouchStart = (e: TouchEvent) => {
      // Allow pull when scrollTop is very close to 0 (within 5px tolerance)
      if (container.scrollTop > 5) {
        isPullingActiveRef.current = false;
        return;
      }
      isPullingActiveRef.current = true;
      pullStartY.current = e.touches[0].clientY;
      pullCurrentY.current = pullStartY.current;
      pullDistanceRef.current = 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      // If pulling not active, ignore
      if (!isPullingActiveRef.current || pullStartY.current === 0) return;

      // If scrolled away from top, reset
      if (container.scrollTop > 5) {
        isPullingActiveRef.current = false;
        pullDistanceRef.current = 0;
        pullStartY.current = 0;
        setPullToRefreshState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
        });
        return;
      }

      pullCurrentY.current = e.touches[0].clientY;
      const pullDistance = Math.max(
        0,
        pullCurrentY.current - pullStartY.current,
      );

      if (pullDistance > 10) { // Threshold to start pull
        e.preventDefault(); // Prevent default scroll
        const limitedPull = Math.min(pullDistance, MAX_PULL);
        pullDistanceRef.current = limitedPull;
        setPullToRefreshState({
          isPulling: true,
          pullDistance: limitedPull,
          isRefreshing: false,
        });
      }
    };

    const handleTouchEnd = () => {
      // Always reset on touch end, regardless of pulling state
      if (!isPullingActiveRef.current) {
        return;
      }

      const currentPullDistance = pullDistanceRef.current;

      // If there was any pull movement (even if below threshold), prevent click events
      if (currentPullDistance > 10) {
        preventClickAfterPullRef.current = true;
        // Reset flag after a short delay to allow normal clicks again
        setTimeout(() => {
          preventClickAfterPullRef.current = false;
        }, 300);
      }

      if (currentPullDistance >= PULL_THRESHOLD && onRefresh) {
        setPullToRefreshState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: true,
        });

        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(25);
        }

        // Call refresh and wait for completion
        const refreshPromise = onRefresh();
        const minDisplayTime = new Promise((resolve) =>
          setTimeout(resolve, 1200)
        );

        const promiseToUse: Promise<void> =
          refreshPromise && typeof refreshPromise === "object" &&
            refreshPromise !== null && "then" in refreshPromise
            ? refreshPromise as Promise<void>
            : Promise.resolve();
        Promise.all([
          promiseToUse,
          minDisplayTime,
        ]).finally(() => {
          setPullToRefreshState({
            isPulling: false,
            pullDistance: 0,
            isRefreshing: false,
          });
        });
      } else {
        // Reset immediately if threshold not reached
        setPullToRefreshState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
        });
      }

      // Always cleanup
      isPullingActiveRef.current = false;
      pullStartY.current = 0;
      pullCurrentY.current = 0;
      pullDistanceRef.current = 0;
    };

    const handleTouchCancel = () => {
      // Handle touch cancel (e.g., when scrolling is taken over by browser)
      isPullingActiveRef.current = false;
      pullStartY.current = 0;
      pullCurrentY.current = 0;
      pullDistanceRef.current = 0;
      setPullToRefreshState({
        isPulling: false,
        pullDistance: 0,
        isRefreshing: false,
      });
    };

    // Add listeners to container for start/move
    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    // Add end/cancel to document to catch all touch ends
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    document.addEventListener("touchcancel", handleTouchCancel, {
      passive: true,
    });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [onRefresh]);

  // Scroll Listener for header compression - same logic as Marketplace
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollDelta = scrollTop - lastScrollY.current;

      // Reset pull state if user scrolls away from top
      if (scrollTop > 0 && pullToRefreshState.isPulling) {
        setPullToRefreshState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
        });
      }

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

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [pullToRefreshState.isPulling]);

  // Counts
  const counts = useMemo(() => {
    const allReqs = [...requests, ...archivedRequests];
    return {
      all: allReqs.length,
      active: requests.filter((req) =>
        req.status === "active" || (req.status as any) === "draft"
      ).length,
      approved: requests.filter((req) =>
        req.status === "assigned"
      ).length,
      completed: allReqs.filter((req) =>
        req.status === "completed" || req.status === "archived"
      ).length,
    };
  }, [requests, archivedRequests]);

  const filteredRequests = useMemo(() => {
    /* logger.log(`🔍 MyRequests: Filtering requests`, {
      filter: reqFilter,
      requestsCount: requests.length,
      archivedCount: archivedRequests.length,
      requestIds: requests.map(r => r.id.slice(-4)),
      requestStatuses: requests.map(r => ({ id: r.id.slice(-4), status: r.status })),
    }); */

    const allReqs = [...requests, ...archivedRequests];
    let result: Request[] = [];

    if (reqFilter === "all") {
      result = allReqs;
    } else if (reqFilter === "active") {
      result = requests.filter((req) =>
        req.status === "active" || (req.status as any) === "draft"
      );
      /* logger.log(`🔍 Active filter result:`, {
        filteredCount: result.length,
        filteredIds: result.map(r => r.id.slice(-4)),
      }); */
    } else if (reqFilter === "approved") {
      result = requests.filter((req) => req.status === "assigned");
    } else {
      result = allReqs.filter((req) =>
        req.status === "completed" || req.status === "archived"
      );
    }

    // Text search filter
    if (searchTerm) {
      result = result.filter((req) =>
        req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    const sorted = result.sort((a, b) => {
      // 1. الأولوية للطلبات التي وصلتها عروض جديدة
      const aHasNew = requestsWithNewOffers.has(a.id);
      const bHasNew = requestsWithNewOffers.has(b.id);
      if (aHasNew && !bHasNew) return -1;
      if (!aHasNew && bHasNew) return 1;

      // 2. الترتيب المعتاد (تاريخ التحديث أو الإنشاء)
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

    /* logger.log(`✅ MyRequests: Filtered & sorted requests`, {
      filter: reqFilter,
      searchTerm: searchTerm,
      inputCount: allReqs.length,
      afterFilter: result.length,
      afterSort: sorted.length,
      sortedIds: sorted.map((r) => r.id.slice(-4)),
      sortedStatuses: sorted.map((r) => ({
        id: r.id.slice(-4),
        status: r.status,
      })),
    }); */

    return sorted;
  }, [
    requests,
    archivedRequests,
    reqFilter,
    sortOrder,
    searchTerm,
    requestsWithNewOffers,
  ]);

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
        {
          value: "completed",
          label: "طلباتي المكتملة والمؤرشفة",
          count: counts.completed,
        },
      ],
      value: reqFilter,
      onChange: (value: string) => handleFilterChange(value as RequestFilter),
      getLabel: () => {
        switch (reqFilter) {
          case "all":
            return "كل طلباتي";
          case "active":
            return "طلباتي النشطة";
          case "approved":
            return "طلباتي المعتمدة";
          case "completed":
            return "طلباتي المكتملة والمؤرشفة";
        }
      },
      showCount: true,
    },
  ], [reqFilter, counts]);

  const getStatusConfig = (req: Request) => {
    if (req.status === "assigned" || req.status === "completed") {
      return {
        text: "تم اعتماد عرض",
        color: "bg-primary/15 text-primary",
        icon: "✅",
      };
    }
    if (req.status === "archived") {
      return {
        text: "مؤرشف",
        color:
          "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
        icon: "📦",
      };
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
            top: "-50px",
            height: "calc(100% + 100px)",
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
            background:
              "linear-gradient(to bottom, rgba(var(--background-rgb), 0), rgba(var(--background-rgb), 0.6), rgba(var(--background-rgb), 1))",
          }}
        />
        {/* Container for header and filter island - fixed compact size */}
        <div
          className="flex flex-col overflow-visible origin-top"
          style={{
            transform: "scale(0.92) translateY(4px)",
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
                  {isSearchInputOpen || searchTerm
                    ? (
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
                              <span
                                className="inline-block"
                                style={{ paddingLeft: "0.25rem" }}
                              >
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
                    )
                    : (
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
                                if (el) {
                                  filterDropdownRefs.current.set(filter.id, el);
                                }
                              }}
                              className="relative"
                            >
                              <motion.button
                                onClick={() => {
                                  if (navigator.vibrate) navigator.vibrate(10);
                                  setOpenFilterDropdownId(
                                    openFilterDropdownId === filter.id
                                      ? null
                                      : filter.id,
                                  );
                                }}
                                whileTap={{ scale: 0.96 }}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-full transition-all whitespace-nowrap ${
                                  openFilterDropdownId === filter.id
                                    ? "bg-primary/15 text-primary"
                                    : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <span className="text-primary">
                                  {filter.icon}
                                </span>
                                <span className="text-xs font-bold">
                                  {filter.getLabel()}
                                </span>
                                {filter.showCount !== false &&
                                  filter.options.find((o) =>
                                      o.value === filter.value
                                    )?.count !== undefined &&
                                  (
                                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[10px] font-bold bg-primary text-white">
                                      {filter.options.find((o) =>
                                        o.value === filter.value
                                      )?.count}
                                    </span>
                                  )}
                                <motion.div
                                  animate={{
                                    rotate: openFilterDropdownId === filter.id
                                      ? 180
                                      : 0,
                                  }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown
                                    size={12}
                                    className="text-muted-foreground"
                                  />
                                </motion.div>
                              </motion.button>

                              {/* Dropdown Menu */}
                              <AnimatePresence>
                                {openFilterDropdownId === filter.id && (
                                  <>
                                    {/* Backdrop */}
                                    <div
                                      className="fixed inset-0 z-[110] touch-none"
                                      onClick={() =>
                                        setOpenFilterDropdownId(null)}
                                      style={{
                                        touchAction: "none", // منع scroll والسلوك الافتراضي للـ touch events
                                      }}
                                    />
                                    <motion.div
                                      initial={{
                                        opacity: 0,
                                        y: -8,
                                        scale: 0.95,
                                      }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                      transition={{
                                        duration: 0.2,
                                        ease: "easeOut",
                                      }}
                                      className="absolute w-64 bg-card border border-border rounded-2xl shadow-2xl z-[120] overflow-hidden right-0 mt-2"
                                      style={{
                                        maxHeight: "calc(100vh - 120px)",
                                        overflowY: "auto",
                                      }}
                                    >
                                      <div className="p-2 flex flex-col gap-1">
                                        {filter.options.map((option) => (
                                          <motion.button
                                            key={option.value}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                              if (navigator.vibrate) {
                                                navigator.vibrate(10);
                                              }
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
                                              {option.icon && (
                                                <span
                                                  className={filter.value ===
                                                      option.value
                                                    ? "text-primary"
                                                    : "text-muted-foreground"}
                                                >
                                                  {option.icon}
                                                </span>
                                              )}
                                              <span className="font-bold">
                                                {option.label}
                                              </span>
                                            </div>
                                            {option.count !== undefined
                                              ? (
                                                <span
                                                  className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 rounded-full px-2 text-[11px] font-bold ${
                                                    filter.value ===
                                                        option.value
                                                      ? "bg-primary text-white"
                                                      : "bg-secondary text-muted-foreground"
                                                  }`}
                                                >
                                                  {option.count}
                                                </span>
                                              )
                                              : filter.value === option.value
                                              ? (
                                                <CheckCircle
                                                  size={16}
                                                  className="text-primary"
                                                />
                                              )
                                              : null}
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

      {/* Pull-to-Refresh Indicator - بعد الجزيرة مباشرة */}
      <AnimatePresence>
        {(pullToRefreshState.isPulling || pullToRefreshState.isRefreshing) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: pullToRefreshState.isRefreshing
                ? 70
                : Math.min(pullToRefreshState.pullDistance, 90),
              opacity: 1,
            }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-center overflow-hidden z-[70]"
          >
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="flex flex-col items-center py-2"
            >
              <div className="relative w-10 h-10 flex items-center justify-center">
                {/* Background Progress Circle */}
                <svg
                  className="absolute inset-0 w-full h-full transform -rotate-90"
                  viewBox="0 0 40 40"
                >
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="transparent"
                    className="text-primary/10"
                  />
                  {!pullToRefreshState.isRefreshing && (
                    <motion.circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="url(#pull-gradient-myrequests)"
                      strokeWidth="2.5"
                      fill="transparent"
                      strokeDasharray={100.5}
                      strokeDashoffset={100.5 -
                        (Math.min(pullToRefreshState.pullDistance / 60, 1) *
                          100.5)}
                      strokeLinecap="round"
                      className="opacity-60"
                    />
                  )}
                  <defs>
                    <linearGradient
                      id="pull-gradient-myrequests"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#1E968C" />
                      <stop offset="100%" stopColor="#153659" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Icon Container */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {pullToRefreshState.isRefreshing
                      ? (
                        <motion.div
                          key="refreshing-icon"
                          initial={{ opacity: 0, rotate: 0 }}
                          animate={{ opacity: 1, rotate: 360 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            rotate: {
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            },
                            opacity: { duration: 0.2 },
                          }}
                          className="text-primary"
                        >
                          <Loader2 size={20} strokeWidth={2.5} />
                        </motion.div>
                      )
                      : (
                        <motion.div
                          key="pulling-icon"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{
                            opacity: 1,
                            scale: pullToRefreshState.pullDistance >= 60
                              ? 1.1
                              : 1,
                            rotate: (pullToRefreshState.pullDistance / 60) *
                              180,
                          }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 25,
                          }}
                          className={pullToRefreshState.pullDistance >= 60
                            ? "text-primary"
                            : "text-primary/50"}
                        >
                          <RotateCw size={16} strokeWidth={2.5} />
                        </motion.div>
                      )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="px-4 pb-24">
        <div
          key={reqFilter}
          className="grid grid-cols-1 gap-6 min-h-[100px] pt-2"
        >
          {filteredRequests.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center min-h-[50vh]">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
                {reqFilter === "all"
                  ? <FileText className="text-muted-foreground" size={24} />
                  : <Search className="text-muted-foreground" size={24} />}
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
            // جلب العروض من receivedOffersMap
            // محاولة البحث باستخدام ID الكامل أولاً
            let allRequestOffers = receivedOffersMap.get(req.id) || [];

            // إذا لم توجد عروض، نحاول البحث بطريقة أخرى (للتحقق من تطابق IDs)
            if (allRequestOffers.length === 0 && receivedOffersMap.size > 0) {
              // البحث في جميع المفاتيح للتحقق من تطابق IDs
              const matchingKey = Array.from(receivedOffersMap.keys()).find(
                (key) => {
                  // مقارنة دقيقة للأرقام الأخيرة فقط للتأكد
                  const reqIdSuffix = req.id.slice(-8); // آخر 8 أرقام
                  const keySuffix = key.slice(-8);
                  return reqIdSuffix === keySuffix;
                },
              );

              if (matchingKey) {
                logger.warn(
                  `⚠️ Request ID mismatch detected! Using matching key instead`,
                  {
                    requestId: req.id,
                    requestIdSuffix: req.id.slice(-8),
                    matchingKey: matchingKey,
                    matchingKeySuffix: matchingKey.slice(-8),
                  },
                );
                allRequestOffers = receivedOffersMap.get(matchingKey) || [];
              }
            }

            // Debug: Log دائماً للتحقق من العروض
            if (receivedOffersMap.size > 0 || allRequestOffers.length > 0) {
              logger.log(
                `🔍 MyRequests: Checking offers for request ${
                  req.id.slice(-4)
                }`,
                {
                  requestId: req.id,
                  requestIdShort: req.id.slice(-4),
                  mapSize: receivedOffersMap.size,
                  mapKeys: Array.from(receivedOffersMap.keys()).map((id) =>
                    id.slice(-4)
                  ),
                  offersInMap: allRequestOffers.length,
                  offersDetails: allRequestOffers.map((o) => ({
                    id: o.id.slice(-4),
                    status: o.status,
                    title: o.title,
                    requestId: o.requestId?.slice(-4),
                  })),
                },
              );
            }

            // استثناء العروض المؤرشفة
            const requestOffers = allRequestOffers.filter(
              (o) => o.status !== "archived",
            );

            // Log النتيجة النهائية
            if (requestOffers.length > 0) {
              logger.log(
                `✅ Request ${
                  req.id.slice(-4)
                } WILL DISPLAY ${requestOffers.length} offers`,
                {
                  offers: requestOffers.map((o) => ({
                    id: o.id.slice(-4),
                    status: o.status,
                    title: o.title,
                  })),
                  willRender: true,
                },
              );
            } else if (allRequestOffers.length > 0) {
              logger.warn(
                `⚠️ Request ${
                  req.id.slice(-4)
                } has ${allRequestOffers.length} offers but all are archived!`,
                {
                  allOffers: allRequestOffers.map((o) => ({
                    id: o.id.slice(-4),
                    status: o.status,
                  })),
                },
              );
            } else if (receivedOffersMap.size > 0) {
              logger.warn(
                `⚠️ Request ${
                  req.id.slice(-4)
                } has NO offers in receivedOffersMap`,
                {
                  requestId: req.id,
                  mapKeys: Array.from(receivedOffersMap.keys()),
                  mapKeysShort: Array.from(receivedOffersMap.keys()).map((id) =>
                    id.slice(-4)
                  ),
                  mapSize: receivedOffersMap.size,
                },
              );
            }
            const acceptedOffer = requestOffers.find((o) =>
              o.status === "accepted"
            );
            const pendingOffers = requestOffers.filter((o) =>
              o.status === "pending" || o.status === "negotiating"
            );
            const requestNumber = req.requestNumber ||
              req.id.slice(-4).toUpperCase();
            const statusConfig = getStatusConfig(req);
            const isHidden = req.isPublic === false;
            // Helper to calculate available after time (5 hours cooldown for bump)
            const calculateAvailableAfter = (
              updatedAt?: Date | string,
            ): number | null => {
              if (!updatedAt) return null;
              const lastUpdated = typeof updatedAt === "string"
                ? new Date(updatedAt)
                : updatedAt;
              const fiveHoursMs = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
              const elapsedSinceUpdate = Date.now() - lastUpdated.getTime();
              const remainingMs = fiveHoursMs - elapsedSinceUpdate;

              if (remainingMs > 0) {
                const remainingHours = Math.ceil(
                  remainingMs / (60 * 60 * 1000),
                );
                return remainingHours;
              }
              return null;
            };

            const availableAfterHours = calculateAvailableAfter(
              req.updatedAt || req.createdAt,
            );
            const canBump = availableAfterHours === null;
            const unreadCount = unreadMessagesPerRequest?.get(req.id) || 0;
            const hasNewOffer = requestsWithNewOffers.has(req.id);

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min(index * 0.05, 0.4),
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`bg-card border-border rounded-2xl p-4 pt-5 transition-all cursor-pointer relative shadow-sm group text-right ${
                  hasNewOffer
                    ? "ring-2 ring-primary/40 bg-primary/5 border-primary/20 shadow-md"
                    : "border"
                }`}
                onClick={(e) => {
                  // Prevent click if pull-to-refresh was active
                  if (preventClickAfterPullRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  // Don't handle click if clicking on dropdown menu
                  const target = e.target as HTMLElement;
                  if (target.closest("[data-dropdown-menu]")) {
                    return; // Let dropdown handle its own events
                  }

                  e.preventDefault();
                  e.stopPropagation();
                  if (hasNewOffer && onClearNewOfferHighlight) {
                    onClearNewOfferHighlight(req.id);
                  }
                  onSelectRequest(req);
                }}
                onTouchStart={(e) => {
                  // Don't prevent if clicking on dropdown menu
                  const target = e.target as HTMLElement;
                  if (target.closest("[data-dropdown-menu]")) {
                    return;
                  }
                  // حفظ موقع اللمس للتفريق بين السكرول والضغط
                  cardTouchStartRef.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                  };
                }}
                onTouchEnd={(e) => {
                  // Prevent click if pull-to-refresh was active
                  if (preventClickAfterPullRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    cardTouchStartRef.current = null;
                    return;
                  }

                  // Don't prevent if clicking on dropdown menu
                  const target = e.target as HTMLElement;
                  if (target.closest("[data-dropdown-menu]")) {
                    cardTouchStartRef.current = null;
                    return;
                  }

                  // التحقق من أن هذا ضغط وليس سكرول (الفرق أقل من 15 بكسل)
                  if (cardTouchStartRef.current && e.changedTouches[0]) {
                    const deltaX = Math.abs(
                      e.changedTouches[0].clientX - cardTouchStartRef.current.x,
                    );
                    const deltaY = Math.abs(
                      e.changedTouches[0].clientY - cardTouchStartRef.current.y,
                    );
                    if (deltaX > 15 || deltaY > 15) {
                      // هذا سكرول - لا نفتح التفاصيل
                      cardTouchStartRef.current = null;
                      return;
                    }
                  }
                  cardTouchStartRef.current = null;

                  e.preventDefault();
                  e.stopPropagation();
                  if (hasNewOffer && onClearNewOfferHighlight) {
                    onClearNewOfferHighlight(req.id);
                  }
                  // Force state update to ensure request opens
                  setTimeout(() => {
                    onSelectRequest(req);
                  }, 0);
                }}
              >
                {/* Floating Label */}
                <div className="absolute -top-3 right-4 flex items-center gap-1.5">
                  <span className="bg-card px-2 py-0.5 text-[11px] font-bold text-primary flex items-center gap-1 rounded-full border border-border">
                    <span className={statusConfig.color.split(" ")[1]}>
                      {statusConfig.icon}
                    </span>
                    {statusConfig.text}
                  </span>
                </div>

                {/* Badge for new offers */}
                {hasNewOffer && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center gap-1 shadow-lg ring-2 ring-background"
                  >
                    عرض جديد! 🎉
                  </motion.div>
                )}

                {/* Title & Status */}
                <div className="flex items-start justify-between mb-2">
                  <span className="font-bold text-sm truncate text-primary max-w-[70%]">
                    {req.title}
                  </span>
                  <div className="flex items-center gap-1.5 relative">
                    {isHidden && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        مخفي
                      </span>
                    )}
                    <div className="relative" data-dropdown-menu>
                      {(() => {
                        const isBumping = isBumpingMap.get(req.id) || false;
                        const isHiding = isHidingMap.get(req.id) || false;
                        const isUnhiding = isUnhidingMap.get(req.id) || false;
                        const isArchiving = isArchivingMap.get(req.id) || false;

                        const dropdownItems: DropdownMenuItem[] = [
                          {
                            id: "refresh",
                            label: isBumping
                              ? "جاري التحديث..."
                              : canBump
                              ? "تحديث الطلب"
                              : `متاح بعد ${availableAfterHours} س`,
                            icon: (
                              <RefreshCw
                                size={16}
                                className={isBumping ? "animate-spin" : ""}
                              />
                            ),
                            onClick: () => {
                              if (
                                canBump && !isBumping &&
                                req.status !== "archived"
                              ) {
                                handleBumpRequest(req.id);
                              }
                            },
                            disabled: isBumping || !canBump ||
                              req.status === "archived",
                            keepOpenOnClick: !canBump, // Keep open if disabled (showing "متاح بعد")
                          },
                          {
                            id: "edit",
                            label: "تعديل الطلب",
                            icon: <Edit size={16} />,
                            onClick: () => handleEditRequest(req),
                          },
                          {
                            id: req.isPublic === false ? "unhide" : "hide",
                            label: req.isPublic === false
                              ? (isUnhiding ? "جاري الإظهار..." : "إظهار الطلب")
                              : (isHiding ? "جاري الإخفاء..." : "إخفاء الطلب"),
                            icon: req.isPublic === false
                              ? <Eye size={16} />
                              : <EyeOff size={16} />,
                            onClick: req.isPublic === false
                              ? () => handleUnhideRequest(req.id)
                              : () => handleHideRequest(req.id),
                            disabled: isHiding || isUnhiding,
                          },
                          {
                            id: "archive",
                            label: isArchiving
                              ? "جاري الأرشفة..."
                              : "أرشفة الطلب",
                            icon: <Archive size={16} />,
                            onClick: () => handleArchiveRequest(req.id),
                            variant: "danger",
                            disabled: isArchiving,
                            showDivider: true,
                          },
                        ];

                        return (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            onTouchEnd={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                          >
                            <DropdownMenu
                              trigger={
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (navigator.vibrate) {
                                      navigator.vibrate(10);
                                    }
                                  }}
                                  onTouchStart={(e) => {
                                    e.stopPropagation();
                                  }}
                                  onTouchEnd={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className="p-1 rounded transition-colors hover:bg-secondary/80 text-muted-foreground hover:text-foreground relative z-[100]"
                                  style={{
                                    pointerEvents: "auto",
                                    touchAction: "manipulation",
                                  }}
                                  title="خيارات الطلب"
                                  type="button"
                                >
                                  <MoreVertical size={16} />
                                </button>
                              }
                              items={dropdownItems}
                              align="left"
                            />
                          </div>
                        );
                      })()}
                    </div>
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
                  {/* Show single date: "منشور منذ X" if not updated, or "محدّث منذ X" if updated */}
                  {(() => {
                    const isUpdated = req.updatedAt &&
                      new Date(req.updatedAt).getTime() !==
                        new Date(req.createdAt).getTime();
                    const dateToShow = isUpdated
                      ? req.updatedAt
                      : req.createdAt;

                    if (!dateToShow) return null;

                    return (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-foreground">
                        {isUpdated
                          ? <RefreshCw size={12} />
                          : <Calendar size={12} />}
                        {isUpdated ? "محدّث " : "منشور "}
                        {formatTimeAgo(new Date(dateToShow), true)}
                      </span>
                    );
                  })()}
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
                        : `من ${req.budgetMin} ر.س`}
                    </span>
                  </div>
                )}

                {/* Offers Summary Box - Always show if there are offers */}
                {requestOffers.length > 0
                  ? (
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
                            <span className="text-muted-foreground">
                              العرض المعتمد:
                            </span>
                            <span className="font-bold text-primary">
                              {acceptedOffer.price} ر.س
                            </span>
                          </div>
                          {acceptedOffer.providerName && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <User size={12} />
                              <span>{acceptedOffer.providerName}</span>
                            </div>
                          )}
                          {onOpenChat &&
                            (req.contactMethod === "chat" ||
                              req.contactMethod === "both" ||
                              !req.contactMethod) &&
                            (
                              <div className="flex items-center gap-1.5 mt-2 justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenChat(req.id, acceptedOffer);
                                  }}
                                  className="relative flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground transition-all shadow-sm"
                                  title="فتح المحادثة"
                                >
                                  <MessageCircle size={12} />
                                  محادثة
                                  {/* Badge للرسائل غير المقروءة للعرض المقبول */}
                                  {acceptedOffer?.id &&
                                    unreadMessagesPerOffer?.has(
                                      acceptedOffer.id,
                                    ) &&
                                    (unreadMessagesPerOffer.get(
                                        acceptedOffer.id,
                                      ) || 0) > 0 &&
                                    (
                                      <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md"
                                      >
                                        {unreadMessagesPerOffer.get(
                                            acceptedOffer.id,
                                          )! > 99
                                          ? "99+"
                                          : unreadMessagesPerOffer.get(
                                            acceptedOffer.id,
                                          )}
                                      </motion.span>
                                    )}
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
                              {Math.min(...pendingOffers.map((o) =>
                                parseFloat(o.price) || 0
                              ))} ر.س
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                  : null}

                {requestOffers.length === 0 && req.status === "active" && (
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
