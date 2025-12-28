import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle,
  Clock,
  DollarSign,
  Edit3,
  MapPin,
  Mic,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
  Zap,
} from "lucide-react";
import { Button } from "./ui/Button";
import { ChatMessageSkeleton } from "./ui/LoadingSkeleton";
import { Request } from "../types";
import { createRequestFromChat } from "../services/requestsService";
import { supabase } from "../services/supabaseClient";
import { generateDraftWithCta } from "../services/aiService";

// ============================================
// Types
// ============================================

type AttachmentPreview = { name: string; url: string };

// Custom Field - الحقول الديناميكية المولّدة من الذكاء
interface CustomField {
  id: string;
  label: string;
  value: string;
  type: "text" | "number" | "location" | "date" | "select";
  isRequired?: boolean;
  placeholder?: string;
  options?: string[]; // for select type
}

// Draft Data with Custom Fields
interface DraftData {
  title: string;
  description: string;
  location: string;
  customFields: CustomField[];
  categories: string[];
  budgetMin?: string;
  budgetMax?: string;
  deliveryTime?: string;
  isLocationValid: boolean;
  isDescriptionValid: boolean;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  attachments?: AttachmentPreview[];
  audioUrl?: string | null;
}

// ============================================
// Helper Components
// ============================================

// Floating Input Component
const FloatingInput = ({
  label,
  value,
  onChange,
  onDelete,
  type = "text",
  placeholder = "",
  isRequired = false,
  showDelete = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onDelete?: () => void;
  type?: string;
  placeholder?: string;
  isRequired?: boolean;
  showDelete?: boolean;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== "";

  return (
    <div className="relative group">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={isFocused ? placeholder : ""}
        className={`peer w-full h-12 rounded-xl border-2 bg-background px-4 pt-4 text-sm outline-none transition-all text-right ${
          isFocused || hasValue ? "border-primary" : "border-border"
        }`}
      />
      <label
        className={`pointer-events-none absolute right-4 transition-all duration-200 flex items-center gap-1 ${
          isFocused || hasValue
            ? "-top-2.5 right-3 bg-background px-1 text-[10px] text-primary font-bold"
            : "top-3.5 text-xs text-muted-foreground"
        }`}
      >
        {label}
        {isRequired && <span className="text-red-500">*</span>}
      </label>
      
      {/* Delete Button */}
      {showDelete && onDelete && (
        <button
          onClick={onDelete}
          className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-100 text-red-500"
          title="حذف هذا الحقل"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};

// Floating Textarea Component
const FloatingTextarea = ({
  label,
  value,
  onChange,
  rows = 3,
  isRequired = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  isRequired?: boolean;
  placeholder?: string;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== "";

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        rows={rows}
        placeholder={isFocused ? placeholder : ""}
        className={`peer w-full rounded-xl border-2 bg-background px-4 pt-5 pb-3 text-sm outline-none transition-all resize-none text-right ${
          isFocused || hasValue ? "border-primary" : "border-border"
        }`}
      />
      <label
        className={`pointer-events-none absolute right-4 transition-all duration-200 flex items-center gap-1 ${
          isFocused || hasValue
            ? "-top-2.5 right-3 bg-background px-1 text-[10px] text-primary font-bold"
            : "top-3 text-xs text-muted-foreground"
        }`}
      >
        {label}
        {isRequired && <span className="text-red-500">*</span>}
      </label>
    </div>
  );
};

// ============================================
// Welcome Screen Component
// ============================================

const WelcomeScreen = ({
  onSubmit,
  isLoading,
}: {
  onSubmit: (text: string, files: File[], audioBlob: Blob | null) => void;
  isLoading: boolean;
}) => {
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const placeholders = [
    "اكتب طلبك هنا... مثال: أبي مصمم شعار لمشروعي",
    "أحتاج فني صيانة مكيفات في الرياض",
    "أبي مبرمج تطبيق جوال بميزانية 5000 ريال",
    "خدمة توصيل من العليا للنرجس",
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleFilePick = () => fileInputRef.current?.click();

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setAttachedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeFile = (name: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const toggleRecording = async () => {
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      alert("التسجيل الصوتي غير مدعوم في هذا المتصفح");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: "audio/webm" });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
  };

  const handleSubmit = () => {
    if (!input.trim() && attachedFiles.length === 0 && !audioBlob) return;
    onSubmit(input.trim(), attachedFiles, audioBlob);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-[500px]">
      {/* Logo/Brand */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/20">
          <Zap size={36} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-foreground mb-2">
          وش تبي اليوم؟
        </h1>
        <p className="text-muted-foreground text-sm max-w-md">
          اكتب طلبك بالتفصيل أو سجّل صوتياً، والذكاء الاصطناعي يجهّز لك كل شيء
        </p>
      </div>

      {/* Main Input Area */}
      <div className="w-full max-w-2xl">
        <div className="bg-card border-2 border-border rounded-2xl shadow-xl overflow-hidden transition-all focus-within:border-primary focus-within:shadow-2xl focus-within:shadow-primary/10">
          {/* Textarea */}
          <div className="p-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholders[placeholderIndex]}
              rows={4}
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none text-base leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          {/* Attachments Preview */}
          {(attachedFiles.length > 0 || audioUrl) && (
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {attachedFiles.map((file) => {
                const isImage = file.type.startsWith("image/");
                return (
                  <div
                    key={file.name}
                    className="relative group w-14 h-14 bg-secondary rounded-xl overflow-hidden border border-border"
                  >
                    {isImage ? (
                      <img
                        src={URL.createObjectURL(file)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-muted-foreground p-1 text-center">
                        {file.name.split(".").pop()?.toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(file.name)}
                      className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
              {audioUrl && (
                <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2 border border-border">
                  <Mic size={14} className="text-primary" />
                  <span className="text-xs">تسجيل صوتي</span>
                  <button
                    onClick={() => {
                      setAudioUrl(null);
                      setAudioBlob(null);
                    }}
                    className="text-red-500 hover:bg-red-100 rounded p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
                accept="image/*,video/*,audio/*,.pdf"
              />
              <button
                onClick={handleFilePick}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-background transition-colors"
                title="إرفاق ملفات"
              >
                <Paperclip size={18} />
              </button>
              <button
                onClick={toggleRecording}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                  isRecording
                    ? "bg-red-500 text-white animate-pulse"
                    : "text-muted-foreground hover:text-primary hover:bg-background"
                }`}
                title="تسجيل صوتي"
              >
                <Mic size={18} />
              </button>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isLoading || (!input.trim() && attachedFiles.length === 0 && !audioBlob)}
              className="h-10 px-6 gap-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري التحليل...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  أنشئ طلبي
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="mt-4 p-4 bg-red-500/90 backdrop-blur-md rounded-xl text-white flex items-center justify-between shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex gap-1 items-end h-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="w-1 bg-white rounded-full animate-bounce"
                    style={{
                      height: `${Math.random() * 100}%`,
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                ))}
              </div>
              <span className="text-sm font-bold">جاري الاستماع إليك...</span>
            </div>
            <button
              onClick={toggleRecording}
              className="bg-white text-red-600 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-white/90"
            >
              إيقاف
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// Dynamic Request Card Component
// ============================================

const DynamicRequestCard = ({
  draft,
  onUpdate,
  onPublish,
  isPublishing,
}: {
  draft: DraftData;
  onUpdate: (field: keyof DraftData | string, value: any) => void;
  onPublish: () => void;
  isPublishing: boolean;
}) => {
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");

  // Check if can publish
  const canPublish = draft.isDescriptionValid && draft.isLocationValid;

  // Add custom field
  const addCustomField = () => {
    if (!newFieldLabel.trim()) return;
    const newField: CustomField = {
      id: Date.now().toString(),
      label: newFieldLabel.trim(),
      value: "",
      type: "text",
    };
    onUpdate("customFields", [...draft.customFields, newField]);
    setNewFieldLabel("");
    setShowAddField(false);
  };

  // Delete custom field
  const deleteCustomField = (fieldId: string) => {
    onUpdate(
      "customFields",
      draft.customFields.filter((f) => f.id !== fieldId)
    );
  };

  // Update custom field value
  const updateCustomFieldValue = (fieldId: string, value: string) => {
    onUpdate(
      "customFields",
      draft.customFields.map((f) =>
        f.id === fieldId ? { ...f, value } : f
      )
    );
  };

  return (
    <div className="bg-card rounded-2xl border-2 border-border shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">مسودة طلبك</h3>
            <p className="text-xs text-muted-foreground">عدّل أي حقل ثم اضغط إرسال</p>
          </div>
        </div>
        
        {/* Validation Status */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            draft.isDescriptionValid 
              ? "bg-green-100 text-green-700" 
              : "bg-amber-100 text-amber-700"
          }`}>
            {draft.isDescriptionValid ? <Check size={12} /> : <AlertTriangle size={12} />}
            الوصف
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            draft.isLocationValid 
              ? "bg-green-100 text-green-700" 
              : "bg-amber-100 text-amber-700"
          }`}>
            {draft.isLocationValid ? <Check size={12} /> : <AlertTriangle size={12} />}
            الموقع
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Core Fields */}
        <FloatingInput
          label="عنوان الطلب"
          value={draft.title}
          onChange={(v) => onUpdate("title", v)}
          isRequired
          placeholder="عنوان واضح ومختصر"
        />

        <FloatingTextarea
          label="وصف الطلب"
          value={draft.description}
          onChange={(v) => onUpdate("description", v)}
          isRequired
          placeholder="اشرح طلبك بالتفصيل..."
          rows={3}
        />

        <FloatingInput
          label="الموقع / المدينة"
          value={draft.location}
          onChange={(v) => onUpdate("location", v)}
          isRequired
          placeholder="الرياض، جدة، عن بعد..."
        />

        {/* Dynamic Custom Fields */}
        {draft.customFields.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              <span>تفاصيل إضافية</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            
            {draft.customFields.map((field) => (
              <FloatingInput
                key={field.id}
                label={field.label}
                value={field.value}
                onChange={(v) => updateCustomFieldValue(field.id, v)}
                onDelete={() => deleteCustomField(field.id)}
                showDelete
                placeholder={field.placeholder}
              />
            ))}
          </div>
        )}

        {/* Add Field Button */}
        {showAddField ? (
          <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-xl border border-dashed border-border">
            <input
              type="text"
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              placeholder="اسم الحقل الجديد..."
              className="flex-1 bg-transparent text-sm outline-none text-right"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") addCustomField();
                if (e.key === "Escape") setShowAddField(false);
              }}
            />
            <button
              onClick={addCustomField}
              disabled={!newFieldLabel.trim()}
              className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-50"
            >
              إضافة
            </button>
            <button
              onClick={() => setShowAddField(false)}
              className="p-1.5 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddField(true)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus size={16} />
            <span className="text-sm">إضافة حقل مخصص</span>
          </button>
        )}
      </div>

      {/* Footer - Publish Button */}
      <div className="p-4 bg-secondary/20 border-t border-border">
        <Button
          onClick={onPublish}
          disabled={!canPublish || isPublishing}
          className={`w-full h-12 font-bold text-base rounded-xl shadow-lg transition-all ${
            canPublish
              ? "bg-gradient-to-l from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {isPublishing ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin ml-2" />
              جاري الإرسال...
            </>
          ) : canPublish ? (
            <>
              <Send size={18} className="-rotate-90 ml-2" />
              🚀 نشر الطلب
            </>
          ) : (
            <>
              <AlertTriangle size={18} className="ml-2" />
              أكمل الحقول المطلوبة
            </>
          )}
        </Button>
        
        {!canPublish && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            {!draft.isDescriptionValid && !draft.isLocationValid
              ? "يجب إضافة وصف واضح وتحديد الموقع"
              : !draft.isDescriptionValid
              ? "يجب إضافة وصف واضح للطلب"
              : "يجب تحديد الموقع أو كتابة 'عن بعد'"}
          </p>
        )}
      </div>
    </div>
  );
};

// ============================================
// Chat Panel Component (للتعديل عبر الدردشة)
// ============================================

const ChatPanel = ({
  messages,
  onSend,
  isLoading,
}: {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isLoading: boolean;
}) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-secondary/20 flex items-center gap-2">
        <Bot size={18} className="text-primary" />
        <span className="text-sm font-bold">المساعد الذكي</span>
        <span className="text-xs text-muted-foreground mr-auto">اطلب أي تعديل</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[300px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-tl-none"
                  : "bg-secondary text-foreground rounded-tr-none"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <ChatMessageSkeleton />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-background">
        <div className="flex items-center gap-2 bg-secondary/30 rounded-xl p-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب تعديلك هنا..."
            className="flex-1 bg-transparent text-sm outline-none text-right px-2"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              input.trim()
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Send size={16} className="-rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Main ChatArea Component
// ============================================

interface ChatAreaProps {
  onRequestPublished?: () => void;
  userId?: string;
  savedMessages?: ChatMessage[];
  onMessagesChange?: (messages: ChatMessage[]) => void;
  savedScrollPosition?: number;
  onScrollPositionChange?: (pos: number) => void;
  aiStatus?: { connected: boolean; error?: string };
  isGuest?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  onRequestPublished,
  userId,
  savedMessages = [],
  onMessagesChange,
  savedScrollPosition = 0,
  onScrollPositionChange,
  aiStatus,
  isGuest = false,
}) => {
  const [stage, setStage] = useState<"welcome" | "editing">("welcome");
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(savedMessages || []);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Draft State
  const [draft, setDraft] = useState<DraftData>({
    title: "",
    description: "",
    location: "",
    customFields: [],
    categories: [],
    budgetMin: "",
    budgetMax: "",
    deliveryTime: "",
    isLocationValid: false,
    isDescriptionValid: false,
  });

  // Notify parent when messages change
  useEffect(() => {
    if (messages.length > 0) {
      onMessagesChange?.(messages);
    }
  }, [messages, onMessagesChange]);

  // Restore scroll position
  useEffect(() => {
    if (savedScrollPosition > 0 && scrollContainerRef.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = savedScrollPosition;
        }
      });
    }
  }, [savedScrollPosition]);

  // Save scroll position
  const handleScroll = () => {
    if (scrollContainerRef.current && onScrollPositionChange) {
      onScrollPositionChange(scrollContainerRef.current.scrollTop);
    }
  };

  // Validation Logic
  useEffect(() => {
    const descriptionValid = draft.description.trim().length >= 10;
    const locationKeywords = ["عن بعد", "اونلاين", "اي مكان", "أي مكان", "online", "remote"];
    const locationValid =
      draft.location.trim().length >= 2 ||
      locationKeywords.some((k) => draft.description.toLowerCase().includes(k));

    setDraft((prev) => ({
      ...prev,
      isDescriptionValid: descriptionValid,
      isLocationValid: locationValid,
    }));
  }, [draft.description, draft.location]);

  // Handle Initial Submit (من شاشة الترحيب)
  const handleInitialSubmit = async (
    text: string,
    files: File[],
    audioBlob: Blob | null
  ) => {
    setIsLoading(true);

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: text || "مرفقات بدون نص",
      attachments: files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
      audioUrl: audioBlob ? URL.createObjectURL(audioBlob) : null,
    };
    setMessages([userMsg]);

    try {
      const aiDraft = await generateDraftWithCta(text, files, audioBlob || undefined);

      // If clarification needed
      if (aiDraft.isClarification) {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text: aiDraft.aiResponse,
        };
        setMessages((prev) => [...prev, aiMsg]);
        setStage("editing");
        setIsLoading(false);
        return;
      }

      // Parse custom fields from AI response
      let customFields: CustomField[] = [];
      
      // Add budget as custom field if exists and not already in customFields
      if ((aiDraft.budgetMin || aiDraft.budgetMax) && !customFields.some(f => f.label.includes("ميزانية"))) {
        customFields.push({
          id: "budget",
          label: "الميزانية",
          value: aiDraft.budgetMin && aiDraft.budgetMax
            ? `${aiDraft.budgetMin} - ${aiDraft.budgetMax} ريال`
            : aiDraft.budgetMin || aiDraft.budgetMax || "",
          type: "text",
        });
      }

      // Add delivery time as custom field if exists and not already in customFields
      if (aiDraft.deliveryTime && !customFields.some(f => f.label.includes("مدة") || f.label.includes("وقت"))) {
        customFields.push({
          id: "deliveryTime",
          label: "مدة التنفيذ",
          value: aiDraft.deliveryTime,
          type: "text",
        });
      }

      // Set draft data
      setDraft({
        title: aiDraft.title || "طلب جديد",
        description: aiDraft.description || aiDraft.summary || text,
        location: aiDraft.location || "",
        customFields,
        categories: aiDraft.categories || [],
        budgetMin: aiDraft.budgetMin,
        budgetMax: aiDraft.budgetMax,
        deliveryTime: aiDraft.deliveryTime,
        isDescriptionValid: (aiDraft.description || text).length >= 10,
        isLocationValid: !!aiDraft.location,
      });

      // Add AI response
      if (aiDraft.aiResponseBefore || aiDraft.aiResponse) {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text: aiDraft.aiResponseBefore || aiDraft.aiResponse || "تم إنشاء مسودة طلبك!",
        };
        setMessages((prev) => [...prev, aiMsg]);
      }

      setStage("editing");
    } catch (error) {
      console.error("Error generating draft:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: "عذراً، حدث خطأ أثناء تحليل طلبك. حاول مرة أخرى.",
      };
      setMessages((prev) => [...prev, errorMsg]);
      setStage("editing");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Chat Message (للتعديل)
  const handleChatMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Send modification request to AI
      const modificationPrompt = `
        الطلب الحالي:
        العنوان: ${draft.title}
        الوصف: ${draft.description}
        الموقع: ${draft.location}
        
        طلب التعديل من المستخدم: "${text}"
        
        قم بتعديل الطلب بناءً على طلب المستخدم وأرجع JSON فقط بالشكل التالي:
        {
          "title": "العنوان المعدل",
          "description": "الوصف المعدل",
          "location": "الموقع",
          "aiResponse": "ردك للمستخدم"
        }
      `;

      const result = await generateDraftWithCta(modificationPrompt);

      // Update draft
      if (result.title) setDraft((prev) => ({ ...prev, title: result.title || prev.title }));
      if (result.description) setDraft((prev) => ({ ...prev, description: result.description || prev.description }));
      if (result.location) setDraft((prev) => ({ ...prev, location: result.location || prev.location }));

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: result.aiResponse || "تم التعديل!",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("Error processing modification:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: "عذراً، لم أتمكن من فهم التعديل. حاول مرة أخرى.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Draft Update
  const handleDraftUpdate = (field: keyof DraftData | string, value: any) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  // Handle Publish
  const handlePublish = async () => {
    setIsPublishing(true);

    try {
      // Use userId from props, or get from auth if not provided
      let currentUserId = userId;
      if (!currentUserId && !isGuest) {
        const { data: userData } = await supabase.auth.getUser();
        currentUserId = userData?.user?.id ?? null;
      }

      // Prepare custom fields as JSON in description
      let enrichedDescription = draft.description;
      if (draft.customFields.length > 0) {
        const fieldsText = draft.customFields
          .filter((f) => f.value)
          .map((f) => `${f.label}: ${f.value}`)
          .join("\n");
        if (fieldsText) {
          enrichedDescription += `\n\n---\nتفاصيل إضافية:\n${fieldsText}`;
        }
      }

      const result = await createRequestFromChat(
        currentUserId ?? null,
        {
          title: draft.title,
          description: enrichedDescription,
          location: draft.location,
          categories: draft.categories,
          budgetMin: draft.budgetMin,
          budgetMax: draft.budgetMax,
          deliveryTime: draft.deliveryTime,
        },
        {
          title: draft.title,
          description: enrichedDescription,
          location: draft.location,
          budget_min: draft.budgetMin,
          budget_max: draft.budgetMax,
          delivery_from: draft.deliveryTime,
          seriousness: 2,
        }
      );

      setPublishSuccess(result?.id || "success");

      // Add success message
      const successMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "ai",
        text: `🎉 تم نشر طلبك بنجاح! رقم الطلب: ${result?.id || ""}`,
      };
      setMessages((prev) => [...prev, successMsg]);

      // Notify parent component
      onRequestPublished?.();
    } catch (error) {
      console.error("Error publishing:", error);
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "ai",
        text: "عذراً، حدث خطأ أثناء نشر الطلب. حاول مرة أخرى.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsPublishing(false);
    }
  };

  // Reset to new request
  const handleReset = () => {
    setStage("welcome");
    setMessages([]);
    setDraft({
      title: "",
      description: "",
      location: "",
      customFields: [],
      categories: [],
      budgetMin: "",
      budgetMax: "",
      deliveryTime: "",
      isDescriptionValid: false,
      isLocationValid: false,
    });
    setPublishSuccess(null);
    setShowResetDialog(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-background to-secondary/10 relative min-h-0 rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap size={16} className="text-primary" />
          </div>
          <h2 className="font-bold text-primary text-base">
            {stage === "welcome" ? "طلب جديد" : "تعديل المسودة"}
          </h2>
        </div>

        {stage === "editing" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowResetDialog(true)}
            className="h-8 text-xs gap-1.5 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          >
            <Plus size={14} />
            طلب جديد
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0"
        onScroll={handleScroll}
      >
        {stage === "welcome" ? (
          <WelcomeScreen onSubmit={handleInitialSubmit} isLoading={isLoading} />
        ) : (
          <div className="p-4 space-y-4">
            {/* Success Banner */}
            {publishSuccess && (
              <div className="bg-green-100 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-green-800">تم نشر طلبك بنجاح! 🎉</p>
                  <p className="text-sm text-green-600">سيتواصل معك مقدمو الخدمات قريباً</p>
                </div>
                <Button
                  size="sm"
                  onClick={handleReset}
                  className="mr-auto bg-green-600 hover:bg-green-700 text-white"
                >
                  طلب جديد
                </Button>
              </div>
            )}

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Request Card - Takes 3 columns */}
              <div className="lg:col-span-3">
                <DynamicRequestCard
                  draft={draft}
                  onUpdate={handleDraftUpdate}
                  onPublish={handlePublish}
                  isPublishing={isPublishing}
                />
              </div>

              {/* Chat Panel - Takes 2 columns */}
              <div className="lg:col-span-2">
                <ChatPanel
                  messages={messages}
                  onSend={handleChatMessage}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reset Dialog */}
      {showResetDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-5">
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <div className="bg-amber-100 p-2 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <h3 className="font-bold text-lg text-foreground">بدء طلب جديد؟</h3>
            </div>

            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              سيتم حذف المسودة الحالية. هل أنت متأكد؟
            </p>

            <div className="flex gap-2">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1 gap-2 text-red-600 hover:bg-red-50 border-red-200"
              >
                <Trash2 size={16} />
                نعم، ابدأ جديد
              </Button>
              <Button
                onClick={() => setShowResetDialog(false)}
                className="flex-1"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
