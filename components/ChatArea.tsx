import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  ImagePlus,
  MapPin,
  MapPinned,
  Mic,
  Navigation2,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
  Play,
  Pause,
} from "lucide-react";
import { Button } from "./ui/Button";
import { NoMessagesEmpty } from "./ui/EmptyState";
import { BrandSpinner, ChatMessageSkeleton } from "./ui/LoadingSkeleton";
import { Request } from "../types";
import { createRequestFromChat } from "../services/requestsService";
import { supabase } from "../services/supabaseClient";
import { generateDraftWithCta, checkAIConnection } from "../services/aiService";
import { verifyGuestPhone, confirmGuestPhone } from "../services/authService";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";


type AttachmentPreview = { name: string; url: string; file?: File };

type LocationCoords = { lat: number; lng: number; address?: string };

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  isDraftPreview?: boolean;
  draftData?: Partial<Request> & {
    seriousness?: number;
    suggestions?: string[];
    neighborhood?: string;
    isNeighborhoodEnabled?: boolean;
    isBudgetEnabled?: boolean;
    isDeliveryEnabled?: boolean;
    isAttachmentsEnabled?: boolean;
    isPublished?: boolean;
    publishedRequestId?: string;
    isSuperseded?: boolean;
    supersededById?: string;
    draftAttachments?: AttachmentPreview[];
    locationCoords?: LocationCoords;
  };
  isSuccess?: boolean;
  attachments?: AttachmentPreview[];
  audioUrl?: string | null;
  ctaMessage?: string;
  hasManualDraftButton?: boolean;
  hasClarificationOptions?: boolean;
  clarificationOptions?: string[];
  publishedRequestCard?: {
    title: string;
    description: string;
    location: string;
    budgetMin?: string | number;
    budgetMax?: string | number;
    deliveryTimeFrom?: string;
    categories?: string[];
  };
}

