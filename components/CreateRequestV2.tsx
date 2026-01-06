import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { logger } from '../utils/logger';
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Map,
  X,
  DollarSign,
  Clock,
  Tag,
  FileText,
  FileEdit,
  Sparkles,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  Wrench,
  Calendar,
  Image as ImageIcon,
  Paperclip,
  Plus,
  Loader2,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  Search,
  Upload,
  ZoomIn,
  Trash2,
  Download,
  AlertCircle,
  Target,
} from "lucide-react";
import { UnifiedHeader } from "./ui/UnifiedHeader";
import { Request } from "../types";
import Anthropic from "@anthropic-ai/sdk";
import { generateDraftWithCta } from "../services/aiService";
import { VoiceProcessingStatus } from "./GlobalFloatingOrb";
import { CityAutocomplete } from "./ui/CityAutocomplete";
import { CityResult } from "../services/placesService";
import { verifyGuestPhone, confirmGuestPhone, getCurrentUser, isValidSaudiPhone } from "../services/authService";
import { supabase } from "../services/supabaseClient";

// ============================================
// Submit Button with Shake Effect
// ============================================
interface SubmitButtonWithShakeProps {
  canSubmit: boolean;
  isSubmitting: boolean;
  isGeneratingTitle: boolean;
  submitSuccess: boolean;
  isGuest: boolean;
  editingRequestId?: string | null;
  onGuestVerification: () => void;
  onSubmit: () => Promise<void>;
  onGoToRequest?: (requestId?: string) => void;
}

const SubmitButtonWithShake: React.FC<SubmitButtonWithShakeProps> = ({
  canSubmit,
  isSubmitting,
  isGeneratingTitle,
  submitSuccess,
  isGuest,
  editingRequestId,
  onGuestVerification,
  onSubmit,
  onGoToRequest,
}) => {
  const [isShaking, setIsShaking] = useState(false);

  const handleClick = async () => {
    if (!canSubmit && !isSubmitting && !isGeneratingTitle) {
      // زر معطل - إضافة اهتزاز وحد أحمر
      setIsShaking(true);
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50, 30, 50]);
      }
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (!canSubmit) return;
    
    // Check if user is guest - require phone verification and terms acceptance
    if (isGuest && !editingRequestId) {
      onGuestVerification();
      return;
    }
    
    await onSubmit();
  };

  return (
    <motion.button
      layout
      onClick={handleClick}
      disabled={!canSubmit || isSubmitting || isGeneratingTitle}
      animate={isShaking ? {
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.5 }
      } : {}}
      className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all shadow-lg ${
        isGeneratingTitle
          ? 'bg-accent/20 text-accent-foreground border-2 border-accent/30 cursor-wait shadow-none'
          : canSubmit && !isSubmitting
          ? 'bg-primary text-white hover:bg-primary/90 shadow-primary/30'
          : isShaking
          ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none border-2 border-red-500'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none'
      }`}
    >
      {isGeneratingTitle ? (
        <>
          <Loader2 size={20} className="animate-spin" />
          <span>جاري تحليل الوصف وإنشاء العنوان...</span>
        </>
      ) : isSubmitting ? (
        <>
          <Loader2 size={20} className="animate-spin" />
          <span>جاري الإرسال...</span>
        </>
      ) : submitSuccess ? (
        <>
          <Check size={20} />
          <span>تم الإرسال!</span>
        </>
      ) : (
        <>
          <span>أرسل الطلب الآن</span>
          <ChevronLeft size={20} />
        </>
      )}
    </motion.button>
  );
};

// ============================================
// Types
// ============================================
interface ClarificationPage {
  pageNumber: number;
  totalPages: number;
  question: string;
  answer?: string;
}

interface FinalReview {
  title: string;
  reformulated_request: string;
  system_category: string;
  new_category_suggestion: string;
  location?: string;
  ui_action: string;
}

interface AdditionalField {
  id: string;
  name: string;
  value: string;
  icon: React.ReactNode;
  enabled: boolean;
  isCustom?: boolean; // حقل خاص أنشأه AI
}

interface AIMessage {
  id: string;
  text: string;
  timestamp: Date;
}

interface ExtractedData {
  title?: string;
  description?: string;
  location?: string;
  budget?: string;
  deliveryTime?: string;
  category?: string;
  customFields?: { name: string; value: string }[];
  followUpQuestion?: string;
}

// AI Client Setup
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
let anthropic: Anthropic | null = null;

const getAIClient = () => {
  if (!anthropic && API_KEY) {
    anthropic = new Anthropic({ apiKey: API_KEY });
  }
  return anthropic;
};

// AI Extraction Function
const extractInfoFromMessage = async (
  userMessage: string,
  currentData: {
    description: string;
    location: string;
    additionalFields: AdditionalField[];
  },
  audioBlob?: Blob
): Promise<ExtractedData> => {
  const client = getAIClient();
  
  if (!client) {
    // Fallback: Simple keyword extraction
    return simpleExtraction(userMessage);
  }

  try {
    // Check completion percentage
    const hasDescription = currentData.description.length > 10;
    const hasLocation = currentData.location.length > 0;
    const completionPercent = (hasDescription ? 50 : 0) + (hasLocation ? 50 : 0);
    
    // Get previous questions to avoid repeating
    const existingFieldNames = currentData.additionalFields
      .filter(f => f.enabled)
      .map(f => f.name)
      .join(', ');
    
    // Check if this is the first user message (after welcome)
    const isFirstInteraction = currentData.description === "" && currentData.location === "";
    
    // Note: Anthropic API doesn't support audio directly, so audio will be ignored
    if (audioBlob) {
      logger.warn("⚠️ Anthropic API doesn't support audio, audio blob will be ignored");
    }
    
    const prompt = `أنت مساعد ذكي في منصة "أبيلي" للطلبات. تفهم اللهجة السعودية والعربية الفصحى.

## تنبيه مهم: ${isFirstInteraction ? 'هذه أول رسالة من العميل' : 'هذه رسالة متابعة (لا تكرر الترحيب!)'}

## مهم جداً جداً - فهم اللهجة السعودية:
### كلمات لها معاني خاصة:
- "جيب" + منتج (سيارة/جوال/إلخ) = نوع سيارة SUV/دفع رباعي، وليس "اجلب لي"!
  - "جيب لكزس" = سيارة لكزس من نوع SUV
  - "جيب تويوتا" = لاند كروزر أو FJ أو برادو
  - "أبي جيب" = أريد سيارة SUV
- "جيب" لوحده (أمر) = اجلب (نادر في سياق السوق)

### نوع الطلب:
- شراء: ذكر منتج + سعر (مثل: "جيب لكزس بقيمة 300 ألف" = يريد شراء سيارة SUV لكزس)
- بيع: "أبي أبيع" أو ذكر البيع
- خدمة: يحتاج أحد يسوي له شي (تصليح، صيانة، تركيب، تنظيف، إلخ)

## مهم جداً - قواعد الفهم:
1. لا تفترض أي شيء! إذا كانت الرسالة غير واضحة، اسأل للتوضيح
2. افهم السياق الكامل قبل استخراج أي معلومات
3. "أبي/أبغى/أريد" = يريد شيء (خدمة أو منتج)، ليس معلومات تقنية
4. لا تنشئ حقول مخصصة إلا إذا ذكر العميل تفاصيل تقنية واضحة
5. ركز على فهم: ماذا يريد؟ أين؟ متى؟ بكم？

## الطلب الحالي:
- الوصف: "${currentData.description || "(فارغ)"}"
- الموقع: "${currentData.location || "(فارغ)"}"

## رسالة العميل:
"${userMessage}"

## كيف تتصرف:
${!currentData.description 
  ? `- الطلب فارغ. افهم ماذا يريد العميل بالضبط
   - إذا الرسالة غامضة: اسأل "وش بالضبط تحتاج؟"
   - إذا واضحة: استخرج الوصف واسأل عن الموقع`
  : !currentData.location
  ? `- عندنا الوصف. نحتاج الموقع فقط
   - اسأل: "وين موقعك؟"`
  : `- الطلب مكتمل! أخبره بلطف أن طلبه جاهز ويضغط زر الإرسال الأخضر
   - إذا أراد إضافة تفاصيل، ساعده`}

## قواعد الاستخراج:
- title: عنوان قصير وواضح (3-5 كلمات) يعبر عن الطلب الفعلي
  * للشراء: "شراء جيب لكزس" أو "طلب سيارة لكزس"
  * للبيع: "بيع ايفون" 
  * للخدمات: "تصليح مكيف" أو "طلب سباك"
  * لا تستخدم كلمة "خدمة" إلا للخدمات الفعلية!
- description: وصف مهني للطلب (لا تضف معلومات لم يذكرها)
- location: المدينة فقط (الرياض، جدة، عن بعد، إلخ)
- budget: فقط إذا ذكر رقم أو نطاق سعري
- deliveryTime: فقط إذا ذكر وقت محدد
- customFields: فقط للتفاصيل التقنية الواضحة (مقاسات، ألوان، أرقام)
- followUpQuestion: سؤالك أو ردك على العميل (مطلوب دائماً!)

## ممنوع منعاً باتاً:
- تكرار الترحيب (مرحباً، أهلاً، شكراً لتواصلك) - مرة واحدة فقط في البداية!
- افتراض تفاصيل لم يذكرها العميل
- إنشاء حقول مخصصة بدون سبب واضح
- تعقيد الأمور البسيطة
- الفهم الحرفي للكلمات بدون سياق
- الردود الطويلة والرسمية - كن مختصراً وودوداً
- استخدام كلمة "خدمة" لطلبات الشراء أو البيع!

## أمثلة على الفهم الصحيح:
- "جيب لكزس بقيمة 300 ألف" → شراء جيب لكزس (وليس "خدمة لكزس"!)
- "أبي سباك" → طلب سباك
- "أبي مصمم" → طلب مصمم جرافيك أو ديكور (اسأل للتوضيح)
- "أبي أحد ينظف البيت" → طلب تنظيف منزلي
- "عندي ايفون أبي أبيعه" → بيع ايفون

