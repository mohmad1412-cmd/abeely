import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { AlertCircle, Check, X } from "lucide-react";

import { logger } from "./utils/logger.ts";

// Components - Eager loaded (needed immediately)
import {
  BottomNavigation,
  BottomNavTab,
} from "./components/BottomNavigation.tsx";

import { SplashScreen } from "./components/SplashScreen.tsx";
import { AuthPage } from "./components/AuthPage.tsx";

// Components - Lazy loaded (large components, loaded on demand)
const Marketplace = React.lazy(() =>
  import("./components/Marketplace.tsx").then((module) => ({
    default: module.Marketplace,
  }))
);
const RequestDetail = React.lazy(() =>
  import("./components/RequestDetail.tsx").then((module) => ({
    default: module.RequestDetail,
  }))
);
const MyRequests = React.lazy(() =>
  import("./components/MyRequests.tsx").then((module) => ({
    default: module.MyRequests,
  }))
);
const MyOffers = React.lazy(() =>
  import("./components/MyOffers.tsx").then((module) => ({
    default: module.MyOffers,
  }))
);
const Settings = React.lazy(() =>
  import("./components/Settings.tsx").then((module) => ({
    default: module.Settings,
  }))
);
const Profile = React.lazy(() =>
  import("./components/Profile.tsx").then((module) => ({
    default: module.Profile,
  }))
);
const Messages = React.lazy(() =>
  import("./components/Messages.tsx").then((module) => ({
    default: module.Messages,
  }))
);
const CreateRequestV2 = React.lazy(() =>
  import("./components/CreateRequestV2.tsx")
);
import {
  GlobalFloatingOrb,
  VoiceProcessingStatus,
} from "./components/GlobalFloatingOrb.tsx";
import {
  InterestToast,
  useInterestToast,
} from "./components/ui/InterestToast.tsx";
import { UnarchiveToast } from "./components/ui/UnarchiveToast.tsx";
import { ErrorToast, useErrorToast } from "./components/ui/ErrorToast.tsx";
import { notificationSound } from "./services/notificationSoundService.ts";
import { OnboardingScreen } from "./components/OnboardingScreen.tsx";
import { useAuthLogic } from "./hooks/useAuthLogic.ts";
import { completeOnboarding } from "./services/onboardingService.ts";
import { AppView } from "./types.ts";

// Types & Data
import {
  AppMode,
  AppNotification,
  Offer,
  Request,
  RequestInsert,
  Review,
  UserPreferences,
  ViewState,
} from "./types.ts";
import { AVAILABLE_CATEGORIES, MOCK_REVIEWS } from "./data.ts";
import {
  clearAllNotifications,
  getNotifications,
  markNotificationAsRead,
  subscribeToNotifications,
} from "./services/notificationsService.ts";

import {
  getOrCreateConversation,
  getUnreadMessagesForMyOffers,
  getUnreadMessagesForMyRequests,
  getUnreadMessagesPerOffer,
  getUnreadMessagesPerRequest,
  markMessagesAsRead,
  subscribeToConversations,
  subscribeToUnreadCount,
  subscribeToUnreadMessagesForRequestsAndOffers,
} from "./services/messagesService.ts";

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
  fetchOffersForRequest,
  fetchOffersForUserRequests,
  fetchRequestById,
  fetchRequestsPaginated,
  hideRequest,
  migrateUserDraftRequests,
  subscribeToAllNewRequests,
  subscribeToNewRequests,
  subscribeToRequestUpdates,
  unarchiveRequest,
  unhideRequest,
  updateRequest,
} from "./services/requestsService.ts";
import {
  getUnreadInterestsCount,
  getViewedRequestIds,
  subscribeToUnreadInterestsCount,
  subscribeToViewedRequests,
} from "./services/requestViewsService.ts";
import {
  getPreferencesDirect,
  updatePreferencesDirect,
} from "./services/preferencesService.ts";
import { checkAIConnection } from "./services/aiService.ts";
import { supabase } from "./services/supabaseClient.ts";
import {
  getCurrentUser,
  signOut as authSignOut,
  updateProfile,
  UserProfile as _UserProfile,
} from "./services/authService.ts";
import { FullScreenLoading } from "./components/ui/LoadingSkeleton.tsx";
import { ConnectionError } from "./components/ui/ConnectionError.tsx";
import { SwipeBackWrapper } from "./components/ui/SwipeBackWrapper.tsx";
import {
  ParsedRoute,
  parseRoute,
  updateUrl,
} from "./services/routingService.ts";
import { App as CapacitorApp } from "@capacitor/app";
import {
  subscribeToMyOfferStatusChanges,
  subscribeToOffersForMyRequests,
  subscribeToRequestStatusChanges,
} from "./services/realtimeService.ts";

// Auth Views
// AppView moved to types.ts