// Helper Component for Floating Label Input
const FloatingInput = ({
  label,
  value,
  onChange,
  type = "text",
  className = "",
  centered = false,
  shake = false,
  maxLength,
  warnAt,
}: {
  label: string;
  value: string | number | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
  centered?: boolean;
  shake?: boolean;
  maxLength?: number;
  warnAt?: number;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const hasValue = value !== "" && value !== undefined;
  const valueLength = typeof value === 'string' ? value.length : 0;
  const isOverLimit = maxLength ? valueLength > maxLength : false;
  const isNearLimit = warnAt ? valueLength >= warnAt && !isOverLimit : false;

  return (
    <motion.div 
      className={`relative ${className} overflow-visible`}
      animate={shake || isOverLimit ? { x: [-4, 4, -4, 4, -4, 4, 0] } : {}}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <input
        type={type}
        value={value || ""}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`peer w-full h-12 rounded-lg border-2 bg-background px-3 text-base outline-none transition-all ${
          shake || isOverLimit ? "border-red-500" : isNearLimit ? "border-amber-500" : isFocused ? "border-primary" : "border-border"
        } ${centered ? "text-center" : "text-right"}`}
      />
      <label
        className={`pointer-events-none absolute transition-all duration-200 flex items-center gap-1 ${
          isFocused || hasValue
            ? `top-0 ${centered ? "left-1/2 -translate-x-1/2" : "right-2"} -translate-y-1/2 bg-background px-1 text-[11px] font-bold ${shake || isOverLimit ? "text-red-500" : isNearLimit ? "text-amber-500" : "text-primary"}`
            : `top-1/2 ${centered ? "left-1/2 -translate-x-1/2" : "right-3"} -translate-y-1/2 text-sm ${shake || isOverLimit ? "text-red-500" : "text-muted-foreground"}`
        }`}
      >
        {label}
        {hasValue && !isFocused && !centered && <Check size={12} className="text-primary" />}
      </label>
      {/* Character limit warning - on bottom border like floating label */}
      {maxLength && hasValue && (
        <AnimatePresence>
          {(isNearLimit || isOverLimit) && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className={`absolute left-2 bottom-0 translate-y-1/2 bg-background px-1 text-[11px] font-bold ${
                isOverLimit ? "text-red-500" : "text-amber-500"
              }`}
            >
              {valueLength}/{maxLength}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};

// Helper Component for Floating Label Textarea with smart resize animation
const FloatingTextarea = ({
  label,
  value,
  onChange,
  rows = 2,
  className = "",
  shake = false,
  maxLength,
  warnAt,
}: {
  label: string;
  value: string | undefined;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  className?: string;
  shake?: boolean;
  maxLength?: number;
  warnAt?: number;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showResizeHint, setShowResizeHint] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasValue = value !== "" && value !== undefined;
  const valueLength = typeof value === 'string' ? value.length : 0;
  const isOverLimit = maxLength ? valueLength > maxLength : false;
  const isNearLimit = warnAt ? valueLength >= warnAt && !isOverLimit : false;
  const hintIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownFirstHint = useRef(false);
  const MIN_HEIGHT = 80;
  const isResizingRef = useRef(false);

  useEffect(() => {
    isResizingRef.current = isResizing;
  }, [isResizing]);

  const triggerResizeHint = useCallback(() => {
    setShowResizeHint(true);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => setShowResizeHint(false), 1500);
  }, []);

  // Smart resize hint animation:
  // - First hint once user starts typing
  // - Periodic subtle hint every 40s to indicate the bottom edge is draggable
  useEffect(() => {
    // Show hint when user types at least 3 characters for the first time
    if (valueLength >= 3 && isFocused && !hasShownFirstHint.current) {
      hasShownFirstHint.current = true;
      triggerResizeHint();
    }
  }, [isFocused, valueLength, triggerResizeHint]);

  useEffect(() => {
    hintIntervalRef.current = setInterval(() => {
      if (isResizingRef.current) return;
      triggerResizeHint();
    }, 40000);

    return () => {
      if (hintIntervalRef.current) clearInterval(hintIntervalRef.current);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, [triggerResizeHint]);

  // Reset first hint tracker when value is cleared
  useEffect(() => {
    if (!hasValue) {
      hasShownFirstHint.current = false;
    }
  }, [hasValue]);

  // Custom resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startHeight = textareaRef.current?.offsetHeight || MIN_HEIGHT;

    // Prevent page scroll during resize
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const delta = currentY - startY;
      const newHeight = Math.max(MIN_HEIGHT, startHeight + delta);
      setTextareaHeight(newHeight);
    };

    const handleEnd = () => {
      setIsResizing(false);
      // Restore page scroll
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  }, []);

  return (
    <motion.div 
      className={`relative ${className} overflow-visible`}
      animate={shake || isOverLimit ? { x: [-4, 4, -4, 4, -4, 4, 0] } : {}}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <textarea
        ref={textareaRef}
        value={value || ""}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        rows={rows}
        style={textareaHeight ? { height: `${textareaHeight}px` } : undefined}
        className={`peer block w-full rounded-lg border-2 bg-background px-3 pt-5 pb-12 text-base outline-none transition-colors resize-none min-h-[80px] max-h-[500px] leading-6 ${
          shake || isOverLimit ? "border-red-500" : isNearLimit ? "border-amber-500" : isFocused ? "border-primary" : "border-border"
        } text-right`}
      />
      
      {/* منطقة السحب في الحد السفلي كامل العرض */}
      <motion.div 
        className="absolute bottom-1 left-0 right-0 h-6 cursor-ns-resize z-10 flex items-center justify-center select-none bg-transparent"
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeStart}
        style={{ transformOrigin: "50% 100%", touchAction: "none" }}
        animate={showResizeHint ? { 
          scaleY: [1, 1.35, 1, 1.2, 1]
        } : {}}
        transition={showResizeHint ? { 
          duration: 1.2,
          ease: "easeInOut"
        } : {}}
      >
        {/* مقبض سحب (شرطتين) لتوضيح أن الحد السفلي قابل للسحب */}
        <div
          className={`flex flex-col items-center justify-center gap-1 rounded-md px-4 py-1 transition-colors duration-200 bg-background/90 ${
            isResizing || isFocused || showResizeHint ? "text-primary" : "text-muted-foreground/50"
          }`}
        >
          <div className="h-0.5 w-12 rounded-full bg-current opacity-70" />
          <div className="h-0.5 w-12 rounded-full bg-current opacity-70" />
        </div>
      </motion.div>

      <label
        className={`pointer-events-none absolute transition-all duration-200 flex items-center gap-1 z-20 ${
          isFocused || hasValue
            ? `top-0 right-2 -translate-y-1/2 bg-background px-1 text-[11px] font-bold ${shake || isOverLimit ? "text-red-500" : isNearLimit ? "text-amber-500" : "text-primary"}`
            : `top-4 right-3 text-sm ${shake || isOverLimit ? "text-red-500" : "text-muted-foreground"}`
        }`}
      >
        {label}
        {hasValue && !isFocused && <Check size={12} className="text-primary" />}
      </label>
      {/* Character limit warning - on bottom border */}
      {maxLength && hasValue && (
        <AnimatePresence>
          {(isNearLimit || isOverLimit) && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className={`absolute left-2 bottom-0 translate-y-1/2 bg-background px-1 text-[11px] font-bold ${
                isOverLimit ? "text-red-500" : "text-amber-500"
              }`}
            >
              {valueLength}/{maxLength}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};

// Simple Toggle Switch Component - Premium Style with Brand Colors
const ToggleSwitch = ({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
}) => (
  <button
    onClick={() => {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(15);
      }
      onChange(!enabled);
    }}
    className={`flex items-center justify-between w-full p-4 transition-all group ${
      enabled
        ? "bg-primary/5 dark:bg-primary/10 shadow-sm"
        : "bg-secondary/10 hover:bg-secondary/20"
    }`}
  >
    <span className={`text-sm font-bold transition-colors ${
      enabled ? "text-primary" : "text-foreground/80 group-hover:text-foreground"
    }`}>
      {label}
    </span>
    <div
      className={`w-14 h-7 rounded-full p-1 transition-all relative flex items-center ${
        enabled ? "bg-primary shadow-inner shadow-primary/30" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      {/* ON/OFF Indicators */}
      <span
        className={`absolute left-2 text-[8px] font-black uppercase pointer-events-none transition-opacity ${
          enabled ? "opacity-100 text-white" : "opacity-0"
        }`}
      >
        ON
      </span>
      <span
        className={`absolute right-2 text-[8px] font-black uppercase pointer-events-none transition-opacity ${
          !enabled ? "opacity-100 text-slate-500" : "opacity-0"
        }`}
      >
        OFF
      </span>

      <motion.div
        animate={{ x: enabled ? -28 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="w-5 h-5 bg-white rounded-full shadow-lg z-10"
      />
    </div>
  </button>
);

// Simple Audio Player Component for Messages
const AudioPlayer: React.FC<{ url: string }> = ({ url }) => {
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    const audio = audioRef;
    if (audio) {
      const handleLoadedMetadata = () => {
        const dur = audio.duration;
        if (dur && isFinite(dur)) {
          setDuration(dur);
        }
      };
      
      const handleTimeUpdate = () => {
        const time = audio.currentTime;
        const dur = audio.duration;
        if (dur && isFinite(dur) && dur > 0) {
          setCurrentTime(time);
          // Smooth progress update using requestAnimationFrame for better performance
          requestAnimationFrame(() => {
            setProgressPercent((time / dur) * 100);
          });
        }
      };
      
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setProgressPercent(0);
      };
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      
      // Load metadata immediately if already loaded
      if (audio.readyState >= 1) {
        const dur = audio.duration;
        if (dur && isFinite(dur)) {
          setDuration(dur);
        }
      }
      
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [audioRef]);

  const togglePlay = () => {
    if (audioRef) {
      if (isPlaying) {
        audioRef.pause();
      } else {
        audioRef.play().catch(err => {
          console.error("Error playing audio:", err);
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef && duration > 0) {
      audioRef.currentTime = newTime;
      setCurrentTime(newTime);
      setProgressPercent((newTime / duration) * 100);
    }
  };

  // Format time helper
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-secondary/30 rounded-2xl p-3 border border-border/50">
      <div className="flex items-center gap-2 flex-row-reverse">
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors shrink-0"
          title={isPlaying ? "إيقاف" : "تشغيل"}
        >
          {isPlaying ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" className="mr-0.5" />
          )}
        </button>
        <div className="flex-1 flex items-center gap-2 flex-row-reverse">
          <span className="text-xs text-muted-foreground tabular-nums shrink-0 min-w-[45px] text-right">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.01"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
            style={{
              background: `linear-gradient(to left, #1E968C 0%, #1E968C ${progressPercent}%, #e2e8f0 ${progressPercent}%, #e2e8f0 100%)`,
              transition: 'background 0.03s linear'
            }}
          />
        </div>
      </div>
      <audio
        ref={setAudioRef}
        src={url}
        preload="metadata"
        className="hidden"
      />
    </div>
  );
};

interface ChatAreaProps {
  onRequestPublished?: () => void;
  isGuest?: boolean;
  userId?: string;
  savedMessages?: ChatMessage[];
  onMessagesChange?: (messages: ChatMessage[]) => void;
  savedScrollPosition?: number;
  onScrollPositionChange?: (pos: number) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ 
  onRequestPublished, 
  isGuest = false, 
  userId,
  savedMessages,
  onMessagesChange,
  savedScrollPosition = 0,
  onScrollPositionChange
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(savedMessages || []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [seriousnessLevel, setSeriousnessLevel] = useState<number>(0);
  const [conversationTitle, setConversationTitle] = useState<string>("أبيلي");
  const [pendingDraft, setPendingDraft] = useState<any | null>(null);
  const [questions, setQuestions] = useState<Array<{
    key: string; 
    question: string; 
    answer?: string;
    quickOptions?: string[];
    inputPlaceholder?: string;
  }>>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [quickInputs, setQuickInputs] = useState<Record<string, string>>({});
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [clarificationAnswer, setClarificationAnswer] = useState<string | null>(null);
  const [pendingClarification, setPendingClarification] = useState<{question: string; quickOptions?: string[]} | null>(null);
  const [aiConnected, setAiConnected] = useState<boolean>(false); // Start as false to avoid flash
  
  // Guest verification state
  const [guestStep, setGuestStep] = useState<'none' | 'phone' | 'otp' | 'terms'>('none');
  const [guestPhone, setGuestPhone] = useState("");
  const [guestOTP, setGuestOTP] = useState("");
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pendingDraftForGuest, setPendingDraftForGuest] = useState<ChatMessage | null>(null);
  
  // Accordion mode state - lifted up to control chat input visibility
  const [smartModeOpenState, setSmartModeOpenState] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showNewRequestConfirm, setShowNewRequestConfirm] = useState(false);

  // Scroll container ref for tracking scroll position
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollPosRef = useRef<number>(0);
  const prevMessagesLengthRef = useRef<number>((savedMessages || []).length);

  // Update messages when savedMessages prop changes (from parent)
  useEffect(() => {
    if (savedMessages && savedMessages.length > 0 && messages.length === 0) {
      setMessages(savedMessages);
    }
  }, [savedMessages]);

  // Save messages when they change (but avoid infinite loop)
  useEffect(() => {
    if (onMessagesChange && messages.length > 0) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  // Restore scroll position on mount - use useLayoutEffect to restore before paint
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (container && savedScrollPosition > 0) {
      container.scrollTop = savedScrollPosition;
    }
  }, [savedScrollPosition]);

  // Track scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !onScrollPositionChange) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      lastScrollPosRef.current = scrollTop;
      
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
      // Save scroll position immediately on unmount (before timeout)
      if (onScrollPositionChange && lastScrollPosRef.current >= 0) {
        onScrollPositionChange(lastScrollPosRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [onScrollPositionChange]);

  // Save scroll position when component unmounts - useLayoutEffect ensures this runs synchronously before unmount
  useLayoutEffect(() => {
    return () => {
      // Save final scroll position before unmount
      if (onScrollPositionChange && scrollContainerRef.current) {
        const currentScroll = scrollContainerRef.current.scrollTop;
        if (currentScroll >= 0) {
          lastScrollPosRef.current = currentScroll;
          onScrollPositionChange(currentScroll);
        }
      } else if (onScrollPositionChange && lastScrollPosRef.current >= 0) {
        // Fallback: use last known scroll position if ref is not available
        onScrollPositionChange(lastScrollPosRef.current);
      }
    };
  }, [onScrollPositionChange]);

  const pushSystemMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + Math.random()).toString(),
        role: "ai",
        text,
      },
    ]);
  };

  const ensureAuthenticatedUserId = async (): Promise<string | null> => {
    // Prefer the prop coming from App.tsx (single source of truth)
    if (userId) return userId;

    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id ?? null;
    if (uid) return uid;

    // No authenticated session
    if (isGuest) {
      pushSystemMessage(
        "أنت في **وضع الضيف**. حالياً لا يمكن حفظ/نشر الطلبات في Supabase بدون تسجيل دخول. اضغط زر **تسجيل الدخول** من الشريط الجانبي ثم أعد نشر الطلب.",
      );
    } else {
      pushSystemMessage("لا يمكن نشر الطلب بدون تسجيل دخول. الرجاء تسجيل الدخول ثم إعادة المحاولة.");
    }
    return null;
  };

  // Saudi cities list
  const saudiCities = [
    "الرياض", "جدة", "الدمام", "المدينة المنورة", "مكة المكرمة",
    "الطائف", "بريدة", "خميس مشيط", "حائل", "جازان",
    "نجران", "الجبيل", "أبها", "ينبع", "الباحة",
    "سكاكا", "عرعر", "تبوك", "القريات", "عن بعد"
  ];

  // Attachments & audio
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [previewProgressPercent, setPreviewProgressPercent] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const smartModeInputRef = useRef<HTMLInputElement>(null);

  const placeholders = [
    "اكتب وصف طلبك بسرعة...",
    "أبي مبرمج لمتجر إلكتروني...",
    "أحتاج تصميم شعار بسيط...",
    "خدمة توصيل من العليا للنرجس...",
    "ميزانية من 500 إلى 800...",
    "أي طلب يخطر في بالك...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Check AI connection status and create manual draft if AI is not connected
  useEffect(() => {
    // 1. Create initial draft card immediately (don't wait for AI check)
    setMessages((prev) => {
      if (prev.length === 0) {
        const emptyDraft: ChatMessage = {
          id: Date.now().toString(),
          role: "ai",
          text: "", // No text - just show the form directly
          isDraftPreview: true,
          draftData: {
            title: "", // Will be auto-generated on publish
            description: "",
            location: "",
            categories: [],
            budgetMin: "",
            budgetMax: "",
            deliveryTimeFrom: "",
            budgetType: "negotiable",
            seriousness: seriousnessLevel,
            suggestions: [],
            isNeighborhoodEnabled: false,
            isBudgetEnabled: false,
            isDeliveryEnabled: false,
            isAttachmentsEnabled: false,
          },
        };
        setConversationTitle("طلب جديد");
        return [emptyDraft];
      }
      return prev;
    });

    // 2. Perform AI check in the background
    let cancelled = false;
    const checkAI = async () => {
      try {
        const status = await checkAIConnection();
        if (cancelled) return;
        
        setAiConnected(status.connected);
        if (!status.connected) {
          console.warn("⚠️ الذكاء الاصطناعي غير متصل:", status.error);
        } else {
          console.log("✅ الذكاء الاصطناعي متصل بنجاح");
        }
      } catch (err) {
        console.error("AI Check Error:", err);
      }
    };
    
    checkAI();
    return () => {
      cancelled = true;
    };
  }, [seriousnessLevel]);

  // Create empty manual draft (for when AI is not connected)
  const handleCreateManualDraft = () => {
    const emptyDraft: ChatMessage = {
      id: Date.now().toString(),
      role: "ai",
      text: "", // No text - just show the form directly
      isDraftPreview: true,
      draftData: {
        title: "", // Will be auto-generated on publish
        description: "",
        location: "",
        categories: [],
        budgetMin: "",
        budgetMax: "",
        deliveryTimeFrom: "",
        budgetType: "negotiable",
        seriousness: seriousnessLevel,
        suggestions: [],
        isNeighborhoodEnabled: false,
        isBudgetEnabled: false,
        isDeliveryEnabled: false,
        isAttachmentsEnabled: false,
      },
    };

    setMessages([emptyDraft]);
    setConversationTitle("طلب جديد");
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  // Always scroll to bottom when new messages arrive (not when existing messages are updated)
  useEffect(() => {
    // Only scroll if a new message was actually added (length increased)
    // This prevents scrolling when draft fields are updated
    const currentLength = messages.length;
    const prevLength = prevMessagesLengthRef.current;
    
    if (currentLength > prevLength && currentLength > 0) {
      // Small delay to ensure DOM is updated, then scroll
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 150);
      prevMessagesLengthRef.current = currentLength;
      return () => clearTimeout(timeoutId);
    } else if (currentLength !== prevLength) {
      // Update ref even if we don't scroll (e.g., messages were removed)
      prevMessagesLengthRef.current = currentLength;
    }
  }, [messages]);

  // Auto-focus input when smart mode opens
  useEffect(() => {
    if (smartModeOpenState && aiConnected !== false && smartModeInputRef.current) {
      // Small delay to ensure the input is rendered
      const timeoutId = setTimeout(() => {
        smartModeInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [smartModeOpenState, aiConnected]);

  // Timer for recording
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      setRecordingTime(0);
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Audio element event listeners for preview player
  useEffect(() => {
    const audio = audioElement;
    if (audio && recordedAudioUrl) {
      // Ensure audio source is set
      if (audio.src !== recordedAudioUrl) {
        audio.src = recordedAudioUrl;
        audio.load();
      }

      const handleLoadedMetadata = () => {
        const dur = audio.duration;
        if (dur && isFinite(dur) && dur > 0) {
          setDuration(dur);
        }
      };

      const handleCanPlay = () => {
        const dur = audio.duration;
        if (dur && isFinite(dur) && dur > 0) {
          setDuration(dur);
        }
      };
      
      const handleTimeUpdate = () => {
        const time = audio.currentTime;
        const dur = audio.duration;
        if (dur && isFinite(dur) && dur > 0) {
          setCurrentTime(time);
          // Update progress percent smoothly
          requestAnimationFrame(() => {
            setPreviewProgressPercent((time / dur) * 100);
          });
        }
      };
      
      const handlePlay = () => {
        setIsPlaying(true);
      };
      
      const handlePause = () => {
        setIsPlaying(false);
      };
      
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setPreviewProgressPercent(0);
      };
      
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      
      // Check if metadata is already loaded
      if (audio.readyState >= 2) {
        const dur = audio.duration;
        if (dur && isFinite(dur) && dur > 0) {
          setDuration(dur);
        }
      }
      
      // Sync playing state
      setIsPlaying(!audio.paused);
      
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
      };
    } else {
      // Reset when audio element is removed
      setCurrentTime(0);
      setDuration(0);
      setPreviewProgressPercent(0);
      setIsPlaying(false);
    }
  }, [audioElement, recordedAudioUrl]);

  const handleFilePick = () => fileInputRef.current?.click();

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    // Filter out duplicates by name
    setAttachedFiles((prev) => {
      const existingNames = new Set(prev.map(f => f.name));
      const newFiles = files.filter(f => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });
    
    // Reset input to allow selecting the same files again if needed
    e.target.value = "";
  };

  const removeFile = (name: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const startRecording = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("التسجيل الصوتي غير مدعوم في هذا المتصفح");
      return;
    }

    // Don't start if already recording or if there's a recorded audio pending
    if (isRecording || recordedAudioUrl) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          setRecordedAudioUrl(url);
          setAudioUrl(url);
        }
        setRecordingTime(0);
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setIsRecording(false);
        setMediaRecorder(null);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("حدث خطأ في بدء التسجيل");
      setIsRecording(false);
    }
  };

  const stopRecording = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (mediaRecorder && isRecording) {
      try {
        mediaRecorder.stop();
        setIsRecording(false);
        setMediaRecorder(null);
      } catch (error) {
        console.error("Error stopping recording:", error);
        setIsRecording(false);
        setMediaRecorder(null);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setRecordingTime(0);
      setRecordedAudioUrl(null);
      setAudioUrl(null);
    }
  };

  const clearPendingMedia = () => {
    setAttachedFiles([]);
    setAudioUrl(null);
    setRecordedAudioUrl(null);
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    // Also stop any ongoing recording
    if (mediaRecorder && isRecording) {
      try {
        mediaRecorder.stop();
      } catch (e) {
        console.error("Error stopping recorder in clearPendingMedia:", e);
      }
    }
    setIsRecording(false);
    setMediaRecorder(null);
    setRecordingTime(0);
  };

  const needsClarification = (text: string): { needs: boolean; clarificationQuestion?: string; quickOptions?: string[] } => {
    const lowerText = text.toLowerCase();
    
    // Check for car-related keywords
    if (lowerText.includes("سيارة") || lowerText.includes("مركبة") || lowerText.includes("لكزس") || 
        lowerText.includes("تويوتا") || lowerText.includes("نيسان") || lowerText.includes("هوندا") ||
        lowerText.includes("مرسيدس") || lowerText.includes("بي إم دبليو") || lowerText.includes("أودي")) {
      return {
        needs: true,
        clarificationQuestion: "🚗 ماذا تريد بخصوص السيارة؟",
        quickOptions: ["شراء سيارة", "إصلاح/صيانة", "قطع غيار", "تأمين", "تسجيل", "خدمة أخرى"]
      };
    }
    
    // Check for house/property keywords
    if (lowerText.includes("بيت") || lowerText.includes("فيلا") || lowerText.includes("شقة") || 
        lowerText.includes("عمارة") || lowerText.includes("أرض") || lowerText.includes("عقار")) {
      return {
        needs: true,
        clarificationQuestion: "🏠 ماذا تريد بخصوص العقار؟",
        quickOptions: ["شراء", "إيجار", "تأجير", "صيانة/ترميم", "تصميم داخلي", "خدمة أخرى"]
      };
    }
    
    // Check for phone/device keywords
    if (lowerText.includes("جوال") || lowerText.includes("هاتف") || lowerText.includes("آيفون") || 
        lowerText.includes("سامسونج") || lowerText.includes("جهاز") || lowerText.includes("تابلت")) {
      return {
        needs: true,
        clarificationQuestion: "📱 ماذا تريد بخصوص الجهاز؟",
        quickOptions: ["شراء", "إصلاح", "صيانة", "قطع غيار", "حماية/كفر", "خدمة أخرى"]
      };
    }
    
    // Check for computer/laptop keywords
    if (lowerText.includes("كمبيوتر") || lowerText.includes("لابتوب") || lowerText.includes("حاسوب") ||
        lowerText.includes("ماك") || lowerText.includes("ويندوز")) {
      return {
        needs: true,
        clarificationQuestion: "💻 ماذا تريد بخصوص الحاسوب؟",
        quickOptions: ["شراء", "إصلاح", "صيانة", "ترقية", "برمجة/تطوير", "خدمة أخرى"]
      };
    }
    
    // Check for furniture keywords
    if (lowerText.includes("أثاث") || lowerText.includes("كنبة") || lowerText.includes("طاولة") ||
        lowerText.includes("كرسي") || lowerText.includes("خزانة")) {
      return {
        needs: true,
        clarificationQuestion: "🪑 ماذا تريد بخصوص الأثاث؟",
        quickOptions: ["شراء", "تصميم", "إصلاح", "نقل/تركيب", "خدمة أخرى"]
      };
    }
    
    // Check for very short or vague messages
    if (text.length < 10 && !lowerText.includes("أريد") && !lowerText.includes("أحتاج") && 
        !lowerText.includes("أبي") && !lowerText.includes("مطلوب")) {
      return {
        needs: true,
        clarificationQuestion: "🤔 وضّح أكثر، ماذا تريد بالضبط؟",
        quickOptions: []
      };
    }
    
    return { needs: false };
  };

  const generateQuestions = (draft: any): Array<{
    key: string; 
    question: string;
    quickOptions?: string[];
    inputPlaceholder?: string;
  }> => {
    const qs: Array<{
      key: string; 
      question: string;
      quickOptions?: string[];
      inputPlaceholder?: string;
    }> = [];
    
    // Question 1: City
    if (!draft.location || !draft.location.trim()) {
      qs.push({
        key: "location",
        question: "📍 حدد المدينة اللي تبي التنفيذ فيها:",
        quickOptions: ["الرياض", "جدة", "الدمام", "المدينة المنورة", "عن بعد"],
        inputPlaceholder: "ابحث عن المدينة..."
      });
    }
    
    // Question 2: Description
    if (!draft.description || draft.description.trim() === "") {
      qs.push({
        key: "description",
        question: "📝 اكتب وصف مفصل لطلبك:",
        inputPlaceholder: "اشرح بالتفصيل ماذا تريد بالضبط..."
      });
    }
    
    // Question 4: Budget
    if (!draft.budgetMin && !draft.budgetMax) {
      qs.push({
        key: "budget",
        question: "💰 حدد الميزانية المتوقعة:",
        quickOptions: ["500-1000 ر.س", "1000-2000 ر.س", "2000-5000 ر.س", "5000+ ر.س", "تفاوض"],
        inputPlaceholder: "أو اكتب نطاق مخصص (مثال: 800-1200)..."
      });
    }
    
    // Question 5: Delivery Time
    if (!draft.deliveryTime || draft.deliveryTime === "غير محددة") {
      qs.push({
        key: "deliveryTime",
        question: "⏰ حدد مدة التنفيذ المطلوبة:",
        quickOptions: ["أسبوع", "أسبوعين", "شهر", "شهرين", "مرن"],
        inputPlaceholder: "أو اكتب مدة مخصصة..."
      });
    }
    
    return qs;
  };

  const handlePublishAsIs = async () => {
    if (!pendingDraft || !canPublishAsIs) return;
    
    // Haptic feedback - positive send pattern
    if (navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }
    
    const completedDraft = { ...pendingDraft };
    
    // Handle "عن بعد" as "غير محدد"
    const finalLocation = completedDraft.location && 
      completedDraft.location.toLowerCase().includes("عن بعد") 
      ? "غير محدد" 
      : (completedDraft.location || "");

    const draftData: Partial<Request> & {
      seriousness?: number;
      suggestions?: string[];
      neighborhood?: string;
      isNeighborhoodEnabled?: boolean;
      isBudgetEnabled?: boolean;
      isDeliveryEnabled?: boolean;
      isAttachmentsEnabled?: boolean;
      draftAttachments?: AttachmentPreview[];
      locationCoords?: LocationCoords;
    } = {
      title: completedDraft.title || "طلب جديد",
      description: completedDraft.description || completedDraft.summary || "",
      location: finalLocation,
      budgetMin: completedDraft.budgetMin || "",
      budgetMax: completedDraft.budgetMax || "",
      deliveryTimeFrom: completedDraft.deliveryTime || "",
      categories: completedDraft.categories || [],
      budgetType: (completedDraft.budgetMin || completedDraft.budgetMax)
        ? "fixed"
        : "negotiable",
      seriousness: completedDraft.seriousness || seriousnessLevel,
    };

    try {
      const authedUserId = await ensureAuthenticatedUserId();
      if (!authedUserId) return;

      const result = await createRequestFromChat(
        authedUserId,
        draftData,
        {
          title: draftData.title,
          description: draftData.description,
          budget_min: draftData.budgetMin || "",
          budget_max: draftData.budgetMax || "",
          budget_type: (draftData.budgetMin || draftData.budgetMax) ? "fixed" : "negotiable",
          location: draftData.location,
          delivery_from: draftData.deliveryTimeFrom || "",
          seriousness: draftData.seriousness || 2,
        }
      );
      
      if (result?.id) {
        const publishedCard: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text: "✅ تم نشر طلبك بنجاح!",
          publishedRequestCard: {
            title: draftData.title || "طلب جديد",
            description: draftData.description || "",
            location: draftData.location || "",
            budgetMin: draftData.budgetMin || "",
            budgetMax: draftData.budgetMax || "",
            deliveryTimeFrom: draftData.deliveryTimeFrom || "",
            categories: draftData.categories || [],
          },
        };
        
        setMessages((prev) => [...prev, publishedCard]);
        
        // Reload data in parent component
        if (onRequestPublished) {
          onRequestPublished();
        }
      }
    } catch (error) {
      console.error("Error publishing request:", error);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: "حدث خطأ أثناء نشر الطلب. حاول مرة أخرى.",
      }]);
    }

    setPendingDraft(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setIsLoading(false);
  };

  const handleManualDraftClick = () => {
    if (!pendingDraft) return;
    
    const draftPreview: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "ai",
      text: "تمام، جهزت لك المسودة أدناه. راجعها وعدّل عليها كما تشاء:",
      isDraftPreview: true,
      draftData: {
        title: pendingDraft.title || "طلب جديد",
        description: pendingDraft.description || pendingDraft.summary || "",
        budgetMin: pendingDraft.budgetMin || "",
        budgetMax: pendingDraft.budgetMax || "",
        location: pendingDraft.location || "",
        categories: pendingDraft.categories || [],
        deliveryTimeFrom: pendingDraft.deliveryTime || "",
        budgetType: (pendingDraft.budgetMin || pendingDraft.budgetMax)
          ? "fixed"
          : "negotiable",
        seriousness: pendingDraft.seriousness || seriousnessLevel,
        suggestions: pendingDraft.suggestions || [],
        isNeighborhoodEnabled: !!pendingDraft.location ||
          (!!pendingDraft.suggestions && pendingDraft.suggestions.includes("الموقع")),
        isBudgetEnabled: (!!pendingDraft.budgetMin || !!pendingDraft.budgetMax) ||
          (!!pendingDraft.suggestions && pendingDraft.suggestions.includes("الميزانية")),
        isDeliveryEnabled:
          (pendingDraft.deliveryTime && pendingDraft.deliveryTime !== "غير محددة") ||
          (!!pendingDraft.suggestions && pendingDraft.suggestions.includes("موعد")) ||
          (!!pendingDraft.suggestions && pendingDraft.suggestions.includes("مدة")),
      },
    };

    setMessages((prev) => [...prev, draftPreview]);
    setPendingDraft(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setIsLoading(false);
  };

  const canPublishAsIs = useMemo(() => {
    if (!pendingDraft) return false;
    
    // Check description from draft or from answered questions
    let description = pendingDraft.description || pendingDraft.summary || "";
    
    // Check if description was answered in questions
    const descriptionAnswer = questions.find(q => q.key === "description")?.answer;
    if (descriptionAnswer) {
      description = descriptionAnswer;
    }
    
    // Must have sufficient description (at least 15 characters to be meaningful)
    const hasSufficientDescription = description.trim().length >= 15;
    if (!hasSufficientDescription) return false;
    
    // Check location - prioritize answered questions first (most recent)
    let location = "";
    
    // First check answered questions (includes quick options)
    const locationAnswer = questions.find(q => q.key === "location")?.answer;
    if (locationAnswer && locationAnswer.trim()) {
      location = locationAnswer;
    }
    
    // Then check quickInputs (user's current typing)
    if (!location && quickInputs.location && quickInputs.location.trim()) {
      location = quickInputs.location;
    }
    
    // Finally check draft location
    if (!location) {
      location = pendingDraft.location || "";
    }
    
    // Must have location (city name or "عن بعد")
    const hasLocation = location && location.trim() !== "";
    const isRemote = location && location.toLowerCase().includes("عن بعد");
    
    return hasLocation || isRemote;
  }, [pendingDraft, questions, quickInputs]);


  const handleCompleteQuestions = async () => {
    if (!pendingDraft) return;
    
    // Create a complete request from the draft and answers
    const completedDraft = { ...pendingDraft };
    
    // Apply answers from questions
    questions.forEach(q => {
      if (q.answer) {
        switch(q.key) {
          case "location":
            completedDraft.location = q.answer.toLowerCase() === "عن بعد" ? "عن بعد" : q.answer;
            break;
          case "title":
            completedDraft.title = q.answer;
            break;
          case "description":
            completedDraft.description = q.answer;
            break;
          case "budget":
            if (q.answer.toLowerCase().includes("تفاوض")) {
              completedDraft.budgetMin = "";
              completedDraft.budgetMax = "";
            } else {
              const budgetMatch = q.answer.match(/(\d+)\s*-\s*(\d+)/);
              if (budgetMatch) {
                completedDraft.budgetMin = budgetMatch[1];
                completedDraft.budgetMax = budgetMatch[2];
              } else {
                const singleMatch = q.answer.match(/(\d+)/);
                if (singleMatch) {
                  completedDraft.budgetMin = singleMatch[1];
                  completedDraft.budgetMax = singleMatch[1];
                }
              }
            }
            break;
          case "deliveryTime":
            if (!q.answer.toLowerCase().includes("مرن")) {
              completedDraft.deliveryTime = q.answer;
            }
            break;
        }
      }
    });

    // Publish the request directly
    const requestData: Partial<Request> = {
      title: completedDraft.title || "طلب جديد",
      description: completedDraft.description || completedDraft.summary || "",
      location: completedDraft.location || "",
      budgetMin: completedDraft.budgetMin || "",
      budgetMax: completedDraft.budgetMax || "",
      deliveryTimeFrom: completedDraft.deliveryTime || "",
      categories: completedDraft.categories || [],
      budgetType: (completedDraft.budgetMin || completedDraft.budgetMax)
        ? "fixed"
        : "negotiable",
      seriousness: completedDraft.seriousness || seriousnessLevel,
    };

    try {
      const authedUserId = await ensureAuthenticatedUserId();
      if (!authedUserId) return;

      // Handle "عن بعد" as "غير محدد"
      const finalLocation = completedDraft.location && 
        completedDraft.location.toLowerCase().includes("عن بعد") 
        ? "غير محدد" 
        : (completedDraft.location || "");

      const draftData: Partial<Request> & {
        seriousness?: number;
        suggestions?: string[];
        neighborhood?: string;
        isNeighborhoodEnabled?: boolean;
        isBudgetEnabled?: boolean;
        isDeliveryEnabled?: boolean;
        isAttachmentsEnabled?: boolean;
        draftAttachments?: AttachmentPreview[];
        locationCoords?: LocationCoords;
      } = {
        title: completedDraft.title || "طلب جديد",
        description: completedDraft.description || completedDraft.summary || "",
        location: finalLocation,
        budgetMin: completedDraft.budgetMin || "",
        budgetMax: completedDraft.budgetMax || "",
        deliveryTimeFrom: completedDraft.deliveryTime || "",
        categories: completedDraft.categories || [],
        budgetType: (completedDraft.budgetMin || completedDraft.budgetMax)
          ? "fixed"
          : "negotiable",
        seriousness: completedDraft.seriousness || seriousnessLevel,
      };

      const result = await createRequestFromChat(
        authedUserId,
        draftData,
        {
          title: draftData.title,
          description: draftData.description,
          budget_min: draftData.budgetMin || "",
          budget_max: draftData.budgetMax || "",
          budget_type: (draftData.budgetMin || draftData.budgetMax) ? "fixed" : "negotiable",
          location: draftData.location,
          delivery_from: draftData.deliveryTimeFrom || "",
          seriousness: draftData.seriousness || 2,
        }
      );
      
      if (result?.id) {
        const publishedCard: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text: "✅ تم نشر طلبك بنجاح!",
          publishedRequestCard: {
            title: draftData.title || "طلب جديد",
            description: draftData.description || "",
            location: draftData.location || "",
            budgetMin: draftData.budgetMin || "",
            budgetMax: draftData.budgetMax || "",
            deliveryTimeFrom: draftData.deliveryTimeFrom || "",
            categories: draftData.categories || [],
          },
        };
        
        setMessages((prev) => [...prev, publishedCard]);
        
        // Reload data in parent component
        if (onRequestPublished) {
          onRequestPublished();
        }
      }
    } catch (error) {
      console.error("Error publishing request:", error);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: "حدث خطأ أثناء نشر الطلب. حاول مرة أخرى.",
      }]);
    }

    setPendingDraft(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setIsLoading(false);
  };

  const handleSend = async (text: string = input) => {
    const trimmedText = text.trim();
    const hasMedia = attachedFiles.length > 0 || audioUrl;
    if (!trimmedText && !hasMedia) return;

    // Check if this is the first message BEFORE adding it
    const isFirstMessage = messages.length === 0;

    const attachmentsPreview: AttachmentPreview[] = attachedFiles.map((
      file,
    ) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: trimmedText || "",
      attachments: attachmentsPreview.length > 0 ? attachmentsPreview : undefined,
      audioUrl: audioUrl || undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    // Don't clear media yet - we need it for AI processing
    setIsLoading(true);

    try {
      // If there's a pending draft with questions, handle the answer
      if (pendingDraft && questions.length > 0 && currentQuestionIndex < questions.length) {
        const currentQ = questions[currentQuestionIndex];
        const updatedQuestions = [...questions];
        updatedQuestions[currentQuestionIndex] = { ...currentQ, answer: trimmedText };
        setQuestions(updatedQuestions);

        // Move to next question
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);

        if (nextIndex < updatedQuestions.length) {
          // Ask next question
          const nextQ = updatedQuestions[nextIndex];
          setMessages((prev) => [...prev, {
            id: Date.now().toString(),
            role: "ai",
            text: nextQ.question,
            hasManualDraftButton: true,
          }]);
        } else {
          // All questions answered, publish the request
          await handleCompleteQuestions();
        }
        
        setIsLoading(false);
        return;
      }

      // Check if there's already a published request
      const hasPublishedRequest = messages.some(m => 
        m.isDraftPreview && 
        m.draftData?.isPublished && 
        m.draftData?.publishedRequestId
      );

      // Prepare final text for draft generation
      let finalText = trimmedText;
      
      // If clarification was answered, combine with original user message
      if (clarificationAnswer) {
        const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
        finalText = lastUserMessage ? `${lastUserMessage.text} ${clarificationAnswer}`.trim() : `${trimmedText} ${clarificationAnswer}`.trim();
        setClarificationAnswer(null); // Reset after use
      }
      
      // If AI is not connected, use automatic responses
      if (aiConnected === false) {
        const autoResponses = [
          "شكراً لك! يمكنك الآن ملء بيانات طلبك في المسودة أدناه.",
          "تم استلام رسالتك. استخدم المسودة أدناه لإكمال تفاصيل طلبك.",
          "فهمت. يمكنك الآن إكمال بيانات طلبك يدوياً من المسودة.",
        ];
        const randomResponse = autoResponses[Math.floor(Math.random() * autoResponses.length)];
        
        setMessages((prev) => [...prev, {
          id: Date.now().toString(),
          role: "ai",
          text: randomResponse,
        }]);
        
        setIsLoading(false);
        return;
      }

      // Check if clarification is needed (only if no clarification was asked yet)
      if (!clarificationAnswer && !pendingClarification) {
        const clarification = needsClarification(finalText);
        
        if (clarification.needs) {
          // Ask clarification question
          setPendingClarification({
            question: clarification.clarificationQuestion || "🤔 وضّح أكثر، ماذا تريد بالضبط؟",
            quickOptions: clarification.quickOptions
          });
          
          setMessages((prev) => [...prev, {
            id: Date.now().toString(),
            role: "ai",
            text: clarification.clarificationQuestion || "🤔 وضّح أكثر، ماذا تريد بالضبط؟",
            hasClarificationOptions: true,
            clarificationOptions: clarification.quickOptions || []
          }]);
          
          setIsLoading(false);
          return;
        }
      }
      
      // Prepare audio blob if audioUrl exists
      let audioBlob: Blob | undefined = undefined;
      if (audioUrl) {
        try {
          const response = await fetch(audioUrl);
          audioBlob = await response.blob();
        } catch (err) {
          console.error('Error converting audio URL to blob:', err);
        }
      }
      
      // Prepare attachments (images only for now)
      const imageAttachments = attachedFiles.filter(file => file.type.startsWith('image/'));
      
      const draft = await generateDraftWithCta(
        finalText || (imageAttachments.length > 0 || audioBlob ? "وصف قصير مع مرفقات" : ""),
        imageAttachments.length > 0 ? imageAttachments : undefined,
        audioBlob,
      );

      // Update conversation title automatically from AI-generated title
      // Let AI decide when to create a meaningful title (like ChatGPT/Gemini)
      // Only update if AI provides a clear title (not "طلب جديد" or empty)
      if (draft.title && draft.title.trim() && draft.title !== "طلب جديد") {
        setConversationTitle(draft.title.trim());
      }

      // AI Discussion Before
      if (draft.aiResponseBefore) {
        setMessages((prev) => [...prev, {
          id: (Date.now() + 0.5).toString(),
          role: "ai",
          text: draft.aiResponseBefore,
        }]);
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: draft.aiResponse || "سم، هذي المسودة جاهزة تحت أمرك!",
      };

      if (draft.isClarification) {
        setMessages((prev) => [...prev, aiMsg]);
        setIsLoading(false);
        return;
      }

      // If there's a published request, don't create new drafts (only in smart mode)
      // Only allow modification drafts (which should be handled separately)
      if (hasPublishedRequest && aiConnected) {
        // Find the published request to get its title
        const publishedDraft = messages.find(m => 
          m.isDraftPreview && 
          m.draftData?.isPublished && 
          m.draftData?.publishedRequestId
        );
        
        const publishedTitle = publishedDraft?.draftData?.title || "طلبك";
        
        // Create a custom response explaining this conversation is for the published request
        const modificationResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text: `هذه المحادثة مخصصة لطلبك "${publishedTitle}".\n\nإذا تريد تعديل طلبك، أرسل تعديلك برسالة أو تسجيل صوتي وسأقوم بإنشاء مسودة تعديل جديدة لك لتراجعها وتعتمدها.`,
        };
        
        setMessages((prev) => [...prev, modificationResponse]);
        setIsLoading(false);
        return;
      }

      // Hold the draft and start asking questions
      setPendingDraft({
        ...draft,
        seriousness: seriousnessLevel,
      });

      // Generate questions based on what's missing in the draft
      const generatedQuestions = generateQuestions(draft);
      setQuestions(generatedQuestions);
      setCurrentQuestionIndex(0);

      if (generatedQuestions.length > 0) {
        // Ask first question with manual draft button
        setMessages((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text: generatedQuestions[0].question,
          hasManualDraftButton: true,
        }]);
      } else {
        // No questions needed, publish directly
        await handleCompleteQuestions();
      }
    } catch (error) {
      console.error(error);
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text:
          "تعذر إنشاء مسودة الآن. تأكد من الربط مع Gemini/Supabase أو جرّب لاحقاً.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      // Clear media after AI processing is complete
      clearPendingMedia();
    }
  };

  const handlePublishDraft = async (
    draft: ChatMessage,
    skipValidation = false,
  ): Promise<string | null> => {
    if (!draft.draftData) return null;

    // Check if user is guest - require phone verification and terms acceptance
    // This check is now handled in the button onClick, so we can proceed if we reach here

    if (!skipValidation) {
      const issues = [];
      const d = draft.draftData;

      if (d.isNeighborhoodEnabled && !d.neighborhood) {
        issues.push("الحي/الموقع الدقيق");
      }
      if (
        d.isDeliveryEnabled &&
        (!d.deliveryTimeFrom || d.deliveryTimeFrom === "غير محددة")
      ) {
        issues.push("مدة التنفيذ");
      }
      if (d.isAttachmentsEnabled && (!d.draftAttachments || d.draftAttachments.length === 0)) {
        issues.push("الصور/المرفقات");
      }

      const isBudgetInvalid = d.isBudgetEnabled && (
        (!d.budgetMin && !d.budgetMax) ||
        (d.budgetMin && d.budgetMax &&
          parseFloat(d.budgetMax as string) < parseFloat(d.budgetMin as string))
      );

      if (issues.length > 0 || isBudgetInvalid) {
        let text = "";
        if (issues.length > 0) {
          text = `تراك فعلت خيار ${
            issues.join(" و ")
          } ولم تدخل بياناته، هل فعلاً تريد نشر الطلب بدونها؟`;
        }
        if (isBudgetInvalid) {
          text += (text ? "\n\n" : "") +
            "لن يتم وضع ميزانية محددة لكون الميزانية مدخلة بطريقة خاطئة أو ناقصة، هل تريد نشر الطلب بدون ميزانية؟";
        }

        const warningMsg: ChatMessage = {
          id: (Date.now() + 5).toString(),
          role: "ai",
          text,
          ctaMessage: "تأكيد النشر على أي حال",
          draftData: draft.draftData, // Keep ref to original draft data
        };

        setMessages((prev) => [...prev, warningMsg]);
        return null;
      }
    }

    setIsLoading(true);
    const draftData = draft.draftData;
    const seriousness = Math.min(
      3,
      Math.max(
        1,
        draftData.seriousness ??
          seriousnessLevel ??
          2,
      ),
    );

    try {
      const authedUserId = await ensureAuthenticatedUserId();
      if (!authedUserId) return null;

      const result = await createRequestFromChat(
        authedUserId,
        draftData,
        {
          title: draftData.title,
          description: draftData.description,
          budget_min: (draftData.isBudgetEnabled && draftData.budgetMin &&
              draftData.budgetMax &&
              parseFloat(draftData.budgetMax as string) >=
                parseFloat(draftData.budgetMin as string))
            ? draftData.budgetMin
            : "",
          budget_max: (draftData.isBudgetEnabled && draftData.budgetMin &&
              draftData.budgetMax &&
              parseFloat(draftData.budgetMax as string) >=
                parseFloat(draftData.budgetMin as string))
            ? draftData.budgetMax
            : "",
          budget_type: (draftData.isBudgetEnabled && draftData.budgetMin &&
              draftData.budgetMax &&
              parseFloat(draftData.budgetMax as string) >=
                parseFloat(draftData.budgetMin as string))
            ? "fixed"
            : (draftData.budgetType === "negotiable"
              ? "negotiable"
              : "not-specified"),
          location: draftData.location,
          delivery_from: (draftData.isDeliveryEnabled &&
              draftData.deliveryTimeFrom !== "غير محددة")
            ? draftData.deliveryTimeFrom
            : "",
          seriousness,
        },
      );
      const requestId = result?.id || null;


      // Only show success message in smart mode (when AI is connected)
      if (aiConnected !== false) {
        const requestTitle = draftData.title || "طلبك";
        const successMsg: ChatMessage = {
          id: (Date.now() + 2).toString(),
          role: "ai",
          text: `تم إنشاء الطلب وحفظه (ID: ${requestId || ""}).\n\nهذه المحادثة أصبحت مخصصة لطلبك "${requestTitle}". إذا تريد تعديل طلبك، أرسل تعديلك برسالة أو تسجيل صوتي وسأقوم بإنشاء مسودة تعديل جديدة لك لتراجعها وتعتمدها.`,
          isSuccess: true,
        };
        setMessages((prev) => [...prev, successMsg]);
      }
      return requestId;
    } catch (error) {
      console.error(error);
      const errMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: "ai",
        text: "تعذر إنشاء الطلب حالياً. تأكد من سياسات Supabase أو الاتصال.",
      };
      setMessages((prev) => [...prev, errMsg]);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateDraftField = (msgId: string, field: string, value: any) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.isDraftPreview && m.draftData) {
          return {
            ...m,
            draftData: { ...m.draftData, [field]: value },
          };
        }
        return m;
      })
    );
  };

  const handleStartNewRequest = () => {
    if (messages.length > 0) {
      setShowNewRequestConfirm(true);
    } else {
      confirmStartNewRequest();
    }
  };

  const confirmStartNewRequest = () => {
    setMessages([]);
    setInput("");
    clearPendingMedia();
    setConversationTitle("أبيلي");
    setShowNewRequestConfirm(false);
    if (onMessagesChange) {
      onMessagesChange([]);
    }
    // Scroll to top when starting a new request
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    // Also reset the messages length ref
    prevMessagesLengthRef.current = 0;
  };

  return (
    <>
      <div className="flex-1 flex flex-col h-full bg-background relative min-h-0">

        <div 
          ref={scrollContainerRef}
          className={`flex-1 overflow-y-auto min-h-0 relative ${messages.length === 0 && aiConnected !== false ? "flex items-center justify-center p-4" : ""}`}
        >
          {messages.length === 0 && aiConnected !== false && (
            <div className="flex flex-col items-center justify-center text-center">
              <NoMessagesEmpty />
            </div>
          )}

          {/* Show messages based on active mode */}
          {/* Draft previews (accordions) always appear */}
          {/* Chat messages (non-draft) appear ONLY inside Smart Mode accordion content */}
          {(() => {
            // Filter messages based on mode
            let filteredMessages = messages;
            
            if (aiConnected === false) {
              // When AI is not connected, show draft previews and AI/system messages
              filteredMessages = messages.filter((m) => m.isDraftPreview || m.role === "ai");
            } else if (smartModeOpenState) {
              // When smart mode is open, show ONLY draft previews here
              // Chat messages will be shown inside Smart Mode accordion content
              filteredMessages = messages.filter((m) => m.isDraftPreview);
            } else {
              // When smart mode is closed (manual mode), show only draft previews
              filteredMessages = messages.filter((m) => m.isDraftPreview);
            }
            
            return filteredMessages;
          })().map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 30,
                delay: index * 0.05
              }}
              className={`flex flex-col ${
                msg.role === "user" ? "items-start" : "items-end"
              } ${
                msg.isDraftPreview && index === 0 ? "" : index > 0 ? "mt-4" : ""
              } ${!msg.isDraftPreview ? "px-2 md:px-4" : ""}`}
            >
              <div
                className={`flex gap-2 ${
                  msg.isDraftPreview ? "w-full" : "max-w-[95%] md:max-w-[85%]"
                } ${msg.role === "user" ? "flex-row" : "flex-row-reverse"}`}
              >
                {!msg.isDraftPreview && msg.role === "user" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25, delay: index * 0.05 + 0.1 }}
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-1 bg-primary text-white"
                  >
                    <User size={16} />
                  </motion.div>
                )}

                <div className="flex flex-col gap-2 w-full">
                  {msg.text && msg.text.trim() && !msg.isDraftPreview && (
                    <div
                      className={`p-3 px-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm w-fit relative flex flex-col gap-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-none ml-auto"
                          : msg.isSuccess
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-tl-none mr-auto"
                          : "bg-secondary text-secondary-foreground rounded-tl-none border border-border mr-auto"
                      }`}
                    >
                      {msg.text}
                      
                      {/* Clarification Options */}
                      {msg.hasClarificationOptions && msg.clarificationOptions && msg.clarificationOptions.length > 0 && (
                        <div className="mt-3 space-y-2 w-full">
                          <div className="flex flex-wrap gap-2">
                            {msg.clarificationOptions.map((option) => (
                              <button
                                key={option}
                                onClick={() => {
                                  setClarificationAnswer(option);
                                  setPendingClarification(null);
                                  // Send the clarification answer
                                  handleSend(option);
                                }}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-background border border-border hover:bg-primary hover:text-white hover:border-primary transition-colors"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {msg.hasManualDraftButton && pendingDraft && questions.length > 0 && currentQuestionIndex < questions.length && (
                        <div className="mt-3 space-y-3 w-full">
                          {(() => {
                            const currentQ = questions[currentQuestionIndex];
                            return (
                              <>
                                {/* Quick Options */}
                                {currentQ.quickOptions && currentQ.quickOptions.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {currentQ.quickOptions.map((option) => (
                                      <button
                                        key={option}
                                        onClick={() => {
                                          const updatedQuestions = [...questions];
                                          updatedQuestions[currentQuestionIndex] = { ...currentQ, answer: option };
                                          setQuestions(updatedQuestions);
                                          
                                          // Auto-advance to next question
                                          const nextIndex = currentQuestionIndex + 1;
                                          setCurrentQuestionIndex(nextIndex);
                                          
                                          if (nextIndex < updatedQuestions.length) {
                                            const nextQ = updatedQuestions[nextIndex];
                                            setMessages((prev) => [...prev, {
                                              id: Date.now().toString(),
                                              role: "ai",
                                              text: nextQ.question,
                                              hasManualDraftButton: true,
                                            }]);
                                          } else {
                                            handleCompleteQuestions();
                                          }
                                        }}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-background border border-border hover:bg-primary hover:text-white hover:border-primary transition-colors"
                                      >
                                        {option}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Quick Input Field */}
                                {currentQ.inputPlaceholder && (
                                  <div className="relative w-full">
                                    {currentQ.key === "location" ? (
                                      <>
                                        <div className="relative flex items-center">
                                          <MapPin size={18} className="absolute right-3 text-muted-foreground pointer-events-none" />
                                          <input
                                            type="text"
                                            value={quickInputs[currentQ.key] || ""}
                                            onChange={(e) => {
                                              const value = e.target.value;
                                              setQuickInputs(prev => ({ ...prev, [currentQ.key]: value }));
                                              
                                              // Filter cities based on input
                                              if (value.trim()) {
                                                const filtered = saudiCities.filter(city => 
                                                  city.includes(value.trim())
                                                );
                                                setCitySuggestions(filtered);
                                                setShowCitySuggestions(filtered.length > 0);
                                              } else {
                                                setCitySuggestions([]);
                                                setShowCitySuggestions(false);
                                              }
                                            }}
                                            onFocus={() => {
                                              if (quickInputs[currentQ.key]?.trim()) {
                                                const filtered = saudiCities.filter(city => 
                                                  city.includes(quickInputs[currentQ.key]?.trim() || "")
                                                );
                                                setCitySuggestions(filtered);
                                                setShowCitySuggestions(filtered.length > 0);
                                              }
                                            }}
                                            onBlur={() => {
                                              // Delay hiding suggestions to allow click
                                              setTimeout(() => setShowCitySuggestions(false), 200);
                                            }}
                                            onKeyPress={(e) => {
                                              if (e.key === "Enter" && quickInputs[currentQ.key]?.trim()) {
                                                const answer = quickInputs[currentQ.key];
                                                const updatedQuestions = [...questions];
                                                updatedQuestions[currentQuestionIndex] = { ...currentQ, answer };
                                                setQuestions(updatedQuestions);
                                                
                                                const nextIndex = currentQuestionIndex + 1;
                                                setCurrentQuestionIndex(nextIndex);
                                                
                                                if (nextIndex < updatedQuestions.length) {
                                                  const nextQ = updatedQuestions[nextIndex];
                                                  setMessages((prev) => [...prev, {
                                                    id: Date.now().toString(),
                                                    role: "ai",
                                                    text: nextQ.question,
                                                    hasManualDraftButton: true,
                                                  }]);
                                                } else {
                                                  handleCompleteQuestions();
                                                }
                                                
                                                setQuickInputs(prev => ({ ...prev, [currentQ.key]: "" }));
                                                setCitySuggestions([]);
                                                setShowCitySuggestions(false);
                                              }
                                            }}
                                            placeholder={currentQ.inputPlaceholder}
                                            className="w-full pr-10 pl-12 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              // TODO: Open map picker for exact location
                                              alert("سيتم فتح خريطة لاختيار الموقع الدقيق قريباً");
                                            }}
                                            className="absolute left-2 p-1.5 rounded-lg hover:bg-secondary transition-colors"
                                            title="إضافة موقع دقيق"
                                          >
                                            <MapPinned size={16} className="text-primary" />
                                          </button>
                                        </div>
                                        
                                        {/* City Suggestions Dropdown */}
                                        {showCitySuggestions && citySuggestions.length > 0 && (
                                          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {citySuggestions.map((city) => (
                                              <button
                                                key={city}
                                                type="button"
                                                onClick={() => {
                                                  setQuickInputs(prev => ({ ...prev, [currentQ.key]: city }));
                                                  setCitySuggestions([]);
                                                  setShowCitySuggestions(false);
                                                }}
                                                className="w-full text-right px-4 py-2 hover:bg-secondary transition-colors flex items-center gap-2"
                                              >
                                                <MapPin size={14} className="text-muted-foreground" />
                                                <span className="text-sm">{city}</span>
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <input
                                        type="text"
                                        value={quickInputs[currentQ.key] || ""}
                                        onChange={(e) => {
                                          setQuickInputs(prev => ({ ...prev, [currentQ.key]: e.target.value }));
                                        }}
                                        onKeyPress={(e) => {
                                          if (e.key === "Enter" && quickInputs[currentQ.key]?.trim()) {
                                            const updatedQuestions = [...questions];
                                            updatedQuestions[currentQuestionIndex] = { ...currentQ, answer: quickInputs[currentQ.key] };
                                            setQuestions(updatedQuestions);
                                            
                                            const nextIndex = currentQuestionIndex + 1;
                                            setCurrentQuestionIndex(nextIndex);
                                            
                                            if (nextIndex < updatedQuestions.length) {
                                              const nextQ = updatedQuestions[nextIndex];
                                              setMessages((prev) => [...prev, {
                                                id: Date.now().toString(),
                                                role: "ai",
                                                text: nextQ.question,
                                                hasManualDraftButton: true,
                                              }]);
                                            } else {
                                              handleCompleteQuestions();
                                            }
                                            
                                            setQuickInputs(prev => ({ ...prev, [currentQ.key]: "" }));
                                          }
                                        }}
                                        placeholder={currentQ.inputPlaceholder}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                      />
                                    )}
                                  </div>
                                )}
                                
                                {/* Action Buttons - Side by Side */}
                                <div className="flex gap-2 w-full">
                                  <Button
                                    size="sm"
                                    onClick={handleManualDraftClick}
                                    className="flex-1 bg-primary text-white hover:bg-primary/90 text-xs h-9"
                                  >
                                    أكمل يدوياً
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      handlePublishAsIs();
                                    }}
                                    disabled={!canPublishAsIs}
                                    className={`flex-1 text-xs h-9 ${
                                      canPublishAsIs
                                        ? "bg-[#153659] text-white hover:bg-[#153659]/90"
                                        : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                    }`}
                                  >
                                    نشر الطلب كما هو
                                  </Button>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                      {msg.ctaMessage && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            // Find original draft and update its state
                            const originalDraft = messages.find(m => 
                              m.isDraftPreview && 
                              m.draftData?.title === msg.draftData?.title
                            );
                            
                            if (originalDraft && msg.draftData) {
                              // Close fields that are enabled but not filled
                              const d = msg.draftData;
                              
                              if (d.isNeighborhoodEnabled && !d.neighborhood) {
                                updateDraftField(originalDraft.id, "isNeighborhoodEnabled", false);
                                updateDraftField(originalDraft.id, "neighborhood", "");
                                updateDraftField(originalDraft.id, "locationCoords", undefined);
                              }
                              
                              if (d.isDeliveryEnabled && (!d.deliveryTimeFrom || d.deliveryTimeFrom === "غير محددة")) {
                                updateDraftField(originalDraft.id, "isDeliveryEnabled", false);
                                updateDraftField(originalDraft.id, "deliveryTimeFrom", "");
                              }
                              
                              if (d.isAttachmentsEnabled && (!d.draftAttachments || d.draftAttachments.length === 0)) {
                                updateDraftField(originalDraft.id, "isAttachmentsEnabled", false);
                                updateDraftField(originalDraft.id, "draftAttachments", []);
                              }
                              
                              // Fix budget if invalid
                              const isBudgetInvalid = d.isBudgetEnabled && (
                                (!d.budgetMin && !d.budgetMax) ||
                                (d.budgetMin && d.budgetMax &&
                                  parseFloat(d.budgetMax as string) < parseFloat(d.budgetMin as string))
                              );
                              
                              if (isBudgetInvalid) {
                                updateDraftField(originalDraft.id, "isBudgetEnabled", false);
                                updateDraftField(originalDraft.id, "budgetMin", "");
                                updateDraftField(originalDraft.id, "budgetMax", "");
                                updateDraftField(originalDraft.id, "budgetType", "not-specified");
                              }
                              
                              // Update the original draft data with cleaned data
                              const cleanedDraft = { ...originalDraft };
                              if (cleanedDraft.draftData) {
                                cleanedDraft.draftData = {
                                  ...cleanedDraft.draftData,
                                  isNeighborhoodEnabled: d.isNeighborhoodEnabled && !!d.neighborhood,
                                  isDeliveryEnabled: d.isDeliveryEnabled && !!d.deliveryTimeFrom && d.deliveryTimeFrom !== "غير محددة",
                                  isAttachmentsEnabled: d.isAttachmentsEnabled && !!d.draftAttachments && d.draftAttachments.length > 0,
                                  isBudgetEnabled: d.isBudgetEnabled && !isBudgetInvalid,
                                };
                              }
                              
                              // Update published state
                              updateDraftField(originalDraft.id, "isPublished", true);
                              
                              // Publish with cleaned draft
                              const requestId = await handlePublishDraft(cleanedDraft, true);
                              if (requestId) {
                                updateDraftField(originalDraft.id, "publishedRequestId", requestId);
                              }
                            } else {
                              // Fallback: publish the warning message draft
                              const requestId = await handlePublishDraft(msg, true);
                              if (requestId && originalDraft) {
                                updateDraftField(originalDraft.id, "publishedRequestId", requestId);
                              }
                            }
                          }}
                          className="bg-primary text-white font-bold h-8 text-[11px] rounded-lg self-end"
                        >
                          نشر الطلب
                        </Button>
                      )}
                    </div>
                  )}

                  {msg.attachments?.length && !msg.isDraftPreview && (
                    <div className="bg-background border border-border rounded-xl p-2 shadow-sm">
                      <div className={`flex gap-2 flex-row-reverse ${msg.attachments.length > 1 ? 'overflow-x-auto no-scrollbar' : ''}`} style={{ direction: 'ltr' }}>
                        {msg.attachments.map((att) => {
                          const isImage = att.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                          return (
                            <a
                              key={att.url}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-border overflow-hidden hover:border-primary transition-colors shrink-0 block"
                              style={{ 
                                width: msg.attachments.length > 1 ? '120px' : '120px',
                                height: msg.attachments.length > 1 ? '120px' : '120px',
                                aspectRatio: '1/1'
                              }}
                            >
                              {isImage ? (
                                <div className="w-full h-full flex flex-col">
                                  <div className="flex-1 overflow-hidden">
                                    <img
                                      src={att.url}
                                      alt={att.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="px-2 py-1 text-[10px] text-muted-foreground line-clamp-1 bg-background/90 shrink-0">
                                    {att.name}
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-secondary/50">
                                  <div className="text-[8px] font-bold text-muted-foreground mb-1">
                                    {att.name.split(".").pop()?.toUpperCase()}
                                  </div>
                                  <div className="text-[9px] text-muted-foreground line-clamp-2 text-center">
                                    {att.name}
                                  </div>
                                </div>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {msg.audioUrl && !msg.isDraftPreview && (
                    <AudioPlayer url={msg.audioUrl} />
                  )}

                  {/* Published Request Card */}
                  {msg.publishedRequestCard && (
                    <div className="w-full bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-2xl p-5 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <CheckCircle size={20} className="text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-primary">تم نشر طلبك بنجاح!</h3>
                          <p className="text-xs text-muted-foreground">الآن يمكن للعارضين رؤية طلبك والتقدم بعروضهم</p>
                        </div>
                      </div>
                      
                      <div className="bg-background/80 rounded-xl p-4 space-y-3 border border-border/50">
                        <div>
                          <h4 className="font-bold text-base mb-1">{msg.publishedRequestCard.title}</h4>
                          {msg.publishedRequestCard.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {msg.publishedRequestCard.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {msg.publishedRequestCard.location && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin size={16} className="text-primary" />
                              <span>{msg.publishedRequestCard.location}</span>
                            </div>
                          )}
                          {(msg.publishedRequestCard.budgetMin || msg.publishedRequestCard.budgetMax) && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <DollarSign size={16} className="text-primary" />
                              <span>
                                {msg.publishedRequestCard.budgetMin && msg.publishedRequestCard.budgetMax
                                  ? `${msg.publishedRequestCard.budgetMin} - ${msg.publishedRequestCard.budgetMax} ر.س`
                                  : msg.publishedRequestCard.budgetMin || msg.publishedRequestCard.budgetMax
                                  ? `${msg.publishedRequestCard.budgetMin || msg.publishedRequestCard.budgetMax} ر.س`
                                  : "تفاوض"}
                              </span>
                            </div>
                          )}
                          {msg.publishedRequestCard.deliveryTimeFrom && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock size={16} className="text-primary" />
                              <span>{msg.publishedRequestCard.deliveryTimeFrom}</span>
                            </div>
                          )}
                        </div>
                        
                        {msg.publishedRequestCard.categories && msg.publishedRequestCard.categories.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {msg.publishedRequestCard.categories.map((cat) => (
                              <span
                                key={cat}
                                className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {msg.isDraftPreview && msg.draftData && (
                    <div className="w-full">
                      <DraftPreviewCard
                        msg={msg}
                        seriousnessLevel={seriousnessLevel}
                        setSeriousnessLevel={setSeriousnessLevel}
                        updateDraftField={updateDraftField}
                        handlePublishDraft={handlePublishDraft}
                        setMessages={setMessages}
                        aiConnected={aiConnected}
                        onStartNewRequest={handleStartNewRequest}
                        isGuest={isGuest}
                        smartModeOpen={smartModeOpenState}
                        setSmartModeOpen={setSmartModeOpenState}
                        allMessages={messages}
                        isLoading={isLoading}
                        onGuestPublish={(draftMsg) => {
                          setPendingDraftForGuest(draftMsg);
                          setGuestStep('phone');
                        }}
                        onNavigateToRequest={(requestId) => {
                          // TODO: Integrate with App.tsx navigation
                          console.log("Navigate to request:", requestId);
                          alert(`سيتم الانتقال للطلب رقم: ${requestId}`);
                        }}
                        scrollToNewDraft={(newDraftId) => {
                          const element = document.getElementById(`draft-${newDraftId}`);
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {isLoading && !smartModeOpenState && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end px-2 md:px-4"
            >
              <div className="flex gap-2">
                <div className="bg-gradient-to-r from-secondary to-secondary/50 p-4 rounded-2xl rounded-tl-none border border-border/50 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      يتم التحضير...
                    </span>
                    <div className="flex flex-row-reverse gap-1">
                      <motion.span
                        className="w-2 h-2 bg-primary rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      />
                      <motion.span
                        className="w-2 h-2 bg-primary/80 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                      />
                      <motion.span
                        className="w-2 h-2 bg-primary/60 rounded-full"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
           <div ref={messagesEndRef} />
         </div>

         {/* Guest Verification Modal */}
         {isGuest && guestStep !== 'none' && ReactDOM.createPortal(
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
               <motion.div
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border"
               >
                 {guestStep === 'phone' && (
                   <div className="space-y-4">
                     <h3 className="text-lg font-bold text-right">التحقق من رقم الجوال</h3>
                     <p className="text-sm text-muted-foreground text-right">
                       لإتمام إنشاء الطلب، نحتاج للتحقق من رقم جوالك. سيتم إرسال رمز تحقق على رقمك.
                     </p>
                     <div className="relative">
                       <input
                         type="tel"
                         value={guestPhone}
                         onChange={(e) => setGuestPhone(e.target.value)}
                         placeholder="5XX XXX XXX"
                         className="w-full h-12 px-4 text-right rounded-lg border-2 border-border bg-background text-base outline-none transition-all focus:border-primary"
                         dir="ltr"
                       />
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">+966</span>
                     </div>
                     <div className="flex gap-2">
                       <button
                         onClick={async () => {
                           if (!guestPhone.trim()) {
                             alert("يرجى إدخال رقم الجوال");
                             return;
                           }
                           setIsSendingOTP(true);
                           const result = await verifyGuestPhone(guestPhone);
                           setIsSendingOTP(false);
                           if (result.success) {
                             setGuestStep('otp');
                             // Show code in development (remove in production!)
                             if (result.verificationCode) {
                               alert(`رمز التحقق (للتطوير فقط): ${result.verificationCode}`);
                             }
                           } else {
                             alert(result.error || "فشل إرسال رمز التحقق");
                           }
                         }}
                         disabled={isSendingOTP}
                         className="flex-1 h-12 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                       >
                         {isSendingOTP ? "جاري الإرسال..." : "إرسال رمز التحقق"}
                       </button>
                       <button
                         onClick={() => {
                           setGuestStep('none');
                           setGuestPhone("");
                           setPendingDraftForGuest(null);
                         }}
                         className="px-4 h-12 bg-secondary text-foreground rounded-lg font-bold hover:bg-secondary/80 transition-colors"
                       >
                         إلغاء
                       </button>
                     </div>
                   </div>
                 )}
                 
                 {guestStep === 'otp' && (
                   <div className="space-y-4">
                     <h3 className="text-lg font-bold text-right">أدخل رمز التحقق</h3>
                     <p className="text-sm text-muted-foreground text-right">
                       تم إرسال رمز التحقق إلى {guestPhone}
                     </p>
                     <input
                       type="text"
                       value={guestOTP}
                       onChange={(e) => setGuestOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                       placeholder="000000"
                       className="w-full h-12 px-4 text-center rounded-lg border-2 border-border bg-background text-2xl font-bold tracking-widest outline-none transition-all focus:border-primary"
                       dir="ltr"
                       maxLength={6}
                     />
                     <div className="flex gap-2">
                       <button
                         onClick={async () => {
                           if (guestOTP.length !== 6) {
                             alert("يرجى إدخال رمز التحقق المكون من 6 أرقام");
                             return;
                           }
                           setIsVerifyingOTP(true);
                           const result = await confirmGuestPhone(guestPhone, guestOTP);
                           setIsVerifyingOTP(false);
                           if (result.success) {
                             setGuestStep('terms');
                           } else {
                             alert(result.error || "رمز التحقق غير صحيح");
                             setGuestOTP("");
                           }
                         }}
                         disabled={isVerifyingOTP}
                         className="flex-1 h-12 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                       >
                         {isVerifyingOTP ? "جاري التحقق..." : "تحقق"}
                       </button>
                       <button
                         onClick={() => {
                           setGuestStep('phone');
                           setGuestOTP("");
                         }}
                         className="px-4 h-12 bg-secondary text-foreground rounded-lg font-bold hover:bg-secondary/80 transition-colors"
                       >
                         رجوع
                       </button>
                     </div>
                   </div>
                 )}
                 
                 {guestStep === 'terms' && (
                   <div className="space-y-4">
                     <h3 className="text-lg font-bold text-right">الشروط والأحكام</h3>
                     <div className="bg-secondary/50 rounded-lg p-4 max-h-60 overflow-y-auto text-sm text-muted-foreground text-right">
                       <p className="mb-2">بإنشاء هذا الطلب، أنت توافق على:</p>
                       <ul className="list-disc list-inside space-y-1 mr-4">
                         <li>الشروط والأحكام الخاصة بمنصة أبيلي</li>
                         <li>سياسة الخصوصية</li>
                         <li>أنك ستستخدم المنصة بشكل قانوني وأخلاقي</li>
                         <li>أن المعلومات المقدمة صحيحة ودقيقة</li>
                       </ul>
                     </div>
                     <label className="flex items-center gap-2 cursor-pointer">
                       <input
                         type="checkbox"
                         checked={termsAccepted}
                         onChange={(e) => setTermsAccepted(e.target.checked)}
                         className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                       />
                       <span className="text-sm">أوافق على الشروط والأحكام</span>
                     </label>
                     <div className="flex gap-2">
                       <button
                         onClick={async () => {
                           if (!termsAccepted) {
                             alert("يرجى الموافقة على الشروط والأحكام");
                             return;
                           }
                           setGuestStep('none');
                           setTermsAccepted(false);
                           // NOTE: Guest verification here does NOT create a Supabase auth session.
                           // Without an authenticated user, RLS will typically block inserts.
                           pushSystemMessage(
                             "✅ تم التحقق من رقم جوالك. لإكمال نشر الطلب وحفظه في Supabase، الرجاء **تسجيل الدخول** (من الشريط الجانبي) ثم إعادة نشر الطلب.",
                           );
                         }}
                         disabled={!termsAccepted}
                         className="flex-1 h-12 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         موافق وإنشاء الطلب
                       </button>
                       <button
                         onClick={() => {
                           setGuestStep('otp');
                           setTermsAccepted(false);
                         }}
                         className="px-4 h-12 bg-secondary text-foreground rounded-lg font-bold hover:bg-secondary/80 transition-colors"
                       >
                         رجوع
                       </button>
                     </div>
                   </div>
                 )}
               </motion.div>
             </div>,
             document.body
           )}

         {isRecording && (
          <div className="absolute inset-x-0 bottom-[110%] p-4 bg-red-500/90 backdrop-blur-md rounded-2xl text-white flex items-center justify-between shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 flex-1">
              {/* Waveform Visualization */}
              <div className="flex items-center gap-1 h-6">
                {Array.from({ length: 20 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-white rounded-full"
                    animate={{
                      height: [4, Math.random() * 20 + 8, 4],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.05,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span className="text-sm font-bold tabular-nums">
                  {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
            <button
              onClick={cancelRecording}
              className="bg-white text-red-600 px-4 py-1 rounded-full text-[11px] font-black hover:bg-white/90 shrink-0"
            >
              إلغاء
            </button>
          </div>
        )}

        {/* Input bar - only show when AI is connected AND smart mode is open */}
        {aiConnected !== false && smartModeOpenState && (
        <motion.div 
          className={`flex items-center gap-2 rounded-xl p-2 shadow-lg focus-within:shadow-xl focus-within:ring-2 focus-within:ring-primary/30 transition-all relative z-10 mx-3 md:mx-4 mt-1 mb-[calc(env(safe-area-inset-bottom,0px)+16px)] bg-background/95 backdrop-blur-sm border ${
            isInputFocused 
              ? 'border-primary' 
              : 'border-border/50'
          }`}
          animate={!input.trim() && !isInputFocused ? {
            boxShadow: [
              '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 0px rgba(16, 185, 170, 0), 0 0 0 0px rgba(14, 211, 238, 0)',
              '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 2px rgba(16, 185, 170, 0.65), 0 0 0 0.5px rgba(14, 211, 238, 0.5)',
              '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 3px rgba(16, 185, 170, 0.3), 0 0 0 1px rgba(14, 211, 238, 0.35)',
              '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 2px rgba(16, 185, 170, 0.65), 0 0 0 0.5px rgba(14, 211, 238, 0.5)',
              '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 0px rgba(16, 185, 170, 0), 0 0 0 0px rgba(14, 211, 238, 0)',
            ],
          } : {}}
          transition={{
            duration: 1.5,
            repeat: !input.trim() && !isInputFocused ? Infinity : 0,
            ease: "easeInOut",
          }}
        >
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-background/80 transition-colors shrink-0"
            onClick={handleFilePick}
            title="إرفاق ملفات (يمكن اختيار عدة ملفات معاً)"
          >
            <Paperclip size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          />

          {/* Textarea or Audio Player */}
          {recordedAudioUrl && !isRecording ? (
            <div className="flex-1 flex items-center gap-2 flex-row-reverse">
              <button
                onClick={async () => {
                  if (audioElement) {
                    try {
                      if (isPlaying) {
                        await audioElement.pause();
                      } else {
                        await audioElement.play();
                      }
                    } catch (err) {
                      console.error("Error playing audio:", err);
                    }
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors shrink-0"
                title={isPlaying ? "إيقاف" : "تشغيل"}
              >
                {isPlaying ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" className="mr-0.5" />
                )}
              </button>
              <div className="flex-1 flex items-center gap-2 flex-row-reverse">
                {duration > 0 ? (
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0 min-w-[45px] text-right">
                    {(() => {
                      const formatTime = (seconds: number): string => {
                        if (!isFinite(seconds) || isNaN(seconds) || seconds <= 0) return "0:00";
                        const mins = Math.floor(seconds / 60);
                        const secs = Math.floor(seconds % 60);
                        return `${mins}:${secs.toString().padStart(2, '0')}`;
                      };
                      return `${formatTime(currentTime)} / ${formatTime(duration)}`;
                    })()}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground shrink-0">
                    جاري التحميل...
                  </span>
                )}
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.01"
                  value={currentTime}
                  onChange={(e) => {
                    const newTime = parseFloat(e.target.value);
                    if (audioElement && duration > 0) {
                      audioElement.currentTime = newTime;
                      setCurrentTime(newTime);
                      setPreviewProgressPercent((newTime / duration) * 100);
                    }
                  }}
                  className="flex-1 h-1 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
                  style={{
                    background: `linear-gradient(to left, #1E968C 0%, #1E968C ${previewProgressPercent}%, #e2e8f0 ${previewProgressPercent}%, #e2e8f0 100%)`,
                    transition: 'background 0.03s linear'
                  }}
                />
              </div>
              <motion.button
                onClick={() => {
                  // Haptic feedback
                  if (navigator.vibrate) {
                    navigator.vibrate(50);
                  }
                  setRecordedAudioUrl(null);
                  setAudioUrl(null);
                  if (audioElement) {
                    audioElement.pause();
                    setAudioElement(null);
                  }
                  setIsPlaying(false);
                  setCurrentTime(0);
                  setDuration(0);
                  setPreviewProgressPercent(0);
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                title="حذف التسجيل"
              >
                <X size={16} />
              </motion.button>
              <audio
                ref={(audio) => {
                  if (audio) {
                    if (recordedAudioUrl) {
                      setAudioElement(audio);
                      audio.src = recordedAudioUrl;
                      audio.preload = "metadata";
                      // Force load metadata
                      audio.load();
                    } else {
                      setAudioElement(null);
                    }
                  }
                }}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex-1 relative">
              <input
                ref={smartModeInputRef}
                type="text"
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none text-sm py-2 placeholder:truncate"
                placeholder={placeholders[placeholderIndex]}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>
          )}

          {/* Hide Mic button when reviewing recorded audio */}
          {!recordedAudioUrl && (
            <div className="relative shrink-0">
              {/* Recording Waves Animation */}
              {isRecording && (
                <>
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full border-2 border-red-500"
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{
                        scale: [1, 1.5, 2],
                        opacity: [0.8, 0.4, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.5,
                        ease: "easeOut",
                      }}
                    />
                  ))}
                </>
              )}
              <button
                className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 z-10 ${
                  isRecording
                    ? "bg-red-500 text-white"
                    : "text-muted-foreground hover:text-primary hover:bg-background/80"
                }`}
                onMouseDown={(e) => startRecording(e)}
                onMouseUp={(e) => stopRecording(e)}
                onMouseLeave={(e) => stopRecording(e)}
                onTouchStart={(e) => startRecording(e)}
                onTouchEnd={(e) => stopRecording(e)}
                title="اضغط مع الاستمرار للتسجيل"
              >
                <Mic size={20} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleSend()}
              disabled={isLoading ||
                (!input.trim() && attachedFiles.length === 0 && !audioUrl)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                input.trim() || attachedFiles.length > 0 || audioUrl
                  ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Send size={18} className="-rotate-90" />
            </button>
          </div>
        </motion.div>
        )}

        {(attachedFiles.length > 0) && (
          <div className="mt-3 px-1">
            <div className={`flex gap-2 flex-row-reverse ${attachedFiles.length > 1 ? 'overflow-x-auto no-scrollbar' : ''}`} style={{ direction: 'ltr' }}>
              {attachedFiles.map((file) => {
                const isImage = file.type.startsWith("image/");
                const fileUrl = URL.createObjectURL(file);
                return (
                  <div
                    key={file.name}
                    className="relative group shrink-0 bg-secondary rounded-xl overflow-hidden border border-border shadow-sm"
                    style={{ 
                      width: '120px',
                      height: '120px',
                      aspectRatio: '1/1'
                    }}
                  >
                    {isImage ? (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full h-full flex flex-col"
                      >
                        <div className="flex-1 overflow-hidden">
                          <img
                            src={fileUrl}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="px-2 py-1 text-[10px] text-muted-foreground line-clamp-1 bg-background/80 shrink-0">
                          {file.name}
                        </div>
                      </a>
                    ) : (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full h-full flex flex-col items-center justify-center p-2 bg-secondary/50 hover:bg-secondary/80 transition-colors"
                      >
                        <div className="text-[8px] font-bold text-muted-foreground mb-1">
                          {file.name.split(".").pop()?.toUpperCase()}
                        </div>
                        <div className="text-[9px] text-muted-foreground line-clamp-2 text-center">
                          {file.name}
                        </div>
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFile(file.name);
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-all z-20 flex items-center justify-center"
                      title="إزالة الملف"
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* New Request Confirmation Modal */}
      <AnimatePresence>
        {showNewRequestConfirm && ReactDOM.createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowNewRequestConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
            >
              <h3 className="text-lg font-bold text-right">طلب جديد</h3>
              <p className="text-sm text-muted-foreground text-right">
                سيتم مسح جميع الرسائل الحالية، هل أنت متأكد؟
              </p>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setShowNewRequestConfirm(false)}
                  className="px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors font-medium"
                >
                  رجوع
                </button>
                <button
                  onClick={() => {
                    confirmStartNewRequest();
                  }}
                  className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium"
                >
                  نعم، ابدأ طلب جديد
                </button>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
};

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" className="fill-current">
    <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
  </svg>
);
const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" className="fill-current">
    <path d="M17 3H5a2 2 0 0 0-2 2v14c0 1.103.897 2 2 2h14a2 2 0 0 0 2-2V7l-4-4zm-5 2h2v4h-2V5zm2 14h-4v-6h4v6zm2 0h-1v-7H9v7H5V5h4v4h6V5h.586L19 8.414V19z" />
  </svg>
);

interface DraftPreviewCardProps {
  msg: ChatMessage;
  seriousnessLevel: number;
  setSeriousnessLevel: (val: number) => void;
  updateDraftField: (id: string, field: string, value: any) => void;
  handlePublishDraft: (msg: ChatMessage, skipValidation?: boolean) => Promise<string | null>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onNavigateToRequest?: (requestId: string) => void;
  scrollToNewDraft?: (newDraftId: string) => void;
  aiConnected: boolean | null;
  onStartNewRequest: () => void;
  isGuest: boolean;
  onGuestPublish?: (msg: ChatMessage) => void;
  smartModeOpen: boolean;
  setSmartModeOpen: (val: boolean) => void;
  allMessages: ChatMessage[];
  isLoading: boolean;
}

const DraftPreviewCard: React.FC<DraftPreviewCardProps> = ({
  msg,
  seriousnessLevel,
  setSeriousnessLevel,
  updateDraftField,
  handlePublishDraft,
  aiConnected,
  setMessages,
  onNavigateToRequest,
  scrollToNewDraft,
  onStartNewRequest,
  isGuest,
  onGuestPublish,
  smartModeOpen,
  setSmartModeOpen,
  allMessages,
  isLoading,
}) => {
  const draftData = msg.draftData!;
  const [localPublished, setLocalPublished] = useState(draftData.isPublished || false);
  const [publishedRequestId, setPublishedRequestId] = useState<string | null>(draftData.publishedRequestId || null);
  const isSuperseded = draftData.isSuperseded || false;

  const [isPublishing, setIsPublishing] = useState(false);
  const [originalPublishedData, setOriginalPublishedData] = useState<any>(
    draftData.isPublished ? JSON.parse(JSON.stringify(draftData)) : null
  );

  // Sync localPublished and publishedRequestId with draftData changes
  useEffect(() => {
    if (draftData.isPublished !== localPublished) {
      setLocalPublished(draftData.isPublished || false);
    }
    if (draftData.publishedRequestId !== publishedRequestId) {
      setPublishedRequestId(draftData.publishedRequestId || null);
    }
    if (draftData.isPublished && !originalPublishedData) {
      setOriginalPublishedData(JSON.parse(JSON.stringify(draftData)));
    }
  }, [draftData.isPublished, draftData.publishedRequestId, localPublished, publishedRequestId, originalPublishedData]);

  const onPublish = async (m: ChatMessage) => {
    // Check if guest - show verification modal
    if (isGuest && onGuestPublish) {
      // Haptic feedback - positive send pattern
      if (navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }
      onGuestPublish(m);
      return;
    }
    
    // Haptic feedback - positive send pattern
    if (navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }
    
    setIsPublishing(true);
    setLocalPublished(true); // Turn green immediately
    const requestId = await handlePublishDraft(m);
    if (requestId) {
      setPublishedRequestId(requestId);
      updateDraftField(m.id, "isPublished", true);
      updateDraftField(m.id, "publishedRequestId", requestId);
      // Save original data to track changes
      setOriginalPublishedData(JSON.parse(JSON.stringify(m.draftData)));
    } else {
      // Revert if failed
      setLocalPublished(false);
    }
    setIsPublishing(false);
  };

  // Check if any field has been modified after publishing
  const hasModifications = () => {
    if (!localPublished || !originalPublishedData) return false;
    
    const current = draftData;
    const original = originalPublishedData;
    
    // Compare all relevant fields
    return (
      current.title !== original.title ||
      current.description !== original.description ||
      current.location !== original.location ||
      current.neighborhood !== original.neighborhood ||
      current.isNeighborhoodEnabled !== original.isNeighborhoodEnabled ||
      current.isBudgetEnabled !== original.isBudgetEnabled ||
      current.budgetMin !== original.budgetMin ||
      current.budgetMax !== original.budgetMax ||
      current.budgetType !== original.budgetType ||
      current.isDeliveryEnabled !== original.isDeliveryEnabled ||
      current.deliveryTimeFrom !== original.deliveryTimeFrom ||
      current.isAttachmentsEnabled !== original.isAttachmentsEnabled ||
      current.seriousness !== original.seriousness
    );
  };

  const handleSaveModifications = async () => {
    setIsPublishing(true);
    const requestId = await handlePublishDraft(msg);
    if (requestId) {
      // Update original data after saving
      setOriginalPublishedData(JSON.parse(JSON.stringify(msg.draftData)));
      // Show success message only in smart mode (when AI is connected)
      if (aiConnected !== false) {
        const successMsg: ChatMessage = {
          id: (Date.now() + 2).toString(),
          role: "ai",
          text: `تم حفظ التعديلات على طلبك "${draftData.title || "طلبك"}" بنجاح.`,
          isSuccess: true,
        };
        setMessages((prev) => [...prev, successMsg]);
      }
    }
    setIsPublishing(false);
  };

  const handleNavigateToPublished = () => {
    if (publishedRequestId && onNavigateToRequest) {
      onNavigateToRequest(publishedRequestId);
    }
  };

  const handleScrollToNewDraft = () => {
    if (draftData.supersededById && scrollToNewDraft) {
      scrollToNewDraft(draftData.supersededById);
    }
  };

  // If superseded, render frozen card
  if (isSuperseded) {
    return (
      <div className="w-full mb-4 opacity-50 pointer-events-none" id={`draft-${msg.id}`}>
        <div className="bg-card rounded-[32px] border border-border shadow-sm overflow-hidden">
          <div className="bg-secondary/10 px-6 py-4 flex items-center gap-3 border-b border-border/50">
            <Bot size={22} className="text-muted-foreground" />
            <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">
              مسودة سابقة
            </span>
          </div>
          <div className="p-6 space-y-4 text-muted-foreground">
            <p className="font-bold text-sm">{draftData.title}</p>
            <p className="text-xs line-clamp-2">{draftData.description}</p>
          </div>
          <div className="p-3 bg-secondary/10 border-t border-border/50 pointer-events-auto">
            <Button
              onClick={handleScrollToNewDraft}
              className="w-full h-10 bg-gray-400 hover:bg-gray-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2"
            >
              <span>مسودة منتهية، انتقل للمسودة المحدثة ↓</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // smartModeOpen is now a prop from parent, manualModeOpen is the opposite
  const manualModeOpen = !smartModeOpen;
  
  // Helper to switch modes with haptic feedback
  const switchToSmartMode = () => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
    setSmartModeOpen(true);
  };
  
  const switchToManualMode = () => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
    setSmartModeOpen(false);
  };
  const [isShaking, setIsShaking] = useState(false);
  const [shakingFields, setShakingFields] = useState<{title: boolean; description: boolean; location: boolean}>({
    title: false, description: false, location: false
  });
  const [shouldShakeAfterTransition, setShouldShakeAfterTransition] = useState(false);
  const smartModeMessagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll smart mode messages to bottom when new messages arrive
  useEffect(() => {
    if (smartModeOpen && allMessages.length > 0) {
      const timeoutId = setTimeout(() => {
        if (smartModeMessagesEndRef.current) {
          smartModeMessagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [allMessages, smartModeOpen]);

  // Scroll to top when component mounts (new conversation)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const mainScrollContainer = document.getElementById('main-scroll-container');
    if (mainScrollContainer) {
      mainScrollContainer.scrollTop = 0;
    }
  }, []);

  // Trigger shake after accordion opens (after layout animation completes)
  useEffect(() => {
    if (smartModeOpen || manualModeOpen) {
      // Wait for layout animation to complete (spring animation duration ~300-400ms)
      const timer = setTimeout(() => {
        setShouldShakeAfterTransition(true);
        setTimeout(() => setShouldShakeAfterTransition(false), 400);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [smartModeOpen, manualModeOpen]);

  return (
    <div className="w-full" id={`draft-${msg.id}`}>
      {/* Sticky Accordion Headers with Layout Animation */}
      <LayoutGroup>
        <div className={`sticky z-40 bg-background shadow-sm ${
          manualModeOpen 
            ? "top-0" 
            : "bottom-0 mb-1"
        }`}>
          {/* Render headers in order: closed one first, open one second (at bottom) */}
          {/* Always show Smart Mode accordion when AI is connected */}
          {!smartModeOpen && aiConnected === true && (
            <motion.div
              layout
              layoutId="smart-mode-header"
              transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.5 }}
              style={{ 
                backgroundColor: 'rgba(200, 200, 200, 0.3)'
              }}
            >
              <button
                onClick={switchToSmartMode}
                className="w-full text-right flex items-center justify-between px-4 py-2.5 transition-colors active:scale-[0.98]"
              >
                <span className="text-sm font-medium text-foreground">
                  🤖 الوضع الذكي السريع
                </span>
                <ChevronDown 
                  size={18} 
                  className="text-foreground transition-transform duration-200"
                />
              </button>
            </motion.div>
          )}

          {/* Show Manual Mode accordion header when it's closed AND smart mode is NOT open */}
          {/* (When smart mode is open, the manual header is shown inside the smart mode content area) */}
          {!manualModeOpen && !smartModeOpen && (
            <motion.div
              layout
              layoutId="manual-mode-header"
              transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.5 }}
              style={{ 
                backgroundColor: 'rgba(200, 200, 200, 0.3)'
              }}
            >
              <button
                onClick={switchToManualMode}
                className="w-full text-right flex items-center justify-between px-4 py-2.5 transition-colors active:scale-[0.98]"
              >
                <span className="text-sm font-medium text-foreground">
                  ✍️ الإنشاء اليدوي للطلب
                </span>
                <ChevronDown 
                  size={18} 
                  className="text-foreground transition-transform duration-200"
                />
              </button>
            </motion.div>
          )}

           {/* AI Maintenance Mode Header - Disabled when AI is not connected */}
           {aiConnected === false && (
             <motion.div 
               style={{ backgroundColor: 'rgba(200, 200, 200, 0.25)' }}
               animate={isShaking ? {
                 x: [-4, 4, -4, 4, -4, 4, 0],
               } : {}}
               transition={{ duration: 0.5, ease: "easeInOut" }}
             >
               <button
                 onClick={() => {
                   // Haptic feedback - stronger vibration pattern
                   if (navigator.vibrate) {
                     navigator.vibrate([100, 50, 100, 50, 100]);
                   }
                   // Trigger shake animation
                   setIsShaking(true);
                   setTimeout(() => setIsShaking(false), 600);
                 }}
                 className="w-full text-right flex items-center justify-between px-4 py-3 transition-colors opacity-50 cursor-not-allowed active:opacity-70"
               >
                 <div className="flex items-center gap-2">
                   <motion.span 
                     className="text-sm font-medium text-foreground"
                     animate={isShaking ? {
                       x: [-2, 2, -2, 2, -2, 2, 0],
                     } : {}}
                     transition={{ duration: 0.5, ease: "easeInOut" }}
                   >
                     🤖 الوضع الذكي السريع
                   </motion.span>
                   <motion.span 
                     className="text-xs"
                     animate={isShaking ? {
                       color: ["#9ca3af", "#ef4444", "#9ca3af", "#ef4444", "#9ca3af", "#ef4444", "#9ca3af"],
                       scale: [1, 1.2, 1, 1.2, 1, 1.2, 1],
                       x: [-1, 1, -1, 1, -1, 1, 0],
                     } : {
                       color: "#9ca3af",
                       scale: 1,
                       x: 0,
                     }}
                     transition={{ duration: 0.6 }}
                   >
                     تحت الصيانة
                   </motion.span>
                 </div>
                 <motion.div
                   animate={isShaking ? {
                     rotate: [-5, 5, -5, 5, -5, 5, 0],
                   } : {}}
                   transition={{ duration: 0.5, ease: "easeInOut" }}
                 >
                   <ChevronDown size={18} className="text-muted-foreground" />
                 </motion.div>
               </button>
             </motion.div>
           )}

          {/* Smart Mode Header - Open (at bottom) */}
          {smartModeOpen && aiConnected === true && (
            <motion.div
              layout
              layoutId="smart-mode-header"
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 35, 
                mass: 0.5
              }}
              animate={shouldShakeAfterTransition ? {
                x: [0, -2, 2, -2, 2, 0],
              } : {}}
              style={{ 
                backgroundColor: '#0d9488'
              }}
            >
              <button
                onClick={() => {
                  // When closing smart mode, manual mode opens automatically (it's derived)
                  if (navigator.vibrate) {
                    navigator.vibrate(15);
                  }
                  setSmartModeOpen(false);
                  setShouldShakeAfterTransition(false);
                }}
                className="w-full text-right flex items-center justify-between px-4 py-2.5 transition-colors active:scale-[0.98]"
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm font-medium text-white font-bold">
                    🤖 الوضع الذكي السريع
                  </span>
                  {allMessages.filter((m) => !m.isDraftPreview).length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartNewRequest();
                      }}
                      className="text-xs px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors font-medium"
                    >
                      طلب جديد
                    </button>
                  )}
                </div>
                <X 
                  size={18} 
                  className="text-white transition-transform duration-200"
                />
              </button>
            </motion.div>
          )}

          {/* Manual Mode Header - Open (at bottom) */}
          {manualModeOpen && (
            <motion.div
              layout
              layoutId="manual-mode-header"
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 35, 
                mass: 0.5
              }}
              animate={shouldShakeAfterTransition ? {
                x: [0, -2, 2, -2, 2, 0],
              } : {}}
              style={{ 
                backgroundColor: '#0d9488'
              }}
            >
              <button
                onClick={() => {
                  // When closing manual mode, open smart mode (it's the opposite, so just toggle)
                  if (navigator.vibrate) {
                    navigator.vibrate(15);
                  }
                  if (aiConnected === true) {
                    setSmartModeOpen(true);
                  }
                  setShouldShakeAfterTransition(false);
                }}
                className="w-full text-right flex items-center justify-between px-4 py-2.5 transition-colors active:scale-[0.98]"
              >
                <span className="text-sm font-medium text-white font-bold">
                  ✍️ الإنشاء اليدوي للطلب
                </span>
                <X 
                  size={18} 
                  className="text-white transition-transform duration-200"
                />
              </button>
            </motion.div>
          )}
        </div>
      </LayoutGroup>
      
      {/* Smart Mode Content - Floating chat area visual */}
      <AnimatePresence>
        {smartModeOpen && aiConnected === true && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="relative">
              {/* Glassmorphic overlay - messages scroll behind it */}
              <div 
                className="absolute inset-0 z-10 pointer-events-none"
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  borderBottom: '1px solid rgba(30, 150, 140, 0.1)',
                }}
              />
              <div className="relative z-20 flex items-center justify-center min-h-[60px] px-4 py-2">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xs text-teal-600/80 dark:text-teal-400/80 text-center px-4 font-medium"
                >
                  <span className="block">🤖 الذكاء الاصطناعي سيساعدك في إنشاء طلبك</span>
                  <span className="block mt-1 text-[10px]">صف ما تحتاجه بكلماتك الخاصة</span>
                </motion.div>
              </div>
            </div>
            
            {/* Chat Messages - Inside Smart Mode Accordion */}
            <div className="px-2 py-1 space-y-2 max-h-[400px] overflow-y-auto pb-4">
              {allMessages
                .filter((m) => !m.isDraftPreview)
                .map((chatMsg, chatIndex) => (
                  <motion.div
                    key={chatMsg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: chatIndex * 0.05 }}
                    className={`flex flex-col ${
                      chatMsg.role === "user" ? "items-start" : "items-end"
                    }`}
                  >
                    <div
                      className={`flex gap-2 ${
                        chatMsg.role === "user" ? "flex-row" : "flex-row-reverse"
                      } max-w-[85%]`}
                    >
                      {!chatMsg.isDraftPreview && chatMsg.role === "user" && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-primary text-white"
                        >
                          <User size={14} />
                        </motion.div>
                      )}
                      {chatMsg.text && chatMsg.text.trim() && (
                        <div
                          className={`p-2.5 px-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                            chatMsg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-tr-none"
                              : chatMsg.isSuccess
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-tl-none"
                              : "bg-secondary text-secondary-foreground rounded-tl-none border border-border"
                          }`}
                        >
                          {chatMsg.text}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              
              {/* Loading indicator - Inside Smart Mode */}
              {isLoading && (
                <div className="flex flex-col gap-4 mt-4">
                  <ChatMessageSkeleton />
                </div>
              )}
              <div ref={smartModeMessagesEndRef} />
            </div>
            
            {/* Closed Manual Mode header appears inside smart mode visually */}
            <motion.div
              layout
              transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.5 }}
              style={{ backgroundColor: 'rgba(200, 200, 200, 0.3)' }}
              className="mt-1"
            >
              <button
                onClick={switchToManualMode}
                className="w-full text-right flex items-center justify-between px-4 py-2.5 transition-colors active:scale-[0.98]"
              >
                <span className="text-sm font-medium text-foreground">
                  ✍️ الإنشاء اليدوي للطلب
                </span>
                <ChevronDown 
                  size={18} 
                  className="text-foreground transition-transform duration-200"
                />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Mode Content - Always available when draft exists */}
      {/* Manual mode form is always available alongside AI chat for editing */}
      <AnimatePresence>
        {manualModeOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-visible"
            >
              <div className="px-4 pb-32 bg-background relative md:max-w-4xl md:mx-auto">
                  {/* Required Fields Container */}
                  <div className="pt-3 space-y-3">
                    {/* عنوان الطلب - أولاً */}
                    <FloatingInput
                      label="عنوان الطلب *"
                      value={draftData.title}
                      onChange={(e) =>
                        updateDraftField(msg.id, "title", e.target.value)}
                      shake={shakingFields.title}
                      maxLength={70}
                      warnAt={60}
                    />
                    
                    {/* وصف الطلب */}
                    <FloatingTextarea
                      label="وصف الطلب *"
                      value={draftData.description}
                      onChange={(e) =>
                        updateDraftField(msg.id, "description", e.target.value)}
                      rows={3}
                      shake={shakingFields.description}
                      maxLength={1000}
                      warnAt={900}
                    />
                    
                    {/* المدينة */}
                    <FloatingInput
                      label="المدينة *"
                      value={draftData.location}
                      onChange={(e) =>
                        updateDraftField(msg.id, "location", e.target.value)}
                      shake={shakingFields.location}
                    />
                  </div>

                  {/* Additional Details Section */}
                  <div className="space-y-4 mt-4">
                    {/* Elegant Divider with Label */}
                    <div className="relative flex items-center justify-center py-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border/50"></div>
                      </div>
                      <div className="relative bg-background px-4">
                        <span className="text-xs font-medium text-muted-foreground/70 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                          تفاصيل إضافية
                          <span className="text-[10px] text-muted-foreground/50">(اختياري)</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-border overflow-hidden">
              <ToggleSwitch
                label="🏘️ الحي/الموقع الدقيق"
                enabled={!!draftData.isNeighborhoodEnabled}
                onChange={(enabled) => {
                  updateDraftField(msg.id, "isNeighborhoodEnabled", enabled);
                  if (!enabled) {
                    updateDraftField(msg.id, "neighborhood", "");
                    updateDraftField(msg.id, "locationCoords", undefined);
                  }
                }}
              />
              <AnimatePresence>
                {draftData.isNeighborhoodEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-3">
                      <div className="relative">
                        <FloatingInput
                          label="الحي/الموقع الدقيق"
                          value={draftData.neighborhood || ""}
                          onChange={(e) => {
                            updateDraftField(
                              msg.id,
                              "neighborhood",
                              e.target.value,
                            );
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            // Use browser geolocation
                            if (navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                (position) => {
                                  updateDraftField(msg.id, "locationCoords", {
                                    lat: position.coords.latitude,
                                    lng: position.coords.longitude,
                                    address: "موقعك الحالي",
                                  });
                                },
                                () => {
                                  alert("لم نتمكن من الوصول لموقعك. تأكد من السماح بالوصول للموقع.");
                                }
                              );
                            } else {
                              alert("المتصفح لا يدعم خدمة الموقع.");
                            }
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-secondary transition-colors z-10 text-sm text-muted-foreground hover:text-foreground"
                          title="إضافة موقع من الخريطة"
                        >
                          <MapPinned size={16} />
                          <span>الموقع الدقيق</span>
                        </button>
                      </div>
                      
                      {/* Location Chip */}
                      {draftData.locationCoords && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                          <MapPin size={16} className="text-green-600 dark:text-green-400" />
                          <span className="text-xs font-medium text-green-700 dark:text-green-300 flex-1">
                            📍 {draftData.locationCoords.address || `${draftData.locationCoords.lat.toFixed(4)}, ${draftData.locationCoords.lng.toFixed(4)}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateDraftField(msg.id, "locationCoords", undefined)}
                            className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <ToggleSwitch
                label="⏰ مدة التنفيذ المطلوبة"
                enabled={!!draftData.isDeliveryEnabled}
                onChange={(enabled) => {
                  updateDraftField(msg.id, "isDeliveryEnabled", enabled);
                }}
              />
              <AnimatePresence>
                {draftData.isDeliveryEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "tween", ease: "circOut", duration: 0.2 }}
                    className="overflow-hidden bg-secondary/5"
                  >
                    <div className="p-4">
                      <FloatingInput
                        label="مدة التنفيذ"
                        value={draftData.deliveryTimeFrom === "غير محددة"
                          ? ""
                          : (draftData.deliveryTimeFrom || "")}
                        onChange={(e) => {
                          updateDraftField(
                            msg.id,
                            "deliveryTimeFrom",
                            e.target.value,
                          );
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <ToggleSwitch
                label="💰 الميزانية"
                enabled={!!draftData.isBudgetEnabled}
                onChange={(enabled) => {
                  updateDraftField(msg.id, "isBudgetEnabled", enabled);
                }}
              />
              <AnimatePresence>
                {draftData.isBudgetEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "tween", ease: "circOut", duration: 0.25 }}
                    className="overflow-hidden bg-secondary/5"
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <FloatingInput
                          label="من (ر.س)"
                          value={draftData.budgetMin}
                          onChange={(e) => {
                            updateDraftField(
                              msg.id,
                              "budgetMin",
                              e.target.value,
                            );
                          }}
                          type="number"
                          centered
                          className="flex-1"
                        />
                        <span className="text-muted-foreground font-bold pt-2">
                          —
                        </span>
                        <FloatingInput
                          label="إلى (ر.س)"
                          value={draftData.budgetMax}
                          onChange={(e) => {
                            updateDraftField(
                              msg.id,
                              "budgetMax",
                              e.target.value,
                            );
                          }}
                          type="number"
                          centered
                          className="flex-1"
                        />
                      </div>
                      {draftData.budgetMin && draftData.budgetMax &&
                        parseFloat(draftData.budgetMax as string) <
                          parseFloat(draftData.budgetMin as string) &&
                        (
                          <p className="text-[11px] text-red-500 font-bold flex items-center gap-1">
                            <AlertTriangle size={12} />
                            الحد الأقصى يجب أن يكون أكبر من الحد الأدنى
                          </p>
                        )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Attachments Section */}
            <div className="rounded-xl border border-border overflow-hidden">
              <ToggleSwitch
                label="📎 إضافة صور/مرفقات"
                enabled={!!draftData.isAttachmentsEnabled}
                onChange={(enabled) => {
                  updateDraftField(msg.id, "isAttachmentsEnabled", enabled);
                  // Keep attachments in memory even when disabled
                }}
              />
              <AnimatePresence>
                {draftData.isAttachmentsEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden bg-secondary/5"
                  >
                    <div className="p-4 space-y-3">
                      {/* File Input */}
                      <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                        <ImagePlus size={24} className="text-muted-foreground" />
                        <span className="text-sm text-muted-foreground font-medium">اضغط لإضافة صور أو ملفات</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            const newAttachments = files.map((file) => ({
                              name: file.name,
                              url: URL.createObjectURL(file),
                              file,
                            }));
                            updateDraftField(msg.id, "draftAttachments", [
                              ...(draftData.draftAttachments || []),
                              ...newAttachments,
                            ]);
                          }}
                        />
                      </label>
                      
                      {/* Thumbnails */}
                      {draftData.draftAttachments && draftData.draftAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {draftData.draftAttachments.map((att, idx) => (
                            <div key={idx} className="relative group">
                              {att.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || att.file?.type.startsWith("image/") ? (
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-16 h-16 object-cover rounded-lg border border-border"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-secondary/20 rounded-lg border border-border flex items-center justify-center">
                                  <Paperclip size={20} className="text-muted-foreground" />
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...(draftData.draftAttachments || [])];
                                  updated.splice(idx, 1);
                                  updateDraftField(msg.id, "draftAttachments", updated);
                                }}
                                className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                              >
                                <X size={12} />
                              </button>
                              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 py-0.5 rounded-b-lg truncate text-center">
                                {att.name.length > 10 ? att.name.slice(0, 10) + "..." : att.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <ToggleSwitch
                label="🎯 جدية العروض"
                enabled={(draftData.seriousness ?? 0) >= 2}
                onChange={(enabled) => {
                  if (!enabled) {
                    updateDraftField(msg.id, "seriousness", 0);
                  } else {
                    updateDraftField(msg.id, "seriousness", 2);
                  }
                }}
              />
              <AnimatePresence>
                {(draftData.seriousness ?? 0) >= 2 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "tween", ease: "circOut", duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex gap-2 mb-4">
                        {[
                          {
                            val: 2,
                            label: "عروض جادة",
                            emoji: "📊",
                            desc: "أفضل من المعتاد",
                          },
                          {
                            val: 3,
                            label: "عروض أكثر جدية",
                            emoji: "📈",
                            desc: "الأعلى جودة واهتماماً",
                          },
                        ].map((opt) => {
                          const isSelected =
                            (draftData.seriousness ?? seriousnessLevel) ===
                              opt.val;
                          return (
                            <button
                              key={opt.val}
                              onClick={() => {
                                updateDraftField(
                                  msg.id,
                                  "seriousness",
                                  opt.val,
                                );
                              }}
                              className={`flex-1 py-4 px-2 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${
                                isSelected
                                  ? opt.val === 2
                                    ? "bg-blue-500 border-blue-400 text-white shadow-lg scale-[1.02]"
                                    : "bg-gradient-to-br from-blue-700 to-blue-900 border-blue-600 text-white shadow-lg scale-[1.02]"
                                  : "bg-background border-border text-muted-foreground/60 hover:border-primary/30 hover:bg-secondary/20"
                              }`}
                            >
                              <span className="text-2xl">{opt.emoji}</span>
                              <span className="font-black text-[10px]">
                                {opt.label}
                              </span>
                              <span
                                className={`text-[8px] opacity-70 ${
                                  isSelected ? "text-white" : ""
                                }`}
                              >
                                {opt.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 flex items-start gap-2.5">
                        <AlertTriangle
                          size={16}
                          className="text-amber-500 shrink-0 mt-0.5"
                        />
                        <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                          تنبيه: اختيار مستوى جدية أعلى قد يقلل من عدد العروض
                          الواردة ولكنه يضمن جودتها وجدية مقدميها بشكل أكبر.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

                  {/* Start New Request Button - Only show after publishing */}
                  {localPublished && (
                    <div className="mt-4 pb-10">
                      <Button
                        onClick={onStartNewRequest}
                        className="w-full h-12 font-bold text-xs rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 border-2 border-input bg-transparent hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-foreground"
                      >
                        <PlusIcon />
                        بدء طلب جديد
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Publish Button - Fixed at bottom left - Only show when Manual Mode is open */}
        {manualModeOpen && ReactDOM.createPortal(
          <div className="fixed bottom-6 left-4 z-[70] pointer-events-none md:left-4">
            <div className="pointer-events-auto">
              <button
                onClick={() => {
                  const titleTooLong = (draftData.title?.length || 0) > 70;
                  const descTooLong = (draftData.description?.length || 0) > 1000;
                  const isDisabled = !localPublished && (!draftData.title?.trim() || !draftData.description?.trim() || !draftData.location?.trim() || titleTooLong || descTooLong);
                  if (isDisabled) {
                    // Shake incomplete or invalid fields
                    const newShakingFields = {
                      title: !draftData.title?.trim() || titleTooLong,
                      description: !draftData.description?.trim() || descTooLong,
                      location: !draftData.location?.trim()
                    };
                    setShakingFields(newShakingFields);
                    if (navigator.vibrate) {
                      navigator.vibrate([50, 30, 50]);
                    }
                    setTimeout(() => setShakingFields({title: false, description: false, location: false}), 600);
                  } else if (localPublished) {
                    if (hasModifications()) {
                      // Haptic feedback
                      if (navigator.vibrate) {
                        navigator.vibrate(15);
                      }
                      handleSaveModifications();
                    } else {
                      // Haptic feedback
                      if (navigator.vibrate) {
                        navigator.vibrate(15);
                      }
                      handleNavigateToPublished();
                    }
                  } else {
                    onPublish(msg);
                  }
                }}
                className={`h-[60px] px-6 font-bold text-sm rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 backdrop-blur-xl border border-white/10 md:shadow-lg whitespace-nowrap ${
                  localPublished 
                  ? hasModifications()
                    ? "bg-accent/90 hover:bg-accent text-white"
                    : "bg-primary/90 hover:bg-primary text-white"
                  : (!draftData.title?.trim() || !draftData.description?.trim() || !draftData.location?.trim())
                    ? "bg-[#153659]/60 text-white/60 cursor-pointer"
                    : "bg-[#153659]/90 hover:bg-[#153659] text-white"
                }`}
              >
                {localPublished ? (
                  hasModifications() ? (
                    <>
                      <SaveIcon />
                      <span>حفظ التعديلات</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      <span>تم نشر طلبك، اذهب إليه &gt;</span>
                    </>
                  )
                ) : (draftData.title?.length || 0) > 70 ? (
                  <>
                    <span className="font-bold text-red-300">العنوان طويل جداً!</span>
                  </>
                ) : (draftData.description?.length || 0) > 1000 ? (
                  <>
                    <span className="font-bold text-red-300">الوصف طويل جداً!</span>
                  </>
                ) : (
                  <>
                    <span className="font-bold">نشر الطلب</span>
                    <span className="text-xl transform rotate-[-90deg] inline-block">🚀</span>
                  </>
                )}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
