import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, Bell, Menu, X, LogOut, MessageCircle, Check } from "lucide-react";

// Components
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { Marketplace } from "./components/Marketplace";
import { RequestDetail } from "./components/RequestDetail";
import { Settings } from "./components/Settings";
import { Profile } from "./components/Profile";
import { NotificationsPopover } from "./components/NotificationsPopover";
import { SplashScreen } from "./components/SplashScreen";
import { AuthPage } from "./components/AuthPage";
import { Messages } from "./components/Messages";

// Types & Data
import {
  AppMode,
  Notification,
  Offer,
  Request,
  Review,
  UserPreferences,
  ViewState,
} from "./types";
import { MOCK_REVIEWS, MOCK_REQUESTS } from "./data";
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  clearAllNotifications,
  subscribeToNotifications,
  getUnreadNotificationsCount
} from "./services/notificationsService";

// Services
import {
  fetchRequestsPaginated,
  fetchMyRequests, 
  fetchMyOffers,
  fetchArchivedRequests,
  fetchArchivedOffers,
  archiveRequest,
  unarchiveRequest,
  archiveOffer,
  unarchiveOffer,
  checkSupabaseConnection,
  subscribeToNewRequests
} from "./services/requestsService";
import { getUnreadInterestsCount } from "./services/requestViewsService";
import { checkAIConnection } from "./services/aiService";
import { supabase } from "./services/supabaseClient";
import { signOut as authSignOut, getCurrentUser, UserProfile, onAuthStateChange } from "./services/authService";
import { FullScreenLoading } from "./components/ui/LoadingSkeleton";

// Auth Views
type AppView = 'splash' | 'auth' | 'main';

