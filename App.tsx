import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle, X } from "lucide-react";
import { UnifiedHeader } from "./components/ui/UnifiedHeader";

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

// ==========================================
// OAuth & Magic Link Callback Handler - Process OAuth codes/tokens and Magic Links
// ==========================================
const detectOAuthCallback = (): {
  isCallback: boolean;
  isPopup: boolean;
  isMagicLink: boolean;
} => {
  // Check if we have OAuth callback params or Magic Link params
  const hasOAuthParams = window.location.hash.includes("access_token") ||
    window.location.search.includes("code=");

  // Magic Link uses hash with access_token (no code= param)
  const isMagicLink = window.location.hash.includes("access_token") &&
    !window.location.search.includes("code=");

  if (!hasOAuthParams) {
    return { isCallback: false, isPopup: false, isMagicLink: false };
  }

  // Check multiple indicators that we might be in a popup:
  // 1. ⭐ URL has popup=true query param (MOST RELIABLE - travels with redirect)
  const urlParams = new URLSearchParams(window.location.search);
  const hasPopupParam = urlParams.get("popup") === "true";
  // 2. Window name contains our popup identifier
  const windowName = window.name || "";
  const hasPopupName = windowName.includes("-auth-popup") ||
    windowName.includes("auth-popup");
  // 3. Window has an opener (parent window)
  const hasOpener = window.opener !== null && window.opener !== window;
  // 4. Check localStorage flag that was set when popup was opened
  const popupFlag = localStorage.getItem("abeely_oauth_popup_active");
  const isMarkedAsPopup = popupFlag === "true";
  // 5. Check if window dimensions suggest a popup (small window)
  const isSmallWindow = window.innerWidth <= 600 && window.innerHeight <= 800;

  // Magic Links are never popups (they open in the same window/tab)
  // If we have OAuth params and ANY of the popup indicators, treat as popup
  // Priority: URL param is most reliable, then localStorage, then others
  const isPopup = !isMagicLink &&
    (hasPopupParam || isMarkedAsPopup || hasPopupName || hasOpener ||
      isSmallWindow);

  // Debug log (only in development)
  if (import.meta.env?.DEV) {
    console.warn("🔍 Auth Callback Detection:", {
      hasOAuthParams,
      isMagicLink,
      hasPopupParam,
      windowName,
      hasPopupName,
      hasOpener,
      isMarkedAsPopup,
      isSmallWindow,
      isPopup,
    });
  }

  return { isCallback: true, isPopup, isMagicLink };
};

// Legacy function for backwards compatibility
const isOAuthPopup = (): boolean => {
  const { isCallback, isPopup } = detectOAuthCallback();
  return isCallback && isPopup;
};

// Process OAuth/Magic Link callback in main window - run immediately
const processMainWindowOAuthCallback = async (): Promise<boolean> => {
  const hasCode = window.location.search.includes("code=");
  const hasToken = window.location.hash.includes("access_token");

  if (!hasCode && !hasToken) return false;

  // Check if this is a popup - use same logic as detectOAuthCallback
  const urlParams = new URLSearchParams(window.location.search);
  const hasPopupParam = urlParams.get("popup") === "true";
  const windowName = window.name || "";
  const isSmallWindow = window.innerWidth <= 600 && window.innerHeight <= 800;
  const isMagicLink = window.location.hash.includes("access_token") && !hasCode;
  const isPopup = !isMagicLink && (hasPopupParam ||
    windowName.includes("-auth-popup") ||
    windowName.includes("auth-popup") ||
    window.opener !== null ||
    localStorage.getItem("abeely_oauth_popup_active") === "true" ||
    isSmallWindow);

  // If popup, let it handle itself
  if (isPopup) return false;

  // This is the main window with OAuth/Magic Link callback - let Supabase process it
  try {
    // Import supabase here to avoid circular dependency issues
    const { supabase } = await import("./services/supabaseClient");

    // Supabase will automatically process the code/token from URL
    // For Magic Links, the token is in the hash, Supabase handles it automatically
    const { data } = await supabase.auth.getSession();

    // Clean up URL after processing
    if (data.session) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      return true;
    }
  } catch (err) {
    console.error("Auth callback processing error:", err);
  }

  return false;
};

