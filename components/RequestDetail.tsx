import {
  canUserReviewRequest,
  createReview,
  getReviewsForUser,
  updateReview,
} from "../services/reviewsService.ts";
import { ReviewForm } from "./ReviewForm.tsx";
import { Review } from "../types.ts";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { logger } from "../utils/logger.ts";
import { AppMode, Message as LocalMessage, Offer, Request } from "../types.ts";
import { Button } from "./ui/Button.tsx";
import { Badge } from "./ui/Badge.tsx";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowRight,
  Bell,
  BellOff,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  Clock,
  Copy,
  DollarSign,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Flag,
  ImageIcon,
  Info,
  Link,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquare,
  Mic,
  MoreVertical,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { formatTimeAgo } from "../utils/timeFormat.ts";
import { AnimatePresence, motion } from "framer-motion";
import {
  confirmGuestPhone,
  getCurrentUser,
  verifyGuestPhone,
} from "../services/authService.ts";
import {
  incrementRequestViews,
  markRequestAsRead,
  markRequestAsViewed,
} from "../services/requestViewsService.ts";
import {
  copyShareUrl,
  getRequestShareUrl,
} from "../services/routingService.ts";
import {
  createReport,
  REPORT_REASONS,
  ReportReason,
} from "../services/reportsService.ts";
import ReactDOM from "react-dom";
import html2canvas from "html2canvas";
import { UnifiedHeader } from "./ui/UnifiedHeader.tsx";
import { DropdownMenu, DropdownMenuItem } from "./ui/DropdownMenu.tsx";
import {
  closeConversationsForRequest,
  Conversation,
  getConversations,
  getMessages,
  getOrCreateConversation,
  markMessagesAsRead,
  Message as ChatMessage,
  sendMessage,
  subscribeToMessages,
  uploadVoiceMessage,
} from "../services/messagesService.ts";
import {
  acceptOffer,
  createOffer,
  fetchOffersForRequest,
  startNegotiation,
} from "../services/requestsService.ts";
import {
  formatFileSize,
  isImageFile,
  uploadOfferAttachments,
  validateFile,
} from "../services/storageService.ts";
import { supabase } from "../services/supabaseClient.ts";
import { DEFAULT_SAUDI_CITIES } from "../services/placesService.ts";
import { CityAutocomplete } from "./ui/CityAutocomplete.tsx";
import { AVAILABLE_CATEGORIES } from "../data.ts";
import { getCategoryLabel, SupportedLocale } from "../types.ts";
import { getKnownCategoryColor } from "../utils/categoryColors.ts";
import { CategoryIcon } from "./ui/CategoryIcon.tsx";
import { getCurrentLocale } from "../services/categoriesService.ts";

interface RequestDetailProps {
  request: Request;
  mode: AppMode;
  myOffer?: Offer;
  onBack: () => void;
  isGuest?: boolean;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  onOpenLanguagePopup?: () => void;
  scrollToOfferSection?: boolean;
  navigatedFromSidebar?: boolean; // لتحديد إذا كان التنقل من الشريط الجانبي
  highlightOfferId?: string | null; // لتمييز عرض معين عند النقر على إشعار
  onNavigateToMessages?: (
    conversationId?: string,
    userId?: string,
    requestId?: string,
    offerId?: string,
  ) => void;
  autoTranslateRequests?: boolean;
  currentLanguage?: "ar" | "en" | "ur";
  onCompleteRequest?: (requestId: string) => void;
  savedOfferForm?: {
    price: string;
    duration: string;
    city: string;
    title: string;
    description: string;
    attachments: any[];
    guestVerificationStep?: "none" | "phone" | "otp";
    guestPhone?: string;
    guestOTP?: string;
  };
  onOfferFormChange?: (form: {
    price: string;
    duration: string;
    city: string;
    title: string;
    description: string;
    attachments: any[];
    guestVerificationStep?: "none" | "phone" | "otp";
    guestPhone?: string;
    guestOTP?: string;
  }) => void;
  savedScrollPosition?: number;
  onScrollPositionChange?: (pos: number) => void;
  // Unified Header Props
  toggleMode: () => void;
  isModeSwitching: boolean;
  unreadCount: number;
  hasUnreadMessages: boolean;
  user: any;
  setView: (view: any) => void;
  setPreviousView: (view: any) => void;
  titleKey: number;
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  onNotificationClick?: (notification: any) => void;
  onClearAll: () => void;
  onSignOut: () => void;
  onMarkRequestAsRead?: (id: string) => void;
  onRequestViewed?: (id: string) => void; // Callback when request is marked as viewed (for updating badges)
  onOfferCreated?: () => void; // Callback when a new offer is successfully created
  onOfferStatusChange?: () => void; // Callback when offer status changes (accept/negotiate)
  onArchiveRequest?: (id: string) => void;
  onEditRequest?: (request: Request) => void; // Callback to edit the request
  onNavigateToProfile?: () => void;
  onNavigateToUserProfile?: (userId: string) => void; // Callback to navigate to another user's profile
  onNavigateToSettings?: () => void;
  onCancelOffer?: (offerId: string) => Promise<void>; // Callback to cancel an offer
  onBumpRequest?: (id: string) => void; // Callback to refresh/bump the request
  onHideRequest?: (id: string) => void; // Callback to hide the request
  onUnhideRequest?: (id: string) => void; // Callback to unhide/show the request
  sourceTab?: "marketplace" | "my-requests" | "my-offers"; // Source tab to determine if categories should be shown
  receivedOffersMap?: Map<string, Offer[]>; // العروض المستلمة على طلبات المستخدم (من App.tsx)
  initialActiveOfferId?: string | null; // فتح popup المحادثة مباشرة للعرض المحدد
  unreadMessagesPerOffer?: Map<string, number>; // عدد الرسائل غير المقروءة لكل عرض
}

