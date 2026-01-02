import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Map,
  X,
  DollarSign,
  Clock,
  Tag,
  FileText,
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
} from "lucide-react";
import { findApproximateImages } from "../services/geminiService";
import { UnifiedHeader } from "./ui/UnifiedHeader";
import { Request } from "../types";
import Anthropic from "@anthropic-ai/sdk";
import {
  processCustomerRequest,
  FinalReview,
  ClarificationPage,
  CustomerServiceResponse,
} from "../services/customerServiceAI";
import { VoiceProcessingStatus } from "./GlobalFloatingOrb";
import { CityAutocomplete } from "./ui/CityAutocomplete";
import { CityResult } from "../services/placesService";

// ============================================
// Types
// ============================================
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
      console.warn("⚠️ Anthropic API doesn't support audio, audio blob will be ignored");
    }
    
    const prompt = `أنت مساعد ذكي في منصة "أبيلي" لطلب الخدمات. تفهم اللهجة السعودية والعربية الفصحى.

## تنبيه مهم: ${isFirstInteraction ? 'هذه أول رسالة من العميل' : 'هذه رسالة متابعة (لا تكرر الترحيب!)'}

## مهم جداً - قواعد الفهم:
1. لا تفترض أي شيء! إذا كانت الرسالة غير واضحة، اسأل للتوضيح
2. افهم السياق الكامل قبل استخراج أي معلومات
3. "أبي/أبغى/أريد" = يريد خدمة، ليس معلومات تقنية
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
   - إذا الرسالة غامضة: اسأل "وش بالضبط تحتاج؟ صف لي الخدمة اللي تبيها"
   - إذا واضحة: استخرج الوصف واسأل عن الموقع`
  : !currentData.location
  ? `- عندنا الوصف. نحتاج الموقع فقط
   - اسأل: "وين موقعك؟ أو الخدمة عن بعد؟"`
  : `- الطلب مكتمل! أخبره بلطف أن طلبه جاهز ويضغط زر الإرسال الأخضر
   - إذا أراد إضافة تفاصيل، ساعده`}

## قواعد الاستخراج:
- title: عنوان قصير وواضح (3-5 كلمات) يعبر عن الخدمة المطلوبة
- description: وصف مهني للخدمة المطلوبة (لا تضف معلومات لم يذكرها)
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

