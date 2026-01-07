import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { AlertCircle, Check, X } from "lucide-react";
import { UnifiedHeader } from "./components/ui/UnifiedHeader";

// Components
import { Marketplace } from "./components/Marketplace";
import { RequestDetail } from "./components/RequestDetail";
import { BottomNavigation, BottomNavTab } from "./components/BottomNavigation";
import { MyRequests } from "./components/MyRequests";
import { MyOffers } from "./components/MyOffers";
import { Settings } from "./components/Settings";
import { Profile } from "./components/Profile";
import { NotificationsPopover } from "./components/NotificationsPopover";
import { SplashScreen } from "./components/SplashScreen";
import { AuthPage } from "./components/AuthPage";
import { Messages } from "./components/Messages";
import { CreateRequestV2 } from "./components/CreateRequestV2";
import {
  GlobalFloatingOrb,
  VoiceProcessingStatus,
} from "./components/GlobalFloatingOrb";
import { InterestToast, useInterestToast } from "./components/ui/InterestToast";
import { UnarchiveToast } from "./components/ui/UnarchiveToast";
import { notificationSound } from "./services/notificationSoundService";
import { OnboardingScreen } from "./components/OnboardingScreen";

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
import { AVAILABLE_CATEGORIES, MOCK_REVIEWS } from "./data";
import {
  clearAllNotifications,
  getNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from "./services/notificationsService";

import {
  getOrCreateConversation,
  getTotalUnreadMessagesCount,
  getUnreadMessagesForMyOffers,
  getUnreadMessagesForMyRequests,
  subscribeToUnreadCount,
} from "./services/messagesService";

// Services
import {
  archiveOffer,
  archiveRequest,
  bumpRequest,
  checkSupabaseConnection,
  createRequestFromChat,
  fetchArchivedRequests,
  fetchMyOffers,
  fetchMyRequests,
  fetchOffersForUserRequests,
  fetchRequestById,
  fetchRequestsPaginated,
  hideRequest,
  migrateUserDraftRequests,
  subscribeToAllNewRequests,
  subscribeToNewRequests,
  unarchiveRequest,
  unhideRequest,
  updateRequest,
} from "./services/requestsService";
import {
  getUnreadInterestsCount,
  getViewedRequestIds,
  subscribeToViewedRequests,
} from "./services/requestViewsService";
import {
  getPreferencesDirect,
  updatePreferencesDirect,
} from "./services/preferencesService";
import { checkAIConnection } from "./services/aiService";
import { supabase } from "./services/supabaseClient";
import {
  getCurrentUser,
  onAuthStateChange,
  signOut as authSignOut,
  updateProfile,
  UserProfile,
} from "./services/authService";
import { FullScreenLoading } from "./components/ui/LoadingSkeleton";
import { ConnectionError } from "./components/ui/ConnectionError";
import { SwipeBackWrapper } from "./components/ui/SwipeBackWrapper";
import {
  ParsedRoute,
  parseRoute,
  routeTypeToViewState,
  updateUrl,
} from "./services/routingService";
import { App as CapacitorApp } from "@capacitor/app";

// Auth Views
type AppView = "splash" | "auth" | "onboarding" | "main" | "connection-error";

const App: React.FC = () => {
  // ==========================================
  // Auth State
  // ==========================================
  const [appView, setAppView] = useState<AppView>("splash");
  const [user, setUser] = useState<UserProfile | null>(null);
  // مهم: داخل useEffect([]) (مثل onAuthStateChange) قد تكون قيمة user قديمة (stale closure)
  // لذا نحتفظ بآخر user في ref لاستخدامه وقت الأحداث.
  const userRef = useRef<UserProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Keep ref updated with latest user
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // ==========================================
  // Global State
  // ==========================================
  const [mode, setMode] = useState<AppMode>("requests");
  const [view, setView] = useState<ViewState>("marketplace");
  const [previousView, setPreviousView] = useState<ViewState | null>(null);
  const [previousBottomTab, setPreviousBottomTab] = useState<
    BottomNavTab | null
  >(null);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomNavTab>(
    "marketplace",
  );
  const [initialConversationId, setInitialConversationId] = useState<
    string | null
  >(null);
  const [titleKey, setTitleKey] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLanguagePopupOpen, setIsLanguagePopupOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<"ar" | "en" | "ur">(
    () => {
      // قراءة اللغة من localStorage عند التحميل
      const saved = localStorage.getItem("locale");
      if (saved === "ar" || saved === "en" || saved === "ur") {
        return saved;
      }
      return "ar";
    },
  );
  const [autoTranslateRequests, setAutoTranslateRequests] = useState(false);

  // حفظ اللغة في localStorage عند تغييرها
  useEffect(() => {
    localStorage.setItem("locale", currentLanguage);
    // إرسال حدث storage لإعلام المكونات الأخرى بتغير اللغة
    window.dispatchEvent(
      new StorageEvent("storage", { key: "locale", newValue: currentLanguage }),
    );
  }, [currentLanguage]);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    interestedCategories: [],
    interestedCities: [],
    radarWords: [],
    notifyOnInterest: true,
    roleMode: "requester",
    showNameToApprovedProvider: true,
  });
  const [isModeSwitching, setIsModeSwitching] = useState(false);
  const [profileRole, setProfileRole] = useState<"requester" | "provider">(
    "provider",
  ); // Temporary state for button animation

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
  const [isLoadingViewedRequests, setIsLoadingViewedRequests] = useState(true); // تتبع تحميل viewedRequestIds
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [isLoadingMyOffers, setIsLoadingMyOffers] = useState(true); // تتبع تحميل myOffers
  const [receivedOffersMap, setReceivedOffersMap] = useState<
    Map<string, Offer[]>
  >(new Map()); // العروض المستلمة على طلبات المستخدم
  const [archivedRequests, setArchivedRequests] = useState<Request[]>([]);
  const [myRequestsFilter, setMyRequestsFilter] = useState<
    "active" | "approved" | "all" | "completed"
  >("active");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [marketplaceLoadedOnce, setMarketplaceLoadedOnce] = useState(false); // تم التحميل مرة واحدة على الأقل (حتى لو 0 نتائج)
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
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadMessagesForMyRequests, setUnreadMessagesForMyRequests] =
    useState(0);
  const [unreadMessagesForMyOffers, setUnreadMessagesForMyOffers] = useState(0);
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
  const [requestToEdit, setRequestToEdit] = useState<Request | null>(null); // الطلب المراد تعديله
  const [scrollToOfferSection, setScrollToOfferSection] = useState(false);
  const [navigatedFromSidebar, setNavigatedFromSidebar] = useState(false); // لتتبع مصدر التنقل
  const [highlightOfferId, setHighlightOfferId] = useState<string | null>(null); // لتمييز العرض عند النقر على إشعار

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
  // AI Orb State (Global - used by GlobalFloatingOrb)
  // ==========================================
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<
    { id: string; text: string; timestamp: Date }[]
  >([
    {
      id: "welcome",
      text: "مرحباً، صف طلبك وسأساعدك في إنشائه.",
      timestamp: new Date(),
    },
  ]);
  // Ref to CreateRequestV2's handleSend function
  const aiSendHandlerRef = useRef<((audioBlob?: Blob) => Promise<void>) | null>(
    null,
  );
  // Ref to CreateRequestV2's handleVoiceSend function
  const voiceSendHandlerRef = useRef<
    ((audioBlob: Blob) => Promise<void>) | null
  >(null);
  // Voice processing status (updated by CreateRequestV2)
  const [voiceProcessingStatus, setVoiceProcessingStatus] = useState<
    VoiceProcessingStatus
  >({ stage: "idle" });
  // Track if scroll-to-top button is visible (to hide floating orb)
  const [isScrollButtonVisible, setIsScrollButtonVisible] = useState(false);
  // Track if marketplace header is compressed (for floating orb animation)
  const [isMarketplaceHeaderCompressed, setIsMarketplaceHeaderCompressed] =
    useState(false);

  // ==========================================
  // Interest Toast for New Matching Requests
  // ==========================================
  const { currentToast, isVisible: isToastVisible, showToast, hideToast } =
    useInterestToast();
  const showToastRef = useRef(showToast);

  // Keep ref updated
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);
  const [newRequestIds, setNewRequestIds] = useState<Set<string>>(new Set()); // للتتبع الطلبات الجديدة للانيميشن
  // Track current view mode in marketplace (to detect if on interests page)
  const [currentMarketplaceViewMode, setCurrentMarketplaceViewMode] = useState<
    "all" | "interests"
  >("all");

  // ==========================================
  // Unarchive Toast State
  // ==========================================
  const [unarchiveToast, setUnarchiveToast] = useState<{
    isVisible: boolean;
    requestId: string | null;
    willBump: boolean;
  }>({
    isVisible: false,
    requestId: null,
    willBump: false,
  });

  // Update Unarchive Notification State (for when editing unarchives a request)
  // ==========================================
  const [updateUnarchiveNotification, setUpdateUnarchiveNotification] =
    useState<{
      isVisible: boolean;
      requestId: string | null;
    }>({
      isVisible: false,
      requestId: null,
    });

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
      "abeely_requestdetail_scroll",
      requestDetailScrollPos.toString(),
    );
  }, [requestDetailScrollPos]);

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

  // Refs للحفاظ على أحدث القيم في popstate handler
  const appViewRef = useRef<AppView>(appView);
  const viewRef = useRef<ViewState>(view);
  const allRequestsRef = useRef<Request[]>(allRequests);

  // تحديث refs عند تغيير القيم
  useEffect(() => {
    appViewRef.current = appView;
  }, [appView]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    allRequestsRef.current = allRequests;
  }, [allRequests]);

  // معالجة route بناءً على نوعه
  const handleRouteNavigation = useCallback((route: ParsedRoute) => {
    // لا نتنقل إذا لم نكن في الوضع الرئيسي
    if (appView !== "main") {
      return;
    }

    // تجاهل الروابط الفارغة
    if (!route.type) {
      // إذا لم يكن هناك route صالح، ارجع للصفحة الرئيسية (marketplace)
      setView("marketplace");
      setMode("offers");
      setActiveBottomTab("marketplace");
      return;
    }

    switch (route.type) {
      case "request":
        if (route.params.requestId) {
          const request = allRequests.find((r) =>
            r.id === route.params.requestId
          );
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

      case "marketplace":
        setView("marketplace");
        setMode("offers");
        setActiveBottomTab("marketplace");
        break;

      case "create":
        setView("create-request");
        setMode("requests");
        setActiveBottomTab("create");
        break;

      case "profile":
        setPreviousView(view);
        setView("profile");
        break;

      case "messages":
        setPreviousView(view);
        setView("messages");
        setActiveBottomTab("messages");
        break;

      case "conversation":
        setPreviousView(view);
        setView("conversation");
        break;

      case "settings":
        setPreviousView(view);
        setView("settings");
        break;

      case "home":
      default:
        setView("marketplace");
        setMode("offers");
        setActiveBottomTab("marketplace");
        break;
    }
  }, [appView, allRequests, view]);

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
        // تحليل URL وتحويله لـ route بدون تعديل window.location
        const route = parseRoute(url);

        handleRouteNavigation(route);
      } catch (err) {
        console.error("Error parsing deep link:", err);
      }
    };

    // معالجة الروابط عند تغيير URL في المتصفح (زر Back/Forward)
    const handlePopState = () => {
      const currentAppView = appViewRef.current;
      const currentView = viewRef.current;

      // لا نعالج popstate إذا لم نكن في الوضع الرئيسي
      if (currentAppView !== "main") {
        return;
      }

      const route = parseRoute();

      // استخدام handleRouteNavigation مع أحدث القيم
      const currentAllRequests = allRequestsRef.current;
      handleRouteNavigationWithRefs(
        route,
        currentAppView,
        currentAllRequests,
        currentView,
      );
    };

    // دالة مساعدة تستخدم refs مباشرة
    const handleRouteNavigationWithRefs = (
      route: ParsedRoute,
      currentAppView: AppView,
      currentAllRequests: Request[],
      currentView: ViewState,
    ) => {
      // لا نتنقل إذا لم نكن في الوضع الرئيسي
      if (currentAppView !== "main") {
        return;
      }

      // تجاهل الروابط الفارغة
      if (!route.type) {
        setView("marketplace");
        setMode("offers");
        setActiveBottomTab("marketplace");
        return;
      }

      switch (route.type) {
        case "request":
          if (route.params.requestId) {
            const request = currentAllRequests.find((r) =>
              r.id === route.params.requestId
            );
            if (request) {
              setSelectedRequest(request);
              setView("request-detail");
              setMode("offers");
              pendingDeepLinkRef.current = null;
            } else {
              pendingDeepLinkRef.current = {
                requestId: route.params.requestId,
              };
            }
          }
          break;

        case "marketplace":
          setView("marketplace");
          setMode("offers");
          setActiveBottomTab("marketplace");
          break;

        case "create":
          setView("create-request");
          setMode("requests");
          setActiveBottomTab("create");
          break;

        case "profile":
          setPreviousView(currentView);
          setView("profile");
          break;

        case "messages":
          setPreviousView(currentView);
          setView("messages");
          setActiveBottomTab("messages");
          break;

        case "conversation":
          setPreviousView(currentView);
          setView("conversation");
          break;

        case "settings":
          setPreviousView(currentView);
          setView("settings");
          break;

        case "home":
        default:
          setView("marketplace");
          setMode("offers");
          setActiveBottomTab("marketplace");
          break;
      }
    };

    window.addEventListener("popstate", handlePopState);

    handleInitialUrl();

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []); // لا dependencies - نستخدم refs للحصول على أحدث القيم

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
    if (appView !== "main") return;

    // تحديث URL حسب الـ view الحالي
    switch (view) {
      case "request-detail":
        if (selectedRequest?.id) {
          updateUrl("request-detail", { requestId: selectedRequest.id });
        }
        break;
      case "marketplace":
        updateUrl("marketplace");
        break;
      case "create-request":
        updateUrl("create-request");
        break;
      case "profile":
        updateUrl("profile", user?.id ? { userId: user.id } : undefined);
        break;
      case "messages":
        updateUrl("messages");
        break;
      case "conversation":
        updateUrl("conversation");
        break;
      case "settings":
        updateUrl("settings");
        break;
    }
  }, [view, selectedRequest?.id, appView]);

  // ==========================================
  // Auth Initialization & State Listener
  // ==========================================

  // تحقق إذا كنا في popup (للـ OAuth)
  const isInPopup = !!window.opener;

  useEffect(() => {
    let isMounted = true;

    // Supabase يتعامل مع OAuth callback تلقائياً بسبب detectSessionInUrl: true
    // نحن فقط نستمع لتغييرات الـ session

    const initializeAuth = async () => {
      try {
        // تحقق أولاً إذا كان هذا OAuth callback مع PKCE code
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const hasAccessToken = window.location.hash.includes("access_token");
        const hasError = window.location.hash.includes("error") ||
          urlParams.get("error");

        // منع معالجة الـ code أكثر من مرة
        const codeProcessedKey = "oauth_code_processed";
        const alreadyProcessed =
          sessionStorage.getItem(codeProcessedKey) === code;

        if ((code || hasAccessToken) && !alreadyProcessed) {
          console.log(
            "🔐 OAuth callback detected:",
            code ? "PKCE code" : "access_token",
            isInPopup ? "(in popup)" : "",
          );
          setIsProcessingOAuth(true);

          // حفظ الـ code لمنع إعادة المعالجة
          if (code) {
            sessionStorage.setItem(codeProcessedKey, code);
          }

          // تنظيف URL فوراً لمنع إعادة المعالجة عند refresh
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname || "/",
          );

          // إذا كان هناك code (PKCE flow)، استبدله بـ session
          if (code) {
            console.log("🔄 Exchanging PKCE code for session...");
            const { data: exchangeData, error: exchangeError } = await supabase
              .auth.exchangeCodeForSession(code);

            if (exchangeError) {
              console.error("❌ PKCE exchange error:", exchangeError);
              sessionStorage.removeItem(codeProcessedKey);
              setIsProcessingOAuth(false);

              // إذا كنا في popup، أغلقه
              if (isInPopup) {
                console.log("❌ Closing popup due to error...");
                setTimeout(() => window.close(), 1000);
              }
              // سيتم التعامل مع الـ auth عبر onAuthStateChange
            } else if (exchangeData?.session?.user && isMounted) {
              console.log(
                "✅ PKCE session obtained:",
                exchangeData.session.user.email,
              );

              // إذا كنا في popup، أغلقه - النافذة الأصلية ستستلم الـ auth state change
              if (isInPopup) {
                console.log("✅ Closing popup after successful auth...");
                sessionStorage.removeItem(codeProcessedKey);
                setTimeout(() => window.close(), 500);
                return;
              }

              // انتقل لـ main فوراً
              setIsGuest(false);
              localStorage.removeItem("abeely_guest_mode");
              setIsProcessingOAuth(false);
              setAppView("main");
              setAuthLoading(false);
              sessionStorage.removeItem(codeProcessedKey);

              // تحميل الـ profile في الخلفية
              getCurrentUser().then((profile) => {
                if (profile && isMounted) {
                  console.log("👤 Profile loaded:", profile.display_name);
                  setUser(profile);
                }
              }).catch((err) => console.error("Profile error:", err));

              return;
            }
          } else if (hasAccessToken) {
            // Implicit flow (hash contains access_token)
            await new Promise((resolve) => setTimeout(resolve, 500));
            const { data } = await supabase.auth.getSession();

            if (data?.session?.user && isMounted) {
              let profile = await getCurrentUser();
              if (!profile) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                profile = await getCurrentUser();
              }
              if (profile && isMounted) setUser(profile);

              setIsGuest(false);
              localStorage.removeItem("abeely_guest_mode");
              setIsProcessingOAuth(false);
              setAppView("main");
              setAuthLoading(false);
              return;
            }
          }

          setIsProcessingOAuth(false);
        } else if (alreadyProcessed) {
          // الـ code تمت معالجته، انتظر الـ onAuthStateChange
          // لا نطبع log لتجنب التكرار
          setIsProcessingOAuth(true);
        }

        if (hasError) {
          console.error("❌ OAuth error in URL");
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname || "/",
          );
        }

        // انتظر قليلاً للسماح لـ Supabase بمعالجة أي OAuth callback
        await new Promise((resolve) => setTimeout(resolve, 100));

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
          if (
            window.location.search.includes("code=") ||
            window.location.hash.includes("access_token")
          ) {
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname || "/",
            );
          }
          return;
        }

        // تحقق من وجود guest mode محفوظ
        const isGuestSaved =
          localStorage.getItem("abeely_guest_mode") === "true";
        if (isGuestSaved && isMounted) {
          setIsGuest(true);
          setAppView("main");
          setAuthLoading(false);
          return;
        }

        // تحقق من نوع الرابط - الصفحات العامة تدخل كضيف
        const route = parseRoute();
        const isPublicRoute = route.type === "request" ||
          route.type === "marketplace" ||
          route.type === "home" ||
          route.type === "create";

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // فقط نطبع log إذا كان هناك session أو حدث مهم
        if (
          session?.user ||
          (event !== "INITIAL_SESSION" && event !== "TOKEN_REFRESHED")
        ) {
          console.log(
            "🔐 Auth state changed:",
            event,
            session?.user?.email || "no session",
          );
        }

        if (
          (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
          session?.user && isMounted
        ) {
          console.log("✅ User signed in:", session.user.email);

          // تنظيف sessionStorage
          sessionStorage.removeItem("oauth_code_processed");
          setIsGuest(false);
          localStorage.removeItem("abeely_guest_mode");
          setIsProcessingOAuth(false);
          setAuthLoading(false);

          // تنظيف URL
          if (
            window.location.search.includes("code=") ||
            window.location.hash.includes("access_token")
          ) {
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname || "/",
            );
          }

          // تحميل الـ profile والتحقق من الـ onboarding
          getCurrentUser().then(async (profile) => {
            console.log("🔍 Profile loaded:", profile);
            if (profile && isMounted) {
              setUser(profile);

              // التحقق إذا كان المستخدم جديداً ويحتاج الـ onboarding
              console.log("🔍 Checking if user needs onboarding...");
              const needsOnboard = await checkOnboardingStatus(
                profile.id,
                profile,
              );
              console.log("🔍 Onboarding check result:", needsOnboard);
              if (needsOnboard && isMounted) {
                console.log("✅ New user detected, showing onboarding...");
                setNeedsOnboarding(true);
                setIsNewUser(true);
                setAppView("onboarding");
              } else {
                console.log(
                  "⏭️ User does not need onboarding, going to main...",
                );
                setAppView("main");
              }
            } else {
              console.log("⚠️ No profile found, going to main...");
              setAppView("main");
            }
          }).catch((err) => {
            console.error("❌ Error loading profile:", err);
            setAppView("main");
          });
          return; // منع setAppView("main") أدناه
        } else if (event === "TOKEN_REFRESHED" && session?.user && isMounted) {
          // تحديث الـ profile فقط - لا تسجيل خروج!
          console.log("🔄 Token refreshed, updating profile...");
          const profile = await getCurrentUser();
          if (profile && isMounted) {
            setUser(profile);
          }
        } else if (event === "SIGNED_OUT" && isMounted) {
          // التحقق إذا كان تسجيل خروج صريح من المستخدم
          console.log("👋 Auth event: SIGNED_OUT");

          // فقط نطبق SIGNED_OUT إذا كان هناك explicit_signout
          // هذا يمنع تسجيل الخروج بسبب أخطاء مؤقتة في Supabase (مثل refresh token)
          const isExplicitSignOut = sessionStorage.getItem("explicit_signout");

          if (!isExplicitSignOut) {
            // ليس تسجيل خروج صريح - تحقق من وجود session فعلي
            console.log(
              "🔄 SIGNED_OUT event but no explicit signout, checking session...",
            );
            try {
              const { data: { session: currentSession } } = await supabase.auth
                .getSession();
              if (currentSession?.user) {
                console.log(
                  "✅ Session still exists, ignoring SIGNED_OUT event",
                );
                // الجلسة ما زالت موجودة - تجاهل الحدث
                return;
              }
            } catch (e) {
              console.error("Error checking session:", e);
              // في حالة الخطأ، أيضاً نتجاهل الحدث (آمن أكثر)
              return;
            }

            // محاولة تجديد الجلسة إذا لم تكن موجودة
            try {
              await new Promise((resolve) => setTimeout(resolve, 500));
              const { data: refreshed, error: refreshError } = await supabase
                .auth.refreshSession();
              if (refreshError) {
                const message = refreshError.message?.toLowerCase() || "";
                if (message.includes("fetch") || message.includes("network")) {
                  console.warn(
                    "🌐 Network issue refreshing session, ignoring SIGNED_OUT",
                  );
                  return;
                }
                console.error("Error refreshing session:", refreshError);
              }
              if (refreshed?.session?.user) {
                console.log("✅ Session refreshed, ignoring SIGNED_OUT event");
                const profile = await getCurrentUser();
                if (profile && isMounted) {
                  setUser(profile);
                }
                return;
              }
            } catch (e) {
              console.error("Error attempting session refresh:", e);
              return;
            }
          }

          // تسجيل خروج فعلي (فقط إذا كان explicit أو لا يوجد session)
          console.log("✅ Applying sign out");
          sessionStorage.removeItem("explicit_signout");
          setUser(null);
          setIsGuest(false);
          setAppView("auth");
        } else if (event === "USER_UPDATED" && session?.user && isMounted) {
          // تحديث بيانات المستخدم
          const profile = await getCurrentUser();
          if (profile && isMounted) {
            setUser(profile);
          }
        }
      },
    );

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
      console.log(
        "⏳ Splash complete but still loading auth or processing OAuth...",
      );
      return false;
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
    if (appView === "splash" && !authLoading && !isProcessingOAuth) {
      // Minimal delay - just enough for smooth transition
      const timer = setTimeout(() => {
        handleSplashComplete();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [authLoading, isProcessingOAuth, appView, handleSplashComplete]);

  // انتقل لـ main فوراً عندما يتم تعيين user أثناء OAuth
  useEffect(() => {
    if (appView === "splash" && user && !authLoading) {
      console.log("✅ User detected during splash, transitioning to main...");
      setAppView("main");
      // تنظيف URL
      if (window.location.search.includes("code=")) {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname || "/",
        );
      }
    }
  }, [appView, user, authLoading]);

  // Failsafe: Force exit splash after maximum time (5 seconds)
  // لكن إذا كان OAuth قيد المعالجة، انتظر أكثر
  useEffect(() => {
    if (appView !== "splash") return;

    // تحقق إذا كان هناك OAuth code في URL
    const hasOAuthCode = window.location.search.includes("code=") ||
      window.location.hash.includes("access_token");

    // إذا كان OAuth، انتظر وقتاً أطول (10 ثواني)
    const timeout = hasOAuthCode ? 10000 : 5000;

    const failsafeTimer = setTimeout(() => {
      console.warn(
        "⚠️ Splash failsafe triggered - forcing exit after",
        timeout,
        "ms",
      );
      if (appView === "splash") {
        setAuthLoading(false);
        setIsProcessingOAuth(false);
        // تحقق إذا هناك user الآن
        if (user) {
          setAppView("main");
        } else if (isGuest) {
          setAppView("main");
        } else {
          // نظف URL أولاً
          if (window.location.search.includes("code=")) {
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname || "/",
            );
          }
          setAppView("auth");
        }
      }
    }, timeout);

    return () => clearTimeout(failsafeTimer);
  }, [appView, user, isGuest]);

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
          // فلترة الطلبات المخفية
          const filtered = firstPage.filter((req) => req.isPublic !== false);
          setAllRequests(filtered);
          setMarketplacePage(0);
          setMarketplaceHasMore(filtered.length === MARKETPLACE_PAGE_SIZE);
          setMarketplaceLoadedOnce(true); // تم التحميل بنجاح
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
      setIsLoadingMyOffers(true);
      setArchivedRequests([]);
      setUserPreferences({
        interestedCategories: [],
        interestedCities: [],
        radarWords: [],
        notifyOnInterest: true,
        roleMode: "requester",
        showNameToApprovedProvider: true,
      });
      return;
    }

    // Load preferences from backend to populate interests filters
    const loadPreferences = async () => {
      try {
        const prefs = await getPreferencesDirect(user.id);
        if (prefs) {
          setUserPreferences(prefs);
        }
      } catch (error) {
        console.error("Error loading user preferences:", error);
      }
    };

    loadPreferences();

    const loadUserData = async () => {
      try {
        // ترقية الطلبات القديمة من "مسودة" إلى "نشط" (مرة واحدة لكل مستخدم)
        await migrateUserDraftRequests(user.id);

        setIsLoadingMyOffers(true);
        await Promise.all([
          fetchMyRequests(user.id).then((reqs) =>
            setMyRequests(reqs.filter((r) => r.status !== "archived"))
          ),
          fetchMyOffers(user.id).then((offers) => {
            // جلب جميع العروض بما فيها المكتملة والمنتهية (لا نستثني أي شيء)
            setMyOffers(offers);
            setIsLoadingMyOffers(false);
          }),
          fetchOffersForUserRequests(user.id).then(setReceivedOffersMap),
          fetchArchivedRequests(user.id).then(setArchivedRequests),
        ]);
      } catch (error) {
        console.error("Error loading user data:", error);
        setIsLoadingMyOffers(false);
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
      setIsLoadingViewedRequests(false);
      return;
    }

    // Initial load
    setIsLoadingViewedRequests(true);
    const loadViewedRequests = async () => {
      try {
        const ids = await getViewedRequestIds();
        setViewedRequestIds(ids);
      } catch (error) {
        console.error("Error loading viewed requests:", error);
      } finally {
        setIsLoadingViewedRequests(false);
      }
    };
    loadViewedRequests();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToViewedRequests(user.id, (ids) => {
      setViewedRequestIds(ids);
      // لا نغير isLoadingViewedRequests هنا لأن الـ subscription قد يحدث بعد التحميل الأولي
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
    // فقط حمّل البيانات إذا لم يتم التحميل بنجاح من قبل
    if (!marketplaceLoadedOnce) {
      const reloadData = async () => {
        loadingRef.current = true;
        try {
          setIsLoadingData(true);
          setRequestsLoadError(null);
          const { data: firstPage, count: totalCount } =
            await fetchRequestsPaginated(0, MARKETPLACE_PAGE_SIZE);
          if (Array.isArray(firstPage)) {
            // فلترة الطلبات المخفية
            const filtered = firstPage.filter((req) => req.isPublic !== false);
            setAllRequests(filtered);
            setMarketplacePage(0);
            const more = typeof totalCount === "number"
              ? filtered.length < totalCount
              : filtered.length === MARKETPLACE_PAGE_SIZE;
            setMarketplaceHasMore(more);
            setMarketplaceLoadedOnce(true); // تم التحميل بنجاح
          }
        } catch (error: any) {
          console.error("❌ Error reloading marketplace data:", error);
          const errorMessage = error?.message || String(error);

          // تحديد رسالة الخطأ المناسبة
          let userFriendlyMessage =
            "حدث خطأ في تحميل الطلبات. يرجى المحاولة مرة أخرى.";
          if (
            errorMessage.includes("timeout") ||
            errorMessage.includes("Connection timeout")
          ) {
            userFriendlyMessage =
              "Connection timeout: Unable to reach Supabase. Please check your internet connection and Supabase configuration.";
          } else if (errorMessage.includes("Failed to fetch")) {
            userFriendlyMessage =
              "Connection timeout: Unable to reach Supabase. Please check your internet connection and Supabase configuration.";
          }

          console.error("Setting load error:", userFriendlyMessage);
          setRequestsLoadError(userFriendlyMessage);
        } finally {
          setIsLoadingData(false);
          loadingRef.current = false;
        }
      };
      reloadData();
    }
  }, [view, appView, marketplaceLoadedOnce]); // إزالة requestsLoadError من dependencies لمنع الحلقة

  // ==========================================
  // Auto-Retry: Check Connection & Reload Data
  // ==========================================
  useEffect(() => {
    // Only run when in main view and data hasn't been loaded successfully yet
    if (appView !== "main") return;
    // إذا تم التحميل مرة واحدة بنجاح (حتى لو 0 نتائج)، لا نحتاج Auto-Retry
    if (marketplaceLoadedOnce) return;
    if (loadingRef.current) return;

    let retryCount = 0;
    const maxRetries = 60; // Max 5 minutes (60 * 5s)

    let intervalId: any;

    const checkAndReload = async () => {
      if (retryCount >= maxRetries) {
        console.log("[Auto-Retry] Max retries reached, stopping auto-check");
        clearInterval(intervalId);
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
            if (Array.isArray(firstPage)) {
              // فلترة الطلبات المخفية
              const filtered = firstPage.filter((req) =>
                req.isPublic !== false
              );
              setAllRequests(filtered);
              setMarketplacePage(0);
              const more = typeof totalCount === "number"
                ? filtered.length < totalCount
                : filtered.length === MARKETPLACE_PAGE_SIZE;
              setMarketplaceHasMore(more);
              setMarketplaceLoadedOnce(true); // تم التحميل بنجاح (حتى لو 0 نتائج)
              clearInterval(intervalId);
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
    intervalId = setInterval(checkAndReload, 5000);

    // Also check immediately
    checkAndReload();

    return () => {
      clearInterval(intervalId);
    };
  }, [appView, marketplaceLoadedOnce]);

  // ==========================================
  // Loading Timeout: Show friendly error after 10s
  // ==========================================
  useEffect(() => {
    if (appView !== "main") return;
    if (marketplaceLoadedOnce) return; // تم التحميل بنجاح، لا نحتاج timeout
    if (!isLoadingData) return;
    if (requestsLoadError) return;

    const timeoutId = setTimeout(() => {
      if (isLoadingData && !marketplaceLoadedOnce) {
        setRequestsLoadError("قد يكون هناك مشكلة مؤقتة في الاتصال");
        setIsLoadingData(false);
      }
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [appView, isLoadingData, marketplaceLoadedOnce, requestsLoadError]);

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

    // Subscribe to unread messages count
    const unsubscribeMessages = subscribeToUnreadCount(user.id, (count) => {
      setUnreadMessagesCount(count);
      setHasUnreadMessages(count > 0);
    });

    return () => {
      unsubscribe();
      unsubscribeMessages();
      setUnreadMessagesCount(0);
      setHasUnreadMessages(false);
    };
  }, [appView, user?.id]);

  // ==========================================
  // Calculate unread messages for My Requests and My Offers separately
  // ==========================================
  useEffect(() => {
    if (appView !== "main" || !user?.id) {
      setUnreadMessagesForMyRequests(0);
      setUnreadMessagesForMyOffers(0);
      return;
    }

    const calculateUnreadMessages = async () => {
      try {
        // Get request IDs
        const requestIds = myRequests.map((r) => r.id);
        const requestsCount = requestIds.length > 0
          ? await getUnreadMessagesForMyRequests(requestIds)
          : 0;
        setUnreadMessagesForMyRequests(requestsCount);

        // Get offer IDs
        const offerIds = myOffers.map((o) => o.id);
        const offersCount = offerIds.length > 0
          ? await getUnreadMessagesForMyOffers(offerIds)
          : 0;
        setUnreadMessagesForMyOffers(offersCount);
      } catch (error) {
        console.error("Error calculating unread messages:", error);
      }
    };

    calculateUnreadMessages();

    // Recalculate when myRequests or myOffers change
    const intervalId = setInterval(calculateUnreadMessages, 5000);

    return () => {
      clearInterval(intervalId);
      setUnreadMessagesForMyRequests(0);
      setUnreadMessagesForMyOffers(0);
    };
  }, [appView, user?.id, myRequests, myOffers]);

  // ==========================================
  // Auto-mark notifications as read when viewing My Requests page with received offers
  // ==========================================
  useEffect(() => {
    if (appView !== "main" || !user?.id || view !== "requests-mode") return;
    if (receivedOffersMap.size === 0) return;

    // Get all request IDs that have received offers
    const requestIdsWithOffers = Array.from(receivedOffersMap.keys());

    // Mark notifications related to these requests as read
    const markNotificationsAsRead = async () => {
      const notificationsToMark = notifications.filter((n) =>
        !n.isRead &&
        n.type === "offer" &&
        n.relatedRequest &&
        requestIdsWithOffers.includes(n.relatedRequest.id)
      );

      if (notificationsToMark.length > 0) {
        for (const notif of notificationsToMark) {
          await markNotificationAsRead(notif.id);
          setNotifications((prev) =>
            prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
          );
        }
      }
    };

    // Delay slightly to ensure page is fully loaded
    const timeoutId = setTimeout(markNotificationsAsRead, 500);

    return () => clearTimeout(timeoutId);
  }, [appView, user?.id, view, receivedOffersMap, notifications]);

  // ==========================================
  // Fetch and refresh received offers when opening My Requests page
  // ==========================================
  useEffect(() => {
    if (appView !== "main" || !user?.id || view !== "requests-mode") return;

    // جلب العروض المستلمة عند فتح الصفحة
    const fetchOffers = async () => {
      try {
        const offers = await fetchOffersForUserRequests(user.id);
        setReceivedOffersMap(offers);
      } catch (error) {
        console.error("Error fetching received offers:", error);
      }
    };

    // جلب فوري
    fetchOffers();

    // تحديث دوري كل 10 ثواني لضمان ظهور العروض الجديدة
    const intervalId = setInterval(fetchOffers, 10000);

    return () => clearInterval(intervalId);
  }, [appView, user?.id, view]);

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
          // فقط أضف الطلبات العامة (غير المخفية)
          if (!seen.has(r.id) && r.isPublic !== false) {
            merged.push(r);
          }
        }
        // إزالة الطلبات المخفية من القائمة الموجودة
        return merged.filter((r) => r.isPublic !== false);
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
        const radarWords = userPreferences.radarWords || [];

        // Filter all requests by interests
        // "كل المدن" لا تعتبر اهتمامات - يجب أن يكون هناك تصنيفات محددة أو كلمات رادار
        const actualCities = activeCities.filter((city) => city !== "كل المدن");
        const hasInterests = activeCategories.length > 0 ||
          radarWords.length > 0 ||
          actualCities.length > 0;

        if (hasInterests) {
          // إنشاء Sets للتحقق السريع
          const myRequestIdsForInterests = new Set(myRequests.map((r) => r.id));
          const myOfferRequestIdsForInterests = new Set(
            myOffers
              .filter((offer) => offer.status !== "rejected")
              .map((offer) => offer.requestId),
          );

          const filtered = allRequests.filter((req) => {
            // استبعاد الطلبات المخفية (isPublic === false)
            if (req.isPublic === false) {
              return false;
            }

            // استبعاد طلبات المستخدم نفسه - استخدام Set للتحقق السريع
            if (user?.id) {
              // تحقق من myRequests
              if (myRequestIdsForInterests.has(req.id)) {
                return false;
              }

              // تحقق من author مباشرة (fallback)
              if (req.author && req.author === user.id) {
                return false;
              }

              // استبعاد الطلبات التي قدم عليها المستخدم عروض نشطة
              if (myOfferRequestIdsForInterests.has(req.id)) {
                return false;
              }
            }

            // Check categories match
            const catMatch = activeCategories.length === 0 ||
              (req.categories || []).some((catLabel) => {
                return activeCategories.some((interestId) => {
                  const categoryObj = AVAILABLE_CATEGORIES.find((c) =>
                    c.id === interestId
                  );
                  const interestLabels = [interestId];
                  if (categoryObj) interestLabels.push(categoryObj.label);

                  return interestLabels.some((label) => {
                    const labelLower = label.toLowerCase();
                    const catLabelLower = catLabel.toLowerCase();
                    return catLabelLower.includes(labelLower) ||
                      labelLower.includes(catLabelLower) ||
                      catLabelLower === labelLower;
                  });
                });
              });

            // Check city match
            // إذا لم يتم اختيار مدن فعلية (أي تم اختيار "كل المدن" فقط)، نتخطى الفلترة بالمدن
            let cityMatch = true;
            if (actualCities.length > 0) {
              if (!req.location) {
                cityMatch = false;
              } else {
                cityMatch = actualCities.some((city) => {
                  // استخراج اسم المدينة من السلسلة (إذا كانت تحتوي على فاصلة)
                  const cityName = city.split("،")[0].trim().toLowerCase();
                  const requestLocation = req.location.toLowerCase();

                  // استخراج اسم المدينة من موقع الطلب (إذا كان يحتوي على فاصلة)
                  const requestCityName = requestLocation.split("،")[0].trim();

                  // المطابقة المرنة: البحث في أي جزء من السلسلة
                  return requestCityName.includes(cityName) ||
                    cityName.includes(requestCityName) ||
                    requestLocation.includes(cityName) ||
                    cityName.includes(requestLocation);
                });
              }
            }

            // Check radar words match (if any radar words specified)
            const radarMatch = radarWords.length === 0 ||
              radarWords.some((word) => {
                const searchText = `${req.title} ${req.description || ""}`
                  .toLowerCase();
                return searchText.includes(word.toLowerCase());
              });

            const matches = catMatch && cityMatch && radarMatch;

            return matches;
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
    myOffers, // إضافة myOffers للاعتماديات لتحديث interestsRequests عند تغيير العروض
    myRequests, // إضافة myRequests للاعتماديات لتحديث interestsRequests عند تغيير الطلبات
    user?.id,
    isGuest,
    allRequests,
    userPreferences.interestedCategories,
    userPreferences.interestedCities,
    userPreferences.radarWords,
  ]);

  // ==========================================
  // Subscribe to New Requests (Interests Only)
  // ==========================================
  useEffect(() => {
    if (appView !== "main") return;

    // Only subscribe if user has interests configured
    // "كل المدن" لا تعتبر اهتمامات - يجب أن يكون هناك تصنيفات محددة أو كلمات رادار
    const activeCities = userPreferences.interestedCities || [];
    const radarWords = userPreferences.radarWords || [];
    const actualCities = activeCities.filter((city) => city !== "كل المدن");
    const hasInterests = userPreferences.interestedCategories.length > 0 ||
      radarWords.length > 0 ||
      actualCities.length > 0;

    if (!hasInterests) {
      // Use functional updates to avoid unnecessary re-renders
      setInterestsRequests((prev) => prev.length === 0 ? prev : []);
      setUnreadInterestsCount((prev) => prev === 0 ? prev : 0);
      return;
    }

    // Subscribe to new requests matching user interests
    const unsubscribe = subscribeToNewRequests(
      userPreferences.interestedCategories,
      userPreferences.interestedCities,
      userPreferences.radarWords || [],
      async (newRequest) => {
        // Skip notifications for the user's own requests
        if (user?.id && newRequest.author === user.id) {
          return;
        }
        // Add new request to interests list (only if not exists)
        setInterestsRequests((prev) => {
          const exists = prev.some((r) => r.id === newRequest.id);
          if (exists) return prev;
          return [newRequest, ...prev];
        });

        // Increase unread count
        setUnreadInterestsCount((prev) => prev + 1);

        // Mark as new for animation
        setNewRequestIds((prev) => new Set([...prev, newRequest.id]));

        // Clear new request animation after 5 seconds
        setTimeout(() => {
          setNewRequestIds((prev) => {
            const next = new Set(prev);
            next.delete(newRequest.id);
            return next;
          });
        }, 5000);

        // Smart notification based on current view
        if (userPreferences.notifyOnInterest) {
          console.log("🎯 طلب جديد يطابق اهتماماتك:", newRequest.title);

          // Check if user is currently viewing interests page
          const isOnInterestsPage = view === "marketplace" &&
            currentMarketplaceViewMode === "interests";

          if (isOnInterestsPage) {
            // User is on interests page - just play subtle sound + vibration
            // The request will appear with animation in the list
            notificationSound.notify(true); // Subtle sound
          } else {
            // User is elsewhere - show full Toast notification
            notificationSound.notify(false); // Full notification sound
            showToastRef.current(newRequest);
          }
        }
      },
    );

    return () => {
      unsubscribe();
    };
  }, [
    appView,
    user?.id,
    userPreferences.interestedCategories,
    userPreferences.interestedCities,
    userPreferences.radarWords,
    userPreferences.notifyOnInterest,
    view,
    currentMarketplaceViewMode,
  ]);

  // ==========================================
  // Subscribe to All New Requests (for "All" view)
  // ==========================================
  useEffect(() => {
    if (appView !== "main") return;

    // Subscribe to all new public requests
    const unsubscribe = subscribeToAllNewRequests(
      async (newRequest) => {
        // Add new request to all requests list (only if not exists and not hidden)
        setAllRequests((prev) => {
          const exists = prev.some((r) => r.id === newRequest.id);
          if (exists) return prev;
          // فقط أضف الطلبات العامة (غير المخفية)
          if (newRequest.isPublic === false) return prev;
          // Add to the beginning of the list (newest first)
          return [newRequest, ...prev];
        });

        // Mark as new for animation
        setNewRequestIds((prev) => new Set([...prev, newRequest.id]));

        // Clear new request animation after 5 seconds
        setTimeout(() => {
          setNewRequestIds((prev) => {
            const next = new Set(prev);
            next.delete(newRequest.id);
            return next;
          });
        }, 5000);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [appView]);

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
        ? "marketplace"
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
      // No saved state, use default view - الماركت بليس هي الصفحة الافتراضية لكلا الوضعين
      setView("marketplace");
      setSelectedRequest(null);
      setScrollToOfferSection(false);
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

    // السويتشات في الجانبية - تغيير الـ mode فقط بدون تغيير الـ view
    if (newView === "sidebar-requests-mode") {
      setMode("requests");
      return;
    }
    if (newView === "sidebar-offers-mode") {
      setMode("offers");
      return;
    }

    if (view !== newView) {
      if (newView === "settings" || newView === "profile") {
        setPreviousView(view);
      } else if (newView === "request-detail") {
        // حفظ الصفحة السابقة والتبويب السابق عند التنقل إلى request-detail
        // فقط إذا لم نكن بالفعل في request-detail
        if (view !== "request-detail") {
          setPreviousView(view);
          setPreviousBottomTab(activeBottomTab);
        }
      }
    }

    setView(newView as ViewState);
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
    // حفظ الصفحة السابقة والتبويب السابق للرجوع إليها
    // فقط إذا لم نكن بالفعل في request-detail
    if (view !== "request-detail") {
      console.log("💾 Saving previousView:", view, "and tab:", activeBottomTab);
      setPreviousView(view);
      setPreviousBottomTab(activeBottomTab);
    } else {
      console.log("⚠️ Already in request-detail, not saving previousView");
    }
    setSelectedRequest(req);
    setScrollToOfferSection(scrollToOffer);
    setNavigatedFromSidebar(fromSidebar); // تتبع مصدر التنقل
    setView("request-detail");

    // Update viewed requests immediately for optimistic UI
    // Backend will be updated by RequestDetail component via markRequestAsViewed
    // تحديث فوري للطلبات المشاهدة (للجميع - مسجلين وزوار)
    // تحديث viewedRequestIds دائماً (للتحديث الفوري)
    setViewedRequestIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(req.id);
      return newSet;
    });

    // أيضاً إزالة الطلب من قائمة الطلبات الجديدة (لإخفاء الانيميشن)
    setNewRequestIds((prev) => {
      const next = new Set(prev);
      next.delete(req.id);
      return next;
    });
  };

  const handleSelectOffer = (offer: Offer, fromSidebar = false) => {
    const relatedRequest = allRequests.find((r) => r.id === offer.requestId);
    if (relatedRequest) {
      // حفظ الصفحة السابقة والتبويب السابق للرجوع إليها
      // فقط إذا لم نكن بالفعل في request-detail
      if (view !== "request-detail") {
        setPreviousView(view);
        setPreviousBottomTab(activeBottomTab);
      }
      setSelectedRequest(relatedRequest);
      setNavigatedFromSidebar(fromSidebar); // تتبع مصدر التنقل
      setView("request-detail");
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  // معالجة النقر على إشعار للتنقل للعرض/الطلب
  const handleNotificationClick = (notification: Notification) => {
    // إذا كان الإشعار من نوع عرض جديد
    if (notification.type === "offer" && notification.relatedRequest) {
      // البحث عن الطلب المرتبط
      const targetRequest = allRequests.find((r) =>
        r.id === notification.relatedRequest?.id
      ) ||
        myRequests.find((r) => r.id === notification.relatedRequest?.id);

      if (targetRequest) {
        if (view !== "request-detail") {
          setPreviousView(view);
          setPreviousBottomTab(activeBottomTab);
        }
        setSelectedRequest(targetRequest);
        setScrollToOfferSection(true);
        // تمييز العرض المحدد
        if (notification.relatedOffer) {
          setHighlightOfferId(notification.relatedOffer.id);
          // إزالة التمييز بعد 3 ثواني
          setTimeout(() => setHighlightOfferId(null), 3000);
        }
        setView("request-detail");
      }
    } // إذا كان الإشعار من نوع رسالة
    else if (notification.type === "message") {
      setView("messages");
    } // إذا كان هناك رابط linkTo
    else if (notification.linkTo) {
      // يمكن معالجة الروابط المختلفة هنا
    }
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

      // تحميل myOffers أولاً إذا كان المستخدم مسجل دخول
      // هذا يضمن عدم ظهور الطلبات التي قدم عليها المستخدم عرض قبل أن يتم فلترتها
      if (user?.id) {
        setIsLoadingMyOffers(true);
        const [myReqs, offers, receivedOffers] = await Promise.all([
          fetchMyRequests(user.id),
          fetchMyOffers(user.id),
          fetchOffersForUserRequests(user.id),
        ]);
        setMyRequests(myReqs.filter((r) => r.status !== "archived"));
        setMyOffers(offers);
        setReceivedOffersMap(receivedOffers);
        setIsLoadingMyOffers(false);
      }

      // الآن تحميل الطلبات بعد أن يكون myOffers جاهزاً
      const { data: firstPage, count: totalCount } =
        await fetchRequestsPaginated(0, MARKETPLACE_PAGE_SIZE);
      // فلترة الطلبات المخفية
      const filtered = firstPage.filter((req) => req.isPublic !== false);
      setAllRequests(filtered);
      setMarketplacePage(0);
      const more = typeof totalCount === "number"
        ? firstPage.length < totalCount
        : firstPage.length === MARKETPLACE_PAGE_SIZE;
      setMarketplaceHasMore(more);
      setMarketplaceLoadedOnce(true); // تم التحميل بنجاح

      // تحميل الطلبات المؤرشفة إذا كان المستخدم مسجل دخول
      if (user?.id) {
        const archivedReqs = await fetchArchivedRequests(user.id);
        setArchivedRequests(archivedReqs);
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

  const handleArchiveOffer = async (offerId: string): Promise<boolean> => {
    if (!user?.id) {
      console.error("❌ No user ID");
      return false;
    }

    console.log("🗑️ handleArchiveOffer called", { offerId, userId: user.id });

    try {
      const success = await archiveOffer(offerId, user.id);
      console.log("📊 archiveOffer result:", success);

      if (success) {
        // Remove the offer from local state immediately for better UX
        setMyOffers((prev) => {
          const filtered = prev.filter((o) => o.id !== offerId);
          console.log("📝 Updated myOffers:", {
            before: prev.length,
            after: filtered.length,
          });
          return filtered;
        });
        // Reload data to sync with backend, but preserve local deletion
        // Use a flag to ensure we don't overwrite the local deletion
        const deletedOfferId = offerId;
        await reloadData();
        // Double-check: ensure the deleted offer is still removed after reload
        setMyOffers((prev) => {
          // If reloadData somehow brought back the deleted offer, remove it again
          if (prev.some((o) => o.id === deletedOfferId)) {
            console.log("⚠️ Deleted offer reappeared after reload, removing again");
            return prev.filter((o) => o.id !== deletedOfferId);
          }
          return prev;
        });
        console.log("✅ Offer deleted and data reloaded");
        return true;
      } else {
        console.error("❌ Failed to delete offer");
        alert("فشل حذف العرض. يرجى المحاولة مرة أخرى.");
        return false;
      }
    } catch (error) {
      console.error("❌ Error archiving offer:", error);
      alert("حدث خطأ أثناء حذف العرض. يرجى المحاولة مرة أخرى.");
      return false;
    }
  };

  // ==========================================
  // Hide / Unhide / Bump Request
  // ==========================================
  const handleHideRequest = async (requestId: string) => {
    if (!user?.id) return;
    try {
      const success = await hideRequest(requestId, user.id);
      if (success) {
        setMyRequests((prev) =>
          prev.map((r) => r.id === requestId ? { ...r, isPublic: false } : r)
        );
        // إزالة الطلب المخفي من allRequests مباشرة
        setAllRequests((prev) => prev.filter((r) => r.id !== requestId));
      }
    } catch (error) {
      console.error("Error hiding request:", error);
    }
  };

  const handleUnhideRequest = async (requestId: string) => {
    if (!user?.id) return;

    // البحث عن الطلب في myRequests أو archivedRequests
    const request = [...myRequests, ...archivedRequests].find((r) =>
      r.id === requestId
    );
    if (!request) return;

    // التحقق من أن الطلب مؤرشف
    const isArchived = request.status === "archived";

    if (isArchived) {
      // التحقق من مدة التحديث (6 ساعات)
      const lastUpdated = request.updatedAt
        ? new Date(request.updatedAt)
        : new Date(request.createdAt);
      const sixHoursMs = 6 * 60 * 60 * 1000;
      const elapsedSinceUpdate = Date.now() - lastUpdated.getTime();
      const willBump = elapsedSinceUpdate >= sixHoursMs;

      // إظهار التنبيه
      setUnarchiveToast({
        isVisible: true,
        requestId,
        willBump,
      });
      return; // لا نكمل التنفيذ حتى يتم التأكيد
    }

    // إذا لم يكن الأرشيف، تنفيذ الإظهار مباشرة
    try {
      const success = await unhideRequest(requestId, user.id);
      if (success) {
        setMyRequests((prev) =>
          prev.map((r) => r.id === requestId ? { ...r, isPublic: true } : r)
        );
        setAllRequests((prev) =>
          prev.map((r) => r.id === requestId ? { ...r, isPublic: true } : r)
        );
      }
    } catch (error) {
      console.error("Error unhiding request:", error);
    }
  };

  // دالة لتأكيد إلغاء الأرشفة والإظهار
  const handleConfirmUnarchive = async () => {
    if (!unarchiveToast.requestId || !user?.id) return;

    const requestId = unarchiveToast.requestId;
    const willBump = unarchiveToast.willBump;

    try {
      // إلغاء الأرشفة
      const unarchiveSuccess = await unarchiveRequest(requestId, user.id);
      if (!unarchiveSuccess) {
        console.error("Failed to unarchive request");
        setUnarchiveToast({
          isVisible: false,
          requestId: null,
          willBump: false,
        });
        return;
      }

      // إذا كان في مدة التحديث، قم بالتحديث التلقائي (bump)
      if (willBump) {
        await bumpRequest(requestId, user.id);
      }

      // إظهار الطلب
      const unhideSuccess = await unhideRequest(requestId, user.id);
      if (!unhideSuccess) {
        console.error("Failed to unhide request");
        setUnarchiveToast({
          isVisible: false,
          requestId: null,
          willBump: false,
        });
        return;
      }

      // تحديث الواجهة
      const requestToUnarchive = archivedRequests.find((r) =>
        r.id === requestId
      );
      if (requestToUnarchive) {
        setArchivedRequests((prev) => prev.filter((r) => r.id !== requestId));
        setMyRequests((prev) => {
          const unarchivedRequest = {
            ...requestToUnarchive,
            status: "active" as const,
            isPublic: true,
            updatedAt: willBump ? new Date() : requestToUnarchive.updatedAt,
          };
          return [...prev, unarchivedRequest];
        });
        setAllRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? { ...r, status: "active" as const, isPublic: true }
              : r
          )
        );
      }

      // إخفاء التنبيه
      setUnarchiveToast({ isVisible: false, requestId: null, willBump: false });
    } catch (error) {
      console.error("Error confirming unarchive:", error);
      setUnarchiveToast({ isVisible: false, requestId: null, willBump: false });
    }
  };

  // دالة لإلغاء التنبيه
  const handleCancelUnarchive = () => {
    setUnarchiveToast({ isVisible: false, requestId: null, willBump: false });
  };

  const handleBumpRequest = async (requestId: string) => {
    if (!user?.id) return;
    try {
      const success = await bumpRequest(requestId, user.id);
      if (success) {
        const now = new Date();
        setMyRequests((prev) =>
          prev.map((r) => r.id === requestId ? { ...r, updatedAt: now } : r)
        );
        setAllRequests((prev) =>
          prev.map((r) => r.id === requestId ? { ...r, updatedAt: now } : r)
        );
      }
    } catch (error) {
      console.error("Error bumping request:", error);
    }
  };

  // ==========================================
  // Sign Out Handler
  // ==========================================
  const handleSignOut = async () => {
    // تعليم أن هذا تسجيل خروج صريح من المستخدم (وليس بسبب فشل تجديد الـ token)
    sessionStorage.setItem("explicit_signout", "true");
    await authSignOut();
    setUser(null);
    setIsGuest(false);
    setUnreadMessagesCount(0);
    setHasUnreadMessages(false);
    setUnreadInterestsCount(0);
    setNotifications([]);
    localStorage.removeItem("abeely_guest_mode");
    localStorage.removeItem("abeely_pending_route");
    // إعادة تعيين الحالة للقيم الافتراضية لمنع بقاء آثار الجلسة السابقة
    setView("marketplace");
    setMode("offers");
    setSelectedRequest(null);
    setPreviousView(null);
    setPreviousBottomTab(null);
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
  // Require Auth Helper (preserve pending route)
  // ==========================================
  const requireAuthForCreate = useCallback(() => {
    localStorage.setItem("abeely_pending_route", "create-request");
    setIsGuest(false);
    localStorage.removeItem("abeely_guest_mode");
    setPreviousView(view);
    setAppView("auth");
  }, [view]);

  // ==========================================
  // Onboarding Complete Handler
  // ==========================================
  const handleOnboardingComplete = async (preferences: {
    name: string;
    categories: string[];
    cities: string[];
    notificationsEnabled: boolean;
  }) => {
    try {
      // تحديث التفضيلات المحلية
      setUserPreferences((prev) => ({
        ...prev,
        interestedCategories: preferences.categories,
        interestedCities: preferences.cities,
        notifyOnInterest: preferences.notificationsEnabled,
      }));

      // حفظ في قاعدة البيانات إذا كان المستخدم مسجلاً
      if (user?.id) {
        // تحديث الاسم والتفضيلات
        await updatePreferencesDirect(user.id, {
          interestedCategories: preferences.categories,
          interestedCities: preferences.cities,
          notifyOnInterest: preferences.notificationsEnabled,
        });

        // تحديث الاسم في profile
        await supabase
          .from("profiles")
          .update({
            display_name: preferences.name,
          })
          .eq("id", user.id);

        // محاولة تحديث has_onboarded (تجاهل الخطأ إذا العمود غير موجود)
        try {
          await supabase
            .from("profiles")
            .update({ has_onboarded: true })
            .eq("id", user.id);
        } catch (e) {
          console.log(
            "Could not update has_onboarded column (might not exist)",
          );
        }
      }

      // حفظ علامة في localStorage بناءً على userId (للاحتياط)
      if (user?.id) {
        localStorage.setItem(`abeely_onboarded_${user.id}`, "true");
      }

      // إعادة جلب الـ profile مع التحديثات
      const updatedProfile = await getCurrentUser();
      if (updatedProfile) {
        setUser(updatedProfile);
      }

      // الانتقال للتطبيق الرئيسي
      setNeedsOnboarding(false);
      setIsNewUser(false);
      setAppView("main");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      // الانتقال للتطبيق الرئيسي حتى لو فشل الحفظ
      setNeedsOnboarding(false);
      setAppView("main");
    }
  };

  // ==========================================
  // Check if user needs onboarding
  // ==========================================
  const checkOnboardingStatus = async (
    userId: string,
    cachedProfile?: any,
  ): Promise<boolean> => {
    console.log("🔍 checkOnboardingStatus called for user:", userId);
    console.log("🔍 Cached profile:", cachedProfile);

    // استخدم بيانات الـ user الحالية إن وجدت لتجنب ضرب Supabase بدون داعٍ
    let data: any = cachedProfile ?? null;

    // إذا لم يتم تمرير profile جاهز، اجلبه من Supabase
    if (!data) {
      console.log("🔍 No cached profile, fetching from database...");
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select(
          "interested_categories, interested_cities, display_name, has_onboarded",
        )
        .eq("id", userId)
        .single();

      if (error) {
        console.error("❌ Error checking onboarding status:", error);
        // في حالة الخطأ، لا نعرض onboarding تلقائياً
        // نتحقق من localStorage أولاً - إذا كان المستخدم قد أكمل onboarding مسبقاً، لا نحتاج لإظهاره
        const userOnboardedKey = `abeely_onboarded_${userId}`;
        const localOnboarded =
          localStorage.getItem(userOnboardedKey) === "true";

        if (localOnboarded) {
          console.log(
            "⏭️ User already onboarded (localStorage), skipping onboarding despite error",
          );
          return false;
        }

        // فقط إذا كان المستخدم جديداً تماماً (لا يوجد في localStorage)، نعرض onboarding
        console.log(
          "⚠️ Error fetching profile and no local onboarding flag, showing onboarding...",
        );
        return true;
      }

      data = profileData;
      console.log("🔍 Profile data from DB:", data);
    } else {
      console.log("🔍 Using cached profile data");
    }

    // إذا لم يكن هناك بيانات للمستخدم، يحتاج onboarding
    if (!data) {
      console.log("✅ No profile data found, showing onboarding...");
      return true;
    }

    const hasName = !!data?.display_name?.trim();
    const hasInterests = Array.isArray(data?.interested_categories) &&
      data.interested_categories.length > 0;
    const hasCities = Array.isArray(data?.interested_cities) &&
      data.interested_cities.length > 0;
    const alreadyOnboarded = data?.has_onboarded === true;

    console.log("🔍 Onboarding check details:", {
      hasName,
      hasInterests,
      hasCities,
      alreadyOnboarded,
      display_name: data?.display_name,
      interested_categories: data?.interested_categories,
      interested_cities: data?.interested_cities,
    });

    // التحقق من localStorage أولاً - إذا كان المستخدم قد أكمل onboarding مسبقاً، لا نحتاج لإظهاره
    const userOnboardedKey = `abeely_onboarded_${userId}`;
    const localOnboarded = localStorage.getItem(userOnboardedKey) === "true";

    if (localOnboarded) {
      console.log(
        "⏭️ User already onboarded (localStorage), skipping onboarding",
      );
      return false;
    }

    // إذا كان المستخدم قد أكمل onboarding مسبقاً (في قاعدة البيانات)، لا نحتاج لإظهاره مرة أخرى
    // حتى لو لم يكن لديه اهتمامات أو مدن - يمكنه إضافتها لاحقاً من الإعدادات
    if (alreadyOnboarded) {
      localStorage.setItem(userOnboardedKey, "true");
      console.log("⏭️ User already onboarded (DB flag), skipping onboarding");
      return false;
    }

    // إذا كان المستخدم لديه اسم + (اهتمامات أو مدن)، لا يحتاج onboarding
    if (hasName && (hasInterests || hasCities)) {
      localStorage.setItem(userOnboardedKey, "true");
      // تحديث قاعدة البيانات لإشارة has_onboarded
      try {
        await supabase.from("profiles").update({ has_onboarded: true }).eq(
          "id",
          userId,
        );
      } catch (e) {
        console.log("Could not update has_onboarded column (might not exist)");
      }
      console.log("⏭️ User has completed onboarding data, skipping onboarding");
      return false;
    }

    // في جميع الحالات الأخرى، يحتاج المستخدم إلى onboarding
    // (مثلاً: لا يوجد اسم، أو لا توجد اهتمامات أو مدن)
    console.log("✅ User needs onboarding:", {
      userId,
      hasName,
      hasInterests,
      hasCities,
      alreadyOnboarded,
    });
    return true;
  };

  // ==========================================
  // View Rendering Logic
  // ==========================================
  const renderContent = () => {
    switch (view) {
      case "create-request":
        // استخدام واجهة إنشاء الطلب الجديدة (V2)
        const handleCreateRequestBack = () => {
          handleNavigate("marketplace");
        };
        return (
          <SwipeBackWrapper onBack={handleCreateRequestBack} className="h-full">
            <CreateRequestV2
              onBack={handleCreateRequestBack}
              onGoToMarketplace={() => {
                handleNavigate("marketplace");
              }}
              onRequireAuth={requireAuthForCreate}
              onPublish={async (
                request,
                isEditing,
                editRequestId,
              ): Promise<string | null> => {
                try {
                  console.log(
                    isEditing ? "Updating request:" : "Publishing request:",
                    request,
                  );

                  // تأكد من وجود مستخدم مسجل قبل الإرسال
                  // Try multiple times with delay to ensure auth state is updated after login
                  let currentUserId = user?.id;
                  if (!currentUserId) {
                    // Wait a bit for auth state to update after login
                    await new Promise((resolve) =>
                      setTimeout(resolve, 200)
                    );
                    const currentUser = await getCurrentUser();
                    currentUserId = currentUser?.id || null;
                  }

                  // If still no user, try one more time after another delay
                  if (!currentUserId) {
                    await new Promise((resolve) => setTimeout(resolve, 300));
                    const currentUser = await getCurrentUser();
                    currentUserId = currentUser?.id || null;
                  }

                  // Only require auth if we're absolutely sure there's no user
                  // Note: CreateRequestV2 will show an alert instead of forcing redirect
                  if (!currentUserId) {
                    console.warn("No user found in onPublish");
                    // Don't force redirect - let CreateRequestV2 handle it with alert
                    // requireAuthForCreate();
                    return null;
                  }

                  // التحقق من البيانات الأساسية
                  if (!request.description || !request.location) {
                    console.error("Missing required fields:", {
                      description: !!request.description,
                      location: !!request.location,
                    });
                    return null;
                  }

                  // تحويل البيانات لصيغة AIDraft
                  const draftData = {
                    title: request.title || request.description.slice(0, 50) ||
                      "طلب جديد",
                    description: request.description,
                    location: request.location,
                    budgetMin: request.budgetMin,
                    budgetMax: request.budgetMax,
                    categories: request.categories,
                    deliveryTime: request.deliveryTimeFrom,
                  };

                  let resultId: string | null = null;

                  // إذا كان تعديل، استخدم updateRequest
                  if (isEditing && editRequestId && currentUserId) {
                    const updatedRequest = await updateRequest(
                      editRequestId,
                      currentUserId,
                      draftData,
                      request.seriousness,
                    );
                    if (updatedRequest) {
                      resultId = updatedRequest.id;
                      // إذا كان الطلب مؤرشفاً، إظهار تنبيه
                      if (updatedRequest.wasArchived) {
                        setUpdateUnarchiveNotification({
                          isVisible: true,
                          requestId: updatedRequest.id,
                        });
                        // إخفاء التنبيه بعد 5 ثوان
                        setTimeout(() => {
                          setUpdateUnarchiveNotification({
                            isVisible: false,
                            requestId: null,
                          });
                        }, 5000);
                      }
                    } else {
                      console.error(
                        "Failed to update request - updateRequest returned null",
                      );
                      return null;
                    }
                  } else {
                    // إنشاء طلب جديد
                    const createdRequest = await createRequestFromChat(
                      currentUserId,
                      draftData,
                      {
                        seriousness: request.seriousness,
                      },
                    );
                    resultId = createdRequest?.id || null;
                  }

                  // إعادة تحميل البيانات في الخلفية
                  reloadData().catch(console.error);

                  // إرجاع ID الطلب
                  return resultId;
                } catch (error) {
                  console.error("Error publishing/updating request:", error);
                  return null;
                }
              }}
              requestToEdit={requestToEdit}
              onClearRequestToEdit={() => setRequestToEdit(null)}
              onGoToRequest={async (requestId) => {
                // البحث أولاً في القوائم المحلية
                const foundRequest = [...myRequests, ...allRequests].find((r) =>
                  r.id === requestId
                );

                if (foundRequest) {
                  setSelectedRequest(foundRequest);
                  // إذا كان الطلب للمستخدم الحالي، تأكد من أن mode هو "requests"
                  if (user?.id && foundRequest.author === user.id) {
                    setMode("requests");
                  }
                  handleNavigate("request-detail");
                } else {
                  // جلب الطلب الفعلي من قاعدة البيانات
                  try {
                    const fetchedRequest = await fetchRequestById(requestId);

                    if (fetchedRequest) {
                      // إضافة معلومات المؤلف من بيانات المستخدم
                      if (user) {
                        fetchedRequest.authorName = user.display_name ||
                          user.email || "مستخدم";
                        fetchedRequest.authorFirstName = user.first_name;
                        fetchedRequest.authorLastName = user.last_name;
                      }

                      setSelectedRequest(fetchedRequest);

                      // تحديث myRequests إذا كان الطلب للمستخدم الحالي
                      if (user?.id && fetchedRequest.author === user.id) {
                        setMyRequests((prev) => {
                          // تجنب التكرار
                          if (prev.some((r) => r.id === requestId)) {
                            return prev;
                          }
                          return [fetchedRequest, ...prev];
                        });
                        // تأكد من أن mode هو "requests" عند عرض طلب المستخدم
                        setMode("requests");
                      }

                      handleNavigate("request-detail");
                    } else {
                      console.error("Failed to fetch request:", requestId);
                      // في حالة الفشل، نستخدم كائن مؤقت على الأقل
                      const tempRequest: Request = {
                        id: requestId,
                        title: "طلب جديد",
                        description: "",
                        location: "",
                        status: "active",
                        author: user?.id || null,
                        authorName: user?.display_name || user?.email ||
                          "مستخدم",
                        isPublic: true,
                        createdAt: new Date(),
                        offers: [],
                        offersCount: 0,
                        viewCount: 0,
                        messages: [],
                      };
                      setSelectedRequest(tempRequest);
                      handleNavigate("request-detail");
                    }
                  } catch (error) {
                    console.error("Error fetching request:", error);
                    // في حالة الخطأ، نستخدم كائن مؤقت
                    const tempRequest: Request = {
                      id: requestId,
                      title: "طلب جديد",
                      description: "",
                      location: "",
                      status: "active",
                      author: user?.id || null,
                      authorName: user?.display_name || user?.email || "مستخدم",
                      isPublic: true,
                      createdAt: new Date(),
                      offers: [],
                      offersCount: 0,
                      viewCount: 0,
                      messages: [],
                    };
                    setSelectedRequest(tempRequest);
                    handleNavigate("request-detail");
                  }
                }
              }}
              // Header Props
              mode={mode}
              toggleMode={toggleMode}
              isModeSwitching={isModeSwitching}
              unreadCount={unreadCount}
              user={user}
              titleKey={titleKey}
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onNotificationClick={handleNotificationClick}
              onClearAll={handleClearNotifications}
              onSignOut={isGuest ? handleGoToLogin : handleSignOut}
              isGuest={isGuest}
              onNavigateToProfile={() => {
                setPreviousView(view);
                setView("profile");
              }}
              onNavigateToSettings={() => {
                setPreviousView(view);
                setView("settings");
              }}
              // AI Orb props
              aiInput={aiInput}
              setAiInput={setAiInput}
              aiMessages={aiMessages}
              setAiMessages={setAiMessages}
              isAiLoading={isAiLoading}
              setIsAiLoading={setIsAiLoading}
              aiSendHandlerRef={aiSendHandlerRef}
              // Voice processing props (for GlobalFloatingOrb)
              voiceSendHandlerRef={voiceSendHandlerRef}
              setVoiceProcessingStatus={setVoiceProcessingStatus}
            />
          </SwipeBackWrapper>
        );
      case "marketplace":
        console.log("🏪 Rendering marketplace case:", {
          view,
          activeBottomTab,
          allRequestsCount: allRequests.length,
          myRequestsCount: myRequests.length,
          willShowMarketplace: activeBottomTab === "marketplace",
          willShowMyRequests: activeBottomTab === "my-requests",
          willShowMyOffers: activeBottomTab === "my-offers",
        });

        // All three pages are always mounted - CSS controls visibility for smooth transitions
        // فلترة قوية: استبعاد طلبات المستخدم والطلبات التي قدم عليها عروض
        // إنشاء Sets للتحقق السريع
        const myRequestIds = new Set(myRequests.map((r) => r.id));
        const myOfferRequestIds = new Set(
          myOffers
            .filter((offer) => offer.status !== "rejected")
            .map((offer) => offer.requestId),
        );

        // Debug: التحقق من القيم
        if (user?.id && (myRequestIds.size > 0 || myOfferRequestIds.size > 0)) {
          console.log("🔍 Filtering marketplace requests:", {
            userId: user.id,
            myRequestsCount: myRequests.length,
            myRequestIds: Array.from(myRequestIds),
            myOffersCount: myOffers.length,
            myOfferRequestIds: Array.from(myOfferRequestIds),
            allRequestsCount: allRequests.length,
          });
        }

        // فلترة صارمة: استبعاد طلبات المستخدم والطلبات التي قدم عليها عروض
        const filteredAllRequests = allRequests.filter((req) => {
          // 1. استبعاد الطلبات المخفية
          if (req.isPublic === false) {
            return false;
          }

          // 2. استبعاد طلبات المستخدم نفسه - تحقق من ID و author
          if (user?.id) {
            // تحقق من myRequests أولاً (الأسرع والأدق)
            if (myRequestIds.has(req.id)) {
              console.log("🚫 Filtered out my request:", req.id, req.title);
              return false;
            }

            // تحقق من author مباشرة (fallback للتأكد 100%)
            if (req.author && req.author === user.id) {
              console.log(
                "🚫 Filtered out my request by author:",
                req.id,
                req.title,
              );
              return false;
            }

            // 3. استبعاد الطلبات التي قدم عليها المستخدم عروض نشطة
            if (myOfferRequestIds.has(req.id)) {
              console.log(
                "🚫 Filtered out request with my offer:",
                req.id,
                req.title,
              );
              return false;
            }
          }

          return true;
        });

        // لا ندمج myRequests مع allRequests - كل واحد في مكانه
        const mergedRequests = filteredAllRequests;
        return (
          <div className="h-full flex flex-col overflow-hidden relative bg-transparent">
            {/* MyRequests - conditionally rendered */}
            {activeBottomTab === "my-requests" && (
              <div className="absolute inset-0 z-[10] pointer-events-auto">
                <MyRequests
                  requests={myRequests}
                  archivedRequests={archivedRequests}
                  receivedOffersMap={receivedOffersMap}
                  onSelectRequest={handleSelectRequest}
                  user={user}
                  isGuest={isGuest}
                  onNavigateToProfile={() => {
                    setPreviousView(view);
                    setView("profile");
                  }}
                  onNavigateToSettings={() => {
                    setPreviousView(view);
                    setView("settings");
                  }}
                  onSignOut={isGuest ? handleGoToLogin : handleSignOut}
                  isDarkMode={isDarkMode}
                  toggleTheme={() => setIsDarkMode(!isDarkMode)}
                  onOpenLanguagePopup={() => setIsLanguagePopupOpen(true)}
                  onArchiveRequest={async (requestId) => {
                    try {
                      // حفظ الطلب قبل حذفه
                      const requestToArchive = myRequests.find((r) =>
                        r.id === requestId
                      );
                      if (!requestToArchive) return;

                      // تحديث فوري في الواجهة (optimistic update)
                      setMyRequests((prev) =>
                        prev.filter((r) => r.id !== requestId)
                      );
                      setArchivedRequests((prev) => {
                        // تحديث حالة الطلب إلى archived ومخفي تلقائياً
                        const archivedRequest = {
                          ...requestToArchive,
                          status: "archived" as const,
                          isPublic: false, // إخفاء تلقائي عند الأرشفة
                        };
                        return [...prev, archivedRequest];
                      });

                      // تحديث allRequests أيضاً
                      setAllRequests((prev) =>
                        prev.map((r) =>
                          r.id === requestId
                            ? {
                              ...r,
                              status: "archived" as const,
                              isPublic: false,
                            }
                            : r
                        )
                      );

                      // تغيير الفلتر تلقائياً إلى قسم المؤرشف
                      setMyRequestsFilter("completed");

                      // تنفيذ الأرشفة في قاعدة البيانات
                      await archiveRequest(requestId, user?.id || "");
                    } catch (error) {
                      console.error("Error archiving request:", error);
                      // في حالة الخطأ، إعادة الطلب إلى myRequests
                      const requestToRestore = archivedRequests.find((r) =>
                        r.id === requestId
                      );
                      if (requestToRestore) {
                        setArchivedRequests((prev) =>
                          prev.filter((r) => r.id !== requestId)
                        );
                        setMyRequests((prev) => [...prev, requestToRestore]);
                      }
                    }
                  }}
                  onUnarchiveRequest={async (requestId) => {
                    try {
                      // حفظ الطلب قبل حذفه
                      const requestToUnarchive = archivedRequests.find((r) =>
                        r.id === requestId
                      );
                      if (!requestToUnarchive) return;

                      // تحديث فوري في الواجهة (optimistic update)
                      setArchivedRequests((prev) =>
                        prev.filter((r) => r.id !== requestId)
                      );
                      setMyRequests((prev) => {
                        // تحديث حالة الطلب إلى active
                        const unarchivedRequest = {
                          ...requestToUnarchive,
                          status: "active" as const,
                        };
                        return [...prev, unarchivedRequest];
                      });

                      // تنفيذ إلغاء الأرشفة في قاعدة البيانات
                      await unarchiveRequest(requestId, user?.id || "");
                    } catch (error) {
                      console.error("Error unarchiving request:", error);
                      // في حالة الخطأ، إعادة الطلب إلى archivedRequests
                      const requestToRestore = myRequests.find((r) =>
                        r.id === requestId
                      );
                      if (requestToRestore) {
                        setMyRequests((prev) =>
                          prev.filter((r) => r.id !== requestId)
                        );
                        setArchivedRequests(
                          (prev) => [...prev, {
                            ...requestToRestore,
                            status: "archived" as const,
                          }],
                        );
                      }
                    }
                  }}
                  onHideRequest={(requestId) => handleHideRequest(requestId)}
                  onUnhideRequest={(requestId) =>
                    handleUnhideRequest(requestId)}
                  onBumpRequest={(requestId) => handleBumpRequest(requestId)}
                  onOpenChat={(requestId, offer) => {
                    const req = [...myRequests, ...archivedRequests].find((r) =>
                      r.id === requestId
                    );
                    if (req) {
                      handleSelectRequest(req);
                      setView("messages");
                    }
                  }}
                  userId={user?.id}
                  viewedRequestIds={viewedRequestIds}
                  isActive={activeBottomTab === "my-requests"}
                  defaultFilter={myRequestsFilter}
                  onFilterChange={(filter) => setMyRequestsFilter(filter)}
                  onRefresh={async () => {
                    if (!user?.id) return;
                    try {
                      // إعادة جلب طلباتي والعروض المستلمة والطلبات المؤرشفة
                      const [myReqs, receivedOffers, archivedReqs] =
                        await Promise.all([
                          fetchMyRequests(user.id),
                          fetchOffersForUserRequests(user.id),
                          fetchArchivedRequests(user.id),
                        ]);
                      setMyRequests(
                        myReqs.filter((r) => r.status !== "archived"),
                      );
                      setReceivedOffersMap(receivedOffers);
                      setArchivedRequests(archivedReqs);
                    } catch (error) {
                      console.error("Error refreshing my requests:", error);
                    }
                  }}
                />
              </div>
            )}

            {/* MyOffers - conditionally rendered */}
            {activeBottomTab === "my-offers" && (
              <div className="absolute inset-0 z-[10] pointer-events-auto">
                <MyOffers
                  offers={myOffers}
                  allRequests={allRequests}
                  onSelectRequest={handleSelectRequest}
                  user={user}
                  isGuest={isGuest}
                  onNavigateToProfile={() => {
                    setPreviousView(view);
                    setView("profile");
                  }}
                  onNavigateToSettings={() => {
                    setPreviousView(view);
                    setView("settings");
                  }}
                  onSignOut={isGuest ? handleGoToLogin : handleSignOut}
                  isDarkMode={isDarkMode}
                  toggleTheme={() => setIsDarkMode(!isDarkMode)}
                  onOpenLanguagePopup={() => setIsLanguagePopupOpen(true)}
                  onSelectOffer={(offer) => handleSelectOffer(offer, false)}
                  onArchiveOffer={handleArchiveOffer}
                  onOpenWhatsApp={(phoneNumber, offer) => {
                    window.open(`https://wa.me/${phoneNumber}`, "_blank");
                  }}
                  onOpenChat={(requestId, offer) => {
                    const req = allRequests.find((r) => r.id === requestId);
                    if (req) {
                      handleSelectRequest(req);
                      setView("messages");
                    }
                  }}
                  userId={user?.id}
                  viewedRequestIds={viewedRequestIds}
                  isActive={activeBottomTab === "my-offers"}
                  onRefresh={async () => {
                    if (!user?.id) return;
                    try {
                      // إعادة جلب عروضي
                      const offers = await fetchMyOffers(user.id);
                      setMyOffers(offers);
                    } catch (error) {
                      console.error("Error refreshing my offers:", error);
                    }
                  }}
                />
              </div>
            )}

            {/* Marketplace - conditionally rendered */}
            {activeBottomTab === "marketplace" && (
              <div className="h-full w-full bg-transparent z-10 pointer-events-auto">
                {allRequests && Array.isArray(allRequests)
                  ? (
                    <Marketplace
                      requests={mergedRequests}
                      interestsRequests={interestsRequests}
                      unreadInterestsCount={unreadInterestsCount}
                      myOffers={myOffers}
                      receivedOffersMap={receivedOffersMap}
                      userId={user?.id}
                      onSelectRequest={handleSelectRequest}
                      userInterests={userInterests}
                      onUpdateInterests={async (interests) => {
                        setUserPreferences((prev) => ({
                          ...prev,
                          interestedCategories: interests,
                        }));
                        // حفظ في قاعدة البيانات
                        if (user?.id) {
                          await updatePreferencesDirect(user.id, {
                            interestedCategories: interests,
                          });
                        }
                      }}
                      interestedCities={userPreferences.interestedCities}
                      onUpdateCities={async (cities) => {
                        setUserPreferences((prev) => ({
                          ...prev,
                          interestedCities: cities,
                        }));
                        // حفظ في قاعدة البيانات
                        if (user?.id) {
                          await updatePreferencesDirect(user.id, {
                            interestedCities: cities,
                          });
                        }
                      }}
                      hasMore={marketplaceHasMore}
                      isLoadingMore={marketplaceIsLoadingMore}
                      isLoading={isLoadingData}
                      isLoadingMyOffers={isLoadingMyOffers}
                      onLoadMore={loadMoreMarketplaceRequests}
                      onRefresh={reloadData}
                      loadError={requestsLoadError}
                      savedScrollPosition={marketplaceScrollPos}
                      onScrollPositionChange={setMarketplaceScrollPos}
                      viewedRequestIds={viewedRequestIds}
                      isLoadingViewedRequests={isLoadingViewedRequests}
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
                      onNotificationClick={handleNotificationClick}
                      onClearAll={handleClearNotifications}
                      onSignOut={isGuest ? handleGoToLogin : handleSignOut}
                      onScrollButtonVisibilityChange={setIsScrollButtonVisible}
                      onHeaderCompressionChange={setIsMarketplaceHeaderCompressed}
                      onNavigateToProfile={() => {
                        setPreviousView(view);
                        setView("profile");
                      }}
                      onNavigateToSettings={() => {
                        setPreviousView(view);
                        setView("settings");
                      }}
                      isDarkMode={isDarkMode}
                      toggleTheme={() => setIsDarkMode(!isDarkMode)}
                      onOpenLanguagePopup={() => setIsLanguagePopupOpen(true)}
                      isActive={activeBottomTab === "marketplace"}
                      onViewModeChange={setCurrentMarketplaceViewMode}
                      newRequestIds={newRequestIds}
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
            )}

            {/* Bottom Navigation - shared across all tabs */}
            <BottomNavigation
              activeTab={activeBottomTab}
              onTabChange={setActiveBottomTab}
              onCreateRequest={() => handleNavigate("create-request")}
              user={user}
              isGuest={isGuest}
              onSignOut={isGuest ? handleGoToLogin : handleSignOut}
              onNavigateToProfile={() => {
                setPreviousView(view);
                setView("profile");
              }}
              onNavigateToSettings={() => {
                setPreviousView(view);
                setView("settings");
              }}
              isDarkMode={isDarkMode}
              toggleTheme={() => setIsDarkMode(!isDarkMode)}
              onOpenLanguagePopup={() => setIsLanguagePopupOpen(true)}
              unreadMessagesCount={unreadMessagesCount}
              unreadMessagesForMyRequests={unreadMessagesForMyRequests}
              unreadMessagesForMyOffers={unreadMessagesForMyOffers}
              unreadInterestsCount={unreadInterestsCount}
              unreadNotificationsForMyRequests={unreadNotificationsForMyRequests}
              unreadNotificationsForMyOffers={unreadNotificationsForMyOffers}
              unreadNotificationsCount={unreadNotificationsForProfile}
              needsProfileSetup={!isGuest && !user?.display_name?.trim()}
            />
          </div>
        );
      case "request-detail":
        // إثراء الطلب بالعروض المستلمة إذا كان المستخدم هو صاحب الطلب (استثناء العروض المؤرشفة)
        const enrichedRequest = selectedRequest
          ? {
            ...selectedRequest,
            offers: (receivedOffersMap.get(selectedRequest.id) ||
              selectedRequest.offers || []),
          }
          : null;
        const handleRequestDetailBack = () => {
          console.log("🔙 handleRequestDetailBack called", {
            previousView,
            previousBottomTab,
            currentView: view,
            activeBottomTab,
            mode,
          });

          // تحديد الصفحة المستهدفة - دائماً نرجع لـ marketplace
          let targetView: ViewState = "marketplace";
          // تحديد التبويب المستهدف - دائماً نرجع لـ marketplace tab
          let targetTab: BottomNavTab = "marketplace"; // القيمة الافتراضية

          // إذا كان هناك previousBottomTab صالح (marketplace, my-requests, my-offers)، استخدمه
          if (
            previousBottomTab &&
            (previousBottomTab === "marketplace" ||
              previousBottomTab === "my-requests" ||
              previousBottomTab === "my-offers")
          ) {
            targetTab = previousBottomTab;
            console.log("✅ Using previousBottomTab:", targetTab);
          } else {
            // دائماً نرجع لـ marketplace tab
            targetTab = "marketplace";
            console.log("✅ Using default marketplace tab");
          }

          // دائماً نرجع لـ marketplace view
          targetView = "marketplace";

          console.log("✅ Returning to:", {
            view: targetView,
            tab: targetTab,
            previousView,
            previousBottomTab,
            currentActiveTab: activeBottomTab,
          });

          // ⚠️ مهم جداً: تغيير الـ view والـ tab أولاً
          // ثم تنظيف الـ state لتجنب race condition (صفحة بيضاء)
          setActiveBottomTab(targetTab);
          setView(targetView);

          // تحديث URL بعد تغيير view
          updateUrl(targetView, undefined, true);

          // تنظيف الـ state بعد تغيير الـ view (لتجنب الصفحة البيضاء)
          // نستخدم setTimeout لضمان تنفيذ هذا بعد render الجديد
          setTimeout(() => {
            setSelectedRequest(null);
            setOfferToEdit(null);
            setScrollToOfferSection(false);
            setNavigatedFromSidebar(false);
            setPreviousView(null);
            setPreviousBottomTab(null);
          }, 0);

          console.log(
            "✅ State updated - view:",
            targetView,
            "tab:",
            targetTab,
          );
        };

        // البحث عن العرض في myOffers
        const offerForEdit = enrichedRequest
          ? getMyOfferOnRequest(enrichedRequest.id) ||
            myOffers.find((o) => o.requestId === enrichedRequest.id)
          : undefined;

        return enrichedRequest
          ? (
            <SwipeBackWrapper
              onBack={handleRequestDetailBack}
              className="h-full flex flex-col overflow-hidden"
            >
              <RequestDetail
                request={enrichedRequest}
                mode={mode}
                myOffer={offerForEdit}
                onBack={handleRequestDetailBack}
                isGuest={isGuest}
                scrollToOfferSection={scrollToOfferSection}
                navigatedFromSidebar={navigatedFromSidebar}
                highlightOfferId={highlightOfferId}
                autoTranslateRequests={autoTranslateRequests}
                currentLanguage={currentLanguage}
                onNavigateToMessages={async (
                  conversationId,
                  userId,
                  requestId,
                  offerId,
                ) => {
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
                        setInitialConversationId(conv.id);
                        setView("conversation");
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
                onNotificationClick={handleNotificationClick}
                onClearAll={handleClearNotifications}
                onSignOut={isGuest ? handleGoToLogin : handleSignOut}
                onMarkRequestAsRead={handleRequestRead}
                onArchiveRequest={handleArchiveRequest}
                onEditRequest={(request) => {
                  // تعيين الطلب للتعديل
                  setRequestToEdit(request);
                }}
                onOfferCreated={async () => {
                  // Reload user's offers after creating a new one
                  if (user?.id) {
                    const offers = await fetchMyOffers(user.id);
                    setMyOffers(offers);
                  }
                }}
                onNavigateToProfile={() => {
                  setPreviousView(view);
                  setView("profile");
                }}
                onNavigateToSettings={() => {
                  setPreviousView(view);
                  setView("settings");
                }}
                onCancelOffer={async (offerId: string) => {
                  const deleted = await handleArchiveOffer(offerId);
                  if (deleted && selectedRequest) {
                    // إعادة تحميل الطلب المحدد لضمان تحديث البيانات
                    // لكن نبقى في نفس الصفحة بدون نقل المستخدم
                    // handleArchiveOffer يستدعي reloadData() بالفعل، لذلك ننتظر قليلاً
                    // ثم نحدث selectedRequest
                    try {
                      // انتظار قصير لضمان انتهاء reloadData()
                      await new Promise(resolve => setTimeout(resolve, 100));
                      const updatedRequest = await fetchRequestById(selectedRequest.id);
                      if (updatedRequest) {
                        setSelectedRequest(updatedRequest);
                      }
                    } catch (error) {
                      console.error("Error reloading request after offer deletion:", error);
                      // حتى لو فشل التحديث، نبقى في الصفحة
                    }
                  }
                }}
              />
            </SwipeBackWrapper>
          )
          : (() => {
            // إذا لم يكن هناك طلب محدد، redirect تلقائي للـ marketplace
            // هذا يمنع ظهور صفحة بيضاء
            console.warn(
              "⚠️ No enrichedRequest found in request-detail view, redirecting to marketplace",
            );
            // استخدام setTimeout لتجنب تحديث state خلال render
            setTimeout(() => {
              setView("marketplace");
              setActiveBottomTab("marketplace");
              updateUrl("marketplace", undefined, true);
            }, 0);
            // إرجاع loading مؤقت أثناء الانتقال
            return (
              <div className="h-full flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary">
                </div>
              </div>
            );
          })();
      case "settings":
        const handleSettingsBack = () => {
          if (previousView) {
            setView(previousView);
            if (previousBottomTab) {
              setActiveBottomTab(previousBottomTab);
            }
            setPreviousView(null);
            setPreviousBottomTab(null);
          } else {
            handleNavigate(
              mode === "requests" ? "create-request" : "marketplace",
            );
          }
        };
        return (
          <SwipeBackWrapper
            onBack={handleSettingsBack}
            className="h-full flex flex-col overflow-hidden"
          >
            <Settings
              isDarkMode={isDarkMode}
              toggleTheme={() => setIsDarkMode(!isDarkMode)}
              userPreferences={userPreferences}
              onUpdatePreferences={async (prefs) => {
                setUserPreferences(prefs);
                // حفظ في قاعدة البيانات
                if (user?.id) {
                  await updatePreferencesDirect(user.id, {
                    interestedCategories: prefs.interestedCategories,
                    interestedCities: prefs.interestedCities,
                    notifyOnInterest: prefs.notifyOnInterest,
                    radarWords: prefs.radarWords,
                    roleMode: prefs.roleMode,
                    showNameToApprovedProvider:
                      prefs.showNameToApprovedProvider,
                  });
                }
              }}
              user={user}
              onUpdateProfile={async (updates) => {
                if (user?.id) {
                  const result = await updateProfile(user.id, updates);
                  if (result.success && result.data) {
                    // استخدام البيانات المحدثة مباشرة
                    setUser(result.data);
                    // إعادة جلب المستخدم أيضاً لضمان التزامن الكامل
                    setTimeout(async () => {
                      const fresh = await getCurrentUser();
                      if (fresh) {
                        setUser(fresh);
                      }
                    }, 200);
                  } else if (result.error) {
                    console.error("خطأ في تحديث الملف الشخصي:", result.error);
                    throw new Error(result.error);
                  }
                }
              }}
              onBack={handleSettingsBack}
              onSignOut={isGuest ? handleGoToLogin : handleSignOut}
              // Header integration props
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
              onNotificationClick={handleNotificationClick}
              onClearAll={handleClearNotifications}
              isGuest={isGuest}
              onNavigateToProfile={() => {
                setPreviousView(view);
                setView("profile");
              }}
              onNavigateToSettings={() => {
                setPreviousView(view);
                setView("settings");
              }}
            />
          </SwipeBackWrapper>
        );
      case "profile":
        const handleProfileBack = () => {
          if (previousView) {
            setView(previousView);
            if (previousBottomTab) {
              setActiveBottomTab(previousBottomTab);
            }
            setPreviousView(null);
            setPreviousBottomTab(null);
          } else {
            handleNavigate(
              mode === "requests" ? "create-request" : "marketplace",
            );
          }
        };
        return (
          <SwipeBackWrapper
            onBack={handleProfileBack}
            className="h-full flex flex-col overflow-hidden"
          >
            <Profile
              userReviews={reviews}
              userRating={userRating}
              profileRole={profileRole}
              // Header integration props
              mode={mode}
              toggleMode={toggleMode}
              isModeSwitching={isModeSwitching}
              unreadCount={unreadCount}
              hasUnreadMessages={hasUnreadMessages}
              user={user}
              onUpdateProfile={async (updates) => {
                if (user?.id) {
                  const result = await updateProfile(user.id, updates);
                  if (result.success) {
                    const fresh = await getCurrentUser();
                    if (fresh) {
                      setUser(fresh);
                    }
                  }
                }
              }}
              setView={setView}
              setPreviousView={setPreviousView}
              titleKey={titleKey}
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onNotificationClick={handleNotificationClick}
              onClearAll={handleClearNotifications}
              onSignOut={isGuest ? handleGoToLogin : handleSignOut}
              onBack={handleProfileBack}
              isGuest={isGuest}
              onNavigateToProfile={() => {
                setPreviousView(view);
                setView("profile");
              }}
              onNavigateToSettings={() => {
                setPreviousView(view);
                setView("settings");
              }}
            />
          </SwipeBackWrapper>
        );
      case "messages":
        const handleMessagesBack = () => {
          if (previousView) {
            setView(previousView);
            if (previousBottomTab) {
              setActiveBottomTab(previousBottomTab);
            }
            setPreviousView(null);
            setPreviousBottomTab(null);
          } else {
            handleNavigate(
              mode === "requests" ? "create-request" : "marketplace",
            );
          }
          setInitialConversationId(null);
        };
        return (
          <SwipeBackWrapper
            onBack={handleMessagesBack}
            className="h-full flex flex-col overflow-hidden relative"
          >
            <Messages
              onBack={handleMessagesBack}
              onSelectConversation={(conversationId) => {
                setInitialConversationId(conversationId);
                setView("conversation");
              }}
              initialConversationId={initialConversationId || undefined}
              // Header integration props
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
              onNotificationClick={handleNotificationClick}
              onClearAll={handleClearNotifications}
              onSignOut={isGuest ? handleGoToLogin : handleSignOut}
              isGuest={isGuest}
              onNavigateToProfile={() => {
                setPreviousView(view);
                setView("profile");
              }}
              onNavigateToSettings={() => {
                setPreviousView(view);
                setView("settings");
              }}
            />
          </SwipeBackWrapper>
        );
      case "conversation":
        // دالة للعودة للطلب المرتبط بالمحادثة
        const handleConversationBack = async () => {
          // الحصول على معرف المحادثة الحالية
          if (initialConversationId) {
            try {
              // استيراد الدالة للحصول على المحادثة
              const { getConversation } = await import(
                "./services/messagesService"
              );
              const conversation = await getConversation(initialConversationId);

              if (conversation?.request_id) {
                // البحث عن الطلب في القوائم المحلية
                const foundRequest = [...myRequests, ...allRequests].find(
                  (r) => r.id === conversation.request_id,
                );

                if (foundRequest) {
                  setSelectedRequest(foundRequest);
                  setInitialConversationId(null);
                  setView("request-detail");
                  return;
                } else {
                  // جلب الطلب من قاعدة البيانات
                  const fetchedRequest = await fetchRequestById(
                    conversation.request_id,
                  );
                  if (fetchedRequest) {
                    setSelectedRequest(fetchedRequest);
                    setInitialConversationId(null);
                    setView("request-detail");
                    return;
                  }
                }
              }
            } catch (error) {
              console.error(
                "Error navigating back to request from conversation:",
                error,
              );
            }
          }
          // fallback: العودة لقائمة الرسائل إذا لم يوجد طلب مرتبط
          setView("messages");
          setInitialConversationId(null);
        };
        return (
          <SwipeBackWrapper
            onBack={handleConversationBack}
            className="h-full flex flex-col overflow-hidden"
          >
            <Messages
              onBack={handleConversationBack}
              onSelectConversation={(conversationId) => {
                // Already in conversation view
              }}
              initialConversationId={initialConversationId || undefined}
              // Header integration props
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
              onNotificationClick={handleNotificationClick}
              onClearAll={handleClearNotifications}
              onSignOut={isGuest ? handleGoToLogin : handleSignOut}
              isGuest={isGuest}
              onNavigateToProfile={() => {
                setPreviousView(view);
                setView("profile");
              }}
              onNavigateToSettings={() => {
                setPreviousView(view);
                setView("settings");
              }}
            />
          </SwipeBackWrapper>
        );
      default:
        return (
          <div className="h-full flex flex-col overflow-hidden p-8">
            View not found
          </div>
        );
    }
  };

  // حساب الإشعارات غير المقروءة بشكل منفصل
  const unreadNotifications = (notifications || []).filter((n) => !n.isRead);

  // الإشعارات المرتبطة بطلباتي
  const myRequestIds = new Set(myRequests.map((r) => r.id));
  const unreadNotificationsForMyRequests =
    unreadNotifications.filter((n) =>
      n.relatedRequest && myRequestIds.has(n.relatedRequest.id)
    ).length;

  // الإشعارات المرتبطة بعروضي
  const myOfferIds = new Set(myOffers.map((o) => o.id));
  const unreadNotificationsForMyOffers =
    unreadNotifications.filter((n) =>
      n.relatedOffer && myOfferIds.has(n.relatedOffer.id)
    ).length;

  // الإشعارات الأخرى (system, status بدون relation، أو interest - لكن interest محسوبة في unreadInterestsCount)
  const unreadNotificationsForProfile = unreadNotifications.filter((n) => {
    // استثناء الإشعارات المرتبطة بطلباتي أو عروضي
    const isForMyRequest = n.relatedRequest &&
      myRequestIds.has(n.relatedRequest.id);
    const isForMyOffer = n.relatedOffer && myOfferIds.has(n.relatedOffer.id);
    const isInterest = n.type === "interest";
    return !isForMyRequest && !isForMyOffer && !isInterest;
  }).length;

  const unreadCount = unreadNotifications.length; // للتوافق مع الكود القديم

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

  // Onboarding Screen (للمستخدمين الجدد)
  if (appView === "onboarding") {
    return (
      <OnboardingScreen
        onComplete={handleOnboardingComplete}
        isLoading={false}
        initialName={user?.display_name}
        hasExistingName={!!user?.display_name?.trim()}
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
              console.log("🔍 AuthPage onAuthenticated - fetching profile...");
              const profile = await getCurrentUser();
              console.log("🔍 AuthPage profile loaded:", profile);
              if (profile) {
                setUser(profile);

                // التحقق إذا كان المستخدم جديداً ويحتاج الـ onboarding
                console.log("🔍 AuthPage checking if user needs onboarding...");
                const needsOnboard = await checkOnboardingStatus(
                  profile.id,
                  profile,
                );
                console.log(
                  "🔍 AuthPage onboarding check result:",
                  needsOnboard,
                );
                if (needsOnboard) {
                  console.log(
                    "✅ AuthPage: New user detected, showing onboarding...",
                  );
                  setNeedsOnboarding(true);
                  setIsNewUser(true);
                  setIsGuest(false);
                  localStorage.removeItem("abeely_guest_mode");
                  setAppView("onboarding");
                  return;
                } else {
                  console.log(
                    "⏭️ AuthPage: User does not need onboarding, going to main...",
                  );
                }
              } else {
                console.log("⚠️ AuthPage: No profile found");
              }
              setIsGuest(false);
              localStorage.removeItem("abeely_guest_mode");

              // Check for saved form data and navigate accordingly
              // SECURITY: Check user-specific key first, then generic key (for backward compatibility)
              const userId = profile?.id;
              const userSpecificKey = userId
                ? `abeely_pending_request_form_${userId}`
                : null;
              const genericKey = "abeely_pending_request_form";

              let savedRequestForm: string | null = null;

              // Try user-specific key first
              if (userSpecificKey) {
                savedRequestForm = localStorage.getItem(userSpecificKey);
              }

              // Fallback to generic key if no user-specific data found
              if (!savedRequestForm) {
                savedRequestForm = localStorage.getItem(genericKey);
              }

              // SECURITY: Verify that the draft belongs to the current user
              if (savedRequestForm && userId) {
                try {
                  const formData = JSON.parse(savedRequestForm);
                  // If draft has a userId and it doesn't match current user, ignore it
                  if (formData.userId && formData.userId !== userId) {
                    console.warn(
                      "Security: Draft belongs to different user, ignoring",
                    );
                    savedRequestForm = null;
                    // Clean up the draft that doesn't belong to this user
                    if (userSpecificKey) {
                      localStorage.removeItem(userSpecificKey);
                    }
                    localStorage.removeItem(genericKey);
                  }
                } catch (error) {
                  console.error("Error parsing saved request form:", error);
                  savedRequestForm = null;
                }
              }

              const savedOfferForm = localStorage.getItem(
                "abeely_pending_offer_form",
              );
              const pendingRoute = localStorage.getItem("abeely_pending_route");
              if (pendingRoute) {
                localStorage.removeItem("abeely_pending_route");
              }

              if (savedRequestForm) {
                // Navigate to create request page - data will be restored automatically
                setView("create-request");
                setPreviousView("marketplace");
                setAppView("main");
              } else if (savedOfferForm) {
                // For offers, we need to find the request first
                // The data will be restored when QuickOfferForm is opened
                setView("marketplace");
                setMode("offers");
                setSelectedRequest(null);
                setPreviousView(null);
                setAppView("main");
              } else if (pendingRoute === "create-request") {
                setView("create-request");
                setMode("requests");
                setSelectedRequest(null);
                setPreviousView("marketplace");
                setAppView("main");
              } else {
                // Normal navigation
                setView("marketplace");
                setMode("offers");
                setSelectedRequest(null);
                setPreviousView(null);
                setAppView("main");
              }
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
          setView("marketplace");
          setMode("offers");
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
      {/* Notification Click-Outside Overlay */}
      {isNotifOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setIsNotifOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative md:pr-72">
        <div
          id="main-scroll-container"
          ref={scrollContainerRef}
          className="flex-1 min-h-0 bg-background relative overflow-hidden h-full"
        >
          <LayoutGroup>
            <div className="absolute inset-0 flex flex-col overflow-auto">
              {renderContent()}
            </div>
          </LayoutGroup>
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

      {/* Global Floating Orb - Currently used for navigation, voice input feature may be added later */}
      <GlobalFloatingOrb
        mode={view === "create-request" ? "voice" : "navigate"}
        onNavigate={() => handleNavigate("create-request")}
        onVoiceSend={async (audioBlob) => {
          if (voiceSendHandlerRef.current) {
            await voiceSendHandlerRef.current(audioBlob);
          }
        }}
        processingStatus={voiceProcessingStatus}
        isVisible={false} // Hidden - using header button instead
        hideForScrollButton={isScrollButtonVisible && view === "marketplace"}
        isHeaderCompressed={isMarketplaceHeaderCompressed &&
          view === "marketplace"}
      />

      {/* Interest Toast - Shows when new matching request arrives */}
      <InterestToast
        request={currentToast}
        isVisible={isToastVisible}
        onClose={hideToast}
        onClick={() => {
          if (currentToast) {
            hideToast();
            handleSelectRequest(currentToast);
          }
        }}
      />

      {/* Unarchive Toast - Shows when trying to unhide an archived request */}
      <UnarchiveToast
        isVisible={unarchiveToast.isVisible}
        willBump={unarchiveToast.willBump}
        onConfirm={handleConfirmUnarchive}
        onCancel={handleCancelUnarchive}
      />

      {/* Update Unarchive Notification - Shows when editing unarchives a request */}
      <AnimatePresence>
        {updateUnarchiveNotification.isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-4 right-4 z-[9999] max-w-md mx-auto"
          >
            <div className="rounded-2xl bg-gradient-to-br from-card via-card to-card/95 
                           border border-yellow-500/30 shadow-2xl shadow-yellow-500/10 backdrop-blur-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <AlertCircle size={18} className="text-yellow-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    تم إلغاء أرشفة الطلب تلقائياً
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    الطلب الآن نشط ومرئي في السوق
                  </p>
                </div>
                <button
                  onClick={() =>
                    setUpdateUnarchiveNotification({
                      isVisible: false,
                      requestId: null,
                    })}
                  className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
                >
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
