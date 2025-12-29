import React, { useState, useRef, useEffect, useCallback } from "react";
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
  User,
  Wrench,
  Calendar,
  Image,
  Paperclip,
} from "lucide-react";
import { UnifiedHeader } from "./ui/UnifiedHeader";
import { Request } from "../types";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
let genAI: GoogleGenerativeAI | null = null;

const getAIClient = () => {
  if (!genAI && API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
  }
  return genAI;
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
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash-001" });
    
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
    
    const prompt = `أنت مساعد ذكي في منصة "أبيلي" لطلب الخدمات. تفهم اللهجة السعودية والعربية الفصحى.${audioBlob ? '\n\n(تم إرسال رسالة صوتية - استمع إليها بعناية)' : ''}

## تنبيه مهم: ${isFirstInteraction ? 'هذه أول رسالة من العميل' : 'هذه رسالة متابعة (لا تكرر الترحيب!)'}

## مهم جداً - قواعد الفهم:
1. لا تفترض أي شيء! إذا كانت الرسالة غير واضحة، اسأل للتوضيح
2. افهم السياق الكامل قبل استخراج أي معلومات
3. "أبي/أبغى/أريد" = يريد خدمة، ليس معلومات تقنية
4. لا تنشئ حقول مخصصة إلا إذا ذكر العميل تفاصيل تقنية واضحة
5. ركز على فهم: ماذا يريد؟ أين؟ متى؟ بكم؟

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

    // Build content parts
    const parts: any[] = [{ text: prompt }];
    
    // Add audio if provided
    if (audioBlob) {
      try {
        const audioBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });
        
        parts.push({
          inlineData: {
            data: audioBase64,
            mimeType: audioBlob.type || 'audio/webm',
          },
        });
      } catch (err) {
        console.error('Error processing audio:', err);
      }
    }

    const result = await model.generateContent(parts);
    const response = result.response.text();
    
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
  onPublish: (request: Partial<Request>) => void;
  // Header props
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  mode: 'requests' | 'offers';
  toggleMode: () => void;
  isModeSwitching: boolean;
  unreadCount: number;
  user: any;
  titleKey: number;
  notifications: any[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onSignOut: () => void;
  isGuest?: boolean;
  // AI Orb props - shared with GlobalFloatingOrb
  aiInput: string;
  setAiInput: (value: string) => void;
  aiMessages: AIMessage[];
  setAiMessages: React.Dispatch<React.SetStateAction<AIMessage[]>>;
  isAiLoading: boolean;
  setIsAiLoading: (loading: boolean) => void;
  // Ref to register handleSend for GlobalFloatingOrb
  aiSendHandlerRef?: React.MutableRefObject<((audioBlob?: Blob) => Promise<void>) | null>;
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
        <div
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          className={`absolute bottom-0 left-0 right-0 h-6 flex items-center justify-center cursor-ns-resize select-none rounded-b-2xl transition-colors ${isResizing ? 'bg-primary/10' : 'hover:bg-primary/5'}`}
          style={{ touchAction: 'none' }}
        >
          <div className="flex flex-col gap-0.5 pointer-events-none">
            <div className="w-10 h-0.5 rounded-full bg-primary" />
            <div className="w-10 h-0.5 rounded-full bg-primary" />
          </div>
        </div>
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
  isSidebarOpen,
  setIsSidebarOpen,
  mode,
  toggleMode,
  isModeSwitching,
  unreadCount,
  user,
  titleKey,
  notifications,
  onMarkAsRead,
  onClearAll,
  onSignOut,
  isGuest,
  // AI Orb props
  aiInput,
  setAiInput,
  aiMessages,
  setAiMessages,
  isAiLoading,
  setIsAiLoading,
  aiSendHandlerRef,
}) => {
  // Core fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Additional fields
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

  // Handle back - immediate navigation
  const handleBack = useCallback(() => {
    onBack();
  }, [onBack]);

  // Glowing states
  const [glowingFields, setGlowingFields] = useState<Set<string>>(new Set());
  const [showTitle, setShowTitle] = useState(false);

  // Check if can submit
  const canSubmit = !!(description.trim() && location.trim());
  
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
  
  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Success notification state
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

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

  // Handle AI input send
  const handleSend = async (audioBlob?: Blob) => {
    // Allow sending with just audio or just text
    if (!aiInput.trim() && !audioBlob) return;
    if (isAiLoading) return;

    const userMessage = aiInput.trim();
    setAiInput("");
    setIsAiLoading(true);

    // Don't show user messages - only show AI analyzing indicator
    // The loading state will show the analyzing animation

    try {
      // Extract info using AI (with optional audio)
      const extracted = await extractInfoFromMessage(
        userMessage || "رسالة صوتية",
        {
          description,
          location,
          additionalFields,
        },
        audioBlob
      );

      // Apply extracted data with animations
      
      // Description - replace with rephrased version
      if (extracted.description && extracted.description.length > 5) {
        setDescription(extracted.description);
        addGlow("description");
      }

      // Location
      if (extracted.location && extracted.location.length > 0) {
        setLocation(extracted.location);
        addGlow("location");
      }
      
      // Mark that AI has suggested fields (only if they have actual values)
      const hasNewFields = 
        (extracted.budget && extracted.budget.length > 0) || 
        (extracted.deliveryTime && extracted.deliveryTime.length > 0) || 
        (extracted.category && extracted.category.length > 0) || 
        (extracted.customFields && extracted.customFields.length > 0 && extracted.customFields[0]?.value);
      
      if (hasNewFields) {
        setShowAdditionalFields(true);
      }

      // Title - always update if extracted
      if (extracted.title && extracted.title.length > 0) {
        setTimeout(() => {
          setTitle(extracted.title!);
          setShowTitle(true);
        }, 300);
      }
      
      // Note: Floating orb collapse is handled by GlobalFloatingOrb

      // Budget
      if (extracted.budget) {
        setAdditionalFields((prev) =>
          prev.map((f) =>
            f.id === "budget"
              ? { ...f, enabled: true, value: extracted.budget! }
              : f
          )
        );
        setTimeout(() => addGlow("budget"), 200);
      }

      // Delivery Time
      if (extracted.deliveryTime) {
        setAdditionalFields((prev) =>
          prev.map((f) =>
            f.id === "deliveryTime"
              ? { ...f, enabled: true, value: extracted.deliveryTime! }
              : f
          )
        );
        setTimeout(() => addGlow("deliveryTime"), 400);
      }

      // Category
      if (extracted.category) {
        setAdditionalFields((prev) =>
          prev.map((f) =>
            f.id === "category"
              ? { ...f, enabled: true, value: extracted.category! }
              : f
          )
        );
        setTimeout(() => addGlow("category"), 600);
      }

      // Custom Fields - only add if they're meaningful and specific
      if (extracted.customFields && extracted.customFields.length > 0) {
        extracted.customFields.forEach((cf, index) => {
          // Validate: must have both name and value, and value must be specific (not generic)
          const isValidName = cf.name && cf.name.length >= 2 && cf.name.length <= 30;
          const isValidValue = cf.value && cf.value.length >= 1 && cf.value.length <= 100;
          // Skip generic/vague field names
          const genericNames = ['نوع', 'تفاصيل', 'معلومات', 'بيانات', 'حقل', 'اسم'];
          const isGenericName = genericNames.some(g => cf.name?.includes(g));
          
          if (isValidName && isValidValue && !isGenericName) {
            const newField: AdditionalField = {
              id: `custom_${Date.now()}_${index}`,
              name: cf.name,
              value: cf.value,
              icon: <Tag size={16} />,
              enabled: true,
              isCustom: true,
            };
            setAdditionalFields((prev) => [...prev, newField]);
            setTimeout(() => addGlow(newField.id), 800 + index * 200);
          }
        });
      }

      // Add AI follow-up question - never auto-submit!
      const followUp = extracted.followUpQuestion || getDefaultFollowUp(
        extracted.description || description, 
        extracted.location || location
      );
      if (followUp) {
        setAiMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text: followUp,
            timestamp: new Date(),
          },
        ]);
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

  // Handle publish
  const handlePublish = () => {
    const request: Partial<Request> = {
      title: title || description.slice(0, 50),
      description,
      location,
      budgetMin: additionalFields.find((f) => f.id === "budget" && f.enabled)?.value,
      categories: additionalFields.find((f) => f.id === "category" && f.enabled)
        ? [additionalFields.find((f) => f.id === "category")!.value]
        : undefined,
      deliveryTimeFrom: additionalFields.find((f) => f.id === "deliveryTime" && f.enabled)?.value,
    };
    
    onPublish(request);
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
        message="تم إرسال طلبك بنجاح!"
        subMessage="انتظر العروض قريباً"
      />
      
      {/* Header */}
      <UnifiedHeader
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        mode={mode}
        toggleMode={toggleMode}
        isModeSwitching={isModeSwitching}
        unreadCount={unreadCount}
        user={user}
        titleKey={titleKey}
        notifications={notifications}
        onMarkAsRead={onMarkAsRead}
        onClearAll={onClearAll}
        onSignOut={onSignOut}
        backButton
        closeIcon
        onBack={handleBack}
        title="إنشاء طلب جديد"
        hideModeToggle
        isGuest={isGuest}
        showSubmitButton
        canSubmit={canSubmit}
        onSubmit={() => {
          if (canSubmit) {
            setShowCelebration(true);
            setTimeout(() => {
              handlePublish();
              setShowCelebration(false);
            }, 1000);
          }
        }}
        justBecameReady={justBecameReady}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24">
        {/* Dynamic Title */}
        <AnimatePresence>
          {showTitle && title && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-primary" />
                <span className="text-xs text-muted-foreground">عنوان الطلب</span>
              </div>
              <h2 className="text-xl font-bold text-foreground">
                <TypewriterText text={title} speed={40} />
              </h2>
            </motion.div>
          )}
        </AnimatePresence>

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

          {/* Location with Map Button */}
          <GlowingField
            label="الموقع"
            icon={<MapPin size={18} />}
            value={location}
            onChange={setLocation}
            placeholder="المدينة، الحي، أو 'عن بعد'"
            isGlowing={glowingFields.has("location")}
            isRequired
            fieldRef={locationFieldRef}
            rightElement={
              <button
                className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                onClick={() => {
                  // TODO: Open map picker
                  alert("فتح الخريطة");
                }}
              >
                <Map size={18} />
              </button>
            }
          />

          {/* Attachments Field */}
          <motion.div
            className={`relative rounded-2xl border-2 transition-all duration-300 ${
              attachedFiles.length > 0
                ? "border-emerald-500 bg-card"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            {/* Label */}
            <div 
              className="flex items-center gap-2 px-4 pt-3 pb-1 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className={attachedFiles.length > 0 ? "text-emerald-500" : "text-muted-foreground"}>
                <Paperclip size={18} />
              </span>
              <span className={`text-sm font-medium ${attachedFiles.length > 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
                المرفقات
                {attachedFiles.length > 0 && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center justify-center mr-1"
                  >
                    <Check size={14} className="text-emerald-500" />
                  </motion.span>
                )}
              </span>
              {attachedFiles.length > 0 && (
                <span className="text-xs text-muted-foreground mr-auto">
                  {attachedFiles.length} ملف
                </span>
              )}
            </div>

            {/* Attachment Area */}
            <div className="px-4 pb-3">
              {attachedFiles.length === 0 ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center gap-2 text-muted-foreground"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Image size={20} className="text-primary" />
                  </div>
                  <span className="text-sm">اضغط لإضافة صور أو ملفات</span>
                </button>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {attachedFiles.map((file, index) => {
                    const isImage = file.type.startsWith("image/");
                    const fileUrl = URL.createObjectURL(file);
                    return (
                      <motion.div
                        key={file.name + index}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="relative group"
                      >
                        <div className="w-20 h-20 rounded-xl overflow-hidden border border-border bg-secondary">
                          {isImage ? (
                            <img
                              src={fileUrl}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText size={24} className="text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </motion.div>
                    );
                  })}
                  {/* Add More Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Plus size={24} />
                  </button>
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


      {/* Floating AI Input is now handled by GlobalFloatingOrb in App.tsx */}
    </motion.div>
  );
};

export default CreateRequestV2;