## أمثلة على الفهم الصحيح:
- "أبي سباك" → طلب خدمة سباكة (ليس معلومات عن السباكة)
- "أبي مصمم" → طلب مصمم جرافيك أو ديكور (اسأل للتوضيح)
- "أبي أحد ينظف البيت" → طلب خدمة تنظيف منزلي

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
    console.error("AI Extraction Error:", error);
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
          className="fixed top-0 left-0 right-0 z-[100] p-4"
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
          ? "border-emerald-500 bg-card"
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
        <span className={`${isGlowing ? "text-primary" : isCompleted ? "text-emerald-500" : "text-muted-foreground"}`}>
          {icon}
        </span>
        <span className={`text-sm font-medium ${isGlowing ? "text-primary" : isCompleted ? "text-emerald-500" : "text-muted-foreground"}`}>
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
                  <Check size={14} className="text-emerald-500" />
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
            onBlur={() => setIsFocused(false)}
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
            onBlur={() => setIsFocused(false)}
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
  
  // ==========================================
  // Image Search State
  // ==========================================
  const [isImageSearching, setIsImageSearching] = useState(false);
  const [searchedImages, setSearchedImages] = useState<string[]>([]);
  const [selectedSearchImages, setSelectedSearchImages] = useState<Set<string>>(new Set());
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  
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
      setDescription(newDescription);
      setLocation(newLocation);
      
      // حساب قيم الحقول الإضافية
      let budgetValue = "";
      if (requestToEdit.budgetMin && requestToEdit.budgetMax) {
        budgetValue = `${requestToEdit.budgetMin} - ${requestToEdit.budgetMax}`;
      } else if (requestToEdit.budgetMin || requestToEdit.budgetMax) {
        budgetValue = requestToEdit.budgetMin || requestToEdit.budgetMax || "";
      }
      
      const deliveryValue = requestToEdit.deliveryTimeFrom || "";
      const categoryValue = requestToEdit.categories?.join("، ") || "";
      
      // تعبئة الحقول الإضافية
      setAdditionalFields(prevFields => {
        return prevFields.map(field => {
          if (field.id === "budget" && budgetValue) {
            return { ...field, value: budgetValue, enabled: true };
          }
          if (field.id === "deliveryTime" && deliveryValue) {
            return { ...field, value: deliveryValue, enabled: true };
          }
          if (field.id === "category" && categoryValue) {
            return { ...field, value: categoryValue, enabled: true };
          }
          return field;
        });
      });
      
      // إظهار الحقول الإضافية إذا كانت مفعّلة
      if (budgetValue || deliveryValue || categoryValue) {
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
        budget: budgetValue.trim(),
        deliveryTime: deliveryValue.trim(),
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

  // Check AI connection on mount - نفترض دائماً أن AI متصل (سواء Edge Function أو مباشر)
  // العنوان سيتم توليده تلقائياً من الوصف إذا لم يكن موجوداً
  useEffect(() => {
    // نفترض أن AI متصل - الفحص الفعلي يتم عند الاستخدام
    // إذا فشل، سنعرض حقل العنوان في تلك اللحظة
    setIsAIConnected(true);
    setShowManualTitle(false); // لا نعرض حقل العنوان اليدوي افتراضياً
  }, []);

  // Check if can submit - يظهر الزر بعد تعبئة الوصف والمدينة فقط
  const needsManualTitle = !title.trim();
  const canSubmit = !!(description.trim() && location.trim());
  
  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  
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

  // ==========================================
  // Image Search Functions
  // ==========================================
  const handleImageSearch = async (loadMore = false) => {
    const searchQuery = title || description;
    if (!searchQuery) {
      return;
    }
    setIsImageSearching(true);
    try {
      const images = await findApproximateImages(searchQuery);
      if (images && images.length > 0) {
        if (loadMore) {
          setSearchedImages(prev => {
            const newImages = images.filter(img => !prev.includes(img));
            return [...prev, ...newImages];
          });
        } else {
          setSearchedImages(images);
          setSelectedSearchImages(new Set());
        }
      }
    } catch (e) {
      console.error("Image search error:", e);
    } finally {
      setIsImageSearching(false);
    }
  };

  const toggleImageSelection = (imageUrl: string) => {
    setSelectedSearchImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageUrl)) {
        newSet.delete(imageUrl);
      } else {
        newSet.add(imageUrl);
      }
      return newSet;
    });
  };

  const addSelectedImagesToAttachments = () => {
    if (selectedSearchImages.size === 0) return;
    const selectedUrls = Array.from(selectedSearchImages);
    setSelectedImageUrls(prev => [...prev, ...selectedUrls]);
    // Remove selected images from search results (so they don't show as duplicates)
    setSearchedImages(prev => prev.filter(img => !selectedSearchImages.has(img)));
    setSelectedSearchImages(new Set());
    // Keep search results visible - don't clear them
  };
  
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
  
  // حالة إنشاء العنوان بالذكاء الاصطناعي
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isTitleEditable, setIsTitleEditable] = useState(false);
  const hasGeneratedTitleRef = useRef(false);

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

  // إنشاء العنوان بالذكاء الاصطناعي - يعمل فقط عند اكتمال الوصف وبدء كتابة الموقع
  const generateTitleFromDescription = useCallback(async () => {
    if (hasGeneratedTitleRef.current) return;
    if (!description.trim() || description.trim().length < 10) return;
    if (isGeneratingTitle) return;
    
    hasGeneratedTitleRef.current = true;
    setIsGeneratingTitle(true);
    
    try {
      // استخراج عنوان ذكي من الوصف
      const desc = description.trim();
      
      // محاولة استخدام AI للعنوان والتصنيف
      const response = await processCustomerRequest(desc);
      
      if (response.success && response.data?.final_review) {
        const review = response.data.final_review;
        
        // تعيين العنوان
        if (review.title) {
          setTitle(review.title);
          setShowTitle(true);
        } else {
          // Fallback: استخراج العنوان من أول جملة
          const firstSentence = desc.split(/[.،!؟\n]/)[0].trim();
          const generatedTitle = firstSentence.length > 50 
            ? firstSentence.slice(0, 47) + "..." 
            : firstSentence;
          setTitle(generatedTitle);
          setShowTitle(true);
        }
        
        // تعيين التصنيف إذا كان متوفراً
        if (review.system_category && review.system_category !== 'غير محدد') {
          setAdditionalFields((prev) =>
            prev.map((f) =>
              f.id === "category"
                ? { ...f, enabled: true, value: review.system_category }
                : f
            )
          );
          setShowAdditionalFields(true);
        }
      } else {
        // Fallback: استخراج العنوان محلياً
        const firstSentence = desc.split(/[.،!؟\n]/)[0].trim();
        const generatedTitle = firstSentence.length > 50 
          ? firstSentence.slice(0, 47) + "..." 
          : firstSentence;
        setTitle(generatedTitle);
        setShowTitle(true);
      }
    } catch (error) {
      console.error("Error generating title:", error);
      // Fallback: استخراج العنوان محلياً
      const desc = description.trim();
      const firstSentence = desc.split(/[.،!؟\n]/)[0].trim();
      const generatedTitle = firstSentence.length > 50 
        ? firstSentence.slice(0, 47) + "..." 
        : firstSentence;
      setTitle(generatedTitle);
      setShowTitle(true);
    } finally {
      setIsGeneratingTitle(false);
    }
  }, [description, isGeneratingTitle]);

  // إنشاء العنوان تلقائياً عند بدء كتابة الموقع (بعد اكتمال الوصف)
  useEffect(() => {
    // الشروط: الوصف موجود + بدأ كتابة الموقع + لم يتم إنشاء العنوان بعد
    if (
      description.trim().length >= 10 && 
      location.trim().length > 0 && 
      !hasGeneratedTitleRef.current &&
      !title.trim()
    ) {
      generateTitleFromDescription();
    }
    
    // إعادة تعيين الحالة إذا تم مسح الوصف
    if (description.trim().length === 0) {
      hasGeneratedTitleRef.current = false;
    }
  }, [description, location, title, generateTitleFromDescription]);

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
      
      const response = await processCustomerRequest(
        undefined,
        audioBlob,
        Object.keys(clarificationAnswers).length > 0 ? clarificationAnswers : undefined
      );

      if (response.success && response.data) {
        const data = response.data;
        setLanguageDetected(data.language_detected);
        
        // Update title from AI response
        if (data.final_review?.title) {
          setTitle(data.final_review.title);
          setShowTitle(true);
          addGlow("title");
        }
        
        // Update description with reformulated request if available
        if (data.final_review?.reformulated_request) {
          setDescription(data.final_review.reformulated_request);
          addGlow("description");
        }
        
        // Update location if available
        if (data.final_review?.location) {
          setLocation(data.final_review.location);
          addGlow("location");
        }

        if (data.clarification_needed && data.clarification_pages.length > 0) {
          updateVoiceStatus({ stage: 'done', message: 'يرجى الإجابة على بعض الأسئلة' });
          
          const pages: ClarificationPage[] = data.clarification_pages.map((page, index) => {
            const match = page.match(/(?:Page|صفحة)\s*(\d+)\/(\d+):\s*(.+)/i);
            return {
              pageNumber: match ? parseInt(match[1]) : index + 1,
              totalPages: match ? parseInt(match[2]) : data.total_pages,
              question: match ? match[3].trim() : page,
            };
          });
          
          setClarificationPages(pages);
          setCurrentClarificationPage(0);
          setShowFinalReview(false);
        } else {
          updateVoiceStatus({ stage: 'done', message: 'تم تجهيز طلبك!' });
          setFinalReview(data.final_review);
          setShowFinalReview(true);
          setClarificationPages([]);
        }
        
        hasAutoTriggeredRef.current = true;
      } else {
        updateVoiceStatus({ stage: 'error', message: response.error || 'فشل معالجة الطلب' });
      }
    } catch (error) {
      console.error("Voice processing error:", error);
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
      // Use Customer Service AI (supports Whisper API)
      const response = await processCustomerRequest(
        userMessage || undefined,
        audioBlob || undefined,
        Object.keys(clarificationAnswers).length > 0 ? clarificationAnswers : undefined
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'فشل معالجة الطلب');
      }

      const data = response.data;
      setLanguageDetected(data.language_detected);

      // Check if clarification is needed
      if (data.clarification_needed && data.clarification_pages.length > 0) {
        // Parse clarification pages
        const pages: ClarificationPage[] = data.clarification_pages.map((page, index) => {
          const match = page.match(/(?:Page|صفحة)\s*(\d+)\/(\d+):\s*(.+)/i);
          return {
            pageNumber: match ? parseInt(match[1]) : index + 1,
            totalPages: match ? parseInt(match[2]) : data.total_pages,
            question: match ? match[3].trim() : page,
          };
        });
        
        setClarificationPages(pages);
        setCurrentClarificationPage(0);
        setShowFinalReview(false);
        // Don't set showFinalReview here - wait for all clarifications
      } else {
        // No clarification needed - show final review screen
        setFinalReview(data.final_review);
        setShowFinalReview(true);
        setClarificationPages([]);
      }
    } catch (error) {
      console.error("Error processing message:", error);
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
    if (review.system_category && review.system_category !== 'غير محدد') {
      setAdditionalFields((prev) =>
        prev.map((f) =>
          f.id === "category"
            ? { ...f, enabled: true, value: review.system_category }
            : f
        )
      );
      setTimeout(() => addGlow("category"), 400);
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
        const response = await processCustomerRequest(
          userMessage,
          undefined,
          clarificationAnswers
        );

        if (response.success && response.data) {
          setFinalReview(response.data.final_review);
          setShowFinalReview(true);
          setClarificationPages([]);
          setCurrentClarificationPage(0);
          setClarificationAnswers({});
        }
      } catch (error) {
        console.error("Error reprocessing with answers:", error);
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

  // Handle publish
  const handlePublish = async (): Promise<string | null> => {
    // Extract budget values if budget field is enabled
    const budgetField = additionalFields.find((f) => f.id === "budget" && f.enabled);
    let budgetMin: string | undefined;
    let budgetMax: string | undefined;
    
    if (budgetField?.value) {
      // Handle budget in format "500-1000" or "1000-2000 ر.س" or single value
      const budgetValue = budgetField.value.replace(/[^\d-]/g, ''); // Remove non-numeric except dash
      if (budgetValue.includes('-')) {
        const [min, max] = budgetValue.split('-').map(v => v.trim());
        budgetMin = min;
        budgetMax = max;
      } else if (budgetValue) {
        // Single value - treat as min
        budgetMin = budgetValue;
      }
    }
    
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
      budgetMin,
      budgetMax,
      categories: additionalFields.find((f) => f.id === "category" && f.enabled)
        ? [additionalFields.find((f) => f.id === "category")!.value]
        : undefined,
      deliveryTimeFrom: additionalFields.find((f) => f.id === "deliveryTime" && f.enabled)?.value,
    };

    // تحديد ما إذا كان تعديل أو إنشاء جديد
    const isEditing = !!editingRequestId;
    console.log(isEditing ? "Updating request:" : "Publishing request:", request);
    console.log("editingRequestId:", editingRequestId);
    
    // تمرير معلومات التعديل إذا كنا في وضع التعديل
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
        title={title && title.trim() ? title : (editingRequestId ? "تعديل الطلب" : "إنشاء طلب جديد")}
        hideModeToggle
        isGuest={isGuest}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToSettings={onNavigateToSettings}
        hideProfileButton
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
                          ? "border-emerald-500 bg-card"
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
                        <span className={hasAnswer ? "text-emerald-500" : "text-muted-foreground"}>
                          <MessageSquare size={18} />
                        </span>
                        <span className={`text-sm font-medium ${hasAnswer ? "text-emerald-500" : "text-muted-foreground"}`}>
                          إجابتك
                          {hasAnswer && (
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="inline-flex items-center justify-center mr-1"
                            >
                              <Check size={14} className="text-emerald-500" />
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
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
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
                      try {
                        setIsSubmitting(true);
                        const requestId = await handlePublish();
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
                        console.error("Error submitting from final review:", error);
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
            {/* العنوان المُنشأ بالذكاء الاصطناعي */}
            {title.trim() && !isTitleEditable && (
              <motion.div
                key="ai-generated-title"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4"
              >
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Sparkles size={16} className="text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">عنوان الطلب</p>
                      <p className="text-sm font-bold text-foreground truncate">{title}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsTitleEditable(true)}
                    className="shrink-0 p-2 rounded-lg hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 transition-colors"
                  >
                    <FileText size={16} className="text-emerald-600" />
                  </button>
                </div>
              </motion.div>
            )}

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
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="اكتب عنواناً واضحاً لطلبك..."
                      className="flex-1 px-4 py-3 rounded-xl border-2 border-primary/50 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
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

            {/* حقل العنوان اليدوي - يظهر إذا AI غير متصل أو لم يُنشأ عنوان */}
            {!title.trim() && !isGeneratingTitle && showManualTitle && (
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
                    <FileText size={16} className="text-amber-500" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      عنوان الطلب (مطلوب)
                    </span>
                    {isAIConnected === false && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                        AI غير متصل
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="اكتب عنواناً واضحاً لطلبك..."
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none ${
                      titleShake 
                        ? "border-red-400 ring-2 ring-red-200 dark:ring-red-900/50" 
                        : needsManualTitle
                          ? "border-amber-300 dark:border-amber-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/50"
                          : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                  {!title.trim() && needsManualTitle && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1"
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
          {/* Description */}
          <GlowingField
            label="وصف الطلب"
            icon={<FileText size={18} />}
            value={description}
            onChange={setDescription}
            placeholder="صف طلبك بالتفصيل..."
            multiline
            isGlowing={glowingFields.has("description")}
            isRequired
            fieldRef={descriptionFieldRef}
          />

          {/* Location with Google Places Autocomplete */}
          <div ref={locationFieldRef}>
            <motion.div
              className={`relative rounded-2xl border-2 transition-all duration-300 ${
                location
                  ? "border-emerald-500 bg-card"
                  : glowingFields.has("location")
                  ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              {/* Label */}
              <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <span className={location ? "text-emerald-500" : glowingFields.has("location") ? "text-primary" : "text-muted-foreground"}>
                  <MapPin size={18} />
                </span>
                <span className={`text-sm font-medium ${location ? "text-emerald-500" : glowingFields.has("location") ? "text-primary" : "text-muted-foreground"}`}>
                  الموقع
                  <span className="text-red-500 mr-1">*</span>
                  {location && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex items-center justify-center mr-1"
                    >
                      <Check size={14} className="text-emerald-500" />
                    </motion.span>
                  )}
                </span>
              </div>
              {/* City Autocomplete Input */}
              <div className="px-4 pb-3">
                <CityAutocomplete
                  value={location}
                  onChange={(value: string, cityResult?: CityResult) => {
                    setLocation(value);
                    // يمكن استخدام cityResult للحصول على الإحداثيات
                    if (cityResult?.lat && cityResult?.lng) {
                      console.log('City coordinates:', cityResult.lat, cityResult.lng);
                    }
                  }}
                  placeholder="ابحث عن مدينة..."
                  showRemoteOption={true}
                  showGPSOption={true}
                  showMapOption={true}
                  onOpenMap={() => {
                    if (navigator.vibrate) navigator.vibrate(10);
                    // فتح Google Maps في نافذة جديدة
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=المملكة+العربية+السعودية`;
                    window.open(mapsUrl, '_blank');
                  }}
                  showAllCitiesOption={true}
                />
              </div>
            </motion.div>
          </div>

          {/* Attachments Field */}
          <motion.div
            className={`relative rounded-2xl border-2 transition-all duration-300 ${
              attachedFiles.length > 0 || selectedImageUrls.length > 0
                ? "border-emerald-500 bg-card"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            {/* Label */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              <span className={attachedFiles.length > 0 || selectedImageUrls.length > 0 ? "text-emerald-500" : "text-muted-foreground"}>
                <Paperclip size={18} />
              </span>
              <span className={`text-sm font-medium ${attachedFiles.length > 0 || selectedImageUrls.length > 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
                المرفقات وصور توضيحية
                {(attachedFiles.length > 0 || selectedImageUrls.length > 0) && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center justify-center mr-1"
                  >
                    <Check size={14} className="text-emerald-500" />
                  </motion.span>
                )}
              </span>
              {(attachedFiles.length > 0 || selectedImageUrls.length > 0) && (
                <span className="text-xs text-muted-foreground mr-auto">
                  {attachedFiles.length + selectedImageUrls.length} ملف
                </span>
              )}
            </div>

            {/* Attachment Area */}
            <div className="px-4 pt-2 pb-3">
              {/* Uploaded Files Preview */}
              {(attachedFiles.length > 0 || selectedImageUrls.length > 0) && (
                <div className="flex gap-2 flex-wrap mb-3">
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
                  {/* Selected Image URLs */}
                  {selectedImageUrls.map((url, index) => (
                    <motion.div
                      key={url + index}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative group"
                    >
                      <div 
                        className="w-20 h-20 rounded-xl overflow-hidden border border-indigo-300 bg-secondary cursor-pointer hover:border-indigo-400 transition-colors"
                        onClick={() => {
                          setPreviewAttachment({
                            type: 'url',
                            index,
                            url: url
                          });
                        }}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                      {/* Preview icon overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors rounded-xl cursor-pointer"
                        onClick={() => {
                          setPreviewAttachment({
                            type: 'url',
                            index,
                            url: url
                          });
                        }}
                      >
                        <ZoomIn size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageUrls(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-10"
                      >
                        <Trash2 size={12} />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-indigo-500/80 text-white text-[8px] text-center py-0.5 rounded-b-xl">
                        بحث
                      </div>
                    </motion.div>
                  ))}
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
                
                {/* Search Image Box */}
                <button
                  type="button"
                  onClick={() => handleImageSearch(false)}
                  className="flex-1 flex flex-col items-center justify-center h-24 bg-background border border-border rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                >
                  {isImageSearching && searchedImages.length === 0 ? (
                    <Loader2 size={28} className="animate-spin text-indigo-500" />
                  ) : (
                    <Search size={28} className="text-indigo-500 mb-2" />
                  )}
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    بحث صورة من الإنترنت
                  </span>
                </button>
              </div>

              {/* Image Search Results - Horizontal Scrollable */}
              {searchedImages.length > 0 && (
                <div className="mt-3 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      اختر الصور المناسبة ({selectedSearchImages.size} محددة)
                    </span>
                    <button
                      onClick={() => {
                        setSearchedImages([]);
                        setSelectedSearchImages(new Set());
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      إغلاق
                    </button>
                  </div>
                  
                  {/* Horizontal Scroll Container */}
                  <div className="relative">
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                      {searchedImages.map((imageUrl, index) => {
                        const isSelected = selectedSearchImages.has(imageUrl);
                        return (
                          <motion.div
                            key={imageUrl + index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => toggleImageSelection(imageUrl)}
                            className={`relative shrink-0 w-28 h-28 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                              isSelected 
                                ? 'border-primary ring-2 ring-primary/30 scale-[1.02]' 
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <img
                              src={imageUrl}
                              alt={`نتيجة ${index + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                // Remove broken image from results
                                setSearchedImages(prev => prev.filter(img => img !== imageUrl));
                              }}
                            />
                            <div className={`absolute inset-0 transition-colors ${
                              isSelected ? 'bg-primary/20' : 'hover:bg-black/10'
                            }`} />
                            <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'bg-primary text-white' 
                                : 'bg-white/80 border border-border'
                            }`}>
                              {isSelected && <Check size={14} strokeWidth={3} />}
                            </div>
                          </motion.div>
                        );
                      })}
                      
                      {/* Load More Button */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => !isImageSearching && handleImageSearch(true)}
                        className={`shrink-0 w-28 h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                          isImageSearching 
                            ? 'border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20' 
                            : 'border-border hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                        }`}
                      >
                        {isImageSearching ? (
                          <Loader2 size={24} className="animate-spin text-indigo-500" />
                        ) : (
                          <>
                            <RefreshCw size={20} className="text-indigo-500" />
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                              المزيد
                            </span>
                          </>
                        )}
                      </motion.div>
                    </div>
                  </div>
                  
                  {/* Add Selected Button */}
                  {selectedSearchImages.size > 0 && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={addSelectedImagesToAttachments}
                      className="w-full py-2.5 rounded-xl bg-primary text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                    >
                      <Check size={16} />
                      إضافة {selectedSearchImages.size} صورة للمرفقات
                    </motion.button>
                  )}
                </div>
              )}
            </div>

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
          </motion.div>
          
        </div>

        {/* Additional Fields Section - Only show when AI suggests them */}
        <AnimatePresence>
          {showAdditionalFields && (
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-muted-foreground">تفاصيل إضافية</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnimatePresence mode="popLayout">
                  {additionalFields.filter(f => f.enabled).map((field) => (
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
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-4 px-4">
        {/* زر أرسل الطلب الآن */}
        <motion.button
          layout
          onClick={async () => {
            if (!canSubmit) return;
            
            if (navigator.vibrate) navigator.vibrate(15);
            setIsSubmitting(true);
            
            try {
              const requestId = await handlePublish();
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
              console.error("Error submitting:", error);
            } finally {
              setIsSubmitting(false);
            }
          }}
          disabled={!canSubmit || isSubmitting}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all shadow-lg ${
            canSubmit && !isSubmitting
              ? 'bg-primary text-white hover:bg-primary/90 shadow-primary/30'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none'
          }`}
        >
          {isSubmitting ? (
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
      </div>

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
                        } else {
                          setSelectedImageUrls(prev => prev.filter((_, i) => i !== previewAttachment.index));
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

      {/* Floating AI Input is now handled by GlobalFloatingOrb in App.tsx */}
    </motion.div>
  );
};

export default CreateRequestV2;

