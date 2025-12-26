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
  fetchAllRequests, 
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

  // ==========================================
  // Scroll Persistence
  // ==========================================
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [marketplaceScrollPos, setMarketplaceScrollPos] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

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
      
      console.log("🔍 Checking connection...", { 
        online: navigator.onLine,
        timestamp: new Date().toLocaleTimeString()
      });

      // Attempt to check if we can even reach the internet
      try {
        await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
        console.log("🌐 Internet Ping (Google): OK");
      } catch (e) {
        console.warn("🌐 Internet Ping (Google): FAILED - Your browser/network might be offline or blocking outbound requests.");
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/e4b972a3-10fd-4bed-a97d-4392044af213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:loadData',message:'loadData started',data:{online:navigator.onLine},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      
      // Check connections in parallel for better performance
      const startTime = Date.now();
      
      // Run both checks in parallel
      const [supabaseStatus, aiStatus] = await Promise.all([
        checkSupabaseConnection(),
        checkAIConnection()
      ]);
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/e4b972a3-10fd-4bed-a97d-4392044af213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:loadData',message:'connection checks completed',data:{duration:Date.now()-startTime,supabaseConnected:supabaseStatus.connected,aiConnected:aiStatus.connected},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      
      setConnectionStatus({
        supabase: supabaseStatus,
        ai: aiStatus,
      });

      console.log("📊 Final Connection Status:", { supabase: supabaseStatus, ai: aiStatus });

      // Load data from Supabase 
      // EVEN IF status check failed, we try to fetch once to be sure
      try {
        setIsLoadingData(true);
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/e4b972a3-10fd-4bed-a97d-4392044af213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:loadData:beforeFetch',message:'About to fetch requests',data:{supabaseConnected:supabaseStatus.connected,supabaseError:supabaseStatus.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        
        // Fetch all public requests
        console.log("📥 Attempting to fetch real requests from Supabase...");
        const allReqs = await fetchAllRequests();
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/e4b972a3-10fd-4bed-a97d-4392044af213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:loadData:afterFetch',message:'Fetch completed',data:{isArray:Array.isArray(allReqs),length:allReqs?.length,firstTitle:allReqs?.[0]?.title},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2,H3'})}).catch(()=>{});
        // #endregion
        
        // If we got data, we are actually connected!
        if (Array.isArray(allReqs) && allReqs.length > 0) {
          console.log(`✅ Success! Fetched ${allReqs.length} real requests.`);
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/e4b972a3-10fd-4bed-a97d-4392044af213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:loadData:setReal',message:'Setting REAL requests',data:{count:allReqs.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
          // #endregion
          setAllRequests(allReqs);
          // Connection is already tracked via connectionStatus
        } else if (supabaseStatus.connected) {
          // If check was OK but no data, just set empty array
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/e4b972a3-10fd-4bed-a97d-4392044af213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:loadData:emptyArray',message:'Setting empty array (connected but no data)',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
          // #endregion
          setAllRequests([]);
        } else {
          // Both check and fetch failed
          throw new Error("Both connection check and initial fetch failed");
        }
        
        // Fetch user's data if logged in
        if (user?.id) {
            const myReqs = await fetchMyRequests(user.id);
            // Exclude archived requests from main list
            setMyRequests(myReqs.filter(r => r.status !== 'archived'));
            
            const offers = await fetchMyOffers(user.id);
            // Exclude archived offers from main list
            setMyOffers(offers.filter(o => o.status !== 'archived'));
            
            // Fetch archived items separately
            const archivedReqs = await fetchArchivedRequests(user.id);
            setArchivedRequests(archivedReqs);
            
            const archivedOffs = await fetchArchivedOffers(user.id);
            setArchivedOffers(archivedOffs);
          } else {
            setMyRequests([]);
            setMyOffers([]);
            setArchivedRequests([]);
            setArchivedOffers([]);
          }
        } catch (error) {
          console.error("Error loading data:", error);
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/e4b972a3-10fd-4bed-a97d-4392044af213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:loadData:catch',message:'FALLBACK to MOCK_REQUESTS',data:{error:String(error),mockCount:MOCK_REQUESTS.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2,H4'})}).catch(()=>{});
          // #endregion
          // Fallback to mock data if Supabase fails
          console.log("📦 Using mock data as fallback");
          setAllRequests(MOCK_REQUESTS);
        } finally {
          setIsLoadingData(false);
          loadingRef.current = false;
        }
      };

      loadData();
    }, [appView, user?.id]);

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
    setMode(newMode);
    const newView = newMode === "requests" ? "create-request" : "marketplace";
    setView(newView);
    
    // Reset scroll position when switching modes
    if (newMode === "offers") {
      setMarketplaceScrollPos(0);
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
    if (view === "marketplace" && scrollContainerRef.current) {
      setMarketplaceScrollPos(scrollContainerRef.current.scrollTop);
    }

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

  // Restore scroll position
  useEffect(() => {
    if (view !== "request-detail" && scrollContainerRef.current) {
      if (view === "create-request" && mode === "requests") {
        // Reset scroll immediately when switching to create-request in requests mode
        scrollContainerRef.current.scrollTop = 0;
      } else if (view === "marketplace" && mode === "offers") {
        // Restore marketplace scroll position immediately
        scrollContainerRef.current.scrollTop = marketplaceScrollPos;
      }
    }
  }, [view, mode, marketplaceScrollPos]);

  const handleSelectRequest = (req: Request, scrollToOffer = false) => {
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
    if (!connectionStatus?.supabase.connected) return;

    try {
      const allReqs = await fetchAllRequests();
      setAllRequests(allReqs);

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
              />
            </div>
          </div>
        );
      case "marketplace":
        
        return (
          <Marketplace
            requests={allRequests}
            interestsRequests={interestsRequests}
            unreadInterestsCount={unreadInterestsCount}
            myOffers={myOffers}
            onSelectRequest={handleSelectRequest}
            userInterests={userInterests}
            onUpdateInterests={setUserInterests}
            savedScrollPosition={marketplaceScrollPos}
            onScrollPositionChange={setMarketplaceScrollPos}
          />
        );
      case "request-detail":
        return selectedRequest ? (
            <RequestDetail
              request={selectedRequest}
              mode={mode}
              myOffer={getMyOfferOnRequest(selectedRequest.id)}
            onBack={() => {
              setSelectedRequest(null);
              setScrollToOfferSection(false);
              setView("marketplace");
            }}
            isGuest={isGuest}
            scrollToOfferSection={scrollToOfferSection}
            onNavigateToMessages={async (conversationId, userId, requestId, offerId) => {
              // Import getOrCreateConversation
              const { getOrCreateConversation } = await import('./services/messagesService');
              const { getCurrentUser } = await import('./services/authService');
              
              if (userId && requestId) {
                const currentUser = await getCurrentUser();
                if (currentUser) {
                  const conv = await getOrCreateConversation(userId, requestId, offerId);
                  if (conv) {
                    setPreviousView(view);
                    setView("messages");
                    // TODO: Navigate to specific conversation
                  }
                }
              } else {
                setPreviousView(view);
                setView("messages");
              }
            }}
            />
        ) : null;
      case "settings":
        return (
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
        );
      case "profile":
        return <Profile userReviews={reviews} userRating={userRating} />;
      case "messages":
        return (
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
        );
      case "conversation":
        return (
          <Messages
            onBack={() => setView("messages")}
            onSelectConversation={(conversationId) => {
              // Already in conversation view
            }}
          />
        );
      default:
        return <div className="p-8">View not found</div>;
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
                    <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-red-500 text-[10px] text-white font-bold">
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
          className="flex-1 flex flex-col min-h-0 bg-background relative overflow-auto"
        >
          <AnimatePresence mode="sync">
            <motion.div
              key={`${mode}-${view}-${selectedRequest?.id || 'list'}`}
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 0.15, 
                ease: "easeInOut"
              }}
              className="h-full w-full flex flex-col"
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
                      <span className="text-2xl">🇸🇦</span>
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
                      <span className="text-2xl">🇬🇧</span>
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
                      <span className="text-2xl">🇵🇰</span>
                      <div className="text-right">
                        <span className="font-bold block">اردو</span>
                        <span className="text-xs text-muted-foreground">قريباً</span>
                      </div>
                    </div>
                  </button>
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