export const RequestDetail: React.FC<RequestDetailProps> = (
  {
    request,
    mode,
    myOffer,
    onBack,
    isGuest = false,
    isDarkMode,
    toggleTheme,
    onOpenLanguagePopup,
    scrollToOfferSection = false,
    navigatedFromSidebar = false,
    highlightOfferId = null,
    receivedOffersMap = new Map(),
    onNavigateToMessages,
    autoTranslateRequests = false,
    currentLanguage = "ar",
    onCompleteRequest,
    savedOfferForm,
    onOfferFormChange,
    savedScrollPosition = 0,
    onScrollPositionChange,
    // Unified Header Props
    toggleMode,
    isModeSwitching,
    unreadCount,
    hasUnreadMessages,
    user,
    setView,
    setPreviousView,
    titleKey,
    notifications,
    onMarkAsRead,
    onNotificationClick,
    onClearAll,
    onSignOut,
    onMarkRequestAsRead,
    onRequestViewed,
    onOfferCreated,
    onOfferStatusChange,
    onArchiveRequest,
    onEditRequest,
    onNavigateToProfile,
    onNavigateToUserProfile,
    onNavigateToSettings,
    onCancelOffer,
    onBumpRequest,
    onHideRequest,
    onUnhideRequest,
    sourceTab,
    initialActiveOfferId = null,
    unreadMessagesPerOffer = new Map(),
  },
) => {
  // Current locale for category labels - use ref to prevent unnecessary re-renders
  const localeRef = useRef<SupportedLocale>(getCurrentLocale());
  const [locale, setLocale] = useState<SupportedLocale>(localeRef.current);

  // Load locale on mount and listen for changes
  useEffect(() => {
    const currentLocale = getCurrentLocale();
    if (currentLocale !== localeRef.current) {
      localeRef.current = currentLocale;
      setLocale(currentLocale);
    }
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "locale" && e.newValue) {
        const newLocale = e.newValue as SupportedLocale;
        if (newLocale === "ar" || newLocale === "en" || newLocale === "ur") {
          localeRef.current = newLocale;
          setLocale(newLocale);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const [negotiationOpen, setNegotiationOpen] = useState(
    !!initialActiveOfferId,
  );
  const [activeOfferId, setActiveOfferId] = useState<string | null>(
    initialActiveOfferId,
  ); // العرض المحدد للمحادثة
  const [localOfferStatuses, setLocalOfferStatuses] = useState<
    Record<string, string>
  >({}); // track local status changes
  const [chatMessage, setChatMessage] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [isIdCopied, setIsIdCopied] = useState(false);
  const [showOfferPulse, setShowOfferPulse] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [showStatusPulse, setShowStatusPulse] = useState(false);
  const [clickedIcons, setClickedIcons] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [isShowingOriginal, setIsShowingOriginal] = useState(false);
  const [isOfferSectionVisible, setIsOfferSectionVisible] = useState(false);
  const offerSectionRef = useRef<HTMLDivElement>(null);

  // State for loaded offers (in case they're not in request.offers)
  const [loadedOffers, setLoadedOffers] = useState<Offer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);

  // Language names for display
  const languageNames = {
    ar: "العربية",
    en: "الإنجليزية",
    ur: "الأوردية",
  };

  // Guest verification state for offers - Initialize from saved form if available
  const [guestOfferVerificationStep, setGuestOfferVerificationStep] = useState<
    "none" | "phone" | "otp"
  >(savedOfferForm?.guestVerificationStep || "none");
  const [guestOfferPhone, setGuestOfferPhone] = useState(
    savedOfferForm?.guestPhone || "",
  );
  const [guestOfferOTP, setGuestOfferOTP] = useState(
    savedOfferForm?.guestOTP || "",
  );
  const [guestOfferError, setGuestOfferError] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isCancellingOffer, setIsCancellingOffer] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [canReview, setCanReview] = useState(false);

  // Check if user can review this request
  useEffect(() => {
    const checkReviewStatus = async () => {
      if (request.status === "completed" && user) {
        // Check eligibility
        const canReviewResult = await canUserReviewRequest(request.id, user.id);
        setCanReview(canReviewResult);

        // Check if already reviewed
        if (canReviewResult) {
          const reviews = await getReviewsForUser(
            request.author === user.id
              ? (request.acceptedOfferId
                ? request.acceptedOfferProvider || ""
                : "")
              : request.author, // review the OTHER person
          );
          // Logic to find specific review for this request is handled by RLS mostly, but for UI we might need to fetch specific review
          // For now, simplify: just show button if "completed"
        }
      }
    };
    checkReviewStatus();
  }, [request.status, user]);

  // ترجمة رسائل الخطأ من Supabase للعربية
  const translateAuthError = (error: string): string => {
    const errorMap: Record<string, string> = {
      "Token has expired or is invalid":
        "انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.",
      "Invalid OTP": "رمز التحقق غير صحيح",
      "OTP expired": "انتهت صلاحية رمز التحقق",
      "Phone number is invalid": "رقم الجوال غير صحيح",
      "Rate limit exceeded":
        "تم تجاوز الحد المسموح. انتظر قليلاً ثم حاول مرة أخرى.",
      "For security purposes, you can only request this after":
        "لأسباب أمنية، يمكنك طلب رمز جديد بعد",
    };

    // البحث عن ترجمة مطابقة أو جزئية
    for (const [key, value] of Object.entries(errorMap)) {
      if (error.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    return error;
  };

  // Track previous savedOfferForm to prevent unnecessary updates
  const prevSavedFormRef = useRef<typeof savedOfferForm>(null);

  // Update form fields when savedOfferForm changes
  useEffect(() => {
    // Check if savedOfferForm actually changed
    const hasChanged = !prevSavedFormRef.current ||
      !savedOfferForm ||
      prevSavedFormRef.current.price !== savedOfferForm.price ||
      prevSavedFormRef.current.duration !== savedOfferForm.duration ||
      prevSavedFormRef.current.city !== savedOfferForm.city ||
      prevSavedFormRef.current.title !== savedOfferForm.title ||
      prevSavedFormRef.current.description !== savedOfferForm.description ||
      prevSavedFormRef.current.guestVerificationStep !==
        savedOfferForm.guestVerificationStep ||
      prevSavedFormRef.current.guestPhone !== savedOfferForm.guestPhone ||
      prevSavedFormRef.current.guestOTP !== savedOfferForm.guestOTP;

    if (savedOfferForm && hasChanged) {
      if (
        savedOfferForm.price !== undefined &&
        savedOfferForm.price !== offerPrice
      ) setOfferPrice(savedOfferForm.price);
      if (
        savedOfferForm.duration !== undefined &&
        savedOfferForm.duration !== offerDuration
      ) setOfferDuration(savedOfferForm.duration);
      if (
        savedOfferForm.city !== undefined && savedOfferForm.city !== offerCity
      ) setOfferCity(savedOfferForm.city);
      if (
        savedOfferForm.title !== undefined &&
        savedOfferForm.title !== offerTitle
      ) setOfferTitle(savedOfferForm.title);
      if (
        savedOfferForm.description !== undefined &&
        savedOfferForm.description !== offerDescription
      ) setOfferDescription(savedOfferForm.description);
      if (
        savedOfferForm.guestVerificationStep !== undefined &&
        savedOfferForm.guestVerificationStep !== guestOfferVerificationStep
      ) setGuestOfferVerificationStep(savedOfferForm.guestVerificationStep);
      if (
        savedOfferForm.guestPhone !== undefined &&
        savedOfferForm.guestPhone !== guestOfferPhone
      ) setGuestOfferPhone(savedOfferForm.guestPhone);
      if (
        savedOfferForm.guestOTP !== undefined &&
        savedOfferForm.guestOTP !== guestOfferOTP
      ) setGuestOfferOTP(savedOfferForm.guestOTP);
      // Update ref after updating fields
      prevSavedFormRef.current = savedOfferForm;
    } else if (!savedOfferForm) {
      prevSavedFormRef.current = null;
    }
  }, [savedOfferForm]);
  const [isSendingOfferOTP, setIsSendingOfferOTP] = useState(false);
  const [isVerifyingOfferOTP, setIsVerifyingOfferOTP] = useState(false);

  // Image Carousel State with Drag
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(
    null,
  );
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Refined Image Swipe
  const [imgTouchStart, setImgTouchStart] = useState<
    { x: number; y: number } | null
  >(null);

  // AI Assist State
  const [showAIAssist, setShowAIAssist] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Form State - Initialize from saved form if available
  const [offerPrice, setOfferPrice] = useState(savedOfferForm?.price || "");
  const [offerDuration, setOfferDuration] = useState(
    savedOfferForm?.duration || "",
  );
  const [offerCity, setOfferCity] = useState(savedOfferForm?.city || "");
  const [offerTitle, setOfferTitle] = useState(savedOfferForm?.title || "");
  const [offerDescription, setOfferDescription] = useState(
    savedOfferForm?.description || "",
  );
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [isAttachmentsExpanded, setIsAttachmentsExpanded] = useState(false);
  const [offerAttachments, setOfferAttachments] = useState<File[]>([]);
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  const [searchedImages, setSearchedImages] = useState<string[]>([]);
  const [selectedSearchImages, setSelectedSearchImages] = useState<Set<string>>(
    new Set(),
  );
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const offerFileInputRef = useRef<HTMLInputElement>(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  // Report modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerSubmitted, setOfferSubmitted] = useState(false);

  // Focus States for Floating Labels
  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [isDurationFocused, setIsDurationFocused] = useState(false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);

  // Smart resize hint for description textarea
  const [showDescResizeHint, setShowDescResizeHint] = useState(false);
  const [isDescResizing, setIsDescResizing] = useState(false);
  const [descTextareaHeight, setDescTextareaHeight] = useState<number | null>(
    null,
  );
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);
  const descHintIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const descHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownDescFirstHint = useRef(false);
  const DESC_MIN_HEIGHT = 128;
  const isDescResizingRef = useRef(false);

  useEffect(() => {
    isDescResizingRef.current = isDescResizing;
  }, [isDescResizing]);

  const triggerDescResizeHint = useCallback(() => {
    setShowDescResizeHint(true);
    if (descHintTimeoutRef.current) clearTimeout(descHintTimeoutRef.current);
    descHintTimeoutRef.current = setTimeout(
      () => setShowDescResizeHint(false),
      1500,
    );
  }, []);

  // Shake animation states for required fields
  const [shakingFields, setShakingFields] = useState({
    price: false,
    title: false,
  });

  useEffect(() => {
    if (
      offerDescription.length >= 3 && isDescriptionFocused &&
      !hasShownDescFirstHint.current
    ) {
      hasShownDescFirstHint.current = true;
      triggerDescResizeHint();
    }
  }, [isDescriptionFocused, offerDescription, triggerDescResizeHint]);

  useEffect(() => {
    descHintIntervalRef.current = setInterval(() => {
      if (isDescResizingRef.current) return;
      triggerDescResizeHint();
    }, 40000);

    return () => {
      if (descHintIntervalRef.current) {
        clearInterval(descHintIntervalRef.current);
      }
      if (descHintTimeoutRef.current) clearTimeout(descHintTimeoutRef.current);
    };
  }, [triggerDescResizeHint]);

  // Reset first hint tracker when description is cleared
  useEffect(() => {
    if (!offerDescription) {
      hasShownDescFirstHint.current = false;
    }
  }, [offerDescription]);

  // Custom resize handler for description textarea
  const handleDescResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Immediate haptic feedback on touch
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }

      setIsDescResizing(true);
      const startY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const startHeight = descTextareaRef.current?.offsetHeight ||
        DESC_MIN_HEIGHT;

      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        const currentY = "touches" in moveEvent
          ? moveEvent.touches[0].clientY
          : moveEvent.clientY;
        const delta = currentY - startY;
        const newHeight = Math.max(DESC_MIN_HEIGHT, startHeight + delta);
        setDescTextareaHeight(newHeight);
      };

      const handleEnd = () => {
        setIsDescResizing(false);
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleEnd);
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);
        // Re-enable body scroll
        document.body.style.overflow = "";
        document.body.style.touchAction = "";
      };

      // Disable body scroll during resize
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      document.addEventListener("mousemove", handleMove, { passive: false });
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove, { passive: false });
      document.addEventListener("touchend", handleEnd);
    },
    [],
  );

  // Real Messages System
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentConversation, setCurrentConversation] = useState<
    Conversation | null
  >(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isConversationClosed, setIsConversationClosed] = useState(false);
  const [conversationClosedReason, setConversationClosedReason] = useState<
    string | null
  >(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice recording state for chat
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [chatMediaRecorder, setChatMediaRecorder] = useState<
    MediaRecorder | null
  >(null);
  const [recordingTimeVoice, setRecordingTimeVoice] = useState(0);
  const [recordedAudioBlobChat, setRecordedAudioBlobChat] = useState<
    Blob | null
  >(null);
  const [recordedAudioUrlChat, setRecordedAudioUrlChat] = useState<
    string | null
  >(null);

  // للتحقق من وجود محادثة سابقة (لمقدم العرض)
  const [hasExistingConversation, setHasExistingConversation] = useState(false);
  const [isCheckingConversation, setIsCheckingConversation] = useState(false);

  // State لكتم إشعارات المحادثة
  const [isConversationMuted, setIsConversationMuted] = useState(false);

  // دمج العروض من request.offers و loadedOffers
  // Memoize categories display data to prevent unnecessary re-renders
  const shouldShowCategories = useMemo(() => {
    return (
      request.categories &&
      request.categories.length > 0 &&
      (sourceTab === "marketplace" || sourceTab === "my-offers")
    );
  }, [request.categories, sourceTab]);

  const categoriesDisplay = useMemo(() => {
    if (!shouldShowCategories || !request.categories) return [];

    return request.categories.map((catLabel, idx) => {
      const categoryObj = AVAILABLE_CATEGORIES.find((c) =>
        c.label === catLabel || c.id === catLabel
      );
      const displayLabel = categoryObj
        ? getCategoryLabel(categoryObj, locale)
        : catLabel;
      const categoryId = categoryObj?.id || catLabel;

      return {
        id: categoryId,
        label: displayLabel,
        icon: categoryObj?.icon,
        emoji: categoryObj?.emoji,
        color: getKnownCategoryColor(categoryId),
        key: `${categoryId}-${idx}`,
      };
    });
  }, [shouldShowCategories, request.categories, locale]);

  const allOffers = React.useMemo(() => {
    const offersFromRequest = request.offers || [];
    const offersFromLoaded = loadedOffers || [];

    /* logger.log(
      `🔍 RequestDetail: Computing allOffers for request ${
        request.id.slice(-4)
      }:`,
      {
        offersFromRequest: offersFromRequest.length,
        offersFromLoaded: offersFromLoaded.length,
        loadedOffersState: loadedOffers.length,
        requestId: request.id.slice(-4),
      },
    ); */

    // إذا كانت العروض محملة من قاعدة البيانات أو من receivedOffersMap، استخدمها
    if (offersFromLoaded.length > 0) {
      /* logger.log(
        `✅ RequestDetail: Using loadedOffers (${offersFromLoaded.length} offers)`,
        {
          offers: offersFromLoaded.map((o) => ({
            id: o.id.slice(-4),
            status: o.status,
            title: o.title,
          })),
        },
      ); */
      return offersFromLoaded;
    }

    // وإلا استخدم العروض من request.offers
    /* logger.log(
      `✅ RequestDetail: Using request.offers (${offersFromRequest.length} offers)`,
    ); */
    return offersFromRequest;
  }, [request.offers, loadedOffers, request.id]);

  // تحديد الطرف الآخر في المحادثة
  const getOtherUserId = () => {
    // إذا كان المستخدم صاحب الطلب، الطرف الآخر هو مقدم العرض المقبول أو أول عرض
    if (isMyRequest || mode === "requests") {
      // البحث عن العرض المقبول أو أول عرض
      const acceptedOffer = allOffers.find((o) => o.status === "accepted") ||
        allOffers[0];
      return acceptedOffer?.providerId;
    } else {
      // إذا كان المستخدم مقدم العرض، الطرف الآخر هو صاحب الطلب
      return request.author;
    }
  };

  // التحقق من وجود محادثة سابقة لمقدم العرض
  useEffect(() => {
    if (mode !== "offers" || !user?.id || !myOffer?.id || isGuest) {
      setHasExistingConversation(false);
      return;
    }

    const checkExistingConversation = async () => {
      setIsCheckingConversation(true);
      try {
        const conversations = await getConversations();
        const exists = conversations.some(
          (conv) =>
            conv.offer_id === myOffer.id ||
            (conv.request_id === request.id && conv.offer_id === null),
        );
        setHasExistingConversation(exists);
      } catch (error) {
        logger.error("خطأ في التحقق من المحادثة:", error, "service");
        setHasExistingConversation(false);
      } finally {
        setIsCheckingConversation(false);
      }
    };

    checkExistingConversation();
  }, [mode, user?.id, myOffer?.id, request.id, isGuest]);

  // هل يمكن لمقدم العرض فتح المحادثة؟
  const canProviderChat = () => {
    if (mode !== "offers" || !myOffer) return false;
    // يمكنه المحادثة إذا تم اعتماد عرضه
    if (myOffer.status === "accepted") return true;
    // أو إذا بدأ صاحب الطلب التفاوض
    if (myOffer.status === "negotiating") return true;
    // أو إذا سمح بالتفاوض وتوجد محادثة سابقة (بدأها صاحب الطلب)
    if (myOffer.isNegotiable && hasExistingConversation) return true;
    return false;
  };

  // دالة مساعدة للحصول على الحالة الفعلية للعرض (تأخذ التحديثات المحلية في الاعتبار)
  const getEffectiveOfferStatus = (offer: Offer): string => {
    return localOfferStatuses[offer.id] || offer.status;
  };

  // State لقبول العرض
  const [isAcceptingOffer, setIsAcceptingOffer] = useState(false);
  const [acceptOfferError, setAcceptOfferError] = useState<string | null>(null);

  // State لبدء التفاوض
  const [isStartingNegotiation, setIsStartingNegotiation] = useState(false);
  const [startNegotiationError, setStartNegotiationError] = useState<
    string | null
  >(null);

  // دالة قبول العرض
  const handleAcceptOffer = async (offerId: string) => {
    if (!user?.id || isGuest) {
      setAcceptOfferError("يجب تسجيل الدخول لقبول العرض");
      return;
    }

    setIsAcceptingOffer(true);
    setAcceptOfferError(null);

    try {
      // 1. قبول العرض
      const result = await acceptOffer(request.id, offerId, user.id);

      if (!result.success) {
        setAcceptOfferError(result.error || "فشل في قبول العرض");
        return;
      }

      // 2. إغلاق المحادثات مع العارضين الآخرين
      await closeConversationsForRequest(request.id, offerId);

      // 3. تحديث حالة العرض محلياً بدلاً من إعادة التحميل
      setLocalOfferStatuses((prev) => {
        const updated: Record<string, string> = {};
        // رفض جميع العروض الأخرى
        request.offers.forEach((offer) => {
          if (offer.id === offerId) {
            updated[offer.id] = "accepted";
          } else if (
            offer.status === "pending" || offer.status === "negotiating"
          ) {
            updated[offer.id] = "rejected";
          }
        });
        return { ...prev, ...updated };
      });

      // تعيين العرض النشط وفتح المحادثة
      setActiveOfferId(offerId);

      // إبلاغ الـ parent لتحديث البيانات
      onOfferStatusChange?.();
    } catch (error) {
      logger.error("خطأ في قبول العرض:", error, "service");
      setAcceptOfferError("حدث خطأ غير متوقع");
    } finally {
      setIsAcceptingOffer(false);
    }
  };

  // دالة بدء التفاوض
  const handleStartNegotiation = async (offerId: string) => {
    if (!user?.id || isGuest) {
      setStartNegotiationError("يجب تسجيل الدخول لبدء التفاوض");
      return;
    }

    setIsStartingNegotiation(true);
    setStartNegotiationError(null);

    try {
      const result = await startNegotiation(request.id, offerId, user.id);

      if (!result.success) {
        setStartNegotiationError(result.error || "فشل في بدء التفاوض");
        return;
      }

      // تحديث حالة العرض محلياً بدلاً من إعادة التحميل
      setLocalOfferStatuses((prev) => ({
        ...prev,
        [offerId]: "negotiating",
      }));

      // تعيين العرض النشط للمحادثة
      setActiveOfferId(offerId);

      // فتح نافذة المحادثة مباشرة بعد بدء التفاوض
      setNegotiationOpen(true);

      // إبلاغ الـ parent لتحديث البيانات
      onOfferStatusChange?.();
    } catch (error) {
      logger.error("خطأ في بدء التفاوض:", error, "service");
      setStartNegotiationError("حدث خطأ غير متوقع");
    } finally {
      setIsStartingNegotiation(false);
    }
  };

  // تحميل أو إنشاء المحادثة عند فتح الـ bottom sheet
  useEffect(() => {
    if (!negotiationOpen || !user?.id || isGuest) {
      // Reset states when closing
      if (!negotiationOpen) {
        setCurrentConversation(null);
        setChatMessages([]);
        setIsChatLoading(false);
      }
      return;
    }

    let isMounted = true;
    const loadOrCreateConversation = async () => {
      setIsChatLoading(true);

      // Safety timeout: reset loading after 15 seconds
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          logger.warn("Conversation load timeout - resetting loading state");
          setIsChatLoading(false);
        }
      }, 15000);

      try {
        const otherUserId = getOtherUserId();
        if (!otherUserId) {
          clearTimeout(timeoutId);
          logger.warn("لا يوجد طرف آخر للمحادثة");
          if (isMounted) setIsChatLoading(false);
          return;
        }

        // تحديد offer_id إذا كان موجودًا
        // أولوية للعرض النشط المحدد من بدء التفاوض
        const offerId = activeOfferId ||
          (mode === "offers"
            ? myOffer?.id
            : request.offers?.find((o) => o.status === "accepted")?.id ||
              request.offers?.[0]?.id);

        logger.log("Loading conversation:", {
          otherUserId,
          requestId: request.id,
          offerId,
        });
        const conversation = await getOrCreateConversation(
          otherUserId,
          request.id,
          offerId,
        );

        clearTimeout(timeoutId);

        if (!isMounted) return;

        if (!conversation) {
          logger.error("Failed to get or create conversation");
          setIsChatLoading(false);
          return;
        }

        setCurrentConversation(conversation);

        // التحقق من إغلاق المحادثة
        if (conversation.is_closed) {
          setIsConversationClosed(true);
          setConversationClosedReason(
            conversation.closed_reason || "تم إغلاق هذه المحادثة",
          );
        } else {
          setIsConversationClosed(false);
          setConversationClosedReason(null);
        }

        // Load messages with better error handling
        logger.log("Loading messages for conversation:", conversation.id);
        let msgs: ChatMessage[] = [];

        try {
          // محاولة تحميل الرسائل مع timeout أطول
          const messagesPromise = getMessages(conversation.id);
          const timeoutPromise = new Promise<ChatMessage[]>((resolve) =>
            setTimeout(() => {
              logger.warn("Messages load timeout - using empty array");
              resolve([]);
            }, 15000) // زيادة timeout إلى 15 ثانية
          );

          msgs = await Promise.race([messagesPromise, timeoutPromise]);

          if (!isMounted) return;

          // التأكد من أن msgs هو array
          if (!Array.isArray(msgs)) {
            logger.warn("getMessages returned non-array, using empty array");
            msgs = [];
          }

          logger.log("Loaded messages:", msgs.length);
          setChatMessages(msgs);

          // Mark as read (don't await to avoid blocking)
          markMessagesAsRead(conversation.id).catch((err) => {
            logger.warn("Failed to mark messages as read:", err);
          });

          // Scroll to bottom after a short delay
          setTimeout(() => {
            if (isMounted) {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
          }, 100);
        } catch (msgError) {
          logger.error("Error loading messages:", msgError, "service");
          // في حالة فشل تحميل الرسائل، استخدم array فارغ
          if (isMounted) {
            setChatMessages([]);
            logger.log("Set messages to empty array due to error");
          }
        }
      } catch (error) {
        clearTimeout(timeoutId);
        logger.error("خطأ في تحميل المحادثة:", error, "service");
        if (isMounted) {
          setIsChatLoading(false);
          // Show error to user
          alert("حدث خطأ في تحميل المحادثة. يرجى المحاولة مرة أخرى.");
        }
      } finally {
        if (isMounted) {
          setIsChatLoading(false);
        }
      }
    };

    loadOrCreateConversation();

    return () => {
      isMounted = false;
    };
  }, [negotiationOpen, user?.id, isGuest, request.id, mode, activeOfferId]);

  // فتح popup المحادثة مباشرة عند تغيير initialActiveOfferId
  useEffect(() => {
    if (initialActiveOfferId && initialActiveOfferId !== activeOfferId) {
      setActiveOfferId(initialActiveOfferId);
      setNegotiationOpen(true);
    }
  }, [initialActiveOfferId]);

  // الاشتراك في الرسائل الجديدة
  useEffect(() => {
    if (!currentConversation?.id || !user?.id) {
      return;
    }

    logger.log(
      "Subscribing to messages for conversation:",
      currentConversation.id,
    );

    const unsubscribe = subscribeToMessages(
      currentConversation.id,
      (newMsg, eventType) => {
        try {
          if (eventType === "INSERT") {
            logger.log("New message received:", {
              id: newMsg.id,
              senderId: newMsg.sender_id,
            });
            setChatMessages((prev) => {
              // تجنب التكرار
              if (prev.some((m) => m.id === newMsg.id)) {
                logger.log("Message already exists, skipping:", newMsg.id);
                return prev;
              }
              logger.log("Adding new message to chat:", newMsg.id);
              return [...prev, newMsg];
            });

            // وضع علامة مقروء إذا لم تكن من المستخدم الحالي
            if (newMsg.sender_id !== user?.id) {
              markMessagesAsRead(currentConversation.id).catch((err) => {
                logger.warn("Failed to mark message as read:", err);
              });
            }

            // Scroll to bottom after a short delay
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          } else if (eventType === "UPDATE") {
            logger.log("Message updated:", newMsg.id);
            setChatMessages((prev) =>
              prev.map((m) => (m.id === newMsg.id ? newMsg : m))
            );
          }
        } catch (error) {
          logger.error("Error handling message update:", error, "service");
        }
      },
    );

    return () => {
      logger.log(
        "Unsubscribing from messages for conversation:",
        currentConversation.id,
      );
      unsubscribe();
    };
  }, [currentConversation?.id, user?.id]);

  // التمرير للأسفل عند وصول رسائل جديدة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleShare = async () => {
    // استخدام رابط المشاركة الجديد
    const shareUrl = getRequestShareUrl(request.id);

    // تحديث URL في المتصفح
    window.history.pushState({}, "", shareUrl);

    try {
      // Try to generate share image
      const shareCardElement = document.getElementById("share-card-preview");
      let shareFile: File | null = null;

      if (shareCardElement) {
        try {
          const canvas = await html2canvas(shareCardElement, {
            scale: 2,
            backgroundColor: "#ffffff",
            useCORS: true,
          });

          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), "image/png");
          });

          if (blob) {
            shareFile = new File(
              [blob],
              `request-${request.id.substring(0, 8)}.png`,
              { type: "image/png" },
            );
          }
        } catch (imgErr) {
          logger.log("Could not generate share image:", imgErr);
        }
      }

      // Try native share with image
      if (navigator.share) {
        const shareData: ShareData = {
          title: request.title,
          text: `${request.title}\n${
            request.description.substring(0, 100)
          }...\n\nشاهد الطلب على أبيلي`,
          url: shareUrl,
        };

        // Add file if supported
        if (
          shareFile && navigator.canShare &&
          navigator.canShare({ files: [shareFile] })
        ) {
          shareData.files = [shareFile];
        }

        await navigator.share(shareData);
      } else {
        // Fallback: copy URL using routing service
        const copied = await copyShareUrl("request", { requestId: request.id });
        if (copied) {
          setIsShared(true);
          setTimeout(() => setIsShared(false), 2000);
        }
      }
    } catch (err) {
      // User cancelled or error
      if ((err as Error).name !== "AbortError") {
        logger.log(err);
      }
    }
  };

  // Handle copy link with visual feedback
  const handleCopyLink = async () => {
    try {
      const shareUrl = getRequestShareUrl(request.id);
      await navigator.clipboard.writeText(shareUrl);
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000);
    } catch (err) {
      logger.error("Failed to copy:", err, "service");
    }
  };

  // Handle report submission
  const handleSubmitReport = async () => {
    if (!reportReason) return;

    setIsSubmittingReport(true);

    const result = await createReport({
      report_type: "request",
      target_id: request.id,
      reason: reportReason,
      description: reportDescription || undefined,
    });

    setIsSubmittingReport(false);

    if (result.success) {
      setReportSubmitted(true);
      setTimeout(() => {
        setIsReportModalOpen(false);
        setReportSubmitted(false);
        setReportReason(null);
        setReportDescription("");
      }, 2000);
    } else {
      alert(result.error || "حدث خطأ");
    }
  };

  // --- Better Image Carousel Swipe ---
  const handleImgTouchStart = (e: React.TouchEvent) => {
    setImgTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
  };

  const handleImgTouchEnd = (e: React.TouchEvent) => {
    if (!imgTouchStart) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const dx = endX - imgTouchStart.x;
    const dy = endY - imgTouchStart.y;

    if (Math.abs(dy) > Math.abs(dx)) {
      setImgTouchStart(null);
      return; // Vertical scroll
    }

    if (Math.abs(dx) > 50 && request.images && request.images.length > 0) {
      if (dx > 0) prevImage(); // Swipe Right (Previous)
      else nextImage(); // Swipe Left (Next)
    }
    setImgTouchStart(null);
  };

  const nextImage = () => {
    if (request.images) {
      setCurrentImageIndex((prev) => (prev + 1) % request.images!.length);
    }
  };
  const prevImage = () => {
    if (request.images) {
      setCurrentImageIndex((prev) =>
        (prev - 1 + request.images!.length) % request.images!.length
      );
    }
  };

  // AI Text Generation
  const handleAIGenerate = () => {
    if (!aiInput.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setOfferPrice("450");
      setOfferDuration("يومين");
      setOfferCity("الرياض");
      setOfferDescription(
        `بناءً على طلبك "${request.title}"، يسعدني تقديم عرضي.\n\nيمكنني إنجاز العمل المطلوب بجودة عالية. تفاصيلي: ${aiInput}`,
      );
      setShowAIAssist(false);
      setAiInput("");
    }, 1500);
  };

  // Voice Input Logic
  const toggleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      if ("webkitSpeechRecognition" in window) {
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = "ar-SA";
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setAiInput((prev) => prev + " " + transcript);
          setIsListening(false);
        };
        recognition.start();
      } else {
        alert("المتصفح لا يدعم التعرف الصوتي");
        setIsListening(false);
      }
    }
  };

  const requestAuthorId = request.author;
  const isMyRequest = !!user?.id && requestAuthorId === user.id;
  const isMyOffer = !!myOffer;
  const [isArchiving, setIsArchiving] = useState(false);

  // Debug: Log isMyRequest and mode
  useEffect(() => {
    /* logger.log(
      `🔍 RequestDetail: isMyRequest check for request ${
        request.id.slice(-4)
      }:`,
      {
        requestId: request.id.slice(-4),
        userId: user?.id?.slice(-4),
        requestAuthorId: requestAuthorId?.slice(-4),
        isMyRequest,
        mode,
        willShowOffersSection: isMyRequest,
      },
    ); */
  }, [request.id, user?.id, requestAuthorId, isMyRequest, mode]);

  // ✅ 1. useEffect منفصل لتحديث loadedOffers من receivedOffersMap (Real-time updates)
  useEffect(() => {
    if (!receivedOffersMap) return;

    const offersFromMap = receivedOffersMap.get(request.id) || [];

    if (offersFromMap.length > 0) {
      // مقارنة ذكية لتجنب تحديث غير ضروري (تجنب Infinite Loop)
      const currentIds = loadedOffers.map((o) => o.id).sort().join(",");
      const mapIds = offersFromMap.map((o) => o.id).sort().join(",");
      const currentStatuses = loadedOffers.map((o) => o.status).sort().join(
        ",",
      );
      const mapStatuses = offersFromMap.map((o) => o.status).sort().join(",");

      // تحديث فقط إذا كانت العروض مختلفة
      // دمج ذكي: إذا كان loadedOffers يحتوي على عروض ليست في receivedOffersMap، نحتفظ بها
      if (currentIds !== mapIds || currentStatuses !== mapStatuses) {
        // دمج العروض: نحتفظ بالعروض في loadedOffers التي ليست في receivedOffersMap
        const mapOfferIds = new Set(offersFromMap.map((o) => o.id));
        const uniqueLocalOffers = loadedOffers.filter(
          (o) => !mapOfferIds.has(o.id),
        );
        const mergedOffers = [...offersFromMap, ...uniqueLocalOffers];

        // ترتيب حسب التاريخ (الأحدث أولاً)
        mergedOffers.sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });

        setLoadedOffers(mergedOffers);
        setIsLoadingOffers(false);
      }
    }
  }, [request.id, receivedOffersMap, loadedOffers]); // نراقب التغييرات في الخريطة

  // ✅ 2. useEffect الرئيسي لتحميل العروض من قاعدة البيانات (Initial Fetch)
  useEffect(() => {
    const isArchived = request.status === "archived";

    // قراءة offers من receivedOffersMap مرة واحدة (لا تعتمد عليها في dependency لتجنب Loops)
    const offersFromMap = receivedOffersMap?.get(request.id) || [];

    // إذا كانت العروض موجودة بالفعل في الخريطة، تم التعامل معها في useEffect الأول
    if (offersFromMap.length > 0) {
      return;
    }

    // التحقق مما إذا كانت العروض موجودة بالفعل (لتجنب الجلب المتكرر)
    const hasExistingOffers =
      (request.offers?.length || 0) + (loadedOffers?.length || 0) > 0;

    if (
      isMyRequest &&
      user?.id &&
      !hasExistingOffers &&
      !isLoadingOffers &&
      !isArchived
    ) {
      // logger.log(
      //   "📥 RequestDetail: Loading offers for request from database:",
      //   request.id.slice(-4),
      // );
      setIsLoadingOffers(true);
      fetchOffersForRequest(request.id)
        .then((offers) => {
          setLoadedOffers(offers);
        })
        .catch((error) => {
          logger.error("❌ RequestDetail: خطأ في تحميل العروض:", error);
          setLoadedOffers([]);
        })
        .finally(() => {
          setIsLoadingOffers(false);
        });
    }
    // ملاحظة: قمنا بإزالة setLoadedOffers([]) التلقائي لأنه كان يسبب Infinite Loops
  }, [
    isMyRequest,
    user?.id,
    request.id,
    request.offers?.length,
    isLoadingOffers,
    request.status,
    loadedOffers.length, // نراقب الطول فقط بدلاً من الخريطة كاملة
  ]);

  // Scroll state for glass header animation
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollPosRef = useRef<number>(0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolled(container.scrollTop > 20);
      lastScrollPosRef.current = container.scrollTop;

      // Debounce scroll position save
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        if (onScrollPositionChange) {
          onScrollPositionChange(lastScrollPosRef.current);
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
  }, [onScrollPositionChange]);

  // Always scroll to top when opening/opening again the request
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      // Use requestAnimationFrame to ensure container is fully rendered
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      });
    }
  }, [request.id]); // Scroll to top whenever request changes

  // Track previous form values to prevent infinite loop
  const prevFormRef = useRef<
    {
      price: string;
      duration: string;
      city: string;
      title: string;
      description: string;
      guestVerificationStep: "none" | "phone" | "otp";
      guestPhone: string;
      guestOTP: string;
    } | null
  >(null);

  // Save offer form when it changes
  useEffect(() => {
    const currentForm = {
      price: offerPrice,
      duration: offerDuration,
      city: offerCity,
      title: offerTitle,
      description: offerDescription,
      guestVerificationStep: guestOfferVerificationStep,
      guestPhone: guestOfferPhone,
      guestOTP: guestOfferOTP,
    };

    // Check if values actually changed
    const hasChanged = !prevFormRef.current ||
      prevFormRef.current.price !== currentForm.price ||
      prevFormRef.current.duration !== currentForm.duration ||
      prevFormRef.current.city !== currentForm.city ||
      prevFormRef.current.title !== currentForm.title ||
      prevFormRef.current.description !== currentForm.description ||
      prevFormRef.current.guestVerificationStep !==
        currentForm.guestVerificationStep ||
      prevFormRef.current.guestPhone !== currentForm.guestPhone ||
      prevFormRef.current.guestOTP !== currentForm.guestOTP;

    if (onOfferFormChange && hasChanged) {
      onOfferFormChange({
        price: offerPrice,
        duration: offerDuration,
        city: offerCity,
        title: offerTitle,
        description: offerDescription,
        attachments: [],
        guestVerificationStep: guestOfferVerificationStep,
        guestPhone: guestOfferPhone,
        guestOTP: guestOfferOTP,
      });
      // Update ref after calling callback
      prevFormRef.current = currentForm;
    }
  }, [
    offerPrice,
    offerDuration,
    offerCity,
    offerTitle,
    offerDescription,
    guestOfferVerificationStep,
    guestOfferPhone,
    guestOfferOTP,
    onOfferFormChange,
  ]);

  // View count state
  const [viewCount, setViewCount] = useState<number>(0);

  // Mark request as viewed and increment view count when component mounts
  useEffect(() => {
    if (request?.id && !isGuest && user?.id) {
      // For registered users, mark as viewed in their personal view history
      markRequestAsViewed(request.id).then((success) => {
        if (success && onRequestViewed) {
          // Update badges immediately after marking as viewed
          onRequestViewed(request.id);
        }
      });

      // For everyone (including guests), increment the public view count
      incrementRequestViews(request.id).then((result) => {
        if (result.success) {
          setViewCount(result.viewCount);
        }
      });
    } else if (request?.id) {
      // For guests, just increment the public view count
      incrementRequestViews(request.id).then((result) => {
        if (result.success) {
          setViewCount(result.viewCount);
        }
      });
    }
  }, [request?.id, user?.id, isGuest, onRequestViewed]);

  // Mark request as read when user opens it (immediately on mount)
  useEffect(() => {
    if (!request?.id || !user?.id || isGuest) return;

    // Mark as read immediately when request detail is opened
    markRequestAsRead(request.id).then((success) => {
      if (success && onMarkRequestAsRead) {
        onMarkRequestAsRead(request.id);
      }
    });
  }, [request?.id, user?.id, isGuest, onMarkRequestAsRead]);

  // Handler to submit offer from header button
  const handleSubmitOfferFromHeader = useCallback(async () => {
    // Validate required fields
    const isPriceValid = offerPrice && offerPrice.trim() !== "";
    const isTitleValid = offerTitle && offerTitle.trim() !== "";

    if (!isPriceValid || !isTitleValid) {
      setShakingFields({
        price: !isPriceValid,
        title: !isTitleValid,
      });
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 100]);
      }
      setTimeout(() => {
        setShakingFields({ price: false, title: false });
      }, 600);
      return;
    }

    if (isGuest) {
      setGuestOfferVerificationStep("phone");
    } else {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        alert("يرجى تسجيل الدخول أولاً");
        return;
      }

      // التحقق من أن المستخدم لا يقدم عرض على طلبه الخاص
      const requestAuthorId = request.author;
      if (requestAuthorId && userData.user.id === requestAuthorId) {
        alert("لا يمكنك تقديم عرض على طلبك الخاص");
        return;
      }

      setIsSubmittingOffer(true);

      try {
        let uploadedImageUrls: string[] = [];
        if (offerAttachments.length > 0) {
          setIsUploadingAttachments(true);
          const tempId = `${userData.user.id}-${Date.now()}`;
          uploadedImageUrls = await uploadOfferAttachments(
            offerAttachments,
            tempId,
          );
          setIsUploadingAttachments(false);
        }

        const result = await createOffer({
          requestId: request.id,
          providerId: userData.user.id,
          title: offerTitle.trim(),
          description: offerDescription.trim() || undefined,
          price: offerPrice.trim(),
          deliveryTime: offerDuration.trim() || undefined,
          location: offerCity.trim() || undefined,
          isNegotiable,
          images: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
        });

        if (result) {
          if (navigator.vibrate) {
            navigator.vibrate([30, 50, 30]);
          }
          setOfferSubmitted(true);
          if (onOfferCreated) {
            onOfferCreated();
          }
          setOfferPrice("");
          setOfferTitle("");
          setOfferDescription("");
          setOfferDuration("");
          setOfferCity("");
          setOfferAttachments([]);
          setSelectedImageUrls([]);
          setSearchedImages([]);
          setSelectedSearchImages(new Set());
          setTimeout(() => {
            setOfferSubmitted(false);
          }, 2000);
        } else {
          alert("حدث خطأ في إرسال العرض. حاول مرة أخرى.");
        }
      } catch (err: any) {
        logger.error("Submit offer error:", err, "service");
        const errorMessage = err?.message || err?.error?.message ||
          "حدث خطأ في إرسال العرض. حاول مرة أخرى.";
        console.error("Full error details:", err);
        alert(
          `حدث خطأ في إرسال العرض:\n${errorMessage}\n\nتحقق من Console لمزيد من التفاصيل.`,
        );
      } finally {
        setIsSubmittingOffer(false);
        setIsUploadingAttachments(false);
      }
    }
  }, [
    offerPrice,
    offerTitle,
    offerDescription,
    offerDuration,
    offerCity,
    isNegotiable,
    offerAttachments,
    isGuest,
    request.id,
    onOfferCreated,
  ]);

  // Handler to scroll to offer section
  const handleScrollToOfferSection = useCallback(() => {
    const container = scrollContainerRef.current;
    const target = offerSectionRef.current;
    if (container && target) {
      // Calculate target position relative to the scroll container accurately
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const relativeTop = targetRect.top - containerRect.top +
        container.scrollTop;

      // Offset by 70px (header height approx 64px + small gap)
      container.scrollTo({
        top: relativeTop - 70,
        behavior: "smooth",
      });
      setShowOfferPulse(true);
      // Hide pulse after animation
      setTimeout(() => setShowOfferPulse(false), 2000);
    }
  }, []);

  // Scroll to offer section and show pulse animation
  useEffect(() => {
    if (isMyRequest) return;
    if (
      scrollToOfferSection && offerSectionRef.current &&
      scrollContainerRef.current
    ) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        handleScrollToOfferSection();
      }, 500); // Slightly more delay to ensure layout is stable
    }
  }, [scrollToOfferSection, handleScrollToOfferSection, isMyRequest]);

  // Scroll to highlighted offer with flash animation
  useEffect(() => {
    if (highlightOfferId && scrollContainerRef.current) {
      // Wait for the offers to render
      setTimeout(() => {
        const offerElement = document.getElementById(
          `offer-${highlightOfferId}`,
        );
        if (offerElement && scrollContainerRef.current) {
          // Scroll the offer into view
          const containerRect = scrollContainerRef.current
            .getBoundingClientRect();
          const offerRect = offerElement.getBoundingClientRect();
          const scrollTop = scrollContainerRef.current.scrollTop +
            offerRect.top - containerRect.top - 100;

          scrollContainerRef.current.scrollTo({
            top: scrollTop,
            behavior: "smooth",
          });
        }
      }, 600);
    }
  }, [highlightOfferId]);

  // Offer section continuous pulse when NOT visible
  useEffect(() => {
    if (
      mode === "offers" && !isMyRequest && !isMyOffer &&
      request.status === "active"
    ) {
      // Show pulse only when section is not visible
      setShowOfferPulse(!isOfferSectionVisible);
    } else {
      setShowOfferPulse(false);
    }
  }, [mode, isMyRequest, isMyOffer, request.status, isOfferSectionVisible]);

  // Track offer section visibility with IntersectionObserver
  // Only hide the header button when the offer section is near the top of the viewport
  // This means the button stays visible until user scrolls down enough that the offer section
  // takes up most of the visible area
  useEffect(() => {
    if (!offerSectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // The section is "active" when it's in the upper portion of the viewport
          // With -60% bottom margin, the section needs to be in the top 40% of viewport
          setIsOfferSectionVisible(entry.isIntersecting);
        });
      },
      {
        threshold: 0.1,
        // Top: -80px for header, Bottom: -60% means section must be in upper 40% of viewport
        rootMargin: "-80px 0px -60% 0px",
      },
    );

    observer.observe(offerSectionRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleEditRequest = () => {
    if (setPreviousView) {
      setPreviousView("request-detail");
    }
    // تمرير الطلب للتعديل
    if (onEditRequest) {
      onEditRequest(request);
    }
    setView("create-request");
  };

  const handleArchiveClick = async () => {
    if (!onArchiveRequest) return;
    const confirmDelete = window.confirm(
      "سيتم حذف/أرشفة هذا الطلب. هل أنت متأكد؟",
    );
    if (!confirmDelete) return;
    setIsArchiving(true);
    try {
      await onArchiveRequest(request.id);
      onBack();
    } finally {
      setIsArchiving(false);
    }
  };

  const [isBumping, setIsBumping] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [isUnhiding, setIsUnhiding] = useState(false);

  const handleBumpRequest = async () => {
    if (!onBumpRequest) return;
    setIsBumping(true);
    try {
      await onBumpRequest(request.id);
      // سيتم تحديث request من خلال App.tsx
    } catch (error) {
      logger.error("Failed to bump request:", error, "service");
    } finally {
      setIsBumping(false);
    }
  };

  const handleHideRequest = async () => {
    if (!onHideRequest) return;
    setIsHiding(true);
    try {
      await onHideRequest(request.id);
    } catch (error) {
      logger.error("Failed to hide request:", error, "service");
    } finally {
      setIsHiding(false);
    }
  };

  const handleUnhideRequest = async () => {
    if (!onUnhideRequest) return;
    setIsUnhiding(true);
    try {
      await onUnhideRequest(request.id);
    } catch (error) {
      logger.error("Failed to unhide request:", error, "service");
    } finally {
      setIsUnhiding(false);
    }
  };

  // Voice recording timer for chat
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecordingVoice) {
      setRecordingTimeVoice(0);
      interval = setInterval(() => {
        setRecordingTimeVoice((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecordingVoice]);

  // Voice recording functions for chat
  const startRecordingVoiceChat = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("التسجيل الصوتي غير مدعوم في هذا المتصفح");
      return;
    }

    if (isRecordingVoice || recordedAudioUrlChat) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: "audio/webm" });
          setRecordedAudioBlobChat(blob);
          setRecordedAudioUrlChat(URL.createObjectURL(blob));
        }
      };

      recorder.start();
      setChatMediaRecorder(recorder);
      setIsRecordingVoice(true);
    } catch (error) {
      logger.error("Error starting voice recording:", error, "service");
      alert("حدث خطأ في بدء التسجيل");
    }
  };

  const stopRecordingVoiceChat = () => {
    if (chatMediaRecorder && isRecordingVoice) {
      chatMediaRecorder.stop();
      setIsRecordingVoice(false);
      setChatMediaRecorder(null);
    }
  };

  const cancelRecordingVoiceChat = () => {
    if (chatMediaRecorder && isRecordingVoice) {
      chatMediaRecorder.stop();
    }
    setIsRecordingVoice(false);
    setChatMediaRecorder(null);
    setRecordingTimeVoice(0);
    setRecordedAudioBlobChat(null);
    if (recordedAudioUrlChat) {
      URL.revokeObjectURL(recordedAudioUrlChat);
    }
    setRecordedAudioUrlChat(null);
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendChat = async () => {
    const hasContent = chatMessage.trim() || recordedAudioBlobChat;
    if (!hasContent || !user?.id || isSendingChat) {
      logger.warn("Cannot send chat message:", {
        hasContent,
        hasUser: !!user?.id,
        isSendingChat,
      });
      return;
    }

    setIsSendingChat(true);

    // Safety timeout: reset isSendingChat after 30 seconds
    const timeoutId = setTimeout(() => {
      logger.warn("Message send timeout - resetting isSendingChat state");
      setIsSendingChat(false);
    }, 30000);

    try {
      let otherUserId = "";
      let currentOfferId = activeOfferId;

      // Use currentConversation if available (faster path)
      if (currentConversation) {
        let audioUrl: string | undefined;
        let audioDuration: number | undefined;

        // Upload voice message if any
        if (recordedAudioBlobChat) {
          try {
            const voiceResult = await uploadVoiceMessage(
              recordedAudioBlobChat,
              currentConversation.id,
              recordingTimeVoice,
            );
            if (voiceResult) {
              audioUrl = voiceResult.url;
              audioDuration = voiceResult.duration;
            } else {
              clearTimeout(timeoutId);
              logger.warn("Failed to upload voice message");
              alert("فشل رفع الرسالة الصوتية. يرجى المحاولة مرة أخرى.");
              setIsSendingChat(false);
              return;
            }
          } catch (voiceError) {
            clearTimeout(timeoutId);
            logger.error(
              "Error uploading voice message:",
              voiceError,
              "service",
            );
            alert("فشل رفع الرسالة الصوتية. يرجى المحاولة مرة أخرى.");
            setIsSendingChat(false);
            return;
          }
        }

        // Send message with optional audio
        // Allow empty content if there's audio
        const messageContent = chatMessage.trim() || (audioUrl ? "" : "");
        if (!messageContent && !audioUrl) {
          clearTimeout(timeoutId);
          logger.warn("Cannot send empty message without audio");
          setIsSendingChat(false);
          return;
        }

        // Optimistic UI Update
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: Message = {
          id: tempId,
          conversation_id: currentConversation.id,
          sender_id: user.id,
          content: messageContent,
          is_read: false,
          read_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          audio_url: audioUrl || null,
          audio_duration: audioDuration || null,
          message_type: audioUrl ? "audio" : "text",
          sender: {
            id: user.id,
            display_name: "أنا", // Will be updated with real profile later
            avatar_url: null,
          },
        };

        // Add optimistic message immediately
        setChatMessages((prev) => [...prev, optimisticMessage]);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 10);

        // Reset UI immediately
        setChatMessage("");
        if (recordedAudioUrlChat) URL.revokeObjectURL(recordedAudioUrlChat);
        setRecordedAudioBlobChat(null);
        setRecordedAudioUrlChat(null);
        setRecordingTimeVoice(0);

        const sentMessage = await sendMessage(
          currentConversation.id,
          messageContent,
          {
            audioUrl,
            audioDuration,
          },
        );

        clearTimeout(timeoutId);

        if (sentMessage) {
          setChatMessages((prev) =>
            prev.map((m) => m.id === tempId ? sentMessage : m)
          );
        } else {
          // Failure: Remove optimistic message
          setChatMessages((prev) => prev.filter((m) => m.id !== tempId));
          logger.warn("sendMessage returned null");
          alert("فشل إرسال الرسالة. يرجى المحاولة مرة أخرى.");
        }

        setIsSendingChat(false);
        return;
      }

      // Fallback: create conversation if not exists
      // Explicitly handle "My Requests" vs "My Offers" (Provider view)
      if (isMyRequest) {
        // Requester chatting with a provider
        if (!currentOfferId && request.accepted_offer_id) {
          currentOfferId = request.accepted_offer_id;
        }

        if (!currentOfferId) {
          clearTimeout(timeoutId);
          logger.error("No active offer ID for chat");
          setIsSendingChat(false);
          alert("لم يتم العثور على عرض نشط. يرجى المحاولة مرة أخرى.");
          return;
        }
        const offer = allOffers.find((o) => o.id === currentOfferId);
        if (offer) otherUserId = offer.providerId;
      } else {
        // Provider chatting with Requester
        otherUserId = request.author;
      }

      if (!otherUserId) {
        clearTimeout(timeoutId);
        logger.error("Could not determine chat participant");
        setIsSendingChat(false);
        alert("لم يتم العثور على الطرف الآخر. يرجى المحاولة مرة أخرى.");
        return;
      }

      const offerContextId = isMyRequest
        ? currentOfferId
        : (myOffer?.id || undefined);

      logger.log("Creating/getting conversation:", {
        otherUserId,
        requestId: request.id,
        offerId: offerContextId,
      });
      const conversation = await getOrCreateConversation(
        otherUserId,
        request.id,
        offerContextId || undefined,
      );

      if (!conversation) {
        clearTimeout(timeoutId);
        logger.error("Failed to get or create conversation");
        setIsSendingChat(false);
        alert("فشل في إنشاء المحادثة. يرجى المحاولة مرة أخرى.");
        return;
      }

      // Update currentConversation state
      setCurrentConversation(conversation);

      let audioUrl: string | undefined;
      let audioDuration: number | undefined;

      // Upload voice message if any
      if (recordedAudioBlobChat) {
        try {
          const voiceResult = await uploadVoiceMessage(
            recordedAudioBlobChat,
            conversation.id,
            recordingTimeVoice,
          );
          if (voiceResult) {
            audioUrl = voiceResult.url;
            audioDuration = voiceResult.duration;
          } else {
            clearTimeout(timeoutId);
            logger.warn("Failed to upload voice message");
            alert("فشل رفع الرسالة الصوتية. يرجى المحاولة مرة أخرى.");
            setIsSendingChat(false);
            return;
          }
        } catch (voiceError) {
          clearTimeout(timeoutId);
          logger.error("Error uploading voice message:", voiceError, "service");
          alert("فشل رفع الرسالة الصوتية. يرجى المحاولة مرة أخرى.");
          setIsSendingChat(false);
          return;
        }
      }

      // Send message with optional audio
      // Allow empty content if there's audio
      const messageContent = chatMessage.trim() || (audioUrl ? "" : "");
      if (!messageContent && !audioUrl) {
        clearTimeout(timeoutId);
        logger.warn("Cannot send empty message without audio");
        setIsSendingChat(false);
        return;
      }

      const sentMessage = await sendMessage(conversation.id, messageContent, {
        audioUrl,
        audioDuration,
      });

      clearTimeout(timeoutId);

      if (sentMessage) {
        logger.log("Message sent successfully:", sentMessage.id);
        setChatMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === sentMessage.id)) return prev;
          return [...prev, sentMessage];
        });
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);

        setChatMessage("");

        // Clear recorded audio
        if (recordedAudioUrlChat) {
          URL.revokeObjectURL(recordedAudioUrlChat);
        }
        setRecordedAudioBlobChat(null);
        setRecordedAudioUrlChat(null);
        setRecordingTimeVoice(0);
      } else {
        logger.warn(
          "sendMessage returned null - message may have failed to send",
        );
        alert("فشل إرسال الرسالة. يرجى المحاولة مرة أخرى.");
      }
    } catch (error) {
      clearTimeout(timeoutId);
      logger.error("Error sending chat message:", error, "service");
      console.error("Send chat error", error);
      alert("حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSendingChat(false);
    }
  };

  const dropdownItems: DropdownMenuItem[] = isMyRequest
    ? [
      {
        id: "refresh",
        label: isBumping ? "جاري التحديث..." : "تحديث الطلب",
        icon: (
          <RefreshCw size={16} className={isBumping ? "animate-spin" : ""} />
        ),
        onClick: handleBumpRequest,
        disabled: isBumping,
      },
      {
        id: "edit",
        label: "تعديل الطلب",
        icon: <Edit size={16} />,
        onClick: handleEditRequest,
      },
      {
        id: request.isPublic === false ? "unhide" : "hide",
        label: request.isPublic === false
          ? (isUnhiding ? "جاري الإظهار..." : "إظهار الطلب")
          : (isHiding ? "جاري الإخفاء..." : "إخفاء الطلب"),
        icon: request.isPublic === false
          ? <Eye size={16} />
          : <EyeOff size={16} />,
        onClick: request.isPublic === false
          ? handleUnhideRequest
          : handleHideRequest,
        disabled: isHiding || isUnhiding,
      },
      {
        id: "archive",
        label: isArchiving ? "جاري الأرشفة..." : "أرشفة الطلب",
        icon: <Archive size={16} />,
        onClick: handleArchiveClick,
        variant: "danger",
        disabled: isArchiving,
        showDivider: true,
      },
    ]
    : [
      {
        id: "copy-id",
        label: isIdCopied
          ? "✓ تم النسخ!"
          : `رقم الطلب: ${request.id.slice(0, 8)}...`,
        icon: isIdCopied
          ? <Check size={16} className="text-primary" />
          : <Copy size={16} />,
        keepOpenOnClick: true, // نبقي الـ dropdown مفتوح لإظهار التأكيد
        onClick: async () => {
          if (isIdCopied) return; // منع النقر المتكرر
          try {
            await navigator.clipboard.writeText(request.id);
            setIsIdCopied(true);
            // إغلاق الـ dropdown بعد تأخير بسيط
            setTimeout(() => {
              setIsIdCopied(false);
            }, 1500);
          } catch (err) {
            logger.error("Failed to copy ID:", err, "service");
          }
        },
      },
      {
        id: "share",
        label: "مشاركة الطلب",
        icon: <Share2 size={16} className="text-primary" />,
        onClick: handleShare,
        showDivider: true,
      },
      {
        id: "report",
        label: "الإبلاغ عن الطلب",
        icon: <Flag size={16} />,
        onClick: () => setIsReportModalOpen(true),
        variant: "danger",
        showDivider: true,
      },
    ];

  return (
    <motion.div
      key="request-detail"
      ref={scrollContainerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex-1 bg-background flex flex-col overflow-y-auto overflow-x-hidden"
    >
      {/* Unified Header */}
      <UnifiedHeader
        mode={mode}
        toggleMode={toggleMode}
        isModeSwitching={isModeSwitching}
        unreadCount={unreadCount}
        hasUnreadMessages={hasUnreadMessages}
        user={user}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        onOpenLanguagePopup={onOpenLanguagePopup}
        setView={setView}
        setPreviousView={setPreviousView}
        titleKey={titleKey}
        notifications={notifications}
        onMarkAsRead={onMarkAsRead}
        onNotificationClick={onNotificationClick}
        onClearAll={onClearAll}
        onSignOut={onSignOut}
        backButton
        onBack={onBack}
        showBackButtonOnDesktop={true}
        title={request.title}
        isScrolled={isScrolled}
        currentView="request-detail"
        showScrollToOffer={!isMyRequest && !isMyOffer &&
          request.status === "active"}
        onScrollToOffer={handleScrollToOfferSection}
        isOfferSectionVisible={isOfferSectionVisible}
        canSubmitOffer={!!(offerPrice && offerTitle)}
        onSubmitOffer={handleSubmitOfferFromHeader}
        isSubmittingOffer={isSubmittingOffer}
        offerSubmitSuccess={offerSubmitted}
        showMyRequestButton={isMyRequest}
        myRequestOffersCount={allOffers.length}
        onMyRequestClick={() => {
          // Scroll to top to see offers
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToSettings={onNavigateToSettings}
        showThreeDotsMenu={true}
        threeDotsMenuItems={dropdownItems}
      />

      {/* Spacer below header */}
      <div className="h-6" />

      <div className="container mx-auto max-w-5xl flex-1 flex flex-col md:flex-row gap-6 min-h-0 px-4">
        {/* Main Content (Left Side) */}
        <div className="flex-1 pb-20">
          {/* Hero Card Container */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-card rounded-2xl overflow-hidden shadow-sm mb-6 border border-border"
          >
            {/* Images Carousel */}
            {request.images && request.images.length > 0
              ? (
                <motion.div
                  layoutId={`image-${request.id}`}
                  className="relative h-64 w-full bg-secondary flex items-center justify-center overflow-hidden group touch-pan-y cursor-pointer"
                  ref={imageContainerRef}
                  onTouchStart={handleImgTouchStart}
                  onTouchEnd={handleImgTouchEnd}
                  onClick={() => setExpandedImageIndex(currentImageIndex)}
                >
                  <div
                    className="absolute inset-0 flex transition-transform duration-300 ease-out"
                    style={{
                      transform: `translateX(${currentImageIndex * 100}%)`,
                    }}
                  >
                    {request.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Image ${idx + 1}`}
                        className="w-full h-full object-cover flex-shrink-0 pointer-events-none select-none"
                        style={{ transform: `translateX(-${idx * 100}%)` }}
                      />
                    ))}
                  </div>

                  {/* Status Badge - Bottom Left */}
                  {request.status === "active" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute bottom-8 left-4 z-20"
                    >
                      {isMyRequest
                        ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-accent/15 text-accent-foreground border border-accent/25 backdrop-blur-md">
                            <Check
                              size={14}
                              strokeWidth={2.5}
                              className="text-accent"
                            />
                            <span>طلبك</span>
                          </div>
                        )
                        : isMyOffer
                        ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-card border border-border text-primary backdrop-blur-md">
                            <Check
                              size={14}
                              strokeWidth={2.5}
                              className="text-primary"
                            />
                            <span>لقد قدمت عرض</span>
                          </div>
                        )
                        : (
                          <Badge
                            variant="info"
                            size="lg"
                            className="backdrop-blur-md bg-white/20 dark:bg-white/10 border-primary/30 text-primary dark:text-primary"
                          >
                            ينتظر عرضك!
                          </Badge>
                        )}
                    </motion.div>
                  )}

                  {/* Translation Toggle */}
                  {autoTranslateRequests && (
                    <button
                      onClick={() => setIsShowingOriginal(!isShowingOriginal)}
                      className="absolute top-4 right-4 text-xs text-white/80 hover:text-white z-20 underline underline-offset-2 px-3 py-1 rounded-md bg-black/20 backdrop-blur-sm transition-colors"
                    >
                      {isShowingOriginal
                        ? `استعرض الطلب بـ${languageNames[currentLanguage]}`
                        : "استعرض الطلب باللغة الأصلية"}
                    </button>
                  )}

                  {request.images.length > 1 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <button
                        onClick={prevImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <ChevronRight size={20} />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-full">
                        {request.images.map((_, index) => (
                          <span
                            key={index}
                            className={`w-2 h-2 rounded-full transition-all shadow-sm ${
                              index === currentImageIndex
                                ? "bg-white scale-125"
                                : "bg-white/50"
                            }`}
                          >
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )
              : (
                <div className="relative h-64 w-full overflow-hidden">
                  {/* Simple Gray Background - Empty State */}
                  <div className="absolute inset-0 bg-muted/8" />

                  {/* Very Subtle Dashed Pattern - Slow Rain Animation */}
                  <motion.div
                    className="absolute -inset-20 opacity-[0.08]"
                    style={{
                      backgroundImage:
                        `repeating-linear-gradient(45deg, currentColor, currentColor 0.5px, transparent 0.5px, transparent 11.5px)`,
                      backgroundSize: "40px 40px",
                    }}
                    animate={{
                      backgroundPosition: ["0px 0px", "40px 40px"],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />

                  {/* Center Content - Call to Add Images */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    {/* Info Text - Simple */}
                    <div className="text-center px-4 space-y-1">
                      <p className="text-xs text-muted-foreground/80">
                        لا توجد صور توضيحية
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        اطلب تفاصيل أكثر من صاحب الطلب
                      </p>
                    </div>
                  </div>

                  {/* Status Badge - Bottom Left */}
                  {request.status === "active" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute bottom-8 left-4 z-20"
                    >
                      {isMyRequest
                        ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-accent/15 text-accent-foreground border border-accent/25 backdrop-blur-md">
                            <Check
                              size={14}
                              strokeWidth={2.5}
                              className="text-accent"
                            />
                            <span>طلبك</span>
                          </div>
                        )
                        : isMyOffer
                        ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-card border border-border text-primary backdrop-blur-md">
                            <Check
                              size={14}
                              strokeWidth={2.5}
                              className="text-primary"
                            />
                            <span>لقد قدمت عرض</span>
                          </div>
                        )
                        : (
                          <Badge
                            variant="info"
                            size="lg"
                            className="backdrop-blur-md bg-white/20 dark:bg-white/10 border-primary/30 text-primary dark:text-primary"
                          >
                            ينتظر عرضك!
                          </Badge>
                        )}
                    </motion.div>
                  )}

                  {/* Translation Toggle (No Images State) */}
                  {autoTranslateRequests && (
                    <button
                      onClick={() => setIsShowingOriginal(!isShowingOriginal)}
                      className="absolute top-4 right-4 text-xs text-white/80 hover:text-white z-20 underline underline-offset-2 px-3 py-1 rounded-md bg-black/20 backdrop-blur-sm transition-colors"
                    >
                      {isShowingOriginal
                        ? `استعرض الطلب بـ${languageNames[currentLanguage]}`
                        : "استعرض الطلب باللغة الأصلية"}
                    </button>
                  )}
                </div>
              )}

            <div className="p-6 border border-t-0 border-border rounded-b-xl">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col gap-4 mb-6 p-4 rounded-xl border"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(30, 150, 140, 0.08) 0%, rgba(30, 150, 140, 0.04) 50%, rgba(21, 54, 89, 0.08) 100%)",
                  borderColor: "rgba(30, 150, 140, 0.15)",
                }}
              >
                {/* Location - First Row */}
                <div className="flex flex-col gap-1.5 w-full">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium whitespace-nowrap">
                    <MapPin
                      size={18}
                      className="text-red-500"
                    />{" "}
                    الموقع
                  </span>
                  <span className="font-bold text-sm flex items-center gap-1.5 whitespace-nowrap">
                    {request.location && request.location !== "غير محدد"
                      ? (() => {
                        // Parse location: "حي النرجس، الرياض" or "الرياض"
                        const locationParts = request.location.split("،").map(
                          (s) => s.trim(),
                        );
                        const city = locationParts.length > 1
                          ? locationParts[locationParts.length - 1]
                          : locationParts[0];
                        const neighborhood = locationParts.length > 1
                          ? locationParts.slice(0, -1).join("، ")
                          : null;

                        return (
                          <>
                            <span>{city}</span>
                            {neighborhood && (
                              <>
                                <span className="text-muted-foreground/50 font-normal">
                                  •
                                </span>
                                <span className="text-muted-foreground font-normal">
                                  {neighborhood}
                                </span>
                              </>
                            )}
                          </>
                        );
                      })()
                      : <span className="text-muted-foreground">غير محدد</span>}
                    {/* Map Link Icon - Show when locationCoords exists */}
                    {request.locationCoords && request.location &&
                      request.location !== "غير محدد" && (
                      <a
                        href={`https://www.google.com/maps?q=${request.locationCoords.lat},${request.locationCoords.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-primary hover:text-primary/80 transition-colors"
                        title="فتح الموقع في خرائط جوجل"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={12} strokeWidth={2.5} />
                      </a>
                    )}
                  </span>
                </div>

                {/* Published Date / Last Updated - Second Row */}
                <div className="flex flex-col gap-1.5 w-full">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Calendar size={18} />{" "}
                    {request.updatedAt ? "آخر تحديث" : "تاريخ النشر"}
                  </span>
                  <div className="flex flex-col gap-1">
                    {request.updatedAt
                      ? (
                        <>
                          <span className="font-bold text-sm">
                            {formatTimeAgo(request.updatedAt, false)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            النشر: {formatTimeAgo(request.createdAt, false)}
                          </span>
                        </>
                      )
                      : (
                        <span className="font-bold text-sm">
                          {formatTimeAgo(request.createdAt, false)}
                        </span>
                      )}
                  </div>
                </div>

                {/* Budget - Third Row */}
                {(request.budgetMin || request.budgetMax) && (
                  <div className="flex flex-col gap-1.5 w-full">
                    <span
                      className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium cursor-pointer transition-colors hover:text-foreground"
                      onClick={() =>
                        setClickedIcons((prev) => ({
                          ...prev,
                          budget: !prev.budget,
                        }))}
                    >
                      <DollarSign
                        size={18}
                        className={clickedIcons.budget
                          ? "text-primary"
                          : "text-primary"}
                      />{" "}
                      الميزانية
                    </span>
                    <span className="font-bold text-sm text-primary">
                      {request.budgetMin && request.budgetMax
                        ? `${request.budgetMin} - ${request.budgetMax} ر.س`
                        : request.budgetMax
                        ? `حتى ${request.budgetMax} ر.س`
                        : `من ${request.budgetMin} ر.س`}
                    </span>
                  </div>
                )}

                {/* Delivery Time - Fourth Row */}
                {request.deliveryTimeFrom && (
                  <div className="flex flex-col gap-1.5 w-full">
                    <span
                      className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium cursor-pointer transition-colors hover:text-foreground"
                      onClick={() =>
                        setClickedIcons((prev) => ({
                          ...prev,
                          delivery: !prev.delivery,
                        }))}
                    >
                      <Clock
                        size={18}
                        className={clickedIcons.delivery
                          ? "text-primary"
                          : "text-primary"}
                      />{" "}
                      مدة التنفيذ
                    </span>
                    <span className="font-bold text-sm text-muted-foreground">
                      {request.deliveryTimeFrom}
                    </span>
                  </div>
                )}

                {/* Categories - Fifth Row (only for Marketplace and MyOffers, not MyRequests) */}
                {shouldShowCategories && (
                  <div className="flex flex-col gap-1.5 w-full">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                      <FileText size={18} /> التصنيفات
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {categoriesDisplay.map((cat) => (
                        <span
                          key={cat.key}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cat.color}`}
                        >
                          <CategoryIcon
                            icon={cat.icon}
                            emoji={cat.emoji}
                            size={12}
                          />
                          {cat.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available After - Sixth Row (only for my requests) */}
                {isMyRequest && request.status === "active" && (() => {
                  const lastUpdated = request.updatedAt
                    ? new Date(request.updatedAt)
                    : new Date(request.createdAt);
                  const sixHoursMs = 6 * 60 * 60 * 1000;
                  const elapsedSinceUpdate = Date.now() - lastUpdated.getTime();
                  const canBump = elapsedSinceUpdate >= sixHoursMs;
                  const bumpHoursLeft = Math.max(
                    0,
                    Math.ceil(
                      (sixHoursMs - elapsedSinceUpdate) / (60 * 60 * 1000),
                    ),
                  );

                  if (!canBump) {
                    return (
                      <div className="flex flex-col gap-1.5 w-full">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                          <RefreshCw size={18} className="text-primary" />{" "}
                          متاح بعد
                        </span>
                        <span className="font-bold text-sm text-muted-foreground">
                          {bumpHoursLeft} س
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="prose dark:prose-invert max-w-none text-lg leading-relaxed text-foreground/80"
              >
                <p className="whitespace-pre-line">{request.description}</p>
              </motion.div>
            </div>
          </motion.div>

          {/* ================= REQUESTER VIEW ================= */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {isMyRequest && (
              <div className="space-y-4">
                {/* Complete Request Button for Requester - After approving an offer */}
                {request.status === "assigned" && onCompleteRequest && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onCompleteRequest(request.id)}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-primary text-white font-bold shadow-lg hover:shadow-xl transition-all mb-4"
                  >
                    <CheckCircle size={20} />
                    <span>تم إكمال الطلب</span>
                  </motion.button>
                )}

                <h3 className="font-bold text-lg flex items-center gap-2">
                  {request.status === "assigned" ? <>العرض المعتمد</> : (
                    <>
                      العروض المستلمة
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-primary/10 text-primary px-1.5 text-[11px] font-bold">
                        {allOffers.length}
                      </span>
                    </>
                  )}
                </h3>
                {isLoadingOffers
                  ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center p-8 bg-card rounded-2xl border border-dashed"
                    >
                      <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
                      <p className="text-muted-foreground">
                        جاري تحميل العروض...
                      </p>
                    </motion.div>
                  )
                  : allOffers.length === 0
                  ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center p-8 bg-card rounded-2xl border border-dashed"
                    >
                      {/* Brand character for empty state */}
                      <motion.div
                        className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-brand flex items-center justify-center"
                        animate={{ scale: [1, 1.05, 1], rotate: [0, 3, -3, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <span className="text-2xl font-black text-white">
                          أ
                        </span>
                      </motion.div>
                      <p className="text-muted-foreground">لم تصلك عروض بعد</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        سنخبرك عند وصول العروض ✨
                      </p>
                    </motion.div>
                  )
                  : (
                    <motion.div
                      initial="hidden"
                      animate="show"
                      variants={{
                        hidden: { opacity: 0 },
                        show: {
                          opacity: 1,
                          transition: { staggerChildren: 0.1 },
                        },
                      }}
                      className="space-y-4"
                    >
                      {allOffers.map((offer, index) => (
                        <motion.div
                          key={offer.id}
                          id={`offer-${offer.id}`}
                          variants={{
                            hidden: { opacity: 0, y: 20, scale: 0.95 },
                            show: { opacity: 1, y: 0, scale: 1 },
                          }}
                          whileHover={{ scale: 1.01, y: -2 }}
                          animate={highlightOfferId === offer.id
                            ? {
                              boxShadow: [
                                "0 0 0 0 rgba(var(--primary-rgb), 0)",
                                "0 0 20px 4px rgba(var(--primary-rgb), 0.6)",
                                "0 0 30px 8px rgba(var(--primary-rgb), 0.4)",
                                "0 0 20px 4px rgba(var(--primary-rgb), 0.6)",
                                "0 0 0 0 rgba(var(--primary-rgb), 0)",
                              ],
                              scale: [1, 1.02, 1, 1.01, 1],
                              borderColor: [
                                "rgb(var(--border))",
                                "rgb(var(--primary))",
                                "rgb(var(--primary))",
                                "rgb(var(--primary))",
                                "rgb(var(--border))",
                              ],
                            }
                            : undefined}
                          transition={highlightOfferId === offer.id
                            ? {
                              duration: 2,
                              ease: "easeInOut",
                              times: [0, 0.25, 0.5, 0.75, 1],
                            }
                            : undefined}
                          className={`bg-card border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all relative ${
                            highlightOfferId === offer.id
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-border"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary cursor-pointer hover:bg-primary/20 transition-colors"
                                onClick={() => {
                                  if (
                                    offer.providerId && onNavigateToUserProfile
                                  ) {
                                    onNavigateToUserProfile(offer.providerId);
                                  }
                                }}
                                title="عرض ملف المزود الشخصي"
                              >
                                {offer.providerName.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      if (
                                        offer.providerId &&
                                        onNavigateToUserProfile
                                      ) {
                                        onNavigateToUserProfile(
                                          offer.providerId,
                                        );
                                      }
                                    }}
                                    className="font-bold text-sm hover:text-primary transition-colors cursor-pointer text-left"
                                    title="عرض ملف المزود الشخصي"
                                    data-provider-id={offer.providerId}
                                    data-provider-name={offer.providerName ||
                                      "مزود خدمة"}
                                    aria-label={`عرض ملف ${
                                      offer.providerName || "مزود خدمة"
                                    }`}
                                  >
                                    {offer.providerName || "مزود خدمة"}
                                  </button>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(offer.createdAt, "PP", {
                                    locale: ar,
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="font-bold text-primary">
                                {offer.price} ر.س
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {offer.deliveryTime}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg mb-3">
                            {offer.description}
                          </p>

                          {/* Offer Images */}
                          {offer.images && offer.images.length > 0 && (
                            <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
                              {offer.images.map((imageUrl, imgIndex) => (
                                <motion.img
                                  key={imgIndex}
                                  src={imageUrl}
                                  alt={`صورة ${imgIndex + 1}`}
                                  className="w-24 h-24 rounded-lg object-cover border border-border shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => {
                                    // يمكن إضافة modal لعرض الصورة بالحجم الكامل
                                    window.open(imageUrl, "_blank");
                                  }}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: imgIndex * 0.1 }}
                                />
                              ))}
                            </div>
                          )}

                          <div className="flex gap-3">
                            {/* PENDING ACTIONS */}
                            {getEffectiveOfferStatus(offer) === "pending" && (
                              <>
                                {/* 1. Accept Button (Appears Right in RTL because it's first) */}
                                <Button
                                  size="sm"
                                  className="flex-1 bg-primary hover:bg-primary/90 text-white shadow-sm h-10 text-sm font-bold disabled:opacity-50"
                                  onClick={() => handleAcceptOffer(offer.id)}
                                  disabled={isAcceptingOffer || isGuest}
                                >
                                  {isAcceptingOffer
                                    ? (
                                      <Loader2
                                        size={18}
                                        className="animate-spin ml-2"
                                      />
                                    )
                                    : null}
                                  قبول العرض
                                </Button>

                                {/* Negotiation Button/Badge */}
                                {offer.isNegotiable
                                  ? (
                                    <Button
                                      size="sm"
                                      className="flex-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-transparent h-10 text-sm font-bold shadow-sm disabled:opacity-70"
                                      onClick={() =>
                                        handleStartNegotiation(offer.id)}
                                      disabled={isStartingNegotiation ||
                                        isGuest}
                                    >
                                      {isStartingNegotiation
                                        ? (
                                          <Loader2
                                            size={18}
                                            className="animate-spin ml-2"
                                          />
                                        )
                                        : (
                                          <MessageCircle
                                            size={18}
                                            className="ml-2"
                                          />
                                        )} بدء التفاوض
                                    </Button>
                                  )
                                  : (
                                    <Button
                                      size="sm"
                                      disabled
                                      className="flex-1 bg-orange-100 text-orange-700 border-transparent h-10 text-sm font-bold shadow-sm disabled:opacity-100 hover:bg-orange-100 cursor-not-allowed"
                                    >
                                      <Lock size={18} className="ml-2" />
                                      غير قابل للتفاوض
                                    </Button>
                                  )}
                              </>
                            )}

                            {/* عرض رسائل الأخطاء */}
                            {acceptOfferError && (
                              <div className="w-full mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                                <AlertCircle size={14} />
                                {acceptOfferError}
                              </div>
                            )}
                            {startNegotiationError && (
                              <div className="w-full mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                                <AlertCircle size={14} />
                                {startNegotiationError}
                              </div>
                            )}

                            {/* NEGOTIATING ACTIONS */}
                            {getEffectiveOfferStatus(offer) === "negotiating" &&
                              (
                                <>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="relative flex-1 border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 h-10 overflow-visible"
                                    onClick={() => {
                                      setActiveOfferId(offer.id);
                                      setNegotiationOpen(true);
                                    }}
                                  >
                                    <div className="inline-flex items-center justify-center gap-2">
                                      <MessageSquare
                                        size={18}
                                        className="ml-2"
                                      />{" "}
                                      متابعة التفاوض
                                      {unreadMessagesPerOffer?.has(offer.id) &&
                                        (unreadMessagesPerOffer.get(offer.id) ||
                                            0) > 0 &&
                                        (
                                          <motion.span
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white text-[11px] font-bold shadow-md border border-red-400/30 dark:border-red-700/50 ring-2 ring-red-500/20 dark:ring-red-500/30"
                                          >
                                            {unreadMessagesPerOffer.get(
                                                offer.id,
                                              )! > 99
                                              ? "99+"
                                              : unreadMessagesPerOffer.get(
                                                offer.id,
                                              )}
                                          </motion.span>
                                        )}
                                    </div>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="success"
                                    className="flex-1 shadow-sm h-10 disabled:opacity-50"
                                    onClick={() => handleAcceptOffer(offer.id)}
                                    disabled={isAcceptingOffer || isGuest}
                                  >
                                    {isAcceptingOffer
                                      ? (
                                        <Loader2
                                          size={18}
                                          className="animate-spin ml-2"
                                        />
                                      )
                                      : null}
                                    قبول العرض
                                  </Button>
                                </>
                              )}

                            {/* ACCEPTED STATUS - Enhanced with contact options */}
                            {getEffectiveOfferStatus(offer) === "accepted" && (
                              <div className="w-full space-y-3">
                                {/* Status Badge */}
                                <div className="bg-primary/10 text-primary rounded-lg text-sm font-bold flex items-center justify-center gap-2 border border-primary/20 px-4 py-2.5">
                                  <CheckCircle size={20} /> ✅ العرض مقبول
                                </div>

                                {/* Contact Buttons */}
                                <div className="flex items-center gap-2">
                                  {/* WhatsApp Button - Show if request has whatsappNumber */}
                                  {request.whatsappNumber &&
                                    (request.contactMethod === "whatsapp" ||
                                      request.contactMethod === "both" ||
                                      request.isCreatedViaWhatsApp) &&
                                    (
                                      <Button
                                        size="sm"
                                        className="flex-1 bg-primary hover:bg-primary/90 text-white h-10"
                                        onClick={() =>
                                          window.open(
                                            `https://wa.me/${request.whatsappNumber}`,
                                            "_blank",
                                          )}
                                      >
                                        <svg
                                          className="w-4 h-4 ml-2"
                                          viewBox="0 0 24 24"
                                          fill="currentColor"
                                        >
                                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                        </svg>
                                        تواصل واتساب
                                      </Button>
                                    )}

                                  {/* In-App Chat Button - Show if contact method allows chat */}
                                  {(!request.isCreatedViaWhatsApp &&
                                    (request.contactMethod === "chat" ||
                                      request.contactMethod === "both" ||
                                      !request.contactMethod)) && (
                                    <Button
                                      size="sm"
                                      className="flex-1 bg-primary hover:bg-primary/90 h-10"
                                      onClick={() => {
                                        setActiveOfferId(offer.id);
                                        setNegotiationOpen(true);
                                      }}
                                    >
                                      <MessageCircle
                                        size={18}
                                        className="ml-2"
                                      />
                                      محادثة داخلية
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                {/* COMPLETED STATUS - Add Review Button */}
                {request.status === "completed" && (
                  <div className="w-full space-y-3 mt-4">
                    <div className="bg-green-500/10 text-green-600 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border border-green-500/20 px-4 py-3">
                      <CheckCircle size={20} /> تم إكمال الطلب بنجاح
                    </div>

                    {canReview && (
                      <Button
                        size="lg"
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white shadow-md animate-in fade-in zoom-in duration-3000"
                        onClick={() => setShowReviewForm(true)}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Star size={20} className="fill-white" />
                          <span>تقييم مقدم الخدمة</span>
                        </div>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Review Form Modal */}
            <ReviewForm
              isOpen={showReviewForm}
              onClose={() => setShowReviewForm(false)}
              requestId={request.id}
              // For Requester: We need the provider's ID.
              // We have `request.accepted_offer_id`. We can find the offer in `receivedOffersMap` or `loadedOffers`.
              revieweeId={isMyRequest
                ? (loadedOffers.find((o) => o.id === request.acceptedOfferId)
                  ?.providerId ||
                  Array.from(receivedOffersMap.values()).flat().find((o) =>
                    o.id === request.acceptedOfferId
                  )?.providerId || "")
                : request.author}
              reviewerId={user?.id || ""}
              onSuccess={() => {
                setShowReviewForm(false);
                setCanReview(false); // Hide button after review
                // Maybe refresh reviews?
              }}
              reviewerName={user?.display_name || "مستخدم"}
              requestTitle={request.title}
            />

            {!isMyRequest && (
              <>
                {/* CASE 1: I ALREADY HAVE AN OFFER */}
                {isMyOffer && myOffer && (
                  <div className="space-y-4 mt-4">
                    {/* Negotiation Started Alert - Show when requester started negotiation */}
                    {myOffer.status === "negotiating" && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200 dark:border-blue-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <MessageCircle
                              size={20}
                              className="text-primary dark:text-primary"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-primary text-sm">
                              🎉 صاحب الطلب بدأ التفاوض معك!
                            </h4>
                            <p className="text-xs text-primary/80 dark:text-primary/70 mt-0.5">
                              يمكنك الآن التواصل والتفاوض على التفاصيل
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Complete Request Button - Only for accepted offers */}
                    {myOffer.status === "accepted" &&
                      request.status === "assigned" && onCompleteRequest && (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onCompleteRequest(request.id)}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-primary text-white font-bold shadow-lg hover:shadow-xl transition-all"
                      >
                        <CheckCircle size={20} />
                        <span>تم إكمال الطلب</span>
                      </motion.button>
                    )}

                    {/* WhatsApp Button - Only for negotiating/accepted (when available) */}
                    {(myOffer.status === "negotiating" ||
                      myOffer.status === "accepted") &&
                      request.whatsappNumber &&
                      (request.contactMethod === "whatsapp" ||
                        request.contactMethod === "both" ||
                        request.isCreatedViaWhatsApp) &&
                      (
                        <Button
                          size="sm"
                          className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white gap-2 h-10"
                          onClick={() =>
                            window.open(
                              `https://wa.me/${request.whatsappNumber}`,
                              "_blank",
                            )}
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                          واتساب
                        </Button>
                      )}

                    {/* My Offer Box - Clean Design */}
                    <div className="bg-card border border-border rounded-xl p-5 pt-6 shadow-sm relative">
                      {/* Header with Floating Status */}
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-primary">
                          <FileText size={14} />
                          <span className="text-sm font-bold">تفاصيل عرضي</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Status Badge */}
                          {(() => {
                            const status = myOffer?.status || "pending";
                            let badgeClass = "";
                            let icon = null;
                            let text = "";

                            switch (status) {
                              case "accepted":
                                badgeClass =
                                  "bg-primary/10 text-primary border-primary/30";
                                icon = <CheckCircle size={14} />;
                                text = "عرض مقبول";
                                break;
                              case "negotiating":
                                badgeClass =
                                  "bg-primary/10 text-primary border-primary/30";
                                icon = <MessageCircle size={14} />;
                                text = "جاري التفاوض";
                                break;
                              case "pending":
                                badgeClass =
                                  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
                                icon = <Clock size={14} />;
                                text = "قيد الانتظار";
                                break;
                              case "completed":
                                badgeClass =
                                  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
                                icon = <CheckCircle size={14} />;
                                text = "مكتمل";
                                break;
                              case "rejected":
                                badgeClass =
                                  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
                                icon = <X size={14} />;
                                text = "منتهي";
                                break;
                              case "cancelled":
                                badgeClass =
                                  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
                                icon = <X size={14} />;
                                text = "ملغى";
                                break;
                              default:
                                badgeClass =
                                  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
                                icon = <Clock size={14} />;
                                text = "قيد الانتظار";
                            }

                            return (
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${badgeClass}`}
                              >
                                {icon}
                                {text}
                              </span>
                            );
                          })()}

                          {/* Three Dots Menu */}
                          {myOffer.status === "pending" && (
                            <DropdownMenu
                              trigger={
                                <button className="p-1 hover:bg-secondary/80 rounded transition-colors text-muted-foreground hover:text-foreground">
                                  <MoreVertical size={14} strokeWidth={2.5} />
                                </button>
                              }
                              items={[
                                {
                                  id: "cancel",
                                  label: "حذف العرض",
                                  icon: <Trash2 size={16} />,
                                  onClick: () => setShowCancelConfirm(true),
                                  variant: "danger",
                                },
                              ]}
                            />
                          )}
                        </div>
                      </div>

                      {/* Offer Title */}
                      {myOffer?.title && (
                        <div className="mb-4">
                          <h4 className="text-base font-bold text-foreground break-words">
                            {myOffer.title}
                          </h4>
                        </div>
                      )}

                      {/* Info Grid - Same Layout as Request Info */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 rounded-xl border"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(30, 150, 140, 0.08) 0%, rgba(30, 150, 140, 0.04) 50%, rgba(21, 54, 89, 0.08) 100%)",
                          borderColor: "rgba(30, 150, 140, 0.15)",
                        }}
                      >
                        {/* Price - First */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                            <DollarSign size={18} className="text-primary" />
                            {" "}
                            السعر
                          </span>
                          <span className="font-bold text-sm text-primary">
                            {myOffer.price} ر.س
                          </span>
                        </div>

                        {/* Duration - Second */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                            <Clock size={18} className="text-primary" /> المدة
                          </span>
                          <span className="font-bold text-sm">
                            {myOffer.deliveryTime}
                          </span>
                        </div>

                        {/* Location - Third (if exists) */}
                        {myOffer.location
                          ? (
                            <div className="flex flex-col gap-1.5">
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                                <MapPin size={18} className="text-red-500" />
                                {" "}
                                الموقع
                              </span>
                              <span className="font-bold text-sm">
                                {myOffer.location}
                              </span>
                            </div>
                          )
                          : (
                            <div className="flex flex-col gap-1.5">
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                                <MapPin size={18} className="text-red-500" />
                                {" "}
                                الموقع
                              </span>
                              <span className="font-bold text-sm text-muted-foreground">
                                غير محدد
                              </span>
                            </div>
                          )}

                        {/* Negotiable Status - Fourth */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                            {myOffer.status === "negotiating"
                              ? (
                                <MessageCircle
                                  size={18}
                                  className="text-primary"
                                />
                              )
                              : myOffer.isNegotiable
                              ? <RefreshCw size={18} className="text-primary" />
                              : (
                                <Lock
                                  size={18}
                                  className="text-muted-foreground/50"
                                />
                              )} التفاوض
                          </span>
                          <span
                            className={`font-bold text-sm ${
                              myOffer.status === "negotiating" ||
                                myOffer.isNegotiable
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          >
                            {myOffer.status === "negotiating"
                              ? "جاري التفاوض"
                              : myOffer.isNegotiable
                              ? "قابل للتفاوض"
                              : "نهائي"}
                          </span>
                        </div>
                      </motion.div>

                      <p className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg mb-4">
                        {myOffer.description}
                      </p>

                      {/* My Offer Images */}
                      {myOffer.images && myOffer.images.length > 0 && (
                        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                          {myOffer.images.map((imageUrl, imgIndex) => (
                            <motion.img
                              key={imgIndex}
                              src={imageUrl}
                              alt={`صورة ${imgIndex + 1}`}
                              className="w-24 h-24 rounded-lg object-cover border border-border shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                // يمكن إضافة modal لعرض الصورة بالحجم الكامل
                                window.open(imageUrl, "_blank");
                              }}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: imgIndex * 0.1 }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Cancel Confirmation Modal */}
                      <AnimatePresence>
                        {showCancelConfirm && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setShowCancelConfirm(false)}
                          >
                            <motion.div
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.9, opacity: 0 }}
                              className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                                  <AlertCircle className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">
                                  إلغاء العرض
                                </h3>
                                <p className="text-muted-foreground text-sm">
                                  هل أنت متأكد من إلغاء هذا العرض؟ لا يمكن
                                  التراجع عن هذا الإجراء.
                                </p>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  variant="secondary"
                                  className="flex-1"
                                  onClick={() => setShowCancelConfirm(false)}
                                >
                                  تراجع
                                </Button>
                                <Button
                                  variant="danger"
                                  className="flex-1"
                                  isLoading={isCancellingOffer}
                                  onClick={async () => {
                                    if (onCancelOffer && myOffer) {
                                      setIsCancellingOffer(true);
                                      try {
                                        await onCancelOffer(myOffer.id);
                                        setShowCancelConfirm(false);
                                        // Haptic feedback
                                        if (navigator.vibrate) {
                                          navigator.vibrate(100);
                                        }
                                      } catch (error) {
                                        logger.error(
                                          "Error cancelling offer:",
                                          error,
                                          "service",
                                        );
                                      } finally {
                                        setIsCancellingOffer(false);
                                      }
                                    }
                                  }}
                                >
                                  نعم، إلغاء العرض
                                </Button>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* CASE 2: NO OFFER YET (AND REQUEST IS ACTIVE) */}
                {!isMyRequest && !isMyOffer && request.status === "active" && (
                  <motion.div
                    ref={offerSectionRef}
                    key={flashKey}
                    className={`bg-card border-2 rounded-2xl p-6 shadow-lg mt-4 relative border-border ${
                      showOfferPulse ? "animate-quick-flash" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-4 mb-6">
                      <motion.h3
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="font-bold text-lg flex items-center gap-2"
                      >
                        <FileText className="text-primary" size={24} />{" "}
                        تقديم عرض
                      </motion.h3>

                      {/* Negotiable Toggle - Moved here */}
                      <label className="flex items-start gap-2 cursor-pointer group select-none px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors border border-border">
                        <div className="relative flex items-center mt-0.5">
                          <input
                            type="checkbox"
                            className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 bg-white checked:border-primary checked:bg-primary transition-all"
                            checked={isNegotiable}
                            onChange={(e) => setIsNegotiable(e.target.checked)}
                          />
                          <Check
                            size={12}
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5 flex-1">
                          <span className="text-xs font-bold text-foreground">
                            قابل للتفاوض
                          </span>
                          <span className="text-[10px] text-muted-foreground/70 leading-tight">
                            {isNegotiable
                              ? "سيتمكن من التواصل معك قبل قبول عرضك"
                              : "لن يتم التواصل معك قبل قبول عرضك"}
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Floating Label Inputs Row */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {/* Price Field */}
                      <motion.div
                        className="relative"
                        animate={shakingFields.price
                          ? { x: [-4, 4, -4, 4, -4, 4, 0] }
                          : {}}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      >
                        <input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          className={`peer w-full h-11 rounded-lg border-2 bg-background px-3 pt-3 text-sm outline-none transition-all appearance-none text-right ${
                            shakingFields.price
                              ? "border-red-500"
                              : isPriceFocused
                              ? "border-primary"
                              : "border-border"
                          }`}
                          placeholder=""
                          value={offerPrice}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow empty string or valid numbers
                            if (
                              value === "" ||
                              (!isNaN(Number(value)) && Number(value) >= 0)
                            ) {
                              setOfferPrice(value);
                              if (shakingFields.price && value) {
                                setShakingFields((prev) => ({
                                  ...prev,
                                  price: false,
                                }));
                              }
                            }
                          }}
                          onFocus={() => setIsPriceFocused(true)}
                          onBlur={() => setIsPriceFocused(false)}
                        />
                        <label
                          htmlFor="price"
                          className={`pointer-events-none absolute transition-all duration-200 flex items-center gap-1 ${
                            offerPrice || isPriceFocused
                              ? "-top-2.5 right-2 bg-card px-1 text-[10px] font-bold max-w-[calc(100%-8px)] overflow-hidden"
                              : "top-3 right-3 text-sm whitespace-nowrap"
                          } ${
                            shakingFields.price
                              ? "text-red-500"
                              : offerPrice || isPriceFocused
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          <span className="truncate">السعر *</span>
                          {offerPrice && !isPriceFocused &&
                            !shakingFields.price && (
                            <Check
                              size={10}
                              className="text-primary shrink-0"
                            />
                          )}
                        </label>
                      </motion.div>

                      {/* Duration Field */}
                      <div className="relative">
                        <input
                          id="duration"
                          type="text"
                          className={`peer w-full h-11 rounded-lg border-2 bg-background px-3 pt-3 text-sm outline-none transition-all appearance-none border-border text-right ${
                            isDurationFocused
                              ? "border-primary"
                              : "border-border"
                          }`}
                          placeholder=""
                          value={offerDuration}
                          onChange={(e) => setOfferDuration(e.target.value)}
                          onFocus={() => setIsDurationFocused(true)}
                          onBlur={() => setIsDurationFocused(false)}
                        />
                        <label
                          htmlFor="duration"
                          className={`pointer-events-none absolute transition-all duration-200 flex items-center gap-1 ${
                            offerDuration || isDurationFocused
                              ? "-top-2.5 right-2 bg-card px-1 text-[10px] text-primary font-bold max-w-[calc(100%-8px)] overflow-hidden leading-tight"
                              : "top-3 right-3 text-sm text-muted-foreground"
                          }`}
                        >
                          <span
                            className={`${
                              offerDuration || isDurationFocused
                                ? "whitespace-normal text-center"
                                : "whitespace-nowrap"
                            }`}
                          >
                            مدة التنفيذ
                          </span>
                          {offerDuration && !isDurationFocused && (
                            <Check
                              size={10}
                              className="text-primary shrink-0"
                            />
                          )}
                        </label>
                      </div>
                    </div>

                    {/* City Field - Dropdown - On its own row */}
                    <div className="mb-4">
                      <CityAutocomplete
                        value={offerCity}
                        onChange={(val) => setOfferCity(val)}
                        placeholder="ابحث عن مدن، معالم، أو محلات..."
                        label="الموقع"
                        showRemoteOption={true}
                        showGPSOption={true}
                        showMapOption={true}
                        showAllCitiesOption={true}
                      />
                    </div>

                    {/* Offer Title Field */}
                    <motion.div
                      className="relative mb-4"
                      animate={shakingFields.title
                        ? { x: [-4, 4, -4, 4, -4, 4, 0] }
                        : {}}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                    >
                      <input
                        id="offerTitle"
                        type="text"
                        className={`peer w-full h-11 rounded-lg border-2 bg-background px-3 pt-3 text-sm outline-none transition-all appearance-none text-right ${
                          shakingFields.title
                            ? "border-red-500"
                            : isTitleFocused
                            ? "border-primary"
                            : "border-border"
                        }`}
                        placeholder=""
                        value={offerTitle || ""}
                        onChange={(e) => {
                          setOfferTitle(e.target.value);
                          if (shakingFields.title && e.target.value) {
                            setShakingFields((prev) => ({
                              ...prev,
                              title: false,
                            }));
                          }
                        }}
                        onFocus={() => setIsTitleFocused(true)}
                        onBlur={() => setIsTitleFocused(false)}
                      />
                      <label
                        htmlFor="offerTitle"
                        className={`pointer-events-none absolute transition-all duration-200 flex items-center gap-1 ${
                          offerTitle || isTitleFocused
                            ? "-top-2.5 right-2 bg-card px-1 text-[10px] font-bold max-w-[calc(100%-16px)] overflow-hidden"
                            : "top-3 right-3 text-sm whitespace-nowrap"
                        } ${
                          shakingFields.title
                            ? "text-red-500"
                            : offerTitle || isTitleFocused
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span className="truncate">عنوان العرض *</span>
                        {offerTitle && !isTitleFocused &&
                          !shakingFields.title && (
                          <Check size={10} className="text-primary shrink-0" />
                        )}
                      </label>
                    </motion.div>

                    {/* Description Field */}
                    <div className="mb-6 relative group">
                      <textarea
                        ref={descTextareaRef}
                        id="offerDesc"
                        style={descTextareaHeight
                          ? { height: `${descTextareaHeight}px` }
                          : undefined}
                        className={`peer w-full rounded-lg border-2 bg-background px-3 pt-5 pb-12 text-sm outline-none transition-colors resize-none min-h-[128px] max-h-[500px] border-border text-right ${
                          isDescriptionFocused
                            ? "border-primary"
                            : "border-border"
                        }`}
                        placeholder=""
                        value={offerDescription}
                        onChange={(e) => {
                          setOfferDescription(e.target.value);
                        }}
                        onFocus={() => setIsDescriptionFocused(true)}
                        onBlur={() => setIsDescriptionFocused(false)}
                      />
                      <label
                        htmlFor="offerDesc"
                        className={`pointer-events-none absolute transition-all duration-200 flex items-center gap-1 z-20 ${
                          offerDescription || isDescriptionFocused
                            ? "-top-2.5 right-2 bg-card px-1 text-[10px] text-primary font-bold max-w-[calc(100%-16px)] overflow-hidden"
                            : "top-2.5 right-3 text-sm text-muted-foreground whitespace-nowrap"
                        }`}
                      >
                        <span className="truncate">تفاصيل العرض</span>
                        {offerDescription && !isDescriptionFocused && (
                          <Check size={10} className="text-primary shrink-0" />
                        )}
                      </label>

                      {/* منطقة السحب في الحد السفلي كامل العرض */}
                      <motion.div
                        className="absolute bottom-2 left-0 right-0 h-6 cursor-ns-resize z-10 flex items-center justify-center select-none bg-transparent"
                        onMouseDown={handleDescResizeStart}
                        onTouchStart={handleDescResizeStart}
                        style={{ transformOrigin: "50% 100%" }}
                        animate={showDescResizeHint
                          ? {
                            scaleY: [1, 1.35, 1, 1.2, 1],
                          }
                          : {}}
                        transition={showDescResizeHint
                          ? {
                            duration: 1.2,
                            ease: "easeInOut",
                          }
                          : {}}
                      >
                        {/* مقبض سحب (شرطتين) لتوضيح أن الحد السفلي قابل للسحب */}
                        <div
                          className={`flex flex-col items-center justify-center gap-1 rounded-md px-4 py-1 transition-colors duration-200 bg-background/90 ${
                            isDescResizing || isDescriptionFocused ||
                              showDescResizeHint
                              ? "text-primary"
                              : "text-muted-foreground/50"
                          }`}
                        >
                          <div className="h-0.5 w-12 rounded-full bg-current opacity-70" />
                          <div className="h-0.5 w-12 rounded-full bg-current opacity-70" />
                        </div>
                      </motion.div>
                    </div>

                    {/* Attachments Section - Collapsible */}
                    <div className="mb-4 border-t border-border/50">
                      {/* Label - Clickable to expand/collapse */}
                      <button
                        type="button"
                        onClick={() =>
                          setIsAttachmentsExpanded(!isAttachmentsExpanded)}
                        className="w-full flex items-center justify-between gap-2 pt-3 pb-2 hover:bg-secondary/30 rounded-lg px-2 -mx-2 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`transition-colors ${
                              offerAttachments.length > 0
                                ? "text-primary"
                                : "text-muted-foreground group-hover:text-primary/70"
                            }`}
                          >
                            <Paperclip size={18} />
                          </span>
                          <span
                            className={`text-sm font-medium transition-colors ${
                              offerAttachments.length > 0
                                ? "text-primary"
                                : "text-muted-foreground group-hover:text-foreground"
                            }`}
                          >
                            المرفقات وصور توضيحية
                            {offerAttachments.length > 0 && (
                              <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="inline-flex items-center justify-center mr-1"
                              >
                                <Check size={14} className="text-primary" />
                              </motion.span>
                            )}
                          </span>
                          {offerAttachments.length > 0 && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                              {offerAttachments.length} ملف
                            </span>
                          )}
                        </div>
                        <motion.span
                          animate={{ rotate: isAttachmentsExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className={`transition-colors text-muted-foreground group-hover:text-foreground ${
                            offerAttachments.length > 0 ? "!text-primary" : ""
                          }`}
                        >
                          <ChevronDown size={16} />
                        </motion.span>
                      </button>

                      {/* Collapsible Attachment Area */}
                      <AnimatePresence>
                        {isAttachmentsExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-2 pb-3">
                              <div
                                className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
                                  offerAttachments.length > 0
                                    ? "border-primary/50 bg-primary/5"
                                    : "border-border bg-secondary/20"
                                }`}
                              >
                                {/* Uploaded Files Preview */}
                                {offerAttachments.length > 0 && (
                                  <div className="flex gap-2 flex-wrap mb-3">
                                    {offerAttachments.map((file, index) => {
                                      const fileUrl = URL.createObjectURL(file);
                                      const isImage = isImageFile(file);
                                      return (
                                        <motion.div
                                          key={file.name + index}
                                          initial={{ scale: 0, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          exit={{ scale: 0, opacity: 0 }}
                                          className="relative group"
                                        >
                                          <div className="w-20 h-20 rounded-xl border border-border overflow-hidden bg-background">
                                            {isImage
                                              ? (
                                                <img
                                                  src={fileUrl}
                                                  alt={file.name}
                                                  className="w-full h-full object-cover"
                                                />
                                              )
                                              : (
                                                <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                                  <FileText
                                                    size={24}
                                                    className="text-muted-foreground mb-1"
                                                  />
                                                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                                                    {file.name.split(".").pop()
                                                      ?.toUpperCase()}
                                                  </span>
                                                </div>
                                              )}
                                          </div>
                                          <button
                                            onClick={() =>
                                              setOfferAttachments((prev) =>
                                                prev.filter((_, i) =>
                                                  i !== index
                                                )
                                              )}
                                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                          >
                                            <X size={12} />
                                          </button>
                                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 py-0.5 text-center truncate">
                                            {formatFileSize(file.size)}
                                          </div>
                                        </motion.div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Upload Buttons */}
                                <div className="flex gap-3">
                                  {/* Upload Box */}
                                  <div
                                    onClick={() =>
                                      offerFileInputRef.current?.click()}
                                    className="flex-1 flex flex-col items-center justify-center h-24 bg-background border border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                  >
                                    <Upload
                                      size={28}
                                      className="text-primary mb-2"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      رفع ملف/صورة
                                    </span>
                                  </div>
                                </div>

                                {/* Hidden File Input */}
                                <input
                                  ref={offerFileInputRef}
                                  type="file"
                                  multiple
                                  accept="image/*,video/*,.pdf,.doc,.docx"
                                  className="hidden"
                                  onChange={(e) => {
                                    const files = Array.from(
                                      e.target.files || [],
                                    );
                                    if (files.length > 0) {
                                      // Validate each file
                                      const validFiles: File[] = [];
                                      for (const file of files) {
                                        const validation = validateFile(file);
                                        if (validation.valid) {
                                          validFiles.push(file);
                                        } else {
                                          alert(validation.error);
                                        }
                                      }
                                      if (validFiles.length > 0) {
                                        setOfferAttachments(
                                          (prev) => [...prev, ...validFiles],
                                        );
                                      }
                                    }
                                    e.target.value = "";
                                  }}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {/* CASE 3: CLOSED REQUEST */}
                {!isMyRequest && !isMyOffer && request.status !== "active" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-muted/30 border border-border rounded-xl px-4 py-3 mt-4 flex items-center gap-3"
                  >
                    <Lock
                      size={18}
                      className="text-muted-foreground shrink-0"
                    />
                    <span className="font-medium text-sm text-muted-foreground">
                      الطلب منتهي - تم اختيار عارض
                    </span>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        </div>

        {/* Floating Buttons - Submit Offer and Negotiate */}
        {!isMyRequest && !isMyOffer && request.status === "active" && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 35,
              mass: 0.8,
            }}
            className="fixed bottom-0 left-0 right-0 md:right-72 z-[110] bg-gradient-to-t from-background via-background to-transparent pt-4 pb-4 px-4"
          >
            <div className="flex flex-col gap-2">
              {/* زر التفاوض - ثابت عندما يكون هناك عرض قابل للتفاوض */}
              {(() => {
                // البحث عن أول عرض قابل للتفاوض لم يتم قبوله
                const negotiableOffer = allOffers.find(
                  (offer) =>
                    offer.isNegotiable &&
                    getEffectiveOfferStatus(offer) !== "accepted" &&
                    getEffectiveOfferStatus(offer) !== "rejected",
                );

                if (negotiableOffer) {
                  const offerStatus = getEffectiveOfferStatus(negotiableOffer);
                  const isNegotiating = offerStatus === "negotiating";

                  return (
                    <motion.button
                      layout
                      onClick={() => {
                        setActiveOfferId(negotiableOffer.id);
                        if (isNegotiating) {
                          setNegotiationOpen(true);
                        } else {
                          handleStartNegotiation(negotiableOffer.id);
                        }
                      }}
                      disabled={isStartingNegotiation || isGuest}
                      className={`relative inline-flex items-center justify-center gap-2 rounded-2xl font-bold text-base transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 overflow-hidden active:scale-[0.96] select-none touch-manipulation bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg shadow-lg w-full py-4 px-4`}
                    >
                      {isStartingNegotiation
                        ? (
                          <>
                            <Loader2 size={20} className="animate-spin" />
                            <span>جاري بدء التفاوض...</span>
                          </>
                        )
                        : isNegotiating
                        ? (
                          <>
                            <MessageSquare size={20} />
                            <span>متابعة التفاوض</span>
                          </>
                        )
                        : (
                          <>
                            <MessageCircle size={20} />
                            <span>تفاوض</span>
                          </>
                        )}
                    </motion.button>
                  );
                }
                return null;
              })()}

              {/* زر إرسال العرض */}
              <motion.button
                layout
                onClick={async () => {
                  // If NOT in offer section, scroll to it first
                  if (!isOfferSectionVisible) {
                    if (offerSectionRef.current && scrollContainerRef.current) {
                      // Scroll so the offer section header is at the very top
                      const containerRect = scrollContainerRef.current
                        .getBoundingClientRect();
                      const targetRect = offerSectionRef.current
                        .getBoundingClientRect();
                      const relativeTop = targetRect.top - containerRect.top +
                        scrollContainerRef.current.scrollTop;

                      // Add extra offset to push it higher (negative to scroll more)
                      scrollContainerRef.current.scrollTo({
                        top: relativeTop + 100,
                        behavior: "smooth",
                      });
                    }
                    return;
                  }

                  // We're in the offer section - validate and submit
                  const canSubmit = offerPrice && offerTitle;
                  if (!canSubmit) {
                    // Trigger flash effect when form is incomplete
                    setFlashKey((prev) => prev + 1);
                    setShowOfferPulse(true);
                    setTimeout(() => setShowOfferPulse(false), 800);
                    return;
                  }

                  // Trigger flash effect before submitting
                  setFlashKey((prev) => prev + 1);
                  setShowOfferPulse(true);
                  setTimeout(() => setShowOfferPulse(false), 800);

                  if (navigator.vibrate) navigator.vibrate(15);
                  await handleSubmitOfferFromHeader();
                }}
                disabled={isOfferSectionVisible &&
                  (!offerPrice || !offerTitle) &&
                  !isSubmittingOffer && !offerSubmitted}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all shadow-lg ${
                  !isOfferSectionVisible
                    ? "bg-primary text-white hover:bg-primary/90 shadow-primary/30"
                    : (offerPrice && offerTitle) && !isSubmittingOffer
                    ? "bg-primary text-white hover:bg-primary/90 shadow-primary/30"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none"
                }`}
              >
                {isSubmittingOffer
                  ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>
                        {isUploadingAttachments
                          ? "جاري الرفع..."
                          : "جاري الإرسال..."}
                      </span>
                    </>
                  )
                  : offerSubmitted
                  ? (
                    <>
                      <Check size={20} />
                      <span>تم الإرسال!</span>
                    </>
                  )
                  : isOfferSectionVisible
                  ? (
                    <>
                      <span>أرسل عرضك الآن</span>
                      <ChevronLeft size={20} />
                    </>
                  )
                  : (
                    <>
                      <span>قدّم عرضك</span>
                      <motion.div
                        animate={{ y: [0, 4, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <ChevronsDown size={20} />
                      </motion.div>
                    </>
                  )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* زر التفاوض الثابت - لمقدم العرض (Provider) عندما يكون لديه عرض قابل للتفاوض */}
        {isMyOffer && myOffer && myOffer.isNegotiable &&
          request.status === "active" && canProviderChat() && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 35,
              mass: 0.8,
            }}
            className="fixed bottom-0 left-0 right-0 md:right-72 z-[110] bg-gradient-to-t from-background via-background to-transparent pt-4 pb-4 px-4"
          >
            <div className="flex flex-col gap-2">
              {(() => {
                const offerStatus = myOffer.status || "pending";
                const isNegotiating = offerStatus === "negotiating";
                // حساب عدد الرسائل غير المقروءة (من الرسائل المحملة قبل قراءتها)
                const unreadMessagesCount = chatMessages.filter(
                  (msg) => !msg.is_read && msg.sender_id !== user?.id,
                ).length || 0;

                return (
                  <motion.button
                    layout
                    onClick={() => {
                      if (myOffer) setActiveOfferId(myOffer.id);
                      setNegotiationOpen(true);
                    }}
                    disabled={isGuest}
                    className={`relative inline-flex items-center justify-center gap-2 rounded-2xl font-bold text-base transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 overflow-visible active:scale-[0.96] select-none touch-manipulation bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg shadow-lg w-full py-4 px-4`}
                  >
                    <div className="inline-flex items-center justify-center gap-2">
                      {isNegotiating || offerStatus === "accepted" ||
                          hasExistingConversation
                        ? (
                          <>
                            <MessageSquare size={20} />
                            <span>متابعة التفاوض</span>
                          </>
                        )
                        : (
                          <>
                            <MessageCircle size={20} />
                            <span>تفاوض</span>
                          </>
                        )}
                      {unreadMessagesCount > 0 && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white text-[11px] font-bold shadow-md border border-red-400/30 dark:border-red-700/50 ring-2 ring-red-500/20 dark:ring-red-500/30"
                        >
                          {unreadMessagesCount > 99
                            ? "99+"
                            : unreadMessagesCount}
                        </motion.span>
                      )}
                    </div>
                  </motion.button>
                );
              })()}
            </div>
          </motion.div>
        )}

        {/* Guest Offer Verification Modal */}
        {isGuest && guestOfferVerificationStep !== "none" &&
          ReactDOM.createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border"
              >
                {guestOfferVerificationStep === "phone" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-right">
                      التحقق من رقم الجوال
                    </h3>
                    <p className="text-sm text-muted-foreground text-right">
                      لتقديم عرض، نحتاج للتحقق من رقم جوالك. سيتم إرسال رمز تحقق
                      على رقمك.
                    </p>
                    <div
                      className={`relative flex items-center gap-2 border-2 rounded-lg bg-background px-4 h-12 focus-within:border-primary transition-all min-w-0 overflow-hidden ${
                        guestOfferError ? "border-red-500" : "border-border"
                      }`}
                    >
                      <span className="text-muted-foreground font-medium shrink-0">
                        +966
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={guestOfferPhone}
                        onChange={(e) => {
                          // السماح بـ 0 في البداية أو بدون
                          const value = e.target.value.replace(/\D/g, "");
                          // يقبل حتى 10 أرقام (مع 0) أو 9 (بدون 0)
                          if (value.length <= 10) {
                            setGuestOfferPhone(value);
                            setGuestOfferError(null);
                          }
                        }}
                        placeholder="0501234567"
                        className="flex-1 h-full bg-transparent text-base outline-none text-left min-w-0"
                        dir="ltr"
                        maxLength={10}
                        autoFocus
                      />
                    </div>

                    {/* عرض رسالة الخطأ */}
                    <AnimatePresence>
                      {guestOfferError && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                        >
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600 dark:text-red-400 text-right flex-1">
                              {guestOfferError}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!guestOfferPhone.trim()) {
                            setGuestOfferError("يرجى إدخال رقم الجوال");
                            return;
                          }
                          setIsSendingOfferOTP(true);
                          setGuestOfferError(null);
                          const result = await verifyGuestPhone(
                            guestOfferPhone,
                          );
                          setIsSendingOfferOTP(false);
                          if (result.success) {
                            setGuestOfferVerificationStep("otp");
                            setGuestOfferError(null);
                          } else {
                            const translatedError = translateAuthError(
                              result.error || "فشل إرسال رمز التحقق",
                            );
                            setGuestOfferError(translatedError);
                          }
                        }}
                        disabled={isSendingOfferOTP}
                        className="flex-1 h-12 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {isSendingOfferOTP
                          ? "جاري الإرسال..."
                          : "إرسال رمز التحقق"}
                      </button>
                      <button
                        onClick={() => {
                          setGuestOfferVerificationStep("none");
                          setGuestOfferPhone("");
                          setGuestOfferError(null);
                        }}
                        className="px-4 h-12 bg-secondary text-foreground rounded-lg font-bold hover:bg-secondary/80 transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>

                    {/* نص الموافقة على الشروط */}
                    <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                      بتسجيلك للدخول فأنت توافق على{" "}
                      <button
                        onClick={() => setShowTermsModal(true)}
                        className="text-primary hover:underline font-medium"
                      >
                        شروط الاستخدام
                      </button>{" "}
                      و{" "}
                      <button
                        onClick={() => setShowPrivacyModal(true)}
                        className="text-primary hover:underline font-medium"
                      >
                        سياسة الخصوصية
                      </button>
                    </p>
                  </div>
                )}

                {guestOfferVerificationStep === "otp" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-right">
                      أدخل رمز التحقق
                    </h3>
                    <p className="text-sm text-muted-foreground text-right">
                      تم إرسال رمز التحقق إلى {guestOfferPhone}
                    </p>
                    <input
                      type="text"
                      value={guestOfferOTP}
                      onChange={(e) => {
                        setGuestOfferOTP(
                          e.target.value.replace(/\D/g, "").slice(0, 4),
                        );
                        setGuestOfferError(null); // مسح الخطأ عند الكتابة
                      }}
                      placeholder="0000"
                      className={`w-full h-14 px-4 text-center rounded-xl border-2 bg-background text-3xl font-black tracking-[0.5em] outline-none transition-all focus:border-primary ${
                        guestOfferError ? "border-red-500" : "border-border"
                      }`}
                      dir="ltr"
                      maxLength={4}
                      autoFocus
                    />

                    {/* عرض رسالة الخطأ */}
                    <AnimatePresence>
                      {guestOfferError && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                        >
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600 dark:text-red-400 text-right flex-1">
                              {guestOfferError}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (guestOfferOTP.length !== 4) {
                            setGuestOfferError(
                              "يرجى إدخال رمز التحقق المكون من 4 أرقام",
                            );
                            return;
                          }
                          setIsVerifyingOfferOTP(true);
                          setGuestOfferError(null);
                          const result = await confirmGuestPhone(
                            guestOfferPhone,
                            guestOfferOTP,
                          );
                          setIsVerifyingOfferOTP(false);
                          if (result.success) {
                            // Haptic feedback - positive send pattern
                            if (navigator.vibrate) {
                              navigator.vibrate([30, 50, 30]);
                            }

                            // بعد التحقق الناجح، تحقق من حالة Onboarding
                            const userProfile = await getCurrentUser();
                            if (!userProfile?.id) {
                              setGuestOfferError(
                                "فشل تسجيل الدخول. حاول مرة أخرى.",
                              );
                              return;
                            }

                            // التحقق من أن المستخدم لا يقدم عرض على طلبه الخاص
                            const requestAuthorId = request.author;
                            if (
                              requestAuthorId &&
                              userProfile.id === requestAuthorId
                            ) {
                              setGuestOfferError(
                                "لا يمكنك تقديم عرض على طلبك الخاص",
                              );
                              setGuestOfferVerificationStep("none");
                              setGuestOfferPhone("");
                              setGuestOfferOTP("");
                              return;
                            }

                            // التحقق من حالة Onboarding
                            const userOnboardedKey =
                              `abeely_onboarded_${userProfile.id}`;
                            const localOnboarded =
                              localStorage.getItem(userOnboardedKey) === "true";
                            const hasName = !!userProfile.display_name?.trim();

                            // التحقق من قاعدة البيانات إذا لم يكن هناك علامة محلية
                            let needsOnboarding = !localOnboarded || !hasName;
                            if (!localOnboarded) {
                              try {
                                const { data: profileData } = await supabase
                                  .from("profiles")
                                  .select(
                                    "interested_categories, interested_cities, display_name, has_onboarded",
                                  )
                                  .eq("id", userProfile.id)
                                  .single();

                                const hasInterests = Array.isArray(
                                  profileData?.interested_categories,
                                ) &&
                                  profileData.interested_categories.length > 0;
                                const hasCities = Array.isArray(
                                  profileData?.interested_cities,
                                ) && profileData.interested_cities.length > 0;
                                const hasProfileName = !!profileData
                                  ?.display_name?.trim();
                                const alreadyOnboarded =
                                  profileData?.has_onboarded === true;

                                needsOnboarding = !(alreadyOnboarded ||
                                  (hasProfileName &&
                                    (hasInterests || hasCities)));
                              } catch (err) {
                                logger.error(
                                  "Error checking onboarding status:",
                                  err,
                                  "service",
                                );
                                // في حالة الخطأ، نعتبر أن المستخدم يحتاج onboarding إذا لم يكن هناك اسم
                                needsOnboarding = !hasName;
                              }
                            }

                            if (needsOnboarding) {
                              // المستخدم يحتاج إلى Onboarding - احفظ البيانات وانتقل إلى Onboarding
                              // Save offer form data
                              if (onOfferFormChange) {
                                onOfferFormChange({
                                  price: offerPrice,
                                  duration: offerDuration,
                                  city: offerCity,
                                  title: offerTitle,
                                  description: offerDescription,
                                  attachments: offerAttachments,
                                  guestVerificationStep:
                                    guestOfferVerificationStep,
                                  guestPhone: guestOfferPhone,
                                  guestOTP: guestOfferOTP,
                                });
                              }
                              localStorage.setItem(
                                "abeely_requires_onboarding",
                                "true",
                              );
                              localStorage.setItem(
                                "abeely_pending_action",
                                "submit_offer",
                              );
                              // إعادة تحميل الصفحة للانتقال إلى OnboardingScreen
                              window.location.reload();
                              return;
                            }

                            setGuestOfferVerificationStep("none");
                            setGuestOfferError(null);

                            // Submit offer after successful verification
                            try {
                              const userId = userProfile.id;

                              setIsSubmittingOffer(true);

                              // Upload attachments if any
                              let uploadedImageUrls: string[] = [];
                              if (offerAttachments.length > 0) {
                                setIsUploadingAttachments(true);
                                const tempId = `${userId}-${Date.now()}`;
                                uploadedImageUrls =
                                  await uploadOfferAttachments(
                                    offerAttachments,
                                    tempId,
                                  );
                                setIsUploadingAttachments(false);
                              }

                              // Create the offer
                              const offerResult = await createOffer({
                                requestId: request.id,
                                providerId: userId,
                                title: offerTitle.trim(),
                                description: offerDescription.trim() ||
                                  undefined,
                                price: offerPrice.trim(),
                                deliveryTime: offerDuration.trim() || undefined,
                                location: offerCity.trim() || undefined,
                                isNegotiable,
                                images: uploadedImageUrls.length > 0
                                  ? uploadedImageUrls
                                  : undefined,
                              });

                              if (offerResult) {
                                // Haptic feedback - success
                                if (navigator.vibrate) {
                                  navigator.vibrate([30, 50, 30]);
                                }

                                // ✅ Optimistic Update: إضافة العرض مباشرة إلى الواجهة بدون انتظار
                                const newOffer: Offer = {
                                  id: offerResult.id,
                                  requestId: request.id,
                                  providerId: userId,
                                  providerName: userProfile.display_name ||
                                    "مزود خدمة",
                                  providerAvatar: userProfile.avatar_url,
                                  title: offerTitle.trim(),
                                  description: offerDescription.trim() || "",
                                  price: offerPrice.trim(),
                                  deliveryTime: offerDuration.trim() || "",
                                  status: "pending",
                                  createdAt: new Date(),
                                  isNegotiable,
                                  location: offerCity.trim() || undefined,
                                  images: uploadedImageUrls.length > 0
                                    ? uploadedImageUrls
                                    : undefined,
                                };

                                // إضافة العرض مباشرة إلى loadedOffers
                                setLoadedOffers((prev) => {
                                  // التحقق من عدم وجود العرض مسبقاً (لتجنب التكرار)
                                  if (
                                    prev.some((o) => o.id === offerResult.id)
                                  ) {
                                    return prev;
                                  }
                                  return [newOffer, ...prev];
                                });

                                setOfferSubmitted(true);

                                // Notify parent (في الخلفية)
                                if (onOfferCreated) {
                                  onOfferCreated().catch((error) => {
                                    logger.error(
                                      "Error in onOfferCreated callback:",
                                      error,
                                      "service",
                                    );
                                  });
                                }

                                // Reset form
                                setOfferPrice("");
                                setOfferTitle("");
                                setOfferDescription("");
                                setOfferDuration("");
                                setOfferCity("");
                                setOfferAttachments([]);
                                setSelectedImageUrls([]);
                                setSearchedImages([]);
                                setSelectedSearchImages(new Set());
                                setGuestOfferPhone("");
                                setGuestOfferOTP("");

                                setTimeout(() => {
                                  setOfferSubmitted(false);
                                }, 2000);
                              } else {
                                setGuestOfferError(
                                  "حدث خطأ في إرسال العرض. حاول مرة أخرى.",
                                );
                              }
                            } catch (err: any) {
                              logger.error(
                                "Submit offer error:",
                                err,
                                "service",
                              );
                              const errorMessage = err?.message ||
                                err?.error?.message ||
                                "حدث خطأ في إرسال العرض. حاول مرة أخرى.";
                              console.error("Full error details:", err);
                              setGuestOfferError(
                                `حدث خطأ في إرسال العرض:\n${errorMessage}`,
                              );
                            } finally {
                              setIsSubmittingOffer(false);
                              setIsUploadingAttachments(false);
                            }
                          } else {
                            // ترجمة رسالة الخطأ للعربية
                            const translatedError = translateAuthError(
                              result.error || "رمز التحقق غير صحيح",
                            );
                            setGuestOfferError(translatedError);
                            setGuestOfferOTP("");
                          }
                        }}
                        disabled={isVerifyingOfferOTP}
                        className="flex-1 h-12 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {isVerifyingOfferOTP
                          ? "جاري التحقق..."
                          : "تحقق وإرسال العرض"}
                      </button>
                      <button
                        onClick={() => {
                          setGuestOfferVerificationStep("phone");
                          setGuestOfferOTP("");
                          setGuestOfferError(null);
                        }}
                        className="px-4 h-12 bg-secondary text-foreground rounded-lg font-bold hover:bg-secondary/80 transition-colors"
                      >
                        رجوع
                      </button>
                    </div>

                    {/* زر إعادة إرسال الرمز */}
                    <button
                      onClick={async () => {
                        setIsSendingOfferOTP(true);
                        setGuestOfferError(null);
                        const result = await verifyGuestPhone(guestOfferPhone);
                        setIsSendingOfferOTP(false);
                        if (result.success) {
                          setGuestOfferOTP("");
                          // إظهار رسالة نجاح مؤقتة
                          setGuestOfferError(null);
                        } else {
                          const translatedError = translateAuthError(
                            result.error || "فشل إرسال رمز التحقق",
                          );
                          setGuestOfferError(translatedError);
                        }
                      }}
                      disabled={isSendingOfferOTP}
                      className="w-full text-center text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                    >
                      {isSendingOfferOTP
                        ? "جاري إعادة الإرسال..."
                        : "لم يصلك الرمز؟ إعادة الإرسال"}
                    </button>
                  </div>
                )}
              </motion.div>
            </div>,
            document.body,
          )}

        {/* Terms of Service Modal */}
        {showTermsModal && ReactDOM.createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-2xl max-w-lg w-full max-h-[80vh] shadow-2xl border border-border flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-bold">شروط الاستخدام</h3>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto text-sm text-muted-foreground space-y-4 leading-relaxed text-right">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <FileText size={32} className="text-primary" />
                  </div>
                  <h4 className="font-bold text-foreground text-base">
                    شروط استخدام أبيلي
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    آخر تحديث: يناير 2026
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h5 className="font-bold text-foreground mb-2">
                      1. القبول بالشروط
                    </h5>
                    <p>
                      باستخدامك لمنصة أبيلي، فإنك توافق على الالتزام بهذه الشروط
                      والأحكام. إذا كنت لا توافق على أي جزء منها، يرجى عدم استخدام
                      المنصة.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-foreground mb-2">
                      2. طبيعة الخدمة
                    </h5>
                    <p>
                      أبيلي منصة وسيطة تربط بين طالبي الخدمات ومزوديها. نحن لسنا
                      طرفاً في أي اتفاق يتم بين المستخدمين، ولا نتحمل مسؤولية جودة
                      الخدمات المقدمة.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-foreground mb-2">
                      3. التزامات المستخدم
                    </h5>
                    <ul className="list-disc list-inside space-y-1 mr-2">
                      <li>تقديم معلومات صحيحة ودقيقة</li>
                      <li>عدم نشر محتوى مخالف أو مسيء</li>
                      <li>احترام الآخرين والتواصل بلباقة</li>
                      <li>عدم استخدام المنصة لأغراض غير مشروعة</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-bold text-foreground mb-2">
                      4. المسؤولية
                    </h5>
                    <p>
                      المنصة غير مسؤولة عن أي خلافات تنشأ بين المستخدمين. ننصح
                      بالتحقق من هوية الطرف الآخر والاتفاق على التفاصيل قبل البدء.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-foreground mb-2">
                      5. حقوق الملكية
                    </h5>
                    <p>
                      جميع حقوق الملكية الفكرية للمنصة محفوظة. يُحظر نسخ أو توزيع
                      أي محتوى دون إذن كتابي.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-border">
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
                >
                  فهمت، موافق
                </button>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}

        {/* Privacy Policy Modal */}
        {showPrivacyModal && ReactDOM.createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-2xl max-w-lg w-full max-h-[80vh] shadow-2xl border border-border flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-bold">سياسة الخصوصية</h3>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto text-sm text-muted-foreground space-y-4 leading-relaxed text-right">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Lock size={32} className="text-primary" />
                  </div>
                  <h4 className="font-bold text-foreground text-base">
                    سياسة خصوصية أبيلي
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    آخر تحديث: يناير 2026
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h5 className="font-bold text-foreground mb-2">
                      1. البيانات التي نجمعها
                    </h5>
                    <ul className="list-disc list-inside space-y-1 mr-2">
                      <li>رقم الجوال للتحقق من الهوية</li>
                      <li>معلومات الطلبات والعروض</li>
                      <li>المحادثات بين المستخدمين</li>
                      <li>بيانات الاستخدام لتحسين الخدمة</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-bold text-foreground mb-2">
                      2. كيف نستخدم بياناتك
                    </h5>
                    <ul className="list-disc list-inside space-y-1 mr-2">
                      <li>تقديم الخدمة وتحسينها</li>
                      <li>إرسال إشعارات مهمة</li>
                      <li>حماية المستخدمين من الاحتيال</li>
                      <li>تحليل الاستخدام لتطوير المنصة</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-bold text-foreground mb-2">
                      3. مشاركة البيانات
                    </h5>
                    <p>
                      لا نشارك بياناتك الشخصية مع أطراف ثالثة إلا في الحالات
                      التالية:
                    </p>
                    <ul className="list-disc list-inside space-y-1 mr-2 mt-2">
                      <li>بموافقتك الصريحة</li>
                      <li>للامتثال للقوانين السارية</li>
                      <li>لحماية حقوقنا أو سلامة المستخدمين</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-bold text-foreground mb-2">
                      4. أمان البيانات
                    </h5>
                    <p>
                      نستخدم تقنيات تشفير متقدمة لحماية بياناتك. نحتفظ بالبيانات
                      فقط للمدة اللازمة لتقديم الخدمة.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-foreground mb-2">5. حقوقك</h5>
                    <p>
                      يمكنك طلب الاطلاع على بياناتك أو تعديلها أو حذفها في أي وقت
                      من خلال التواصل معنا.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-border">
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
                >
                  فهمت، موافق
                </button>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}

        {/* Chat Bottom Sheet */}
        <AnimatePresence>
          {negotiationOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setNegotiationOpen(false)}
                className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
              />

              {/* Bottom Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{
                  type: "spring",
                  damping: 35,
                  stiffness: 400,
                  mass: 0.8,
                }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.3 }}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                  const velocityThreshold = 800;
                  const offsetThreshold = 150;
                  const shouldClose = info.offset.y > offsetThreshold ||
                    info.velocity.y > velocityThreshold;

                  if (shouldClose) {
                    setNegotiationOpen(false);
                  }
                }}
                className="fixed bottom-0 left-0 right-0 z-[120] bg-card rounded-t-3xl flex flex-col max-h-[90vh] shadow-2xl"
              >
                {/* Drag Handle - أعلى البوتوم شيت */}
                <div className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none shrink-0">
                  <div className="w-20 h-1 bg-muted-foreground/40 dark:bg-muted-foreground/50 rounded-full transition-colors duration-200 active:bg-muted-foreground/60" />
                </div>

                {/* Chat Header */}
                <div className="px-5 pb-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      {(() => {
                        // عندما يكون المستخدم صاحب طلب، عرض اسم العارض. وإلا عرض عنوان الطلب
                        if (isMyRequest || mode === "requests") {
                          // البحث عن العرض النشط أو المقبول للحصول على اسم العارض
                          const activeOffer = activeOfferId
                            ? allOffers.find((o) => o.id === activeOfferId)
                            : allOffers.find((o) => o.status === "accepted") ||
                              allOffers[0];

                          const providerName = activeOffer?.providerName ||
                            "مقدم خدمة";

                          return (
                            <>
                              <h4 className="font-bold text-base truncate">
                                {providerName}
                              </h4>
                              <span className="text-xs text-muted-foreground">
                                التواصل مع مقدم الخدمة
                              </span>
                            </>
                          );
                        } else {
                          // عندما يكون المستخدم مقدم خدمة، عرض عنوان الطلب
                          return (
                            <>
                              <h4 className="font-bold text-base truncate">
                                {request.title}
                              </h4>
                              <span className="text-xs text-muted-foreground">
                                التواصل مع صاحب الطلب
                              </span>
                            </>
                          );
                        }
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Mute Notifications Button */}
                    <motion.button
                      onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(10);
                        setIsConversationMuted((prev) => !prev);
                        // TODO: Implement mute notifications functionality
                        logger.log(
                          `Conversation notifications ${
                            !isConversationMuted ? "muted" : "unmuted"
                          }`,
                        );
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all text-foreground focus:outline-none bg-card/80 backdrop-blur-sm border border-border shadow-lg hover:bg-card"
                      title={isConversationMuted
                        ? "إلغاء كتم الإشعارات"
                        : "كتم إشعارات المحادثة"}
                    >
                      {isConversationMuted
                        ? <BellOff size={18} className="text-red-500" />
                        : <Bell size={18} />}
                    </motion.button>
                    {/* Close Button */}
                    <motion.button
                      onClick={() => setNegotiationOpen(false)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all text-foreground focus:outline-none bg-card/80 backdrop-blur-sm border border-border shadow-lg hover:bg-card"
                    >
                      <X size={18} />
                    </motion.button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50 min-h-[300px] max-h-[50vh]">
                  {isGuest || !user?.id
                    ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Lock size={40} className="mx-auto mb-4 opacity-30" />
                        <p className="text-sm font-medium">
                          تحتاج لتسجيل الدخول
                        </p>
                        <p className="text-xs mt-1">
                          سجل دخولك لبدء المحادثة مع الطرف الآخر
                        </p>
                      </div>
                    )
                    : isChatLoading
                    ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2
                          className="animate-spin text-primary"
                          size={24}
                        />
                        <span className="mr-2 text-sm text-muted-foreground">
                          جاري تحميل المحادثة...
                        </span>
                      </div>
                    )
                    : (
                      <>
                        {/* رسالة إغلاق المحادثة */}
                        {isConversationClosed && (
                          <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 text-center mb-4">
                            <Lock
                              size={24}
                              className="mx-auto mb-2 text-accent-foreground"
                            />
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                              هذه المحادثة مغلقة
                            </p>
                            <p className="text-xs text-accent-foreground mt-1">
                              {conversationClosedReason ||
                                "تم إغلاق هذه المحادثة"}
                            </p>
                          </div>
                        )}

                        {chatMessages.length === 0 && !isConversationClosed
                          ? (
                            <div className="text-center py-12 text-muted-foreground">
                              <MessageCircle
                                size={40}
                                className="mx-auto mb-4 opacity-30"
                              />
                              <p className="text-sm">لا توجد رسائل بعد</p>
                              <p className="text-xs mt-1">
                                ابدأ المحادثة بإرسال رسالة
                              </p>
                            </div>
                          )
                          : (
                            chatMessages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex flex-col w-full ${
                                  msg.sender_id === user?.id
                                    ? "items-start"
                                    : "items-end"
                                }`}
                              >
                                {/* رسالة نظام */}
                                {msg.content.startsWith("🔔")
                                  ? (
                                    <div className="bg-muted/50 border border-border rounded-lg px-4 py-2 text-center w-full">
                                      <p className="text-xs text-muted-foreground">
                                        {msg.content}
                                      </p>
                                    </div>
                                  )
                                  : (
                                    <>
                                      <div
                                        className={`px-4 py-3 rounded-2xl max-w-[80%] text-base leading-relaxed shadow-sm ${
                                          msg.sender_id === user?.id
                                            ? "bg-primary text-primary-foreground rounded-br-md rounded-tr-none"
                                            : "bg-card border border-border rounded-bl-md rounded-tl-none"
                                        }`}
                                      >
                                        {/* Voice Message */}
                                        {msg.audio_url && (
                                          <div className="mb-2">
                                            <audio
                                              src={msg.audio_url}
                                              controls
                                              className="w-full h-8 rounded-lg"
                                            />
                                          </div>
                                        )}
                                        {/* Text Content */}
                                        {msg.content && (
                                          <p className="whitespace-pre-wrap">
                                            {msg.content}
                                          </p>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-muted-foreground mt-1.5 px-2">
                                        {format(new Date(msg.created_at), "p", {
                                          locale: ar,
                                        })}
                                      </span>
                                    </>
                                  )}
                              </div>
                            ))
                          )}
                      </>
                    )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input Area */}
                <div className="p-4 border-t border-border bg-card">
                  {isGuest || !user?.id
                    ? (
                      <div className="text-center py-2 text-muted-foreground text-sm">
                        سجل دخولك لإرسال رسائل
                      </div>
                    )
                    : isConversationClosed
                    ? (
                      <div className="text-center py-2 text-accent-foreground text-sm flex items-center justify-center gap-2">
                        <Lock size={16} />
                        لا يمكن إرسال رسائل في محادثة مغلقة
                      </div>
                    )
                    : (
                      <>
                        {/* Recording indicator */}
                        <AnimatePresence>
                          {isRecordingVoice && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="flex items-center justify-between mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                            >
                              <button
                                onClick={cancelRecordingVoiceChat}
                                className="p-2 hover:bg-red-500/20 rounded-full transition-colors"
                              >
                                <X size={18} className="text-red-500" />
                              </button>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {formatRecordingTime(recordingTimeVoice)}
                                </span>
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                              </div>
                              <button
                                onClick={stopRecordingVoiceChat}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                              >
                                إيقاف
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Recorded audio preview */}
                        <AnimatePresence>
                          {recordedAudioUrlChat && !isRecordingVoice && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="flex items-center gap-2 mb-3 p-3 bg-primary/10 border border-primary/20 rounded-xl"
                            >
                              <button
                                onClick={cancelRecordingVoiceChat}
                                className="p-2 hover:bg-primary/20 rounded-full transition-colors"
                              >
                                <Trash2
                                  size={16}
                                  className="text-destructive"
                                />
                              </button>
                              <div className="flex-1">
                                <audio
                                  src={recordedAudioUrlChat}
                                  controls
                                  className="w-full h-8"
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex items-center gap-2 bg-secondary/30 rounded-2xl border border-border p-2">
                          {/* Attachment Button */}
                          <button className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                            <Paperclip
                              size={18}
                              className="text-muted-foreground"
                            />
                          </button>

                          {/* Input Field with buttons inside */}
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              dir="rtl"
                              className="w-full py-3 pl-20 pr-4 rounded-xl bg-secondary border border-border focus:outline-none focus:border-primary text-base disabled:opacity-50 disabled:cursor-not-allowed"
                              placeholder="اكتب رسالتك..."
                              value={chatMessage}
                              onChange={(e) => setChatMessage(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendChat();
                                }
                              }}
                              disabled={isRecordingVoice || isSendingChat}
                            />
                            {/* Buttons inside input field (on the left side for RTL) */}
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                              {/* Voice recording button */}
                              <button
                                onClick={isRecordingVoice
                                  ? stopRecordingVoiceChat
                                  : startRecordingVoiceChat}
                                disabled={isSendingChat ||
                                  (recordedAudioUrlChat !== null &&
                                    !isRecordingVoice)}
                                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isRecordingVoice
                                    ? "bg-red-500 text-white animate-pulse"
                                    : "bg-transparent hover:bg-secondary/80 text-muted-foreground"
                                }`}
                                aria-label={isRecordingVoice
                                  ? "إيقاف التسجيل"
                                  : "تسجيل رسالة صوتية"}
                              >
                                <Mic
                                  size={18}
                                  className={isRecordingVoice
                                    ? "text-white"
                                    : "text-muted-foreground"}
                                />
                              </button>

                              {/* Send button */}
                              <motion.button
                                onClick={handleSendChat}
                                disabled={(!chatMessage.trim() &&
                                  !recordedAudioBlobChat) ||
                                  isSendingChat || isRecordingVoice}
                                className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                                whileHover={(!chatMessage.trim() &&
                                    !recordedAudioBlobChat) ||
                                    isSendingChat || isRecordingVoice
                                  ? {}
                                  : { scale: 1.05 }}
                                whileTap={(!chatMessage.trim() &&
                                    !recordedAudioBlobChat) ||
                                    isSendingChat || isRecordingVoice
                                  ? {}
                                  : { scale: 0.95 }}
                                aria-label="إرسال الرسالة"
                              >
                                {isSendingChat
                                  ? (
                                    <Loader2
                                      size={16}
                                      className="animate-spin"
                                    />
                                  )
                                  : <Send size={16} className="-rotate-90" />}
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* AI Offer Assist Modal */}
        {showAIAssist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-border bg-gradient-to-r from-indigo-500/10 to-purple-500/10 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2 text-indigo-600">
                  <Sparkles size={22} /> مساعد العروض الذكي
                </h3>
                <button onClick={() => setShowAIAssist(false)}>
                  <X size={22} />
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto no-scrollbar">
                <div className="flex gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <Wand2 size={24} />
                  </div>
                  <div className="bg-secondary p-3 rounded-2xl rounded-tr-none text-sm">
                    أهلاً بك! قرأت تفاصيل طلب "{request.title}". كيف تبي يكون
                    عرضك؟
                  </div>
                </div>
                {isGenerating && (
                  <div className="flex gap-3 mb-4 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 shrink-0">
                    </div>
                    <div className="h-10 bg-secondary rounded-2xl w-32"></div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-border bg-secondary/20">
                <div className="flex gap-2 relative">
                  <input
                    className="flex-1 border border-border rounded-full px-4 py-3 focus:border-primary outline-none pl-12 bg-background text-foreground text-base"
                    placeholder="اكتب فكرتك أو سجلها صوتياً..."
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAIGenerate()}
                  />
                  <button
                    onClick={toggleVoiceInput}
                    className={`absolute left-14 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors ${
                      isListening ? "text-red-500 animate-pulse" : ""
                    }`}
                  >
                    <Mic size={28} />
                  </button>
                  <button
                    onClick={handleAIGenerate}
                    className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-md"
                  >
                    <Send size={18} className="-rotate-90" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Share Card Preview - Used for generating share image */}
      <div
        id="share-card-preview"
        className="fixed -left-[9999px] w-[400px] bg-white rounded-2xl overflow-hidden shadow-2xl"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        {/* Header with Logo */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="text-white font-bold text-xl">أ</span>
            </div>
            <div className="text-white">
              <div className="font-bold text-lg">أبيلي</div>
              <div className="text-white/80 text-xs">السوق العكسي الذكي</div>
            </div>
          </div>
        </div>

        {/* Request Image or Placeholder */}
        <div className="h-40 bg-gray-100 flex items-center justify-center">
          {request.images && request.images.length > 0
            ? (
              <img
                src={request.images[0]}
                alt={request.title}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            )
            : (
              <div className="text-gray-400 flex flex-col items-center gap-2">
                <Camera size={40} strokeWidth={1} />
                <span className="text-sm">لا توجد صور</span>
              </div>
            )}
        </div>

        {/* Request Details */}
        <div className="p-5">
          <h2 className="font-bold text-xl text-gray-900 mb-2 line-clamp-2">
            {request.title}
          </h2>
          <p className="text-gray-600 text-sm line-clamp-3 mb-4">
            {request.description}
          </p>

          {/* Info Row */}
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
            {request.location && (
              <div className="flex items-center gap-1">
                <MapPin size={14} />
                <span>{request.location.split("،")[0]}</span>
              </div>
            )}
            {request.budgetType === "fixed" && (
              <div className="flex items-center gap-1">
                <DollarSign size={14} />
                <span>{request.budgetMin}-{request.budgetMax} ر.س</span>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-center py-3 rounded-xl font-bold">
            حمّل أبيلي الآن وقدم عرضك! 🚀
          </div>
        </div>
      </div>

      {/* Report Modal - Bottom Sheet Style for Mobile */}
      <AnimatePresence>
        {isReportModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmittingReport && setIsReportModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />

            {/* Modal - Bottom Sheet on Mobile, Centered on Desktop */}
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{
                type: "spring",
                damping: 35,
                stiffness: 400,
                mass: 0.8,
              }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.3 }}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                const velocityThreshold = 800;
                const offsetThreshold = 150;
                const shouldClose = info.offset.y > offsetThreshold ||
                  info.velocity.y > velocityThreshold;

                if (shouldClose) {
                  setIsReportModalOpen(false);
                }
              }}
              className="fixed inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 max-w-md w-full mx-auto bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl z-[101] max-h-[90vh] flex flex-col"
            >
              {/* Drag Handle - أعلى البوتوم شيت - Mobile Only */}
              <div className="sm:hidden flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none shrink-0">
                <div className="w-20 h-1 bg-muted-foreground/40 dark:bg-muted-foreground/50 rounded-full transition-colors duration-200 active:bg-muted-foreground/60" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <button
                  onClick={() =>
                    !isSubmittingReport && setIsReportModalOpen(false)}
                  className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
                <h3 className="font-bold text-lg">الإبلاغ عن الطلب</h3>
                <div className="w-9" />
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {reportSubmitted
                  ? (
                    /* Success State */
                    <div className="p-8 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                        className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/15 flex items-center justify-center"
                      >
                        <Check size={32} className="text-primary" />
                      </motion.div>
                      <h4 className="font-bold text-lg mb-2">تم إرسال البلاغ</h4>
                      <p className="text-muted-foreground text-sm">
                        شكراً لك، سنراجع البلاغ في أقرب وقت
                      </p>
                    </div>
                  )
                  : (
                    /* Form */
                    <div className="p-4 pb-4">
                      {/* Warning Icon */}
                      <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl mb-4">
                        <AlertTriangle
                          size={20}
                          className="text-red-500 shrink-0"
                        />
                        <p className="text-sm text-red-700 dark:text-red-300">
                          الإبلاغات الكاذبة قد تؤدي إلى تعليق حسابك
                        </p>
                      </div>

                      {/* Reason Selection */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">
                          سبب الإبلاغ <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                          {REPORT_REASONS.map((reason) => (
                            <button
                              key={reason.value}
                              onClick={() => setReportReason(reason.value)}
                              className={`w-full text-right px-4 py-3 rounded-xl border transition-all ${
                                reportReason === reason.value
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "bg-secondary/30 border-border hover:bg-secondary/50"
                              }`}
                            >
                              <span className="text-sm font-medium">
                                {reason.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Description (optional) */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          تفاصيل إضافية{" "}
                          <span className="text-muted-foreground">
                            (اختياري)
                          </span>
                        </label>
                        <textarea
                          value={reportDescription}
                          onChange={(e) => setReportDescription(e.target.value)}
                          placeholder="هل تريد إضافة تفاصيل أكثر عن المشكلة؟"
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background resize-none h-24 text-sm focus:outline-none focus:border-primary  transition-all placeholder:text-muted-foreground/50"
                          maxLength={500}
                        />
                        <p className="text-xs text-muted-foreground mt-1 text-left">
                          {reportDescription.length}/500
                        </p>
                      </div>
                    </div>
                  )}
              </div>

              {/* Fixed Submit Button - Outside Scrollable Area */}
              {!reportSubmitted && (
                <div className="shrink-0 p-4 pt-2 border-t border-border bg-card">
                  <button
                    onClick={handleSubmitReport}
                    disabled={!reportReason || isSubmittingReport}
                    className={`w-full py-3.5 rounded-xl font-bold text-white transition-all ${
                      reportReason && !isSubmittingReport
                        ? "bg-red-500 hover:bg-red-600 active:scale-[0.98]"
                        : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                    }`}
                  >
                    {isSubmittingReport
                      ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 size={18} className="animate-spin" />
                          جاري الإرسال...
                        </span>
                      )
                      : (
                        "إرسال البلاغ"
                      )}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fullscreen Image Modal */}
      <AnimatePresence>
        {expandedImageIndex !== null && request.images &&
          request.images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={() => setExpandedImageIndex(null)}
          >
            {/* Close Button */}
            <button
              onClick={() => setExpandedImageIndex(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X size={24} />
            </button>

            {/* Image Counter */}
            <div className="absolute top-4 left-4 z-10 text-white/70 text-sm">
              {(expandedImageIndex ?? 0) + 1} / {request.images.length}
            </div>

            {/* Main Image */}
            <motion.img
              key={expandedImageIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              src={request.images[expandedImageIndex ?? 0]}
              alt="Expanded"
              className="max-w-full max-h-full object-contain p-4"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Navigation Arrows */}
            {request.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedImageIndex((prev) =>
                      prev !== null
                        ? (prev - 1 + request.images!.length) %
                          request.images!.length
                        : 0
                    );
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <ChevronRight size={28} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedImageIndex((prev) =>
                      prev !== null ? (prev + 1) % request.images!.length : 0
                    );
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft size={28} />
                </button>
              </>
            )}

            {/* Dots Indicator */}
            {request.images.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {request.images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedImageIndex(idx);
                    }}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      idx === expandedImageIndex
                        ? "bg-white scale-125"
                        : "bg-white/40 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