// OAuth Popup Success Screen Component
const OAuthPopupSuccess: React.FC = () => {
  const [showManualClose, setShowManualClose] = useState(false);

  useEffect(() => {
    console.log("🎉 OAuth Popup Success - Processing...");

    const closePopup = async () => {
      // Clean URL from OAuth params
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      try {
        // Process OAuth callback to store session
        const { data } = await supabase.auth.getSession();

        if (data.session) {
          console.log("✅ Session stored in popup");

          // Wait a moment to ensure session is fully saved
          await new Promise((resolve) => setTimeout(resolve, 300));

          // Clear the popup flag - this signals main window
          localStorage.removeItem("abeely_oauth_popup_active");

          // Signal main window
          localStorage.setItem("abeely_auth_success", Date.now().toString());

          console.log("📢 Popup flag cleared, main window will check session");

          // Try to notify parent window via postMessage (if same origin) and reload it as fallback
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({
                type: "oauth_success",
                timestamp: Date.now(),
              }, window.location.origin);
              // بعض المتصفحات لا تغلق النافذة تلقائياً، لذا نعيد تحميل النافذة الأصلية كنسخ احتياطي
              window.opener.location.reload();
            }
          } catch (e) {
            // Ignore cross-origin errors
          }

          // Close window immediately after short delay to show success message
          setTimeout(() => {
            console.log("🚪 Closing popup automatically...");
            window.close();

            // Retry closing multiple times (some browsers need multiple attempts)
            setTimeout(() => {
              window.close();
              // After 1.5 more seconds, if still open, show manual close button
              setTimeout(() => {
                setShowManualClose(true);
              }, 1500);
            }, 200);
          }, 1000); // Show success message for ~1s then close
        } else {
          // No session, clear flag anyway
          localStorage.removeItem("abeely_oauth_popup_active");
          setTimeout(() => {
            window.close();
            setTimeout(() => setShowManualClose(true), 1500);
          }, 1000);
        }
      } catch (err) {
        console.error("Error getting session:", err);
        localStorage.removeItem("abeely_oauth_popup_active");
        setTimeout(() => {
          window.close();
          setTimeout(() => setShowManualClose(true), 1500);
        }, 1000);
      }
    };

    closePopup();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#153659] via-[#0d9488] to-[#153659] flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center p-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="w-24 h-24 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center"
        >
          <CheckCircle className="w-14 h-14 text-green-400" />
        </motion.div>
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-white mb-3"
        >
          تم تسجيل الدخول بنجاح!
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-white/70 mb-4"
        >
          {showManualClose
            ? "يمكنك إغلاق هذه النافذة الآن"
            : "جاري إغلاق هذه النافذة..."}
        </motion.p>

        {showManualClose && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            onClick={() => window.close()}
            className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-xl transition-colors"
          >
            إغلاق النافذة
          </motion.button>
        )}
      </motion.div>
    </div>
  );
};

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
import { navigateTo, parseRoute } from "./services/routingService";
import { App as CapacitorApp } from "@capacitor/app";

// Auth Views
type AppView = "splash" | "auth" | "main" | "connection-error" | "oauth-popup";

