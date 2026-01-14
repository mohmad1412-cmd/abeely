import React, { useEffect, useMemo, useRef, useState } from "react";
import { Offer, Request, UserProfile } from "../types.ts";
import { logger } from "../utils/logger.ts";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Briefcase,
  CheckCircle,
  ChevronDown,
  Loader2,
  RotateCw,
  Search,
  X,
} from "lucide-react";
import { UnifiedFilterIsland } from "./ui/UnifiedFilterIsland.tsx";
import { CompactListView } from "./ui/CompactListView.tsx";
import { Button } from "./ui/Button.tsx";

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
  user?: UserProfile | null;
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
  // Default filter to apply on mount
  defaultFilter?: OfferFilter;
  radarWords?: string[];
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
  defaultFilter,
  radarWords = [],
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
  const [offerFilter, setOfferFilter] = useState<OfferFilter>(
    defaultFilter || "all",
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>("createdAt");
  const [hideRejected, setHideRejected] = useState(true);

  // Apply default filter when component mounts or defaultFilter changes
  useEffect(() => {
    if (defaultFilter && defaultFilter !== offerFilter) {
      setOfferFilter(defaultFilter);
    }
  }, [defaultFilter]);

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
      className="h-full overflow-x-hidden w-full mx-auto max-w-6xl relative no-scrollbar overflow-y-auto"
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
      <div className="pb-24">
        {filteredOffers.length === 0
          ? (
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
              <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed px-4">
                {offerFilter === "all"
                  ? "لم تقم بتقديم أي عروض بعد. تصفح الطلبات المتاحة وقدم عروضك للعملاء."
                  : offerFilter === "pending"
                  ? "لا توجد عروض قيد الانتظار حالياً. العروض التي تنتظر قبول صاحب الطلب ستظهر هنا."
                  : offerFilter === "accepted"
                  ? "لا توجد عروض مقبولة بعد. عندما يقبل عميل أحد عروضك، سيظهر هنا ويمكنك البدء بالتواصل."
                  : "لا توجد عروض مكتملة أو مؤرشفة. العروض المكتملة أو المؤرشفة ستظهر هنا."}
              </p>
            </motion.div>
          )
          : (
            <motion.div
              key={offerFilter}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <CompactListView
                requests={filteredOffers.map((o) =>
                  o.relatedRequest ||
                  allRequests.find((r) => r.id === o.requestId)
                ).filter((r): r is Request => !!r)}
                myOffers={filteredOffers}
                onSelectRequest={onSelectRequest}
                onSelectOffer={onSelectOffer}
                userId={userId}
                isGuest={isGuest}
                viewedRequestIds={viewedRequestIds}
                unreadMessagesPerOffer={unreadMessagesPerOffer}
                onOpenChat={onOpenChat}
                isMyOffersView={true}
                showCategoriesInStatus={true}
                radarWords={radarWords}
                onCancelOffer={onArchiveOffer ? async (offerId: string) => {
                  await onArchiveOffer(offerId);
                } : undefined}
                onRefresh={onRefresh
                  ? () => {
                    onRefresh();
                  }
                  : undefined}
                onArchiveRequest={async (requestId) => {
                  const offer = filteredOffers.find((o) =>
                    o.requestId === requestId
                  );
                  if (offer && onArchiveOffer) {
                    return await onArchiveOffer(offer.id) || false;
                  }
                  return false;
                }}
              />
            </motion.div>
          )}
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
                        logger.error("Error deleting offer", error, "MyOffers");
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