const App: React.FC = () => {
  // ==========================================
  // Auth State
  // ==========================================
  const [appView, setAppView] = useState<AppView>('splash');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // ==========================================
  // Global State
  // ==========================================
  const [mode, setMode] = useState<AppMode>("requests");
  const [view, setView] = useState<ViewState>("create-request");
  const [previousView, setPreviousView] = useState<ViewState | null>(null);
  const [titleKey, setTitleKey] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLanguagePopupOpen, setIsLanguagePopupOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'ar' | 'en' | 'ur'>('ar');
  const [autoTranslateRequests, setAutoTranslateRequests] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>(["tech", "writing"]);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    interestedCategories: ["tech", "writing"],
    interestedCities: ["الرياض"],
    radarWords: [],
    notifyOnInterest: true,
    roleMode: "requester",
  });

  // ==========================================
  // Data State
  // ==========================================
  const [myRequests, setMyRequests] = useState<Request[]>([]);
  const [allRequests, setAllRequests] = useState<Request[]>([]);
  const [interestsRequests, setInterestsRequests] = useState<Request[]>([]); // طلبات اهتماماتي فقط
  const [unreadInterestsCount, setUnreadInterestsCount] = useState<number>(0); // عدد الطلبات غير المقروءة في اهتماماتي
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [archivedRequests, setArchivedRequests] = useState<Request[]>([]);
  const [archivedOffers, setArchivedOffers] = useState<Offer[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [requestsLoadError, setRequestsLoadError] = useState<string | null>(null);
  const MARKETPLACE_PAGE_SIZE = 10;
  const [marketplacePage, setMarketplacePage] = useState(0);
  const [marketplaceHasMore, setMarketplaceHasMore] = useState(true);
  const [marketplaceIsLoadingMore, setMarketplaceIsLoadingMore] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    supabase: { connected: boolean; error?: string };
    ai: { connected: boolean; error?: string };
  } | null>(null);

  // ==========================================
  // Notification & Review State
  // ==========================================
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [reviews] = useState<Review[]>(MOCK_REVIEWS);
  const userRating = reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1);

  // ==========================================
  // Selection State
  // ==========================================
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [scrollToOfferSection, setScrollToOfferSection] = useState(false);
  
  // Save state when switching modes to restore when coming back
  const [savedOffersModeState, setSavedOffersModeState] = useState<{
    view: ViewState;
    selectedRequest: Request | null;
    scrollToOfferSection: boolean;
  } | null>(null);
  const [savedRequestsModeState, setSavedRequestsModeState] = useState<{
    view: ViewState;
  } | null>(null);

  // ==========================================
  // Scroll Persistence
  // ==========================================
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Separate scroll positions for each mode
  // Load from localStorage on mount
  const [marketplaceScrollPos, setMarketplaceScrollPos] = useState(() => {
    const saved = localStorage.getItem('abeely_marketplace_scroll');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [requestsModeScrollPos, setRequestsModeScrollPos] = useState(() => {
    const saved = localStorage.getItem('abeely_requests_scroll');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [chatAreaScrollPos, setChatAreaScrollPos] = useState(() => {
    const saved = localStorage.getItem('abeely_chatarea_scroll');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [requestDetailScrollPos, setRequestDetailScrollPos] = useState(() => {
    const saved = localStorage.getItem('abeely_requestdetail_scroll');
    return saved ? parseInt(saved, 10) : 0;
  });
  const notifRef = useRef<HTMLDivElement>(null);

  // Save to localStorage whenever scroll positions change
  useEffect(() => {
    localStorage.setItem('abeely_marketplace_scroll', marketplaceScrollPos.toString());
  }, [marketplaceScrollPos]);

  useEffect(() => {
    localStorage.setItem('abeely_requests_scroll', requestsModeScrollPos.toString());
  }, [requestsModeScrollPos]);

  useEffect(() => {
    localStorage.setItem('abeely_chatarea_scroll', chatAreaScrollPos.toString());
  }, [chatAreaScrollPos]);

  useEffect(() => {
    localStorage.setItem('abeely_requestdetail_scroll', requestDetailScrollPos.toString());
  }, [requestDetailScrollPos]);

  // ==========================================
  // State Persistence for ChatArea
  // ==========================================
  const [savedChatMessages, setSavedChatMessages] = useState<any[]>([]);

  // ==========================================
  // State Persistence for RequestDetail
  // ==========================================
  const [savedOfferForms, setSavedOfferForms] = useState<Record<string, {
    price: string;
    duration: string;
    city: string;
    title: string;
    description: string;
    attachments: any[];
    guestVerificationStep?: 'none' | 'phone' | 'otp';
    guestPhone?: string;
    guestOTP?: string;
  }>>({});

  // ==========================================
  // Auth Initialization
  // ==========================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const profile = await getCurrentUser();
          setUser(profile);
          setIsGuest(false);
        } else {
          // Check if guest mode was previously set
          const wasGuest = localStorage.getItem('abeely_guest_mode') === 'true';
          setIsGuest(wasGuest);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange(async (authUser) => {
      if (authUser) {
        const profile = await getCurrentUser();
        setUser(profile);
        setIsGuest(false);
        localStorage.removeItem('abeely_guest_mode');
        setAppView('main');
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ==========================================
  // Splash Screen Complete Handler
  // ==========================================
  const handleSplashComplete = () => {
    if (authLoading) {
      // Still loading auth, wait
      return;
    }
    
    if (user) {
      setAppView('main');
    } else if (isGuest) {
      setAppView('main');
    } else {
      setAppView('auth');
    }
  };

  // Watch for auth loading completion after splash
  useEffect(() => {
    if (appView === 'splash' && !authLoading) {
      // Delay a bit for splash animation
      const timer = setTimeout(() => {
        handleSplashComplete();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [authLoading, appView, user, isGuest]);

  // ==========================================
  // Theme Handling
  // ==========================================
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // ==========================================
  // Data Loading
  // ==========================================
  const loadingRef = useRef(false);
  
  useEffect(() => {
    if (appView !== 'main') return;
    
    // Prevent concurrent loadData calls
    if (loadingRef.current) {
      return;
    }

    const loadData = async () => {
      loadingRef.current = true;
      
      // Load data from Supabase 
      try {
        setIsLoadingData(true);
        setRequestsLoadError(null);
        
        // Fetch first page of public requests (lazy loading)
        // We do this immediately without waiting for other checks
        const fetchPromise = fetchRequestsPaginated(0, MARKETPLACE_PAGE_SIZE);
        
        // Background connection checks (don't block the data fetch)
        Promise.all([
          checkSupabaseConnection(),
          checkAIConnection()
        ]).then(([supabaseStatus, aiStatus]) => {
          setConnectionStatus({
            supabase: supabaseStatus,
            ai: aiStatus,
          });
        });

        const { data: firstPage, count: totalCount } = await fetchPromise;
        
        if (Array.isArray(firstPage)) {
          setAllRequests(firstPage);
          setMarketplacePage(0);
          const more = typeof totalCount === 'number'
            ? firstPage.length < totalCount
            : firstPage.length === MARKETPLACE_PAGE_SIZE;
          setMarketplaceHasMore(more);
        }
        
        // Fetch user's data if logged in
        if (user?.id) {
          await Promise.all([
            fetchMyRequests(user.id).then(reqs => setMyRequests(reqs.filter(r => r.status !== 'archived'))),
            fetchMyOffers(user.id).then(offers => setMyOffers(offers.filter(o => o.status !== 'archived'))),
            fetchArchivedRequests(user.id).then(setArchivedRequests),
            fetchArchivedOffers(user.id).then(setArchivedOffers)
          ]);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setRequestsLoadError("حدث خطأ في تحميل الطلبات.");
      } finally {
        setIsLoadingData(false);
        loadingRef.current = false;
      }
    };

      loadData();
    }, [appView, user?.id]);

  // ==========================================
  // Reload Data When Opening Marketplace
  // ==========================================
  useEffect(() => {
    if (appView !== 'main' || view !== 'marketplace') return;
    if (loadingRef.current) return;
    if (allRequests.length === 0 || requestsLoadError) {
      // Trigger reload if no data or error
      const reloadData = async () => {
        loadingRef.current = true;
        try {
          setIsLoadingData(true);
          setRequestsLoadError(null);
          const { data: firstPage, count: totalCount } = await fetchRequestsPaginated(0, MARKETPLACE_PAGE_SIZE);
          if (Array.isArray(firstPage)) {
            setAllRequests(firstPage);
            setMarketplacePage(0);
            const more = typeof totalCount === 'number'
              ? firstPage.length < totalCount
              : firstPage.length === MARKETPLACE_PAGE_SIZE;
            setMarketplaceHasMore(more);
          }
        } catch (error) {
          console.error("Error reloading marketplace data:", error);
          setRequestsLoadError("حدث خطأ في تحميل الطلبات. يرجى المحاولة مرة أخرى.");
        } finally {
          setIsLoadingData(false);
          loadingRef.current = false;
        }
      };
      reloadData();
    }
  }, [view, appView, allRequests.length, requestsLoadError]);

  // ==========================================
  // Load Notifications from Supabase
  // ==========================================
  useEffect(() => {
    if (appView !== 'main' || !user?.id) return;

    const loadNotifications = async () => {
      try {
        const notifs = await getNotifications(50);
        setNotifications(notifs);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadNotifications();

    // Subscribe to new notifications
    const unsubscribe = subscribeToNotifications(user.id, (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
    });

    return () => {
      unsubscribe();
    };
  }, [appView, user?.id]);

  const loadMoreMarketplaceRequests = async () => {
    if (marketplaceIsLoadingMore || !marketplaceHasMore) return;
    try {
      setMarketplaceIsLoadingMore(true);
      const nextPage = marketplacePage + 1;
      const { data: pageData, count: totalCount } = await fetchRequestsPaginated(nextPage, MARKETPLACE_PAGE_SIZE);
      setAllRequests((prev) => {
        const seen = new Set(prev.map(r => r.id));
        const merged = [...prev];
        for (const r of pageData) {
          if (!seen.has(r.id)) merged.push(r);
        }
        return merged;
      });
      setMarketplacePage(nextPage);
      const loadedSoFar = allRequests.length + (pageData?.length || 0);
      const more = typeof totalCount === 'number'
        ? loadedSoFar < totalCount
        : (pageData?.length || 0) === MARKETPLACE_PAGE_SIZE;
      setMarketplaceHasMore(more);
    } catch (e) {
      console.error('Error loading more requests:', e);
      setMarketplaceHasMore(false);
    } finally {
      setMarketplaceIsLoadingMore(false);
    }
  };

  // ==========================================
  // Load Interests Requests and Unread Count
  // ==========================================
  useEffect(() => {
    if (appView !== 'main' || !user?.id) return;

    const loadInterestsData = async () => {
      try {
        // Filter all requests by interests
        const hasInterests = userPreferences.interestedCategories.length > 0 || 
                            userPreferences.interestedCities.length > 0;
        
        if (hasInterests) {
          const filtered = allRequests.filter(req => {
            // Check categories match
            const catMatch = userPreferences.interestedCategories.length === 0 ||
              (req.categories || []).some(cat =>
                userPreferences.interestedCategories.some(interest =>
                  cat.toLowerCase().includes(interest.toLowerCase()) ||
                  interest.toLowerCase().includes(cat.toLowerCase())
                )
              );

            // Check city match
            const cityMatch = userPreferences.interestedCities.length === 0 ||
              (req.location && userPreferences.interestedCities.some(city =>
                req.location.includes(city) || city.includes(req.location)
              ));

            return catMatch && cityMatch;
          });

          setInterestsRequests(filtered);

          // Get unread count
          const count = await getUnreadInterestsCount();
          setUnreadInterestsCount(count);
        } else {
          setInterestsRequests([]);
          setUnreadInterestsCount(0);
        }
      } catch (error) {
        console.error('Error loading interests data:', error);
      }
    };

    loadInterestsData();
  }, [appView, user?.id, allRequests, userPreferences.interestedCategories, userPreferences.interestedCities]);

  // ==========================================
  // Subscribe to New Requests (Interests Only)
  // ==========================================
  useEffect(() => {
    if (appView !== 'main') return;

    // Only subscribe if user has interests configured
    const hasInterests = userPreferences.interestedCategories.length > 0 || 
                        userPreferences.interestedCities.length > 0;

    if (!hasInterests) {
      setInterestsRequests([]);
      setUnreadInterestsCount(0);
      return;
    }

    // Subscribe to new requests matching user interests
    const unsubscribe = subscribeToNewRequests(
      userPreferences.interestedCategories,
      userPreferences.interestedCities,
      async (newRequest) => {
        // Add new request to interests list (only if not exists)
        setInterestsRequests((prev) => {
          const exists = prev.some(r => r.id === newRequest.id);
          if (exists) return prev;
          return [newRequest, ...prev];
        });

        // Increase unread count
        setUnreadInterestsCount((prev) => prev + 1);

        // Show notification if enabled (will be handled by database trigger)
        if (userPreferences.notifyOnInterest) {
          console.log('🎯 طلب جديد يطابق اهتماماتك:', newRequest.title);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [appView, userPreferences.interestedCategories, userPreferences.interestedCities, userPreferences.notifyOnInterest]);

  // ==========================================
  // Navigation Helpers
  // ==========================================
  const handleModeSwitch = (newMode: AppMode) => {
    // Save current scroll position before switching
    if (scrollContainerRef.current) {
      const currentScroll = scrollContainerRef.current.scrollTop;
      if (mode === "requests") {
        setRequestsModeScrollPos(currentScroll);
      } else if (mode === "offers") {
        setMarketplaceScrollPos(currentScroll);
      }
    }
    
    // Save current state before switching modes
    if (mode === "offers") {
      // Save offers mode state (view and selectedRequest) to restore later
      setSavedOffersModeState({
        view: view,
        selectedRequest: selectedRequest,
        scrollToOfferSection: scrollToOfferSection,
      });
    } else if (mode === "requests") {
      // Save requests mode state (view only, no selected request in requests mode)
      setSavedRequestsModeState({
        view: view,
      });
    }
    
    setMode(newMode);
    
    // Restore saved state if available, otherwise use default view
    if (newMode === "offers" && savedOffersModeState) {
      // Restore offers mode state
      setView(savedOffersModeState.view);
      setSelectedRequest(savedOffersModeState.selectedRequest);
      setScrollToOfferSection(savedOffersModeState.scrollToOfferSection);
    } else if (newMode === "requests" && savedRequestsModeState) {
      // Restore requests mode state
      setView(savedRequestsModeState.view);
      setSelectedRequest(null); // No selected request in requests mode
      setScrollToOfferSection(false);
    } else {
      // No saved state, use default view
      const defaultView = newMode === "requests" ? "create-request" : "marketplace";
      setView(defaultView);
      if (newMode === "offers") {
        setSelectedRequest(null);
        setScrollToOfferSection(false);
      }
    }
  };

  const toggleMode = () => {
    if (navigator.vibrate) {
      navigator.vibrate([10, 20, 10]);
    }
    setTitleKey((prev) => prev + 1);
    handleModeSwitch(mode === "requests" ? "offers" : "requests");
  };

  const handleNavigate = (newView: any) => {
    // Note: Scroll position is automatically saved via onScrollPositionChange callbacks
    // in Marketplace and ChatArea components (via useLayoutEffect cleanup on unmount)
    // No need to manually save here as components handle it themselves

    if (newView === "requests-mode") {
      handleModeSwitch("requests");
      return;
    }
    if (newView === "offers-mode") {
      handleModeSwitch("offers");
      return;
    }

    if (view !== newView && (newView === "settings" || newView === "profile")) {
      setPreviousView(view);
    }

    setView(newView as ViewState);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Restore scroll position when switching views or modes
  // Note: Marketplace component handles its own scroll restoration via savedScrollPosition prop
  // This effect is mainly for other views that use scrollContainerRef
  useEffect(() => {
    if (view !== "request-detail" && scrollContainerRef.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (!scrollContainerRef.current) return;
        
        if (view === "create-request" && mode === "requests") {
          // Restore scroll position for requests mode
          scrollContainerRef.current.scrollTop = requestsModeScrollPos;
        }
        // Marketplace handles its own scroll restoration via savedScrollPosition prop
        // No need to manually set scroll here
      });
    }
  }, [view, mode, requestsModeScrollPos]);

  const handleSelectRequest = (req: Request, scrollToOffer = false) => {
    // Marketplace component already saves scroll position via onScrollPositionChange
    // No need to manually save it here - marketplaceScrollPos is already up to date
    setSelectedRequest(req);
    setScrollToOfferSection(scrollToOffer);
    setView("request-detail");
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleSelectOffer = (offer: Offer) => {
    const relatedRequest = allRequests.find((r) => r.id === offer.requestId);
    if (relatedRequest) {
      setSelectedRequest(relatedRequest);
      setView("request-detail");
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleClearNotifications = async () => {
    await clearAllNotifications();
    setNotifications([]);
    setIsNotifOpen(false);
  };

  const getMyOfferOnRequest = (reqId: string) => {
    return myOffers.find((o) => o.requestId === reqId);
  };

  // Reload data function
  const reloadData = async () => {
    try {
      setIsLoadingData(true);
      setRequestsLoadError(null);
      
      const { data: firstPage, count: totalCount } = await fetchRequestsPaginated(0, MARKETPLACE_PAGE_SIZE);
      setAllRequests(firstPage);
      setMarketplacePage(0);
      const more = typeof totalCount === 'number'
        ? firstPage.length < totalCount
        : firstPage.length === MARKETPLACE_PAGE_SIZE;
      setMarketplaceHasMore(more);

      if (user?.id) {
        const myReqs = await fetchMyRequests(user.id);
        setMyRequests(myReqs.filter(r => r.status !== 'archived'));

        const offers = await fetchMyOffers(user.id);
        setMyOffers(offers.filter(o => o.status !== 'archived'));
        
        // Reload archived items
        const archivedReqs = await fetchArchivedRequests(user.id);
        setArchivedRequests(archivedReqs);
        
        const archivedOffs = await fetchArchivedOffers(user.id);
        setArchivedOffers(archivedOffs);
      }
    } catch (error) {
      console.error("Error reloading data:", error);
      setRequestsLoadError("حدث خطأ في تحميل الطلبات. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoadingData(false);
    }
  };

  // Archive handlers
  const handleArchiveRequest = async (requestId: string) => {
    if (!user?.id) return;
    
    try {
      const success = await archiveRequest(requestId, user.id);
      if (success) {
        await reloadData();
      }
    } catch (error) {
      console.error("Error archiving request:", error);
    }
  };

  const handleUnarchiveRequest = async (requestId: string) => {
    if (!user?.id) return;
    
    try {
      const success = await unarchiveRequest(requestId, user.id);
      if (success) {
        await reloadData();
      }
    } catch (error) {
      console.error("Error unarchiving request:", error);
    }
  };

  const handleArchiveOffer = async (offerId: string) => {
    if (!user?.id) return;
    
    try {
      const success = await archiveOffer(offerId, user.id);
      if (success) {
        await reloadData();
      }
    } catch (error) {
      console.error("Error archiving offer:", error);
    }
  };

  const handleUnarchiveOffer = async (offerId: string) => {
    if (!user?.id) return;
    
    try {
      const success = await unarchiveOffer(offerId, user.id);
      if (success) {
        await reloadData();
      }
    } catch (error) {
      console.error("Error unarchiving offer:", error);
    }
  };

  // ==========================================
  // Sign Out Handler
  // ==========================================
  const handleSignOut = async () => {
    await authSignOut();
    setUser(null);
    setIsGuest(false);
    localStorage.removeItem('abeely_guest_mode');
    setAppView('auth');
  };

  // ==========================================
  // View Rendering Logic
  // ==========================================
  const renderContent = () => {
    switch (view) {
      case "create-request":
        return (
          <div className="h-full p-0 flex flex-col items-center justify-start pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] overflow-x-hidden">
            <div className="w-full max-w-4xl h-full flex flex-col overflow-x-hidden">
              <ChatArea 
                onRequestPublished={reloadData} 
                isGuest={isGuest}
                userId={user?.id}
                savedMessages={savedChatMessages}
                onMessagesChange={setSavedChatMessages}
                savedScrollPosition={chatAreaScrollPos}
                onScrollPositionChange={setChatAreaScrollPos}
              />
            </div>
          </div>
        );
      case "marketplace":
        return (
          <div className="h-full flex flex-col overflow-hidden relative">
            {isLoadingData && allRequests.length === 0 && (
              <div className="absolute inset-0 z-20">
                <FullScreenLoading message="جاري تحميل سوق الطلبات..." />
              </div>
            )}
            {allRequests && Array.isArray(allRequests) ? (
              <Marketplace
                requests={allRequests}
                interestsRequests={interestsRequests}
                unreadInterestsCount={unreadInterestsCount}
                myOffers={myOffers}
                onSelectRequest={handleSelectRequest}
                userInterests={userInterests}
              onUpdateInterests={setUserInterests}
              hasMore={marketplaceHasMore}
              isLoadingMore={marketplaceIsLoadingMore}
              onLoadMore={loadMoreMarketplaceRequests}
              onRefresh={reloadData}
              loadError={requestsLoadError}
              savedScrollPosition={marketplaceScrollPos}
              onScrollPositionChange={setMarketplaceScrollPos}
            />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-muted-foreground">جاري تحميل الطلبات...</p>
                </div>
              </div>
            )}
          </div>
        );
      case "request-detail":
        return selectedRequest ? (
          <div className="h-full flex flex-col overflow-hidden">
            <RequestDetail
              request={selectedRequest}
              mode={mode}
              myOffer={getMyOfferOnRequest(selectedRequest.id)}
              onBack={() => {
                setSelectedRequest(null);
                setScrollToOfferSection(false);
                setView("marketplace");
                // Marketplace will restore scroll position via savedScrollPosition prop
              }}
              isGuest={isGuest}
              scrollToOfferSection={scrollToOfferSection}
              onNavigateToMessages={async (conversationId, userId, requestId, offerId) => {
                const { getOrCreateConversation } = await import('./services/messagesService');
                const { getCurrentUser } = await import('./services/authService');
                
                if (userId && requestId) {
                  const currentUser = await getCurrentUser();
                  if (currentUser) {
                    const conv = await getOrCreateConversation(userId, requestId, offerId);
                    if (conv) {
                      setPreviousView(view);
                      setView("messages");
                    }
                  }
                } else {
                  setPreviousView(view);
                  setView("messages");
                }
              }}
              savedOfferForm={savedOfferForms[selectedRequest.id]}
              onOfferFormChange={(form) => {
                setSavedOfferForms(prev => ({
                  ...prev,
                  [selectedRequest.id]: form
                }));
              }}
              savedScrollPosition={requestDetailScrollPos}
              onScrollPositionChange={setRequestDetailScrollPos}
            />
          </div>
        ) : null;
      case "settings":
        return (
          <div className="h-full flex flex-col overflow-hidden">
            <Settings
              isDarkMode={isDarkMode}
              toggleTheme={() => setIsDarkMode(!isDarkMode)}
              userPreferences={userPreferences}
              onUpdatePreferences={(prefs) => {
                setUserPreferences(prefs);
                setUserInterests(prefs.interestedCategories);
              }}
              user={user}
              onBack={() => {
                if (previousView) {
                  setView(previousView);
                  setPreviousView(null);
                } else {
                  handleNavigate(mode === "requests" ? "create-request" : "marketplace");
                }
              }}
              onSignOut={handleSignOut}
            />
          </div>
        );
      case "profile":
        return (
          <div className="h-full flex flex-col overflow-hidden">
            <Profile userReviews={reviews} userRating={userRating} />
          </div>
        );
      case "messages":
        return (
          <div className="h-full flex flex-col overflow-hidden relative">
            <Messages
              onBack={() => {
                if (previousView) {
                  setView(previousView);
                  setPreviousView(null);
                } else {
                  handleNavigate(mode === "requests" ? "create-request" : "marketplace");
                }
              }}
              onSelectConversation={(conversationId) => {
                setView("conversation");
              }}
            />
          </div>
        );
      case "conversation":
        return (
          <div className="h-full flex flex-col overflow-hidden">
            <Messages
              onBack={() => setView("messages")}
              onSelectConversation={(conversationId) => {
                // Already in conversation view
              }}
            />
          </div>
        );
      default:
        return <div className="h-full flex flex-col overflow-hidden p-8">View not found</div>;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ==========================================
  // App View Rendering
  // ==========================================

  // Splash Screen
  if (appView === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Auth Screen
  if (appView === 'auth') {
    return (
      <AuthPage
        onAuthenticated={() => setAppView('main')}
        onGuestMode={() => {
          setIsGuest(true);
          localStorage.setItem('abeely_guest_mode', 'true');
          setAppView('main');
        }}
      />
    );
  }

  // Main App
  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden font-sans pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[80] md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Notification Click-Outside Overlay */}
      {isNotifOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setIsNotifOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        mode={mode}
        isOpen={isSidebarOpen || window.innerWidth >= 768}
        userRequests={myRequests}
        allRequests={allRequests}
        userOffers={myOffers}
        archivedRequests={archivedRequests}
        archivedOffers={archivedOffers}
        onSelectRequest={handleSelectRequest}
        onSelectOffer={handleSelectOffer}
        onCreateRequest={() => handleNavigate("create-request")}
        onNavigate={handleNavigate}
        onArchiveRequest={handleArchiveRequest}
        onUnarchiveRequest={handleUnarchiveRequest}
        onArchiveOffer={handleArchiveOffer}
        onUnarchiveOffer={handleUnarchiveOffer}
        isGuest={isGuest}
        user={user}
        onSignOut={handleSignOut}
        onUnreadMessagesChange={setHasUnreadMessages}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenLanguagePopup={() => setIsLanguagePopupOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="min-h-16 bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 relative z-30 shadow-sm pt-[env(safe-area-inset-top,0px)]">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2.5 hover:bg-primary/10 rounded-xl transition-all duration-300 active:scale-95 group"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? (
                <X size={22} className="text-muted-foreground group-hover:text-primary transition-colors duration-300" />
              ) : (
                <Menu size={22} className="text-muted-foreground group-hover:text-primary transition-colors duration-300" />
              )}
            </button>
            <div className="flex items-start gap-3">
              <h1 className="font-bold text-base text-foreground flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground mt-1.5">أبيلي</span>
                <motion.span
                  key={titleKey}
                  initial={{ scale: 1 }}
                  animate={{
                    scale: [1, 1.08, 1],
                    x: [0, -2, 2, -2, 2, 0],
                  }}
                  transition={{
                    duration: 0.4,
                    ease: "easeInOut",
                  }}
                  className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm inline-block"
                >
                  {mode === "requests" ? "إنشاء الطلبات" : "تقديم العروض"}
                </motion.span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Guest Badge */}

            {/* Mode Switch Button */}
            <button
              onClick={toggleMode}
              className="flex items-center justify-center h-11 w-11 rounded-xl bg-secondary/50 hover:bg-primary/10 border border-border hover:border-primary/30 transition-all duration-300 active:scale-95 group"
            >
              <ArrowLeftRight 
                size={18} 
                strokeWidth={2} 
                className="text-muted-foreground group-hover:text-primary group-hover:rotate-180 transition-all duration-300" 
              />
            </button>

            {/* Messages Button */}
            {user && (
              <button
                onClick={() => {
                  setPreviousView(view);
                  setView("messages");
                }}
                className="p-2.5 rounded-xl hover:bg-primary/10 relative text-muted-foreground hover:text-primary transition-all duration-300 active:scale-95 group"
                title="الرسائل"
              >
                <MessageCircle size={22} strokeWidth={2} className="group-hover:text-primary transition-colors duration-300" />
                {/* Pulse indicator for unread messages - no count, just pulse */}
                {hasUnreadMessages && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                )}
              </button>
            )}

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2.5 rounded-xl hover:bg-primary/10 relative text-muted-foreground hover:text-primary transition-all duration-300 active:scale-95 group"
              >
                <Bell size={22} strokeWidth={2} className="group-hover:text-primary transition-colors duration-300" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-red-500 text-[11px] text-white font-bold">
                      {unreadCount}
                    </span>
                  </span>
                )}
              </button>

              <NotificationsPopover
                isOpen={isNotifOpen}
                notifications={notifications}
                onClose={() => setIsNotifOpen(false)}
                onMarkAsRead={handleMarkAsRead}
                onClearAll={handleClearNotifications}
              />
            </div>

            {/* Sign Out (if logged in) */}
            {user && (
              <button
                onClick={handleSignOut}
                className="hidden sm:flex p-2.5 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all active:scale-95"
                title="تسجيل الخروج"
              >
                <LogOut size={20} strokeWidth={2} />
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div
          id="main-scroll-container"
          ref={scrollContainerRef}
          className="flex-1 min-h-0 bg-background relative overflow-hidden"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}-${view}-${selectedRequest?.id || 'list'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 0.1, 
                ease: "easeInOut"
              }}
              className="absolute inset-0 flex flex-col overflow-auto"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Language Popup */}
      <AnimatePresence>
        {isLanguagePopupOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-bold">تبديل اللغة</h3>
                <button
                  onClick={() => setIsLanguagePopupOpen(false)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Language Options */}
                <div className="space-y-2">
                  {/* Arabic */}
                  <button
                    onClick={() => setCurrentLanguage('ar')}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                      currentLanguage === 'ar'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl text-primary font-bold text-lg shrink-0">
                        AR
                      </div>
                      <div className="text-right">
                        <span className="font-bold block">العربية</span>
                        <span className="text-xs text-muted-foreground">اللغة الحالية</span>
                      </div>
                    </div>
                    {currentLanguage === 'ar' && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </button>

                  {/* English */}
                  <button
                    disabled
                    className="w-full p-4 rounded-xl border-2 border-border opacity-50 cursor-not-allowed flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-secondary rounded-xl text-muted-foreground font-bold text-lg shrink-0">
                        EN
                      </div>
                      <div className="text-right">
                        <span className="font-bold block">English</span>
                        <span className="text-xs text-muted-foreground">قريباً</span>
                      </div>
                    </div>
                  </button>

                  {/* Urdu */}
                  <button
                    disabled
                    className="w-full p-4 rounded-xl border-2 border-border opacity-50 cursor-not-allowed flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-secondary rounded-xl text-muted-foreground font-bold text-lg shrink-0">
                        UR
                      </div>
                      <div className="text-right">
                        <span className="font-bold block">اردو</span>
                        <span className="text-xs text-muted-foreground">قريباً</span>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Auto Translate Toggle */}
                <div className="p-4 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-sm">ترجمة جميع الطلبات تلقائياً</h4>
                      <p className="text-xs text-muted-foreground mt-1">ترجمة الطلبات للغة المحددة تلقائياً</p>
                    </div>
                    <button
                      onClick={() => setAutoTranslateRequests(!autoTranslateRequests)}
                      className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                        autoTranslateRequests ? "bg-primary" : "bg-gray-300"
                      }`}
                    >
                      <motion.div
                        animate={{ x: autoTranslateRequests ? -28 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-5 h-5 bg-white rounded-full shadow-lg"
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border">
                <button
                  onClick={() => setIsLanguagePopupOpen(false)}
                  className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
                >
                  حفظ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