JSON فقط:
{"title":null,"description":null,"location":null,"budget":null,"deliveryTime":null,"category":null,"customFields":[],"followUpQuestion":"سؤالك هنا"}`;

    const result = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });
    
    const content = result.content[0];
    const response = content.type === 'text' ? content.text : '';
    
    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as ExtractedData;
      } catch {
        return simpleExtraction(userMessage);
      }
    }
    
    return simpleExtraction(userMessage);
  } catch (error) {
    logger.error("AI Extraction Error:", error, 'service');
    return simpleExtraction(userMessage);
  }
};

// Simple fallback extraction
const simpleExtraction = (message: string): ExtractedData => {
  const result: ExtractedData = {};
  
  // Location keywords
  const cities = ["الرياض", "جدة", "الدمام", "مكة", "المدينة", "الطائف", "تبوك", "خميس مشيط"];
  const foundCity = cities.find((city) => message.includes(city));
  if (foundCity) result.location = foundCity;
  if (message.includes("عن بعد") || message.includes("اونلاين") || message.includes("أونلاين")) {
    result.location = "عن بعد";
  }
  
  // Budget
  const budgetMatch = message.match(/(\d+)\s*(ريال|ر\.?س)/);
  if (budgetMatch) result.budget = `${budgetMatch[1]} ر.س`;
  
  // Time
  if (message.includes("أسبوع")) result.deliveryTime = "أسبوع";
  if (message.includes("يوم")) result.deliveryTime = "يوم";
  if (message.includes("شهر")) result.deliveryTime = "شهر";
  if (message.includes("عاجل") || message.includes("فوري")) result.deliveryTime = "عاجل";
  
  // Description (if long enough)
  if (message.length > 15) {
    result.description = message;
    result.title = message.slice(0, 40) + (message.length > 40 ? "..." : "");
  }
  
  // Follow up question
  if (!result.location && !result.description) {
    result.followUpQuestion = "صف لي طلبك بالتفصيل، وش تحتاج بالضبط؟ 📝";
  } else if (!result.location) {
    result.followUpQuestion = "وين موقعك؟ أو الخدمة عن بعد؟ 📍";
  }
  
  return result;
};

interface CreateRequestV2Props {
  onBack: () => void;
  onPublish: (request: Partial<Request>, isEditing?: boolean, requestId?: string) => Promise<string | null>; // Returns request ID on success
  onGoToRequest?: (requestId: string) => void; // Navigate to created request
  onGoToMarketplace?: () => void; // Navigate back to marketplace
  onRequireAuth?: () => void;
  // Request to edit (if editing existing request)
  requestToEdit?: Request | null;
  onClearRequestToEdit?: () => void; // Clear after editing is done
  // Header props
  mode: 'requests' | 'offers';
  toggleMode: () => void;
  isModeSwitching: boolean;
  unreadCount: number;
  user: any;
  titleKey: number;
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  onNotificationClick?: (notification: any) => void;
  onClearAll: () => void;
  onSignOut: () => void;
  isGuest?: boolean;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  // AI Orb props - shared with GlobalFloatingOrb
  aiInput: string;
  setAiInput: (value: string) => void;
  aiMessages: AIMessage[];
  setAiMessages: React.Dispatch<React.SetStateAction<AIMessage[]>>;
  isAiLoading: boolean;
  setIsAiLoading: (loading: boolean) => void;
  // Ref to register handleSend for GlobalFloatingOrb
  aiSendHandlerRef?: React.MutableRefObject<((audioBlob?: Blob) => Promise<void>) | null>;
  // Voice processing refs (for GlobalFloatingOrb)
  voiceSendHandlerRef?: React.MutableRefObject<((audioBlob: Blob) => Promise<void>) | null>;
  setVoiceProcessingStatus?: (status: VoiceProcessingStatus) => void;
}

// ============================================
// Typewriter Effect Component
// ============================================
const TypewriterText: React.FC<{
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}> = ({ text, speed = 50, onComplete, className }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) return;
    
    let index = 0;
    setDisplayedText("");
    setIsComplete(false);
    
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-0.5 h-5 bg-primary ml-0.5 align-middle"
        />
      )}
    </span>
  );
};

// ============================================
// Success Notification (slides from top)
// ============================================
const SuccessNotification: React.FC<{
  isVisible: boolean;
  onHide: () => void;
  message: string;
  subMessage?: string;
}> = ({ isVisible, onHide, message, subMessage }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onHide, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 md:right-72 z-[100] p-4"
        >
          <div className="max-w-md mx-auto bg-primary text-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
              >
                <Check size={24} />
              </motion.div>
              <div className="flex-1">
                <p className="font-bold text-base">{message}</p>
                {subMessage && (
                  <p className="text-sm text-white/80">{subMessage}</p>
                )}
              </div>
              <button
                onClick={onHide}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {/* Progress bar */}
            <motion.div
              className="h-1 bg-white/30"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 4, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// Glowing Field Component
// ============================================
const GlowingField: React.FC<{
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  isGlowing?: boolean;
  isRequired?: boolean;
  rightElement?: React.ReactNode;
  fieldRef?: React.RefObject<HTMLDivElement>;
  onBlur?: () => void;
}> = ({
  label,
  icon,
  value,
  onChange,
  placeholder,
  multiline = false,
  isGlowing = false,
  isRequired = false,
  rightElement,
  fieldRef,
  onBlur,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(100);
  const [isResizing, setIsResizing] = useState(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  
  // Check if field has value (for required field validation visual)
  const hasValue = value.trim().length > 0;
  const isCompleted = isRequired && hasValue;

  // Handle resize drag
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startY.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startHeight.current = textareaHeight;
    
    // Disable body scroll during resize
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      // Prevent scroll during resize
      if (moveEvent.cancelable) {
        moveEvent.preventDefault();
      }
      moveEvent.stopPropagation();
      
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const diff = currentY - startY.current;
      const newHeight = Math.max(60, Math.min(300, startHeight.current + diff));
      setTextareaHeight(newHeight);
    };
    
    const handleEnd = () => {
      setIsResizing(false);
      // Re-enable body scroll
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
    
    document.addEventListener('mousemove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  };

  return (
    <motion.div
      ref={fieldRef}
      className={`relative rounded-2xl border transition-all duration-300 ${
        isGlowing
          ? "border-primary shadow-[0_0_20px_rgba(30,150,140,0.4)] bg-primary/5"
          : isCompleted
          ? "border-primary bg-card"
          : isFocused
          ? "border-primary shadow-md bg-card"
          : "border-border bg-card"
      }`}
      animate={isGlowing ? { scale: [1, 1.01, 1] } : {}}
      transition={{ duration: 0.5, repeat: isGlowing ? 2 : 0 }}
    >
      {/* Label - Clickable to focus input */}
      <div 
        className="flex items-center gap-2 px-4 pt-3 pb-1 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <span className={`${isGlowing ? "text-primary" : isCompleted ? "text-primary" : "text-muted-foreground"}`}>
          {icon}
        </span>
        <span className={`text-sm font-medium ${isGlowing ? "text-primary" : isCompleted ? "text-primary" : "text-muted-foreground"}`}>
          {label}
          {isRequired && (
            <AnimatePresence mode="wait">
              {isCompleted ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="inline-flex items-center justify-center mr-1"
                >
                  <Check size={14} className="text-primary" />
                </motion.span>
              ) : (
                <motion.span
                  key="asterisk"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="text-red-500 mr-1"
                >
                  *
                </motion.span>
              )}
            </AnimatePresence>
          )}
        </span>
        {isGlowing && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mr-auto"
          >
            <Sparkles size={14} className="text-primary" />
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className={`flex items-center gap-2 px-4 ${multiline ? 'pb-8' : 'pb-3'}`}>
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              onBlur?.();
            }}
            placeholder={placeholder}
            style={{ height: textareaHeight }}
            className="flex-1 bg-transparent text-foreground resize-none focus:outline-none placeholder:text-muted-foreground/50 text-right"
            dir="rtl"
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              onBlur?.();
            }}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-foreground focus:outline-none placeholder:text-muted-foreground/50 text-right py-1"
            dir="rtl"
          />
        )}
        {rightElement}
      </div>

      {/* Resize Handle for Multiline - Full width bottom edge */}
      {multiline && (
        <motion.div
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          className={`absolute bottom-0 left-0 right-0 h-6 flex items-center justify-center cursor-ns-resize select-none rounded-b-2xl transition-colors ${isResizing ? 'bg-primary/10' : 'hover:bg-primary/5'}`}
          style={{ touchAction: 'none' }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div 
            className="flex flex-col gap-0.5 pointer-events-none"
            animate={isResizing ? { scale: 1.2, gap: '3px' } : { scale: 1, gap: '2px' }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <motion.div 
              className="h-0.5 rounded-full bg-primary"
              animate={isResizing ? { width: 48 } : { width: 40 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            />
            <motion.div 
              className="h-0.5 rounded-full bg-primary"
              animate={isResizing ? { width: 48 } : { width: 40 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            />
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

// ============================================
// Additional Field Component (with X to remove)
// ============================================
interface AdditionalFieldProps {
  field: AdditionalField;
  onRemove: (id: string) => void;
  onValueChange: (id: string, value: string) => void;
  isGlowing?: boolean;
}

const AdditionalFieldCard = React.forwardRef<HTMLDivElement, AdditionalFieldProps>(
  ({ field, onRemove, onValueChange, isGlowing = false }, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      className={`relative rounded-xl border transition-all duration-300 ${
        isGlowing
          ? "border-primary shadow-[0_0_15px_rgba(30,150,140,0.3)] bg-primary/5"
          : isFocused
          ? "border-primary/50 shadow-sm bg-card"
          : "border-border bg-card"
      }`}
    >
      {/* Header with Remove Button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-primary">
            {field.icon}
          </span>
          <span className="text-xs font-medium text-foreground">
            {field.name}
          </span>
          {field.isCustom && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              خاص
            </span>
          )}
        </div>
        
        {/* Remove Button (X) */}
        <motion.button
          onClick={() => onRemove(field.id)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-500 transition-colors"
        >
          <X size={14} />
        </motion.button>
      </div>

      {/* Value Input */}
      <div className="px-3 py-2">
        <input
          type="text"
          value={field.value}
          onChange={(e) => onValueChange(field.id, e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={`أدخل ${field.name}...`}
          className="w-full bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground/40 text-right"
          dir="rtl"
        />
      </div>
      
      {/* Glow animation */}
      {isGlowing && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: 2 }}
          style={{
            background: "linear-gradient(45deg, rgba(30,150,140,0.1), rgba(30,150,140,0.2))",
          }}
        />
      )}
    </motion.div>
  );
});

AdditionalFieldCard.displayName = "AdditionalFieldCard";

// ============================================
// Glass Panel (AI Questions) - Shows last 2 messages with fade
// ============================================
const GlassPanel: React.FC<{
  messages: AIMessage[];
  isVisible: boolean;
  isLoading?: boolean;
}> = ({ messages, isVisible, isLoading = false }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Only keep unique messages (no duplicates)
  const uniqueMessages = messages.filter((msg, index, self) => 
    index === self.findIndex(m => m.text === msg.text)
  );
  
  // Show only last 2 messages
  const visibleMessages = uniqueMessages.slice(-2);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [uniqueMessages, isLoading]);

  // Show panel if loading or has messages
  if (!isVisible || (visibleMessages.length === 0 && !isLoading)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(30, 150, 140, 0.2)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div className="dark:bg-[rgba(10,10,15,0.9)] relative">
        {/* Fade overlay for older messages */}
        {uniqueMessages.length > 2 && (
          <div 
            className="absolute top-0 left-0 right-0 h-6 z-10 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, rgba(255,255,255,0.9), transparent)"
            }}
          />
        )}
        
        <div
          ref={scrollRef}
          className="overflow-y-auto max-h-[120px] p-3 space-y-2"
        >
          {visibleMessages.map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ 
                opacity: index === 0 && visibleMessages.length > 1 ? 0.6 : 1, 
                y: 0 
              }}
              exit={{ opacity: 0, y: -20 }}
              className="flex items-start gap-2"
            >
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles size={10} className="text-primary" />
              </div>
              <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
            </motion.div>
          ))}
          
          {/* Loading/Analyzing Animation */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2"
            >
              <motion.div 
                className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Sparkles size={10} className="text-primary" />
              </motion.div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">جاري التحليل</span>
                <motion.div className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                      animate={{ 
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1.2, 0.8]
                      }}
                      transition={{ 
                        duration: 0.8, 
                        repeat: Infinity, 
                        delay: i * 0.2 
                      }}
                    />
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// Main Component
// ============================================
export const CreateRequestV2: React.FC<CreateRequestV2Props> = ({
  onBack,
  onPublish,
  onGoToRequest,
  onGoToMarketplace,
  onRequireAuth,
  requestToEdit,
  onClearRequestToEdit,
  mode,
  toggleMode,
  isModeSwitching,
  unreadCount,
  user,
  titleKey,
  notifications,
  onMarkAsRead,
  onNotificationClick,
  onClearAll,
  onSignOut,
  isGuest,
  onNavigateToProfile,
  onNavigateToSettings,
  // AI Orb props
  aiInput,
  setAiInput,
  aiMessages,
  setAiMessages,
  isAiLoading,
  setIsAiLoading,
  aiSendHandlerRef,
  voiceSendHandlerRef,
  setVoiceProcessingStatus: externalSetVoiceProcessingStatus,
}) => {
  // ==========================================
  // نوع لتخزين القيم المحفوظة (snapshot)
  // ==========================================
  interface SavedValues {
    title: string;
    description: string;
    location: string;
    budget: string;
    deliveryTime: string;
    category: string;
  }
  
  // ==========================================
  // حالة التعديل
  // ==========================================
  
  // حفظ ID الطلب للتعديل (لا يتغير حتى الخروج من الصفحة)
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  
  // القيم المحفوظة آخر مرة (للمقارنة)
  const [savedValues, setSavedValues] = useState<SavedValues | null>(null);
  
  // هل تم الحفظ مرة واحدة على الأقل؟
  const [hasSavedOnce, setHasSavedOnce] = useState(false);
  
  // ==========================================
  // Core fields
  // ==========================================
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [descriptionHeight, setDescriptionHeight] = useState(100);
  const [isDescriptionResizing, setIsDescriptionResizing] = useState(false);
  const descriptionResizeStartY = useRef(0);
  const descriptionResizeStartHeight = useRef(0);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Attachment preview state
  const [previewAttachment, setPreviewAttachment] = useState<{
    type: 'file' | 'url';
    index: number;
    url: string;
    name?: string;
  } | null>(null);
  
  // Create object URLs for attached files (memoized to avoid recreating on every render)
  const fileUrls = useMemo(() => {
    return attachedFiles.map(file => URL.createObjectURL(file));
  }, [attachedFiles]);
  
  // Cleanup object URLs on unmount or when files change
  useEffect(() => {
    return () => {
      fileUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [fileUrls]);
  
  // Image search functionality removed
  
  // ==========================================
  // Additional fields
  // ==========================================
  const [additionalFields, setAdditionalFields] = useState<AdditionalField[]>([
    {
      id: "budget",
      name: "الميزانية",
      value: "",
      icon: <DollarSign size={16} />,
      enabled: false,
    },
    {
      id: "deliveryTime",
      name: "مدة التنفيذ",
      value: "",
      icon: <Clock size={16} />,
      enabled: false,
    },
    {
      id: "category",
      name: "التصنيف",
      value: "",
      icon: <Tag size={16} />,
      enabled: false,
    },
  ]);
  
  // Show additional fields only when AI suggests them
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  
  // ==========================================
  // Optional Fields (Budget, Delivery, Attachments)
  // ==========================================
  const [isAttachmentsExpanded, setIsAttachmentsExpanded] = useState(false);
  const [isBudgetExpanded, setIsBudgetExpanded] = useState(false);
  const [isDeliveryExpanded, setIsDeliveryExpanded] = useState(false);
  const [isCityAutocompleteOpen, setIsCityAutocompleteOpen] = useState(false);
  
  // Budget fields (from - to)
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  
  // Delivery time - selected preset or custom value
  const [deliveryValue, setDeliveryValue] = useState("");
  const [customDeliveryValue, setCustomDeliveryValue] = useState("");
  
  // Seriousness level (1-5, default: 3)
  const [seriousness, setSeriousness] = useState<number>(3);
  
  // Delivery time presets
  const deliveryPresets = [
    { value: "فوراً", label: "فوراً" },
    { value: "يوم واحد", label: "يوم" },
    { value: "يومين", label: "يومين" },
    { value: "أسبوع", label: "أسبوع" },
    { value: "شهر", label: "شهر" },
    { value: "غير محدد", label: "غير محدد" },
  ];

  // ==========================================
  // دالة لاستخراج القيم الحالية كـ snapshot
  // ==========================================
  const getCurrentValues = useCallback((): SavedValues => {
    const budgetField = additionalFields.find(f => f.id === "budget");
    const deliveryField = additionalFields.find(f => f.id === "deliveryTime");
    const categoryField = additionalFields.find(f => f.id === "category");
    
    return {
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      budget: budgetField?.enabled ? budgetField.value.trim() : "",
      deliveryTime: deliveryField?.enabled ? deliveryField.value.trim() : "",
      category: categoryField?.enabled ? categoryField.value.trim() : "",
    };
  }, [title, description, location, additionalFields]);

  // ==========================================
  // دالة للمقارنة بين القيم الحالية والمحفوظة
  // ==========================================
  const hasChangesFromSaved = useCallback((): boolean => {
    if (!savedValues) return false;
    
    const current = getCurrentValues();
    
    // مقارنة كل حقل
    if (current.title !== savedValues.title) return true;
    if (current.description !== savedValues.description) return true;
    if (current.location !== savedValues.location) return true;
    if (current.budget !== savedValues.budget) return true;
    if (current.deliveryTime !== savedValues.deliveryTime) return true;
    if (current.category !== savedValues.category) return true;
    
    return false;
  }, [savedValues, getCurrentValues]);

  // ==========================================
  // حساب حالة الزر في وضع التعديل
  // ==========================================
  const editButtonState = useMemo(() => {
    if (!editingRequestId) {
      return { canSave: false, isSaved: false };
    }
    
    const hasChanges = hasChangesFromSaved();
    
    return {
      // يمكن الحفظ فقط إذا هناك تغييرات
      canSave: hasChanges,
      // تم الحفظ إذا حفظنا مرة وليس هناك تغييرات
      isSaved: hasSavedOnce && !hasChanges,
    };
  }, [editingRequestId, hasChangesFromSaved, hasSavedOnce]);

  // ==========================================
  // تعبئة الحقول عند التعديل
  // ==========================================
  useEffect(() => {
    if (requestToEdit) {
      // حفظ ID الطلب للتعديل
      setEditingRequestId(requestToEdit.id);
      
      // تصفير حالة الحفظ
      setHasSavedOnce(false);
      
      // تعبئة العنوان والوصف والموقع
      const newTitle = requestToEdit.title || "";
      const newDescription = requestToEdit.description || "";
      const newLocation = requestToEdit.location || "";
      
      setTitle(newTitle);
      setUserEditedTitle(false);
      setIsTitleUnclear(false);
      setShowManualTitle(false);
      setDescription(newDescription);
      setLocation(newLocation);
      
      // حساب قيم الحقول الإضافية
      const editBudgetMin = requestToEdit.budgetMin || "";
      const editBudgetMax = requestToEdit.budgetMax || "";
      let editBudgetValue = "";
      if (editBudgetMin && editBudgetMax) {
        editBudgetValue = `${editBudgetMin} - ${editBudgetMax}`;
      } else if (editBudgetMin || editBudgetMax) {
        editBudgetValue = editBudgetMin || editBudgetMax;
      }
      
      const editDeliveryValue = requestToEdit.deliveryTimeFrom || "";
      const categoryValue = requestToEdit.categories?.join("، ") || "";
      
      // تعيين القيم في الـ state الجديد
      if (editBudgetMin) setBudgetMin(editBudgetMin);
      if (editBudgetMax) setBudgetMax(editBudgetMax);
      
      // تعيين قيمة الجدية
      if (requestToEdit.seriousness) {
        setSeriousness(requestToEdit.seriousness);
      }
      
      // Check if delivery value is a preset
      const isPreset = ["فوراً", "يوم واحد", "يومين", "أسبوع", "شهر", "غير محدد"].includes(editDeliveryValue);
      if (isPreset) {
        setDeliveryValue(editDeliveryValue);
      } else if (editDeliveryValue) {
        setCustomDeliveryValue(editDeliveryValue);
      }
      
      // تعبئة الحقول الإضافية (للتوافق مع الكود القديم)
      setAdditionalFields(prevFields => {
        return prevFields.map(field => {
          if (field.id === "budget" && editBudgetValue) {
            return { ...field, value: editBudgetValue, enabled: true };
          }
          if (field.id === "deliveryTime" && editDeliveryValue) {
            return { ...field, value: editDeliveryValue, enabled: true };
          }
          if (field.id === "category" && categoryValue) {
            return { ...field, value: categoryValue, enabled: true };
          }
          return field;
        });
      });
      
      // إظهار الحقول الإضافية إذا كانت مفعّلة
      if (editBudgetValue || editDeliveryValue || categoryValue) {
        setShowAdditionalFields(true);
      }
      
      // إظهار العنوان
      if (newTitle) {
        setShowTitle(true);
      }
      
      // حفظ القيم كـ snapshot أولي
      setSavedValues({
        title: newTitle.trim(),
        description: newDescription.trim(),
        location: newLocation.trim(),
        budget: editBudgetValue.trim(),
        deliveryTime: editDeliveryValue.trim(),
        category: categoryValue.trim(),
      });
    }
  }, [requestToEdit]);

  // Handle back - immediate navigation
  const handleBack = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(12);
    // مسح الطلب للتعديل عند الخروج
    if (onClearRequestToEdit) {
      onClearRequestToEdit();
    }
    onBack();
  }, [onBack, onClearRequestToEdit]);

  // Glowing states
  const [glowingFields, setGlowingFields] = useState<Set<string>>(new Set());
  const [showTitle, setShowTitle] = useState(false);
  
  // AI connection state
  const [isAIConnected, setIsAIConnected] = useState<boolean | null>(null); // null = لم يتم الفحص بعد
  const [showManualTitle, setShowManualTitle] = useState(false);
  const [titleShake, setTitleShake] = useState(false);
  const [isTitleUnclear, setIsTitleUnclear] = useState(false);

  useEffect(() => {
    if (!title.trim()) {
      setUserEditedTitle(false);
      setIsTitleUnclear(false);
    }
  }, [title]);

  // Check AI connection on mount - نفترض دائماً أن AI متصل (سواء Edge Function أو مباشر)
  // العنوان سيتم توليده تلقائياً من الوصف إذا لم يكن موجوداً
  useEffect(() => {
    // نفترض أن AI متصل - الفحص الفعلي يتم عند الاستخدام
    // إذا فشل، سنعرض حقل العنوان في تلك اللحظة
    setIsAIConnected(true);
    setShowManualTitle(false); // لا نعرض حقل العنوان اليدوي افتراضياً
  }, []);

  // حالة إنشاء العنوان بالذكاء الاصطناعي (يجب تعريفها قبل canSubmit)
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  
  // Check if can submit - يظهر الزر بعد تعبئة الوصف والمدينة فقط + لا يكون في وضع التوليد + العنوان واضح
  const needsManualTitle = !title.trim();
  const canSubmit = !!(description.trim() && location.trim() && !isGeneratingTitle && !isTitleUnclear && title.trim());
  
  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  
  // Guest verification states
  const [guestVerificationStep, setGuestVerificationStep] = useState<'none' | 'phone' | 'otp' | 'terms'>('none');
  const [guestPhone, setGuestPhone] = useState("");
  const [guestOTP, setGuestOTP] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  
  // Ensure we have an authenticated session (fallback to anonymous if allowed)
  const ensureGuestSession = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) return session.user.id;

      // Anonymous sign-in (must be enabled on Supabase)
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        logger.error("Anonymous sign-in error:", error, 'service');
        return null;
      }
      const newUserId = data?.user?.id || data?.session?.user?.id || null;
      return newUserId;
    } catch (err) {
      logger.error("Anonymous sign-in exception:", err, 'service');
      return null;
    }
  }, []);
  
  // Auth required alert state
  const [showAuthAlert, setShowAuthAlert] = useState(false);

  // Save form data to localStorage before requiring login
  // SECURITY: Store draft with user ID to prevent cross-user data leakage
  const saveFormDataForGuest = useCallback(() => {
    const formData = {
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      budgetMin: budgetMin.trim(),
      budgetMax: budgetMax.trim(),
      deliveryValue: deliveryValue.trim(),
      customDeliveryValue: customDeliveryValue.trim(),
      additionalFields: additionalFields.map(f => ({
        id: f.id,
        name: f.name,
        value: f.value,
        enabled: f.enabled,
      })),
      attachedFiles: attachedFiles.map((file, index) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        // Note: We can't store File objects directly, so we'll store metadata
        // The actual files will need to be re-uploaded after login
      })),
      timestamp: Date.now(),
      // SECURITY: Include user ID if available to prevent cross-user data leakage
      userId: user?.id || null,
    };
    
    // SECURITY: Use user-specific key if user is logged in, otherwise use generic key
    // This prevents drafts from one user appearing for another user
    const storageKey = user?.id 
      ? `abeely_pending_request_form_${user.id}`
      : 'abeely_pending_request_form';
    
    localStorage.setItem(storageKey, JSON.stringify(formData));
    
    // Clean up old generic key if user is logged in (migration)
    if (user?.id) {
      localStorage.removeItem('abeely_pending_request_form');
    }
  }, [title, description, location, budgetMin, budgetMax, deliveryValue, customDeliveryValue, additionalFields, attachedFiles, user?.id]);

  // Restore form data from localStorage
  // SECURITY: Only restore drafts that belong to the current user
  const restoreFormDataFromGuest = useCallback(() => {
    // SECURITY: Try user-specific key first, then generic key (for backward compatibility)
    const userSpecificKey = user?.id ? `abeely_pending_request_form_${user.id}` : null;
    const genericKey = 'abeely_pending_request_form';
    
    let savedData: string | null = null;
    let storageKey: string | null = null;
    
    // Try user-specific key first
    if (userSpecificKey) {
      savedData = localStorage.getItem(userSpecificKey);
      if (savedData) {
        storageKey = userSpecificKey;
      }
    }
    
    // Fallback to generic key if no user-specific data found
    if (!savedData) {
      savedData = localStorage.getItem(genericKey);
      if (savedData) {
        storageKey = genericKey;
      }
    }
    
    if (!savedData || !storageKey) return false;

    try {
      const formData = JSON.parse(savedData);
      
      // SECURITY: Verify that the draft belongs to the current user
      // If user is logged in and draft has a userId, they must match
      if (user?.id && formData.userId && formData.userId !== user.id) {
        logger.warn('Security: Draft belongs to different user, ignoring');
        // Clean up the draft that doesn't belong to this user
        localStorage.removeItem(storageKey);
        return false;
      }
      
      // Restore basic fields
      if (formData.title) {
        setTitle(formData.title);
        setUserEditedTitle(true);
        setIsTitleUnclear(false);
        hasGeneratedTitleRef.current = true;
      }
      if (formData.description) setDescription(formData.description);
      if (formData.location) setLocation(formData.location);
      if (formData.budgetMin) setBudgetMin(formData.budgetMin);
      if (formData.budgetMax) setBudgetMax(formData.budgetMax);
      if (formData.deliveryValue) setDeliveryValue(formData.deliveryValue);
      if (formData.customDeliveryValue) setCustomDeliveryValue(formData.customDeliveryValue);
      
      // Restore additional fields
      if (formData.additionalFields && Array.isArray(formData.additionalFields)) {
        setAdditionalFields(formData.additionalFields.map((f: any) => ({
          ...f,
          icon: f.id === 'budget' ? <DollarSign size={16} /> : 
                f.id === 'deliveryTime' ? <Clock size={16} /> : 
                f.id === 'category' ? <Tag size={16} /> : 
                <FileText size={16} />,
        })));
      }
      
      // Clear saved data after restoring
      localStorage.removeItem(storageKey);
      
      // If we restored from generic key and user is logged in, migrate to user-specific key
      if (storageKey === genericKey && user?.id) {
        // Data already restored, just clean up generic key
        localStorage.removeItem(genericKey);
      }
      
      return true;
    } catch (error) {
      logger.error('Error restoring form data:', error, 'service');
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
      return false;
    }
  }, [user?.id]);

  // Check for saved form data on mount
  useEffect(() => {
    if (!isGuest && restoreFormDataFromGuest()) {
      // Show a notification that data was restored
      logger.log('تم استعادة بيانات النموذج المحفوظة');
    }
  }, [isGuest, restoreFormDataFromGuest]);
  
  // Handle description textarea resize
  const handleDescriptionResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDescriptionResizing(true);
    descriptionResizeStartY.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
    descriptionResizeStartHeight.current = descriptionHeight;
    
    // Disable body scroll during resize
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      // Prevent scroll during resize
      if (moveEvent.cancelable) {
        moveEvent.preventDefault();
      }
      moveEvent.stopPropagation();
      
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const diff = currentY - descriptionResizeStartY.current;
      const newHeight = Math.max(100, Math.min(400, descriptionResizeStartHeight.current + diff));
      setDescriptionHeight(newHeight);
    };
    
    const handleEnd = () => {
      setIsDescriptionResizing(false);
      // Re-enable body scroll
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
    
    document.addEventListener('mousemove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  };

  // ترجمة رسائل الخطأ من Supabase للعربية
  const translateAuthError = (error: string): string => {
    const errorMap: Record<string, string> = {
      'Token has expired or is invalid': 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.',
      'Invalid OTP': 'رمز التحقق غير صحيح',
      'OTP expired': 'انتهت صلاحية رمز التحقق',
      'Phone number is invalid': 'رقم الجوال غير صحيح',
      'Rate limit exceeded': 'تم تجاوز الحد المسموح. انتظر قليلاً ثم حاول مرة أخرى.',
      'For security purposes, you can only request this after': 'لأسباب أمنية، يمكنك طلب رمز جديد بعد',
    };
    
    // البحث عن ترجمة مطابقة أو جزئية
    for (const [key, value] of Object.entries(errorMap)) {
      if (error.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    
    return error;
  };
  
  // Track previous submit state for celebration
  const prevCanSubmit = useRef(false);
  const [justBecameReady, setJustBecameReady] = useState(false);
  
  // Celebrate when submit becomes available
  useEffect(() => {
    if (canSubmit && !prevCanSubmit.current) {
      setJustBecameReady(true);
      // Reset after animation
      setTimeout(() => setJustBecameReady(false), 2000);
    }
    prevCanSubmit.current = !!canSubmit;
  }, [canSubmit]);

  // Remove/disable additional field
  const removeField = (id: string) => {
    setAdditionalFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: false, value: "" } : f))
    );
  };

  // Update additional field value
  const updateFieldValue = (id: string, value: string) => {
    setAdditionalFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, value } : f))
    );
  };

  // Image search functions removed
  
  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Success notification state
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  // ==========================================
  // Customer Service AI Integration States
  // ==========================================
  const [clarificationPages, setClarificationPages] = useState<ClarificationPage[]>([]);
  const [currentClarificationPage, setCurrentClarificationPage] = useState(0);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const [finalReview, setFinalReview] = useState<FinalReview | null>(null);
  const [showFinalReview, setShowFinalReview] = useState(false);
  const [languageDetected, setLanguageDetected] = useState<string>('');
  
  // Voice processing status for GlobalFloatingOrb
  const [voiceProcessingStatus, setVoiceProcessingStatus] = useState<VoiceProcessingStatus>({ stage: 'idle' });
  
  // حالة تعديل العنوان
  const [isTitleEditable, setIsTitleEditable] = useState(false);
  const hasGeneratedTitleRef = useRef(false);
  const [userEditedTitle, setUserEditedTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Refs for field positions
  const descriptionFieldRef = useRef<HTMLDivElement>(null);
  const locationFieldRef = useRef<HTMLDivElement>(null);
  
  // Add glow effect to a field
  const addGlow = (fieldId: string) => {
    setGlowingFields((prev) => new Set(prev).add(fieldId));
    
    setTimeout(() => {
      setGlowingFields((prev) => {
        const next = new Set(prev);
        next.delete(fieldId);
        return next;
      });
    }, 2000);
  };

  // إنشاء العنوان بالذكاء الاصطناعي - يعمل عند الانتقال عن حقل الوصف
  const generateTitleFromDescription = useCallback(async (forceRegenerate: boolean = false) => {
    // Skip if already generating
    if (isGeneratingTitle) return;
    // Respect manual edits - don't override a user-approved title
    if (userEditedTitle) return;
    // Skip if already generated (unless forcing regeneration)
    if (hasGeneratedTitleRef.current && !forceRegenerate) return;
    // Skip if description is too short
    if (!description.trim() || description.trim().length < 3) return;
    
    hasGeneratedTitleRef.current = true;
    setIsGeneratingTitle(true);
    
    try {
      // استخراج عنوان ذكي من الوصف
      const desc = description.trim();
      
      // استخدام AI لاستخراج العنوان والتصنيفات
      const draft = await generateDraftWithCta(desc);
      
      if (draft && !draft.isClarification) {
        // دالة للتحقق من وضوح النص
        const isTextUnclear = (text: string): boolean => {
          if (!text || text.trim().length < 5) return true;
          
          const textLower = text.toLowerCase();
          const unclearKeywords = [
            'غير واضح', 'غير مفهوم', 'unclear', 'not clear', 
            'غير محدد', 'غير معروف', '؟؟؟', '???',
            'غير متأكد', 'لا أعرف', 'لا أدري'
          ];
          
          // التحقق من وجود كلمات غير واضحة
          if (unclearKeywords.some(keyword => textLower.includes(keyword))) return true;
          
          // التحقق من وجود تكرارات غريبة (مثل "علغغلاللغ")
          const hasRepeatedChars = /(.)\1{3,}/.test(text);
          if (hasRepeatedChars) return true;
          
          // التحقق من وجود أحرف عربية/إنجليزية صحيحة (على الأقل 50% من النص)
          const arabicChars = /[\u0600-\u06FF]/g;
          const englishChars = /[a-zA-Z]/g;
          const arabicCount = (text.match(arabicChars) || []).length;
          const englishCount = (text.match(englishChars) || []).length;
          const validCharsRatio = (arabicCount + englishCount) / text.length;
          
          // إذا كان أقل من 50% من النص أحرف صحيحة، يعتبر غير واضح
          if (validCharsRatio < 0.5 && text.length > 10) return true;
          
          // التحقق من وجود مسافات كافية (نص طويل بدون مسافات يعتبر غير واضح)
          if (text.length > 15 && !text.includes(' ') && !text.includes('،') && !text.includes(',')) {
            return true;
          }
          
          return false;
        };
        
        // تعيين العنوان
        if (draft.title) {
          // التحقق من وضوح العنوان
          const isUnclear = isTextUnclear(draft.title);
          
          if (isUnclear) {
            setIsTitleUnclear(true);
            setTitle(draft.title);
            setShowManualTitle(true);
            setTitleShake(true);
            // إيقاف الاهتزاز بعد 1 ثانية
            setTimeout(() => setTitleShake(false), 1000);
            setShowAdditionalFields(true);
            // التركيز التلقائي على حقل العنوان بعد تأخير قصير
            setTimeout(() => {
              titleInputRef.current?.focus();
            }, 100);
          } else {
            setIsTitleUnclear(false);
            setTitle(draft.title);
            setShowTitle(true);
          }
        } else {
          // Fallback: استخراج العنوان من أول جملة
          const firstSentence = desc.split(/[.،!؟\n]/)[0].trim();
          
          // إذا كان الوصف فارغاً أو غير واضح تماماً، نعرض حقل العنوان اليدوي مباشرة
          if (!firstSentence || firstSentence.length < 3) {
            setIsTitleUnclear(true);
            setTitle("");
            setShowManualTitle(true);
            setTitleShake(true);
            setTimeout(() => setTitleShake(false), 1000);
            setShowAdditionalFields(true);
            // التركيز التلقائي على حقل العنوان بعد تأخير قصير
            setTimeout(() => {
              titleInputRef.current?.focus();
            }, 100);
            setIsGeneratingTitle(false);
            return;
          }
          
          const generatedTitle = firstSentence.length > 50 
            ? firstSentence.slice(0, 47) + "..." 
            : firstSentence;
          
          // دالة للتحقق من وضوح النص
          const isTextUnclear = (text: string): boolean => {
            if (!text || text.trim().length < 5) return true;
            
            const textLower = text.toLowerCase();
            const unclearKeywords = [
              'غير واضح', 'غير مفهوم', 'unclear', 'not clear', 
              'غير محدد', 'غير معروف', '؟؟؟', '???',
              'غير متأكد', 'لا أعرف', 'لا أدري'
            ];
            
            if (unclearKeywords.some(keyword => textLower.includes(keyword))) return true;
            
            const hasRepeatedChars = /(.)\1{3,}/.test(text);
            if (hasRepeatedChars) return true;
            
            const arabicChars = /[\u0600-\u06FF]/g;
            const englishChars = /[a-zA-Z]/g;
            const arabicCount = (text.match(arabicChars) || []).length;
            const englishCount = (text.match(englishChars) || []).length;
            const validCharsRatio = (arabicCount + englishCount) / text.length;
            
            if (validCharsRatio < 0.5 && text.length > 10) return true;
            
            if (text.length > 15 && !text.includes(' ') && !text.includes('،') && !text.includes(',')) {
              return true;
            }
            
            return false;
          };
          
          // التحقق من وضوح العنوان
          const isUnclear = isTextUnclear(generatedTitle);
          
          if (isUnclear) {
            setIsTitleUnclear(true);
            setTitle(generatedTitle);
            setShowManualTitle(true);
            setTitleShake(true);
            setTimeout(() => setTitleShake(false), 1000);
            setShowAdditionalFields(true);
            // التركيز التلقائي على حقل العنوان بعد تأخير قصير
            setTimeout(() => {
              titleInputRef.current?.focus();
            }, 100);
          } else {
            setIsTitleUnclear(false);
            setTitle(generatedTitle);
            setShowTitle(true);
          }
        }
        
        // تعيين التصنيف إذا كان متوفراً (أول تصنيف من القائمة)
        if (draft.categories && draft.categories.length > 0) {
          if (draft.categories[0] === 'أخرى' || draft.categories[0] === 'other') {
            setShowAdditionalFields(true);
          } else {
            setAdditionalFields((prev) =>
              prev.map((f) =>
                f.id === "category"
                  ? { ...f, enabled: true, value: draft.categories![0] }
                  : f
              )
            );
            setShowAdditionalFields(true);
          }
        } else {
          setShowAdditionalFields(true);
        }
      } else {
        // Fallback: استخراج العنوان محلياً
        const firstSentence = desc.split(/[.،!؟\n]/)[0].trim();
        
        // إذا كان الوصف فارغاً أو غير واضح تماماً، نعرض حقل العنوان اليدوي مباشرة
        if (!firstSentence || firstSentence.length < 3) {
          setIsTitleUnclear(true);
          setTitle("");
          setShowManualTitle(true);
          setTitleShake(true);
          setTimeout(() => setTitleShake(false), 1000);
          setShowAdditionalFields(true);
          // التركيز التلقائي على حقل العنوان بعد تأخير قصير
          setTimeout(() => {
            titleInputRef.current?.focus();
          }, 100);
          setIsGeneratingTitle(false);
          return;
        }
        
        const generatedTitle = firstSentence.length > 50 
          ? firstSentence.slice(0, 47) + "..." 
          : firstSentence;
        
        // دالة للتحقق من وضوح النص
        const isTextUnclear = (text: string): boolean => {
          if (!text || text.trim().length < 5) return true;
          
          const textLower = text.toLowerCase();
          const unclearKeywords = [
            'غير واضح', 'غير مفهوم', 'unclear', 'not clear', 
            'غير محدد', 'غير معروف', '؟؟؟', '???',
            'غير متأكد', 'لا أعرف', 'لا أدري'
          ];
          
          if (unclearKeywords.some(keyword => textLower.includes(keyword))) return true;
          
          const hasRepeatedChars = /(.)\1{3,}/.test(text);
          if (hasRepeatedChars) return true;
          
          const arabicChars = /[\u0600-\u06FF]/g;
          const englishChars = /[a-zA-Z]/g;
          const arabicCount = (text.match(arabicChars) || []).length;
          const englishCount = (text.match(englishChars) || []).length;
          const validCharsRatio = (arabicCount + englishCount) / text.length;
          
          if (validCharsRatio < 0.5 && text.length > 10) return true;
          
          if (text.length > 15 && !text.includes(' ') && !text.includes('،') && !text.includes(',')) {
            return true;
          }
          
          return false;
        };
        
        // التحقق من وضوح العنوان
        const isUnclear = isTextUnclear(generatedTitle);
        
        if (isUnclear) {
          setIsTitleUnclear(true);
          setTitle(generatedTitle);
          setShowManualTitle(true);
          setTitleShake(true);
          setTimeout(() => setTitleShake(false), 1000);
          // إظهار قسم "اقترح تصنيفاً" عند عدم وضوح العنوان
          setShowAdditionalFields(true);
          // التركيز التلقائي على حقل العنوان بعد تأخير قصير
          setTimeout(() => {
            titleInputRef.current?.focus();
          }, 100);
        } else {
          setIsTitleUnclear(false);
          setTitle(generatedTitle);
          setShowTitle(true);
        }
      }
    } catch (error) {
      logger.error("Error generating title:", error, 'service');
      // Fallback: استخراج العنوان محلياً
      const desc = description.trim();
      const firstSentence = desc.split(/[.،!؟\n]/)[0].trim();
      
      // إذا كان الوصف فارغاً أو غير واضح تماماً، نعرض حقل العنوان اليدوي مباشرة
      if (!firstSentence || firstSentence.length < 3) {
        setIsTitleUnclear(true);
        setTitle("");
        setShowManualTitle(true);
        setTitleShake(true);
        setTimeout(() => setTitleShake(false), 1000);
        setShowAdditionalFields(true);
        // التركيز التلقائي على حقل العنوان بعد تأخير قصير
        setTimeout(() => {
          titleInputRef.current?.focus();
        }, 100);
        setIsGeneratingTitle(false);
        return;
      }
      
      const generatedTitle = firstSentence.length > 50 
        ? firstSentence.slice(0, 47) + "..." 
        : firstSentence;
      
      // دالة للتحقق من وضوح النص
      const isTextUnclear = (text: string): boolean => {
        if (!text || text.trim().length < 5) return true;
        
        const textLower = text.toLowerCase();
        const unclearKeywords = [
          'غير واضح', 'غير مفهوم', 'unclear', 'not clear', 
          'غير محدد', 'غير معروف', '؟؟؟', '???',
          'غير متأكد', 'لا أعرف', 'لا أدري'
        ];
        
        if (unclearKeywords.some(keyword => textLower.includes(keyword))) return true;
        
        const hasRepeatedChars = /(.)\1{3,}/.test(text);
        if (hasRepeatedChars) return true;
        
        const arabicChars = /[\u0600-\u06FF]/g;
        const englishChars = /[a-zA-Z]/g;
        const arabicCount = (text.match(arabicChars) || []).length;
        const englishCount = (text.match(englishChars) || []).length;
        const validCharsRatio = (arabicCount + englishCount) / text.length;
        
        if (validCharsRatio < 0.5 && text.length > 10) return true;
        
        if (text.length > 15 && !text.includes(' ') && !text.includes('،') && !text.includes(',')) {
          return true;
        }
        
        return false;
      };
      
      // التحقق من وضوح العنوان
      const isUnclear = isTextUnclear(generatedTitle);
      
      if (isUnclear) {
        setIsTitleUnclear(true);
        setTitle(generatedTitle);
        setShowManualTitle(true);
        setTitleShake(true);
        setTimeout(() => setTitleShake(false), 1000);
        // إظهار قسم "اقترح تصنيفاً" عند عدم وضوح العنوان
        setShowAdditionalFields(true);
        // التركيز التلقائي على حقل العنوان بعد تأخير قصير
        setTimeout(() => {
          titleInputRef.current?.focus();
        }, 100);
      } else {
        setIsTitleUnclear(false);
        setTitle(generatedTitle);
        setShowTitle(true);
      }
    } finally {
      setIsGeneratingTitle(false);
    }
  }, [description, isGeneratingTitle, userEditedTitle]);

  // إعادة تعيين حالة التوليد إذا تم مسح الوصف
  useEffect(() => {
    if (description.trim().length === 0) {
      hasGeneratedTitleRef.current = false;
      setShowTitle(false);
      setTitle('');
      setUserEditedTitle(false);
      setIsTitleUnclear(false);
    }
  }, [description]);

  // Update voice processing status (both internal and external)
  const updateVoiceStatus = useCallback((status: VoiceProcessingStatus) => {
    setVoiceProcessingStatus(status);
    externalSetVoiceProcessingStatus?.(status);
  }, [externalSetVoiceProcessingStatus]);

  // Handle voice recording from GlobalFloatingOrb
  const handleVoiceSend = useCallback(async (audioBlob: Blob) => {
    if (isAiLoading) return;
    
    // Update processing status
    updateVoiceStatus({ stage: 'received' });
    setIsAiLoading(true);
    
    try {
      // Processing stage
      setTimeout(() => {
        updateVoiceStatus({ stage: 'processing', message: 'جاري تحليل طلبك...' });
      }, 1000);
      
      // استخدام AI لاستخراج العنوان والتصنيفات من الوصف الصوتي
      const draft = await generateDraftWithCta(
        description || "طلب صوتي",
        undefined, // لا دعم للصور هنا
        audioBlob || undefined
      );

      if (draft) {
        // Update title from AI response
        if (draft.title) {
          setTitle(draft.title);
          setShowTitle(true);
          addGlow("title");
        }
        
        // Update description
        if (draft.description) {
          setDescription(draft.description);
          addGlow("description");
        }
        
        // Update location if available
        if (draft.location) {
          setLocation(draft.location);
          addGlow("location");
        }

        if (draft.isClarification) {
          updateVoiceStatus({ stage: 'done', message: 'يرجى توضيح طلبك أكثر' });
          // ai-chat لا يدعم صفحات توضيحية متعددة، فقط سؤال واحد
          setClarificationPages([]);
          setCurrentClarificationPage(0);
          setShowFinalReview(false);
        } else {
          updateVoiceStatus({ stage: 'done', message: 'تم تجهيز طلبك!' });
          // تحويل draft إلى final_review format للتوافق
          setFinalReview({
            title: draft.title || "",
            reformulated_request: draft.description || "",
            system_category: draft.categories?.[0] || "أخرى",
            new_category_suggestion: "لا يوجد",
            location: draft.location || "",
            ui_action: "show_confirmation_screen"
          });
          setShowFinalReview(true);
          setClarificationPages([]);
        }
        
        hasAutoTriggeredRef.current = true;
      } else {
        updateVoiceStatus({ stage: 'error', message: 'فشل معالجة الطلب' });
      }
    } catch (error) {
      logger.error("Voice processing error:", error, 'service');
      updateVoiceStatus({ stage: 'error', message: 'حدث خطأ، حاول مرة أخرى' });
    } finally {
      setIsAiLoading(false);
      
      // Reset status after delay
      setTimeout(() => {
        updateVoiceStatus({ stage: 'idle' });
      }, 3000);
    }
  }, [clarificationAnswers, isAiLoading, updateVoiceStatus]);

  // Register handleVoiceSend in ref for GlobalFloatingOrb to use
  useEffect(() => {
    if (voiceSendHandlerRef) {
      voiceSendHandlerRef.current = handleVoiceSend;
    }
    return () => {
      if (voiceSendHandlerRef) {
        voiceSendHandlerRef.current = null;
      }
    };
  }, [handleVoiceSend, voiceSendHandlerRef]);

  // Handle AI input send - using Customer Service AI
  const handleSend = async (audioBlob?: Blob) => {
    // Allow sending with just audio or just text
    if (!aiInput.trim() && !audioBlob) return;
    if (isAiLoading) return;

    const userMessage = aiInput.trim();
    setAiInput("");
    setIsAiLoading(true);

    try {
      // استخدام AI لاستخراج العنوان والتصنيفات
      const draft = await generateDraftWithCta(
        userMessage || "طلب صوتي",
        undefined, // لا دعم للصور هنا
        audioBlob || undefined
      );

      if (!draft) {
        throw new Error('فشل معالجة الطلب');
      }

      // Check if clarification is needed
      if (draft.isClarification) {
        // ai-chat لا يدعم صفحات توضيحية متعددة، فقط رسالة توضيحية واحدة
        setClarificationPages([]);
        setCurrentClarificationPage(0);
        setShowFinalReview(false);
        // إضافة رسالة للمستخدم
        setAiMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text: draft.aiResponse || "يرجى توضيح طلبك أكثر",
            timestamp: new Date(),
          },
        ]);
      } else {
        // No clarification needed - show final review screen
        setFinalReview({
          title: draft.title || "",
          reformulated_request: draft.description || "",
          system_category: draft.categories?.[0] || "أخرى",
          new_category_suggestion: "لا يوجد",
          location: draft.location || "",
          ui_action: "show_confirmation_screen"
        });
        setShowFinalReview(true);
        setClarificationPages([]);
        
        // Update form fields
        if (draft.title) {
          setTitle(draft.title);
          setShowTitle(true);
          addGlow("title");
        }
        if (draft.description) {
          setDescription(draft.description);
          addGlow("description");
        }
        if (draft.location) {
          setLocation(draft.location);
          addGlow("location");
        }
        if (draft.categories && draft.categories.length > 0) {
          if (draft.categories[0] === 'أخرى' || draft.categories[0] === 'other') {
            setShowAdditionalFields(true);
          } else {
            setAdditionalFields((prev) =>
              prev.map((f) =>
                f.id === "category"
                  ? { ...f, enabled: true, value: draft.categories![0] }
                  : f
              )
            );
            setShowAdditionalFields(true);
          }
        } else {
          setShowAdditionalFields(true);
        }
      }
    } catch (error) {
      logger.error("Error processing message:", error, 'service');
      setAiMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: "عذراً، حدث خطأ. حاول مرة أخرى 🔄",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Apply final review data to form fields
  const applyFinalReviewData = (review: FinalReview) => {
    // Title
    if (review.title) {
      setTitle(review.title);
      setShowTitle(true);
      setTimeout(() => addGlow("title"), 100);
    }

    // Description (reformulated_request)
    if (review.reformulated_request) {
      setDescription(review.reformulated_request);
      setTimeout(() => addGlow("description"), 200);
    }

    // Location
    if (review.location) {
      setLocation(review.location);
      setTimeout(() => addGlow("location"), 300);
    }

    // Category
    if (review.system_category && review.system_category !== 'غير محدد' && review.system_category !== 'أخرى' && review.system_category !== 'other') {
      setAdditionalFields((prev) =>
        prev.map((f) =>
          f.id === "category"
            ? { ...f, enabled: true, value: review.system_category }
            : f
        )
      );
      setTimeout(() => addGlow("category"), 400);
      setShowAdditionalFields(true);
    } else if (!review.system_category || review.system_category === 'أخرى' || review.system_category === 'other') {
      setShowAdditionalFields(true);
    }

    // Show success message
    setAiMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: "تم تجهيز طلبك! راجع التفاصيل واضغط زر الإرسال الأخضر ✨",
        timestamp: new Date(),
      },
    ]);
  };

  // Register handleSend in ref for GlobalFloatingOrb to use
  useEffect(() => {
    if (aiSendHandlerRef) {
      aiSendHandlerRef.current = handleSend;
    }
    return () => {
      if (aiSendHandlerRef) {
        aiSendHandlerRef.current = null;
      }
    };
  }, [handleSend, aiSendHandlerRef]);

  // Get default follow-up question based on missing fields
  const getDefaultFollowUp = (desc: string, loc: string): string => {
    if (!desc && !loc) return "أهلاً! صف لي طلبك بالتفصيل، وش تحتاج بالضبط؟ 📝";
    if (!loc) return "ممتاز! وين موقعك؟ أو الخدمة عن بعد؟ 📍";
    if (!desc) return "تمام! وش تحتاج بالضبط؟ صف لي الخدمة المطلوبة 📋";
    // When both description and location are filled
    return "رائع! طلبك جاهز للنشر ✨ اضغط الزر الأخضر في الأعلى لإرسال طلبك، أو أخبرني إذا تريد إضافة تفاصيل أخرى 💡";
  };

  // Handle clarification page navigation
  const handleClarificationNext = async () => {
    const currentQuestion = clarificationPages[currentClarificationPage]?.question || '';
    const answer = clarificationAnswers[currentQuestion] || '';
    
    if (!answer.trim()) return;

    if (currentClarificationPage < clarificationPages.length - 1) {
      // Move to next page
      setCurrentClarificationPage(prev => prev + 1);
    } else {
      // All questions answered - reprocess with answers
      setIsAiLoading(true);
      try {
        const userMessage = aiInput.trim() || description || "رسالة صوتية";
        const draft = await generateDraftWithCta(userMessage);

        if (draft && !draft.isClarification) {
          setFinalReview({
            title: draft.title || "",
            reformulated_request: draft.description || "",
            system_category: draft.categories?.[0] || "أخرى",
            new_category_suggestion: "لا يوجد",
            location: draft.location || "",
            ui_action: "show_confirmation_screen"
          });
          setShowFinalReview(true);
          setClarificationPages([]);
          setCurrentClarificationPage(0);
          setClarificationAnswers({});
          
          // Update form fields
          if (draft.title) setTitle(draft.title);
          if (draft.description) setDescription(draft.description);
          if (draft.location) setLocation(draft.location);
        }
      } catch (error) {
        logger.error("Error reprocessing with answers:", error, 'service');
        setAiMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text: "عذراً، حدث خطأ. حاول مرة أخرى 🔄",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsAiLoading(false);
      }
    }
  };

  const handleClarificationBack = () => {
    if (currentClarificationPage > 0) {
      setCurrentClarificationPage(prev => prev - 1);
    }
  };

  // Handle publish (internal function - called after guest verification if needed)
  const handlePublishInternal = async (): Promise<string | null> => {
    // Get current user (in case user just logged in via guest verification)
    // Try multiple times with delay to ensure auth state is updated after login
    let currentUserId = user?.id;
    if (!currentUserId) {
      // Wait a bit for auth state to update after login
      await new Promise(resolve => setTimeout(resolve, 200));
      const currentUser = await getCurrentUser();
      currentUserId = currentUser?.id || null;
    }
    
    // If still no user, try one more time after another delay
    if (!currentUserId) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const currentUser = await getCurrentUser();
      currentUserId = currentUser?.id || null;
    }

    // Final safety: refresh session once to avoid false logouts during submit
    if (!currentUserId) {
      try {
        const { data: refreshed, error } = await supabase.auth.refreshSession();
        if (error) {
          logger.warn("Refresh session before publish failed:", error.message);
        }
        currentUserId = refreshed?.session?.user?.id || null;
      } catch (refreshErr) {
        logger.warn("Refresh session threw:", refreshErr);
      }
    }

    // Try anonymous session (useful for dev test numbers 0555/0000)
    if (!currentUserId) {
      const anonId = await ensureGuestSession();
      if (anonId) {
        currentUserId = anonId;
      }
    }

    // Only require auth if we're absolutely sure there's no user
    // Check for test phone numbers - allow them to proceed
    if (!currentUserId) {
      // التحقق من الأرقام الوهمية - محاولة الحصول على user ID من session
      const testPhone = localStorage.getItem('dev_test_phone');
      let testUserId = localStorage.getItem('dev_test_user_id');
      
      // محاولة الحصول على user ID من Supabase session
      if (!testUserId) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user?.id) {
            testUserId = sessionData.session.user.id;
            localStorage.setItem('dev_test_user_id', testUserId);
            logger.log('🔧 DEV MODE: Found user ID from session:', testUserId);
          }
        } catch (err) {
          logger.warn('🔧 DEV MODE: Could not get session:', err);
        }
      }
      
      if (testPhone && testUserId) {
        // للأرقام الوهمية، نستخدم user ID من Supabase
        logger.log('🔧 DEV MODE: Using test user ID for request creation:', testUserId);
        currentUserId = testUserId;
      } else {
        // للأرقام الحقيقية، نطلب تسجيل الدخول
        logger.warn('No user found in handlePublishInternal, saving draft and showing auth alert');
        saveFormDataForGuest();
        // Show alert with options instead of forcing redirect
        setShowAuthAlert(true);
        return null;
      }
    }
    
    // Extract budget values - use direct state values first, then additionalFields
    const budgetField = additionalFields.find((f) => f.id === "budget" && f.enabled);
    let finalBudgetMin: string | undefined = budgetMin.trim() || undefined;
    let finalBudgetMax: string | undefined = budgetMax.trim() || undefined;
    
    // Fallback to additionalFields if state is empty
    if (!finalBudgetMin && !finalBudgetMax && budgetField?.value) {
      const rawBudget = budgetField.value.replace(/[^\d-]/g, '');
      if (rawBudget.includes('-')) {
        const [min, max] = rawBudget.split('-').map(v => v.trim());
        finalBudgetMin = min || undefined;
        finalBudgetMax = max || undefined;
      } else if (rawBudget) {
        finalBudgetMin = rawBudget;
      }
    }
    
    // Extract delivery time - use preset or custom value
    const deliveryField = additionalFields.find((f) => f.id === "deliveryTime" && f.enabled);
    const finalDeliveryTime = customDeliveryValue.trim() || deliveryValue.trim() || deliveryField?.value || "";
    
    // توليد عنوان ذكي من الوصف إذا لم يكن هناك عنوان
    let finalTitle = title.trim();
    if (!finalTitle && description.trim()) {
      // استخراج عنوان من أول جملة أو أول 50 حرف
      const desc = description.trim();
      const firstSentence = desc.split(/[.،!؟\n]/)[0].trim();
      finalTitle = firstSentence.length > 50 
        ? firstSentence.slice(0, 47) + "..." 
        : firstSentence;
      
      // إذا كان العنوان قصيراً جداً، نستخدم الوصف كاملاً مع قص
      if (finalTitle.length < 10) {
        finalTitle = desc.length > 50 ? desc.slice(0, 47) + "..." : desc;
      }
    }
    
    // إذا لا زال فارغاً، نستخدم رسالة افتراضية
    if (!finalTitle) {
      finalTitle = "طلب جديد";
    }
    
    const request: Partial<Request> = {
      title: finalTitle,
      description: description.trim(),
      location: location.trim(),
      budgetMin: finalBudgetMin,
      budgetMax: finalBudgetMax,
      categories: (() => {
        const categoryField = additionalFields.find((f) => f.id === "category" && f.enabled);
        // إذا كان التصنيف "أخرى" أو غير موجود، نستخدم undefined (سيتم تصنيفه في "أخرى" تلقائياً)
        if (!categoryField || categoryField.value === 'أخرى' || categoryField.value === 'other') {
          return undefined; // سيتم تصنيفه في "أخرى" تلقائياً
        }
        return [categoryField.value]; // value is label, getCategoryIdsByLabels will convert it
      })(),
      deliveryTimeFrom: finalDeliveryTime || undefined,
      seriousness: seriousness,
    };

    // تحديد ما إذا كان تعديل أو إنشاء جديد
    const isEditing = !!editingRequestId;
    logger.log(isEditing ? "Updating request:" : "Publishing request:", request);
    logger.log("editingRequestId:", editingRequestId);
    logger.log("currentUserId:", currentUserId);
    
    // تمرير معلومات التعديل إذا كنا في وضع التعديل
    // Note: onPublish will use user?.id from App.tsx, but we ensure we have currentUserId here
    const result = await onPublish(request, isEditing, editingRequestId || undefined);
    
    // تحديث حالة الحفظ
    if (result) {
      if (isEditing) {
        // تم الحفظ بنجاح - تحديث القيم المحفوظة
        setSavedValues(getCurrentValues());
        setHasSavedOnce(true);
      }
    }
    
    return result;
  };

  return (
    <motion.div 
      className="flex flex-col h-full bg-background"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Success Notification */}
      <SuccessNotification
        isVisible={showSuccessNotification}
        onHide={() => setShowSuccessNotification(false)}
        message={editingRequestId ? "تم تحديث طلبك بنجاح!" : "تم إرسال طلبك بنجاح!"}
        subMessage={editingRequestId ? "التغييرات محفوظة" : "انتظر العروض قريباً"}
      />
      
      {/* Header */}
      <UnifiedHeader
        mode={mode}
        toggleMode={toggleMode}
        isModeSwitching={isModeSwitching}
        unreadCount={unreadCount}
        user={user}
        titleKey={titleKey}
        notifications={notifications}
        onMarkAsRead={onMarkAsRead}
        onNotificationClick={onNotificationClick}
        onClearAll={onClearAll}
        onSignOut={onSignOut}
        onGoToMarketplace={onGoToMarketplace}
        title={isGeneratingTitle ? "جاري كتابة العنوان..." : (title && title.trim() ? title : (editingRequestId ? "تعديل الطلب" : "إنشاء طلب جديد"))}
        hideModeToggle
        isGuest={isGuest}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToSettings={onNavigateToSettings}
        hideProfileButton
        backButton
        onBack={onGoToMarketplace}
        showTitleEditButton={!!(title && title.trim())}
        onTitleEdit={() => setIsTitleEditable(true)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-16">
        <AnimatePresence mode="wait">
          {/* Clarification Pages */}
          {clarificationPages.length > 0 && !showFinalReview && (
            <motion.div
              key="clarification"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Progress Indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {Array.from({ length: clarificationPages.length }).map((_, index) => (
                  <motion.div
                    key={index}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentClarificationPage
                        ? 'w-8 bg-primary'
                        : index < currentClarificationPage
                        ? 'w-2 bg-primary/50'
                        : 'w-2 bg-border'
                    }`}
                    animate={{
                      scale: index === currentClarificationPage ? 1.1 : 1,
                    }}
                  />
                ))}
                <span className="text-xs text-muted-foreground mr-2">
                  {currentClarificationPage + 1}/{clarificationPages.length}
                </span>
              </div>

              {/* Current Question Card */}
              <motion.div
                key={currentClarificationPage}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-5"
              >
                {/* Question Bubble */}
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 bg-gradient-to-br from-card to-secondary/30 rounded-2xl rounded-tr-md p-4 border border-border/50 shadow-sm">
                    <p className="text-foreground leading-relaxed font-medium">
                      {clarificationPages[currentClarificationPage]?.question}
                    </p>
                  </div>
                </div>

                {/* Answer Input - Styled exactly like وصف الطلب field */}
                {(() => {
                  const currentAnswer = clarificationAnswers[clarificationPages[currentClarificationPage]?.question || ''] || '';
                  const hasAnswer = currentAnswer.trim().length > 0;
                  return (
                    <motion.div
                      className={`relative rounded-2xl border-2 transition-all duration-300 ${
                        hasAnswer
                          ? "border-primary bg-card"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      {/* Label - clickable to focus */}
                      <div 
                        className="flex items-center gap-2 px-4 pt-3 pb-1 cursor-text"
                        onClick={() => {
                          const textarea = document.getElementById('clarification-answer');
                          textarea?.focus();
                        }}
                      >
                        <span className={hasAnswer ? "text-primary" : "text-muted-foreground"}>
                          <MessageSquare size={18} />
                        </span>
                        <span className={`text-sm font-medium ${hasAnswer ? "text-primary" : "text-muted-foreground"}`}>
                          إجابتك
                          {hasAnswer && (
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="inline-flex items-center justify-center mr-1"
                            >
                              <Check size={14} className="text-primary" />
                            </motion.span>
                          )}
                        </span>
                      </div>
                      {/* Textarea */}
                      <textarea
                        id="clarification-answer"
                        value={currentAnswer}
                        onChange={(e) => {
                          const question = clarificationPages[currentClarificationPage]?.question || '';
                          setClarificationAnswers(prev => ({ ...prev, [question]: e.target.value }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && currentAnswer.trim()) {
                            e.preventDefault();
                            handleClarificationNext();
                          }
                        }}
                        placeholder="اكتب إجابتك هنا..."
                        className="w-full bg-transparent px-4 pb-4 pt-1 text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none min-h-[120px] text-base"
                        dir="auto"
                        autoFocus
                      />
                    </motion.div>
                  );
                })()}

                {/* Navigation Buttons - Full width, professional look */}
                <div className="flex items-center gap-3 pt-3">
                  {currentClarificationPage > 0 && (
                    <motion.button
                      onClick={handleClarificationBack}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 transition-all border border-border font-medium"
                    >
                      <ChevronRight size={20} />
                      <span>السابق</span>
                    </motion.button>
                  )}
                  
                  <motion.button
                    onClick={handleClarificationNext}
                    disabled={!clarificationAnswers[clarificationPages[currentClarificationPage]?.question || '']?.trim() || isAiLoading}
                    whileHover={{ scale: (clarificationAnswers[clarificationPages[currentClarificationPage]?.question || '']?.trim() && !isAiLoading) ? 1.02 : 1 }}
                    whileTap={{ scale: (clarificationAnswers[clarificationPages[currentClarificationPage]?.question || '']?.trim() && !isAiLoading) ? 0.98 : 1 }}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-base transition-all ${
                      clarificationAnswers[clarificationPages[currentClarificationPage]?.question || '']?.trim() && !isAiLoading
                        ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                        : 'bg-secondary text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    {isAiLoading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>جاري المعالجة...</span>
                      </>
                    ) : (
                      <>
                        <span>{currentClarificationPage === clarificationPages.length - 1 ? 'إنهاء' : 'التالي'}</span>
                        <ChevronLeft size={20} />
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Final Review Screen */}
          {showFinalReview && finalReview && (
            <motion.div
              key="final-review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Success Header */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 size={32} className="text-primary" />
                </motion.div>
                <h2 className="text-xl font-bold text-foreground mb-1">تم تجهيز طلبك!</h2>
                <p className="text-muted-foreground text-sm">راجع التفاصيل وأكد الإرسال</p>
              </div>

              {/* Review Card */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                {/* Title */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <FileText size={14} />
                    <span>عنوان الطلب</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{finalReview.title}</h3>
                </div>

                {/* Description */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <MessageSquare size={14} />
                    <span>تفاصيل الطلب</span>
                  </div>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {finalReview.reformulated_request}
                  </p>
                </div>

                {/* Location */}
                {finalReview.location && (
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <MapPin size={14} />
                      <span>الموقع</span>
                    </div>
                    <p className="text-foreground">{finalReview.location}</p>
                  </div>
                )}

                {/* Category */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">التصنيف</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    finalReview.system_category === 'غير محدد'
                      ? 'bg-accent/15 text-accent-foreground'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {finalReview.system_category}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => {
                    setShowFinalReview(false);
                    setFinalReview(null);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-foreground hover:bg-secondary transition-colors"
                >
                  <span>تعديل</span>
                </motion.button>
                
                <motion.button
                  onClick={async () => {
                    // Apply final review data to form fields
                    const reviewTitle = finalReview.title || '';
                    const reviewDescription = finalReview.reformulated_request || '';
                    const reviewLocation = finalReview.location || '';
                    
                    if (reviewTitle) setTitle(reviewTitle);
                    if (reviewDescription) setDescription(reviewDescription);
                    if (reviewLocation) setLocation(reviewLocation);
                    
                    if (finalReview.system_category && finalReview.system_category !== 'غير محدد') {
                      setAdditionalFields((prev) =>
                        prev.map((f) =>
                          f.id === "category"
                            ? { ...f, enabled: true, value: finalReview.system_category }
                            : f
                        )
                      );
                    }
                    
                    // Close final review screen
                    setShowFinalReview(false);
                    setFinalReview(null);
                    
                    // Wait for state to update, then submit
                    setTimeout(async () => {
                      // Check if user is guest - require phone verification and terms acceptance
                      if (isGuest && !editingRequestId) {
                        // Save form data before requiring login
                        saveFormDataForGuest();
                        setShowFinalReview(false);
                        setFinalReview(null);
                        setGuestVerificationStep('phone');
                        return;
                      }
                      
                      try {
                        setIsSubmitting(true);
                        const requestId = await handlePublishInternal();
                        if (requestId) {
                          setCreatedRequestId(requestId);
                          setSubmitSuccess(true);
                          setIsSubmitting(false);
                          if (onGoToRequest && requestId) {
                            setTimeout(() => onGoToRequest(requestId), 2000);
                          }
                        } else {
                          setIsSubmitting(false);
                        }
                      } catch (error) {
                        logger.error("Error submitting from final review:", error, 'service');
                        setIsSubmitting(false);
                      }
                    }, 200);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-[2] flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
                >
                  <Check size={18} />
                  <span>تأكيد وإرسال</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* عرض العنوان المُنشأ أو حقل إدخال العنوان */}
        {clarificationPages.length === 0 && !showFinalReview && (
          <AnimatePresence mode="wait">
            {/* حقل تعديل العنوان */}
            {isTitleEditable && (
              <motion.div
                key="editable-title"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={16} className="text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">تعديل العنوان</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                      setTitle(e.target.value);
                      setUserEditedTitle(true);
                      setIsTitleUnclear(false);
                      setShowManualTitle(false);
                    }}
                      placeholder="اكتب عنواناً واضحاً لطلبك..."
                      className="flex-1 px-3 py-2 text-sm rounded-xl border-2 border-primary/50 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary  w-full max-w-full"
                      autoFocus
                    />
                    <button
                      onClick={() => setIsTitleEditable(false)}
                      className="shrink-0 p-3 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
                    >
                      <Check size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* حقل العنوان اليدوي - يظهر إذا AI غير متصل أو لم يُنشأ عنوان أو العنوان غير واضح */}
            {((!title.trim() && !isGeneratingTitle && showManualTitle) || isTitleUnclear) && (
              <motion.div
                key="manual-title"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ 
                  opacity: 1, 
                  height: "auto", 
                  marginBottom: 16,
                  x: titleShake ? [0, -10, 10, -10, 10, -5, 5, 0] : 0
                }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ 
                  duration: 0.3,
                  x: { duration: 0.5, ease: "easeInOut" }
                }}
                className="overflow-hidden"
              >
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={16} className={isTitleUnclear ? "text-red-500" : "text-accent"} />
                    <span className={`text-xs font-medium ${isTitleUnclear ? "text-red-500" : "text-accent-foreground"}`}>
                      عنوان الطلب (مطلوب)
                    </span>
                    {isTitleUnclear && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-500"
                      >
                        عنوان غير واضح
                      </motion.span>
                    )}
                    {isAIConnected === false && !isTitleUnclear && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground">
                        AI غير متصل
                      </span>
                    )}
                  </div>
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setUserEditedTitle(true);
                      setIsTitleUnclear(false);
                      setShowManualTitle(false);
                    }}
                    placeholder="اكتب عنواناً واضحاً لطلبك..."
                    className={`w-full px-3 py-2 text-sm rounded-xl border-2 transition-all duration-300 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none ${
                      isTitleUnclear || titleShake
                        ? "border-red-500 ring-2 ring-red-200 dark:ring-red-900/50 text-red-500" 
                        : needsManualTitle
                          ? "border-accent/50 focus:border-primary "
                          : "border-border focus:border-primary "
                    }`}
                    autoFocus={isTitleUnclear}
                  />
                  {isTitleUnclear && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium"
                    >
                      <span>⚠️</span>
                      <span>العنوان غير واضح. يرجى تعديل العنوان يدوياً قبل الإرسال</span>
                    </motion.p>
                  )}
                  {!title.trim() && needsManualTitle && !isTitleUnclear && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-accent-foreground mt-1.5 flex items-center gap-1"
                    >
                      <span>⚠️</span>
                      <span>أضف عنواناً لطلبك حتى تتمكن من الإرسال</span>
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}

            {/* مؤشر إنشاء العنوان */}
            {isGeneratingTitle && (
              <motion.div
                key="generating-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border"
              >
                <Loader2 size={18} className="animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">جاري إنشاء العنوان...</span>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Core Fields */}
        <div className="space-y-4 mb-6">
          {/* Combined Description and Location Field */}
          <motion.div
            ref={descriptionFieldRef}
            className={`relative rounded-2xl border transition-all duration-300 ${
              glowingFields.has("description") || glowingFields.has("location")
                ? "border-primary shadow-[0_0_20px_rgba(30,150,140,0.4)] bg-primary/5"
                : (description.trim().length > 0 && location)
                ? "border-primary bg-card"
                : "border-border bg-card"
            }`}
            animate={glowingFields.has("description") || glowingFields.has("location") ? { scale: [1, 1.01, 1] } : {}}
            transition={{ duration: 0.5, repeat: (glowingFields.has("description") || glowingFields.has("location")) ? 2 : 0 }}
          >
            {/* Description Label */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              <span className={glowingFields.has("description") ? "text-primary" : description.trim().length > 0 ? "text-primary" : "text-muted-foreground"}>
                <FileText size={18} />
              </span>
              <span className={`text-sm font-medium ${glowingFields.has("description") ? "text-primary" : description.trim().length > 0 ? "text-primary" : "text-muted-foreground"}`}>
                وصف الطلب
                {description.trim().length === 0 && (
                  <span className="text-red-500 mr-1">*</span>
                )}
                {description.trim().length > 0 && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center justify-center mr-1"
                  >
                    <Check size={14} className="text-primary" />
                  </motion.span>
                )}
              </span>
              {glowingFields.has("description") && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="mr-auto"
                >
                  <Sparkles size={14} className="text-primary" />
                </motion.div>
              )}
            </div>

            {/* Description Textarea */}
            <div className="px-4 pb-4 relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={() => {
                  setGlowingFields(prev => new Set(prev).add("description"));
                }}
                onBlur={() => {
                  setGlowingFields(prev => {
                    const next = new Set(prev);
                    next.delete("description");
                    return next;
                  });
                  // عند الانتقال عن حقل الوصف، أعد توليد العنوان والتصنيفات
                  // فقط إذا لم يعدّل المستخدم العنوان يدوياً
                  if (description.trim().length >= 3 && !userEditedTitle) {
                    generateTitleFromDescription(true); // force regenerate
                  }
                }}
                placeholder="صف طلبك بالتفصيل..."
                style={{ height: descriptionHeight }}
                className="w-full min-h-[100px] bg-transparent text-foreground resize-none focus:outline-none placeholder:text-muted-foreground/50 text-right"
                dir="rtl"
              />
              
              {/* Resize Handle */}
              <motion.div
                onMouseDown={handleDescriptionResizeStart}
                onTouchStart={handleDescriptionResizeStart}
                className={`absolute bottom-0 left-0 right-0 h-6 flex items-center justify-center cursor-ns-resize select-none rounded-b-2xl transition-colors ${isDescriptionResizing ? 'bg-primary/10' : 'hover:bg-primary/5'}`}
                style={{ touchAction: 'none' }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div 
                  className="flex flex-col gap-0.5 pointer-events-none"
                  animate={isDescriptionResizing ? { scale: 1.2, gap: '3px' } : { scale: 1, gap: '2px' }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <motion.div 
                    className="h-0.5 rounded-full bg-primary"
                    animate={isDescriptionResizing ? { width: 48 } : { width: 40 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  />
                  <motion.div 
                    className="h-0.5 rounded-full bg-primary"
                    animate={isDescriptionResizing ? { width: 48 } : { width: 40 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  />
                </motion.div>
              </motion.div>
            </div>

            {/* Divider */}
            <div className="px-4 border-t border-border/50">
              {/* Location Label */}
              <div className="flex items-center gap-2 pt-3 pb-1">
                <span className={glowingFields.has("location") ? "text-primary" : location ? "text-primary" : "text-muted-foreground"}>
                  <MapPin size={18} />
                </span>
                <span className={`text-sm font-medium ${glowingFields.has("location") ? "text-primary" : location ? "text-primary" : "text-muted-foreground"}`}>
                  الموقع
                  {!location && (
                    <span className="text-red-500 mr-1">*</span>
                  )}
                  {location && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex items-center justify-center mr-1"
                    >
                      <Check size={14} className="text-primary" />
                    </motion.span>
                  )}
                </span>
              </div>
              {/* City Autocomplete Input */}
              <div className="px-4 pb-3" ref={locationFieldRef}>
                <CityAutocomplete
                  value={location}
                  onChange={(value: string, cityResult?: CityResult) => {
                    setLocation(value);
                    // يمكن استخدام cityResult للحصول على الإحداثيات
                    if (cityResult?.lat && cityResult?.lng) {
                      logger.log('City coordinates:', cityResult.lat, cityResult.lng);
                    }
                  }}
                  placeholder="ابحث عن مدن، معالم، أو محلات..."
                  showRemoteOption={true}
                  showGPSOption={true}
                  showMapOption={true}
                  showAllCitiesOption={true}
                  onOpenChange={setIsCityAutocompleteOpen}
                />
              </div>
            </div>

            {/* Budget Field - Collapsible */}
            <div className="px-4 border-t border-border/50">
              {/* Label - Clickable to expand/collapse */}
              <button
                type="button"
                onClick={() => setIsBudgetExpanded(!isBudgetExpanded)}
                className="w-full flex items-center justify-between gap-2 pt-3 pb-2"
              >
                <div className="flex items-center gap-2">
                  <span className={budgetMin || budgetMax ? "text-primary" : "text-muted-foreground"}>
                    <DollarSign size={18} />
                  </span>
                  <span className={`text-sm font-medium ${budgetMin || budgetMax ? "text-primary" : "text-muted-foreground"}`}>
                    الميزانية
                    {(budgetMin || budgetMax) && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center justify-center mr-1"
                      >
                        <Check size={14} className="text-primary" />
                      </motion.span>
                    )}
                  </span>
                </div>
                <motion.span
                  animate={{ rotate: isBudgetExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-muted-foreground"
                >
                  <ChevronDown size={16} />
                </motion.span>
              </button>

              {/* Collapsible Budget Area */}
              <AnimatePresence>
                {isBudgetExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={budgetMin}
                            onChange={(e) => setBudgetMin(e.target.value.replace(/[^\d]/g, ''))}
                            placeholder="من"
                            className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:border-primary  text-center"
                            dir="rtl"
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">ر.س</span>
                        </div>
                        <span className="text-muted-foreground text-sm">-</span>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={budgetMax}
                            onChange={(e) => setBudgetMax(e.target.value.replace(/[^\d]/g, ''))}
                            placeholder="إلى"
                            className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:border-primary  text-center"
                            dir="rtl"
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">ر.س</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Delivery Time Field - Collapsible */}
            <div className="px-4 border-t border-border/50">
              {/* Label - Clickable to expand/collapse */}
              <button
                type="button"
                onClick={() => setIsDeliveryExpanded(!isDeliveryExpanded)}
                className="w-full flex items-center justify-between gap-2 pt-3 pb-2"
              >
                <div className="flex items-center gap-2">
                  <span className={deliveryValue || customDeliveryValue ? "text-primary" : "text-muted-foreground"}>
                    <Clock size={18} />
                  </span>
                  <span className={`text-sm font-medium ${deliveryValue || customDeliveryValue ? "text-primary" : "text-muted-foreground"}`}>
                    مدة التنفيذ
                    {(deliveryValue || customDeliveryValue) && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center justify-center mr-1"
                      >
                        <Check size={14} className="text-primary" />
                      </motion.span>
                    )}
                  </span>
                </div>
                <motion.span
                  animate={{ rotate: isDeliveryExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-muted-foreground"
                >
                  <ChevronDown size={16} />
                </motion.span>
              </button>

              {/* Collapsible Delivery Area */}
              <AnimatePresence>
                {isDeliveryExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 pb-3">
                      {/* Preset Options */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {deliveryPresets.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => {
                              if (deliveryValue === preset.value) {
                                setDeliveryValue("");
                              } else {
                                setDeliveryValue(preset.value);
                                setCustomDeliveryValue("");
                              }
                            }}
                            className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                              deliveryValue === preset.value
                                ? "bg-primary text-white border-primary"
                                : "bg-background border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      {/* Custom Input */}
                      <input
                        type="text"
                        value={customDeliveryValue}
                        onChange={(e) => {
                          setCustomDeliveryValue(e.target.value);
                          if (e.target.value) {
                            setDeliveryValue("");
                          }
                        }}
                        placeholder="أو اكتب مدة مخصصة..."
                        className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:border-primary "
                        dir="rtl"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Attachments Section - Collapsible */}
            <div className="px-4 border-t border-border/50">
              {/* Label - Clickable to expand/collapse */}
              <button
                type="button"
                onClick={() => setIsAttachmentsExpanded(!isAttachmentsExpanded)}
                className="w-full flex items-center justify-between gap-2 pt-3 pb-2"
              >
                <div className="flex items-center gap-2">
                  <span className={attachedFiles.length > 0 ? "text-primary" : "text-muted-foreground"}>
                    <Paperclip size={18} />
                  </span>
                  <span className={`text-sm font-medium ${attachedFiles.length > 0 ? "text-primary" : "text-muted-foreground"}`}>
                    المرفقات وصور توضيحية
                    {attachedFiles.length > 0 && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center justify-center mr-1"
                      >
                        <Check size={14} className="text-primary" />
                      </motion.span>
                    )}
                  </span>
                  {attachedFiles.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {attachedFiles.length} ملف
                    </span>
                  )}
                </div>
                <motion.span
                  animate={{ rotate: isAttachmentsExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-muted-foreground"
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
              {/* Uploaded Files Preview */}
              {attachedFiles.length > 0 && (
                <div className="flex gap-2 flex-wrap justify-start w-full mb-3">
                  {attachedFiles.map((file, index) => {
                    const isImage = file.type.startsWith("image/");
                    const isVideo = file.type.startsWith("video/");
                    const fileUrl = fileUrls[index];
                    return (
                      <motion.div
                        key={file.name + index}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="relative group"
                      >
                        <div 
                          className="w-20 h-20 rounded-xl overflow-hidden border border-border bg-secondary cursor-pointer hover:border-primary transition-colors"
                          onClick={() => {
                            setPreviewAttachment({
                              type: 'file',
                              index,
                              url: fileUrl,
                              name: file.name
                            });
                          }}
                        >
                          {isImage ? (
                            <img src={fileUrl} alt={file.name} className="w-full h-full object-cover" />
                          ) : isVideo ? (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10">
                              <FileText size={24} className="text-primary" />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText size={24} className="text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        {/* Preview icon overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors rounded-xl cursor-pointer"
                          onClick={() => {
                            setPreviewAttachment({
                              type: 'file',
                              index,
                              url: fileUrl,
                              name: file.name
                            });
                          }}
                        >
                          <ZoomIn size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAttachedFiles(prev => prev.filter((_, i) => i !== index));
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-10"
                        >
                          <Trash2 size={12} />
                        </button>
                        {!isImage && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5 px-1 truncate rounded-b-xl">
                            {file.name}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Upload Buttons */}
              <div className="flex gap-3">
                {/* Upload Box */}
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center h-24 bg-background border border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Upload size={28} className="text-primary mb-2" />
                  <span className="text-xs text-muted-foreground">رفع ملف/صورة</span>
                </button>
                
              </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    setAttachedFiles(prev => [...prev, ...files]);
                  }
                  e.target.value = "";
                }}
              />
            </div>

            {/* Seriousness Level - مؤشر الجدية */}
            <div className="px-4 border-t border-border/50 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Target size={16} className="text-primary" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">مستوى الجدية</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {seriousness === 5 && "عالية جداً (عروض قليلة جداً)"}
                    {seriousness === 4 && "عالية (عروض قليلة)"}
                    {seriousness === 3 && "متوسطة (عروض متوسطة)"}
                    {seriousness === 2 && "منخفضة (عروض كثيرة)"}
                    {seriousness === 1 && "منخفضة جداً (عروض كثيرة جداً)"}
                  </p>
                </div>
              </div>
              
              {/* Elegant Slider */}
              <div className="relative py-3">
                {/* Background track */}
                <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-secondary/60 rounded-full -translate-y-1/2" />
                
                {/* Active track with gradient */}
                <div 
                  className="absolute top-1/2 left-0 h-1.5 bg-gradient-to-r from-primary to-primary/80 rounded-full -translate-y-1/2 transition-all duration-300 ease-out"
                  style={{ width: `${((seriousness - 1) / 4) * 100}%` }}
                />
                
                {/* Level dots - positioned at exact percentages to align with thumb */}
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none">
                  {[1, 2, 3, 4, 5].map((level) => {
                    // Calculate position: 0%, 25%, 50%, 75%, 100%
                    const position = ((level - 1) / 4) * 100;
                    return (
                      <div
                        key={level}
                        className="absolute transition-all duration-300"
                        style={{
                          left: `calc(${position}% - 6px)`, // 6px = half of 12px (w-3)
                          transform: `translateY(-50%) ${seriousness >= level ? 'scale(1.25)' : 'scale(1)'}`,
                        }}
                      >
                        <div
                          className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            seriousness >= level
                              ? 'bg-primary shadow-lg shadow-primary/40'
                              : 'bg-secondary border-2 border-background'
                          }`}
                        />
                        {seriousness === level && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute inset-0 rounded-full bg-primary/20"
                            style={{ width: '200%', height: '200%', left: '-50%', top: '-50%' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Slider input */}
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={seriousness}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value);
                    setSeriousness(newValue);
                    if (navigator.vibrate) {
                      navigator.vibrate(10);
                    }
                  }}
                  className="relative w-full h-2 bg-transparent appearance-none cursor-pointer slider-elegant z-10"
                />
                
                {/* Slider styles - thumb aligned with dots */}
                <style>{`
                  .slider-elegant {
                    padding: 0;
                    margin: 0;
                  }
                  .slider-elegant::-webkit-slider-thumb {
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: hsl(var(--primary));
                    cursor: grab;
                    border: 3px solid hsl(var(--background));
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 0 rgba(var(--primary-rgb), 0.4);
                    transition: all 0.2s ease;
                    position: relative;
                    z-index: 20;
                    margin-top: -9px; /* Center align: (20px thumb - 2px track) / 2 = 9px */
                  }
                  .slider-elegant::-webkit-slider-thumb:active {
                    cursor: grabbing;
                    transform: scale(1.2);
                    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2), 0 0 0 4px rgba(var(--primary-rgb), 0.2);
                  }
                  .slider-elegant::-webkit-slider-thumb:hover {
                    transform: scale(1.15);
                    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(var(--primary-rgb), 0.3);
                  }
                  .slider-elegant::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: hsl(var(--primary));
                    cursor: grab;
                    border: 3px solid hsl(var(--background));
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                    transition: all 0.2s ease;
                  }
                  .slider-elegant::-moz-range-thumb:active {
                    cursor: grabbing;
                    transform: scale(1.2);
                    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
                  }
                  .slider-elegant::-moz-range-thumb:hover {
                    transform: scale(1.15);
                  }
                  .slider-elegant::-webkit-slider-runnable-track {
                    background: transparent;
                    height: 2px;
                  }
                  .slider-elegant::-moz-range-track {
                    background: transparent;
                    height: 2px;
                    border: none;
                  }
                `}</style>
              </div>
              
              {/* Labels */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                <span className="text-[10px] text-muted-foreground font-medium">قليل العروض</span>
                <span className="text-[10px] text-muted-foreground font-medium">كثير العروض</span>
              </div>
            </div>
          </motion.div>
          
        </div>

        {/* Additional Fields Section - Only show when AI suggests them */}
        <AnimatePresence>
          {showAdditionalFields && (
            <motion.div 
              className="mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnimatePresence mode="popLayout">
                  {additionalFields.filter(f => f.enabled && f.id !== "category").map((field) => (
                    <AdditionalFieldCard
                      key={field.id}
                      field={field}
                      onRemove={removeField}
                      onValueChange={updateFieldValue}
                      isGlowing={glowingFields.has(field.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* زر الإرسال العائم في الأسفل */}
      {!isCityAutocompleteOpen && (
      <div className="fixed bottom-0 left-0 right-0 md:right-72 z-50 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-4 px-4">
        {/* زر أرسل الطلب الآن */}
        <SubmitButtonWithShake
          canSubmit={canSubmit}
          isSubmitting={isSubmitting}
          isGeneratingTitle={isGeneratingTitle}
          submitSuccess={submitSuccess}
          isGuest={isGuest}
          editingRequestId={editingRequestId}
          onGuestVerification={() => {
            // Save form data before requiring login
            saveFormDataForGuest();
            setGuestVerificationStep('phone');
          }}
          onSubmit={async () => {
            if (navigator.vibrate) navigator.vibrate(15);
            setIsSubmitting(true);
            
            try {
              const requestId = await handlePublishInternal();
              if (requestId) {
                setCreatedRequestId(requestId);
                setSubmitSuccess(true);
                setShowSuccessNotification(true);
                
                if (!editingRequestId) {
                  setTimeout(() => {
                    if (onGoToRequest && requestId) {
                      onGoToRequest(requestId);
                    }
                  }, 2000);
                }
              }
            } catch (error) {
              logger.error("Error submitting:", error, 'service');
            } finally {
              setIsSubmitting(false);
            }
          }}
          onGoToRequest={onGoToRequest}
        />
      </div>
      )}

      {/* Attachment Preview Modal */}
      <AnimatePresence>
        {previewAttachment && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-[100]"
              onClick={() => setPreviewAttachment(null)}
            />
            
            {/* Preview Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4"
              onClick={() => setPreviewAttachment(null)}
            >
              <div 
                className="relative max-w-4xl max-h-[90vh] w-full h-full flex flex-col bg-background rounded-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {previewAttachment.name && (
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText size={20} className="text-primary shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {previewAttachment.name}
                        </span>
                      </div>
                    )}
                    {!previewAttachment.name && (
                      <span className="text-sm font-medium text-foreground">معاينة المرفق</span>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Download button for files */}
                    {previewAttachment.type === 'file' && (
                      <motion.a
                        href={previewAttachment.url}
                        download={previewAttachment.name}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download size={18} />
                      </motion.a>
                    )}
                    
                    {/* Delete button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (previewAttachment.type === 'file') {
                          setAttachedFiles(prev => prev.filter((_, i) => i !== previewAttachment.index));
                        }
                        setPreviewAttachment(null);
                      }}
                      className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 size={18} />
                    </motion.button>
                    
                    {/* Close button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPreviewAttachment(null)}
                      className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                      <X size={18} className="text-foreground" />
                    </motion.button>
                  </div>
                </div>
                
                {/* Preview Content */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-black/50">
                  {previewAttachment.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || 
                   (previewAttachment.type === 'file' && attachedFiles[previewAttachment.index]?.type.startsWith('image/')) ? (
                    <img 
                      src={previewAttachment.url} 
                      alt={previewAttachment.name || "معاينة"} 
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  ) : previewAttachment.url.match(/\.(mp4|webm|ogg)$/i) ||
                    (previewAttachment.type === 'file' && attachedFiles[previewAttachment.index]?.type.startsWith('video/')) ? (
                    <video 
                      src={previewAttachment.url} 
                      controls 
                      className="max-w-full max-h-full rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 p-8">
                      <FileText size={64} className="text-muted-foreground" />
                      <p className="text-muted-foreground text-center">
                        {previewAttachment.name || "لا يمكن معاينة هذا النوع من الملفات"}
                      </p>
                      {previewAttachment.type === 'file' && (
                        <motion.a
                          href={previewAttachment.url}
                          download={previewAttachment.name}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-4 py-2 rounded-xl bg-primary text-white font-medium flex items-center gap-2"
                        >
                          <Download size={18} />
                          <span>تحميل الملف</span>
                        </motion.a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Guest Verification Modal */}
      {isGuest && guestVerificationStep !== 'none' && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl p-6 max-w-md w-full shadow-2xl border border-border"
          >
            {guestVerificationStep === 'phone' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-right">التحقق من رقم الجوال</h3>
                <p className="text-sm text-muted-foreground text-right">
                  لإتمام إنشاء الطلب، نحتاج للتحقق من رقم جوالك. سيتم إرسال رمز تحقق على رقمك.
                </p>
                <div className={`relative flex items-center gap-2 border-2 rounded-lg bg-background px-4 h-12 focus-within:border-primary transition-all min-w-0 overflow-hidden ${guestError ? 'border-red-500' : 'border-border'}`}>
                  <span className="text-muted-foreground font-medium shrink-0">+966</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={guestPhone}
                    onChange={(e) => {
                      // السماح بـ 0 في البداية أو بدون
                      const value = e.target.value.replace(/\D/g, '');
                      // يقبل حتى 10 أرقام (مع 0) أو 9 (بدون 0)
                      // السماح بالأرقام السعودية (تبدأ بـ 5 أو 05) والأرقام الوهمية (555...)
                      if (value.length <= 10) {
                        setGuestPhone(value);
                        setGuestError(null);
                      }
                    }}
                    placeholder="0501234567 أو 5555555555"
                    className="flex-1 h-full bg-transparent text-base outline-none text-left min-w-0"
                    dir="ltr"
                    maxLength={10}
                    autoFocus
                  />
                </div>
                
                {/* عرض رسالة الخطأ */}
                <AnimatePresence>
                  {guestError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-600 dark:text-red-400 text-right flex-1">
                          {guestError}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!guestPhone.trim()) {
                        setGuestError("يرجى إدخال رقم الجوال");
                        return;
                      }
                      
                      // التحقق من صحة الرقم (سعودي أو وهمي)
                      const cleanPhone = guestPhone.replace(/\D/g, '');
                      const isTestPhone = cleanPhone.startsWith('0555') || cleanPhone.startsWith('555');
                      const isValid = isValidSaudiPhone(guestPhone) || isTestPhone;
                      
                      if (!isValid) {
                        setGuestError("يرجى إدخال رقم جوال صحيح (9 أو 10 أرقام)");
                        return;
                      }
                      
                      setIsSendingOTP(true);
                      setGuestError(null);
                      const result = await verifyGuestPhone(guestPhone);
                      setIsSendingOTP(false);
                      if (result.success) {
                        setGuestVerificationStep('otp');
                        setGuestError(null);
                      } else {
                        const translatedError = translateAuthError(result.error || "فشل إرسال رمز التحقق");
                        setGuestError(translatedError);
                      }
                    }}
                    disabled={isSendingOTP || (() => {
                      // تعطيل الزر حتى يكون الرقم صحيحاً
                      if (!guestPhone.trim()) return true;
                      const cleanPhone = guestPhone.replace(/\D/g, '');
                      // السماح بالأرقام الوهمية (555...)
                      const isTestPhone = cleanPhone.startsWith('0555') || cleanPhone.startsWith('555');
                      // السماح بالأرقام السعودية (9 أو 10 أرقام)
                      const isValid = isValidSaudiPhone(guestPhone) || isTestPhone;
                      return !isValid;
                    })()}
                    className="flex-1 h-12 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingOTP ? "جاري الإرسال..." : "إرسال رمز التحقق"}
                  </button>
                  <button
                    onClick={() => {
                      setGuestVerificationStep('none');
                      setGuestPhone("");
                      setGuestError(null);
                    }}
                    className="px-4 h-12 bg-secondary text-foreground rounded-lg font-bold hover:bg-secondary/80 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
            
            {guestVerificationStep === 'otp' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-right">أدخل رمز التحقق</h3>
                <p className="text-sm text-muted-foreground text-right">
                  تم إرسال رمز التحقق إلى {guestPhone}
                </p>
                <input
                  type="text"
                  value={guestOTP}
                  onChange={(e) => {
                    setGuestOTP(e.target.value.replace(/\D/g, '').slice(0, 4));
                    setGuestError(null);
                  }}
                  placeholder="0000"
                  className={`w-full h-14 px-4 text-center rounded-xl border-2 bg-background text-3xl font-black tracking-[0.5em] outline-none transition-all focus:border-primary ${
                    guestError ? 'border-red-500' : 'border-border'
                  }`}
                  dir="ltr"
                  maxLength={4}
                  autoFocus
                />
                
                {/* عرض رسالة الخطأ */}
                <AnimatePresence>
                  {guestError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-600 dark:text-red-400 text-right flex-1">
                          {guestError}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (guestOTP.length !== 4) {
                        setGuestError("يرجى إدخال رمز التحقق المكون من 4 أرقام");
                        return;
                      }
                      setIsVerifyingOTP(true);
                      setGuestError(null);
                      const result = await confirmGuestPhone(guestPhone, guestOTP);
                      setIsVerifyingOTP(false);
                      if (result.success) {
                        // بعد التحقق الناجح، تأكد من وجود جلسة (مهم لرقم 0555/0000)
                        // للأرقام الوهمية، نستخدم guest mode مباشرة بدون انتظار
                        const cleanPhone = guestPhone.replace(/\D/g, '');
                        const isTestPhone = cleanPhone.startsWith('0555') || cleanPhone.startsWith('555');
                        
                        let userProfile = null;
                        if (isTestPhone) {
                          // للأرقام الوهمية، نستخدم guest mode مباشرة
                          logger.log('🔧 DEV MODE: Using guest mode for test phone');
                          userProfile = { id: localStorage.getItem('dev_test_user_id') || `test_${Date.now()}` } as any;
                        } else {
                          // للأرقام الحقيقية، نحاول الحصول على user profile
                          userProfile = await getCurrentUser();
                          if (!userProfile?.id) {
                            const anonId = await ensureGuestSession();
                            if (!anonId) {
                              setGuestError("فشل في إنشاء جلسة مؤقتة. حاول مرة أخرى أو سجّل دخول.");
                              return;
                            }
                            userProfile = await getCurrentUser();
                          }
                        }
                        // بعد التحقق الناجح، تحقق من حالة Onboarding
                        if (userProfile?.id) {
                          localStorage.setItem('dev_test_user_id', userProfile.id);
                          
                          // للأرقام الوهمية، نتخطى التحقق من Onboarding تماماً
                          if (isTestPhone) {
                            logger.log('🔧 DEV MODE: Skipping onboarding check for test phone');
                            // مباشرة الانتقال إلى شروط الاستخدام
                            setGuestVerificationStep('terms');
                            setGuestError(null);
                            return;
                          }
                          
                          // للأرقام الحقيقية فقط: التحقق من حالة Onboarding
                          const userOnboardedKey = `abeely_onboarded_${userProfile.id}`;
                          const localOnboarded = localStorage.getItem(userOnboardedKey) === 'true';
                          const hasName = !!userProfile.display_name?.trim();
                          
                          // التحقق من قاعدة البيانات إذا لم يكن هناك علامة محلية
                          let needsOnboarding = !localOnboarded || !hasName;
                          if (!localOnboarded) {
                            try {
                              const { data: profileData } = await supabase
                                .from('profiles')
                                .select('interested_categories, interested_cities, display_name, has_onboarded')
                                .eq('id', userProfile.id)
                                .single();
                              
                              const hasInterests = Array.isArray(profileData?.interested_categories) && profileData.interested_categories.length > 0;
                              const hasCities = Array.isArray(profileData?.interested_cities) && profileData.interested_cities.length > 0;
                              const hasProfileName = !!profileData?.display_name?.trim();
                              const alreadyOnboarded = profileData?.has_onboarded === true;
                              
                              needsOnboarding = !(alreadyOnboarded || (hasProfileName && (hasInterests || hasCities)));
                            } catch (err) {
                              logger.error('Error checking onboarding status:', err, 'service');
                              // في حالة الخطأ، نعتبر أن المستخدم يحتاج onboarding إذا لم يكن هناك اسم
                              needsOnboarding = !hasName;
                            }
                          }
                          
                          if (needsOnboarding) {
                            // المستخدم يحتاج إلى Onboarding - احفظ البيانات وانتقل إلى Onboarding
                            saveFormDataForGuest();
                            localStorage.setItem('abeely_requires_onboarding', 'true');
                            localStorage.setItem('abeely_pending_action', 'create_request');
                            // إعادة تحميل الصفحة للانتقال إلى OnboardingScreen
                            window.location.reload();
                            return;
                          }
                        }
                        
                        setGuestVerificationStep('terms');
                        setGuestError(null);
                      } else {
                        const translatedError = translateAuthError(result.error || "رمز التحقق غير صحيح");
                        setGuestError(translatedError);
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
                      setGuestVerificationStep('phone');
                      setGuestOTP("");
                      setGuestError(null);
                    }}
                    className="px-4 h-12 bg-secondary text-foreground rounded-lg font-bold hover:bg-secondary/80 transition-colors"
                  >
                    رجوع
                  </button>
                </div>
                
                {/* زر إعادة إرسال الرمز */}
                <button
                  onClick={async () => {
                    setIsSendingOTP(true);
                    setGuestError(null);
                    const result = await verifyGuestPhone(guestPhone);
                    setIsSendingOTP(false);
                    if (result.success) {
                      setGuestOTP("");
                      setGuestError(null);
                    } else {
                      const translatedError = translateAuthError(result.error || "فشل إرسال رمز التحقق");
                      setGuestError(translatedError);
                    }
                  }}
                  disabled={isSendingOTP}
                  className="w-full text-center text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  {isSendingOTP ? "جاري إعادة الإرسال..." : "لم يصلك الرمز؟ إعادة الإرسال"}
                </button>
              </div>
            )}
            
            {guestVerificationStep === 'terms' && (
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
                
                {/* عرض رسالة الخطأ */}
                <AnimatePresence>
                  {guestError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-600 dark:text-red-400 text-right flex-1">
                          {guestError}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!termsAccepted) {
                        setGuestError("يرجى الموافقة على الشروط والأحكام");
                        return;
                      }
                      setGuestError(null);
                      
                      // Proceed with publishing (don't close modal yet - wait for success/error)
                      // Note: handlePublishInternal will check for user itself
                      if (navigator.vibrate) navigator.vibrate(15);
                      setIsSubmitting(true);
                      
                      try {
                        // Force refresh user before publishing - wait a bit for auth state to update
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        // التحقق من الأرقام الوهمية - للأرقام الوهمية نسمح بإنشاء الطلب بدون مستخدم
                        const cleanPhone = guestPhone.replace(/\D/g, '');
                        const isTestPhone = cleanPhone.startsWith('0555') || cleanPhone.startsWith('555');
                        
                        let userProfile = null;
                        if (!isTestPhone) {
                          // للأرقام الحقيقية، يجب التحقق من المستخدم
                          userProfile = await getCurrentUser();
                          if (!userProfile?.id) {
                            setGuestError("فشل تسجيل الدخول. حاول مرة أخرى.");
                            setIsSubmitting(false);
                            return;
                          }
                        } else {
                          // للأرقام الوهمية، نستخدم رقم وهمي كـ user ID
                          logger.log('🔧 DEV MODE: Using test phone, allowing request creation without real user');
                        }
                        
                        const requestId = await handlePublishInternal();
                        if (requestId) {
                          // Success - now close modal and clear data
                          setGuestVerificationStep('none');
                          setTermsAccepted(false);
                          setGuestPhone("");
                          setGuestOTP("");
                          
                          // Clear saved form data since we're proceeding with publish
                          // SECURITY: Clear both user-specific and generic keys
                          if (userProfile?.id) {
                            localStorage.removeItem(`abeely_pending_request_form_${userProfile.id}`);
                          }
                          localStorage.removeItem('abeely_pending_request_form');
                          
                          setCreatedRequestId(requestId);
                          setSubmitSuccess(true);
                          setShowSuccessNotification(true);
                          
                          if (!editingRequestId) {
                            setTimeout(() => {
                              if (onGoToRequest && requestId) {
                                onGoToRequest(requestId);
                              }
                            }, 2000);
                          }
                        } else {
                          setGuestError("فشل في إنشاء الطلب. حاول مرة أخرى.");
                        }
                      } catch (error) {
                        logger.error("Error submitting:", error, 'service');
                        setGuestError("حدث خطأ في إنشاء الطلب. حاول مرة أخرى.");
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={!termsAccepted || isSubmitting}
                    className="flex-1 h-12 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    موافق وإنشاء الطلب
                  </button>
                  <button
                    onClick={() => {
                      setGuestVerificationStep('otp');
                      setTermsAccepted(false);
                      setGuestError(null);
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

      {/* Auth Required Alert Modal */}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {showAuthAlert && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowAuthAlert(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-background rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-right">تسجيل الدخول مطلوب</h3>
                    <p className="text-sm text-muted-foreground text-right mt-1">
                      يجب تسجيل الدخول لإرسال الطلب. تم حفظ بياناتك مؤقتاً.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAuthAlert(false);
                      onRequireAuth?.();
                    }}
                    className="flex-1 h-12 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors"
                  >
                    تسجيل الدخول
                  </button>
                  <button
                    onClick={() => {
                      setShowAuthAlert(false);
                    }}
                    className="px-6 h-12 bg-secondary text-foreground rounded-lg font-bold hover:bg-secondary/80 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Floating AI Input is now handled by GlobalFloatingOrb in App.tsx */}
    </motion.div>
  );
};

export default CreateRequestV2;
