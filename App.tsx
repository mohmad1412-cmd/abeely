import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { UnifiedHeader } from "./components/ui/UnifiedHeader";
import { SwipeGestureHandler } from "./components/ui/SwipeGestureHandler";

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
import { CreateRequestV2 } from "./components/CreateRequestV2";
import { GlobalAIOrb } from "./components/GlobalAIOrb";


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
import { MOCK_REQUESTS, MOCK_REVIEWS, AVAILABLE_CATEGORIES } from "./data";
import {
  clearAllNotifications,
  getNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from "./services/notificationsService";

// Services
import {
  archiveOffer,
  archiveRequest,
  checkSupabaseConnection,
  fetchArchivedOffers,
  fetchArchivedRequests,
  fetchMyOffers,
  fetchMyRequests,
  fetchRequestsPaginated,
  subscribeToNewRequests,
  unarchiveOffer,
  unarchiveRequest,
} from "./services/requestsService";
import {
  getUnreadInterestsCount,
  getViewedRequestIds,
  subscribeToViewedRequests,
} from "./services/requestViewsService";
import { checkAIConnection } from "./services/aiService";
import { supabase } from "./services/supabaseClient";
import {
  getCurrentUser,
  onAuthStateChange,
  signOut as authSignOut,
  UserProfile,
} from "./services/authService";
import { FullScreenLoading } from "./components/ui/LoadingSkeleton";
import { ConnectionError } from "./components/ui/ConnectionError";
import { parseRoute, updateUrl, routeTypeToViewState, ParsedRoute } from "./services/routingService";
import { App as CapacitorApp } from "@capacitor/app";

// Auth Views
type AppView = "splash" | "auth" | "main" | "connection-error";

const App: React.FC = () => {
  // ==========================================
  // Auth State
  // ==========================================
  const [appView, setAppView] = useState<AppView>("splash");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

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
  const [currentLanguage, setCurrentLanguage] = useState<"ar" | "en" | "ur">(
    "ar",
  );
  const [autoTranslateRequests, setAutoTranslateRequests] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    interestedCategories: ["tech", "writing"],
    interestedCities: ["الرياض"],
    radarWords: [],
    notifyOnInterest: true,
    roleMode: "requester",
  });
  const [isModeSwitching, setIsModeSwitching] = useState(false); // Temporary state for button animation

  // ==========================================
  // Data State
  // ==========================================
  const [myRequests, setMyRequests] = useState<Request[]>([]);
  const [allRequests, setAllRequests] = useState<Request[]>([]);
  const [interestsRequests, setInterestsRequests] = useState<Request[]>([]); // طلبات اهتماماتي فقط
  const [unreadInterestsCount, setUnreadInterestsCount] = useState<number>(0); // عدد الطلبات غير المقروءة في اهتماماتي
  const [viewedRequestIds, setViewedRequestIds] = useState<Set<string>>(
    new Set(),
  ); // الطلبات المشاهدة من قاعدة البيانات
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [archivedRequests, setArchivedRequests] = useState<Request[]>([]);
  const [archivedOffers, setArchivedOffers] = useState<Offer[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [requestsLoadError, setRequestsLoadError] = useState<string | null>(
    null,
  );
  const MARKETPLACE_PAGE_SIZE = 10;
  const [marketplacePage, setMarketplacePage] = useState(0);
  const [marketplaceHasMore, setMarketplaceHasMore] = useState(true);
  const [marketplaceIsLoadingMore, setMarketplaceIsLoadingMore] = useState(
    false,
  );
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    {
      supabase: { connected: boolean; error?: string };
      ai: { connected: boolean; error?: string };
    } | null
  >(null);

  // Unify userInterests with userPreferences.interestedCategories to prevent desync
  const userInterests = userPreferences.interestedCategories;

  // ==========================================
  // Notification & Review State
  // ==========================================
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [reviews] = useState<Review[]>(MOCK_REVIEWS);
  const userRating = (reviews || []).reduce((acc, r) => acc + r.rating, 0) /
    ((reviews || []).length || 1);

  // ==========================================
  // Selection State
  // ==========================================
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [scrollToOfferSection, setScrollToOfferSection] = useState(false);
  const [navigatedFromSidebar, setNavigatedFromSidebar] = useState(false); // لتتبع مصدر التنقل

  // Save state when switching modes to restore when coming back
  const [savedOffersModeState, setSavedOffersModeState] = useState<
    {
      view: ViewState;
      selectedRequest: Request | null;
      scrollToOfferSection: boolean;
    } | null
  >(null);
  const [savedRequestsModeState, setSavedRequestsModeState] = useState<
    {
      view: ViewState;
    } | null
  >(null);

  // ==========================================
  // Scroll Persistence
  // ==========================================
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Separate scroll positions for each mode
  // Load from localStorage on mount
  const [marketplaceScrollPos, setMarketplaceScrollPos] = useState(() => {
    const saved = localStorage.getItem("abeely_marketplace_scroll");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [requestsModeScrollPos, setRequestsModeScrollPos] = useState(() => {
    const saved = localStorage.getItem("abeely_requests_scroll");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [chatAreaScrollPos, setChatAreaScrollPos] = useState(() => {
    const saved = localStorage.getItem("abeely_chatarea_scroll");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [requestDetailScrollPos, setRequestDetailScrollPos] = useState(() => {
    const saved = localStorage.getItem("abeely_requestdetail_scroll");
    return saved ? parseInt(saved, 10) : 0;
  });
  const notifRef = useRef<HTMLDivElement>(null);

  // Save to localStorage whenever scroll positions change
  useEffect(() => {
    localStorage.setItem(
      "abeely_marketplace_scroll",
      marketplaceScrollPos.toString(),
    );
  }, [marketplaceScrollPos]);

  useEffect(() => {
    localStorage.setItem(
      "abeely_requests_scroll",
      requestsModeScrollPos.toString(),
    );
  }, [requestsModeScrollPos]);

  useEffect(() => {
    localStorage.setItem(
      "abeely_chatarea_scroll",
      chatAreaScrollPos.toString(),
    );
  }, [chatAreaScrollPos]);

  useEffect(() => {
    localStorage.setItem(
      "abeely_requestdetail_scroll",
      requestDetailScrollPos.toString(),
    );
  }, [requestDetailScrollPos]);

  // ==========================================
  // State Persistence for ChatArea
  // ==========================================
  // Load saved messages from localStorage on mount
  const [savedChatMessages, setSavedChatMessages] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("abeely_chat_messages");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Keep only last 50 messages to prevent localStorage overflow
        return Array.isArray(parsed) ? parsed.slice(-50) : [];
      }
    } catch (e) {
      console.error("Error loading chat messages:", e);
    }
    return [];
  });

  // Save messages to localStorage when they change
  useEffect(() => {
    if (savedChatMessages.length > 0) {
      try {
        // Keep only last 50 messages
        const toSave = savedChatMessages.slice(-50);
        localStorage.setItem("abeely_chat_messages", JSON.stringify(toSave));
      } catch (e) {
        console.error("Error saving chat messages:", e);
      }
    }
  }, [savedChatMessages]);

  // ==========================================
  // State Persistence for RequestDetail
  // ==========================================
  const [savedOfferForms, setSavedOfferForms] = useState<
    Record<string, {
      price: string;
      duration: string;
      city: string;
      title: string;
      description: string;
      attachments: any[];
      guestVerificationStep?: "none" | "phone" | "otp";
      guestPhone?: string;
      guestOTP?: string;
    }>
  >({});

  // ==========================================
  // Deep Linking Handler - معالجة جميع الروابط
  // ==========================================
  
  // Ref لتتبع الرابط الذي ننتظره (للطلبات التي لم تُحمل بعد)
  const pendingDeepLinkRef = useRef<{ requestId?: string } | null>(null);
  
  // معالجة route بناءً على نوعه
  const handleRouteNavigation = (route: ParsedRoute) => {
    // تجاهل الروابط الفارغة
    if (!route.type) return;
    
    switch (route.type) {
      case 'request':
        if (route.params.requestId) {
          const request = allRequests.find((r) => r.id === route.params.requestId);
          if (request) {
            setSelectedRequest(request);
            setView("request-detail");
            setMode("offers");
            pendingDeepLinkRef.current = null;
          } else {
            // احفظ الرابط للمعالجة لاحقاً عندما تُحمل الطلبات
            pendingDeepLinkRef.current = { requestId: route.params.requestId };
          }
        }
        break;
        
      case 'marketplace':
        setView("marketplace");
        setMode("offers");
        break;
        
      case 'create':
        setView("create-request");
        setMode("requests");
        break;
        
      case 'profile':
        setPreviousView(view);
        setView("profile");
        break;
        
      case 'messages':
        setPreviousView(view);
        setView("messages");
        break;
        
      case 'conversation':
        setPreviousView(view);
        setView("conversation");
        break;
        
      case 'settings':
        setPreviousView(view);
        setView("settings");
        break;
        
      case 'home':
      default:
        setView("create-request");
        setMode("requests");
        break;
    }
  };
  
  useEffect(() => {
    // معالجة الروابط عند فتح التطبيق
    const handleInitialUrl = async () => {
      try {
        // في التطبيق المحمول
        if (typeof window !== "undefined" && (window as any).Capacitor) {
          const result = await CapacitorApp.getLaunchUrl();
          if (result?.url) {
            handleDeepLink(result.url);
          }

          // الاستماع للروابط عند فتح التطبيق
          CapacitorApp.addListener("appUrlOpen", (event) => {
            handleDeepLink(event.url);
          });
        } else {
          // في المتصفح - معالجة الرابط الحالي
          const route = parseRoute();
          handleRouteNavigation(route);
        }
      } catch (err) {
        console.error("Error handling deep link:", err);
      }
    };

    const handleDeepLink = (url: string) => {
      try {
        // تحليل URL وتحويله لـ route
        const urlObj = new URL(url);
        // استخدم pathname للتحليل
        const originalPath = window.location.pathname;
        // تغيير pathname مؤقتاً للتحليل
        Object.defineProperty(window.location, 'pathname', {
          value: urlObj.pathname,
          configurable: true
        });
        const route = parseRoute();
        // إعادة pathname الأصلي
        Object.defineProperty(window.location, 'pathname', {
          value: originalPath,
          configurable: true
        });
        
        handleRouteNavigation(route);
      } catch (err) {
        console.error("Error parsing deep link:", err);
      }
    };

    // معالجة الروابط عند تغيير URL في المتصفح (زر Back/Forward)
    const handlePopState = () => {
      const route = parseRoute();
      handleRouteNavigation(route);
    };

    window.addEventListener("popstate", handlePopState);
    handleInitialUrl();

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
  
  // معالجة الروابط المعلقة عندما تُحمل الطلبات
  useEffect(() => {
    if (pendingDeepLinkRef.current?.requestId && allRequests.length > 0) {
      const requestId = pendingDeepLinkRef.current.requestId;
      const request = allRequests.find((r) => r.id === requestId);
      if (request) {
        setSelectedRequest(request);
        setView("request-detail");
        setMode("offers");
        pendingDeepLinkRef.current = null;
      }
    }
  }, [allRequests]);
  
  // ==========================================
  // URL Sync - تحديث URL عند تغيير الـ view
  // ==========================================
  useEffect(() => {
    // لا تحدث URL في حالات معينة
    if (appView !== 'main') return;
    
    // تحديث URL حسب الـ view الحالي
    switch (view) {
      case 'request-detail':
        if (selectedRequest?.id) {
          updateUrl('request-detail', { requestId: selectedRequest.id });
        }
        break;
      case 'marketplace':
        updateUrl('marketplace');
        break;
      case 'create-request':
        updateUrl('create-request');
        break;
      case 'profile':
        updateUrl('profile', user?.id ? { userId: user.id } : undefined);
        break;
      case 'messages':
        updateUrl('messages');
        break;
      case 'conversation':
        updateUrl('conversation');
        break;
      case 'settings':
        updateUrl('settings');
        break;
    }
  }, [view, selectedRequest?.id, appView]);

  // ==========================================
  // Auth Initialization & State Listener
  // ==========================================
  useEffect(() => {
    let isMounted = true;

    // Supabase يتعامل مع OAuth callback تلقائياً بسبب detectSessionInUrl: true
    // نحن فقط نستمع لتغييرات الـ session
    
    const initializeAuth = async () => {
      try {
        // تحقق أولاً إذا كان هذا OAuth callback مع PKCE code
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const hasAccessToken = window.location.hash.includes("access_token");
        const hasError = window.location.hash.includes("error") || urlParams.get('error');
        
        if (code || hasAccessToken) {
          console.log("🔐 OAuth callback detected:", code ? "PKCE code" : "access_token");
          setIsProcessingOAuth(true);
          
          // إذا كان هناك code (PKCE flow)، استبدله بـ session
          if (code) {
            console.log("🔄 Exchanging PKCE code for session...");
            const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (exchangeError) {
              console.error("❌ PKCE exchange error:", exchangeError);
              // نظف URL وأعد المحاولة
              window.history.replaceState({}, document.title, window.location.pathname || "/");
              setIsProcessingOAuth(false);
              // سيتم التعامل مع الـ auth عبر onAuthStateChange
            } else if (exchangeData?.session?.user && isMounted) {
              console.log("✅ PKCE session obtained:", exchangeData.session.user.email);
              
              // تحميل أو إنشاء الـ profile
              let profile = await getCurrentUser();
              
              if (!profile) {
                console.log("⏳ Profile not found, waiting for trigger...");
                await new Promise(resolve => setTimeout(resolve, 1000));
                profile = await getCurrentUser();
              }
              
              if (profile && isMounted) {
                setUser(profile);
              }
              
              setIsGuest(false);
              localStorage.removeItem("abeely_guest_mode");
              setIsProcessingOAuth(false);
              setAppView("main");
              setAuthLoading(false);
              
              // تنظيف URL
              window.history.replaceState({}, document.title, window.location.pathname || "/");
              return;
            }
          } else if (hasAccessToken) {
            // Implicit flow (hash contains access_token)
            // Supabase detectSessionInUrl سيتعامل معه تلقائياً
            await new Promise(resolve => setTimeout(resolve, 500));
            const { data } = await supabase.auth.getSession();
            
            if (data?.session?.user && isMounted) {
              let profile = await getCurrentUser();
              if (!profile) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                profile = await getCurrentUser();
              }
              if (profile && isMounted) setUser(profile);
              
              setIsGuest(false);
              localStorage.removeItem("abeely_guest_mode");
              setIsProcessingOAuth(false);
              setAppView("main");
              setAuthLoading(false);
              window.history.replaceState({}, document.title, window.location.pathname || "/");
              return;
            }
          }
          
          // تنظيف URL إذا لم ننجح
          window.history.replaceState({}, document.title, window.location.pathname || "/");
          setIsProcessingOAuth(false);
        }
        
        if (hasError) {
          console.error("❌ OAuth error in URL");
          window.history.replaceState({}, document.title, window.location.pathname || "/");
        }
        
        // انتظر قليلاً للسماح لـ Supabase بمعالجة أي OAuth callback
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // تحقق من وجود session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("❌ getSession error:", error);
        }
        
        if (session?.user && isMounted) {
          console.log("✅ Session found, loading profile...");
          const profile = await getCurrentUser();
          if (profile && isMounted) {
            setUser(profile);
          }
          setIsGuest(false);
          localStorage.removeItem("abeely_guest_mode");
          setAppView("main");
          setAuthLoading(false);
          
          // تنظيف URL إذا كان فيه OAuth params
          if (window.location.search.includes("code=") || window.location.hash.includes("access_token")) {
            window.history.replaceState({}, document.title, window.location.pathname || "/");
          }
          return;
        }

        // تحقق من وجود guest mode محفوظ
        const isGuestSaved = localStorage.getItem("abeely_guest_mode") === "true";
        if (isGuestSaved && isMounted) {
          setIsGuest(true);
          setAppView("main");
          setAuthLoading(false);
          return;
        }

        // تحقق من نوع الرابط - الصفحات العامة تدخل كضيف
        const route = parseRoute();
        const isPublicRoute = route.type === 'request' || 
                             route.type === 'marketplace' || 
                             route.type === 'home' ||
                             route.type === 'create';
        
        if (isPublicRoute && isMounted) {
          setIsGuest(true);
          localStorage.setItem("abeely_guest_mode", "true");
          setAppView("main");
        } else if (isMounted) {
          setAppView("auth");
        }
      } catch (err) {
        console.error("Auth init error:", err);
        if (isMounted) {
          setIsProcessingOAuth(false);
          setAppView("auth");
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
          setIsProcessingOAuth(false);
        }
      }
    };

    // الاستماع لتغييرات حالة المصادقة - هذا هو المكان الرئيسي لمعالجة OAuth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔐 Auth state changed:", event, session?.user?.email);
      
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user && isMounted) {
        console.log("✅ User signed in:", session.user.email);
        
        // تحميل أو انتظار إنشاء الـ profile
        let profile = await getCurrentUser();
        
        // إذا لم يوجد profile، انتظر قليلاً (قد يكون الـ trigger يعمل)
        if (!profile && isMounted) {
          console.log("⏳ Profile not found, waiting for trigger...");
          await new Promise(resolve => setTimeout(resolve, 1500));
          profile = await getCurrentUser();
        }
        
          if (profile && isMounted) {
            setUser(profile);
          }
          
          setIsGuest(false);
          localStorage.removeItem("abeely_guest_mode");
          setIsProcessingOAuth(false);
          setAppView("main");
          setAuthLoading(false);
          
          // تنظيف URL
          if (window.location.search.includes("code=") || window.location.hash.includes("access_token")) {
            window.history.replaceState({}, document.title, window.location.pathname || "/");
          }
      } else if (event === "TOKEN_REFRESHED" && session?.user && isMounted) {
        // تحديث الـ profile فقط
        const profile = await getCurrentUser();
        if (profile && isMounted) {
          setUser(profile);
        }
      } else if (event === "SIGNED_OUT" && isMounted) {
        setUser(null);
        setIsGuest(false);
        setAppView("auth");
      }
    });

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ==========================================
  // Splash Screen Complete Handler
  // ==========================================
  const handleSplashComplete = useCallback(() => {
    // إذا كنا نعالج OAuth callback، لا تنتقل لـ auth
    if (authLoading || isProcessingOAuth) {
      console.log("⏳ Splash complete but still loading auth or processing OAuth...");
      return;
    }

    if (user) {
      setAppView("main");
    } else if (isGuest) {
      setAppView("main");
    } else {
      setAppView("auth");
    }
  }, [authLoading, user, isGuest, isProcessingOAuth]);

  // ==========================================
  // Connection Retry Handler
  // ==========================================
  const handleConnectionRetry = async () => {
    setIsRetrying(true);
    setConnectionError(null);

    try {
      // Try to check connection first
      const isConnected = await checkSupabaseConnection();

      if (isConnected) {
        // Connection restored, try to get session again
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const profile = await getCurrentUser();
          if (profile) {
            setUser(profile);
            setIsGuest(false);
            setAppView("main");
          } else {
            setAppView("auth");
          }
        } else {
          // Check if was guest before
          const wasGuest = localStorage.getItem("abeely_guest_mode") === "true";
          if (wasGuest) {
            setIsGuest(true);
            setAppView("main");
          } else {
            setAppView("auth");
          }
        }
      } else {
        setConnectionError("الخدمة غير متاحة حالياً. يرجى المحاولة بعد قليل.");
        setAppView("connection-error");
      }
    } catch (err: any) {
      console.error("Retry connection error:", err);
      setConnectionError("لم نتمكن من الاتصال. تأكد من اتصالك بالإنترنت.");
      setAppView("connection-error");
    } finally {
      setIsRetrying(false);
    }
  };

  // Handle entering guest mode from connection error
  const handleGuestModeFromError = () => {
    setIsGuest(true);
    localStorage.setItem("abeely_guest_mode", "true");
    setConnectionError(null);
    setAppView("main");
  };

  // Watch for auth loading completion after splash
  useEffect(() => {
    if (appView === "splash" && !authLoading) {
      // Minimal delay - just enough for smooth transition
      const timer = setTimeout(() => {
        handleSplashComplete();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [authLoading, appView, handleSplashComplete]);

  // Failsafe: Force exit splash after maximum time (3 seconds)
  useEffect(() => {
    if (appView !== "splash") return;
    
    const failsafeTimer = setTimeout(() => {
      console.warn("⚠️ Splash failsafe triggered - forcing exit");
      if (appView === "splash") {
        setAuthLoading(false);
        // إذا لم يتم تحديد أي شيء بعد 3 ثواني، اذهب لصفحة تسجيل الدخول
        setAppView("auth");
      }
    }, 3000);

    return () => clearTimeout(failsafeTimer);
  }, [appView]);

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
    // Start loading public data immediately
    const loadPublicData = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;

      try {
        setIsLoadingData(true);
        const { data: firstPage, count: totalCount } =
          await fetchRequestsPaginated(0, MARKETPLACE_PAGE_SIZE);

        if (Array.isArray(firstPage)) {
          setAllRequests(firstPage);
          setMarketplacePage(0);
          setMarketplaceHasMore(firstPage.length === MARKETPLACE_PAGE_SIZE);
        }
      } catch (error) {
        console.error("Error loading public data:", error);
      } finally {
        setIsLoadingData(false);
        loadingRef.current = false;
      }
    };

    loadPublicData();

    // Background connection checks
    Promise.all([
      checkSupabaseConnection(),
      checkAIConnection(),
    ]).then(([supabaseStatus, aiStatus]) => {
      setConnectionStatus({
        supabase: supabaseStatus,
        ai: aiStatus,
      });
    });
  }, []);

  // Separate effect for user-specific data
  useEffect(() => {
    if (!user?.id) {
      setMyRequests([]);
      setMyOffers([]);
      setArchivedRequests([]);
      setArchivedOffers([]);
      return;
    }

    const loadUserData = async () => {
      try {
        await Promise.all([
          fetchMyRequests(user.id).then((reqs) =>
            setMyRequests(reqs.filter((r) => r.status !== "archived"))
          ),
          fetchMyOffers(user.id).then((offers) =>
            setMyOffers(offers.filter((o) => o.status !== "archived"))
          ),
          fetchArchivedRequests(user.id).then(setArchivedRequests),
          fetchArchivedOffers(user.id).then(setArchivedOffers),
        ]);
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    loadUserData();
  }, [user?.id]);

  // ==========================================
  // Load Viewed Requests from Backend
  // ==========================================
  useEffect(() => {
    if (!user?.id || isGuest) {
      setViewedRequestIds(new Set());
      return;
    }

    // Initial load
    const loadViewedRequests = async () => {
      const ids = await getViewedRequestIds();
      setViewedRequestIds(ids);
    };
    loadViewedRequests();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToViewedRequests(user.id, (ids) => {
      setViewedRequestIds(ids);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, isGuest]);

  // ==========================================
  // Reload Data When Opening Marketplace
  // ==========================================
  useEffect(() => {
    if (appView !== "main" || view !== "marketplace") return;
    if (loadingRef.current) return;
    if (allRequests.length === 0 || requestsLoadError) {
      // Trigger reload if no data or error
      const reloadData = async () => {
        loadingRef.current = true;
        try {
          setIsLoadingData(true);
          setRequestsLoadError(null);
          const { data: firstPage, count: totalCount } =
            await fetchRequestsPaginated(0, MARKETPLACE_PAGE_SIZE);
          if (Array.isArray(firstPage)) {
            setAllRequests(firstPage);
            setMarketplacePage(0);
            const more = typeof totalCount === "number"
              ? firstPage.length < totalCount
              : firstPage.length === MARKETPLACE_PAGE_SIZE;
            setMarketplaceHasMore(more);
          }
        } catch (error) {
          console.error("Error reloading marketplace data:", error);
          setRequestsLoadError(
            "حدث خطأ في تحميل الطلبات. يرجى المحاولة مرة أخرى.",
          );
        } finally {
          setIsLoadingData(false);
          loadingRef.current = false;
        }
      };
      reloadData();
    }
  }, [view, appView, allRequests.length, requestsLoadError]);

  // ==========================================
  // Auto-Retry: Check Connection & Reload Data
  // ==========================================
  useEffect(() => {
    // Only run when in main view, loading, and no data yet
    if (appView !== "main") return;
    if (!isLoadingData && allRequests.length > 0) return;
    if (loadingRef.current) return;

    let retryCount = 0;
    const maxRetries = 60; // Max 5 minutes (60 * 5s)

    const checkAndReload = async () => {
      if (retryCount >= maxRetries) {
        console.log("[Auto-Retry] Max retries reached, stopping auto-check");
        return;
      }

      retryCount++;
      console.log(
        `[Auto-Retry] Checking connection (attempt ${retryCount})...`,
      );

      try {
        const status = await checkSupabaseConnection();

        if (status.connected) {
          console.log("[Auto-Retry] Connection restored! Reloading data...");
          loadingRef.current = true;
          setIsLoadingData(true);
          setRequestsLoadError(null);

          try {
            const { data: firstPage, count: totalCount } =
              await fetchRequestsPaginated(0, MARKETPLACE_PAGE_SIZE);
            if (Array.isArray(firstPage) && firstPage.length > 0) {
              setAllRequests(firstPage);
              setMarketplacePage(0);
              const more = typeof totalCount === "number"
                ? firstPage.length < totalCount
                : firstPage.length === MARKETPLACE_PAGE_SIZE;
              setMarketplaceHasMore(more);
              console.log("[Auto-Retry] Data loaded successfully!");
            }
          } catch (loadError) {
            console.error(
              "[Auto-Retry] Failed to load data after connection restored:",
              loadError,
            );
          } finally {
            setIsLoadingData(false);
            loadingRef.current = false;
          }
        } else {
          console.log(`[Auto-Retry] Still disconnected: ${status.error}`);
        }
      } catch (err) {
        console.log("[Auto-Retry] Connection check failed:", err);
      }
    };

    // Start checking every 5 seconds
    const intervalId = setInterval(checkAndReload, 5000);

    // Also check immediately
    checkAndReload();

    return () => {
      clearInterval(intervalId);
    };
  }, [appView, isLoadingData, allRequests.length]);

  // ==========================================
  // Loading Timeout: Show friendly error after 10s
  // ==========================================
  useEffect(() => {
    if (appView !== "main") return;
    if (allRequests.length > 0) return;
    if (!isLoadingData) return;
    if (requestsLoadError) return;

    const timeoutId = setTimeout(() => {
      if (isLoadingData && allRequests.length === 0) {
        setRequestsLoadError("قد يكون هناك مشكلة مؤقتة في الاتصال");
        setIsLoadingData(false);
      }
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [appView, isLoadingData, allRequests.length, requestsLoadError]);

  // ==========================================
  // Load Notifications from Supabase
  // ==========================================
  useEffect(() => {
    if (appView !== "main" || !user?.id) return;

    const loadNotifications = async () => {
      try {
        const notifs = await getNotifications(50);
        setNotifications(notifs);
      } catch (error) {
        console.error("Error loading notifications:", error);
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
      const { data: pageData, count: totalCount } =
        await fetchRequestsPaginated(nextPage, MARKETPLACE_PAGE_SIZE);
      setAllRequests((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        const merged = [...prev];
        for (const r of pageData) {
          if (!seen.has(r.id)) merged.push(r);
        }
        return merged;
      });
      setMarketplacePage(nextPage);
      const loadedSoFar = allRequests.length + (pageData?.length || 0);
      const more = typeof totalCount === "number"
        ? loadedSoFar < totalCount
        : (pageData?.length || 0) === MARKETPLACE_PAGE_SIZE;
      setMarketplaceHasMore(more);
    } catch (e) {
      console.error("Error loading more requests:", e);
      setMarketplaceHasMore(false);
    } finally {
      setMarketplaceIsLoadingMore(false);
    }
  };

  // ==========================================
  // Load Interests Requests and Unread Count
  // ==========================================
  useEffect(() => {
    if (appView !== "main" || (!user?.id && !isGuest)) return;

    const loadInterestsData = async () => {
      try {
        const activeCategories = userPreferences.interestedCategories;
        const activeCities = userPreferences.interestedCities;

        // Filter all requests by interests
        const hasInterests = activeCategories.length > 0 ||
          activeCities.length > 0;

        if (hasInterests) {
          const filtered = allRequests.filter((req) => {
            // Check categories match
            const catMatch = activeCategories.length === 0 ||
              (req.categories || []).some((catLabel) => {
                return activeCategories.some((interestId) => {
                  const categoryObj = AVAILABLE_CATEGORIES.find((c) =>
                    c.id === interestId
                  );
                  const interestLabels = [interestId];
                  if (categoryObj) interestLabels.push(categoryObj.label);

                  return interestLabels.some((label) =>
                    catLabel.toLowerCase().includes(label.toLowerCase()) ||
                    label.toLowerCase().includes(catLabel.toLowerCase())
                  );
                });
              });

            // Check city match
            const cityMatch = activeCities.length === 0 ||
              (req.location &&
                activeCities.some((city) =>
                  req.location.toLowerCase().includes(city.toLowerCase()) ||
                  city.toLowerCase().includes(req.location.toLowerCase())
                ));

            return catMatch && cityMatch;
          });

          setInterestsRequests(filtered);
          const count = await getUnreadInterestsCount();
          setUnreadInterestsCount(count);
        } else {
          setInterestsRequests([]);
          setUnreadInterestsCount(0);
        }
      } catch (error) {
        console.error("Error loading interests data:", error);
      }
    };

    loadInterestsData();
  }, [
    appView,
    user?.id,
    isGuest,
    allRequests,
    userPreferences.interestedCategories,
    userPreferences.interestedCities,
  ]);

  // ==========================================
  // Subscribe to New Requests (Interests Only)
  // ==========================================
  useEffect(() => {
    if (appView !== "main") return;

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
          const exists = prev.some((r) => r.id === newRequest.id);
          if (exists) return prev;
          return [newRequest, ...prev];
        });

        // Increase unread count
        setUnreadInterestsCount((prev) => prev + 1);

        // Show notification if enabled (will be handled by database trigger)
        if (userPreferences.notifyOnInterest) {
          console.log("🎯 طلب جديد يطابق اهتماماتك:", newRequest.title);
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [
    appView,
    userPreferences.interestedCategories,
    userPreferences.interestedCities,
    userPreferences.notifyOnInterest,
  ]);

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

    // الصفحات العامة التي لا يجب حفظها كجزء من حالة الوضع
    const globalViews: ViewState[] = [
      "settings",
      "profile",
      "messages",
      "conversation",
    ];
    const isGlobalView = globalViews.includes(view);

    // Save current state before switching modes (تجاهل الصفحات العامة)
    if (!isGlobalView) {
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
    }

    setMode(newMode);

    // إذا كنا في صفحة عامة، ننتقل للصفحة الافتراضية للوضع الجديد
    if (isGlobalView) {
      const defaultView = newMode === "requests"
        ? "create-request"
        : "marketplace";
      setView(defaultView);
      setSelectedRequest(null);
      setScrollToOfferSection(false);
      return;
    }

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
      const defaultView = newMode === "requests"
        ? "create-request"
        : "marketplace";
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

    // Start animation
    setIsModeSwitching(true);

    setTitleKey((prev) => prev + 1);
    handleModeSwitch(mode === "requests" ? "offers" : "requests");

    // Reset animation state after a short delay
    setTimeout(() => {
      setIsModeSwitching(false);
    }, 600);
  };

  const handleNavigate = (newView: any) => {
    // Auto-switch mode if needed based on view to keep state consistent
    if (newView === "marketplace" || newView === "request-detail") {
      if (mode !== "offers") setMode("offers");
    } else if (newView === "create-request") {
      if (mode !== "requests") setMode("requests");
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

  const handleSelectRequest = (
    req: Request,
    scrollToOffer = false,
    fromSidebar = false,
  ) => {
    // Marketplace component already saves scroll position via onScrollPositionChange
    // No need to manually save it here - marketplaceScrollPos is already up to date
    setSelectedRequest(req);
    setScrollToOfferSection(scrollToOffer);
    setNavigatedFromSidebar(fromSidebar); // تتبع مصدر التنقل
    setView("request-detail");
    if (window.innerWidth < 768) setIsSidebarOpen(false);

    // Update viewed requests immediately for optimistic UI
    // Backend will be updated by RequestDetail component via markRequestAsViewed
    if (user?.id && !isGuest) {
      setViewedRequestIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(req.id);
        return newSet;
      });
    }
  };

  const handleSelectOffer = (offer: Offer, fromSidebar = false) => {
    const relatedRequest = allRequests.find((r) => r.id === offer.requestId);
    if (relatedRequest) {
      setSelectedRequest(relatedRequest);
      setNavigatedFromSidebar(fromSidebar); // تتبع مصدر التنقل
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

  const handleRequestRead = (requestId: string) => {
    setUnreadInterestsCount((prev) => Math.max(0, prev - 1));
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

      const { data: firstPage, count: totalCount } =
        await fetchRequestsPaginated(0, MARKETPLACE_PAGE_SIZE);
      setAllRequests(firstPage);
      setMarketplacePage(0);
      const more = typeof totalCount === "number"
        ? firstPage.length < totalCount
        : firstPage.length === MARKETPLACE_PAGE_SIZE;
      setMarketplaceHasMore(more);

      if (user?.id) {
        const myReqs = await fetchMyRequests(user.id);
        setMyRequests(myReqs.filter((r) => r.status !== "archived"));

        const offers = await fetchMyOffers(user.id);
        setMyOffers(offers.filter((o) => o.status !== "archived"));

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
    localStorage.removeItem("abeely_guest_mode");
    // إعادة تعيين الحالة للقيم الافتراضية لمنع بقاء آثار الجلسة السابقة
    setView("create-request");
    setMode("requests");
    setSelectedRequest(null);
    setPreviousView(null);
    setSavedOffersModeState(null);
    setSavedRequestsModeState(null);
    setAppView("auth");
  };

  // ==========================================
  // Go to Login Handler (for guest mode)
  // ==========================================
  const handleGoToLogin = () => {
    setIsGuest(false);
    localStorage.removeItem("abeely_guest_mode");
    setAppView("auth");
  };

  // ==========================================
  // View Rendering Logic
  // ==========================================
  const renderContent = () => {
    switch (view) {
      case "create-request":
        // استخدام واجهة إنشاء الطلب الجديدة (V2)
        return (
          <CreateRequestV2
            onBack={() => {
              handleNavigate(mode === "requests" ? "marketplace" : "marketplace");
            }}
            onPublish={(request) => {
              console.log("Publishing request:", request);
              // TODO: Implement actual publish logic
              reloadData();
            }}
            // Header Props
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            mode={mode}
            toggleMode={toggleMode}
            isModeSwitching={isModeSwitching}
            unreadCount={unreadCount}
            user={user}
            titleKey={titleKey}
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onClearAll={handleClearNotifications}
            onSignOut={isGuest ? handleGoToLogin : handleSignOut}
            isGuest={isGuest}
          />
        );
      case "marketplace":
        return (
          <div className="h-full flex flex-col overflow-hidden relative">
            {allRequests && Array.isArray(allRequests)
              ? (
                <Marketplace
                  requests={allRequests}
                  interestsRequests={interestsRequests}
                  unreadInterestsCount={unreadInterestsCount}
                  myOffers={myOffers}
                  onSelectRequest={handleSelectRequest}
                  userInterests={userInterests}
                  onUpdateInterests={(interests) => {
                    setUserPreferences((prev) => ({
                      ...prev,
                      interestedCategories: interests,
                    }));
                  }}
                  interestedCities={userPreferences.interestedCities}
                  onUpdateCities={(cities) => {
                    setUserPreferences((prev) => ({
                      ...prev,
                      interestedCities: cities,
                    }));
                  }}
                  hasMore={marketplaceHasMore}
                  isLoadingMore={marketplaceIsLoadingMore}
                  isLoading={isLoadingData}
                  onLoadMore={loadMoreMarketplaceRequests}
                  onRefresh={reloadData}
                  loadError={requestsLoadError}
                  savedScrollPosition={marketplaceScrollPos}
                  onScrollPositionChange={setMarketplaceScrollPos}
                  // Viewed requests from Backend
                  viewedRequestIds={viewedRequestIds}
                  // Header integration props
                  isSidebarOpen={isSidebarOpen}
                  setIsSidebarOpen={setIsSidebarOpen}
                  mode={mode}
                  toggleMode={toggleMode}
                  isModeSwitching={isModeSwitching}
                  unreadCount={unreadCount}
                  hasUnreadMessages={hasUnreadMessages}
                  user={user}
                  isGuest={isGuest}
                  setView={setView}
                  setPreviousView={setPreviousView}
                  titleKey={titleKey}
                  notifications={notifications}
                  onMarkAsRead={handleMarkAsRead}
                  onClearAll={handleClearNotifications}
                  onSignOut={handleSignOut}
                />
              )
              : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-muted-foreground">
                      جاري تحميل الطلبات...
                    </p>
                  </div>
                </div>
              )}
          </div>
        );
      case "request-detail":
        return selectedRequest
          ? (
            <div className="h-full flex flex-col overflow-hidden">
              <RequestDetail
                request={selectedRequest}
                mode={mode}
                myOffer={getMyOfferOnRequest(selectedRequest.id)}
                onBack={() => {
                  setSelectedRequest(null);
                  setScrollToOfferSection(false);
                  setNavigatedFromSidebar(false);
                  // إذا جاء من الـ Sidebar، ارجع للصفحة الافتراضية حسب الوضع
                  if (navigatedFromSidebar) {
                    setView(
                      mode === "requests" ? "create-request" : "marketplace",
                    );
                  } else {
                    setView("marketplace");
                  }
                  // Marketplace will restore scroll position via savedScrollPosition prop
                }}
                isGuest={isGuest}
                scrollToOfferSection={scrollToOfferSection}
                navigatedFromSidebar={navigatedFromSidebar}
                onNavigateToMessages={async (
                  conversationId,
                  userId,
                  requestId,
                  offerId,
                ) => {
                  const { getOrCreateConversation } = await import(
                    "./services/messagesService"
                  );
                  const { getCurrentUser } = await import(
                    "./services/authService"
                  );

                  if (userId && requestId) {
                    const currentUser = await getCurrentUser();
                    if (currentUser) {
                      const conv = await getOrCreateConversation(
                        userId,
                        requestId,
                        offerId,
                      );
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
                  setSavedOfferForms((prev) => ({
                    ...prev,
                    [selectedRequest.id]: form,
                  }));
                }}
                savedScrollPosition={requestDetailScrollPos}
                onScrollPositionChange={setRequestDetailScrollPos}
                // Header integration props
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                toggleMode={toggleMode}
                isModeSwitching={isModeSwitching}
                unreadCount={unreadCount}
                hasUnreadMessages={hasUnreadMessages}
                user={user}
                setView={setView}
                setPreviousView={setPreviousView}
                titleKey={titleKey}
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
                onClearAll={handleClearNotifications}
                onSignOut={handleSignOut}
                onMarkRequestAsRead={handleRequestRead}
              />
            </div>
          )
          : null;
      case "settings":
        return (
          <div className="h-full flex flex-col overflow-hidden">
            <Settings
              isDarkMode={isDarkMode}
              toggleTheme={() => setIsDarkMode(!isDarkMode)}
              userPreferences={userPreferences}
              onUpdatePreferences={(prefs) => {
                setUserPreferences(prefs);
              }}
              user={user}
              onBack={() => {
                if (previousView) {
                  setView(previousView);
                  setPreviousView(null);
                } else {
                  handleNavigate(
                    mode === "requests" ? "create-request" : "marketplace",
                  );
                }
              }}
              onSignOut={isGuest ? handleGoToLogin : handleSignOut}
              // Header integration props
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              mode={mode}
              toggleMode={toggleMode}
              isModeSwitching={isModeSwitching}
              unreadCount={unreadCount}
              hasUnreadMessages={hasUnreadMessages}
              setView={setView}
              setPreviousView={setPreviousView}
              titleKey={titleKey}
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onClearAll={handleClearNotifications}
              isGuest={isGuest}
            />
          </div>
        );
      case "profile":
        return (
          <div className="h-full flex flex-col overflow-hidden">
            <Profile
              userReviews={reviews}
              userRating={userRating}
              // Header integration props
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
              onMarkAsRead={handleMarkAsRead}
              onClearAll={handleClearNotifications}
              onSignOut={isGuest ? handleGoToLogin : handleSignOut}
              onBack={() => {
                if (previousView) {
                  setView(previousView);
                  setPreviousView(null);
                } else {
                  handleNavigate(
                    mode === "requests" ? "create-request" : "marketplace",
                  );
                }
              }}
              isGuest={isGuest}
            />
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
                  handleNavigate(
                    mode === "requests" ? "create-request" : "marketplace",
                  );
                }
              }}
              onSelectConversation={(conversationId) => {
                setView("conversation");
              }}
              // Header integration props
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              mode={mode}
              toggleMode={toggleMode}
              isModeSwitching={isModeSwitching}
              unreadCount={unreadCount}
              hasUnreadMessages={hasUnreadMessages}
              setView={setView}
              setPreviousView={setPreviousView}
              titleKey={titleKey}
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onClearAll={handleClearNotifications}
              onSignOut={isGuest ? handleGoToLogin : handleSignOut}
              isGuest={isGuest}
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
              // Header integration props
              isSidebarOpen={isSidebarOpen}
              setIsSidebarOpen={setIsSidebarOpen}
              mode={mode}
              toggleMode={toggleMode}
              isModeSwitching={isModeSwitching}
              unreadCount={unreadCount}
              hasUnreadMessages={hasUnreadMessages}
              setView={setView}
              setPreviousView={setPreviousView}
              titleKey={titleKey}
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onClearAll={handleClearNotifications}
              onSignOut={isGuest ? handleGoToLogin : handleSignOut}
              isGuest={isGuest}
            />
          </div>
        );
      default:
        return (
          <div className="h-full flex flex-col overflow-hidden p-8">
            View not found
          </div>
        );
    }
  };

  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;

  // ==========================================
  // App View Rendering
  // ==========================================

  // Splash Screen
  if (appView === "splash") {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Connection Error Screen
  if (appView === "connection-error") {
    return (
      <ConnectionError
        onRetry={handleConnectionRetry}
        onGuestMode={handleGuestModeFromError}
        isRetrying={isRetrying}
        errorMessage={connectionError || undefined}
      />
    );
  }

  // Auth Screen
  if (appView === "auth") {
    return (
      <AuthPage
        onAuthenticated={async () => {
          // محاولة واحدة سريعة لجلب الـ session والـ profile
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const profile = await getCurrentUser();
              if (profile) {
                setUser(profile);
              }
              setIsGuest(false);
              localStorage.removeItem("abeely_guest_mode");
              setView("create-request");
              setMode("requests");
              setSelectedRequest(null);
              setPreviousView(null);
              setAppView("main");
              return;
            }
          } catch (err) {
            console.error("Error fetching user after auth:", err);
          }
          // إذا لم تنجح المحاولة، الـ onAuthStateChange سيتعامل مع الأمر
          setAppView("main");
        }}
        onGuestMode={() => {
          setIsGuest(true);
          localStorage.setItem("abeely_guest_mode", "true");
          setView("create-request");
          setMode("requests");
          setSelectedRequest(null);
          setPreviousView(null);
          setAppView("main");
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
        onCreateRequest={() => {
          handleNavigate("create-request");
        }}
        onNavigate={handleNavigate}
        onArchiveRequest={handleArchiveRequest}
        onUnarchiveRequest={handleUnarchiveRequest}
        onArchiveOffer={handleArchiveOffer}
        onUnarchiveOffer={handleUnarchiveOffer}
        isGuest={isGuest}
        user={user}
        onSignOut={isGuest ? handleGoToLogin : handleSignOut}
        onUnreadMessagesChange={setHasUnreadMessages}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenLanguagePopup={() => setIsLanguagePopupOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header moved inside individual components (CreateRequestV2, Marketplace, etc.) */}
        {/* Scrollable Content Area - السحب لليسار يغلق السايد بار فقط */}
        <SwipeGestureHandler
          isSidebarOpen={isSidebarOpen}
          onCloseSidebar={() => setIsSidebarOpen(false)}
          enabled={true}
        >
          <div
            id="main-scroll-container"
            ref={scrollContainerRef}
            className="flex-1 min-h-0 bg-background relative overflow-hidden h-full"
          >
            <div className="absolute inset-0 flex flex-col overflow-auto">
              {renderContent()}
            </div>
          </div>
        </SwipeGestureHandler>
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
                  <button
                    onClick={() => setCurrentLanguage("ar")}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                      currentLanguage === "ar"
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl text-primary font-bold text-lg shrink-0">
                        AR
                      </div>
                      <div className="text-right">
                        <span className="font-bold block">العربية</span>
                        <span className="text-xs text-muted-foreground">
                          اللغة الحالية
                        </span>
                      </div>
                    </div>
                    {currentLanguage === "ar" && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </button>

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
                        <span className="text-xs text-muted-foreground">
                          قريباً
                        </span>
                      </div>
                    </div>
                  </button>

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
                        <span className="text-xs text-muted-foreground">
                          قريباً
                        </span>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="p-4 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-sm">
                        ترجمة جميع الطلبات تلقائياً
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        ترجمة الطلبات للغة المحددة تلقائياً
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setAutoTranslateRequests(!autoTranslateRequests)}
                      className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center shrink-0 ${
                        autoTranslateRequests ? "bg-primary" : "bg-gray-300"
                      }`}
                    >
                      <motion.div
                        animate={{ x: autoTranslateRequests ? -28 : 0 }}
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
              </div>

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

      {/* Global AI Orb (Add Button) */}
      <GlobalAIOrb
        currentView={view}
        onNavigate={() => {
          handleNavigate("create-request");
        }}
      />
    </div>
  );
};

export default App;
