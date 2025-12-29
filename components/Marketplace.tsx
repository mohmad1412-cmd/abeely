import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import { Offer, Request } from "../types";
import { AVAILABLE_CATEGORIES } from "../data";
import {
  ArrowRight,
  Bell,
  CheckCircle,
  Clock,
  Compass,
  DollarSign,
  Edit,
  Filter,
  MapPin,
  MessageCircle,
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RotateCw,
  Loader2,
  ArrowDown,
  Plus,
  ExternalLink,
  ImageIcon,
  Lock,
  ArrowLeftRight,
  Menu,
  LogOut,
  Check,
  User,
  Eye,
  WifiOff,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { AnimatePresence, motion } from "framer-motion";
import { CardsGridSkeleton } from "./ui/LoadingSkeleton";
import { UnifiedHeader } from "./ui/UnifiedHeader";

interface MarketplaceProps {
  requests: Request[];
  interestsRequests?: Request[]; // طلبات اهتماماتي فقط
  unreadInterestsCount?: number; // عدد الطلبات غير المقروءة في اهتماماتي
  myOffers: Offer[]; // Pass myOffers to check application status
  onSelectRequest: (req: Request, scrollToOffer?: boolean, fromSidebar?: boolean) => void;
  userInterests: string[];
  onUpdateInterests: (interests: string[]) => void;
  interestedCities: string[];
  onUpdateCities: (cities: string[]) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void; // Callback for pull-to-refresh
  loadError?: string | null;
  savedScrollPosition?: number;
  onScrollPositionChange?: (pos: number) => void;
  // Viewed requests from Backend - الطلبات المشاهدة من قاعدة البيانات
  viewedRequestIds?: Set<string>;
  // Main Header Props
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  mode: 'requests' | 'offers';
  toggleMode: () => void;
  isModeSwitching: boolean;
  unreadCount: number;
  hasUnreadMessages: boolean;
  user: any;
  isGuest: boolean;
  setView: (view: any) => void;
  setPreviousView: (view: any) => void;
  titleKey: number;
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onSignOut: () => void;
  isLoading?: boolean;
}

export const Marketplace: React.FC<MarketplaceProps> = ({
  requests,
  interestsRequests = [],
  unreadInterestsCount = 0,
  myOffers,
  onSelectRequest,
  userInterests,
  onUpdateInterests,
  interestedCities,
  onUpdateCities,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onRefresh,
  loadError = null,
  savedScrollPosition: externalScrollPos = 0,
  onScrollPositionChange,
  // Viewed requests from Backend
  viewedRequestIds: backendViewedIds,
  // Main Header Props
  isSidebarOpen,
  setIsSidebarOpen,
  mode,
  toggleMode,
  isModeSwitching,
  unreadCount,
  hasUnreadMessages,
  user,
  isGuest,
  setView,
  setPreviousView,
  titleKey,
  notifications,
  onMarkAsRead,
  onClearAll,
  onSignOut,
  isLoading = false,
}) => {
  // View mode state - "all" or "interests"
  const [viewMode, setViewMode] = useState<"all" | "interests">("all");

  // Scroll state for glass header animation
  const [isScrolled, setIsScrolled] = useState(false);

  // Offer button pulse animation state
  const [showOfferButtonPulse, setShowOfferButtonPulse] = useState(false);

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

  // Scroll tracking states
  const [hasScrolledPastFirstPage, setHasScrolledPastFirstPage] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isAtTop, setIsAtTop] = useState(false);
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);
  
  // Interests panel visibility based on scroll direction
  const [showInterestsPanel, setShowInterestsPanel] = useState(true);
  const lastScrollY = useRef(0);

  // Touch interaction state
  const [touchHoveredCardId, setTouchHoveredCardId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Viewed requests tracking - الطلبات المشاهدة (من Backend للمسجلين، من localStorage للزوار)
  const [guestViewedIds, setGuestViewedIds] = useState<Set<string>>(new Set()); // للزوار فقط

  // استخدام بيانات Backend إذا كان المستخدم مسجل، وإلا localStorage للزوار
  const viewedRequestIds = isGuest ? guestViewedIds : (backendViewedIds || new Set<string>());

  // Search term state
  const [searchTerm, setSearchTerm] = useState("");

  // Offer button pulse animation every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShowOfferButtonPulse(true);
      setTimeout(() => setShowOfferButtonPulse(false), 2000);
    }, 8000); // Every 8 seconds

    return () => clearInterval(interval);
  }, []);

  // Load viewed requests from localStorage for guests only
  useEffect(() => {
    if (!isGuest) return; // فقط للزوار
    
    try {
      const stored = localStorage.getItem('guestViewedRequestIds');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setGuestViewedIds(new Set<string>(parsed));
        }
      }
    } catch (e) {
      console.error('Error loading guest viewed requests:', e);
    }
  }, [isGuest]);

  // Search Page State
  const [isSearchPageOpen, setIsSearchPageOpen] = useState(false);
  const [iconToggle, setIconToggle] = useState(false);
  const [searchCategories, setSearchCategories] = useState<string[]>([]); // Multi-select
  const [searchCities, setSearchCities] = useState<string[]>([]);         // Multi-select
  const [isSearchCategoriesOpen, setIsSearchCategoriesOpen] = useState(true); // Accordion State
  const [isSearchCitiesOpen, setIsSearchCitiesOpen] = useState(true);         // Accordion State
  const [searchBudgetMin, setSearchBudgetMin] = useState<string>("");
  const [searchBudgetMax, setSearchBudgetMax] = useState<string>("");

  // Interest View States
  const [isManageInterestsOpen, setIsManageInterestsOpen] = useState(false);
  const [notifyOnInterest, setNotifyOnInterest] = useState(true);
  const [radarWords, setRadarWords] = useState<string[]>([]); // Saved radar words

  // Temp state for Modal
  const [tempInterests, setTempInterests] = useState<string[]>(userInterests);
  const [tempCities, setTempCities] = useState<string[]>(interestedCities);
  const [tempCitySearch, setTempCitySearch] = useState("");
  const [tempCatSearch, setTempCatSearch] = useState("");
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [isCitiesExpanded, setIsCitiesExpanded] = useState(false);
  const [tempRadarWords, setTempRadarWords] = useState<string[]>([]);
  const [isRadarWordsExpanded, setIsRadarWordsExpanded] = useState(false);
  const [newRadarWord, setNewRadarWord] = useState("");

  const CITIES = [
    "الرياض", "جدة", "الدمام", "مكة", "المدينة", "الخبر", "أبها", "الطائف", "تبوك", "القصيم",
    "بريدة", "خميس مشيط", "الهفوف", "المبرز", "حفر الباطن", "حائل", "نجران", "الجبيل", "القطيف", "ينبع",
    "الخرج", "الثقبة", "ينبع البحر", "عرعر", "الحوية", "عنيزة", "سكاكا", "جيزان", "القريات", "الظهران",
    "الباحة", "الزلفي", "الرس", "وادي الدواسر", "بيشة", "القنفذة", "رابغ", "عفيف", "الليث"
  ];

  const marketplaceScrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollPosRef = useRef<number>(0);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const ninthItemRef = useRef<HTMLDivElement | null>(null);
  const pullStartY = useRef<number>(0);
  const pullCurrentY = useRef<number>(0);
  const pullDistanceRef = useRef<number>(0); // استخدام ref لتجنب stale closure
  const searchPageScrollRef = useRef<HTMLDivElement>(null); // Ref للسكرول في صفحة البحث
  
  // Pull-to-refresh handlers
  useEffect(() => {
    const container = marketplaceScrollRef.current;
    if (!container || !onRefresh) return;

    const PULL_THRESHOLD = 60; // أقل لإحساس أخف وأسرع
    const MAX_PULL = 90; // أقل لإحساس أنعم

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop !== 0) return; // Only allow pull when at top
      pullStartY.current = e.touches[0].clientY;
      pullCurrentY.current = pullStartY.current;
      pullDistanceRef.current = 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (container.scrollTop !== 0) {
        pullDistanceRef.current = 0;
        setPullToRefreshState({ isPulling: false, pullDistance: 0, isRefreshing: false });
        return;
      }

      pullCurrentY.current = e.touches[0].clientY;
      const pullDistance = Math.max(0, pullCurrentY.current - pullStartY.current);
      
      if (pullDistance > 0) {
        e.preventDefault(); // Prevent default scroll
        const limitedPull = Math.min(pullDistance, MAX_PULL);
        pullDistanceRef.current = limitedPull; // تحديث الـ ref
        setPullToRefreshState({
          isPulling: true,
          pullDistance: limitedPull,
          isRefreshing: false,
        });
      }
    };

    const handleTouchEnd = () => {
      const currentPullDistance = pullDistanceRef.current; // استخدام الـ ref بدلاً من state
      
      if (currentPullDistance >= PULL_THRESHOLD && onRefresh) {
        setPullToRefreshState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: true,
        });
        
        // Haptic feedback - خفيف
        if (navigator.vibrate) {
          navigator.vibrate(25);
        }
        
        // Call refresh
        onRefresh();
        
        // Keep spinner for at least 1.5s for visual feedback
        setTimeout(() => {
          setPullToRefreshState({
            isPulling: false,
            pullDistance: 0,
            isRefreshing: false,
          });
        }, 1500);
      } else {
        setPullToRefreshState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
        });
      }
      pullStartY.current = 0;
      pullCurrentY.current = 0;
      pullDistanceRef.current = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh]);

  // Scroll Listener with debounced position save
  useEffect(() => {
    const container = marketplaceScrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      setIsScrolled(scrollTop > 20);
      lastScrollPosRef.current = scrollTop;
      
      // Reset pull state if user scrolls away from top
      if (scrollTop > 0 && pullToRefreshState.isPulling) {
        setPullToRefreshState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
        });
      }
      
      // Interests panel visibility based on scroll direction
      const scrollDelta = scrollTop - lastScrollY.current;
      if (scrollTop < 50) {
        // Always show when near top
        setShowInterestsPanel(true);
      } else if (scrollDelta > 10) {
        // Scrolling down - hide panel
        setShowInterestsPanel(false);
      } else if (scrollDelta < -10) {
        // Scrolling up - show panel
        setShowInterestsPanel(true);
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
      setShowScrollToTop(hasScrolledPast);

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
          onScrollPositionChange(lastScrollPosRef.current);
        }
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [onScrollPositionChange, pullToRefreshState.isPulling, requests.length, isAtTop, viewMode]);

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

    container.addEventListener('touchmove', handleTouchMoveForCards, { passive: true });
    container.addEventListener('touchend', handleTouchEndForCards, { passive: true });
    container.addEventListener('touchcancel', handleTouchEndForCards, { passive: true });

    return () => {
      container.removeEventListener('touchmove', handleTouchMoveForCards);
      container.removeEventListener('touchend', handleTouchEndForCards);
      container.removeEventListener('touchcancel', handleTouchEndForCards);
    };
  }, []);

  // Track if initial scroll restoration happened
  const initialScrollRestored = useRef(false);
  const prevExternalScrollPos = useRef(externalScrollPos);
  
  // Restore scroll position IMMEDIATELY before browser paint using useLayoutEffect
  useLayoutEffect(() => {
    const container = marketplaceScrollRef.current;
    if (container) {
      // Only restore if scroll position changed from parent or on initial mount
      if (externalScrollPos !== prevExternalScrollPos.current || !initialScrollRestored.current) {
        if (externalScrollPos > 0 || !initialScrollRestored.current) {
          initialScrollRestored.current = true;
          // Set scroll immediately - no delay
          container.scrollTop = externalScrollPos;
        }
        prevExternalScrollPos.current = externalScrollPos;
      }
    }
  }, [externalScrollPos]);
  
  // Save scroll position when component unmounts - useLayoutEffect ensures this runs synchronously before unmount
  useLayoutEffect(() => {
    return () => {
      // Save final scroll position before unmount
      if (onScrollPositionChange && marketplaceScrollRef.current) {
        const currentScroll = marketplaceScrollRef.current.scrollTop;
        if (currentScroll >= 0) {
          lastScrollPosRef.current = currentScroll;
          onScrollPositionChange(currentScroll);
        }
      } else if (onScrollPositionChange && lastScrollPosRef.current >= 0) {
        // Fallback: use last known scroll position if ref is not available
        onScrollPositionChange(lastScrollPosRef.current);
      }
      initialScrollRestored.current = false;
    };
  }, [onScrollPositionChange]);

  // Continuous icon toggle animation
  useEffect(() => {
    const interval = setInterval(() => {
      setIconToggle(prev => !prev);
    }, 2000); // Toggle every 2 seconds
    return () => clearInterval(interval);
  }, []);

  // Reset scroll states when switching between viewMode tabs
  useEffect(() => {
    setShowScrollToTop(false);
    setIsAtTop(false);
    setHasScrolledPastFirstPage(false);
    setSavedScrollPosition(0);
    setShowInterestsPanel(true); // Reset interests panel visibility
    lastScrollY.current = 0;
  }, [viewMode]);

  const handleManageInterests = () => {
    setTempInterests(userInterests);
    setTempCities(interestedCities);
    setTempCitySearch("");
    setTempCatSearch("");
    setTempRadarWords(radarWords); // Load saved radar words
    setIsManageInterestsOpen(true);
  };

  const handleSaveInterests = () => {
    onUpdateInterests(tempInterests);
    onUpdateCities(tempCities);
    setRadarWords(tempRadarWords); // Save radar words
    setIsManageInterestsOpen(false);
  };

  const toggleInterest = (id: string) => {
    setTempInterests(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const toggleCity = (city: string) => {
    setTempCities(prev => 
      prev.includes(city)
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  const filteredCities = CITIES.filter(city => 
    city.toLowerCase().includes(tempCitySearch.toLowerCase())
  );

  const filteredCategories = AVAILABLE_CATEGORIES.filter(cat =>
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
    setTempRadarWords(tempRadarWords.filter(w => w !== word));
  };

  // Helper to get my offer on this request
  const getMyOffer = (reqId: string) => {
    return myOffers.find((o) => o.requestId === reqId);
  };

  // Check if any filter is active
  const hasActiveFilters = searchTerm || searchCategories.length > 0 || searchCities.length > 0 || searchBudgetMin || searchBudgetMax;

  // Reset all search filters
  const handleResetSearch = () => {
    setSearchTerm("");
    setSearchCategories([]);
    setSearchCities([]);
    setSearchBudgetMin("");
    setSearchBudgetMax("");
  };

  // Toggle Category Selection
  const toggleSearchCategory = (id: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setSearchCategories(prev => {
      if (prev.includes(id)) {
        return prev.filter(c => c !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Toggle City Selection
  const toggleSearchCity = (city: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setSearchCities(prev => {
      if (prev.includes(city)) {
        return prev.filter(c => c !== city);
      } else {
        return [...prev, city];
      }
    });
  };

  // Apply search and close modal
  const handleApplySearch = () => {
    setIsSearchPageOpen(false);
  };

  // Use interestsRequests when in interests mode, otherwise use all requests
  const requestsToFilter = viewMode === "interests" ? interestsRequests : requests;

  const filteredRequests = requestsToFilter.filter((req) => {
    // Text search
    if (searchTerm) {
      const matchesSearch = req.title.includes(searchTerm) || req.description.includes(searchTerm);
      if (!matchesSearch) return false;
    }

    // Category filter (Multi-select)
    if (searchCategories.length > 0) {
      // If request has categories, check if any match selected categories
      // Need to compare Arabic labels because req.categories contains labels
      const hasMatch = req.categories?.some(catLabel => 
        searchCategories.some(catId => {
          const categoryObj = AVAILABLE_CATEGORIES.find(c => c.id === catId);
          const interestLabel = categoryObj?.label || catId;
          return catLabel.toLowerCase().includes(interestLabel.toLowerCase()) ||
                 interestLabel.toLowerCase().includes(catLabel.toLowerCase());
        })
      );
      if (!hasMatch) return false;
    }

    // City filter (Multi-select)
    if (searchCities.length > 0) {
      const hasCityMatch = searchCities.some(city => 
        req.location?.toLowerCase().includes(city.toLowerCase()) || 
        city.toLowerCase().includes(req.location?.toLowerCase() || "")
      );
      if (!hasCityMatch) return false;
    }

    // Budget filter
    if (searchBudgetMin) {
      if (Number(req.budgetMax || 0) < parseInt(searchBudgetMin)) return false;
    }
    if (searchBudgetMax) {
      if (Number(req.budgetMin || 0) > parseInt(searchBudgetMax)) return false;
    }

    // In interests mode, all requests in interestsRequests are already filtered by user interests
    // but we still want to apply search and city/budget filters if the user uses them
    return true;
  });

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
    <div 
      id="marketplace-container"
      ref={marketplaceScrollRef}
      className={`h-full overflow-x-hidden container mx-auto max-w-6xl relative no-scrollbar ${
        filteredRequests.length === 0 && !isLoading ? 'overflow-hidden' : 'overflow-y-auto'
      }`}
    >
      {/* Sticky Header Wrapper - Unified with main header */}
      <div 
        ref={headerRef}
        className="sticky top-0 z-[60] px-4 bg-white/80 dark:bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-gray-200/30 dark:border-white/10 shadow-sm"
      >
        <div className="flex flex-col">
          {/* Main Header Content - Transparent when inside Marketplace */}
          <UnifiedHeader
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            mode={mode}
            toggleMode={toggleMode}
            isModeSwitching={isModeSwitching}
            unreadCount={unreadCount}
            hasUnreadMessages={hasUnreadMessages}
            user={user}
            setView={setView}
            setPreviousView={setPreviousView}
            titleKey={titleKey}
            notifications={notifications}
            onMarkAsRead={onMarkAsRead}
            onClearAll={onClearAll}
            onSignOut={onSignOut}
            currentView="marketplace"
            transparent={true}
          />

          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.25,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className={`flex items-center justify-between py-1 gap-2 ${hasActiveFilters ? '' : 'pb-3'}`}
          >
            {/* Left Side - Tabs or Search Term */}
            {searchTerm ? (
              <div className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/20 h-11">
                <Search size={14} className="text-primary shrink-0" strokeWidth={2.5} />
                <span className="text-sm font-bold text-primary truncate max-w-[100px]">{searchTerm}</span>
                <button
                  onClick={() => setSearchTerm("")}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary/15 transition-colors text-primary/70 hover:text-primary shrink-0"
                  title="مسح البحث"
                >
                  <span className="text-[11px] font-medium">خروج</span>
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
             ) : (
               <div className="flex bg-secondary/30 rounded-2xl p-1 border border-border/30 relative min-w-[200px]">
                 <button
                   onClick={() => {
                     if (navigator.vibrate) navigator.vibrate(15);
                     // If filters are active, clear them when clicking "الكل"
                     if (searchCategories.length > 0 || searchCities.length > 0 || searchBudgetMin || searchBudgetMax) {
                       handleResetSearch();
                     }
                     setViewMode("all");
                   }}
                   className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors duration-200 relative flex items-center justify-center gap-2 ${
                     viewMode === "all" && !hasActiveFilters
                       ? "text-white"
                       : "text-muted-foreground hover:text-foreground"
                   }`}
                 >
                   {viewMode === "all" && !hasActiveFilters && (
                     <motion.div 
                       layoutId="active-marketplace-tab"
                       className="absolute inset-0 rounded-xl bg-primary shadow-lg z-0"
                       transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.5 }}
                     />
                   )}
                   <span className="relative z-10">الكل</span>
                 </button>
                 <button
                   onClick={() => {
                     if (navigator.vibrate) navigator.vibrate(15);
                     // If filters are active, clear them when clicking "اهتماماتي"
                     if (searchCategories.length > 0 || searchCities.length > 0 || searchBudgetMin || searchBudgetMax) {
                       handleResetSearch();
                     }
                     setViewMode("interests");
                   }}
                   className={`flex-1 py-3 text-sm font-bold rounded-xl transition-colors duration-200 relative flex items-center justify-center gap-2 ${
                     viewMode === "interests" && !hasActiveFilters
                       ? "text-white"
                       : "text-muted-foreground hover:text-foreground"
                   }`}
                 >
                   {viewMode === "interests" && !hasActiveFilters && (
                     <motion.div 
                       layoutId="active-marketplace-tab"
                       className="absolute inset-0 rounded-xl bg-primary shadow-lg z-0"
                       transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.5 }}
                     />
                   )}
                   <span className="relative z-10">اهتماماتي</span>
                   {(unreadInterestsCount > 0 || interestsRequests.length > 0) && (
                     <span className={`relative z-10 inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold transition-colors ${
                       viewMode === "interests" && !hasActiveFilters ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                     }`}>
                       {interestsRequests.length > 0 ? interestsRequests.length : unreadInterestsCount}
                     </span>
                   )}
                 </button>
               </div>
            )}

            <div className="flex items-center gap-2">
                <button
                onClick={() => setIsSearchPageOpen(true)}
                className={`relative w-11 h-11 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${
                  hasActiveFilters 
                    ? 'bg-primary/10 border-primary/30 text-primary' 
                    : 'bg-card border-border text-muted-foreground hover:text-primary'
                }`}
              >
            <div className="relative w-full h-full flex items-center justify-center">
              {hasActiveFilters ? (
                // أيقونة ثابتة عند وجود فلاتر نشطة
                <Filter size={18} strokeWidth={2.5} />
              ) : (
                // أيقونة متحركة عند عدم وجود فلاتر
                <>
                  <motion.div
                    animate={{ 
                      x: iconToggle ? 0 : -20,
                      opacity: iconToggle ? 1 : 0
                    }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 25,
                      duration: 0.4
                    }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Filter size={18} strokeWidth={2} />
                  </motion.div>
                  <motion.div
                    animate={{ 
                      x: iconToggle ? 20 : 0,
                      opacity: iconToggle ? 0 : 1
                    }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 25,
                      duration: 0.4
                    }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Search size={18} strokeWidth={2} />
                  </motion.div>
                </>
              )}
            </div>
            {/* Badge رقمي يظهر عدد الفلاتر النشطة */}
            {hasActiveFilters && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-md"
              >
                {searchCategories.length + searchCities.length + (searchBudgetMin || searchBudgetMax ? 1 : 0) + (searchTerm ? 1 : 0)}
              </motion.span>
            )}
          </button>
          </div>
          </motion.div>

          {/* Active Filters Display - Second Row */}
          {(searchCategories.length > 0 || searchCities.length > 0 || searchBudgetMin || searchBudgetMax) && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3">
              <div className="flex items-center gap-1.5">
                {/* التصنيفات - إظهار المختارة أو "كل التصنيفات" */}
                {searchCategories.length > 0 ? (
                  searchCategories.map(catId => {
                    const cat = AVAILABLE_CATEGORIES.find(c => c.id === catId);
                    return cat ? (
                      <motion.div
                        key={catId}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 text-primary border border-primary/20 text-xs font-medium shrink-0 hover:bg-primary/10 transition-colors"
                      >
                        <span>{cat.label}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSearchCategory(catId);
                          }}
                          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors -mr-0.5"
                        >
                          <X size={11} strokeWidth={2.5} />
                        </button>
                      </motion.div>
                    ) : null;
                  })
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 text-muted-foreground border border-border/50 text-xs font-medium shrink-0">
                    <Filter size={11} strokeWidth={2} />
                    <span>كل التصنيفات</span>
                  </div>
                )}
                
                {/* المدن - إظهار المختارة أو "كل المدن" */}
                {searchCities.length > 0 ? (
                  searchCities.map(city => (
                    <motion.div
                      key={city}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 text-primary border border-primary/20 text-xs font-medium shrink-0 hover:bg-primary/10 transition-colors"
                    >
                      <MapPin size={11} strokeWidth={2} />
                      <span>{city}</span>
                      <button
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
                ) : (
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
                    <span>{searchBudgetMin && searchBudgetMax ? `${searchBudgetMin} - ${searchBudgetMax}` : searchBudgetMin ? `من ${searchBudgetMin}` : `إلى ${searchBudgetMax}`}</span>
                    <button
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
        </div>
      </div>

      {/* Pull-to-Refresh Indicator - Emerges from under the header */}
      <AnimatePresence>
        {(pullToRefreshState.isPulling || pullToRefreshState.isRefreshing) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: pullToRefreshState.isRefreshing ? 70 : Math.min(pullToRefreshState.pullDistance, 90),
              opacity: 1 
            }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-center overflow-hidden z-10"
          >
            <motion.div 
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="flex flex-col items-center py-2"
            >
              <div className="relative w-12 h-12 flex items-center justify-center">
                {/* Background Progress Circle - Minimal & Discrete */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="1"
                    fill="transparent"
                    className="text-primary/5"
                  />
                  {!pullToRefreshState.isRefreshing && (
                    <motion.circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="url(#pull-gradient-hero)"
                      strokeWidth="1.5"
                      fill="transparent"
                      strokeDasharray={125.6}
                      strokeDashoffset={125.6 - (Math.min(pullToRefreshState.pullDistance / 60, 1) * 125.6)}
                      strokeLinecap="round"
                      className="opacity-30"
                    />
                  )}
                  <defs>
                    <linearGradient id="pull-gradient-hero" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1E968C" />
                      <stop offset="100%" stopColor="#153659" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Icon Container - Floating & Minimal */}
                <motion.div 
                  animate={{ 
                    scale: pullToRefreshState.pullDistance >= 60 ? 1.1 : 1,
                    backgroundColor: pullToRefreshState.isRefreshing ? "transparent" : "rgba(255, 255, 255, 0.2)"
                  }}
                  className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors duration-300"
                >
                  <AnimatePresence mode="wait">
                    {pullToRefreshState.isRefreshing ? (
                      <motion.div
                        key="refreshing-icon"
                        initial={{ opacity: 0, rotate: 0 }}
                        animate={{ opacity: 1, rotate: 360 }}
                        exit={{ opacity: 0 }}
                        transition={{ 
                          rotate: { duration: 1.2, repeat: Infinity, ease: "linear" },
                          opacity: { duration: 0.2 }
                        }}
                        className="text-primary"
                      >
                        <Loader2 size={22} strokeWidth={2.5} className="opacity-80" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="pulling-icon"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1,
                          rotate: (pullToRefreshState.pullDistance / 60) * 360
                        }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className={pullToRefreshState.pullDistance >= 60 ? "text-primary" : "text-primary/40"}
                      >
                        <RotateCw size={18} strokeWidth={2.5} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Scroll to Top Button - Bottom Left */}
      {/* يظهر فقط إذا كان هناك أكثر من 9 طلبات وتم السكرول للأسفل */}
      <AnimatePresence>
        {(showScrollToTop || isAtTop) && filteredRequests.length >= 9 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (marketplaceScrollRef.current) {
                if (isAtTop) {
                  // Return to saved position
                  marketplaceScrollRef.current.scrollTo({ top: savedScrollPosition, behavior: 'smooth' });
                  setIsAtTop(false);
                } else {
                  // Save current position and scroll to top
                  setSavedScrollPosition(marketplaceScrollRef.current.scrollTop);
                  marketplaceScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                  setIsAtTop(true);
                }
              }
            }}
            className="fixed bottom-8 left-8 z-50 w-14 h-14 flex items-center justify-center rounded-2xl bg-card border-2 border-primary text-primary transition-all shadow-xl backdrop-blur-sm"
            style={{ 
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)'
            }}
          >
            <motion.div
              animate={{ rotate: isAtTop ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <ChevronUp size={20} strokeWidth={2.5} />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Search Page Full Screen Modal - نسخة محسّنة */}
      <AnimatePresence>
        {isSearchPageOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="h-full flex flex-col overflow-hidden"
            >
              {/* Search Header */}
              <div className="shrink-0 p-4 border-b border-border bg-card/80 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={() => setIsSearchPageOpen(false)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all text-foreground focus:outline-none bg-card/80 backdrop-blur-sm border border-border shadow-lg hover:bg-card"
                  >
                    <ArrowRight size={22} strokeWidth={2.5} />
                  </motion.button>
                  <div className="flex-1 relative">
                    <Search
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none"
                      size={20}
                      strokeWidth={2}
                    />
                    <input
                      type="text"
                      placeholder="ابحث عن طلب..."
                      className="w-full pr-10 pl-4 py-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-none text-base"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      autoFocus
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Filters Section - محسّن للسكرول */}
              <div 
                ref={searchPageScrollRef}
                className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6"
                style={{ 
                  paddingBottom: '180px', // مساحة للزر السفلي
                  WebkitOverflowScrolling: 'touch' // سكرول سلس على iOS
                }}
              >
                
                {/* Category Filter - Collapsible */}
                <div className="border-b border-border pb-4">
                  <button 
                    onClick={() => setIsSearchCategoriesOpen(!isSearchCategoriesOpen)}
                    className="flex items-center justify-between w-full mb-3 group"
                  >
                    <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                      <Filter size={18} strokeWidth={2.5} className="text-primary" />
                      التصنيف
                    </h3>
                    <ChevronDown size={18} className={`text-muted-foreground transition-transform duration-300 ${isSearchCategoriesOpen ? "rotate-180" : ""}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isSearchCategoriesOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            onClick={() => { if (navigator.vibrate) navigator.vibrate(10); setSearchCategories([]); }}
                            className={`px-4 py-2 rounded-full text-sm border transition-all ${
                              searchCategories.length === 0
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary text-foreground border-transparent hover:bg-secondary/80"
                            }`}
                          >
                            الكل
                          </button>
                          {AVAILABLE_CATEGORIES.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => toggleSearchCategory(cat.id)}
                              className={`px-4 py-2 rounded-full text-sm border transition-all flex items-center gap-2 ${
                                searchCategories.includes(cat.id)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-secondary text-foreground border-transparent hover:bg-secondary/80"
                              }`}
                            >
                              <span>{cat.emoji}</span>
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* City Filter - Collapsible */}
                <div className="border-b border-border pb-4">
                  <button 
                    onClick={() => setIsSearchCitiesOpen(!isSearchCitiesOpen)}
                    className="flex items-center justify-between w-full mb-3 group"
                  >
                    <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                      <MapPin size={18} strokeWidth={2.5} className="text-red-500" />
                      المدينة
                    </h3>
                    <ChevronDown size={18} className={`text-muted-foreground transition-transform duration-300 ${isSearchCitiesOpen ? "rotate-180" : ""}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isSearchCitiesOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                         <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            onClick={() => { if (navigator.vibrate) navigator.vibrate(10); setSearchCities([]); }}
                            className={`px-4 py-2 rounded-full text-sm border transition-all ${
                              searchCities.length === 0
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary text-foreground border-transparent hover:bg-secondary/80"
                            }`}
                          >
                            الكل
                          </button>
                          {CITIES.map((city) => (
                            <button
                              key={city}
                              onClick={() => toggleSearchCity(city)}
                              className={`px-4 py-2 rounded-full text-sm border transition-all ${
                                searchCities.includes(city)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-secondary text-foreground border-transparent hover:bg-secondary/80"
                              }`}
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Budget Filter */}
                <div>
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-foreground">
                    <DollarSign size={18} strokeWidth={2.5} className="text-green-600" />
                    الميزانية
                  </h3>
                  
                  {/* Custom Range Inputs */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        placeholder="أقل مبلغ"
                        className={`w-full px-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm text-center ${
                           searchBudgetMin && searchBudgetMax && Number(searchBudgetMin) > Number(searchBudgetMax) ? "border-red-500 focus:ring-red-500" : "border-border"
                        }`}
                        value={searchBudgetMin}
                        onChange={(e) => setSearchBudgetMin(e.target.value)}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">ر.س</span>
                    </div>
                    <span className="text-muted-foreground">-</span>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        placeholder="أعلى مبلغ"
                        className={`w-full px-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm text-center ${
                           searchBudgetMin && searchBudgetMax && Number(searchBudgetMin) > Number(searchBudgetMax) ? "border-red-500 focus:ring-red-500" : "border-border"
                        }`}
                        value={searchBudgetMax}
                        onChange={(e) => setSearchBudgetMax(e.target.value)}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">ر.س</span>
                    </div>
                  </div>
                  
                  {/* Validation Message */}
                  {searchBudgetMin && searchBudgetMax && Number(searchBudgetMin) > Number(searchBudgetMax) && (
                    <div className="flex items-center gap-2 mt-2 text-red-500 text-xs animate-in slide-in-from-top-1 fade-in">
                      <AlertCircle size={14} />
                      <span className="font-medium">المبلغ الأدنى يجب أن يكون أقل من الأعلى</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Bottom Area (Active Filters + Action Button) - محسّن */}
              <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-xl z-20 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] safe-area-bottom">
                
                {/* Active Filters Summary - Sticky */}
                {hasActiveFilters && (
                  <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border/50">
                     <div className="flex flex-wrap gap-2 max-h-[60px] overflow-y-auto no-scrollbar">
                      {searchTerm && (
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 whitespace-nowrap">
                          {searchTerm}
                          <X size={10} className="cursor-pointer" onClick={() => setSearchTerm("")} />
                        </span>
                      )}
                      {searchCategories.map(catId => (
                        <span key={catId} className="bg-primary/10 text-primary px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 whitespace-nowrap">
                          {AVAILABLE_CATEGORIES.find(c => c.id === catId)?.label}
                          <X size={10} className="cursor-pointer" onClick={() => toggleSearchCategory(catId)} />
                        </span>
                      ))}
                      {searchCities.map(city => (
                        <span key={city} className="bg-primary/10 text-primary px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 whitespace-nowrap">
                          {city}
                          <X size={10} className="cursor-pointer" onClick={() => toggleSearchCity(city)} />
                        </span>
                      ))}
                      {(searchBudgetMin || searchBudgetMax) && (
                        <span className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 whitespace-nowrap ${
                           searchBudgetMin && searchBudgetMax && Number(searchBudgetMin) > Number(searchBudgetMax)
                             ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200"
                             : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200"
                        }`}>
                          {searchBudgetMin && searchBudgetMax && Number(searchBudgetMin) > Number(searchBudgetMax) && <AlertCircle size={10} />}
                          {searchBudgetMin || "0"} - {searchBudgetMax || "∞"}
                          <X size={10} className="cursor-pointer" onClick={() => { setSearchBudgetMin(""); setSearchBudgetMax(""); }} />
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleResetSearch}
                      className="text-xs text-red-500 hover:text-red-600 font-bold px-2 shrink-0"
                    >
                      مسح
                    </button>
                  </div>
                )}

                {/* Main Action Button */}
                <div className="p-4">
                  <Button
                    className="w-full h-12 text-base font-bold shadow-lg gap-2"
                    onClick={handleApplySearch}
                  >
                    عرض النتائج
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-white/20 text-white px-1.5 text-[11px] font-bold">
                      {filteredRequests.length}
                    </span>
                  </Button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 pt-6 pb-4">
        {/* 1. Sub-Filters (Interests Panel) - ALWAYS TOP when in interests mode */}
        <AnimatePresence>
        {viewMode === "interests" && showInterestsPanel && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {/* Interests Panel - Clean Redesign */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Header */}
              <div className="p-4 border-b border-border/50 flex items-center justify-between bg-secondary/10">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">إدارة اهتماماتي</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleManageInterests}
                  className="gap-2 h-9 rounded-2xl border-primary/10 hover:bg-primary/5 text-primary text-xs font-bold"
                >
                  <Edit size={14} />
                  تعديل
                </Button>
              </div>

              <div className="p-4 space-y-5">
                {/* Categories - Collapsible */}
                <div className="space-y-3">
                  <div 
                    onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">التصنيفات المختارة</span>
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-secondary px-1.5 text-[11px] text-muted-foreground font-bold">{userInterests.length}</span>
                    </div>
                    <div className={`transition-transform duration-200 ${isCategoriesExpanded ? "rotate-180" : ""}`}>
                      <ChevronDown size={14} className="text-muted-foreground group-hover:text-primary" />
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
                        <div className="flex flex-wrap gap-2 pt-1">
                          {userInterests.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">لم تحدد تصنيفات بعد</span>
                          ) : (
                            userInterests.map((int) => {
                              const cat = AVAILABLE_CATEGORIES.find((c) => c.id === int);
                              return (
                                <div
                                  key={int}
                                  className="flex items-center gap-1.5 bg-secondary/50 border border-border/50 px-3 py-1.5 rounded-full text-xs font-medium"
                                >
                                  <span>{cat?.emoji}</span>
                                  {cat?.label}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Cities - Collapsible */}
                <div className="space-y-3">
                  <div 
                    onClick={() => setIsCitiesExpanded(!isCitiesExpanded)}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">المدن المغطاة</span>
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-secondary px-1.5 text-[11px] text-muted-foreground font-bold">{interestedCities.length || "الكل"}</span>
                    </div>
                    <div className={`transition-transform duration-200 ${isCitiesExpanded ? "rotate-180" : ""}`}>
                      <ChevronDown size={14} className="text-muted-foreground group-hover:text-primary" />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isCitiesExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-2 pt-1">
                          {interestedCities.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">جميع المدن</span>
                          ) : (
                            interestedCities.map((city) => (
                              <div
                                key={city}
                                className="flex items-center gap-1.5 bg-primary/5 border border-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold"
                              >
                                <MapPin size={12} />
                                {city}
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Radar Words - Collapsible */}
                <div className="space-y-3">
                  <div 
                    onClick={() => setIsRadarWordsExpanded(!isRadarWordsExpanded)}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">رادار الكلمات</span>
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-secondary px-1.5 text-[11px] text-muted-foreground font-bold">{radarWords.length}</span>
                    </div>
                    <div className={`transition-transform duration-200 ${isRadarWordsExpanded ? "rotate-180" : ""}`}>
                      <ChevronDown size={14} className="text-muted-foreground group-hover:text-primary" />
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {isRadarWordsExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-2 pt-1">
                          {radarWords.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">لم تحدد كلمات رادار بعد</span>
                          ) : (
                            radarWords.map((word) => (
                              <div
                                key={word}
                                className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-full text-xs font-bold"
                              >
                                <Compass size={12} />
                                {word}
                              </div>
                            ))
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
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      notifyOnInterest ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"
                    }`}>
                      <Bell size={20} className={notifyOnInterest ? "animate-bounce" : ""} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">التنبيهات المباشرة</span>
                      <span className="text-[10px] text-muted-foreground">
                        {notifyOnInterest ? "سنقوم بإشعارك عند وجود فرص جديدة" : "فعل التنبيهات لتصلك الطلبات فوراً"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Haptic feedback
                      if (navigator.vibrate) {
                        navigator.vibrate(15);
                      }
                      setNotifyOnInterest(!notifyOnInterest);
                    }}
                    className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                      notifyOnInterest ? "bg-primary" : "bg-gray-300"
                    }`}
                  >
                    <motion.div
                      animate={{ x: notifyOnInterest ? -28 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="w-5 h-5 bg-white rounded-full shadow-lg"
                    />
                  </button>
                </div>
              </div>
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
              <div className="absolute inset-0 w-24 h-24 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 shadow-xl">
                <WifiOff className="text-slate-400 dark:text-slate-500" size={40} strokeWidth={1.5} />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-foreground mb-3">لم نتمكن من التحميل</h3>
            <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed mb-8 text-sm">
              قد يكون هناك مشكلة مؤقتة في الاتصال. لا تقلق، جرب مرة أخرى!
            </p>
            
            <div className="flex flex-col gap-3 w-full max-w-xs">
              {/* Primary Retry Button with animated icon */}
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="group relative w-full px-6 py-4 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-2xl transition-all shadow-lg hover:shadow-xl overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <span className="relative w-5 h-5">
                      <span className="absolute inset-0 rounded-full border-2 border-white/30" />
                      <span className="absolute inset-0 rounded-full border-2 border-t-white animate-spin" style={{ animationDuration: '1.5s' }} />
                    </span>
                    إعادة المحاولة
                  </span>
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </button>
              )}
              
              {/* Hard Refresh Button - Clears EVERYTHING */}
              <button
                onClick={async () => {
                  try {
                    // 1. Unregister ALL Service Workers
                    if ('serviceWorker' in navigator) {
                      const registrations = await navigator.serviceWorker.getRegistrations();
                      for (const registration of registrations) {
                        await registration.unregister();
                      }
                      console.log('[Hard Refresh] Service workers unregistered');
                    }

                    // 2. Clear ALL Cache Storage
                    if ('caches' in window) {
                      const cacheNames = await caches.keys();
                      await Promise.all(cacheNames.map(name => caches.delete(name)));
                      console.log('[Hard Refresh] Cache storage cleared');
                    }

                    // 3. Clear ALL localStorage (except critical items)
                    const keysToKeep = ['theme', 'language'];
                    const allKeys = Object.keys(localStorage);
                    allKeys.forEach(key => {
                      if (!keysToKeep.includes(key)) {
                        localStorage.removeItem(key);
                      }
                    });
                    console.log('[Hard Refresh] localStorage cleared');

                    // 4. Clear ALL sessionStorage
                    sessionStorage.clear();
                    console.log('[Hard Refresh] sessionStorage cleared');

                    // 5. Clear IndexedDB (Supabase uses this)
                    if ('indexedDB' in window) {
                      const databases = await indexedDB.databases?.() || [];
                      for (const db of databases) {
                        if (db.name) {
                          indexedDB.deleteDatabase(db.name);
                        }
                      }
                      console.log('[Hard Refresh] IndexedDB cleared');
                    }

                    // 6. Force hard reload (bypass cache)
                    // Using cache-busting query param + force reload
                    const url = new URL(window.location.href);
                    url.searchParams.set('_refresh', Date.now().toString());
                    window.location.replace(url.toString());
                    
                  } catch (err) {
                    console.error('[Hard Refresh] Error:', err);
                    // Fallback: just force reload
                    window.location.href = window.location.origin + '?_refresh=' + Date.now();
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
            <h3 className="text-lg font-bold text-foreground mb-2">لا توجد نتائج</h3>
            <p className="text-muted-foreground max-w-xs mx-auto leading-relaxed">
              {viewMode === "interests" 
                ? "لم نجد طلبات تطابق اهتماماتك الحالية. جرب تعديل الاهتمامات أو اختيار مدن أخرى."
                : hasActiveFilters
                  ? "لم نجد طلبات تطابق معايير البحث الحالية. جرب تعديل الفلاتر أو البحث بكلمات مختلفة."
                  : "لا توجد طلبات جديدة حالياً. اسحب للأسفل للتحديث أو عُد لاحقاً."}
            </p>
            {viewMode === "interests" ? (
              <Button
                variant="outline"
                onClick={handleManageInterests}
                className="mt-6 rounded-2xl"
              >
                تعديل الاهتمامات
              </Button>
            ) : hasActiveFilters && (
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

        {/* Modal logic for Interests - Simplified like Settings */}
        {isManageInterestsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-bold">إدارة الاهتمامات</h3>
                <button
                  onClick={() => setIsManageInterestsOpen(false)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {/* Notification Toggle - Moved to top */}
                <div className="p-4 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell size={18} className="text-primary" />
                      <div>
                        <h4 className="font-bold text-sm">إشعارات الاهتمامات</h4>
                        <p className="text-xs text-muted-foreground">تنبيهات فورية للطلبات التي تهمك</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setNotifyOnInterest(!notifyOnInterest)}
                      className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                        notifyOnInterest ? "bg-primary" : "bg-gray-300"
                      }`}
                    >
                      <motion.div
                        animate={{ x: notifyOnInterest ? -28 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-5 h-5 bg-white rounded-full shadow-lg"
                      />
                    </button>
                  </div>
                </div>

                {/* Categories - Collapsible */}
                <div className="bg-secondary/50 rounded-lg border border-border overflow-hidden">
                  <div 
                    onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/70 transition-all"
                  >
                    <h4 className="font-bold text-sm">التصنيفات والمهام</h4>
                    <ChevronDown 
                      size={18} 
                      className={`text-muted-foreground transition-transform duration-200 ${isCategoriesExpanded ? "rotate-180" : ""}`} 
                    />
                  </div>
                  <AnimatePresence>
                    {isCategoriesExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border"
                      >
                        <div className="p-3 space-y-3">
                          <input
                            type="text"
                            placeholder="بحث..."
                            value={tempCatSearch}
                            onChange={(e) => setTempCatSearch(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 rounded-lg border-2 border-[#1E968C]/30 bg-background focus:border-[#178075] focus:outline-none transition-all"
                          />
                          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto no-scrollbar">
                            {filteredCategories.map((cat) => (
                              <button
                                key={cat.id}
                                onClick={() => toggleInterest(cat.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                  tempInterests.includes(cat.id)
                                    ? 'bg-primary text-white'
                                    : 'bg-background text-foreground hover:bg-secondary/80 border border-border'
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
                    onClick={() => setIsCitiesExpanded(!isCitiesExpanded)}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/70 transition-all"
                  >
                    <h4 className="font-bold text-sm">المدن والمناطق</h4>
                    <ChevronDown 
                      size={18} 
                      className={`text-muted-foreground transition-transform duration-200 ${isCitiesExpanded ? "rotate-180" : ""}`} 
                    />
                  </div>
                  <AnimatePresence>
                    {isCitiesExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border"
                      >
                        <div className="p-3 space-y-3">
                          <input
                            type="text"
                            placeholder="بحث..."
                            value={tempCitySearch}
                            onChange={(e) => setTempCitySearch(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 rounded-lg border-2 border-[#1E968C]/30 bg-background focus:border-[#178075] focus:outline-none transition-all"
                          />
                          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto no-scrollbar">
                            {filteredCities.map((city) => (
                              <button
                                key={city}
                                onClick={() => toggleCity(city)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                  tempCities.includes(city)
                                    ? 'bg-primary text-white'
                                    : 'bg-background text-foreground hover:bg-secondary/80 border border-border'
                                }`}
                              >
                                {city}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Radar Words - Collapsible */}
                <div className="bg-secondary/50 rounded-lg border border-border overflow-hidden">
                  <div 
                    onClick={() => setIsRadarWordsExpanded(!isRadarWordsExpanded)}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/70 transition-all"
                  >
                    <h4 className="font-bold text-sm">رادار الكلمات</h4>
                    <ChevronDown 
                      size={18} 
                      className={`text-muted-foreground transition-transform duration-200 ${isRadarWordsExpanded ? "rotate-180" : ""}`} 
                    />
                  </div>
                  <AnimatePresence>
                    {isRadarWordsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border"
                      >
                        <div className="p-3 space-y-3">
                          <p className="text-xs text-muted-foreground">
                            إذا كان الطلب يتضمن إحدى هذه الكلمات، سيتم إشعارك
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="اكتب الكلمة..."
                              value={newRadarWord}
                              onChange={(e) => setNewRadarWord(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addRadarWord();
                                }
                              }}
                              className="flex-1 text-xs px-3 py-1.5 rounded-lg border-2 border-[#1E968C]/30 bg-background focus:border-[#178075] focus:outline-none transition-all"
                            />
                            <button
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
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm"
                                >
                                  <span>{word}</span>
                                  <button
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

              {/* Modal Footer */}
              <div className="flex gap-3 p-4 border-t border-border">
                <button
                  onClick={() => setIsManageInterestsOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    // Haptic feedback
                    if (navigator.vibrate) {
                      navigator.vibrate(15);
                    }
                    handleSaveInterests();
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium"
                >
                  حفظ وتطبيق
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Grid */}
        <motion.div 
          key={`grid-${searchCategories.join(',')}-${searchCities.join(',')}-${searchTerm}-${searchBudgetMin}-${searchBudgetMax}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredRequests.map((req, index) => {
            const myOffer = getMyOffer(req.id);
            const requestAuthorId = (req as any).authorId || (req as any).author_id || req.author;
            const isMyRequest = !!user?.id && requestAuthorId === user.id;
            const isNinthItem = index === 8; // 9th item (0-indexed)
            const isTouchHovered = touchHoveredCardId === req.id; // هل الإصبع فوق هذا الكارت؟
            return (
              <motion.div
                ref={(el) => {
                  // Store ref in cardRefs map for touch detection
                  if (el) {
                    cardRefs.current.set(req.id, el);
                  }
                  // Also handle ninthItemRef
                  if (isNinthItem && el) {
                    (ninthItemRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                  }
                }}
                data-request-id={req.id}
                key={req.id}
                initial={{ opacity: 0, y: 15 }}
                animate={isTouchHovered 
                  ? { opacity: 1, y: -8, scale: 1.02 } 
                  : { opacity: 1, y: 0, scale: 1 }
                }
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 30,
                  delay: index < 9 ? index * 0.03 : 0 // تأخير خفيف فقط لأول 9 كروت
                }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`bg-card border border-border rounded-2xl overflow-hidden transition-colors flex flex-col cursor-pointer relative shadow-sm ${isTouchHovered ? '' : 'group'}`}
                 onClick={() => {
                   // Update guest viewed requests in localStorage
                   if (isGuest) {
                     setGuestViewedIds(prev => {
                       const newSet = new Set(prev);
                       newSet.add(req.id);
                       try {
                         localStorage.setItem('guestViewedRequestIds', JSON.stringify([...newSet]));
                       } catch (e) {
                         console.error('Error saving guest viewed requests:', e);
                       }
                       return newSet;
                     });
                   }
                   onSelectRequest(req);
                 }}
              >
                {/* Viewed Indicator - مؤشر المشاهدة (فتحت هذا الطلب سابقاً) */}
                {viewedRequestIds.has(req.id) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-3 left-3 z-20 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
                    title="فتحت هذا الطلب سابقاً"
                  >
                    <Eye size={14} className="text-white/80" />
                  </motion.div>
                )}
                {isMyRequest && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-3 right-3 z-20 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm dark:bg-amber-500/10 dark:text-amber-100 dark:border-amber-400/30"
                  >
                    طلبي
                  </motion.div>
                )}
                {/* Image Section */}
                {req.images && req.images.length > 0 ? (
                  <motion.div
                    layoutId={`image-${req.id}`}
                    className="h-40 w-full bg-secondary overflow-hidden relative"
                  >
                    <motion.img
                      src={req.images[0]}
                      alt={req.title}
                      className="w-full h-full object-cover"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.4 }}
                      />
                      {req.images.length > 1 && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[11px] px-2.5 py-1 rounded-full font-medium"
                      >
                        +{req.images.length - 1} صور
                      </motion.span>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    layoutId={`image-${req.id}`}
                    className="h-40 w-full relative overflow-hidden"
                  >
                    {/* Simple Gray Background - Empty State */}
                    <div className="absolute inset-0 bg-muted/8" />
                    
                    {/* Very Subtle Dashed Pattern - Slow Rain Animation */}
                    <motion.div 
                      className="absolute -inset-20 opacity-[0.08]"
                      style={{
                        backgroundImage: `repeating-linear-gradient(45deg, currentColor, currentColor 0.5px, transparent 0.5px, transparent 11.5px)`,
                        backgroundSize: '40px 40px',
                      }}
                      animate={{
                        backgroundPosition: ['0px 0px', '40px 40px']
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                    />
                  </motion.div>
                )}

                {/* Title & Description Below Image */}
                <div className="px-5 pt-3 pb-1">
                  <h3 className="text-base font-bold text-foreground line-clamp-1">
                    {req.title}
                  </h3>
                  <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed mt-1">
                    {req.description}
                  </p>
                </div>

                <div className="px-5 pb-5 flex-1 flex flex-col relative">

                  {/* Request Info - Clean Professional Layout with Floating Labels */}
                  <div className="mb-4 mt-4">
                    {/* Location, Budget, and Delivery Time - Grid Layout */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* City */}
                      <div className="relative isolate">
                        <label className="absolute -top-2 right-1.5 px-1 bg-card z-10 text-[11px] text-primary font-bold">
                          المدينة
                        </label>
                        <div className="relative h-9 rounded-md border border-border/60 bg-background flex items-center justify-center overflow-hidden transition-all hover:border-primary/40 group">
                          <div className="w-full h-full flex items-center justify-center px-2 overflow-hidden relative">
                            <span className="text-xs font-medium text-foreground whitespace-nowrap truncate">
                              {req.location ? (() => {
                                // Parse location: "حي النرجس، الرياض" or "الرياض"
                                const locationParts = req.location.split('،').map(s => s.trim());
                                const city = locationParts.length > 1 ? locationParts[locationParts.length - 1] : locationParts[0];
                                return city;
                              })() : "غير محددة"}
                            </span>
                            {req.location && req.locationCoords && (
                              <a
                                href={`https://www.google.com/maps?q=${req.locationCoords.lat},${req.locationCoords.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary hover:text-primary/80 transition-colors shrink-0 absolute left-2"
                                title="فتح الخريطة"
                              >
                                <ExternalLink size={10} strokeWidth={2.5} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Budget */}
                      <div className="relative isolate">
                        <label className="absolute -top-2 right-1.5 px-1 bg-card z-10 text-[11px] text-primary font-bold">
                          الميزانية
                        </label>
                        <div className="relative h-9 rounded-md border border-border/60 bg-background flex items-center justify-center overflow-hidden transition-all hover:border-primary/40 group">
                          <div className="w-full h-full flex items-center justify-center px-2 overflow-hidden">
                            <span className="text-xs font-medium text-foreground whitespace-nowrap truncate">
                              {req.budgetType === "fixed"
                                ? `${req.budgetMin}-${req.budgetMax}`
                                : "غير محددة"}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Delivery Time */}
                      <div className="relative isolate">
                        <label className="absolute -top-2 right-1.5 px-1 bg-card z-10 text-[11px] text-primary font-bold">
                          مدة التنفيذ
                        </label>
                        <div className="relative h-9 rounded-md border border-border/60 bg-background flex items-center justify-center overflow-hidden transition-all hover:border-primary/40 group">
                          <div className="w-full h-full flex items-center justify-center px-2 overflow-hidden">
                            <span className="text-xs font-medium text-foreground whitespace-nowrap truncate">
                              {req.deliveryTimeFrom || "غير محددة"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border flex items-center justify-center">
                    {/* Action Area */}
                    {req.status === "assigned" || req.status === "completed" ? (
                      <div className="w-full h-9 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-muted text-muted-foreground">
                        <Lock size={14} />
                        منتهي
                      </div>
                    ) : isMyRequest ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
                          onSelectRequest(req, false); // Open request without scrolling to offer section
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="w-full h-9 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-teal-600 text-white shadow-md hover:shadow-lg transition-all relative overflow-hidden"
                      >
                        {/* Shimmer effect */}
                        <span 
                          className="absolute inset-0 pointer-events-none animate-shimmer-diagonal" 
                          style={{
                            background: 'linear-gradient(315deg, transparent 0%, transparent 35%, rgba(255, 255, 255, 0.15) 50%, transparent 65%, transparent 100%)',
                            backgroundSize: '200% 200%'
                          }} 
                        />
                        <User size={14} className="relative z-10" />
                        <span className="relative z-10 flex items-center gap-1">
                          طلبي
                          {(req.offers?.length || 0) > 0 && (
                            <span className="text-yellow-200 font-bold text-[10px] animate-pulse whitespace-nowrap">
                              (عروض جديدة!)
                            </span>
                          )}
                        </span>
                        {/* Notification badge for offers count */}
                        {(req.offers?.length || 0) > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg z-20 border-2 border-white dark:border-gray-900"
                          >
                            {req.offers?.length}
                          </motion.span>
                        )}
                      </motion.button>
                    ) : myOffer ? (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={`w-full h-9 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${
                            myOffer.status === "accepted"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : myOffer.status === "negotiating"
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}
                        >
                          {myOffer.status === "accepted"
                            ? <CheckCircle size={16} />
                            : myOffer.status === "negotiating"
                            ? <MessageCircle size={16} />
                            : <CheckCircle size={16} />}

                          {myOffer.status === "accepted"
                            ? "تم قبول عرضك"
                            : myOffer.status === "negotiating"
                            ? "قيد التفاوض"
                            : "تم التقديم"}
                        </motion.div>
                      ) : (
                        <motion.button
                          initial={false}
                          whileHover={{ 
                            scale: 1.02,
                          }}
                          whileTap={{ 
                            scale: 0.98,
                          }}
                          animate={isTouchHovered ? {
                            scale: 1.02,
                          } : {}}
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
                            onSelectRequest(req, true);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onPointerUp={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onTouchEnd={(e) => e.stopPropagation()}
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
                              ease: "easeOut"
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
                              delay: 0.3
                            }}
                          />
                          {/* Always-on diagonal shimmer - from NE (top-right) to SW (bottom-left) */}
                          {/* Light mode shimmer - more visible */}
                          <span 
                            className="absolute inset-0 pointer-events-none animate-shimmer-diagonal dark:hidden" 
                            style={{
                              background: 'linear-gradient(315deg, transparent 0%, transparent 35%, rgba(255, 255, 255, 0.12) 50%, transparent 65%, transparent 100%)',
                              backgroundSize: '200% 200%'
                            }} 
                          />
                          {/* Dark mode shimmer - lighter */}
                          <span 
                            className="absolute inset-0 pointer-events-none animate-shimmer-diagonal hidden dark:block" 
                            style={{
                              background: 'linear-gradient(315deg, transparent 0%, transparent 35%, rgba(255, 255, 255, 0.05) 50%, transparent 65%, transparent 100%)',
                              backgroundSize: '200% 200%'
                            }} 
                          />
                          {/* Intensified shimmer on hover/touch - Light mode */}
                          <span 
                            className={`absolute inset-0 pointer-events-none opacity-0 dark:hidden ${
                              isTouchHovered ? "opacity-100 animate-shimmer-diagonal-hover" : "group-hover:opacity-100 group-hover:animate-shimmer-diagonal-hover"
                            }`} 
                            style={{
                              background: 'linear-gradient(315deg, transparent 0%, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%, transparent 100%)',
                              backgroundSize: '200% 200%'
                            }} 
                          />
                          {/* Intensified shimmer on hover/touch - Dark mode */}
                          <span 
                            className={`absolute inset-0 pointer-events-none opacity-0 hidden dark:block ${
                              isTouchHovered ? "opacity-100 animate-shimmer-diagonal-hover" : "group-hover:opacity-100 group-hover:animate-shimmer-diagonal-hover"
                            }`} 
                            style={{
                              background: 'linear-gradient(315deg, transparent 0%, transparent 30%, rgba(255, 255, 255, 0.12) 50%, transparent 70%, transparent 100%)',
                              backgroundSize: '200% 200%'
                            }} 
                          />
                          <span className="relative z-10">تقديم عرض</span>
                        </motion.button>
                      )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Load more sentinel + indicator - Only show when we have data */}
        {filteredRequests.length > 0 && (
          <>
            <div ref={loadMoreTriggerRef} className="h-4 w-full" />
            <div className="py-10 pb-24 min-h-[200px] flex flex-col justify-start">
              <AnimatePresence mode="wait">
                {isLoadingMore ? (
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
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] animate-pulse">جاري جلب المزيد...</span>
                </div>
              </motion.div>
            ) : hasMore && !pullToRefreshState.isRefreshing && filteredRequests.length >= 9 ? (
              <motion.div 
                key="load-more-button"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-4 py-2 w-full"
              >
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  animate={{ 
                    y: [0, 8, 0],
                  }}
                  transition={{ 
                    y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
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
                      <linearGradient id="load-more-gradient-v3" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1E968C" />
                        <stop offset="100%" stopColor="#153659" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Inner Circle with Arrow */}
                  <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-primary shadow-xl border border-primary/10 group-hover:border-primary/30 transition-all">
                    <motion.div
                      animate={{ y: [0, 3, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    >
                      <ArrowDown size={22} strokeWidth={2.5} />
                    </motion.div>
                  </div>
                </motion.button>
                <div className="text-center text-[11px] font-extrabold text-muted-foreground/50 uppercase tracking-[0.2em]">
                  اضغط للتحميل اليدوي أو مرر للأسفل
                </div>
              </motion.div>
            ) : !hasMore && filteredRequests.length > 0 ? (
              <motion.div 
                key="end-of-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="relative overflow-hidden p-8 rounded-[2.5rem] bg-gradient-to-b from-secondary/20 to-transparent border border-border/40 text-center group max-w-md mx-auto"
              >
                {/* Decorative background elements */}
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/8 transition-colors" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/8 transition-colors" />
                
                <div className="relative z-10 space-y-5">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-2 shadow-inner">
                    <Check size={28} strokeWidth={3} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-foreground">لقد وصلت للنهاية!</h3>
                    <p className="text-sm text-muted-foreground max-w-[260px] mx-auto leading-relaxed font-medium">
                      تم عرض كافة الطلبات المتاحة حالياً. تأكد من تحديث الصفحة باستمرار لرؤية العروض الجديدة فور وصولها.
                    </p>
                  </div>
                  
                  {/* زر العودة للأعلى والتحديث */}
                  <div className="pt-4 flex flex-col items-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        // Haptic feedback
                        if (navigator.vibrate) navigator.vibrate(15);
                        
                        // Scroll to top first
                        if (marketplaceScrollRef.current) {
                          marketplaceScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
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
            ) : null}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