const App: React.FC = () => {
  // ==========================================
  // OAuth & Magic Link Callback Check - Run FIRST
  // ==========================================
  const [oauthState] = useState(() => detectOAuthCallback());
  const isOAuthPopupMode = oauthState.isCallback && oauthState.isPopup;
  const isMagicLinkCallback = oauthState.isCallback && oauthState.isMagicLink;

  // ==========================================
  // Auth State
  // ==========================================
  const [appView, setAppView] = useState<AppView>(() => {
    if (oauthState.isCallback && oauthState.isPopup) return "oauth-popup";
    return "splash";
  });
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

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
  // Deep Linking Handler
  // ==========================================
  useEffect(() => {
    // معالجة الروابط عند فتح التطبيق
    const handleInitialUrl = async () => {
      try {
        // في التطبيق المحمول
        if (typeof window !== "undefined" && (window as any).Capacitor) {
          const { url } = await CapacitorApp.getLaunchUrl();
          if (url) {
            handleDeepLink(url);
          }

          // الاستماع للروابط عند فتح التطبيق
          CapacitorApp.addListener("appUrlOpen", (event) => {
            handleDeepLink(event.url);
          });
        } else {
          // في المتصفح - معالجة الرابط الحالي
          const route = parseRoute();
          if (route.type === "request" && route.params.requestId) {
            // البحث عن الطلب وفتحه
            const request = allRequests.find((r) =>
              r.id === route.params.requestId
            );
            if (request) {
              setSelectedRequest(request);
              setView("request-detail");
              setMode("offers");
            }
          }
        }
      } catch (err) {
        console.error("Error handling deep link:", err);
      }
    };

    const handleDeepLink = (url: string) => {
      try {
        const urlObj = new URL(url);
        const path = urlObj.pathname;

        // معالجة /request/:id
        if (path.startsWith("/request/")) {
          const requestId = path.split("/request/")[1]?.split("/")[0];
          if (requestId) {
            const request = allRequests.find((r) => r.id === requestId);
            if (request) {
              setSelectedRequest(request);
              setView("request-detail");
              setMode("offers");
            } else {
              // إذا لم يكن الطلب محملاً، انتظر قليلاً
              setTimeout(() => {
                const request = allRequests.find((r) => r.id === requestId);
                if (request) {
                  setSelectedRequest(request);
                  setView("request-detail");
                  setMode("offers");
                }
              }, 1000);
            }
          }
        }
      } catch (err) {
        console.error("Error parsing deep link:", err);
      }
    };

    // معالجة الروابط عند تغيير URL في المتصفح
    const handlePopState = () => {
      const route = parseRoute();
      if (route.type === "request" && route.params.requestId) {
        const request = allRequests.find((r) =>
          r.id === route.params.requestId
        );
        if (request) {
          setSelectedRequest(request);
          setView("request-detail");
          setMode("offers");
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    handleInitialUrl();

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [allRequests]);

  // ==========================================
  // Auth Initialization (Fast - 3s timeout)
  // ==========================================
  useEffect(() => {
    // Skip auth init if we're in OAuth popup mode (it will close itself)
    if (isOAuthPopupMode) {
      // Process OAuth callback and session will be stored
      supabase.auth.getSession().catch(console.error);
      return;
    }

    const initAuth = async () => {
      // Handle OAuth callback from Capacitor Browser
      const urlParams = new URLSearchParams(window.location.search);
      const isOAuthCallback = urlParams.get('oauth_callback') === 'true';
      
      if (isOAuthCallback) {
        // This is OAuth callback from Capacitor Browser
        // Clean URL immediately
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        // Wait for session to be established
        const maxRetries = 5;
        for (let i = 0; i < maxRetries; i++) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile = await getCurrentUser();
            if (profile) {
              setUser(profile);
              setIsGuest(false);
              localStorage.removeItem('abeely_guest_mode');
              setAppView('main');
              setAuthLoading(false);
              return;
            }
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // If we have OAuth/Magic Link callback params in main window
      // Let Supabase's detectSessionInUrl handle the code/token exchange automatically
      // We just need to wait for the session and clean the URL
      if (oauthState.isCallback && !oauthState.isPopup) {
        // Clear the popup flag if it exists
        localStorage.removeItem("abeely_oauth_popup_active");

        if (isMagicLinkCallback) {
          console.log(
            "📧 Magic Link callback detected, waiting for Supabase to process...",
          );
        } else {
          console.log(
            "📝 OAuth callback detected, waiting for Supabase to process...",
          );
        }

        // Clean URL AFTER giving Supabase a moment to extract the code/token
        // Supabase should have already extracted it during initialization
        setTimeout(() => {
          if (
            window.location.search.includes("code=") ||
            window.location.hash.includes("access_token")
          ) {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            console.log("🧹 Cleaned auth params from URL");
          }
        }, 100);

        // Try to get session with retry logic (Supabase may still be exchanging the code)
        const maxRetries = 3;
        let session = null;

        for (let i = 0; i < maxRetries && !session; i++) {
          try {
            console.log(
              `⏳ Checking session... attempt ${i + 1}/${maxRetries}`,
            );

            // Add 3-second timeout to each attempt
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise<{ data: { session: null } }>((
              resolve,
            ) => setTimeout(() => resolve({ data: { session: null } }), 3000));

            const { data } = await Promise.race([
              sessionPromise,
              timeoutPromise,
            ]);
            session = data?.session;

            if (session) {
              console.log(`✅ OAuth session found on attempt ${i + 1}`);
              break;
            }

            // Short wait between retries
            if (i < maxRetries - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          } catch (err) {
            console.error(`Session check attempt ${i + 1} failed:`, err);
          }
        }

        if (session?.user) {
          if (isMagicLinkCallback) {
            console.log(
              "✅ Magic Link session established via Supabase auto-detection!",
            );
          } else {
            console.log(
              "✅ OAuth session established via Supabase auto-detection!",
            );
          }

          // Get user profile with timeout (3 seconds)
          const profilePromise = getCurrentUser();
          const profileTimeout = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 3000)
          );

          const profile = await Promise.race([profilePromise, profileTimeout]);

          if (profile) {
            setUser(profile);
            setIsGuest(false);
            localStorage.removeItem("abeely_guest_mode");
            setAppView("main");
            setAuthLoading(false);
            return; // Exit early, we're done
          } else {
            // Profile not ready, but user is authenticated - proceed anyway
            console.log(
              "⚠️ Profile not ready, user auth OK, proceeding to main...",
            );
            setAppView("main");
            setAuthLoading(false);
            return;
          }
        } else {
          if (isMagicLinkCallback) {
            console.log(
              "⚠️ No session after Magic Link callback retries, showing auth page",
            );
          } else {
            console.log(
              "⚠️ No session after OAuth callback retries, showing auth page",
            );
          }
          // Fallback to auth page immediately
          setAuthLoading(false);
          setAppView("auth");
          return;
        }
      }
      try {
        // Fast timeout - 3 seconds max
        const authPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Auth timeout")), 3000)
        );

        const result = await Promise.race([authPromise, timeoutPromise]) as any;
        const session = result?.data?.session;

        if (session?.user) {
          // Try to get profile with 2s timeout
          const profilePromise = getCurrentUser();
          const profileTimeout = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 2000)
          );

          const profile = await Promise.race([profilePromise, profileTimeout]);

          if (profile) {
            setUser(profile);
            setIsGuest(false);
          } else {
            // Profile not ready - will be fetched by onAuthStateChange
            const wasGuest =
              localStorage.getItem("abeely_guest_mode") === "true";
            setIsGuest(wasGuest);
          }
        } else {
          const wasGuest = localStorage.getItem("abeely_guest_mode") === "true";
          setIsGuest(wasGuest);
        }
      } catch (err: any) {
        // On any error, proceed to auth/guest - don't block the app
        const wasGuest = localStorage.getItem("abeely_guest_mode") === "true";
        setIsGuest(wasGuest);
      } finally {
        setAuthLoading(false);
        setIsRetrying(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange(async (authUser) => {
      try {
        if (authUser) {
          // Add a small delay to ensure OAuth/Magic Link redirect is complete
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Clean up URL if we have OAuth/Magic Link params (after successful auth)
          if (
            window.location.search.includes("code=") ||
            window.location.hash.includes("access_token")
          ) {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }

          const profile = await getCurrentUser();
          if (profile) {
            setUser(profile);
            setIsGuest(false);
            localStorage.removeItem("abeely_guest_mode");
            localStorage.removeItem("abeely_oauth_popup_active");
            setAppView("main");
          } else {
            console.warn("Failed to get user profile after auth");
            // Retry once after a delay
            setTimeout(async () => {
              const retryProfile = await getCurrentUser();
              if (retryProfile) {
                setUser(retryProfile);
                setIsGuest(false);
                localStorage.removeItem("abeely_guest_mode");
                localStorage.removeItem("abeely_oauth_popup_active");
                setAppView("main");
              }
            }, 1000);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth state change error:", err);
        // Don't crash the app, just log the error
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ==========================================
  // Check for session when popup closes
  // ==========================================
  useEffect(() => {
    if (isOAuthPopupMode) return;

    let lastPopupState =
      localStorage.getItem("abeely_oauth_popup_active") === "true";

    const checkSession = async () => {
      try {
        // Wait a bit for session to be saved
        await new Promise((resolve) => setTimeout(resolve, 500));

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && appView === "auth") {
          console.log("✅ Session found! Loading profile...");

          // Try to get profile with retry
          let profile = null;
          for (let i = 0; i < 3; i++) {
            profile = await getCurrentUser();
            if (profile) break;
            await new Promise((resolve) => setTimeout(resolve, 300));
          }

          if (profile) {
            setUser(profile);
            setIsGuest(false);
            localStorage.removeItem("abeely_guest_mode");
            localStorage.removeItem("abeely_oauth_popup_active");
            setAuthLoading(false);
            // إعادة تعيين الحالة للقيم الافتراضية عند تسجيل الدخول
            setView("create-request");
            setMode("requests");
            setSelectedRequest(null);
            setPreviousView(null);
            setAppView("main");
            console.log("🚀 Navigated to main app!");
          } else {
            // Even without profile, if session exists, proceed
            setAuthLoading(false);
            setView("create-request");
            setMode("requests");
            setSelectedRequest(null);
            setPreviousView(null);
            setAppView("main");
          }
        }
      } catch (err) {
        console.error("Session check error:", err);
      }
    };

    // Check every 500ms if popup was closed
    const checkPopupClosed = setInterval(() => {
      const currentPopupState =
        localStorage.getItem("abeely_oauth_popup_active") === "true";

      // If popup was active and now it's closed, check for session
      if (lastPopupState && !currentPopupState) {
        console.log("🔍 Popup closed, checking session...");
        checkSession();
      }

      lastPopupState = currentPopupState;
    }, 500);

    // Also check when window gets focus (user returns from popup)
    const handleFocus = () => {
      if (
        appView === "auth" && !localStorage.getItem("abeely_oauth_popup_active")
      ) {
        console.log("👁️ Window focused, checking session...");
        checkSession();
      }
    };

    // Also listen for auth success signal from popup
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "abeely_auth_success" && appView === "auth") {
        console.log(
          "📢 Auth success signal received via storage, checking session...",
        );
        checkSession();
      }
    };

    // Listen for postMessage from popup (more reliable than storage events)
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "oauth_success" && appView === "auth") {
        console.log(
          "📢 Auth success signal received via postMessage, checking session...",
        );
        checkSession();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("message", handleMessage);

    // Check immediately if popup flag was just cleared
    if (!lastPopupState && localStorage.getItem("abeely_auth_success")) {
      checkSession();
    }

    return () => {
      clearInterval(checkPopupClosed);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("message", handleMessage);
    };
  }, [isOAuthPopupMode, appView]);

  // ==========================================
  // Splash Screen Complete Handler
  // ==========================================
  const handleSplashComplete = () => {
    if (authLoading) {
      // Still loading auth, wait
      return;
    }

    if (user) {
      setAppView("main");
    } else if (isGuest) {
      setAppView("main");
    } else {
      setAppView("auth");
    }
  };

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
        return (
          <div className="h-full p-0 flex flex-col items-center justify-start pb-[env(safe-area-inset-bottom,0px)] overflow-x-hidden">
            <div className="w-full max-w-4xl h-full flex flex-col overflow-x-hidden">
              <ChatArea
                onRequestPublished={() => {
                  reloadData();
                  // مسح المحادثة بعد نشر الطلب بنجاح
                  setSavedChatMessages([]);
                  localStorage.removeItem("abeely_chat_messages");
                }}
                isGuest={isGuest}
                userId={user?.id}
                savedMessages={savedChatMessages}
                onMessagesChange={setSavedChatMessages}
                savedScrollPosition={chatAreaScrollPos}
                onScrollPositionChange={setChatAreaScrollPos}
                aiStatus={connectionStatus?.ai}
                // Unified Header Props
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
              />
            </div>
          </div>
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

  // OAuth Popup Success Screen - Show success and close
  if (appView === "oauth-popup" || isOAuthPopupMode) {
    return <OAuthPopupSuccess />;
  }

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
          // Fetch session and user profile with retry logic
          let retries = 0;
          const maxRetries = 5;

          while (retries < maxRetries) {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                // Wait a bit for profile to be ready
                await new Promise((resolve) => setTimeout(resolve, 300));

                const profile = await getCurrentUser();
                if (profile) {
                  setUser(profile);
                  setIsGuest(false);
                  localStorage.removeItem("abeely_guest_mode");
                  localStorage.removeItem("abeely_oauth_popup_active");
                  // إعادة تعيين الحالة للقيم الافتراضية عند تسجيل الدخول
                  setView("create-request");
                  setMode("requests");
                  setSelectedRequest(null);
                  setPreviousView(null);
                  setAppView("main");
                  return; // Success, exit
                }
              }

              // If no session yet, wait and retry
              if (retries < maxRetries - 1) {
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
            } catch (err) {
              console.error(
                `Error fetching user after auth (attempt ${retries + 1}):`,
                err,
              );
            }

            retries++;
          }

          // If we get here, session wasn't found after retries
          // But still try to proceed - onAuthStateChange will handle it
          console.warn(
            "Session not found after retries, but proceeding anyway",
          );
          setAppView("main");
        }}
        onGuestMode={() => {
          setIsGuest(true);
          localStorage.setItem("abeely_guest_mode", "true");
          // إعادة تعيين الحالة للقيم الافتراضية عند الدخول كضيف
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
        {/* Header - Only for views that don't have their own internal header */}
        {view === "create-request" && (
          <div className="sticky top-0 z-[60] px-4 bg-white/80 dark:bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-gray-200/30 dark:border-white/10 shadow-sm">
            <div className="flex flex-col">
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
                onMarkAsRead={handleMarkAsRead}
                onClearAll={handleClearNotifications}
                onSignOut={isGuest ? handleGoToLogin : handleSignOut}
                isGuest={isGuest}
                currentView={view}
                transparent={true}
              />
            </div>
          </div>
        )}
        {/* Scrollable Content Area */}
        <div
          id="main-scroll-container"
          ref={scrollContainerRef}
          className="flex-1 min-h-0 bg-background relative overflow-hidden"
        >
          <div className="absolute inset-0 flex flex-col overflow-auto">
            {renderContent()}
          </div>
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
    </div>
  );
};

export default App;
