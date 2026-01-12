import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { UserProfile } from "../types.ts";
import { logger } from "../utils/logger.ts";
import { createPortal } from "react-dom";
import {
  AppNotification,
  Category,
  getCategoryLabel,
  Offer,
  Request,
  SupportedLocale,
  ViewState,
} from "../types.ts";
import { AVAILABLE_CATEGORIES } from "../data.ts";
import { getCurrentLocale } from "../services/categoriesService.ts";
import { getKnownCategoryColor } from "../utils/categoryColors.ts";
import { CategoryIcon } from "./ui/CategoryIcon.tsx";
import {
  AlertCircle,
  ArrowDown,
  Bell,
  Camera,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  DollarSign,
  Edit,
  Eye,
  Filter,
  Globe,
  Heart,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Plus,
  RotateCw,
  Search,
  User as UserIcon,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "./ui/Button.tsx";
import { AnimatePresence, motion } from "framer-motion";
import { CardsGridSkeleton } from "./ui/LoadingSkeleton.tsx";
import { UnifiedFilterIsland } from "./ui/UnifiedFilterIsland.tsx";
import CompactListView from "./ui/CompactListView.tsx";
import { CityAutocomplete } from "./ui/CityAutocomplete.tsx";
import { ReportModal } from "./ui/ReportModal.tsx";
import { HighlightedText } from "./ui/HighlightedText.tsx";

import { calculateSeriousness } from "../services/requestsService.ts";
import { markRequestAsViewed } from "../services/requestViewsService.ts";
type ViewMode = "grid" | "text";

export interface MarketplaceProps {
  requests: Request[];
  interestsRequests?: Request[]; // طلبات اهتماماتي فقط
  unreadInterestsCount?: number; // عدد الطلبات غير المقروءة في اهتماماتي
  myOffers: Offer[]; // Pass myOffers to check application status
  receivedOffersMap?: Map<string, Offer[]>; // العروض المستلمة على طلبات المستخدم
  userId?: string; // معرف المستخدم الحالي
  onSelectRequest: (
    req: Request,
    scrollToOffer?: boolean,
    fromSidebar?: boolean,
  ) => void;
  userInterests: string[];
  onUpdateInterests: (interests: string[]) => void;
  interestedCities: string[];
  onUpdateCities: (cities: string[]) => void;
  radarWords?: string[]; // Current radar words from preferences
  onUpdateRadarWords?: (words: string[]) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void; // Callback for pull-to-refresh
  loadError?: string | null;
  savedScrollPosition?: number;
  onScrollPositionChange?: (pos: number, mode: "all" | "interests") => void;
  // Viewed requests from Backend - الطلبات المشاهدة من قاعدة البيانات
  viewedRequestIds?: Set<string>;
  isLoadingViewedRequests?: boolean; // هل يتم تحميل viewedRequestIds حالياً؟
  onRequestViewed?: (requestId: string) => void; // Callback لتحديث viewedRequestIds في App.tsx
  // Main Header Props
  mode: "requests" | "offers";
  toggleMode: () => void;
  isModeSwitching: boolean;
  unreadCount: number;
  hasUnreadMessages: boolean;
  user: UserProfile | null;
  isGuest: boolean;
  setView: (view: ViewState) => void;
  setPreviousView: (view: ViewState) => void;
  titleKey: number;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onNotificationClick?: (notification: AppNotification) => void;
  onClearAll: () => void;
  onSignOut: () => void;
  isLoading?: boolean;
  isLoadingMyOffers?: boolean; // حالة تحميل myOffers
  onScrollButtonVisibilityChange?: (visible: boolean) => void;
  onHeaderCompressionChange?: (compressed: boolean) => void;
  onNavigateToSettings?: () => void;
  // Theme and language
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  onOpenLanguagePopup?: () => void;
  // Create Request navigation
  onCreateRequest?: () => void;
  // Is this page currently active
  isActive?: boolean | string;
  // View mode change callback for smart notifications
  onViewModeChange?: (mode: "all" | "interests") => void;
  // New request IDs for animation
  newRequestIds?: Set<string>;
  // Current view mode from parent (for scroll position management)
  currentViewMode?: "all" | "interests";
  // Request action handlers for dropdown menu
  onBumpRequest?: (requestId: string) => Promise<boolean> | void;
  onEditRequest?: (request: Request) => Promise<boolean> | void;
  onHideRequest?: (requestId: string) => Promise<boolean> | void;
  onUnhideRequest?: (requestId: string) => Promise<boolean> | void;
  onArchiveRequest?: (requestId: string) => Promise<boolean> | void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({
  requests,
  interestsRequests = [],
  unreadInterestsCount = 0,
  myOffers,
  receivedOffersMap = new Map(),
  userId,
  onSelectRequest,
  userInterests,
  onUpdateInterests,
  interestedCities,
  onUpdateCities,
  radarWords: radarWordsProp = [],
  onUpdateRadarWords,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onRefresh,
  loadError = null,
  savedScrollPosition: externalScrollPos = 0,
  onScrollPositionChange,
  // Viewed requests from Backend
  viewedRequestIds: backendViewedIds,
  isLoadingViewedRequests = false,
  onRequestViewed,
  // Request action handlers
  onBumpRequest,
  onEditRequest,
  onHideRequest,
  onUnhideRequest,
  onArchiveRequest,
  // Main Header Props
  // Main Header Props
  user,
  isGuest,
  isLoading = false,
  isLoadingMyOffers = false,
  onScrollButtonVisibilityChange,
  onHeaderCompressionChange,
  isActive = true,
  onViewModeChange,
  newRequestIds = new Set(),
  currentViewMode: externalViewMode,
}) => {
  // Validate onSelectRequest
  if (!onSelectRequest) {
    logger.error(
      "Marketplace: onSelectRequest is not provided!",
      undefined,
      "Marketplace",
    );
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-destructive">Error: onSelectRequest is missing</p>
      </div>
    );
  }

  // View mode state - "all" or "interests"
  const [viewMode, setViewMode] = useState<"all" | "interests">("all");

  // Categories - استخدام القائمة الشاملة من data.ts كمصدر موحد
  const [categories, setCategories] = useState<Category[]>(
    AVAILABLE_CATEGORIES,
  );

  // Guest viewed requests IDs (loaded from localStorage)

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeReportRequestId, setActiveReportRequestId] = useState<
    string | null
  >(null);

  // Accordion state
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(
    null,
  );

  // Load last expanded request ID from database
  useEffect(() => {
    if (!userId || isGuest) return;

    const loadLastExpandedRequestId = async () => {
      const { getLastExpandedRequestId } = await import(
        "../services/preferencesService.ts"
      );
      const lastExpandedId = await getLastExpandedRequestId(userId);
      if (lastExpandedId) {
        setExpandedRequestId(lastExpandedId);
      }
    };

    loadLastExpandedRequestId();
  }, [userId, isGuest]);

  const handleToggleExpand = async (requestId: string) => {
    const newExpandedId = expandedRequestId === requestId ? null : requestId;
    setExpandedRequestId(newExpandedId);

    // Save to database
    if (userId && !isGuest) {
      const { saveLastExpandedRequestId } = await import(
        "../services/preferencesService.ts"
      );
      await saveLastExpandedRequestId(userId, newExpandedId);
    }

    // Mark as viewed (read) when expanding (if not already viewed)
    if (newExpandedId && requestId && onRequestViewed && userId && !isGuest) {
      const backendViewedIds = viewedRequestIds || new Set();
      if (!backendViewedIds.has(requestId)) {
        markRequestAsViewed(requestId).then((success) => {
          if (success) {
            onRequestViewed(requestId);
            logger.log(`✅ Request ${requestId} marked as viewed (expanded)`);
          } else {
            logger.warn(
              `❌ Failed to mark request ${requestId} as viewed (expanded)`,
            );
          }
        });
      }
    }
  };

  const handleReportRequest = (requestId: string) => {
    setActiveReportRequestId(requestId);
    setIsReportModalOpen(true);
  };

  // Current locale for category labels
  const [locale, setLocale] = useState<SupportedLocale>("ar");

  // استخدام AVAILABLE_CATEGORIES كمصدر موحد - نفس القائمة المستخدمة في OnboardingScreen
  useEffect(() => {
    // دائماً استخدام القائمة الشاملة من data.ts
    setCategories(AVAILABLE_CATEGORIES);
    setLocale(getCurrentLocale());

    // الاستماع لتغييرات اللغة
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "locale" && e.newValue) {
        const newLocale = e.newValue as SupportedLocale;
        if (newLocale === "ar" || newLocale === "en" || newLocale === "ur") {
          setLocale(newLocale);
        }
      }
    };
    globalThis.addEventListener("storage", handleStorageChange);

    return () => {
      globalThis.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Sync viewMode with parent if provided
  useEffect(() => {
    if (externalViewMode && externalViewMode !== viewMode) {
      setViewMode(externalViewMode);
    }
  }, [externalViewMode]);

  // Track viewed requests when they become visible on screen (in interests mode)
  // When user sees the card (10%+ visible), we mark it as viewed (is_read = true)
  // This makes the badge disappear immediately when the card appears on screen
  useEffect(() => {
    // Only track views in interests mode and when not a guest
    if (viewMode !== "interests" || isGuest || !userId || !onRequestViewed) {
      return;
    }

    // Wait until viewedRequestIds are loaded
    if (isLoadingViewedRequests) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const requestId = entry.target.getAttribute("data-request-id");
            if (
              requestId &&
              backendViewedIds &&
              !backendViewedIds.has(requestId)
            ) {
              // Mark as viewed in backend (is_read = true) - badge disappears immediately
              markRequestAsViewed(requestId).then((success) => {
                if (success) {
                  // Notify parent to update viewedRequestIds locally
                  onRequestViewed(requestId);
                  logger.log(`✅ Request ${requestId} marked as viewed`);
                } else {
                  logger.warn(
                    `❌ Failed to mark request ${requestId} as viewed`,
                  );
                }
              });
            }
          }
        });
      },
      {
        // Trigger when at least 10% of the card is visible (more sensitive)
        // هذا يجعل الـ badges تختفي فوراً عند ظهور الكارت على الشاشة
        threshold: 0.1,
        rootMargin: "50px", // Start tracking slightly before card enters viewport
      },
    );

    // Observe all request cards - use setTimeout to ensure DOM is ready
    const observeCards = () => {
      const cards = document.querySelectorAll("[data-request-id]");
      logger.log(
        `👁️ Observing ${cards.length} request cards for view tracking`,
      );
      cards.forEach((card) => observer.observe(card));
    };

    // Use setTimeout to ensure cards are rendered
    const timeoutId = setTimeout(observeCards, 300);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [
    viewMode,
    isGuest,
    userId,
    onRequestViewed,
    isLoadingViewedRequests,
    backendViewedIds,
    interestsRequests.length, // Re-observe when interests requests change
    requests.length, // Re-observe when requests change
  ]);

  // Display Mode (Grid / Text)
  const [displayMode, setDisplayMode] = useState<ViewMode>("text");

  // Force Grid view on wider screens (Fold unfolded, Tablet, Desktop)
  useEffect(() => {
    const handleResize = () => {
      const isWide = globalThis.innerWidth >= 768; // md breakpoint
      if (isWide && displayMode !== "grid") {
        setDisplayMode("grid");
      } else if (!isWide && displayMode === "grid") {
        setDisplayMode("text");
      }
    };

    // Initial check
    handleResize();

    globalThis.addEventListener("resize", handleResize);
    return () => globalThis.removeEventListener("resize", handleResize);
  }, [displayMode]);

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

  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isAtTop, setIsAtTop] = useState(false);
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);

  // Header compression state - for smooth scroll animations
  const [isHeaderCompressed, setIsHeaderCompressed] = useState(false);

  // Interests panel visibility based on scroll direction
  const [showInterestsPanel, setShowInterestsPanel] = useState(true);
  const [isInterestsPanelExpanded, setIsInterestsPanelExpanded] = useState(
    false,
  ); // منطوي افتراضياً
  const lastScrollY = useRef(0);

  // Touch interaction state
  const [touchHoveredCardId, setTouchHoveredCardId] = useState<string | null>(
    null,
  );
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Viewed requests tracking - الطلبات المشاهدة
  // نستخدم دائماً backendViewedIds من App.tsx لأن التحديث يحدث هناك
  // للزوار: نحتفظ بنسخة محلية للـ localStorage فقط
  const [guestViewedIds, setGuestViewedIds] = useState<Set<string>>(
    () => {
      if (!isGuest) return new Set<string>();
      try {
        const stored = localStorage.getItem("guestViewedRequestIds");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return new Set<string>(parsed);
          }
        }
      } catch (_e) {}
      return new Set<string>();
    },
  );

  // دمج البيانات: backendViewedIds (من App.tsx) + localGuestViewedIds (للزوار من localStorage)
  const viewedRequestIds = new Set([
    ...(backendViewedIds || []),
    ...(isGuest ? guestViewedIds : []),
  ]);

  // Search term state
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchInputOpen, setIsSearchInputOpen] = useState(false); // Controls search input animation
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filters Popup State (must be defined before hasActiveFilters)
  const [isFiltersPopupOpen, setIsFiltersPopupOpen] = useState(false);
  const [searchCategories, setSearchCategories] = useState<string[]>([]); // Multi-select
  const [searchCities, setSearchCities] = useState<string[]>([]); // Multi-select
  const [searchBudgetMin, setSearchBudgetMin] = useState<string>("");
  const [searchBudgetMax, setSearchBudgetMax] = useState<string>("");
  // Search input inside popup for categories
  const [popupCategorySearch, setPopupCategorySearch] = useState("");
  // Accordion state - only one section open at a time
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const popupCategoryInputRef = useRef<HTMLInputElement>(null);

  // Check if any filter is active (must be defined before useEffect that uses it)
  const hasActiveFilters = searchTerm || searchCategories.length > 0 ||
    searchCities.length > 0 || searchBudgetMin || searchBudgetMax;

  // Calculate dynamic search placeholder based on context
  // Priority: Selected categories > View mode
  const getSearchPlaceholder = (): {
    static: string;
    animated: string | string[];
    isCategories?: boolean;
  } => {
    // إذا كان هناك تصنيفات محددة، اعرضها بغض النظر عن viewMode
    if (searchCategories.length > 0) {
      // Get category labels
      const categoryLabels = searchCategories
        .map((catId) => {
          const category = categories.find(
            (c) => c.id === catId || c.label === catId,
          );
          return category?.label || catId;
        })
        .filter(Boolean);

      if (categoryLabels.length > 0) {
        return {
          static: "أنت تبحث في",
          animated: categoryLabels, // Return array for rendering as badges
          isCategories: true,
        };
      }
    }

    // إذا لم يكن هناك تصنيفات محددة، اعرض حسب viewMode
    if (viewMode === "interests") {
      return {
        static: "أنت تبحث في",
        animated: "اهتماماتك فقط...",
        isCategories: false,
      };
    }

    return {
      static: "أنت تبحث في",
      animated: "كل الطلبات...",
      isCategories: false,
    };
  };

  // Offer button pulse animation every 8 seconds

  // Toggle between Search and Filter icons (only when no active filters)

  // إعادة تحميل viewed requests من localStorage عند تغيير حالة isGuest
  useEffect(() => {
    if (!isGuest) {
      // إذا أصبح المستخدم مسجل، أفرغ guestViewedIds لأننا سنستخدم backendViewedIds
      setGuestViewedIds(new Set<string>());
      return;
    }

    // للزوار، أعد تحميل من localStorage
    try {
      const stored = localStorage.getItem("guestViewedRequestIds");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setGuestViewedIds(new Set<string>(parsed));
        }
      }
    } catch (e) {
      logger.error("Error loading guest viewed requests:", e, "service");
    }
  }, [isGuest]);

  // Interest View States
  const [isManageInterestsOpen, setIsManageInterestsOpen] = useState(false);
  const [notifyOnInterest, setNotifyOnInterest] = useState(true);
  const [radarWords, setRadarWords] = useState<string[]>(radarWordsProp); // Initialized from prop

  // Temp state for Modal
  const [tempInterests, setTempInterests] = useState<string[]>(userInterests);
  // تحويل "جميع المدن (شامل عن بعد)" إلى "كل المدن" عند التحميل
  const normalizedInitialCities = interestedCities.map((city: string) =>
    city === "جميع المدن (شامل عن بعد)" ? "كل المدن" : city
  );
  const [tempCities, setTempCities] = useState<string[]>(
    normalizedInitialCities,
  );
  const [tempCitySearch, setTempCitySearch] = useState("");
  const [tempCatSearch, setTempCatSearch] = useState("");
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [isCitiesExpanded, setIsCitiesExpanded] = useState(false);
  const [tempRadarWords, setTempRadarWords] = useState<string[]>([]);
  const [isRadarWordsExpanded, setIsRadarWordsExpanded] = useState(false);
  const [newRadarWord, setNewRadarWord] = useState("");

  // Keep internal radarWords in sync with prop if it changes externally
  useEffect(() => {
    if (JSON.stringify(radarWordsProp) !== JSON.stringify(radarWords)) {
      setRadarWords(radarWordsProp);
    }
  }, [radarWordsProp]);

  // Offer Modal State

  const marketplaceScrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollPosRef = useRef<number>(0);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  // Scroll state
  const [_hasScrolledPastFirstPage, setHasScrolledPastFirstPage] = useState(
    false,
  );
  const ninthItemRef = useRef<HTMLDivElement | null>(null);
  const pullStartY = useRef<number>(0);
  const pullCurrentY = useRef<number>(0);
  const pullDistanceRef = useRef<number>(0); // استخدام ref لتجنب stale closure
  const isPullingActiveRef = useRef<boolean>(false); // ref للحفاظ على حالة السحب بين الـ renders
  const searchPageScrollRef = useRef<HTMLDivElement>(null); // Ref للسكرول في صفحة البحث

  // Pull-to-refresh handlers
  useEffect(() => {
    const container = marketplaceScrollRef.current;
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
        const refreshPromise = (onRefresh as unknown as () => Promise<void>)();
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

  // Scroll Listener with debounced position save
  useEffect(() => {
    const container = marketplaceScrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollDelta = scrollTop - lastScrollY.current; // الفرق بين الموقع الحالي والسابق

      lastScrollPosRef.current = scrollTop;

      // Reset pull state if user scrolls away from top
      if (scrollTop > 0 && pullToRefreshState.isPulling) {
        setPullToRefreshState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
        });
      }

      // Interests Panel visibility - منطق بسيط وواضح بناءً على السكرول فقط
      // فقط عندما يكون في وضع "اهتماماتي"
      if (viewMode === "interests") {
        if (scrollTop < 20) {
          // عند القمة أو قريب منها - الـ panel يظهر دائماً
          if (!showInterestsPanel || isHeaderCompressed) {
            setShowInterestsPanel(true);
            setIsHeaderCompressed(false);
          }
        } else {
          // بعيد عن القمة - يعتمد على اتجاه السكرول
          if (scrollDelta > 10) {
            // سكرول للأسفل - أخف الـ panel
            if (showInterestsPanel) {
              setShowInterestsPanel(false);
              setIsHeaderCompressed(true);
            }
          } else if (scrollDelta < -5) {
            // سكرول للأعلى - أظهر الـ panel
            if (!showInterestsPanel) {
              setShowInterestsPanel(true);
              setIsHeaderCompressed(false);
            }
          }
        }
      }

      lastScrollY.current = scrollTop;

      // Show scroll to top button if scrolled past the 9th item
      let hasScrolledPast = false;
      if (ninthItemRef.current) {
        const ninthItemTop = ninthItemRef.current.offsetTop;
        const containerTop = container.scrollTop;
        hasScrolledPast = containerTop >= ninthItemTop - container.clientHeight;
      }
      setHasScrolledPastFirstPage(hasScrolledPast);

      // After 9th item: scrolling down = show scroll button, scrolling up = show orb
      if (hasScrolledPast) {
        if (scrollDelta > 5) {
          // Scrolling down - show scroll to top button, hide orb
          setShowScrollToTop(true);
        } else if (scrollDelta < -5) {
          // Scrolling up - hide scroll to top button, show orb
          setShowScrollToTop(false);
        }
      } else {
        // Before 9th item - always hide scroll button
        setShowScrollToTop(false);
      }

      // Rule 2: Mission ends if scrolled down past 9 requests
      if (hasScrolledPast && isAtTop) {
        setIsAtTop(false);
      }

      // Debounce the parent notification to avoid jitter
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        if (onScrollPositionChange) {
          onScrollPositionChange(lastScrollPosRef.current, viewMode);
        }
      }, 150);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [
    onScrollPositionChange,
    pullToRefreshState.isPulling,
    requests.length,
    isAtTop,
    viewMode,
  ]);

  // Touch scroll card detection - يكتشف أي كارت الإصبع فوقه أثناء السكرول
  useEffect(() => {
    const container = marketplaceScrollRef.current;
    if (!container) return;

    const handleTouchMoveForCards = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      const touchX = touch.clientX;
      const touchY = touch.clientY;

      // Find which card the finger is currently over
      let foundCard: string | null = null;
      cardRefs.current.forEach((element, cardId) => {
        if (element) {
          const rect = element.getBoundingClientRect();
          if (
            touchX >= rect.left &&
            touchX <= rect.right &&
            touchY >= rect.top &&
            touchY <= rect.bottom
          ) {
            foundCard = cardId;
          }
        }
      });

      setTouchHoveredCardId(foundCard);
    };

    const handleTouchEndForCards = () => {
      // Clear the hovered card when finger is lifted
      setTouchHoveredCardId(null);
    };

    container.addEventListener("touchmove", handleTouchMoveForCards, {
      passive: true,
    });
    container.addEventListener("touchend", handleTouchEndForCards, {
      passive: true,
    });
    container.addEventListener("touchcancel", handleTouchEndForCards, {
      passive: true,
    });

    return () => {
      container.removeEventListener("touchmove", handleTouchMoveForCards);
      container.removeEventListener("touchend", handleTouchEndForCards);
      container.removeEventListener("touchcancel", handleTouchEndForCards);
    };
  }, []);

  // Track if initial scroll restoration happened
  const initialScrollRestored = useRef(false);
  const prevExternalScrollPos = useRef(externalScrollPos);
  const prevViewModeForScroll = useRef(viewMode);

  // Restore scroll position IMMEDIATELY before browser paint using useLayoutEffect
  useLayoutEffect(() => {
    const container = marketplaceScrollRef.current;
    if (container) {
      // Restore if scroll position changed from parent, on initial mount, or when viewMode changes
      const viewModeChanged = prevViewModeForScroll.current !== viewMode;
      const scrollPosChanged =
        externalScrollPos !== prevExternalScrollPos.current;

      if (
        scrollPosChanged ||
        !initialScrollRestored.current ||
        viewModeChanged
      ) {
        // Always restore if we have a valid scroll position or it's initial mount
        if (externalScrollPos >= 0) {
          // Set scroll immediately in useLayoutEffect (before paint) to prevent flicker
          container.scrollTop = externalScrollPos;
          // Force a reflow to ensure scroll position is applied immediately
          void container.offsetHeight;
        }

        if (!initialScrollRestored.current) {
          initialScrollRestored.current = true;
        }
        prevExternalScrollPos.current = externalScrollPos;
        prevViewModeForScroll.current = viewMode;
      }
    }
  }, [externalScrollPos, viewMode]);

  // Save scroll position when component unmounts - useLayoutEffect ensures this runs synchronously before unmount
  useLayoutEffect(() => {
    return () => {
      // Save final scroll position before unmount
      if (onScrollPositionChange && marketplaceScrollRef.current) {
        const currentScroll = marketplaceScrollRef.current.scrollTop;
        if (currentScroll >= 0) {
          lastScrollPosRef.current = currentScroll;
          onScrollPositionChange(currentScroll, viewMode);
        }
      } else if (onScrollPositionChange && lastScrollPosRef.current >= 0) {
        // Fallback: use last known scroll position if ref is not available
        onScrollPositionChange(lastScrollPosRef.current, viewMode);
      }
      initialScrollRestored.current = false;
    };
  }, [onScrollPositionChange]);

  // Continuous icon toggle animation

  // Save current scroll position before switching viewMode, then restore the correct position
  const prevViewModeRef = useRef(viewMode);
  useEffect(() => {
    // Save scroll position before switching (if viewMode actually changed)
    if (prevViewModeRef.current !== viewMode && marketplaceScrollRef.current) {
      const currentScroll = marketplaceScrollRef.current.scrollTop;
      if (onScrollPositionChange && currentScroll >= 0) {
        onScrollPositionChange(currentScroll, prevViewModeRef.current);
      }
    }

    // Reset UI states (but NOT scroll position - we'll restore it)
    setShowScrollToTop(false);
    setIsAtTop(false);
    setHasScrolledPastFirstPage(false);
    // Don't reset savedScrollPosition - it will be restored from externalScrollPos

    // عندما نكون في وضع "اهتماماتي"، الـ panel يجب أن يظهر دائماً
    if (viewMode === "interests") {
      setShowInterestsPanel(true);
      setIsHeaderCompressed(false);
    } else {
      setShowInterestsPanel(false);
    }
    lastScrollY.current = 0;

    // Update ref for next comparison
    prevViewModeRef.current = viewMode;

    // Restore scroll position for the new viewMode (will be triggered by externalScrollPos change)
    // The useLayoutEffect below will handle the actual restoration
  }, [viewMode, onScrollPositionChange]);

  // Ensure interests panel is visible when in interests mode on mount
  useEffect(() => {
    if (viewMode === "interests") {
      setShowInterestsPanel(true);
      setIsHeaderCompressed(false);
    }
  }, []); // Run only once on mount

  // Notify parent when scroll button visibility changes
  useEffect(() => {
    onScrollButtonVisibilityChange?.(showScrollToTop || isAtTop);
  }, [showScrollToTop, isAtTop, onScrollButtonVisibilityChange]);

  // Notify parent when header compression state changes
  useEffect(() => {
    onHeaderCompressionChange?.(isHeaderCompressed);
  }, [isHeaderCompressed, onHeaderCompressionChange]);

  const handleManageInterests = (
    openAccordion?: "categories" | "cities" | "radar",
  ) => {
    // إذا كان المستخدم قد سكرل لأسفل، رجع للقمة وأظهر الـ panel
    if (
      marketplaceScrollRef.current && marketplaceScrollRef.current.scrollTop > 0
    ) {
      // أظهر الـ panel أولاً
      setShowInterestsPanel(true);
      setIsHeaderCompressed(false);
      // رجع للقمة بشكل سلس في الخلفية
      marketplaceScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // إذا كان في القمة، تأكد من أن الـ panel ظاهر
      setShowInterestsPanel(true);
      setIsHeaderCompressed(false);
    }

    // افتح المودال مباشرة (لا ننتظر الانتقال)
    setTempInterests(userInterests);
    // تحويل "جميع المدن (شامل عن بعد)" إلى "كل المدن" عند فتح المودال
    const normalizedCities = interestedCities.map((city: string) =>
      city === "جميع المدن (شامل عن بعد)" ? "كل المدن" : city
    );
    setTempCities(normalizedCities);
    setTempCitySearch("");
    setTempCatSearch("");
    setTempRadarWords(radarWords); // Load saved radar words

    // إعادة تعيين حالة الـ accordions
    setIsCategoriesExpanded(false);
    setIsCitiesExpanded(false);
    setIsRadarWordsExpanded(false);

    // فتح الـ accordion المطلوب إذا تم تحديده
    if (openAccordion === "categories") {
      setIsCategoriesExpanded(true);
    } else if (openAccordion === "cities") {
      setIsCitiesExpanded(true);
    } else if (openAccordion === "radar") {
      setIsRadarWordsExpanded(true);
    }

    setIsManageInterestsOpen(true);
  };

  const handleSaveInterests = () => {
    onUpdateInterests(tempInterests);

    // إذا لم يتم اختيار أي مدينة حقيقية (فارغة تماماً)، نضيف "كل المدن" تلقائياً
    // نعتبر "عن بعد" مدينة محددة، لذا إذا كانت موجودة وحدها، نحافظ عليها
    const hasRealCities = tempCities.filter((c) =>
      c !== "كل المدن" &&
      c !== "جميع المدن (شامل عن بعد)" &&
      c !== "عن بعد"
    ).length > 0;

    const citiesToSave = (tempCities.length === 0 ||
        (!hasRealCities && !tempCities.includes("عن بعد")))
      ? ["كل المدن"]
      : tempCities;

    onUpdateCities(citiesToSave);
    setRadarWords(tempRadarWords);
    if (onUpdateRadarWords) {
      onUpdateRadarWords(tempRadarWords);
    }
    setIsManageInterestsOpen(false);
  };

  const toggleInterest = (id: string) => {
    setTempInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleCity = (city: string) => {
    logger.log("toggleCity called with:", city);
    setTempCities((prev) => {
      logger.log("Current cities:", prev);
      logger.log("Current cities:", prev);

      // إذا كانت المدينة موجودة، نزيلها
      if (prev.includes(city)) {
        const newCities = prev.filter((c) => c !== city);
        logger.log("Removing city, new cities:", newCities);
        return newCities;
      } else {
        // إذا اختار "كل المدن"، نزيل كل المدن الأخرى ونضيف فقط "كل المدن"
        if (city === "كل المدن") {
          const newCities = [city];
          logger.log("Adding all cities, new cities:", newCities);
          return newCities;
        }

        // إذا اختار مدينة معينة، نزيل "كل المدن" أو "جميع المدن (شامل عن بعد)" (إن وجد) ونضيف المدينة
        // هذا يسمح بإزالة "كل المدن" عند اختيار مدن محددة
        const filtered = prev.filter((c) =>
          c !== "كل المدن" && c !== "جميع المدن (شامل عن بعد)"
        );
        const newCities = [...filtered, city];
        logger.log(
          "Adding city (removed 'كل المدن' if present), new cities:",
          newCities,
        );
        return newCities;
      }
    });
  };

  const filteredCategories = categories.filter((cat) =>
    cat.label.toLowerCase().includes(tempCatSearch.toLowerCase())
  );

  const addRadarWord = () => {
    const trimmedWord = newRadarWord.trim();
    if (trimmedWord && !tempRadarWords.includes(trimmedWord)) {
      setTempRadarWords([...tempRadarWords, trimmedWord]);
      setNewRadarWord("");
    }
  };

  const removeRadarWord = (word: string) => {
    setTempRadarWords(tempRadarWords.filter((w) => w !== word));
  };

  // Helper to get my offer on this request
  const getMyOffer = (reqId: string) => {
    return myOffers.find((o) => o.requestId === reqId);
  };

  const handleResetSearch = () => {
    setSearchTerm("");
    setSearchCategories([]);
    setSearchCities([]);
    setSearchBudgetMin("");
    setSearchBudgetMax("");
  };

  // Toggle filter section expand/collapse (accordion: only one open at a time)
  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  // Toggle Category Selection
  const toggleSearchCategory = (id: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setSearchCategories((prev) => {
      if (prev.includes(id)) {
        return prev.filter((c) => c !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Toggle City Selection
  const toggleSearchCity = (city: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setSearchCities((prev) => {
      if (prev.includes(city)) {
        return prev.filter((c) => c !== city);
      } else {
        // إذا اختار "كل المدن"، نزيل المدن الأخرى (ما عدا "عن بعد")
        if (city === "كل المدن") {
          const remoteOnly = prev.filter((c) => c === "عن بعد");
          return [...remoteOnly, city];
        }
        // إذا اختار مدينة معينة، نزيل "كل المدن"
        const filtered = prev.filter((c) => c !== "كل المدن");
        return [...filtered, city];
      }
    });
  };

  // Apply search and close popup
  const handleApplySearch = () => {
    setIsFiltersPopupOpen(false);
  };

  // Use interestsRequests when in interests mode, otherwise use all requests
  const requestsToFilter = viewMode === "interests"
    ? interestsRequests
    : requests;

  // حساب عدد الطلبات غير المقروءة في اهتماماتي
  // لا نحسب الطلبات غير المقروءة أثناء التحميل لتجنب إظهار عدد خاطئ
  // استخدام العدد الممرر مباشرة من App.tsx لضمان توافقه مع الـ badge السفلي
  const unreadInterestsRequestsCount = unreadInterestsCount || 0;

  // استخدام useMemo لضمان تحديث الفلترة عند تحديث myOffers
  // هذا يمنع ظهور الطلبات مؤقتاً ثم اختفائها عند تحميل العروض
  const filteredRequests = useMemo(() => {
    // إذا كان المستخدم مسجل دخول ولا تزال myOffers قيد التحميل، لا نعرض أي طلبات
    // هذا يمنع ظهور الطلبات التي لديها عروض ثم اختفائها فوراً
    if (userId && isLoadingMyOffers) {
      return [];
    }

    // إنشاء Set من request IDs التي قدم عليها المستخدم عرض (لتحسين الأداء)
    // نستبعد العروض الملغاة (cancelled) فقط - العروض المكتملة (completed) والمنتهية (rejected) تبقى مخفية
    // العروض المقبولة (accepted) والتفاوض (negotiating) تبقى مخفية أيضاً
    const myOfferRequestIds = new Set(
      myOffers
        .filter((offer) =>
          offer.status !== "cancelled" &&
          offer.status !== "completed" &&
          offer.status !== "rejected"
        )
        .map((offer) => offer.requestId),
    );

    return requestsToFilter.filter((req) => {
      // إخفاء الطلبات التي قدم عليها المستخدم عرض (في جميع الأوضاع)
      // المستخدم يريد رؤية فقط الطلبات التي لم يقدم عليها عرض بعد
      if (userId && myOfferRequestIds.has(req.id)) {
        // إخفاء الطلب إذا كان المستخدم قد قدم عليه عرض
        return false;
      }

      // Text search
      if (searchTerm) {
        const matchesSearch = req.title.includes(searchTerm) ||
          req.description.includes(searchTerm);
        if (!matchesSearch) return false;
      }

      // Category filter (Multi-select)
      if (searchCategories.length > 0) {
        // If request has categories, check if any match selected categories
        // Need to compare Arabic labels because req.categories contains labels
        const hasMatch = req.categories?.some((catLabel) =>
          searchCategories.some((catId) => {
            const categoryObj = categories.find((c) => c.id === catId);
            const interestLabel = categoryObj?.label || catId;
            return catLabel.toLowerCase().includes(
              interestLabel.toLowerCase(),
            ) ||
              interestLabel.toLowerCase().includes(catLabel.toLowerCase());
          })
        );
        if (!hasMatch) return false;
      }

      // City filter (Multi-select)
      // إذا تم اختيار "كل المدن" أو لم يتم اختيار أي مدينة، نتخطى الفلترة
      if (searchCities.length > 0 && !searchCities.includes("كل المدن")) {
        // نستثني "عن بعد" من الفلترة العادية - نتحقق منها بشكل منفصل
        const citiesWithoutRemote = searchCities.filter((c) => c !== "عن بعد");
        const includesRemote = searchCities.includes("عن بعد");

        const hasCityMatch = citiesWithoutRemote.some((city) =>
          req.location?.toLowerCase().includes(city.toLowerCase()) ||
          city.toLowerCase().includes(req.location?.toLowerCase() || "")
        );

        // إذا اختار "عن بعد"، نتحقق أيضاً إذا كان الموقع يحتوي على "عن بعد"
        const hasRemoteMatch = includesRemote && (
          req.location?.toLowerCase().includes("عن بعد") ||
          !req.location // طلبات بدون موقع تعتبر "عن بعد"
        );

        if (
          !hasCityMatch && !hasRemoteMatch && citiesWithoutRemote.length > 0
        ) {
          return false;
        }
        if (
          !hasRemoteMatch && citiesWithoutRemote.length === 0 && includesRemote
        ) return false;
      }

      // Budget filter
      if (searchBudgetMin) {
        if (Number(req.budgetMax || 0) < parseInt(searchBudgetMin)) {
          return false;
        }
      }
      if (searchBudgetMax) {
        if (Number(req.budgetMin || 0) > parseInt(searchBudgetMax)) {
          return false;
        }
      }

      // In interests mode, all requests in interestsRequests are already filtered by user interests
      // but we still want to apply search and city/budget filters if the user uses them
      return true;
    });
  }, [
    requestsToFilter,
    myOffers,
    userId,
    isLoadingMyOffers,
    searchTerm,
    searchCategories,
    categories,
    searchCities,
    searchBudgetMin,
    searchBudgetMax,
  ]);

  // Infinite scroll: when user reaches the end (10th item for first page), load next page
  useEffect(() => {
    if (!onLoadMore) return;
    const root = marketplaceScrollRef.current;
    const target = loadMoreTriggerRef.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (isLoadingMore || !hasMore) return;
        onLoadMore();
      },
      { root, rootMargin: "400px 0px", threshold: 0.1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, isLoadingMore]);

  return (
    <>
      <div
        ref={marketplaceScrollRef}
        id="marketplace-container"
        className="h-full overflow-x-hidden container mx-auto max-w-6xl relative no-scrollbar overflow-y-auto"
      >
        {/* Sticky Header Wrapper - Unified with main header - same structure as MyRequests/MyOffers */}
        <div className="sticky top-0 z-[60] overflow-visible">
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
                hasActiveFilters={!!hasActiveFilters}
                isActive={!!isActive}
                isSearchOpen={isSearchInputOpen || !!searchTerm}
              >
                {/* Filter Button - Always visible on the right (RTL) */}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFiltersPopupOpen(true);
                  }}
                  className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-all shrink-0 ${
                    (searchCategories.length > 0 || searchCities.length > 0 ||
                        searchBudgetMin || searchBudgetMax)
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:text-primary hover:bg-secondary/50"
                  }`}
                  whileTap={{ scale: 0.96 }}
                >
                  <Filter size={15} strokeWidth={2.5} />
                  {(searchCategories.length + searchCities.length +
                        (searchBudgetMin || searchBudgetMax ? 1 : 0)) > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -left-1 min-w-[16px] h-[16px] px-1 rounded-full bg-white text-primary text-[9px] font-bold flex items-center justify-center shadow-md border border-primary/20"
                    >
                      {searchCategories.length + searchCities.length +
                        (searchBudgetMin || searchBudgetMax ? 1 : 0)}
                    </motion.span>
                  )}
                </motion.button>

                {/* Center Content - Tabs or Search Input */}
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
                          {/* Animated Placeholder - يظهر فقط عندما يكون الحقل فارغاً */}
                          {!searchTerm && (() => {
                            const placeholder = getSearchPlaceholder();
                            const shouldAnimate = placeholder.isCategories &&
                              Array.isArray(placeholder.animated) &&
                              placeholder.animated.length > 0;
                            return (
                              <div className="absolute inset-0 flex items-center pointer-events-none pl-20 pr-2 overflow-hidden rtl">
                                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1 w-full">
                                  <span className="shrink-0">
                                    {placeholder.static}
                                  </span>
                                  {shouldAnimate
                                    ? (
                                      <span className="inline-block overflow-hidden flex-1 min-w-0 relative">
                                        <span
                                          className="inline-flex items-center gap-1.5 animate-marquee-placeholder"
                                          style={{ paddingLeft: "0.25rem" }}
                                        >
                                          {/* First set of badges */}
                                          <span className="inline-flex items-center gap-1.5">
                                            {Array.isArray(
                                              placeholder.animated,
                                            ) &&
                                              placeholder.animated.map((
                                                label,
                                                idx,
                                              ) => (
                                                <span
                                                  key={`first-${idx}`}
                                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/5 text-primary border border-primary/20 text-xs font-medium shrink-0"
                                                >
                                                  {label}
                                                </span>
                                              ))}
                                          </span>
                                          {/* Second set of badges for seamless loop - تبدأ من اليسار */}
                                          <span
                                            className="inline-flex items-center gap-1.5"
                                            style={{ marginLeft: "0.5rem" }}
                                          >
                                            {Array.isArray(
                                              placeholder.animated,
                                            ) &&
                                              placeholder.animated.map((
                                                label,
                                                idx,
                                              ) => (
                                                <span
                                                  key={`second-${idx}`}
                                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/5 text-primary border border-primary/20 text-xs font-medium shrink-0"
                                                >
                                                  {label}
                                                </span>
                                              ))}
                                          </span>
                                        </span>
                                      </span>
                                    )
                                    : (
                                      <span
                                        className="inline-block"
                                        style={{ paddingLeft: "0.25rem" }}
                                      >
                                        {typeof placeholder.animated ===
                                            "string"
                                          ? placeholder.animated
                                          : ""}
                                      </span>
                                    )}
                                </span>
                              </div>
                            );
                          })()}
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
                              // Delay to allow click events on other buttons to fire first
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
                        /* Normal Tabs Mode */
                        <motion.div
                          key="tabs"
                          initial={{ y: 40, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 40, opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                          }}
                          className="flex items-center justify-center flex-1 relative min-w-0"
                        >
                          {/* Animated capsule indicator */}
                          {!hasActiveFilters && (
                            <motion.div
                              className="absolute inset-y-0 rounded-full bg-primary shadow-md z-0"
                              animate={{
                                left: viewMode === "all" ? "50%" : "0%",
                              }}
                              style={{ width: "50%" }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(15);
                              if (
                                searchCategories.length > 0 ||
                                searchCities.length > 0 || searchBudgetMin ||
                                searchBudgetMax
                              ) {
                                handleResetSearch();
                              }
                              setViewMode("all");
                              onViewModeChange?.("all");
                            }}
                            className={`flex-1 py-3 px-5 text-xs font-bold rounded-full transition-colors relative flex items-center justify-center gap-1 whitespace-nowrap min-w-0 ${
                              viewMode === "all" && !hasActiveFilters
                                ? "text-white"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="relative z-10 text-center">
                              كل الطلبات
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(15);
                              if (
                                searchCategories.length > 0 ||
                                searchCities.length > 0 || searchBudgetMin ||
                                searchBudgetMax
                              ) {
                                handleResetSearch();
                              }
                              setViewMode("interests");
                              onViewModeChange?.("interests");
                            }}
                            className={`flex-1 py-3 px-5 text-xs font-bold rounded-full transition-colors relative flex items-center justify-center gap-1 whitespace-nowrap min-w-0 ${
                              viewMode === "interests" && !hasActiveFilters
                                ? "text-white"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="relative z-10 flex items-center justify-center gap-1.5">
                              اهتماماتي
                              {unreadInterestsRequestsCount > 0 && (
                                <span
                                  className={`inline-flex items-center justify-center min-w-[1.2rem] h-5 rounded-full px-1.5 text-[11px] font-bold transition-all animate-pulse ${
                                    viewMode === "interests" &&
                                      !hasActiveFilters
                                      ? "bg-white text-primary shadow-sm"
                                      : "bg-primary text-white shadow-lg shadow-primary/30"
                                  }`}
                                >
                                  {unreadInterestsRequestsCount}
                                </span>
                              )}
                            </span>
                          </button>
                        </motion.div>
                      )}
                  </AnimatePresence>
                </div>

                {/* Search Button - Moves from right to left when clicked */}
                <button
                  type="button"
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
          {(pullToRefreshState.isPulling || pullToRefreshState.isRefreshing) &&
            (
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
                          stroke="url(#pull-gradient-marketplace)"
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
                          id="pull-gradient-marketplace"
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

        {/* Active Filters Display - Second Row */}
        {(searchCategories.length > 0 || searchCities.length > 0 ||
          searchBudgetMin || searchBudgetMax) && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-3 pb-2 mt-1 px-4">
            <div className="flex items-center gap-1.5">
              {/* التصنيفات - إظهار المختارة أو "كل التصنيفات" */}
              {searchCategories.length > 0
                ? (
                  searchCategories.map((catId) => {
                    const cat = categories.find((c) => c.id === catId);
                    return cat
                      ? (
                        <motion.div
                          key={catId}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 text-primary border border-primary/20 text-xs font-medium shrink-0 hover:bg-primary/10 transition-colors"
                        >
                          <span>{cat.label}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSearchCategory(catId);
                            }}
                            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors -mr-0.5"
                          >
                            <X size={11} strokeWidth={2.5} />
                          </button>
                        </motion.div>
                      )
                      : null;
                  })
                )
                : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 text-muted-foreground border border-border/50 text-xs font-medium shrink-0">
                    <Filter size={11} strokeWidth={2} />
                    <span>كل التصنيفات</span>
                  </div>
                )}

              {/* المدن - إظهار المختارة أو "كل المدن" */}
              {searchCities.length > 0
                ? (
                  searchCities.map((city) => (
                    <motion.div
                      key={city}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 text-primary border border-primary/20 text-xs font-medium shrink-0 hover:bg-primary/10 transition-colors"
                    >
                      <MapPin size={11} strokeWidth={2} />
                      <span>{city}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSearchCity(city);
                        }}
                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors -mr-0.5"
                      >
                        <X size={11} strokeWidth={2.5} />
                      </button>
                    </motion.div>
                  ))
                )
                : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 text-muted-foreground border border-border/50 text-xs font-medium shrink-0">
                    <MapPin size={11} strokeWidth={2} />
                    <span>كل المدن</span>
                  </div>
                )}

              {/* الميزانية */}
              {(searchBudgetMin || searchBudgetMax) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 text-primary border border-primary/20 text-xs font-medium shrink-0 hover:bg-primary/10 transition-colors"
                >
                  <DollarSign size={11} strokeWidth={2} />
                  <span>
                    {searchBudgetMin && searchBudgetMax
                      ? `${searchBudgetMin} - ${searchBudgetMax}`
                      : searchBudgetMin
                      ? `من ${searchBudgetMin}`
                      : `إلى ${searchBudgetMax}`}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchBudgetMin("");
                      setSearchBudgetMax("");
                    }}
                    className="hover:bg-primary/20 rounded-full p-0.5 transition-colors -mr-0.5"
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* Content - الكروت تبدأ من هنا مباشرة بعد pull-to-refresh */}
        <div className="px-4 pb-24">
          {/* Floating Scroll to Top Button - Same position as the orb */}
          {/* يظهر فقط إذا كان هناك أكثر من 9 طلبات وتم السكرول للأسفل */}
          <AnimatePresence>
            {(showScrollToTop || isAtTop) && filteredRequests.length >= 9 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (marketplaceScrollRef.current) {
                    if (isAtTop) {
                      // Return to saved position
                      marketplaceScrollRef.current.scrollTo({
                        top: savedScrollPosition,
                        behavior: "smooth",
                      });
                      setIsAtTop(false);
                    } else {
                      // Save current position and scroll to top
                      setSavedScrollPosition(
                        marketplaceScrollRef.current.scrollTop,
                      );
                      marketplaceScrollRef.current.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });
                      setIsAtTop(true);
                    }
                  }
                }}
                className="fixed z-[101] w-10 h-10 flex items-center justify-center rounded-xl bg-card/95 backdrop-blur-xl border border-border shadow-lg text-foreground hover:bg-primary hover:text-white transition-colors"
                style={{
                  left: 12,
                  bottom: 128,
                }}
              >
                <motion.div
                  animate={{ rotate: isAtTop ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <ChevronUp size={18} strokeWidth={2.5} />
                </motion.div>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Filters Popup - Bottom Sheet Style - Using Portal to escape stacking context */}
          {isFiltersPopupOpen && createPortal(
            <div className="fixed inset-0 z-[9999]">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsFiltersPopupOpen(false)}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              />

              {/* Popup Content */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-x border-border/50"
              >
                {/* Handle Bar */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pb-4 border-b border-border">
                  <h2 className="text-lg font-bold text-foreground">
                    تصفية النتائج
                  </h2>
                  <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetSearch}
                        className="text-xs text-red-500 hover:text-red-600 font-bold px-3 py-1.5 rounded-full hover:bg-red-500/10 transition-colors"
                      >
                        مسح الكل
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsFiltersPopupOpen(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <X size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {/* Scrollable Filters Content */}
                <div
                  ref={searchPageScrollRef}
                  className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {/* Category Filter Section */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => toggleSection("category")}
                      className="flex items-center justify-between w-full"
                    >
                      <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                        <Filter
                          size={16}
                          strokeWidth={2.5}
                          className="text-primary"
                        />
                        التصنيف
                        {searchCategories.length > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-primary text-white px-1.5 text-[10px] font-bold">
                            {searchCategories.length}
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2">
                        {searchCategories.length > 0 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchCategories([]);
                            }}
                            className="text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            إلغاء التحديد
                          </span>
                        )}
                        <motion.div
                          animate={{
                            rotate: expandedSection === "category" ? 180 : 0,
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown
                            size={18}
                            className="text-muted-foreground"
                          />
                        </motion.div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedSection === "category" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden space-y-3"
                        >
                          {/* Category Search Input */}
                          <div className="relative">
                            <Search
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none"
                              size={14}
                            />
                            <input
                              ref={popupCategoryInputRef}
                              type="text"
                              placeholder="ابحث عن تصنيف..."
                              className="w-full pr-9 pl-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:border-primary text-sm"
                              value={popupCategorySearch}
                              onChange={(e) =>
                                setPopupCategorySearch(e.target.value)}
                            />
                            {popupCategorySearch && (
                              <button
                                type="button"
                                onClick={() => setPopupCategorySearch("")}
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>

                          {/* Category Chips */}
                          <div className="flex flex-wrap justify-start gap-2 max-h-32 overflow-y-auto no-scrollbar w-full">
                            {categories
                              .filter((cat) =>
                                cat.label.toLowerCase().includes(
                                  popupCategorySearch.toLowerCase(),
                                )
                              )
                              .map((cat) => (
                                <button
                                  type="button"
                                  key={cat.id}
                                  onClick={() => {
                                    if (navigator.vibrate) {
                                      navigator.vibrate(10);
                                    }
                                    toggleSearchCategory(cat.id);
                                  }}
                                  className={`px-3 py-1.5 rounded-full text-xs border transition-all flex items-center gap-1.5 ${
                                    searchCategories.includes(cat.id)
                                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                      : "bg-secondary/50 text-foreground border-transparent hover:bg-secondary"
                                  }`}
                                >
                                  <span>{cat.emoji}</span>
                                  {cat.label}
                                </button>
                              ))}
                            {categories.filter((cat) =>
                                  cat.label.toLowerCase().includes(
                                    popupCategorySearch.toLowerCase(),
                                  )
                                ).length === 0 && (
                              <p className="text-xs text-muted-foreground py-2">
                                لا توجد نتائج
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border" />

                  {/* City Filter Section */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => toggleSection("city")}
                      className="flex items-center justify-between w-full"
                    >
                      <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                        <MapPin
                          size={16}
                          strokeWidth={2.5}
                          className="text-red-500"
                        />
                        المدينة
                        {searchCities.length > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-red-500 text-white px-1.5 text-[10px] font-bold">
                            {searchCities.length}
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2">
                        {searchCities.length > 0 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchCities([]);
                            }}
                            className="text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            إلغاء التحديد
                          </span>
                        )}
                        <motion.div
                          animate={{
                            rotate: expandedSection === "city" ? 180 : 0,
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown
                            size={18}
                            className="text-muted-foreground"
                          />
                        </motion.div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedSection === "city" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden space-y-3"
                        >
                          {/* City Autocomplete with Google Places */}
                          <CityAutocomplete
                            value=""
                            onChange={() => {}}
                            placeholder="ابحث عن مدن، معالم، أو محلات..."
                            multiSelect
                            showAllCitiesOption
                            selectedCities={searchCities}
                            onSelectCity={(city) => {
                              if (navigator.vibrate) navigator.vibrate(10);
                              toggleSearchCity(city);
                            }}
                            onRemoveCity={(city) => {
                              if (navigator.vibrate) navigator.vibrate(10);
                              toggleSearchCity(city);
                            }}
                            showRemoteOption
                            showGPSOption
                            showMapOption
                            onOpenMap={() => {
                              if (navigator.vibrate) navigator.vibrate(10);
                              // فتح Google Maps في نافذة جديدة
                              const mapsUrl =
                                `https://www.google.com/maps/search/?api=1&query=المملكة+العربية+السعودية`;
                              globalThis.open(mapsUrl, "_blank");
                            }}
                            dropdownDirection="up"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border" />

                  {/* Budget Filter Section */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => toggleSection("budget")}
                      className="flex items-center justify-between w-full"
                    >
                      <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                        <DollarSign
                          size={16}
                          strokeWidth={2.5}
                          className="text-primary"
                        />
                        الميزانية
                        {(searchBudgetMin || searchBudgetMax) && (
                          <span className="inline-flex items-center justify-center h-5 rounded-full bg-primary text-white px-2 text-[10px] font-bold">
                            {searchBudgetMin || "0"} - {searchBudgetMax || "∞"}
                          </span>
                        )}
                      </h3>
                      <motion.div
                        animate={{
                          rotate: expandedSection === "budget" ? 180 : 0,
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown
                          size={18}
                          className="text-muted-foreground"
                        />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {expandedSection === "budget" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden space-y-3"
                        >
                          {/* Budget Range Inputs */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1 relative">
                              <input
                                type="number"
                                placeholder="من"
                                className={`w-full px-3 py-2 text-sm rounded-xl border bg-background focus:outline-none focus:border-primary text-center ${
                                  searchBudgetMin && searchBudgetMax &&
                                    Number(searchBudgetMin) >
                                      Number(searchBudgetMax)
                                    ? "border-red-500 "
                                    : "border-border"
                                }`}
                                value={searchBudgetMin}
                                onChange={(e) =>
                                  setSearchBudgetMin(e.target.value)}
                              />
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">
                                ر.س
                              </span>
                            </div>
                            <span className="text-muted-foreground text-sm">
                              إلى
                            </span>
                            <div className="flex-1 relative">
                              <input
                                type="number"
                                placeholder="إلى"
                                className={`w-full px-3 py-2 text-sm rounded-xl border bg-background focus:outline-none focus:border-primary text-center ${
                                  searchBudgetMin && searchBudgetMax &&
                                    Number(searchBudgetMin) >
                                      Number(searchBudgetMax)
                                    ? "border-red-500 "
                                    : "border-border"
                                }`}
                                value={searchBudgetMax}
                                onChange={(e) =>
                                  setSearchBudgetMax(e.target.value)}
                              />
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">
                                ر.س
                              </span>
                            </div>
                            {(searchBudgetMin || searchBudgetMax) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchBudgetMin("");
                                  setSearchBudgetMax("");
                                }}
                                className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors shrink-0"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>

                          {/* Validation Message */}
                          {searchBudgetMin && searchBudgetMax &&
                            Number(searchBudgetMin) > Number(searchBudgetMax) &&
                            (
                              <div className="flex items-center gap-2 text-red-500 text-xs">
                                <AlertCircle size={12} />
                                <span className="font-medium">
                                  المبلغ الأدنى يجب أن يكون أقل من الأعلى
                                </span>
                              </div>
                            )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Footer with Action Button */}
                <div className="border-t border-border/50 bg-card/95 backdrop-blur-xl px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                  <Button
                    className="w-full h-12 text-sm font-bold shadow-lg gap-2 rounded-xl"
                    onClick={handleApplySearch}
                  >
                    عرض النتائج
                    <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 rounded-full bg-white/20 text-white px-2 text-xs font-bold">
                      {filteredRequests.length}
                    </span>
                  </Button>
                </div>
              </motion.div>
            </div>,
            document.body,
          )}

          <div className="px-4 pb-4">
            {/* 1. Sub-Filters (Interests Panel) - ALWAYS TOP when in interests mode */}
            <AnimatePresence>
              {viewMode === "interests" && showInterestsPanel && (
                <motion.div
                  initial={{
                    opacity: 0,
                    height: 0,
                    marginBottom: 0,
                    marginTop: 0,
                  }}
                  animate={{
                    opacity: 1,
                    height: "auto",
                    marginBottom: 24,
                    marginTop: 24,
                  }}
                  exit={{
                    opacity: 0,
                    height: 0,
                    marginBottom: 0,
                    marginTop: 0,
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  {/* Interests Panel - Collapsible */}
                  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    {/* Header - Clickable */}
                    <button
                      type="button"
                      onClick={() =>
                        setIsInterestsPanelExpanded(!isInterestsPanelExpanded)}
                      className="w-full p-3 flex items-center justify-between bg-secondary/10 hover:bg-secondary/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Heart size={16} className="text-primary" />
                        <span className="font-bold text-sm">
                          إدارة اهتماماتي
                        </span>
                        {/* عداد سريع */}
                        {(userInterests.length > 0 ||
                          interestedCities.length > 0 ||
                          radarWords.length > 0) &&
                          (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                              {userInterests.length > 0 && (
                                <span>{userInterests.length} تصنيف</span>
                              )}
                              {userInterests.length > 0 &&
                                (interestedCities.length > 0 ||
                                  radarWords.length > 0) &&
                                <span>•</span>}
                              {interestedCities.length > 0 && (
                                <span>
                                  {interestedCities.includes("كل المدن") ||
                                      interestedCities.includes(
                                        "جميع المدن (شامل عن بعد)",
                                      )
                                    ? "كل المدن"
                                    : `${interestedCities.length} مدينة`}
                                </span>
                              )}
                              {interestedCities.length > 0 &&
                                radarWords.length > 0 && <span>•</span>}
                              {radarWords.length > 0 && (
                                <span>{radarWords.length} كلمة</span>
                              )}
                            </span>
                          )}
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{
                            rotate: isInterestsPanelExpanded ? 180 : 0,
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown
                            size={18}
                            className="text-muted-foreground"
                          />
                        </motion.div>
                      </div>
                    </button>

                    {/* Content - Expandable */}
                    <AnimatePresence>
                      {isInterestsPanelExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {/* Action Button */}
                          <div className="px-4 pt-3 pb-2 border-t border-border/50">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleManageInterests();
                              }}
                              className="w-full gap-2 h-9 rounded-xl border-primary/20 hover:bg-primary/5 text-primary text-xs font-bold"
                            >
                              <Edit size={14} />
                              تعديل الاهتمامات
                            </Button>
                          </div>

                          <div className="px-4 pb-4 space-y-4">
                            {/* Categories - Collapsible */}
                            <div className="space-y-3">
                              <div
                                onClick={() =>
                                  setIsCategoriesExpanded(
                                    !isCategoriesExpanded,
                                  )}
                                className="flex items-center justify-between cursor-pointer group"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    التصنيفات المختارة
                                  </span>
                                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-secondary px-1.5 text-[11px] text-muted-foreground font-bold">
                                    {userInterests.length}
                                  </span>
                                </div>
                                <div
                                  className={`transition-transform duration-200 ${
                                    isCategoriesExpanded ? "rotate-180" : ""
                                  }`}
                                >
                                  <ChevronDown
                                    size={14}
                                    className="text-muted-foreground group-hover:text-primary"
                                  />
                                </div>
                              </div>

                              <AnimatePresence>
                                {isCategoriesExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="flex flex-wrap justify-start gap-2 pt-1 w-full items-center">
                                      {userInterests.length === 0
                                        ? (
                                          <>
                                            <span className="text-xs text-muted-foreground italic">
                                              لم تحدد تصنيفات بعد
                                            </span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleManageInterests(
                                                  "categories",
                                                );
                                              }}
                                              className="flex items-center justify-center px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                                              title="تعديل التصنيفات"
                                            >
                                              <Plus
                                                size={16}
                                                strokeWidth={2.5}
                                              />
                                            </button>
                                          </>
                                        )
                                        : (
                                          <>
                                            {userInterests.map((int) => {
                                              const cat = categories.find((c) =>
                                                c.id === int
                                              );
                                              return (
                                                <div
                                                  key={int}
                                                  className="flex items-center gap-1.5 bg-secondary/50 border border-border/50 px-3 py-1.5 rounded-full text-xs font-medium"
                                                >
                                                  <span>{cat?.emoji}</span>
                                                  {cat?.label}
                                                </div>
                                              );
                                            })}
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleManageInterests(
                                                  "categories",
                                                );
                                              }}
                                              className="flex items-center justify-center px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                                              title="تعديل التصنيفات"
                                            >
                                              <Plus
                                                size={16}
                                                strokeWidth={2.5}
                                              />
                                            </button>
                                          </>
                                        )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Cities - Collapsible */}
                            <div className="space-y-3">
                              <div
                                onClick={() =>
                                  setIsCitiesExpanded(!isCitiesExpanded)}
                                className="flex items-center justify-between cursor-pointer group"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    المدن المغطاة
                                  </span>
                                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-secondary px-1.5 text-[11px] text-muted-foreground font-bold">
                                    {interestedCities.includes("كل المدن") ||
                                        interestedCities.includes(
                                          "جميع المدن (شامل عن بعد)",
                                        )
                                      ? "الكل"
                                      : interestedCities.length || "الكل"}
                                  </span>
                                </div>
                                <div
                                  className={`transition-transform duration-200 ${
                                    isCitiesExpanded ? "rotate-180" : ""
                                  }`}
                                >
                                  <ChevronDown
                                    size={14}
                                    className="text-muted-foreground group-hover:text-primary"
                                  />
                                </div>
                              </div>

                              <AnimatePresence>
                                {isCitiesExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{
                                      duration: 0.3,
                                      ease: "easeInOut",
                                    }}
                                    className="overflow-hidden"
                                  >
                                    <div className="flex flex-wrap justify-start gap-2 pt-1 w-full items-center">
                                      {interestedCities.length === 0
                                        ? (
                                          <>
                                            <span className="text-xs text-muted-foreground italic">
                                              جميع المدن
                                            </span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleManageInterests("cities");
                                              }}
                                              className="flex items-center justify-center px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                                              title="تعديل المدن"
                                            >
                                              <Plus
                                                size={16}
                                                strokeWidth={2.5}
                                              />
                                            </button>
                                          </>
                                        )
                                        : (
                                          <>
                                            {interestedCities.map((city) => (
                                              <div
                                                key={city}
                                                className="flex items-center gap-1.5 bg-primary/5 border border-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold"
                                              >
                                                <MapPin size={12} />
                                                {city}
                                              </div>
                                            ))}
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleManageInterests("cities");
                                              }}
                                              className="flex items-center justify-center px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                                              title="تعديل المدن"
                                            >
                                              <Plus
                                                size={16}
                                                strokeWidth={2.5}
                                              />
                                            </button>
                                          </>
                                        )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Radar Words - Collapsible */}
                            <div className="space-y-3">
                              <div
                                onClick={() =>
                                  setIsRadarWordsExpanded(
                                    !isRadarWordsExpanded,
                                  )}
                                className="flex items-center justify-between cursor-pointer group"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    رادار الكلمات
                                  </span>
                                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-secondary px-1.5 text-[11px] text-muted-foreground font-bold">
                                    {radarWords.length}
                                  </span>
                                </div>
                                <div
                                  className={`transition-transform duration-200 ${
                                    isRadarWordsExpanded ? "rotate-180" : ""
                                  }`}
                                >
                                  <ChevronDown
                                    size={14}
                                    className="text-muted-foreground group-hover:text-primary"
                                  />
                                </div>
                              </div>

                              <AnimatePresence>
                                {isRadarWordsExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{
                                      duration: 0.3,
                                      ease: "easeInOut",
                                    }}
                                    className="overflow-hidden"
                                  >
                                    <div className="flex flex-wrap justify-start gap-2 pt-1 w-full items-center">
                                      {radarWords.length === 0
                                        ? (
                                          <>
                                            <span className="text-xs text-muted-foreground italic">
                                              لم تحدد كلمات رادار بعد
                                            </span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleManageInterests("radar");
                                              }}
                                              className="flex items-center justify-center px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                                              title="تعديل كلمات الرادار"
                                            >
                                              <Plus
                                                size={16}
                                                strokeWidth={2.5}
                                              />
                                            </button>
                                          </>
                                        )
                                        : (
                                          <>
                                            {radarWords.map((word) => (
                                              <div
                                                key={word}
                                                className="flex items-center gap-1.5 bg-accent/15 border border-accent/25 text-accent-foreground px-3 py-1.5 rounded-full text-xs font-bold"
                                              >
                                                <Compass size={12} />
                                                {word}
                                              </div>
                                            ))}
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleManageInterests("radar");
                                              }}
                                              className="flex items-center justify-center px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                                              title="تعديل كلمات الرادار"
                                            >
                                              <Plus
                                                size={16}
                                                strokeWidth={2.5}
                                              />
                                            </button>
                                          </>
                                        )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Notification Toggle - Always visible for easy access */}
                            <div
                              onClick={() => {
                                // Haptic feedback
                                if (navigator.vibrate) {
                                  navigator.vibrate(15);
                                }
                                setNotifyOnInterest(!notifyOnInterest);
                              }}
                              className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all group cursor-pointer ${
                                notifyOnInterest
                                  ? "bg-primary/5 border-primary/10 hover:bg-primary/10"
                                  : "bg-secondary/30 border-border/50 hover:bg-secondary/50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                    notifyOnInterest
                                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  <Bell
                                    size={20}
                                    className={notifyOnInterest
                                      ? "animate-bounce"
                                      : ""}
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm">
                                    التنبيهات المباشرة
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {notifyOnInterest
                                      ? "إشعارك فوراً بما تهتم به"
                                      : "فعل التنبيهات لتصلك الطلبات فوراً"}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Haptic feedback
                                  if (navigator.vibrate) {
                                    navigator.vibrate(15);
                                  }
                                  setNotifyOnInterest(!notifyOnInterest);
                                }}
                                className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                                  notifyOnInterest
                                    ? "bg-primary"
                                    : "bg-gray-300"
                                }`}
                              >
                                <motion.div
                                  animate={{ x: notifyOnInterest ? -28 : 0 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 30,
                                  }}
                                  className="w-5 h-5 bg-white rounded-full shadow-lg"
                                />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 2. Skeleton/Loading State */}
            {filteredRequests.length === 0 && isLoading && !loadError && (
              <div className="mt-4">
                <CardsGridSkeleton count={6} showLogo={false} />
              </div>
            )}

            {/* 2.5. Connection Error State */}
            {loadError && (
              <div className="flex flex-col items-center justify-center py-16 text-center min-h-[50vh]">
                {/* Animated Icon */}
                <div className="relative mb-8">
                  <div
                    className="absolute inset-0 w-24 h-24 rounded-full bg-primary/10 animate-ping"
                    style={{ animationDuration: "2s" }}
                  />
                  <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 shadow-xl">
                    <WifiOff
                      className="text-slate-400 dark:text-slate-500"
                      size={40}
                      strokeWidth={1.5}
                    />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-3">
                  {loadError.includes("timeout") ||
                      loadError.includes("Connection timeout")
                    ? "انتهت مهلة الاتصال"
                    : "لم نتمكن من التحميل"}
                </h3>
                <div className="text-muted-foreground max-w-xs mx-auto leading-relaxed mb-8 text-sm space-y-2">
                  {loadError.includes("timeout") ||
                      loadError.includes("Connection timeout")
                    ? (
                      <>
                        <p>
                          عذراً، لا يمكن الاتصال بالخادم حالياً. يرجى التحقق من
                          اتصالك بالإنترنت والمحاولة مرة أخرى.
                        </p>
                      </>
                    )
                    : (
                      <p>
                        {loadError ||
                          "قد يكون هناك مشكلة مؤقتة في الاتصال. لا تقلق، جرب مرة أخرى!"}
                      </p>
                    )}
                </div>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                  {/* Primary Retry Button with animated icon */}
                  {onRefresh && (
                    <button
                      type="button"
                      onClick={onRefresh}
                      className="group relative w-full px-6 py-4 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-2xl transition-all shadow-lg hover:shadow-xl overflow-hidden"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        <span className="relative w-5 h-5">
                          <span className="absolute inset-0 rounded-full border-2 border-white/30" />
                          <span
                            className="absolute inset-0 rounded-full border-2 border-t-white animate-spin"
                            style={{ animationDuration: "1.5s" }}
                          />
                        </span>
                        إعادة المحاولة
                      </span>
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </button>
                  )}

                  {/* Hard Refresh Button - Clears EVERYTHING */}
                  <button
                    type="button"
                    onClick={async () => {
                      // هذا الإجراء سيمسح بيانات تسجيل الدخول أيضاً (Supabase auth)
                      const confirmed = globalThis.confirm(
                        "تنبيه: هذا الخيار يمسح كل البيانات المحفوظة (بما فيها تسجيل الدخول) وقد يسبب تسجيل خروجك.\n\nهل تريد المتابعة؟",
                      );
                      if (!confirmed) return;
                      try {
                        // 1. Unregister ALL Service Workers
                        if ("serviceWorker" in navigator) {
                          const registrations = await navigator.serviceWorker
                            .getRegistrations();
                          for (const registration of registrations) {
                            await registration.unregister();
                          }
                          logger.log(
                            "[Hard Refresh] Service workers unregistered",
                          );
                        }

                        // 2. Clear ALL Cache Storage
                        if ("caches" in globalThis) {
                          const cacheNames = await caches.keys();
                          await Promise.all(cacheNames.map((name) =>
                            caches.delete(name)
                          ));
                          logger.log("[Hard Refresh] Cache storage cleared");
                        }

                        // 3. Clear ALL localStorage (except critical items)
                        const keysToKeep = ["theme", "language"];
                        const allKeys = Object.keys(localStorage);
                        allKeys.forEach((key) => {
                          if (!keysToKeep.includes(key)) {
                            localStorage.removeItem(key);
                          }
                        });
                        logger.log("[Hard Refresh] localStorage cleared");

                        // 4. Clear ALL sessionStorage
                        sessionStorage.clear();
                        logger.log("[Hard Refresh] sessionStorage cleared");

                        // 5. Clear IndexedDB (Supabase uses this)
                        if ("indexedDB" in globalThis) {
                          const databases = await indexedDB.databases?.() || [];
                          for (const db of databases) {
                            if (db.name) {
                              indexedDB.deleteDatabase(db.name);
                            }
                          }
                          logger.log("[Hard Refresh] IndexedDB cleared");
                        }

                        // 6. Force hard reload (bypass cache)
                        // Using cache-busting query param + force reload
                        const url = new URL(globalThis.location.href);
                        url.searchParams.set("_refresh", Date.now().toString());
                        globalThis.location.replace(url.toString());
                      } catch (err) {
                        logger.error("[Hard Refresh] Error:", err, "service");
                        // Fallback: just force reload
                        globalThis.location.href = globalThis.location.origin +
                          "?_refresh=" + Date.now();
                      }
                    }}
                    className="w-full px-6 py-3.5 text-sm font-medium text-muted-foreground bg-secondary/50 hover:bg-secondary rounded-2xl transition-all border border-border/50"
                  >
                    مسح كل البيانات المحفوظة وإعادة التحميل
                  </button>
                </div>
              </div>
            )}

            {/* 3. Empty State */}
            {filteredRequests.length === 0 && !isLoading && !loadError && (
              <div className="flex flex-col items-center justify-center py-20 text-center min-h-[50vh]">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary mb-4">
                  <Search className="text-muted-foreground" size={24} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  لا توجد نتائج
                </h3>
                <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  {viewMode === "interests"
                    ? "لم نجد طلبات تطابق اهتماماتك الحالية. جرب تعديل الاهتمامات أو اختيار مدن أخرى."
                    : hasActiveFilters
                    ? "لم نجد طلبات تطابق معايير البحث الحالية. جرب تعديل الفلاتر أو البحث بكلمات مختلفة."
                    : "لا توجد طلبات جديدة حالياً. اسحب للأسفل للتحديث أو عُد لاحقاً."}
                </p>
                {viewMode === "interests"
                  ? (
                    <Button
                      variant="outline"
                      onClick={() => handleManageInterests()}
                      className="mt-6 rounded-2xl"
                    >
                      تعديل الاهتمامات
                    </Button>
                  )
                  : hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={handleResetSearch}
                      className="mt-6 rounded-2xl gap-2"
                    >
                      <X size={16} />
                      مسح الفلاتر
                    </Button>
                  )}
              </div>
            )}

            {/* Modal logic for Interests - Bottom Sheet Style like Filters */}
            {isManageInterestsOpen && createPortal(
              <div className="fixed inset-0 z-[9999]">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsManageInterestsOpen(false)}
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />

                {/* Popup Content */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-x border-border/50"
                >
                  {/* Handle Bar */}
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                  </div>

                  {/* Header */}
                  <div className="flex items-center justify-between px-5 pb-4 border-b border-border">
                    <h2 className="text-lg font-bold text-foreground">
                      إدارة الاهتمامات
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsManageInterestsOpen(false)}
                      className="p-2 hover:bg-secondary rounded-full transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                    {/* Notification Toggle - Moved to top */}
                    <div className="p-4 bg-secondary/30 rounded-xl border border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Bell size={18} className="text-primary" />
                          <div>
                            <h4 className="font-bold text-sm">
                              إشعارات الاهتمامات
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              تنبيهات فورية للطلبات التي تهمك
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNotifyOnInterest(!notifyOnInterest)}
                          className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                            notifyOnInterest ? "bg-primary" : "bg-gray-300"
                          }`}
                        >
                          <motion.div
                            animate={{ x: notifyOnInterest ? -28 : 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 30,
                            }}
                            className="w-5 h-5 bg-white rounded-full shadow-lg"
                          />
                        </button>
                      </div>
                    </div>

                    {/* Categories - Collapsible */}
                    <div className="bg-secondary/50 rounded-lg border border-border overflow-hidden">
                      <div
                        onClick={() => {
                          const newState = !isCategoriesExpanded;
                          setIsCategoriesExpanded(newState);
                          if (newState) {
                            setIsCitiesExpanded(false);
                            setIsRadarWordsExpanded(false);
                          }
                        }}
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/70 transition-all"
                      >
                        <h4 className="font-bold text-sm">التصنيفات والمهام</h4>
                        <ChevronDown
                          size={18}
                          className={`text-muted-foreground transition-transform duration-200 ${
                            isCategoriesExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                      <AnimatePresence>
                        {isCategoriesExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden border-t border-border"
                          >
                            <div className="p-3 space-y-3">
                              <input
                                type="text"
                                placeholder="بحث..."
                                value={tempCatSearch}
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>,
                                ) => setTempCatSearch(e.target.value)}
                                className="w-full text-xs px-3 py-1.5 rounded-lg border-2 border-[#1E968C]/30 bg-background focus:border-[#178075] focus:outline-none transition-all"
                              />
                              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto no-scrollbar">
                                {filteredCategories.map((cat) => (
                                  <button
                                    type="button"
                                    key={cat.id}
                                    onClick={() => toggleInterest(cat.id)}
                                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                      tempInterests.includes(cat.id)
                                        ? "bg-primary text-white"
                                        : "bg-background text-foreground hover:bg-secondary/80 border border-border"
                                    }`}
                                  >
                                    {cat.emoji} {cat.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Cities - Collapsible */}
                    <div className="bg-secondary/50 rounded-lg border border-border overflow-hidden">
                      <div
                        onClick={() => {
                          const newState = !isCitiesExpanded;
                          setIsCitiesExpanded(newState);
                          if (newState) {
                            setIsCategoriesExpanded(false);
                            setIsRadarWordsExpanded(false);
                          }
                        }}
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/70 transition-all"
                      >
                        <h4 className="font-bold text-sm">المدن والمناطق</h4>
                        <ChevronDown
                          size={18}
                          className={`text-muted-foreground transition-transform duration-200 ${
                            isCitiesExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                      <AnimatePresence>
                        {isCitiesExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden border-t border-border"
                          >
                            <div className="p-3 space-y-3">
                              {/* Options: جميع المدن or مدن محددة */}
                              <div className="flex gap-2 w-full">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (navigator.vibrate) {
                                      navigator.vibrate(10);
                                    }
                                    // اختيار "جميع المدن" = نزيل كل المدن المحددة ونضيف "كل المدن" فقط (حصري)
                                    setTempCities(["كل المدن"]);
                                  }}
                                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    tempCities.includes("كل المدن")
                                      ? "bg-primary text-white shadow-sm"
                                      : "bg-background text-foreground hover:bg-secondary/80 border border-border"
                                  }`}
                                >
                                  <MapPin size={16} />
                                  <div className="flex flex-col items-center">
                                    <span>جميع المدن</span>
                                    <span className="text-[10px] opacity-75">
                                      يشمل عن بُعد
                                    </span>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (navigator.vibrate) {
                                      navigator.vibrate(10);
                                    }
                                    // اختيار "مدن محددة" = نزيل "كل المدن" ونبقي على أي مدن موجودة
                                    const filtered = tempCities.filter((c) =>
                                      c !== "كل المدن"
                                    );
                                    // إذا ما فيه مدن بعد الفلترة، نحط مصفوفة فارغة (يعني waiting for user to select)
                                    setTempCities(filtered);
                                  }}
                                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    !tempCities.includes("كل المدن")
                                      ? "bg-primary text-white shadow-sm"
                                      : "bg-background text-foreground hover:bg-secondary/80 border border-border"
                                  }`}
                                >
                                  <MapPin size={16} />
                                  <span>مدن محددة</span>
                                </button>
                              </div>

                              {/* Selected Cities Chips - فقط عندما تكون "مدن محددة" */}
                              {tempCities.length > 0 &&
                                !tempCities.includes("كل المدن") &&
                                tempCities.filter((c) => c !== "عن بعد")
                                    .length >
                                  0 &&
                                (
                                  <div className="flex flex-wrap justify-start gap-1.5 w-full">
                                    {tempCities.filter((c) => c !== "عن بعد")
                                      .map(
                                        (
                                          city,
                                        ) => (
                                          <motion.span
                                            key={city}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-sm border border-primary/30"
                                          >
                                            <MapPin size={12} />
                                            <span>{city}</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (navigator.vibrate) {
                                                  navigator.vibrate(10);
                                                }
                                                toggleCity(city);
                                              }}
                                              className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                                            >
                                              <X size={12} />
                                            </button>
                                          </motion.span>
                                        ),
                                      )}
                                    {tempCities.includes("عن بعد") && (
                                      <motion.span
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-sm border border-primary/30"
                                      >
                                        <Globe size={12} />
                                        <span>عن بعد</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (navigator.vibrate) {
                                              navigator.vibrate(10);
                                            }
                                            toggleCity("عن بعد");
                                          }}
                                          className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                                        >
                                          <X size={12} />
                                        </button>
                                      </motion.span>
                                    )}
                                  </div>
                                )}

                              {/* City Autocomplete - فقط عندما تكون "مدن محددة" */}
                              {!tempCities.includes("كل المدن") && (
                                <CityAutocomplete
                                  value={tempCitySearch}
                                  onChange={(val) => {
                                    setTempCitySearch(val);
                                    // Removed handleCitySearch call
                                  }}
                                  placeholder="ابحث عن مدن، معالم، أو محلات..."
                                  multiSelect
                                  showAllCitiesOption
                                  selectedCities={tempCities}
                                  onSelectCity={(city) => {
                                    if (navigator.vibrate) {
                                      navigator.vibrate(10);
                                    }
                                    toggleCity(city);
                                  }}
                                  onRemoveCity={(city) => {
                                    if (navigator.vibrate) {
                                      navigator.vibrate(10);
                                    }
                                    toggleCity(city);
                                  }}
                                  showRemoteOption
                                  showGPSOption
                                  showMapOption
                                  onOpenMap={() => {
                                    if (navigator.vibrate) {
                                      navigator.vibrate(10);
                                    }
                                    // فتح Google Maps في نافذة جديدة
                                    const mapsUrl =
                                      `https://www.google.com/maps/search/?api=1&query=المملكة+العربية+السعودية`;
                                    globalThis.open(mapsUrl, "_blank");
                                  }}
                                  hideChips
                                  dropdownDirection="up"
                                />
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Radar Words - Collapsible */}
                    <div className="bg-secondary/50 rounded-lg border border-border overflow-hidden">
                      <div
                        onClick={() => {
                          const newState = !isRadarWordsExpanded;
                          setIsRadarWordsExpanded(newState);
                          if (newState) {
                            setIsCategoriesExpanded(false);
                            setIsCitiesExpanded(false);
                          }
                        }}
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/70 transition-all"
                      >
                        <h4 className="font-bold text-sm">رادار الكلمات</h4>
                        <ChevronDown
                          size={18}
                          className={`text-muted-foreground transition-transform duration-200 ${
                            isRadarWordsExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                      <AnimatePresence>
                        {isRadarWordsExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden border-t border-border"
                          >
                            <div className="p-3 space-y-3">
                              <p className="text-xs text-muted-foreground">
                                إذا كان الطلب يتضمن إحدى هذه الكلمات، سيتم
                                إشعارك
                              </p>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="اكتب الكلمة..."
                                  value={newRadarWord}
                                  onChange={(e) =>
                                    setNewRadarWord(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      addRadarWord();
                                    }
                                  }}
                                  className="flex-1 text-xs px-3 py-1.5 rounded-lg border-2 border-[#1E968C]/30 bg-background focus:border-[#178075] focus:outline-none transition-all"
                                />
                                <button
                                  type="button"
                                  onClick={addRadarWord}
                                  disabled={!newRadarWord.trim()}
                                  className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              {tempRadarWords.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {tempRadarWords.map((word) => (
                                    <div
                                      key={word}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 text-primary border border-primary/30 text-sm"
                                    >
                                      <span>{word}</span>
                                      <button
                                        type="button"
                                        onClick={() => removeRadarWord(word)}
                                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Footer with Action Button */}
                  <div className="border-t border-border/50 bg-card/95 backdrop-blur-xl px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsManageInterestsOpen(false)}
                        className="flex-1 h-12 px-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors font-bold text-sm"
                      >
                        إلغاء
                      </button>
                      <Button
                        className="flex-1 h-12 text-sm font-bold shadow-lg gap-2 rounded-xl"
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate(15);
                          handleSaveInterests();
                        }}
                      >
                        حفظ وتطبيق
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>,
              document.body,
            )}

            {/* Content Views - Grid / Text */}
            <div className="relative">
              <AnimatePresence mode="wait">
                {displayMode === "text"
                  ? (
                    <motion.div
                      key="text-view"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.25 }}
                      className="relative"
                    >
                      <CompactListView
                        requests={filteredRequests}
                        myOffers={myOffers}
                        userId={user?.id}
                        isGuest={isGuest}
                        viewedRequestIds={viewedRequestIds}
                        isLoadingViewedRequests={isLoadingViewedRequests}
                        newRequestIds={newRequestIds}
                        showCategoriesInStatus={viewMode === "all"}
                        onSelectRequest={(req) => {
                          // Marketplace: ServiceCard clicked
                          if (isGuest) {
                            setGuestViewedIds((prev) => {
                              const newSet = new Set(prev);
                              newSet.add(req.id);
                              try {
                                localStorage.setItem(
                                  "guestViewedRequestIds",
                                  JSON.stringify([...newSet]),
                                );
                              } catch (e) {
                                logger.error(
                                  "Error saving guest viewed requests:",
                                  e,
                                );
                              }
                              return newSet;
                            });
                          }
                          // Calling parent onSelectRequest
                          onSelectRequest(req);
                        }}
                        onLoadMore={onLoadMore}
                        hasMore={hasMore}
                        isLoadingMore={isLoadingMore}
                        onBumpRequest={onBumpRequest}
                        onEditRequest={onEditRequest}
                        onHideRequest={onHideRequest}
                        onUnhideRequest={onUnhideRequest}
                        onArchiveRequest={onArchiveRequest}
                        onReportRequest={handleReportRequest}
                        onRefresh={onRefresh}
                        radarWords={radarWords}
                        expandedRequestId={expandedRequestId}
                        onToggleExpand={handleToggleExpand}
                      />
                    </motion.div>
                  )
                  : (
                    <motion.div
                      key="grid-view"
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      transition={{ duration: 0.25 }}
                    >
                      {/* Original Grid View */}
                      <div className="relative -mx-4">
                        <div className="w-full pt-4 pb-20">
                          <motion.div
                            key={`grid-${searchCategories.join(",")}-${
                              searchCities.join(",")
                            }-${searchTerm}-${searchBudgetMin}-${searchBudgetMax}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className="grid grid-cols-1 gap-6 min-h-[100px] pt-2"
                          >
                            {filteredRequests.map((req, index) => {
                              const myOffer = getMyOffer(req.id);
                              const requestAuthorId = (
                                req as { authorId?: string; author_id?: string }
                              ).authorId ||
                                (
                                  req as {
                                    authorId?: string;
                                    author_id?: string;
                                  }
                                ).author_id || req.author;
                              const isMyRequest = !!user?.id &&
                                requestAuthorId === user.id;
                              const isNinthItem = index === 8; // 9th item (0-indexed)
                              const isTouchHovered =
                                touchHoveredCardId === req.id; // هل الإصبع فوق هذا الكارت؟
                              // نقطة القراءة تظهر فقط على الطلبات التي لم يفتحها المستخدم أبداً
                              // ولا تظهر أثناء تحميل viewedRequestIds لتجنب الظهور المؤقت على كل الطلبات
                              const isUnread = !isMyRequest &&
                                !isLoadingViewedRequests &&
                                !viewedRequestIds.has(req.id); // طلب غير مقروء
                              return (
                                <div key={req.id} className="flex">
                                  <motion.div
                                    ref={(el) => {
                                      // Store ref in cardRefs map for touch detection
                                      if (el) {
                                        cardRefs.current.set(req.id, el);
                                      }
                                      // Also handle ninthItemRef
                                      if (isNinthItem && el) {
                                        (ninthItemRef as React.MutableRefObject<
                                          HTMLDivElement | null
                                        >).current = el;
                                      }
                                    }}
                                    data-request-id={req.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={isTouchHovered
                                      ? { opacity: 1, y: -8, scale: 1.02 }
                                      : { opacity: 1, y: 0, scale: 1 }}
                                    transition={{
                                      type: "spring",
                                      stiffness: 400,
                                      damping: 30,
                                      delay: index < 9 ? index * 0.03 : 0, // تأخير خفيف فقط لأول 9 كروت
                                    }}
                                    whileHover={{ y: -8, scale: 1.02 }}
                                    className={`w-full bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col cursor-pointer relative shadow-sm hover:shadow-md hover:border-primary/20 ${
                                      isTouchHovered ? "" : "group"
                                    }`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      // Update guest viewed requests in localStorage
                                      if (isGuest) {
                                        setGuestViewedIds((prev) => {
                                          const newSet = new Set(prev);
                                          newSet.add(req.id);
                                          try {
                                            localStorage.setItem(
                                              "guestViewedRequestIds",
                                              JSON.stringify([...newSet]),
                                            );
                                          } catch (e) {
                                            logger.error(
                                              "Error saving guest viewed requests:",
                                              e,
                                            );
                                          }
                                          return newSet;
                                        });
                                      }
                                      onSelectRequest(req);
                                    }}
                                    onTouchStart={(e) => {
                                      // Prevent scroll interference
                                      e.stopPropagation();
                                    }}
                                    onTouchEnd={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      // Update guest viewed requests in localStorage
                                      if (isGuest) {
                                        setGuestViewedIds((prev) => {
                                          const newSet = new Set(prev);
                                          newSet.add(req.id);
                                          try {
                                            localStorage.setItem(
                                              "guestViewedRequestIds",
                                              JSON.stringify([...newSet]),
                                            );
                                          } catch (e) {
                                            logger.error(
                                              "Error saving guest viewed requests:",
                                              e,
                                            );
                                          }
                                          return newSet;
                                        });
                                      }
                                      onSelectRequest(req);
                                    }}
                                  >
                                    {/* My Request Indicator - مؤشر طلبي الخاص */}
                                    {isMyRequest && (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute top-3 left-3 z-20 w-7 h-7 rounded-full bg-teal-600 backdrop-blur-sm flex items-center justify-center shadow-md border border-white/30"
                                        title="هذا طلبك"
                                      >
                                        <UserIcon
                                          size={14}
                                          className="text-white"
                                        />
                                      </motion.div>
                                    )}
                                    {/* Viewed Indicator - مؤشر المشاهدة (فتحت هذا الطلب سابقاً) */}
                                    {!isMyRequest &&
                                      viewedRequestIds.has(req.id) &&
                                      (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          className="absolute top-3 left-3 z-20 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
                                          title="فتحت هذا الطلب سابقاً"
                                        >
                                          <Eye
                                            size={14}
                                            className="text-white/80"
                                          />
                                        </motion.div>
                                      )}
                                    {/* Unread Indicator - نقطة القراءة (طلب غير مقروء) */}
                                    {isUnread && !isMyRequest && (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute top-3 right-3 z-20 w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50 border-2 border-white dark:border-card"
                                        title="طلب غير مقروء"
                                      />
                                    )}
                                    {/* Category Icon Section - As Primary Visual */}
                                    <motion.div className="h-40 w-full relative overflow-hidden bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors duration-500">
                                      {/* Background Decoration */}
                                      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-foreground to-transparent" />

                                      {/* Animated Pattern */}
                                      <motion.div
                                        className="absolute -inset-20 opacity-[0.05]"
                                        style={{
                                          backgroundImage:
                                            `repeating-linear-gradient(45deg, currentColor, currentColor 1px, transparent 1px, transparent 20px)`,
                                          backgroundSize: "40px 40px",
                                        }}
                                        animate={{
                                          backgroundPosition: [
                                            "0px 0px",
                                            "40px 40px",
                                          ],
                                        }}
                                        transition={{
                                          duration: 20,
                                          repeat: Infinity,
                                          ease: "linear",
                                        }}
                                      />

                                      {/* Main Category Icon */}
                                      {(() => {
                                        // Find the first/main category
                                        const mainCatLabel = req.categories
                                          ?.[0];
                                        const mainCatObj = mainCatLabel
                                          ? categories.find(
                                            (c) =>
                                              c.label === mainCatLabel ||
                                              c.id === mainCatLabel,
                                          )
                                          : null;

                                        return (
                                          <motion.div
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{
                                              type: "spring",
                                              stiffness: 300,
                                              damping: 20,
                                            }}
                                            className="relative z-10 flex flex-col items-center gap-3"
                                          >
                                            <div className="w-16 h-16 rounded-3xl bg-background shadow-lg shadow-black/5 flex items-center justify-center border border-border/50 group-hover:scale-110 group-hover:shadow-xl transition-all duration-500">
                                              <CategoryIcon
                                                icon={mainCatObj?.icon}
                                                emoji={mainCatObj?.emoji}
                                                size={32}
                                              />
                                            </div>
                                            {/* Optional: Show image count if images exist, but subtly */}
                                            {req.images &&
                                              req.images.length > 0 && (
                                              <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-md border-2 border-white dark:border-card">
                                                <Camera size={12} />
                                              </div>
                                            )}
                                          </motion.div>
                                        );
                                      })()}
                                    </motion.div>

                                    {/* Title & Description Below Image */}
                                    <div className="px-5 pt-4 pb-2">
                                      <h3 className="text-base font-bold text-foreground line-clamp-1">
                                        <HighlightedText
                                          text={req.title}
                                          words={radarWords}
                                        />
                                      </h3>
                                      <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed mt-1">
                                        <HighlightedText
                                          text={req.description}
                                          words={radarWords}
                                        />
                                      </p>

                                      {/* First Row: Location Only */}
                                      {req.location && (
                                        <div className="flex items-center gap-1.5 text-muted-foreground/70 font-medium text-xs mt-2">
                                          <MapPin
                                            size={13}
                                            className="text-primary/60"
                                          />
                                          {req.location}
                                        </div>
                                      )}

                                      {/* Second Row: Categories - On their own line - Show only when status is active */}
                                      {req.categories &&
                                        req.categories.length > 0 &&
                                        req.status !== "assigned" &&
                                        req.status !== "completed" && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                          {req.categories.map(
                                            (catLabel, idx) => {
                                              // البحث عن التصنيف للحصول على الأيقونة والاسم بناءً على اللغة
                                              // catLabel قد يكون label (عربي) أو id (إنجليزي)
                                              const categoryObj = categories
                                                .find(
                                                  (c) =>
                                                    c.label === catLabel ||
                                                    c.id === catLabel,
                                                );
                                              // نعرض الاسم بناءً على اللغة الحالية
                                              const displayLabel = categoryObj
                                                ? getCategoryLabel(
                                                  categoryObj,
                                                  locale,
                                                )
                                                : catLabel;
                                              const categoryId =
                                                categoryObj?.id ||
                                                catLabel;

                                              return (
                                                <span
                                                  key={idx}
                                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                                    getKnownCategoryColor(
                                                      categoryId,
                                                    )
                                                  }`}
                                                >
                                                  <CategoryIcon
                                                    icon={categoryObj?.icon}
                                                    emoji={categoryObj?.emoji}
                                                    size={12}
                                                  />
                                                  <span className="truncate max-w-[80px]">
                                                    {displayLabel}
                                                  </span>
                                                </span>
                                              );
                                            },
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    <div className="px-5 pb-5 flex-1 flex flex-col relative">
                                      {/* Request Info - Clean Professional Layout with Floating Labels */}
                                      <div className="mb-4 mt-4">
                                        {/* Seriousness Indicator - مؤشر الجدية */}
                                        {isMyRequest && (() => {
                                          const receivedOffers =
                                            receivedOffersMap.get(req.id) || [];
                                          const offersCount =
                                            receivedOffers.length;
                                          const seriousness =
                                            calculateSeriousness(
                                              offersCount,
                                            );
                                          // استخدام القيمة المحفوظة في الطلب إذا كانت متوفرة، وإلا حسابها من عدد العروض
                                          const finalSeriousness =
                                            req.seriousness || seriousness;
                                          const seriousnessLabels = [
                                            "",
                                            "منخفضة جداً",
                                            "منخفضة",
                                            "متوسطة",
                                            "عالية",
                                            "عالية جداً",
                                          ];
                                          const seriousnessColors = [
                                            "",
                                            "text-red-600 bg-red-50 border-red-200",
                                            "text-orange-600 bg-orange-50 border-orange-200",
                                            "text-blue-600 bg-blue-50 border-blue-200",
                                            "text-green-600 bg-green-50 border-green-200",
                                            "text-emerald-600 bg-emerald-50 border-emerald-200",
                                          ];
                                          return (
                                            <div className="mb-3 flex items-center justify-center">
                                              <div
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                                                  seriousnessColors[
                                                    finalSeriousness
                                                  ] || seriousnessColors[3]
                                                }`}
                                              >
                                                الجدية: {seriousnessLabels[
                                                  finalSeriousness
                                                ] || seriousnessLabels[3]}{" "}
                                                ({offersCount}{" "}
                                                {offersCount === 1
                                                  ? "عرض"
                                                  : "عروض"})
                                              </div>
                                            </div>
                                          );
                                        })()}

                                        {/* Location, Budget, and Delivery Time - Compact Badge Row */}
                                        <div className="flex flex-wrap gap-2 mt-4">
                                          {/* City */}
                                          {req.location && (
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/40 border border-border/50 text-xs font-medium text-foreground/80">
                                              <MapPin
                                                size={13}
                                                className="text-primary/70"
                                              />
                                              <span className="truncate max-w-[100px]">
                                                {req.location.split("،")[0]}
                                              </span>
                                            </div>
                                          )}

                                          {/* Budget */}
                                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/40 border border-border/50 text-xs font-medium text-foreground/80">
                                            <DollarSign
                                              size={13}
                                              className="text-primary/70"
                                            />
                                            <span>
                                              {req.budgetType === "fixed" &&
                                                  req.budgetMin && req.budgetMax
                                                ? `${req.budgetMin}-${req.budgetMax} ر.س`
                                                : "غير محددة"}
                                            </span>
                                          </div>

                                          {/* Delivery Time */}
                                          {req.deliveryTimeFrom && (
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/40 border border-border/50 text-xs font-medium text-foreground/80">
                                              <Clock
                                                size={13}
                                                className="text-primary/70"
                                              />
                                              <span>
                                                {req.deliveryTimeFrom}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="mt-auto pt-4 pb-4 px-5 border-t border-border">
                                        {/* Action Area */}
                                        <div className="flex flex-col gap-3">
                                          <div className="flex items-center justify-center">
                                            {req.status === "assigned" ||
                                                req.status === "completed"
                                              ? (
                                                <div className="w-full h-9 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-muted text-muted-foreground">
                                                  <Lock size={14} />
                                                  منتهي
                                                </div>
                                              )
                                              : isMyRequest
                                              ? (
                                                (() => {
                                                  const receivedOffers =
                                                    receivedOffersMap.get(
                                                      req.id,
                                                    ) ||
                                                    [];
                                                  const offersCount =
                                                    receivedOffers.length;
                                                  return (
                                                    <motion.button
                                                      type="button"
                                                      whileHover={{
                                                        scale: 1.02,
                                                      }}
                                                      whileTap={{ scale: 0.96 }}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (
                                                          navigator.vibrate
                                                        ) {
                                                          navigator.vibrate([
                                                            10,
                                                            30,
                                                            10,
                                                          ]);
                                                        }
                                                        onSelectRequest(
                                                          req,
                                                          false,
                                                        ); // Open request without scrolling to offer section
                                                      }}
                                                      onPointerDown={(e) =>
                                                        e.stopPropagation()}
                                                      onTouchStart={(e) =>
                                                        e.stopPropagation()}
                                                      className="w-full h-9 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-primary border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all relative overflow-visible"
                                                    >
                                                      <UserIcon
                                                        size={14}
                                                        className="text-primary"
                                                      />
                                                      <span className="flex items-center gap-1">
                                                        طلبي
                                                        {offersCount > 0 && (
                                                          <span className="text-primary/70 font-bold text-[10px] animate-pulse whitespace-nowrap">
                                                            ({offersCount}{" "}
                                                            {offersCount === 1
                                                              ? "عرض"
                                                              : "عروض"})
                                                          </span>
                                                        )}
                                                      </span>
                                                      {/* Notification badge for offers count */}
                                                      {offersCount > 0 && (
                                                        <motion.span
                                                          initial={{ scale: 0 }}
                                                          animate={{ scale: 1 }}
                                                          className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md z-30 border border-white dark:border-gray-900"
                                                        >
                                                          {offersCount}
                                                        </motion.span>
                                                      )}
                                                    </motion.button>
                                                  );
                                                })()
                                              )
                                              : myOffer
                                              ? (
                                                <motion.div
                                                  initial={{
                                                    scale: 0.9,
                                                    opacity: 0,
                                                  }}
                                                  animate={{
                                                    scale: 1,
                                                    opacity: 1,
                                                  }}
                                                  className={`w-full h-9 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${
                                                    myOffer.status ===
                                                        "accepted"
                                                      ? "bg-primary/15 text-primary"
                                                      : myOffer.status ===
                                                          "negotiating"
                                                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                                      : "bg-primary/15 text-primary"
                                                  }`}
                                                >
                                                  {myOffer.status === "accepted"
                                                    ? <CheckCircle size={16} />
                                                    : myOffer.status ===
                                                        "negotiating"
                                                    ? (
                                                      <MessageCircle
                                                        size={16}
                                                      />
                                                    )
                                                    : <CheckCircle size={16} />}

                                                  {myOffer.status === "accepted"
                                                    ? "تم قبول عرضك"
                                                    : myOffer.status ===
                                                        "negotiating"
                                                    ? "قيد التفاوض"
                                                    : "تم التقديم"}
                                                </motion.div>
                                              )
                                              : (
                                                <motion.button
                                                  type="button"
                                                  initial={false}
                                                  whileHover={{
                                                    scale: 1.02,
                                                  }}
                                                  whileTap={{
                                                    scale: 0.98,
                                                  }}
                                                  animate={isTouchHovered
                                                    ? {
                                                      scale: 1.02,
                                                    }
                                                    : {}}
                                                  transition={{
                                                    type: "spring",
                                                    stiffness: 800,
                                                    damping: 15,
                                                    mass: 0.5,
                                                  }}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Quick haptic
                                                    if (navigator.vibrate) {
                                                      navigator.vibrate(10);
                                                    }
                                                    // Offer modal removed
                                                  }}
                                                  onPointerDown={(e) =>
                                                    e.stopPropagation()}
                                                  onPointerUp={(e) =>
                                                    e.stopPropagation()}
                                                  onTouchStart={(e) =>
                                                    e.stopPropagation()}
                                                  onTouchEnd={(e) =>
                                                    e.stopPropagation()}
                                                  className="w-full h-9 px-4 text-xs font-bold rounded-xl bg-primary text-white relative overflow-hidden animate-button-breathe"
                                                >
                                                  {/* Ping Ring - Pulsing border effect */}
                                                  <motion.span
                                                    className="absolute -inset-1 rounded-xl border-[3px] border-primary pointer-events-none"
                                                    animate={{
                                                      scale: [1, 1.2, 1.35],
                                                      opacity: [0.7, 0.3, 0],
                                                    }}
                                                    transition={{
                                                      duration: 1.8,
                                                      repeat: Infinity,
                                                      ease: "easeOut",
                                                    }}
                                                  />
                                                  <motion.span
                                                    className="absolute -inset-0.5 rounded-xl border-2 border-primary/80 pointer-events-none"
                                                    animate={{
                                                      scale: [1, 1.1, 1.18],
                                                      opacity: [0.8, 0.4, 0],
                                                    }}
                                                    transition={{
                                                      duration: 1.8,
                                                      repeat: Infinity,
                                                      ease: "easeOut",
                                                      delay: 0.3,
                                                    }}
                                                  />
                                                  {/* Always-on diagonal shimmer - from NE (top-right) to SW (bottom-left) */}
                                                  {/* Light mode shimmer - more visible */}
                                                  <span
                                                    className="absolute inset-0 pointer-events-none animate-shimmer-diagonal dark:hidden"
                                                    style={{
                                                      background:
                                                        "linear-gradient(315deg, transparent 0%, transparent 35%, rgba(255, 255, 255, 0.12) 50%, transparent 65%, transparent 100%)",
                                                      backgroundSize:
                                                        "200% 200%",
                                                    }}
                                                  />
                                                  {/* Dark mode shimmer - lighter */}
                                                  <span
                                                    className="absolute inset-0 pointer-events-none animate-shimmer-diagonal hidden dark:block"
                                                    style={{
                                                      background:
                                                        "linear-gradient(315deg, transparent 0%, transparent 35%, rgba(255, 255, 255, 0.05) 50%, transparent 65%, transparent 100%)",
                                                      backgroundSize:
                                                        "200% 200%",
                                                    }}
                                                  />
                                                  {/* Intensified shimmer on hover/touch - Light mode */}
                                                  <span
                                                    className={`absolute inset-0 pointer-events-none opacity-0 dark:hidden ${
                                                      isTouchHovered
                                                        ? "opacity-30"
                                                        : "group-hover:opacity-30"
                                                    } transition-opacity duration-300 bg-gradient-to-tr from-white/20 via-white/40 to-transparent`}
                                                  />

                                                  {/* Button Content */}
                                                  <span className="relative z-10 flex items-center justify-center gap-2">
                                                    <span className="bg-white/20 p-1 rounded-full backdrop-blur-sm">
                                                      <Plus
                                                        size={14}
                                                        strokeWidth={3}
                                                        className="text-white"
                                                      />
                                                    </span>
                                                    <span>تقديم عرض</span>
                                                  </span>
                                                </motion.button>
                                              )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                </div>
                              );
                            })}
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>
            {filteredRequests.length > 0 && (
              <>
                <div ref={loadMoreTriggerRef} className="h-4 w-full" />
                <div
                  className={`pb-32 flex flex-col justify-start ${
                    isLoadingMore ||
                      (hasMore && filteredRequests.length >= 9) ||
                      (!hasMore && filteredRequests.length > 0)
                      ? "min-h-[200px]"
                      : ""
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {isLoadingMore
                      ? (
                        <motion.div
                          key="loading-more"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-8 w-full"
                        >
                          <CardsGridSkeleton count={3} showLogo={false} />
                          <div className="flex flex-col items-center gap-3 py-4">
                            <div className="relative w-10 h-10">
                              <div className="absolute inset-0 rounded-full border-2 border-primary/10" />
                              <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
                            </div>
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] animate-pulse">
                              جاري جلب المزيد...
                            </span>
                          </div>
                        </motion.div>
                      )
                      : hasMore && !pullToRefreshState.isRefreshing &&
                          filteredRequests.length >= 9
                      ? (
                        <motion.div
                          key="load-more-button"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex flex-col items-center gap-4 py-2 w-full"
                        >
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            animate={{
                              y: [0, 8, 0],
                            }}
                            transition={{
                              y: {
                                repeat: Infinity,
                                duration: 2,
                                ease: "easeInOut",
                              },
                            }}
                            onClick={() => {
                              if (onLoadMore) {
                                onLoadMore();
                                // Haptic feedback
                                if (navigator.vibrate) {
                                  navigator.vibrate(10);
                                }
                              }
                            }}
                            className="relative w-14 h-14 flex items-center justify-center group"
                          >
                            {/* Background Progress Circle - Matching pull-to-refresh style */}
                            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                              <circle
                                cx="28"
                                cy="28"
                                r="24"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                fill="transparent"
                                className="text-primary/10 group-hover:text-primary/20 transition-colors"
                              />
                              <circle
                                cx="28"
                                cy="28"
                                r="24"
                                stroke="url(#load-more-gradient-v3)"
                                strokeWidth="3"
                                fill="transparent"
                                strokeDasharray={150.7}
                                strokeDashoffset={150.7 * 0.4}
                                strokeLinecap="round"
                                className="opacity-40 group-hover:opacity-100 transition-opacity"
                              />
                              <defs>
                                <linearGradient
                                  id="load-more-gradient-v3"
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

                            {/* Inner Circle with Arrow */}
                            <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-primary shadow-xl border border-primary/10 group-hover:border-primary/30 transition-all">
                              <motion.div
                                animate={{ y: [0, 3, 0] }}
                                transition={{
                                  repeat: Infinity,
                                  duration: 1.5,
                                  ease: "easeInOut",
                                }}
                              >
                                <ArrowDown size={22} strokeWidth={2.5} />
                              </motion.div>
                            </div>
                          </motion.button>
                          <div className="text-center text-[11px] font-extrabold text-muted-foreground/50 uppercase tracking-[0.2em]">
                            اضغط للتحميل اليدوي أو مرر للأسفل
                          </div>
                        </motion.div>
                      )
                      : !hasMore && filteredRequests.length > 0
                      ? (
                        <motion.div
                          key="end-of-content"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="relative overflow-hidden p-8 rounded-[2.5rem] bg-gradient-to-b from-secondary/20 to-transparent border border-border/40 text-center group max-w-md mx-auto mt-8"
                        >
                          {/* Decorative background elements */}
                          <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/8 transition-colors" />
                          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/8 transition-colors" />

                          <div className="relative z-10 space-y-5">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-2 shadow-inner">
                              <Check size={28} strokeWidth={3} />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-lg font-black text-foreground">
                                لقد وصلت للنهاية!
                              </h3>
                              <p className="text-sm text-muted-foreground max-w-[260px] mx-auto leading-relaxed font-medium">
                                تم عرض كافة الطلبات المتاحة حالياً. تأكد من تحديث
                                الصفحة باستمرار لرؤية العروض الجديدة فور وصولها.
                              </p>
                            </div>

                            {/* زر العودة للأعلى والتحديث */}
                            <div className="pt-4 flex flex-col items-center gap-3">
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  // Haptic feedback
                                  if (navigator.vibrate) navigator.vibrate(15);

                                  // Scroll to top first
                                  if (marketplaceScrollRef.current) {
                                    marketplaceScrollRef.current.scrollTo({
                                      top: 0,
                                      behavior: "smooth",
                                    });
                                  }

                                  // Show refresh indicator and trigger refresh
                                  setPullToRefreshState({
                                    isPulling: false,
                                    pullDistance: 0,
                                    isRefreshing: true,
                                  });

                                  // Trigger actual refresh
                                  if (onRefresh) {
                                    onRefresh();
                                  }

                                  // Keep the spinner for at least 1.5s for visual feedback
                                  setTimeout(() => {
                                    setPullToRefreshState({
                                      isPulling: false,
                                      pullDistance: 0,
                                      isRefreshing: false,
                                    });
                                  }, 1500);
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                              >
                                <RotateCw size={16} strokeWidth={2.5} />
                                <span>تحديث والعودة للأعلى</span>
                                <ChevronUp size={16} strokeWidth={2.5} />
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      )
                      : null}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Offer Submission Modal - TODO: Re-implement OfferSubmissionModal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetId={activeReportRequestId || ""}
      />
    </>
  );
};