const App: React.FC = () => {
  // ==========================================
  // Auth State
  // ==========================================
  // ==========================================
  // Auth State & Logic (from useAuthLogic hook)
  // ==========================================
  const {
    appView,
    setAppView,
    user,
    setUser,
    isGuest,
    setIsGuest,
    authLoading: _authLoading,
    connectionError,
    isRetrying,
    isProcessingOAuth: _isProcessingOAuth,
    needsOnboarding: _needsOnboarding,
    setNeedsOnboarding,
    isNewUser: _isNewUser,
    setIsNewUser,
    handleSplashComplete,
    handleConnectionRetry,
    handleGuestModeFromError,
  } = useAuthLogic();

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
    globalThis.dispatchEvent(
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
  // const [profileRole, setProfileRole] = useState<"requester" | "provider">("provider");

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
  const [_unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadMessagesForMyRequests, setUnreadMessagesForMyRequests] =
    useState(0);
  const [unreadMessagesForMyOffers, setUnreadMessagesForMyOffers] = useState(0);
  const [unreadMessagesPerOffer, setUnreadMessagesPerOffer] = useState<
    Map<string, number>
  >(new Map());
  const [unreadMessagesPerRequest, setUnreadMessagesPerRequest] = useState<
    Map<string, number>
  >(new Map());
  const [requestsWithNewOffers, setRequestsWithNewOffers] = useState<
    Set<string>
  >(
    new Set(),
  );
  const [_connectionStatus, setConnectionStatus] = useState<
    {
      supabase: { connected: boolean; error?: string };
      ai: { connected: boolean; error?: string };
    } | null
  >(null);

  // Unify userInterests with userPreferences.interestedCategories to prevent desync
  const userInterests = userPreferences.interestedCategories;

  // ==========================================
  // AppNotification & Review State
  // ==========================================
  const [notifications, setAppNotifications] = useState<AppNotification[]>([]);
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
  const [initialActiveOfferId, setInitialActiveOfferId] = useState<
    string | null
  >(null); // فتح popup المحادثة مباشرة للعرض المحدد
  const [viewingProfileUserId, setViewingProfileUserId] = useState<
    string | null
  >(null); // معرف المستخدم المراد عرض ملفه الشخصي (null = الملف الشخصي الحالي)

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

  // ==========================================
  // Error Toast for Error Messages
  // ==========================================
  const {
    currentMessage: errorMessage,
    isVisible: isErrorToastVisible,
    showToast: showErrorToast,
    hideToast: hideErrorToast,
  } = useErrorToast();
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

  // Update Unarchive AppNotification State (for when editing unarchives a request)
  // ==========================================
  const [updateUnarchiveAppNotification, setUpdateUnarchiveAppNotification] =
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
  // Separate scroll positions for Marketplace "All" and "Interests" modes
  const [marketplaceAllScrollPos, setMarketplaceAllScrollPos] = useState(() => {
    const saved = localStorage.getItem("abeely_marketplace_all_scroll");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [marketplaceInterestsScrollPos, setMarketplaceInterestsScrollPos] =
    useState(() => {
      const saved = localStorage.getItem("abeely_marketplace_interests_scroll");
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
  const _notifRef = useRef<HTMLDivElement>(null);

  // --- Optimization: Memoized Filtered Data ---
  const myRequestIds = useMemo(() => new Set(myRequests.map((r) => r.id)), [
    myRequests,
  ]);

  const myOfferRequestIds = useMemo(() => {
    return new Set(
      myOffers
        .filter((offer) => offer.status !== "rejected")
        .map((offer) => offer.requestId),
    );
  }, [myOffers]);

  const filteredAllRequests = useMemo(() => {
    return allRequests.filter((req) => {
      if (req.isPublic === false) return false;
      if (user?.id) {
        if (myRequestIds.has(req.id)) return false;
        if (req.author && req.author === user.id) return false;
        if (myOfferRequestIds.has(req.id)) return false;
      }
      return true;
    });
  }, [allRequests, user?.id, myRequestIds, myOfferRequestIds]);

  const enrichedRequest = useMemo(() => {
    if (!selectedRequest) return null;
    return {
      ...selectedRequest,
      offers: (receivedOffersMap.get(selectedRequest.id) ||
        selectedRequest.offers || []),
    };
  }, [selectedRequest, receivedOffersMap]);

  // --- Optimization: Stable Keys for Subscriptions ---
  // Create stable string keys for IDs to prevent unnecessary re-subscriptions
  // when other properties of requests/offers change (like status)
  const myRequestIdsKey = useMemo(() => {
    return myRequests.map((r) => r.id).sort().join(",");
  }, [myRequests]);

  const myOfferIdsKey = useMemo(() => {
    return myOffers.map((o) => o.id).sort().join(",");
  }, [myOffers]);
  // --------------------------------------------------
  // --------------------------------------------

  // Save to localStorage whenever scroll positions change
  useEffect(() => {
    localStorage.setItem(
      "abeely_marketplace_all_scroll",
      marketplaceAllScrollPos.toString(),
    );
  }, [marketplaceAllScrollPos]);

  useEffect(() => {
    localStorage.setItem(
      "abeely_marketplace_interests_scroll",
      marketplaceInterestsScrollPos.toString(),
    );
  }, [marketplaceInterestsScrollPos]);

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
      attachments: unknown[];
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

  // ==========================================
  // Deep Link Handler Definition
  // ==========================================
  const handleDeepLink = (url: string) => {
    logger.info("Handling deep link:", url, "App");
    const route = parseRoute(url);
    handleRouteNavigation(route);
  };

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
        if (
          typeof window !== "undefined" &&
          (window as unknown as { Capacitor: unknown }).Capacitor
        ) {
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
        logger.error("Error handling deep link", err, "App");
      }
    };

    const handleDeepLink = (url: string) => {
      try {
        // تحليل URL وتحويله لـ route بدون تعديل window.location
        const route = parseRoute(url);

        handleRouteNavigation(route);
      } catch (err) {
        logger.error("Error parsing deep link", err, "App");
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

    globalThis.addEventListener("popstate", handlePopState);

    handleInitialUrl();

    return () => {
      globalThis.removeEventListener("popstate", handlePopState);
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
        const { data: firstPage, count: _totalCount } =
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
        logger.error("Error loading public data:", error, "App");
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

  // Track if we've already set the initial home page (to prevent resetting on preferences update)
  const hasSetInitialHomePage = useRef(false);

  // State for default offer filter (used when opening my-offers page)
  const [defaultOfferFilter, setDefaultOfferFilter] = useState<
    "all" | "accepted" | "pending" | "completed" | undefined
  >(undefined);

  // Apply home page preference when entering main view
  useEffect(() => {
    if (
      appView === "main" && !hasSetInitialHomePage.current &&
      userPreferences.homePage
    ) {
      const homePage = userPreferences.homePage;

      // Only apply if current view is still the default (marketplace)
      if (view === "marketplace") {
        hasSetInitialHomePage.current = true;

        // Parse home page config and apply settings
        if (homePage.startsWith("marketplace:")) {
          const [, viewMode] = homePage.split(":");
          setView("marketplace");
          setMode("offers");
          setActiveBottomTab("marketplace");
          if (viewMode === "interests") {
            setCurrentMarketplaceViewMode("interests");
          } else {
            setCurrentMarketplaceViewMode("all");
          }
        } else if (homePage.startsWith("my-requests:")) {
          const [, filter] = homePage.split(":");
          setView("dashboard");
          setMode("requests");
          setActiveBottomTab("my-requests");
          // Set filter for my requests
          if (
            filter === "all" || filter === "active" || filter === "approved" ||
            filter === "completed"
          ) {
            setMyRequestsFilter(
              filter as "all" | "active" | "approved" | "completed",
            );
          }
        } else if (homePage.startsWith("my-offers:")) {
          const [, filter] = homePage.split(":");
          setView("dashboard");
          setMode("offers");
          setActiveBottomTab("my-offers");
          // Set default filter for offers
          if (
            filter === "all" || filter === "accepted" || filter === "pending" ||
            filter === "completed"
          ) {
            setDefaultOfferFilter(
              filter as "all" | "accepted" | "pending" | "completed",
            );
            // Reset filter after component applies it (one-time use)
            setTimeout(() => setDefaultOfferFilter(undefined), 500);
          } else {
            setDefaultOfferFilter("all");
            setTimeout(() => setDefaultOfferFilter(undefined), 500);
          }
        }
      }
    }
  }, [appView, userPreferences.homePage, view]);

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
        homePage: undefined,
      });
      hasSetInitialHomePage.current = false;
      return;
    }

    let isMounted = true;

    // Load preferences from backend to populate interests filters
    const loadPreferences = async () => {
      try {
        const prefs = await getPreferencesDirect(user.id);
        if (prefs && isMounted) {
          // تحويل "جميع المدن (شامل عن بعد)" إلى "كل المدن" لتوحيد الاسم
          // (getPreferencesDirect يفعل ذلك بالفعل، لكن للتأكد نفعله هنا أيضاً)
          const normalizedCities = prefs.interestedCities.map((city: string) =>
            city === "جميع المدن (شامل عن بعد)" ? "كل المدن" : city
          );
          setUserPreferences({
            ...prefs,
            interestedCities: normalizedCities,
          });
        }
      } catch (error) {
        logger.error("Error loading user preferences:", error, "App");
      }
    };

    if (isMounted) {
      loadPreferences();
    }

    const loadUserData = async () => {
      try {
        // ترقية الطلبات القديمة من "مسودة" إلى "نشط" (مرة واحدة لكل مستخدم)
        setIsLoadingMyOffers(true);
        // Parallelize EVERYTHING including migration
        await Promise.all([
          migrateUserDraftRequests(user.id),
          fetchMyRequests(user.id).then((reqs) => {
            if (isMounted) {
              setMyRequests(reqs.filter((r) => r.status !== "archived"));
            }
          }),
          fetchMyOffers(user.id).then((offers) => {
            if (isMounted) {
              setMyOffers(offers);
              setIsLoadingMyOffers(false);
            }
          }),
          fetchOffersForUserRequests(user.id).then((data) => {
            if (isMounted) setReceivedOffersMap(data);
          }),
          fetchArchivedRequests(user.id).then((data) => {
            if (isMounted) setArchivedRequests(data);
          }),
        ]);
      } catch (error) {
        logger.error("Error loading user data:", error, "App");
        if (isMounted) setIsLoadingMyOffers(false);
      }
    };

    if (isMounted) {
      loadUserData();
    }

    return () => {
      isMounted = false;
    };
    // ملاحظة: أزلنا appView من dependencies لأن بيانات المستخدم
    // لا تحتاج إعادة تحميل عند كل انتقال بين الصفحات (تحسين الأداء)
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
        logger.error("Error loading viewed requests:", error, "App");
      } finally {
        setIsLoadingViewedRequests(false);
      }
    };
    loadViewedRequests();

    // Subscribe to real-time updates for viewedRequestIds
    const unsubscribe = subscribeToViewedRequests(user.id, (ids) => {
      setViewedRequestIds(ids);
      // لا نغير isLoadingViewedRequests هنا لأن الـ subscription قد يحدث بعد التحميل الأولي
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, isGuest]);

  // ==========================================
  // Subscribe to unread interests count changes via realtime
  // ==========================================
  useEffect(() => {
    // استخدام appViewRef بدلاً من appView لتجنب إعادة إنشاء الـ subscription
    // عند كل تغيير في appView (تحسين الأداء)
    if (!user?.id || isGuest) {
      return;
    }

    // Subscribe to real-time updates for unreadInterestsCount
    // This ensures badges disappear immediately when a request is marked as read
    const unsubscribe = subscribeToUnreadInterestsCount(user.id, (count) => {
      // التحقق من أننا في main view قبل التحديث
      if (appViewRef.current === "main") {
        setUnreadInterestsCount(count);
        // Realtime update received (logging disabled for production)
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, isGuest]);

  // ==========================================
  // Reload unreadInterestsCount when app comes back from background
  // ==========================================
  useEffect(() => {
    if (!user?.id || isGuest || appView !== "main") {
      return;
    }

    const handleVisibilityChange = async () => {
      // When app becomes visible again (user comes back from background or refresh)
      if (document.visibilityState === "visible") {
        try {
          const count = await getUnreadInterestsCount();
          setUnreadInterestsCount(count);
        } catch (error) {
          logger.error(
            "Error reloading unread interests count on visibility change:",
            error,
            "App",
          );
        }
      }
    };

    // Also reload on window focus (for browser tabs)
    const handleFocus = async () => {
      try {
        const count = await getUnreadInterestsCount();
        setUnreadInterestsCount(count);
      } catch (error) {
        logger.error(
          "Error reloading unread interests count on focus:",
          error,
          "App",
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    globalThis.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      globalThis.removeEventListener("focus", handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        } catch (error: unknown) {
          logger.error("❌ Error reloading marketplace data:", error, "App");
          const errorMessage = (error as { message?: string })?.message ||
            String(error);

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

          logger.error("Setting load error:", userFriendlyMessage, "App");
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
    const maxRetries = 60; // Max 5 minutes (60 * 5s)
    let retryCount = 0;
    const checkAndReload = async () => {
      if (retryCount >= maxRetries) {
        clearInterval(_intervalId);
        return;
      }

      retryCount++;
      // Checking connection...

      try {
        const status = await checkSupabaseConnection();

        if (status.connected) {
          // Connection restored! Reloading data...
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
              clearInterval(_intervalId);
              // Data loaded successfully!
            }
          } catch (loadError) {
            logger.error(
              "[Auto-Retry] Failed to load data after connection restored:",
              loadError,
              "App",
            );
          } finally {
            setIsLoadingData(false);
            loadingRef.current = false;
          }
        } else {
          // Still disconnected
        }
      } catch (_err) {
        // console.log("[Auto-Retry] Connection check failed:", _err);
      }
    };

    // Start checking every 5 seconds
    const _intervalId = setInterval(checkAndReload, 5000);

    // Also check immediately
    checkAndReload();

    return () => {
      clearInterval(_intervalId);
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
  // Load AppNotifications from Supabase
  // ==========================================
  useEffect(() => {
    if (appView !== "main" || !user?.id) return;

    const loadAppNotifications = async () => {
      try {
        const notifs = await getNotifications(50);
        setAppNotifications(notifs);
      } catch (error) {
        logger.error("Error loading notifications:", error, "App");
      }
    };

    loadAppNotifications();

    // Subscribe to new notifications
    const unsubscribe = subscribeToNotifications(user.id, (newNotif) => {
      setAppNotifications((prev) => [newNotif, ...prev]);
    });

    // Subscribe to unread messages count
    const unsubscribeMessages = subscribeToUnreadCount(user.id, (count) => {
      setUnreadMessagesCount(count);
      setHasUnreadMessages(count > 0);
    });

    // Subscribe to conversation updates to trigger count recalculation instantly
    const unsubscribeConversationUpdates = subscribeToConversations(
      user.id,
      () => {
        // Trigger a recalculation when any conversation changes
        globalThis.dispatchEvent(new CustomEvent("refresh-unread-counts"));
      },
    );

    return () => {
      unsubscribe();
      unsubscribeMessages();
      unsubscribeConversationUpdates();
      setUnreadMessagesCount(0);
      setHasUnreadMessages(false);
    };
  }, [appView, user?.id]);

  // ==========================================
  // Calculate unread messages for My Requests and My Offers separately - تحديث فوري
  // ==========================================
  useEffect(() => {
    if (appView !== "main" || !user?.id) {
      setUnreadMessagesForMyRequests(0);
      setUnreadMessagesForMyOffers(0);
      return;
    }

    const requestIds = myRequests.map((r) => r.id);
    const offerIds = myOffers.map((o) => o.id);

    // اشتراك فوري - أي تغيير في الرسائل يحدث تحديث فوري للـ badges
    const unsubscribe = subscribeToUnreadMessagesForRequestsAndOffers(
      user.id,
      requestIds,
      offerIds,
      (
        {
          unreadForRequests,
          unreadForOffers,
          unreadPerRequest,
          unreadPerOffer,
        },
      ) => {
        // تحديث فوري - بدون تأخير
        setUnreadMessagesForMyRequests(unreadForRequests);
        setUnreadMessagesForMyOffers(unreadForOffers);
        setUnreadMessagesPerRequest(unreadPerRequest);
        setUnreadMessagesPerOffer(unreadPerOffer);
      },
    );

    // Setup listeners for instant recalculation (backup)
    const handleRefresh = () => {
      // إعادة حساب فوري عند الطلب
      Promise.all([
        requestIds.length > 0
          ? getUnreadMessagesForMyRequests(requestIds)
          : Promise.resolve(0),
        offerIds.length > 0
          ? getUnreadMessagesForMyOffers(offerIds)
          : Promise.resolve(0),
        requestIds.length > 0
          ? getUnreadMessagesPerRequest(requestIds)
          : Promise.resolve(new Map()),
        offerIds.length > 0
          ? getUnreadMessagesPerOffer(offerIds)
          : Promise.resolve(new Map()),
      ]).then(([requestsCount, offersCount, perRequestMap, perOfferMap]) => {
        setUnreadMessagesForMyRequests(requestsCount);
        setUnreadMessagesForMyOffers(offersCount);
        setUnreadMessagesPerRequest(perRequestMap);
        setUnreadMessagesPerOffer(perOfferMap);
      });
    };
    globalThis.addEventListener("refresh-unread-counts", handleRefresh);

    return () => {
      unsubscribe();
      globalThis.removeEventListener("refresh-unread-counts", handleRefresh);
      setUnreadMessagesForMyRequests(0);
      setUnreadMessagesForMyOffers(0);
      setUnreadMessagesPerOffer(new Map());
      setUnreadMessagesPerRequest(new Map());
    };
  }, [appView, user?.id, myRequests, myOffers]);

  // ==========================================
  // REALTIME: Subscribe to new offers on my requests
  // ==========================================
  useEffect(() => {
    if (appView !== "main" || !user?.id) return;

    if (!myRequestIdsKey) return;
    const requestIds = myRequestIdsKey.split(",");

    if (
      requestIds.length === 0 ||
      (requestIds.length === 1 && requestIds[0] === "")
    ) return;

    // Subscribe to new offers on my requests
    const unsubscribeOffers = subscribeToOffersForMyRequests(
      requestIds,
      (newOffer, requestId) => {
        setReceivedOffersMap((prev) => {
          const existingOffers = prev.get(requestId) || [];
          if (existingOffers.some((o) => o.id === newOffer.id)) {
            return prev;
          }
          const newMap = new Map(prev);
          // Create offer with correct TypeScript field names
          const formattedOffer: Offer = {
            id: newOffer.id,
            requestId: newOffer.request_id,
            providerId: newOffer.provider_id,
            providerName: newOffer.provider_name || "مزود خدمة",
            title: newOffer.title || "عرض جديد",
            description: "", // Will be fetched when viewing
            price: newOffer.price || "",
            deliveryTime: "", // Will be fetched when viewing
            status: newOffer.status as Offer["status"],
            createdAt: new Date(newOffer.created_at),
            isNegotiable: true,
          };
          newMap.set(requestId, [...existingOffers, formattedOffer]);
          return newMap;
        });

        // Play notification sound
        notificationSound.notify();
      },
      // onOfferUpdate - تحديث حالة العرض
      (updatedOffer, requestId) => {
        setReceivedOffersMap((prev) => {
          const existingOffers = prev.get(requestId) || [];
          const updated = existingOffers.map((o) =>
            o.id === updatedOffer.id
              ? { ...o, status: updatedOffer.status as Offer["status"] }
              : o
          );

          // Check if anything actually changed
          const isSame = existingOffers.every((o, i) =>
            o.status === updated[i].status
          );
          if (isSame) return prev;

          const newMap = new Map(prev);
          newMap.set(requestId, updated);
          return newMap;
        });
      },
      // onOfferDelete - حذف العرض
      (offerId, requestId) => {
        setReceivedOffersMap((prev) => {
          const existingOffers = prev.get(requestId) || [];
          const filtered = existingOffers.filter((o) => o.id !== offerId);

          if (filtered.length === existingOffers.length) return prev;

          const newMap = new Map(prev);
          newMap.set(requestId, filtered);
          return newMap;
        });
      },
    );

    return () => {
      unsubscribeOffers();
    };
  }, [appView, user?.id, myRequestIdsKey]);

  // ==========================================
  // REALTIME: Subscribe to my offer status changes (for providers)
  // ==========================================
  useEffect(() => {
    if (appView !== "main" || !user?.id) return;

    if (!myOfferIdsKey) return;
    const offerIds = myOfferIdsKey.split(",");

    if (
      offerIds.length === 0 || (offerIds.length === 1 && offerIds[0] === "")
    ) return;

    // Subscribe to status changes on my offers
    const unsubscribeMyOfferStatus = subscribeToMyOfferStatusChanges(
      offerIds,
      (updatedOffer) => {
        // Update myOffers with the new status
        setMyOffers((prev) =>
          prev.map((o) =>
            o.id === updatedOffer.id
              ? { ...o, status: updatedOffer.status as Offer["status"] }
              : o
          )
        );

        // Play notification sound for accepted offers
        if (updatedOffer.status === "accepted") {
          notificationSound.notify();
        }
      },
    );

    return () => {
      unsubscribeMyOfferStatus();
    };
  }, [appView, user?.id, myOfferIdsKey]);

  // ==========================================
  // REALTIME: Subscribe to request status changes (active → assigned → completed)
  // ==========================================
  useEffect(() => {
    if (appView !== "main" || !user?.id) return;

    if (!myRequestIdsKey) return;
    const requestIds = myRequestIdsKey.split(",");

    if (
      requestIds.length === 0 ||
      (requestIds.length === 1 && requestIds[0] === "")
    ) return;

    logger.log(
      "Subscribing to request status changes for:",
      requestIds.length,
      "requests",
    );

    // Subscribe to status changes on my requests
    const unsubscribeRequestStatus = subscribeToRequestStatusChanges(
      requestIds,
      (updatedRequest) => {
        logger.log(
          "🔔 Request status changed:",
          updatedRequest.id,
          updatedRequest.status,
        );

        // Update myRequests with the new status
        setMyRequests((prev) =>
          prev.map((r) =>
            r.id === updatedRequest.id
              ? {
                ...r,
                status: updatedRequest.status as Request["status"],
                acceptedOfferId: updatedRequest.accepted_offer_id ||
                  r.acceptedOfferId,
              }
              : r
          )
        );

        // Also update in interestsRequests if it exists there
        setInterestsRequests((prev) =>
          prev.map((r) =>
            r.id === updatedRequest.id
              ? { ...r, status: updatedRequest.status as Request["status"] }
              : r
          )
        );

        // Play notification sound for important status changes
        if (
          updatedRequest.status === "assigned" ||
          updatedRequest.status === "completed"
        ) {
          notificationSound.notify();
        }
      },
    );

    return () => {
      logger.log("Unsubscribing from request status changes");
      unsubscribeRequestStatus();
    };
  }, [appView, user?.id, myRequestIdsKey]);

  // ==========================================
  // Auto-mark notifications as read when viewing My Requests page with received offers
  // ==========================================
  useEffect(() => {
    if (appView !== "main" || !user?.id || view !== "my-requests") return;
    if (receivedOffersMap.size === 0) return;

    // Get all request IDs that have received offers
    const requestIdsWithOffers = Array.from(receivedOffersMap.keys());

    // Mark notifications related to these requests as read
    const markAppNotificationsAsRead = async () => {
      const notificationsToMark = notifications.filter((n) =>
        !n.isRead &&
        n.type === "offer" &&
        n.relatedRequest &&
        requestIdsWithOffers.includes(n.relatedRequest.id)
      );

      if (notificationsToMark.length > 0) {
        for (const notif of notificationsToMark) {
          await markNotificationAsRead(notif.id);
          setAppNotifications((prev) =>
            prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
          );
        }
      }
    };

    // Delay slightly to ensure page is fully loaded
    const timeoutId = setTimeout(markAppNotificationsAsRead, 500);

    return () => clearTimeout(timeoutId);
  }, [appView, user?.id, view, receivedOffersMap, notifications]);

  // ==========================================
  // Auto-mark notifications as read when opening My Requests tab
  // ==========================================
  useEffect(() => {
    if (appView !== "main" || !user?.id || activeBottomTab !== "my-requests") {
      return;
    }
    if (myRequests.length === 0) return;

    // Use top-level memoized myRequestIds

    // Mark all notifications related to my requests as read
    const markAppNotificationsAsRead = async () => {
      const notificationsToMark = notifications.filter((n) =>
        !n.isRead &&
        n.relatedRequest &&
        myRequestIds.has(n.relatedRequest.id)
      );

      if (notificationsToMark.length > 0) {
        for (const notif of notificationsToMark) {
          await markNotificationAsRead(notif.id);
          setAppNotifications((prev) =>
            prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
          );
        }
      }
    };

    // Delay slightly to ensure page is fully loaded
    const timeoutId = setTimeout(markAppNotificationsAsRead, 500);

    return () => clearTimeout(timeoutId);
  }, [appView, user?.id, activeBottomTab, myRequests, notifications]);

  // ==========================================
  // Fetch and refresh received offers when opening My Requests page
  // ==========================================
  useEffect(() => {
    if (appView !== "main" || !user?.id || view !== "my-requests") return;

    // جلب العروض المستلمة عند فتح الصفحة
    const fetchOffers = async () => {
      try {
        const offers = await fetchOffersForUserRequests(user.id);
        setReceivedOffersMap(offers);
      } catch (error) {
        logger.error("Error fetching received offers:", error, "App");
      }
    };

    // جلب فوري
    fetchOffers();

    // تحديث دوري كل 60 ثانية لضمان ظهور العروض الجديدة (failsafe)
    // Realtime subscriptions handle immediate updates
    const intervalId = setInterval(fetchOffers, 60000);

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
      logger.error("Error loading more requests:", e, "App");
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
          // Use top-level memoized myRequestIds
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
              if (myRequestIds.has(req.id)) {
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
            const catMatch = (req.categories || []).some((catLabel) => {
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
                  const requestLocation = (req.location!).toLowerCase();

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
            const radarMatch = radarWords.some((word) => {
              const searchText = `${req.title} ${req.description || ""}`
                .toLowerCase();
              return searchText.includes(word.toLowerCase());
            });

            // Final flexible matching:
            // 1. If categories AND radar words are set: match EITHER (flexible)
            // 2. If only one is set: match that one
            // 3. If neither: match everything in city
            const hasCatSelection = activeCategories.length > 0;
            const hasRadarSelection = radarWords.length > 0;

            let interestMatch = false;
            if (!hasCatSelection && !hasRadarSelection) {
              interestMatch = true;
            } else {
              interestMatch = (hasCatSelection && catMatch) ||
                (hasRadarSelection && radarMatch);
            }

            return interestMatch && cityMatch;
          });

          setInterestsRequests(filtered);
          const count = await getUnreadInterestsCount();
          setUnreadInterestsCount(count);
        } else {
          setInterestsRequests([]);
          setUnreadInterestsCount(0);
        }
      } catch (error) {
        logger.error("Error loading interests data:", error, "App");
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
      (newRequest) => {
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
          // console.log("🎯 طلب جديد يطابق اهتماماتك:", newRequest.title);

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
      (newRequest) => {
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

    // Subscribe to request visibility updates (hide/show)
    const unsubscribeUpdates = subscribeToRequestUpdates(
      // onHide - إزالة الطلب من القائمة عند الإخفاء
      (requestId) => {
        setAllRequests((prev) => prev.filter((r) => r.id !== requestId));
        // أيضاً تحديث interestsRequests
        setInterestsRequests((prev) => prev.filter((r) => r.id !== requestId));
      },
      // onShow - إضافة الطلب للقائمة عند الإظهار
      (request) => {
        setAllRequests((prev) => {
          if (prev.some((r) => r.id === request.id)) return prev;
          return [request, ...prev];
        });
      },
    );

    return () => {
      unsubscribe();
      unsubscribeUpdates();
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
        // Save scroll for the currently active marketplace view mode
        if (currentMarketplaceViewMode === "interests") {
          setMarketplaceInterestsScrollPos(currentScroll);
        } else {
          setMarketplaceAllScrollPos(currentScroll);
        }
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

  // Handle tab change from sidebar navigation
  const handleTabChange = (tab: BottomNavTab) => {
    setActiveBottomTab(tab);

    // If we're in create-request or request-detail, navigate to the appropriate view
    if (view === "create-request" || view === "request-detail") {
      switch (tab) {
        case "marketplace":
          handleNavigate("marketplace");
          break;
        case "my-requests":
          handleNavigate("marketplace");
          // The marketplace view will show my-requests based on activeBottomTab
          break;
        case "my-offers":
          handleNavigate("marketplace");
          // The marketplace view will show my-offers based on activeBottomTab
          break;
        case "create":
          // Already in create-request, no need to navigate
          break;
        case "profile":
          handleNavigate("profile");
          break;
        case "messages":
          handleNavigate("messages");
          break;
      }
    }
  };

  const handleNavigate = (
    newView:
      | ViewState
      | "requests-mode"
      | "offers-mode"
      | "sidebar-requests-mode"
      | "sidebar-offers-mode",
  ) => {
    // Auto-switch mode if needed based on view to keep state consistent
    if (newView === "marketplace") {
      // In marketplace, mode depends on which tab is active (requests tab = requests mode, etc)
      // but usually defaults to current mode. We only force if needed.
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
    if (view !== "request-detail") {
      // Saving previousView/tab for navigation history
      setPreviousView(view);
      setPreviousBottomTab(activeBottomTab);
    } else {
      // Already in request-detail
    }
    setSelectedRequest(req);

    // Set appropriate mode based on authorship
    const isAuthor = user?.id && req.author === user.id;
    if (isAuthor) {
      if (mode !== "requests") setMode("requests");
    } else {
      if (mode !== "offers") setMode("offers");
    }

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

    // إزالة badge اهتماماتي فوراً إذا كان الطلب من اهتماماتي
    if (interestsRequests.some((r) => r.id === req.id)) {
      setUnreadInterestsCount((prev) => Math.max(0, prev - 1));
    }

    // إزالة badge العروض الجديدة فوراً إذا كان الطلب في قائمة العروض الجديدة
    setRequestsWithNewOffers((prev) => {
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
    setAppNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  // معالجة النقر على إشعار للتنقل للعرض/الطلب
  const handleNotificationClick = async (notification: AppNotification) => {
    // تأكد من تحديث الإشعار كمقروء عند النقر عليه
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

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
      switch (notification.type) {
        case "offer_accepted": {
          // ... (similar logic)
          const requestId = notification.relatedRequest?.id;
          if (requestId) {
            handleDeepLink(`/request/${requestId}`);
          }
          break;
        }
        case "view_request": {
          const requestId = notification.relatedRequest?.id ||
            notification.linkTo?.split("/").pop();
          if (requestId) {
            handleDeepLink(`/request/${requestId}`);
          }
          break;
        }
        case "system": {
          if (notification.linkTo) {
            handleDeepLink(notification.linkTo);
          }
          break;
        }
        case "view_offer": {
          const requestId = notification.relatedRequest?.id;
          const offerId = notification.relatedOffer?.id;
          if (requestId && offerId) {
            handleDeepLink(`/request/${requestId}?offerId=${offerId}`);
          } else if (notification.linkTo) {
            handleDeepLink(notification.linkTo);
          }
          break;
        }
        case "negotiation": {
          const requestId = notification.relatedRequest?.id;
          const offerId = notification.relatedOffer?.id;
          if (requestId) {
            // الانتقال للتفاوض
            handleDeepLink(`/request/${requestId}?offerId=${offerId}`);
          }
          break;
        }
        // @ts-ignore: AppNotification type literal mismatch
        case "message": {
          const relatedJobId = notification.relatedRequest?.id; // Standardize on relatedRequest.id
          const _senderName = notification.relatedMessage?.senderName || "User";

          if (relatedJobId) {
            handleDeepLink(`/request/${relatedJobId}`);
          }
          break;
        }
      }
    }
  };

  const handleRequestViewed = useCallback(async (_requestId: string) => {
    // Update unread interests count immediately after marking request as viewed
    // This ensures badges disappear even when opening requests from outside interests page
    if (user?.id && !isGuest) {
      // Optimistically decrement count immediately for instant UI feedback
      setUnreadInterestsCount((prev) => Math.max(0, prev - 1));
      try {
        // Small delay to ensure database update is complete
        await new Promise((resolve) => setTimeout(resolve, 100));
        const count = await getUnreadInterestsCount();
        setUnreadInterestsCount(count);
      } catch (error) {
        logger.error(
          "Error reloading unread interests count after view:",
          error,
          "App",
        );
        // Keep optimistic update if database call fails
      }
    }
  }, [user?.id, isGuest]);

  const handleRequestRead = useCallback(async (_requestId: string) => {
    // Reload unread count from database to ensure sync
    // The count is based on is_read in database, not local state
    if (user?.id && !isGuest) {
      try {
        const count = await getUnreadInterestsCount();
        setUnreadInterestsCount(count);
      } catch (error) {
        logger.error("Error reloading unread interests count:", error, "App");
        // Fallback: decrement locally if database call fails
        setUnreadInterestsCount((prev) => Math.max(0, prev - 1));
      }
    }
  }, [user?.id, isGuest]);

  const handleClearAppNotifications = async () => {
    await clearAllNotifications();
    setAppNotifications([]);
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

        // إعادة تحميل unreadInterestsCount من قاعدة البيانات بعد التحديث
        try {
          const count = await getUnreadInterestsCount();
          setUnreadInterestsCount(count);
        } catch (error) {
          logger.error(
            "Error reloading unread interests count after refresh:",
            error,
            "App",
          );
        }
      }
    } catch (error) {
      logger.error("Error reloading data:", error, "App");
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
        // إزالة الطلب من allRequests و interestsRequests مباشرة
        setAllRequests((prev) => prev.filter((r) => r.id !== requestId));
        setInterestsRequests((prev) => prev.filter((r) => r.id !== requestId));
        // تحديث myRequests - إزالة الطلب المؤرشف
        setMyRequests((prev) => prev.filter((r) => r.id !== requestId));
        // تحديث selectedRequest إذا كان نفس الطلب
        setSelectedRequest((prev) =>
          prev && prev.id === requestId ? null : prev
        );
        // إعادة تحميل البيانات للتأكد من التزامن
        await reloadData();
      }
      return success;
    } catch (error) {
      logger.error("Error archiving request:", error, "App");
      return false;
    }
  };

  const _handleUnarchiveRequest = async (requestId: string) => {
    if (!user?.id) return;

    try {
      const success = await unarchiveRequest(requestId, user.id);
      if (success) {
        await reloadData();
      }
    } catch (error) {
      logger.error("Error unarchiving request:", error, "App");
    }
  };

  const handleArchiveOffer = async (offerId: string): Promise<boolean> => {
    if (!user?.id) {
      logger.error("❌ No user ID", undefined, "App");
      return false;
    }

    // console.log("🗑️ handleArchiveOffer called", { offerId, userId: user.id });

    try {
      const success = await archiveOffer(offerId, user.id);
      // console.log("📊 archiveOffer result:", success);

      if (success) {
        // Remove the offer from local state immediately for better UX
        setMyOffers((prev) => {
          const filtered = prev.filter((o) => o.id !== offerId);
          /* console.log("📝 Updated myOffers:", {
            before: prev.length,
            after: filtered.length,
          }); */
          return filtered;
        });
        // Offer deleted successfully

        // Background sync without blocking - don't await
        reloadData().catch((err) =>
          logger.error("Background sync error", err, "App")
        );
        return true;
      } else {
        logger.error("❌ Failed to delete offer", undefined, "App");
        showErrorToast("فشل حذف العرض. يرجى المحاولة مرة أخرى.");
        return false;
      }
    } catch (error) {
      logger.error("❌ Error archiving offer:", error, "App");
      showErrorToast("حدث خطأ أثناء حذف العرض. يرجى المحاولة مرة أخرى.");
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
        // تحديث myRequests
        setMyRequests((prev) =>
          prev.map((r) => r.id === requestId ? { ...r, isPublic: false } : r)
        );
        // إزالة الطلب المخفي من allRequests مباشرة
        setAllRequests((prev) => prev.filter((r) => r.id !== requestId));
        // إزالة الطلب المخفي من interestsRequests أيضاً
        setInterestsRequests((prev) => prev.filter((r) => r.id !== requestId));
        // تحديث selectedRequest أيضاً إذا كان نفس الطلب
        setSelectedRequest((prev) =>
          prev && prev.id === requestId ? { ...prev, isPublic: false } : prev
        );
        // إعادة تحميل البيانات للتأكد من التزامن
        setTimeout(() => {
          reloadData().catch((err) =>
            logger.error("Background sync error after hide", err, "App")
          );
        }, 300);
      }
      return success;
    } catch (error) {
      logger.error("Error hiding request:", error, "App");
      return false;
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
        // تحديث selectedRequest أيضاً إذا كان نفس الطلب
        setSelectedRequest((prev) =>
          prev && prev.id === requestId ? { ...prev, isPublic: true } : prev
        );
        // إعادة تحميل البيانات للتأكد من التزامن
        setTimeout(() => {
          reloadData().catch((err) =>
            logger.error("Background sync error after unhide", err, "App")
          );
        }, 300);
      }
    } catch (error) {
      logger.error("Error unhiding request:", error, "App");
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
        logger.error("Failed to unarchive request", undefined, "App");
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
        logger.error("Failed to unhide request", undefined, "App");
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
        // تحديد الـ status الصحيح: إذا كان للطلب عرض معتمد، يكون assigned وإلا active
        const correctStatus = requestToUnarchive.acceptedOfferId
          ? "assigned" as const
          : "active" as const;

        setArchivedRequests((prev) => prev.filter((r) => r.id !== requestId));
        setMyRequests((prev) => {
          const unarchivedRequest = {
            ...requestToUnarchive,
            status: correctStatus,
            isPublic: true,
            updatedAt: willBump ? new Date() : requestToUnarchive.updatedAt,
          };
          return [...prev, unarchivedRequest];
        });
        setAllRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? { ...r, status: correctStatus, isPublic: true }
              : r
          )
        );
      }

      // إخفاء التنبيه
      setUnarchiveToast({ isVisible: false, requestId: null, willBump: false });
    } catch (error) {
      logger.error("Error confirming unarchive:", error, "App");
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
        // تحديث interestsRequests أيضاً
        setInterestsRequests((prev) =>
          prev.map((r) => r.id === requestId ? { ...r, updatedAt: now } : r)
        );
        // تحديث selectedRequest أيضاً إذا كان نفس الطلب
        setSelectedRequest((prev) =>
          prev && prev.id === requestId ? { ...prev, updatedAt: now } : prev
        );
      }
      return success;
    } catch (error) {
      logger.error("Error bumping request:", error, "App");
      return false;
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
    setAppNotifications([]);
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
      if (!user?.id) return;

      // تحديث التفضيلات المحلية
      setUserPreferences((prev) => ({
        ...prev,
        interestedCategories: preferences.categories,
        interestedCities: preferences.cities,
        notifyOnInterest: preferences.notificationsEnabled,
      }));

      const result = await completeOnboarding(user.id, {
        display_name: preferences.name,
        interested_categories: preferences.categories,
        interested_cities: preferences.cities,
      });

      if (result.success) {
        // Update user state manually
        setUser((prev) =>
          prev
            ? {
              ...prev,
              display_name: preferences.name,
              interested_categories: preferences.categories || [],
              interested_cities: preferences.cities || [],
              has_onboarded: true,
            }
            : null
        );
      } else {
        // Fallback: update name at least
        setUser((prev) =>
          prev ? { ...prev, display_name: preferences.name } : null
        );
      }

      // حفظ علامة في localStorage (للاحتياط)
      localStorage.setItem(`abeely_onboarded_${user.id}`, "true");

      // الانتقال للتطبيق الرئيسي
      // استخدام الـ setters من useAuthLogic (يجب تمريرهم أو استخدامهم إذا كانوا متاحين)
      // بما أننا في App.tsx، لدينا access لـ setNeedsOnboarding و setIsNewUser من useAuthLogic return
      setNeedsOnboarding(false);
      setIsNewUser(false);
      setAppView("main");
    } catch (error) {
      logger.error("Error completing onboarding:", error, "App");
      // الانتقال للتطبيق الرئيسي حتى لو فشل الحفظ
      setNeedsOnboarding(false);
      setAppView("main");
    }
  };

  // ==========================================
  // Check if user needs onboarding
  // ==========================================

  // ==========================================
  // View Rendering Logic
  // ==========================================
  const renderContent = () => {
    switch (view) {
      case "create-request": {
        // استخدام واجهة إنشاء الطلب الجديدة (V2)
        const handleCreateRequestBack = () => {
          handleNavigate("marketplace");
        };
        return (
          <SwipeBackWrapper onBack={handleCreateRequestBack} className="h-full">
            <Suspense fallback={<FullScreenLoading />}>
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
                    logger.log(
                      isEditing ? "Updating request" : "Publishing request",
                      request,
                      "App",
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
                      currentUserId = currentUser?.id || undefined;
                    }

                    // If still no user, try one more time after another delay
                    if (!currentUserId) {
                      await new Promise((resolve) => setTimeout(resolve, 300));
                      const currentUser = await getCurrentUser();
                      currentUserId = currentUser?.id || undefined;
                    }

                    // Only require auth if we're absolutely sure there's no user
                    // Note: CreateRequestV2 will show an alert instead of forcing redirect
                    if (!currentUserId) {
                      logger.warn(
                        "No user found in onPublish",
                        undefined,
                        "App",
                      );
                      // Don't force redirect - let CreateRequestV2 handle it with alert
                      // requireAuthForCreate();
                      return null;
                    }

                    // التحقق من البيانات الأساسية
                    if (!request.description || !request.location) {
                      logger.error("Missing required fields:", {
                        description: !!request.description,
                        location: !!request.location,
                      }, "App");
                      return null;
                    }

                    // تحويل البيانات لصيغة AIDraft
                    const draftData = {
                      title: request.title ||
                        request.description.slice(0, 50) ||
                        "طلب جديد",
                      description: request.description,
                      location: request.location || "",
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
                          setUpdateUnarchiveAppNotification({
                            isVisible: true,
                            requestId: updatedRequest.id,
                          });
                          // إخفاء التنبيه بعد 5 ثوان
                          setTimeout(() => {
                            setUpdateUnarchiveAppNotification({
                              isVisible: false,
                              requestId: null,
                            });
                          }, 5000);
                        }
                      } else {
                        logger.error(
                          "Failed to update request - updateRequest returned null",
                          undefined,
                          "App",
                        );
                        return null;
                      }
                    } else {
                      // إنشاء طلب جديد
                      const createdRequest = await createRequestFromChat(
                        currentUserId,
                        draftData,
                        {
                          ...request, // Pass all fields (images, seriousness, etc.)
                          id: request.id, // Explicitly pass id if present
                        } as RequestInsert,
                      );
                      resultId = createdRequest?.id || null;
                    }

                    // إعادة تحميل البيانات في الخلفية
                    reloadData().catch((err) =>
                      logger.error("Error reloading data", err, "App")
                    );

                    // إرجاع ID الطلب
                    return resultId;
                  } catch (error) {
                    logger.error(
                      "Error publishing/updating request:",
                      error,
                      "App",
                    );
                    return null;
                  }
                }}
                requestToEdit={requestToEdit}
                onClearRequestToEdit={() => setRequestToEdit(null)}
                onGoToRequest={async (requestId) => {
                  // البحث أولاً في القوائم المحلية
                  const foundRequest = [...myRequests, ...allRequests].find((
                    r,
                  ) => r.id === requestId);

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
                        logger.error(
                          "Failed to fetch request:",
                          requestId,
                          "App",
                        );
                        // في حالة الفشل، نستخدم كائن مؤقت على الأقل
                        const tempRequest: Request = {
                          id: requestId,
                          title: "طلب جديد",
                          description: "",
                          location: "",
                          status: "active",
                          author: user?.id || "",
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
                      logger.error("Error fetching request:", error, "App");
                      // في حالة الخطأ، نستخدم كائن مؤقت
                      const tempRequest: Request = {
                        id: requestId,
                        title: "طلب جديد",
                        description: "",
                        location: "",
                        status: "active",
                        author: user?.id || "",
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
                onClearAll={handleClearAppNotifications}
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
            </Suspense>
            {/* Bottom Navigation - مخفي في صفحة إنشاء الطلب (يتم استبداله بزر إرسال الطلب) */}
          </SwipeBackWrapper>
        );
      }
      case "marketplace": {
        /* console.log("🏪 Rendering marketplace case:", {
          view,
          activeBottomTab,
          allRequestsCount: allRequests.length,
          myRequestsCount: myRequests.length,
          willShowMarketplace: activeBottomTab === "marketplace",
          willShowMyRequests: activeBottomTab === "my-requests",
          willShowMyOffers: activeBottomTab === "my-offers",
        }); */

        // All three pages are always mounted - CSS controls visibility for smooth transitions
        // Note: Filtered requests are now memoized at the top level (Optimization)
        const mergedRequests = filteredAllRequests;
        return (
          <div className="h-full flex flex-col overflow-hidden relative bg-transparent">
            {/* MyRequests - conditionally rendered */}
            {activeBottomTab === "my-requests" && (
              <div className="absolute inset-0 z-[10] pointer-events-auto">
                <Suspense fallback={<FullScreenLoading />}>
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
                        logger.error("Error archiving request:", error, "App");
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
                        logger.error(
                          "Error unarchiving request:",
                          error,
                          "App",
                        );
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
                      const req = [...myRequests, ...archivedRequests].find((
                        r,
                      ) => r.id === requestId);
                      if (req && offer) {
                        // إزالة badge الرسائل غير المقروءة فوراً
                        setUnreadMessagesPerOffer((prev) => {
                          const next = new Map(prev);
                          if (offer.id) {
                            next.delete(offer.id);
                          }
                          return next;
                        });
                        setUnreadMessagesPerRequest((prev) => {
                          const next = new Map(prev);
                          next.delete(requestId);
                          return next;
                        });

                        setInitialActiveOfferId(offer.id);
                        handleSelectRequest(req);
                        setView("request-detail");
                        // سيتم فتح popup المحادثة مباشرة عبر initialActiveOfferId في RequestDetail
                      }
                    }}
                    userId={user?.id}
                    viewedRequestIds={viewedRequestIds}
                    unreadMessagesPerRequest={unreadMessagesPerRequest}
                    unreadMessagesPerOffer={unreadMessagesPerOffer}
                    requestsWithNewOffers={requestsWithNewOffers}
                    onClearNewOfferHighlight={(requestId) => {
                      setRequestsWithNewOffers((prev) => {
                        const next = new Set(prev);
                        next.delete(requestId);
                        return next;
                      });
                    }}
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
                        logger.error(
                          "Error refreshing my requests:",
                          error,
                          "App",
                        );
                      }
                    }}
                    radarWords={userPreferences.radarWords}
                  />
                </Suspense>
              </div>
            )}

            {/* MyOffers - conditionally rendered */}
            {activeBottomTab === "my-offers" && (
              <div className="absolute inset-0 z-[10] pointer-events-auto">
                <Suspense fallback={<FullScreenLoading />}>
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
                    onOpenWhatsApp={(phoneNumber, _offer) => {
                      globalThis.open(`https://wa.me/${phoneNumber}`, "_blank");
                    }}
                    onOpenChat={(requestId, offer) => {
                      const req = allRequests.find((r) => r.id === requestId);
                      if (req && offer) {
                        // إزالة badge الرسائل غير المقروءة فوراً
                        setUnreadMessagesPerOffer((prev) => {
                          const next = new Map(prev);
                          if (offer.id) {
                            next.delete(offer.id);
                          }
                          return next;
                        });
                        setUnreadMessagesPerRequest((prev) => {
                          const next = new Map(prev);
                          next.delete(requestId);
                          return next;
                        });

                        setInitialActiveOfferId(offer.id);
                        handleSelectRequest(req);
                        setView("request-detail");
                        // سيتم فتح popup المحادثة مباشرة عبر initialActiveOfferId في RequestDetail
                      }
                    }}
                    userId={user?.id}
                    viewedRequestIds={viewedRequestIds}
                    unreadMessagesPerOffer={unreadMessagesPerOffer}
                    isActive={activeBottomTab === "my-offers"}
                    defaultFilter={defaultOfferFilter}
                    onRefresh={async () => {
                      if (!user?.id) return;
                      try {
                        // إعادة جلب عروضي
                        const offers = await fetchMyOffers(user.id);
                        setMyOffers(offers);
                      } catch (error) {
                        logger.error(
                          "Error refreshing my offers:",
                          error,
                          "App",
                        );
                      }
                    }}
                    radarWords={userPreferences.radarWords}
                  />
                </Suspense>
              </div>
            )}

            {/* Marketplace - conditionally rendered */}
            {activeBottomTab === "marketplace" && (
              <div className="h-full w-full bg-transparent z-10 pointer-events-auto">
                {allRequests && Array.isArray(allRequests)
                  ? (
                    <Suspense fallback={<FullScreenLoading />}>
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
                        radarWords={userPreferences.radarWords}
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
                        onUpdateRadarWords={async (words) => {
                          setUserPreferences((prev) => ({
                            ...prev,
                            radarWords: words,
                          }));
                          // حفظ في قاعدة البيانات
                          if (user?.id) {
                            await updatePreferencesDirect(user.id, {
                              radarWords: words,
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
                        savedScrollPosition={currentMarketplaceViewMode ===
                            "interests"
                          ? marketplaceInterestsScrollPos
                          : marketplaceAllScrollPos}
                        onScrollPositionChange={(pos, mode) => {
                          if (mode === "interests") {
                            setMarketplaceInterestsScrollPos(pos);
                          } else {
                            setMarketplaceAllScrollPos(pos);
                          }
                        }}
                        viewedRequestIds={viewedRequestIds}
                        isLoadingViewedRequests={isLoadingViewedRequests}
                        onRequestViewed={async (requestId: string) => {
                          // Update viewedRequestIds locally
                          setViewedRequestIds((prev) => {
                            const newSet = new Set(prev);
                            newSet.add(requestId);
                            return newSet;
                          });
                          // Optimistically decrement count immediately for instant UI feedback
                          setUnreadInterestsCount((prev) =>
                            Math.max(0, prev - 1)
                          );
                          // Reload unread count from database to ensure sync
                          if (user?.id && !isGuest) {
                            try {
                              // Small delay to ensure database update is complete
                              await new Promise((resolve) =>
                                setTimeout(resolve, 100)
                              );
                              const count = await getUnreadInterestsCount();
                              setUnreadInterestsCount(count);
                            } catch (error) {
                              logger.error(
                                "Error reloading unread interests count after view:",
                                error,
                                "App",
                              );
                              // Keep optimistic update if database call fails
                            }
                          }
                        }}
                        onBumpRequest={async (id) => {
                          await handleBumpRequest(id);
                          return true;
                        }}
                        onEditRequest={(request) => {
                          setRequestToEdit(request);
                          setPreviousView("marketplace");
                          setView("create-request");
                        }}
                        onHideRequest={async (id) => {
                          await handleHideRequest(id);
                          return true;
                        }}
                        onUnhideRequest={async (id) => {
                          await handleUnhideRequest(id);
                          return true;
                        }}
                        onArchiveRequest={async (id) => {
                          await handleArchiveRequest(id);
                          return true;
                        }}
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
                        onClearAll={handleClearAppNotifications}
                        onSignOut={isGuest ? handleGoToLogin : handleSignOut}
                        onScrollButtonVisibilityChange={setIsScrollButtonVisible}
                        onHeaderCompressionChange={setIsMarketplaceHeaderCompressed}
                        onNavigateToSettings={() => {
                          setPreviousView(view);
                          setView("settings");
                        }}
                        isDarkMode={isDarkMode}
                        toggleTheme={() => setIsDarkMode(!isDarkMode)}
                        onOpenLanguagePopup={() => setIsLanguagePopupOpen(true)}
                        isActive={activeBottomTab === "marketplace"}
                        onViewModeChange={setCurrentMarketplaceViewMode}
                        currentViewMode={currentMarketplaceViewMode}
                        newRequestIds={newRequestIds}
                      />
                    </Suspense>
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

            {/* Bottom Navigation - يظهر في نهاية الملف بشكل مشروط */}
          </div>
        );
      }
      case "request-detail": {
        // Note: enrichedRequest is now memoized at the top level
        const handleRequestDetailBack = () => {
          logger.log("handleRequestDetailBack called", {
            previousView,
            previousBottomTab,
            currentView: view,
            activeBottomTab,
            mode,
          }, "App");

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
            logger.log("Using previousBottomTab", { targetTab }, "App");
          } else {
            // دائماً نرجع لـ marketplace tab
            targetTab = "marketplace";
            logger.log("✅ Using default marketplace tab", undefined, "App");
          }

          // دائماً نرجع لـ marketplace view
          targetView = "marketplace";

          logger.log("Returning to", {
            view: targetView,
            tab: targetTab,
            previousView,
            previousBottomTab,
            currentActiveTab: activeBottomTab,
          }, "App");

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
            setScrollToOfferSection(false);
            setNavigatedFromSidebar(false);
            setPreviousView(null);
            setPreviousBottomTab(null);
          }, 0);

          logger.log(
            "State updated",
            { view: targetView, tab: targetTab },
            "App",
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
              <Suspense fallback={<FullScreenLoading />}>
                <RequestDetail
                  request={enrichedRequest}
                  mode={mode}
                  myOffer={offerForEdit}
                  onBack={() => {
                    setInitialActiveOfferId(null);
                    handleRequestDetailBack();
                  }}
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
                          // إزالة badge الرسائل غير المقروءة فوراً
                          if (conversationId || conv.id) {
                            markMessagesAsRead(conversationId || conv.id).catch(
                              () => {},
                            );
                          }
                          setUnreadMessagesPerOffer((prev) => {
                            const next = new Map(prev);
                            if (offerId) {
                              next.delete(offerId);
                            }
                            return next;
                          });
                          setUnreadMessagesPerRequest((prev) => {
                            const next = new Map(prev);
                            next.delete(requestId);
                            return next;
                          });

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
                  savedOfferForm={selectedRequest
                    ? savedOfferForms[selectedRequest.id]
                    : undefined}
                  onOfferFormChange={(form) => {
                    if (selectedRequest) {
                      setSavedOfferForms((prev) => ({
                        ...prev,
                        [selectedRequest.id]: form,
                      }));
                    }
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
                  onClearAll={handleClearAppNotifications}
                  onSignOut={isGuest ? handleGoToLogin : handleSignOut}
                  onRequestViewed={handleRequestViewed}
                  onMarkRequestAsRead={handleRequestRead}
                  onArchiveRequest={handleArchiveRequest}
                  onEditRequest={(request) => {
                    // تعيين الطلب للتعديل
                    setRequestToEdit(request);
                  }}
                  onOfferCreated={() => {
                    // تحديث العروض في الخلفية بدون حجب الواجهة
                    // العرض تم إضافته بالفعل بشكل فوري في RequestDetail (optimistic update)
                    if (user?.id) {
                      // تحديث receivedOffersMap إذا كان الطلب يخص المستخدم (في الخلفية)
                      if (selectedRequest) {
                        fetchOffersForRequest(selectedRequest.id)
                          .then((updatedOffers) => {
                            setReceivedOffersMap((prev) => {
                              const newMap = new Map(prev);
                              newMap.set(selectedRequest.id, updatedOffers);
                              return newMap;
                            });
                          })
                          .catch((error) => {
                            logger.error(
                              "Error fetching offers for request:",
                              error,
                              "service",
                            );
                          });
                      }

                      // تحديث myOffers في الخلفية (لا ننتظر)
                      fetchMyOffers(user.id)
                        .then((offers) => {
                          setMyOffers(offers);
                        })
                        .catch((error) => {
                          logger.error(
                            "Error reloading my offers:",
                            error,
                            "service",
                          );
                        });
                    }
                  }}
                  onNavigateToProfile={() => {
                    setPreviousView(view);
                    setViewingProfileUserId(null); // عرض ملف المستخدم الحالي
                    setView("profile");
                  }}
                  onNavigateToUserProfile={(userId: string) => {
                    setPreviousView(view);
                    setViewingProfileUserId(userId); // عرض ملف المستخدم المحدد
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
                        await new Promise((resolve) =>
                          setTimeout(resolve, 100)
                        );
                        const updatedRequest = await fetchRequestById(
                          selectedRequest.id,
                        );
                        if (updatedRequest) {
                          setSelectedRequest(updatedRequest);
                        }
                      } catch (error) {
                        logger.error(
                          "Error reloading request after offer deletion",
                          error,
                          "App",
                        );
                        // حتى لو فشل التحديث، نبقى في الصفحة
                      }
                    }
                  }}
                  onBumpRequest={handleBumpRequest}
                  onHideRequest={handleHideRequest}
                  onUnhideRequest={handleUnhideRequest}
                  receivedOffersMap={receivedOffersMap}
                  initialActiveOfferId={initialActiveOfferId}
                  unreadMessagesPerOffer={unreadMessagesPerOffer}
                />
              </Suspense>
              {/* Bottom Navigation - مخفي في صفحة تفاصيل الطلب (يتم استبدله بزر تقديم العرض) */}
            </SwipeBackWrapper>
          )
          : (() => {
            // إذا لم يكن هناك طلب محدد، redirect تلقائي للـ marketplace
            // هذا يمنع ظهور صفحة بيضاء
            logger.warn(
              "No enrichedRequest found in request-detail view, redirecting to marketplace",
              undefined,
              "App",
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
      }

      case "settings": {
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
            <Suspense fallback={<FullScreenLoading />}>
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
                      homePage: prefs.homePage,
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
                      logger.error(
                        "خطأ في تحديث الملف الشخصي:",
                        result.error,
                        "App",
                      );
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
                setView={(v: string) => setView(v as ViewState)}
                setPreviousView={(v: string) => setPreviousView(v as ViewState)}
                titleKey={titleKey}
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
                onNotificationClick={handleNotificationClick}
                onClearAll={handleClearAppNotifications}
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
            </Suspense>
          </SwipeBackWrapper>
        );
      }
      case "profile": {
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
            <Suspense fallback={<FullScreenLoading />}>
              <Profile
                userReviews={reviews}
                userRating={userRating}
                profileRole={userPreferences.roleMode || "requester"}
                // Header integration props
                mode={mode}
                toggleMode={toggleMode}
                isModeSwitching={isModeSwitching}
                unreadCount={unreadCount}
                hasUnreadMessages={hasUnreadMessages}
                user={user}
                viewingUserId={viewingProfileUserId}
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
                onClearAll={handleClearAppNotifications}
                onSignOut={isGuest ? handleGoToLogin : handleSignOut}
                onBack={() => {
                  setViewingProfileUserId(null); // Reset viewing user ID
                  handleProfileBack();
                }}
                isGuest={isGuest}
                onNavigateToProfile={() => {
                  setPreviousView(view);
                  setViewingProfileUserId(null); // عرض ملف المستخدم الحالي
                  setView("profile");
                }}
                onNavigateToSettings={() => {
                  setPreviousView(view);
                  setView("settings");
                }}
              />
            </Suspense>
          </SwipeBackWrapper>
        );
      }
      case "messages": {
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
              setView={(v: ViewState) => setView(v)}
              setPreviousView={(v: ViewState) => setPreviousView(v)}
              titleKey={titleKey}
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onNotificationClick={handleNotificationClick}
              onClearAll={handleClearAppNotifications}
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
      }
      case "conversation": {
        const handleConversationBack = () => {
          if (previousView) {
            setView(previousView);
            setPreviousView(null);
          } else {
            setView("messages");
          }
          setInitialConversationId(null);
        };

        if (!initialConversationId) {
          queueMicrotask(() => setView("messages"));
          return <FullScreenLoading />;
        }

        return (
          <SwipeBackWrapper
            onBack={handleConversationBack}
            className="h-full flex flex-col overflow-hidden"
          >
            <Suspense fallback={<FullScreenLoading />}>
              <Messages
                onBack={handleConversationBack}
                onSelectConversation={(_conversationId) => {
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
                onClearAll={handleClearAppNotifications}
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
            </Suspense>
          </SwipeBackWrapper>
        );
      }
      default:
        return (
          <div className="h-full flex flex-col overflow-hidden p-8">
            View not found
          </div>
        );
    }
  };

  // حساب الإشعارات غير المقروءة بشكل منفصل
  const unreadAppNotifications = (notifications || []).filter((n) => !n.isRead);

  // Note: unreadInterestsCount is loaded from database (getUnreadInterestsCount)
  // which is based on is_read (actual request opening), not is_viewed (just seeing the card)
  // This ensures the badge count persists correctly after refresh and only decreases
  // when user actually opens and reads the request (scrolling 50%+ in RequestDetail)

  // الإشعارات المرتبطة بطلباتي

  // Use top-level memoized myRequestIds
  const _unreadAppNotificationsForMyRequests =
    unreadAppNotifications.filter((n) =>
      n.relatedRequest && myRequestIds.has(n.relatedRequest.id)
    ).length;

  const myOfferIds = new Set(myOffers.map((o) => o.id));
  const _unreadAppNotificationsForMyOffers =
    unreadAppNotifications.filter((n) =>
      n.relatedOffer && myOfferIds.has(n.relatedOffer.id)
    ).length;

  const _unreadAppNotificationsForProfile =
    unreadAppNotifications.filter((n) => {
      const isForMyRequest = n.relatedRequest &&
        myRequestIds.has(n.relatedRequest.id);
      const isForMyOffer = n.relatedOffer && myOfferIds.has(n.relatedOffer.id);
      const isInterest = n.type === "interest";
      return !isForMyRequest && !isForMyOffer && !isInterest;
    }).length;

  const unreadCount = unreadAppNotifications.length; // للتوافق مع الكود القديم

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
          logger.log(
            "AuthPage onAuthenticated called - going to main immediately",
            undefined,
            "App",
          );

          // 🔧 DEV: الذهاب للـ main مباشرة بدون انتظار
          // الـ onAuthStateChange في App سيتعامل مع تحديث الـ user
          setIsGuest(false);
          localStorage.removeItem("abeely_guest_mode");
          setView("marketplace");
          setMode("offers");
          setSelectedRequest(null);
          setPreviousView(null);
          setAppView("main");

          // محاولة جلب الـ profile في الخلفية (اختياري)
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const profile = await getCurrentUser();
              if (profile) {
                setUser(profile);
                logger.log("Profile loaded in background", {
                  profileId: profile.id,
                }, "App");
              }
            }
          } catch (err) {
            logger.warn("Background profile load failed", err, "App");
          }
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
      {/* AppNotification Click-Outside Overlay */}
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

      {/* Bottom Navigation - يظهر فقط في الصفحات الرئيسية (يتم استبداله بأزرار إرسال الطلب/تقديم العرض في create-request و request-detail) */}
      <BottomNavigation
        activeTab={activeBottomTab}
        onTabChange={handleTabChange}
        onCreateRequest={() => handleNavigate("create-request")}
        user={user || undefined}
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
        unreadMessagesForMyRequests={unreadMessagesForMyRequests}
        unreadMessagesForMyOffers={unreadMessagesForMyOffers}
        unreadInterestsCount={unreadInterestsCount}
        needsProfileSetup={!isGuest && !user?.display_name?.trim()}
        hideOnMobile={view === "create-request" || view === "request-detail" ||
          view === "settings" || view === "profile"}
      />

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
                  type="button"
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
                    type="button"
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
                    type="button"
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
                    type="button"
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
                      type="button"
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
                  type="button"
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

      {/* Error Toast - Shows error messages */}
      <ErrorToast
        message={errorMessage}
        isVisible={isErrorToastVisible}
        onClose={hideErrorToast}
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

      {/* Update Unarchive AppNotification - Shows when editing unarchives a request */}
      <AnimatePresence>
        {updateUnarchiveAppNotification.isVisible && (
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
                <motion.button
                  type="button"
                  onClick={() =>
                    setUpdateUnarchiveAppNotification({
                      isVisible: false,
                      requestId: null,
                    })}
                  className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
                >
                  <X size={16} className="text-muted-foreground" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
