import React, { useEffect, useMemo, useRef, useState } from "react";
import { Offer, Request } from "../types";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Archive,
  ArrowUpDown,
  Briefcase,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Edit,
  Loader2,
  MapPin,
  MessageCircle,
  MoreVertical,
  RotateCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { UnifiedFilterIsland } from "./ui/UnifiedFilterIsland";
import { Button } from "./ui/Button";

type OfferFilter = "all" | "accepted" | "pending" | "completed";
type SortOrder = "updatedAt" | "createdAt";

interface MyOffersProps {
  offers: Offer[];
  allRequests: Request[];
  onSelectRequest: (req: Request) => void;
  onSelectOffer?: (offer: Offer) => void;
  onArchiveOffer?: (offerId: string) => Promise<boolean> | void;
  onOpenWhatsApp?: (phoneNumber: string, offer: Offer) => void;
  onOpenChat?: (requestId: string, offer: Offer) => void;
  userId?: string;
  viewedRequestIds?: Set<string>;
  unreadMessagesPerOffer?: Map<string, number>; // عدد الرسائل غير المقروءة لكل عرض
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
  // Pull-to-refresh callback
  onRefresh?: () => void | Promise<void>;
}

export const MyOffers: React.FC<MyOffersProps> = ({
  offers,
  allRequests,
  onSelectRequest,
  onSelectOffer,
  onArchiveOffer,
  onOpenWhatsApp,
  onOpenChat,
  userId,
  viewedRequestIds = new Set(),
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
  onRefresh,
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
  const [offerFilter, setOfferFilter] = useState<OfferFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("createdAt");
  const [hideRejected, setHideRejected] = useState(true);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchInputOpen, setIsSearchInputOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [openFilterDropdownId, setOpenFilterDropdownId] = useState<
    string | null
  >(null);
  const filterDropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Delete confirmation modal state
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  const [isDeletingOffer, setIsDeletingOffer] = useState(false);
  const modalBackdropTouchStartRef = useRef<boolean>(false);
  const modalOpenTimeRef = useRef<number>(0); // لتتبع وقت فتح المودال

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
    return {
      all: offers.length,
      pending: offers.filter((offer) =>
        offer.status === "pending" || offer.status === "negotiating"
      ).length,
      accepted: offers.filter((offer) =>
        offer.status === "accepted"
      ).length,
      // المكتملة: العروض المقبولة التي تم إكمال الطلب عليها (completed)
      // المنتهية: العروض المرفوضة لأن صاحب الطلب قبل عرض آخر (rejected)
      completed: offers.filter((offer) =>
        offer.status === "completed" ||
        offer.status === "rejected"
      ).length,
    };
  }, [offers]);

  // Filtered & Sorted Offers
  const filteredOffers = useMemo(() => {
    let result: Offer[] = [];

    if (offerFilter === "all") {
      result = offers;
      if (hideRejected) {
        result = result.filter((offer) => offer.status !== "rejected");
      }
    } else if (offerFilter === "pending") {
      result = offers.filter((offer) =>
        offer.status === "pending" || offer.status === "negotiating"
      );
    } else if (offerFilter === "accepted") {
      result = offers.filter((offer) => offer.status === "accepted");
    } else if (offerFilter === "completed") {
      // المكتملة: العروض المقبولة التي تم إكمال الطلب عليها (completed)
      // المنتهية: العروض المرفوضة لأن صاحب الطلب قبل عرض آخر (rejected)
      result = offers.filter((offer) =>
        offer.status === "completed" ||
        offer.status === "rejected"
      );
    }

    // Text search filter
    if (searchTerm) {
      result = result.filter((offer) =>
        offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        offer.description?.toLowerCase().includes(searchTerm.toLowerCase())
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
  }, [offers, offerFilter, sortOrder, hideRejected, searchTerm]);

  // Filter configurations for FloatingFilterIsland
  const filterConfigs = useMemo(() => [
    // Removed sortOrder filter - hiding "تاريخ التقديم" and "تاريخ الإنشاء" options
    {
      id: "offerFilter",
      icon: <Briefcase size={14} />,
      options: [
        { value: "all", label: "كل عروضي", count: counts.all },
        { value: "pending", label: "عروضي قيد الانتظار", count: counts.pending },
        { value: "accepted", label: "عروضي المقبولة", count: counts.accepted },
        {
          value: "completed",
          label: "عروضي المكتملة والمنتهية",
          count: counts.completed,
        },
      ],
      value: offerFilter,
      onChange: (value: string) => setOfferFilter(value as OfferFilter),
      getLabel: () => {
        switch (offerFilter) {
          case "all":
            return "كل عروضي";
          case "pending":
            return "عروضي قيد الانتظار";
          case "accepted":
            return "عروضي المقبولة";
          case "completed":
            return "عروضي المكتملة والمنتهية";
        }
      },
      showCount: true,
    },
  ], [offerFilter, counts]);

  const getContactStatus = (offer: Offer) => {
    if (offer.status === "accepted") {
      return {
        text: "عرضك مقبول، ابدأ التواصل",
        color: "bg-primary/15 text-primary",
        icon: "✅",
      };
    } else if (offer.status === "negotiating") {
      return {
        text: "صاحب الطلب بدأ التفاوض معك",
        color: "bg-primary/15 text-primary",
        icon: "💬",
      };
    }
    if (offer.isNegotiable) {
      return {
        text: "انتظر قبول الطلب أو بدء التفاوض",
        color:
          "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400",
        icon: "⏳",
      };
    }
    return {
      text: "انتظر قبول الطلب",
      color: "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400",
      icon: "⏳",
    };
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
                                عروضك...
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
                                      onWheel={(e) => e.preventDefault()}
                                      onTouchMove={(e) => e.preventDefault()}
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
                      stroke="url(#pull-gradient-myoffers)"
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
                      id="pull-gradient-myoffers"
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
          key={offerFilter}
          className="grid grid-cols-1 gap-6 min-h-[100px] pt-2"
        >
          <AnimatePresence mode="popLayout">
            {filteredOffers.length === 0 && (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center py-20 text-center min-h-[50vh]"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
                  {offerFilter === "all"
                    ? <Briefcase className="text-muted-foreground" size={24} />
                    : <Search className="text-muted-foreground" size={24} />}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {offerFilter === "all"
                    ? "لا توجد عروض"
                    : offerFilter === "pending"
                    ? "لا توجد عروض قيد الانتظار"
                    : offerFilter === "accepted"
                    ? "لا توجد عروض مقبولة"
                    : "لا توجد عروض مكتملة"}
                </h3>
                <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  {offerFilter === "all"
                    ? "لم تقم بتقديم أي عروض بعد. تصفح الطلبات المتاحة وقدم عروضك للعملاء."
                    : offerFilter === "pending"
                    ? "لا توجد عروض قيد الانتظار حالياً. العروض التي تنتظر قبول صاحب الطلب ستظهر هنا."
                    : offerFilter === "accepted"
                    ? "لا توجد عروض مقبولة بعد. عندما يقبل عميل أحد عروضك، سيظهر هنا ويمكنك البدء بالتواصل."
                    : "لا توجد عروض مكتملة أو مؤرشفة. العروض المكتملة أو المؤرشفة ستظهر هنا."}
                </p>
              </motion.div>
            )}
            {filteredOffers.map((offer, index) => {
              const relatedReq = allRequests.find((r) =>
                r.id === offer.requestId
              );
              const contactStatus = getContactStatus(offer);
              const requestNumber = relatedReq?.requestNumber ||
                relatedReq?.id?.slice(-4).toUpperCase() || "";
              const shouldShowName = offer.status === "accepted" &&
                relatedReq?.showAuthorName !== false && relatedReq?.authorName;
              const unreadCount = unreadMessagesPerOffer?.get(offer.id) || 0;

              return (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  onClick={(e) => {
                    // Prevent click if pull-to-refresh was active
                    if (preventClickAfterPullRef.current) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    // Don't handle click if clicking on delete button or inside delete button
                    const target = e.target as HTMLElement;
                    const deleteButton = target.closest(
                      'button[title="حذف العرض"]',
                    );
                    if (
                      deleteButton ||
                      target.closest("svg")?.parentElement?.getAttribute(
                          "title",
                        ) === "حذف العرض"
                    ) {
                      e.stopPropagation();
                      return; // Let delete button handle its own events
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    if (onSelectOffer) {
                      onSelectOffer(offer);
                    } else if (relatedReq) {
                      onSelectRequest(relatedReq);
                    }
                  }}
                  onTouchStart={(e) => {
                    // Don't prevent propagation if clicking on delete button
                    const target = e.target as HTMLElement;
                    const deleteButton = target.closest(
                      'button[title="حذف العرض"]',
                    );
                    if (
                      deleteButton ||
                      target.closest("svg")?.parentElement?.getAttribute(
                          "title",
                        ) === "حذف العرض"
                    ) {
                      return; // Let delete button handle its own events
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
                    // Don't prevent if clicking on delete button
                    const target = e.target as HTMLElement;
                    const deleteButton = target.closest(
                      'button[title="حذف العرض"]',
                    );
                    if (
                      deleteButton ||
                      target.closest("svg")?.parentElement?.getAttribute(
                          "title",
                        ) === "حذف العرض"
                    ) {
                      cardTouchStartRef.current = null;
                      return; // Let delete button handle its own events
                    }

                    // التحقق من أن هذا ضغط وليس سكرول (الفرق أقل من 15 بكسل)
                    if (cardTouchStartRef.current && e.changedTouches[0]) {
                      const deltaX = Math.abs(
                        e.changedTouches[0].clientX -
                          cardTouchStartRef.current.x,
                      );
                      const deltaY = Math.abs(
                        e.changedTouches[0].clientY -
                          cardTouchStartRef.current.y,
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
                    // Force state update to ensure request/offer opens
                    setTimeout(() => {
                      if (onSelectOffer) {
                        onSelectOffer(offer);
                      } else if (relatedReq) {
                        onSelectRequest(relatedReq);
                      }
                    }, 0);
                  }}
                  className="bg-card border border-border rounded-2xl p-4 pt-5 transition-colors cursor-pointer relative shadow-sm group text-right"
                >
                  <span className="absolute -top-3 right-4 bg-card px-2 py-0.5 text-[11px] font-bold text-primary rounded-full border border-border">
                    عرضي
                  </span>

                  {/* Badge for unread messages */}
                  {unreadCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 left-3 z-20 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg border-2 border-white dark:border-card"
                      title={`${unreadCount} رسالة غير مقروءة`}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </motion.div>
                  )}

                  <div className="flex items-start justify-between mb-2">
                    <span className="font-bold text-base truncate text-primary max-w-[70%]">
                      {offer.title}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          offer.status === "pending" ||
                            offer.status === "negotiating"
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            : offer.status === "accepted"
                            ? "bg-primary/15 text-primary"
                            : offer.status === "completed"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : offer.status === "rejected" ||
                                offer.status === "cancelled"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        }`}
                      >
                        {offer.status === "pending" ||
                            offer.status === "negotiating"
                          ? "قيد الانتظار"
                          : offer.status === "accepted"
                          ? "مقبول"
                          : offer.status === "completed"
                          ? "مكتمل"
                          : offer.status === "rejected" ||
                              offer.status === "cancelled"
                          ? "منتهي"
                          : "قيد الانتظار"}
                      </span>
                      {(() => {
                        const showDeleteButton = onArchiveOffer &&
                          offer.status !== "rejected" &&
                          offer.status !== "cancelled" &&
                          offer.status !== "completed";
                        return showDeleteButton;
                      })() && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (navigator.vibrate) navigator.vibrate(10);
                            modalOpenTimeRef.current = Date.now();
                            setOfferToDelete(offer.id);
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            // لا نفتح المودال هنا - ننتظر onTouchEnd لتجنب التضارب
                          }}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (navigator.vibrate) navigator.vibrate(10);
                            modalOpenTimeRef.current = Date.now();
                            setOfferToDelete(offer.id);
                          }}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30 rounded-lg transition-colors text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 relative z-[100] cursor-pointer"
                          style={{
                            pointerEvents: "auto",
                            touchAction: "manipulation",
                          }}
                          title="حذف العرض"
                          type="button"
                        >
                          <Trash2 size={14} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </div>

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

                  <div className="flex items-center gap-2 text-sm mb-2 flex-wrap">
                    <span className="text-muted-foreground">سعر عرضي:</span>
                    <span className="font-bold text-foreground">
                      {offer.price} ر.س
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                        offer.isNegotiable
                          ? "bg-primary/10 text-primary"
                          : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {offer.isNegotiable ? "قابل للتفاوض" : "غير قابل للتفاوض"}
                    </span>
                  </div>

                  {relatedReq && (
                    <div className="mt-5 p-2.5 pt-3 rounded-lg bg-secondary/50 border border-border/50 space-y-1.5 relative">
                      <span className="absolute -top-2.5 right-3 bg-card px-2 text-[11px] font-bold text-muted-foreground">
                        {shouldShowName
                          ? `طلب رقم (${requestNumber}) من ${relatedReq.authorName}`
                          : `طلب (${requestNumber})`}
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
                      <div className="flex items-center justify-between gap-1.5 pt-1">
                        {offer.status === "pending" && (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-muted-foreground">
                              التواصل:
                            </span>
                            <span
                              className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${contactStatus.color}`}
                            >
                              {contactStatus.icon} {contactStatus.text}
                            </span>
                          </div>
                        )}
                        {(offer.status === "accepted" ||
                          offer.status === "negotiating") && (
                          <div className="flex items-center gap-1.5 w-full justify-end">
                            {(relatedReq.isCreatedViaWhatsApp ||
                              relatedReq.contactMethod === "whatsapp" ||
                              relatedReq.contactMethod === "both") &&
                              relatedReq.whatsappNumber && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    onOpenWhatsApp && relatedReq.whatsappNumber
                                  ) {
                                    onOpenWhatsApp(
                                      relatedReq.whatsappNumber,
                                      offer,
                                    );
                                  } else {
                                    window.open(
                                      `https://wa.me/${relatedReq.whatsappNumber}`,
                                      "_blank",
                                    );
                                  }
                                }}
                                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-primary hover:bg-primary/90 active:scale-95 text-white transition-all shadow-sm"
                                title="تواصل عبر واتساب"
                              >
                                <svg
                                  className="w-3 h-3"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                                واتساب
                              </button>
                            )}
                            {!relatedReq.isCreatedViaWhatsApp &&
                              (relatedReq.contactMethod === "chat" ||
                                relatedReq.contactMethod === "both" ||
                                !relatedReq.contactMethod) &&
                              onOpenChat && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenChat(relatedReq.id, offer);
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
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {offerToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            style={{ pointerEvents: "auto" }}
            onTouchStart={(e) => {
              // Track if touch started on backdrop (not modal content)
              if (e.target === e.currentTarget) {
                modalBackdropTouchStartRef.current = true;
              } else {
                modalBackdropTouchStartRef.current = false;
              }
            }}
            onTouchEnd={(e) => {
              // منع الإغلاق إذا تم فتح المودال حديثاً (أقل من 300ms)
              const timeSinceOpen = Date.now() - modalOpenTimeRef.current;
              if (timeSinceOpen < 300) {
                modalBackdropTouchStartRef.current = false;
                return;
              }
              // Only close if touch started and ended on backdrop
              if (
                modalBackdropTouchStartRef.current &&
                e.target === e.currentTarget &&
                !isDeletingOffer
              ) {
                setOfferToDelete(null);
              }
              modalBackdropTouchStartRef.current = false;
            }}
            onTouchCancel={() => {
              // Reset on touch cancel
              modalBackdropTouchStartRef.current = false;
            }}
            onClick={(e) => {
              // Only close on mouse click (not touch), and only if clicking backdrop
              // Touch events are handled separately above
              if (
                !isDeletingOffer &&
                e.target === e.currentTarget &&
                e.detail > 0 // Ensure it's a real click, not programmatic
              ) {
                // Check if this is from a mouse event (not touch)
                const isMouseEvent =
                  (e.nativeEvent as MouseEvent).clientX !== undefined;
                if (isMouseEvent) {
                  setOfferToDelete(null);
                }
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                e.stopPropagation();
                modalBackdropTouchStartRef.current = false;
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                modalBackdropTouchStartRef.current = false;
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold mb-2">حذف العرض</h3>
                <p className="text-muted-foreground text-sm">
                  هل أنت متأكد من حذف هذا العرض؟ بعد الحذف، سيظهر الطلب كأنه
                  جديد ويمكنك تقديم عرض آخر عليه. لا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setOfferToDelete(null)}
                  disabled={isDeletingOffer}
                >
                  إلغاء
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  isLoading={isDeletingOffer}
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onArchiveOffer && offerToDelete) {
                      setIsDeletingOffer(true);
                      try {
                        const result = await onArchiveOffer(offerToDelete);
                        if (result === true) {
                          // Success - close modal
                          setOfferToDelete(null);
                          // Haptic feedback
                          if (navigator.vibrate) {
                            navigator.vibrate(100);
                          }
                        } else {
                          // If deletion failed, show error but don't close modal
                          alert("فشل حذف العرض. يرجى المحاولة مرة أخرى.");
                        }
                      } catch (error) {
                        console.error("Error deleting offer:", error);
                        alert(
                          "حدث خطأ أثناء حذف العرض. يرجى المحاولة مرة أخرى.",
                        );
                      } finally {
                        setIsDeletingOffer(false);
                      }
                    }
                  }}
                >
                  حذف
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
