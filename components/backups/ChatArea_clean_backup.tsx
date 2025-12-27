import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle,
  Clock,
  DollarSign,
  MapPin,
  Mic,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Button } from "./ui/Button";
import { NoMessagesEmpty } from "./ui/EmptyState";
import { Request } from "../types";
import { createRequestFromChat } from "../services/requestsService";
import { supabase } from "../services/supabaseClient";
import { generateDraftWithCta } from "../services/aiService";

type AttachmentPreview = { name: string; url: string };

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  isDraftPreview?: boolean;
  draftData?: Partial<Request> & {
    seriousness?: number;
    suggestions?: string[];
    neighborhood?: string;
  };
  isSuccess?: boolean;
  attachments?: AttachmentPreview[];
  audioUrl?: string | null;
  ctaMessage?: string;
}

// Helper Component for Floating Label Input
const FloatingInput = ({
  label,
  value,
  onChange,
  type = "text",
  className = "",
  centered = false,
}: {
  label: string;
  value: string | number | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
  centered?: boolean;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== "" && value !== undefined;

  return (
    <div className={`relative ${className}`}>
      <input
        type={type}
        value={value || ""}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`peer w-full h-11 rounded-lg border-2 bg-background px-3 pt-3 text-base outline-none transition-all ${
          isFocused || hasValue ? "border-primary" : "border-border"
        } ${centered ? "text-center" : "text-right"}`}
      />
      <label
        className={`pointer-events-none absolute right-3 transition-all duration-200 ${
          isFocused || hasValue
            ? "-top-2 right-2 bg-background px-1 text-[11px] text-primary font-bold"
            : "top-3 text-sm text-muted-foreground"
        }`}
      >
        {label}
      </label>
    </div>
  );
};

// Helper Component for Floating Label Textarea
const FloatingTextarea = ({
  label,
  value,
  onChange,
  rows = 2,
  className = "",
}: {
  label: string;
  value: string | undefined;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  className?: string;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== "" && value !== undefined;

  return (
    <div className={`relative ${className}`}>
      <textarea
        value={value || ""}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        rows={rows}
        className={`peer w-full rounded-lg border-2 bg-background px-3 pt-4 pb-2 text-base outline-none transition-all resize-none ${
          isFocused || hasValue ? "border-primary" : "border-border"
        } text-right`}
      />
      <label
        className={`pointer-events-none absolute right-3 transition-all duration-200 ${
          isFocused || hasValue
            ? "-top-2 right-2 bg-background px-1 text-[11px] text-primary font-bold"
            : "top-2.5 text-sm text-muted-foreground"
        }`}
      >
        {label}
      </label>
    </div>
  );
};

// Simple Toggle Switch Component
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
    onClick={() => onChange(!enabled)}
    className="flex items-center justify-between w-full p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-all"
  >
    <span className="text-sm font-medium">{label}</span>
    <div
      className={`relative w-11 h-6 rounded-full transition-all ${
        enabled ? "bg-primary" : "bg-muted"
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${
          enabled ? "right-1" : "left-1"
        }`}
      />
    </div>
  </button>
);

export const ChatArea: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [seriousnessLevel, setSeriousnessLevel] = useState<number>(0);

  // Attachments & audio
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const placeholders = [
    "اكتب وصف طلبك بسرعة...",
    "أبي مبرمج لمتجر إلكتروني...",
    "أحتاج تصميم شعار بسيط...",
    "خدمة توصيل من العليا للنرجس...",
    "ميزانية من 500 إلى 800، مدة أسبوع...",
    "أي طلب يخطر في بالك، اكتبه هنا...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      setAudioUrl(URL.createObjectURL(blob));
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
  };

  const clearPendingMedia = () => {
    setAttachedFiles([]);
    setAudioUrl(null);
  };

  // Helper Component for Floating Label Input
  const FloatingInput = ({
    label,
    value,
    onChange,
    type = "text",
    className = "",
    centered = false,
  }: {
    label: string;
    value: string | number | undefined;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    className?: string;
    centered?: boolean;
  }) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value !== "" && value !== undefined;

    return (
      <div className={`relative ${className}`}>
        <input
          type={type}
          value={value || ""}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`peer w-full h-12 rounded-lg border-2 bg-background px-4 pt-4 text-sm outline-none transition-all ${
            isFocused || hasValue ? "border-primary" : "border-border"
          } ${centered ? "text-center" : "text-right"}`}
        />
        <label
          className={`pointer-events-none absolute right-4 transition-all duration-200 ${
            isFocused || hasValue
              ? "-top-2.5 right-3 bg-background px-1 text-[10px] text-primary font-bold"
              : "top-3.5 text-xs text-muted-foreground"
          }`}
        >
          {label}
        </label>
      </div>
    );
  };

  const handleSend = async (text: string = input) => {
    const trimmedText = text.trim();
    const hasMedia = attachedFiles.length > 0 || audioUrl;
    if (!trimmedText && !hasMedia) return;

    const attachmentsPreview: AttachmentPreview[] = attachedFiles.map((
      file,
    ) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: trimmedText || "مرفقات بدون نص",
      attachments: attachmentsPreview,
      audioUrl,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    clearPendingMedia();
    setIsLoading(true);

    try {
      const draft = await generateDraftWithCta(
        trimmedText || "وصف قصير مع مرفقات",
      );

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

      const draftPreview: ChatMessage = {
        ...aiMsg,
        id: (Date.now() + 2).toString(),
        isDraftPreview: true,
        draftData: {
          title: draft.title || "طلب جديد",
          description: draft.description || draft.summary || "",
          budgetMin: draft.budgetMin || "",
          budgetMax: draft.budgetMax || "",
          location: draft.location || "",
          categories: draft.categories || [],
          deliveryTimeFrom: draft.deliveryTime || "",
          budgetType: (draft.budgetMin || draft.budgetMax)
            ? "fixed"
            : "negotiable",
          seriousness: seriousnessLevel,
          suggestions: draft.suggestions || [],
        },
      };

      setMessages((prev) => [...prev, draftPreview]);

      // AI Discussion After
      if (draft.aiResponseAfter) {
        setTimeout(() => {
          setMessages((prev) => [...prev, {
            id: (Date.now() + 3).toString(),
            role: "ai",
            text: draft.aiResponseAfter || "",
          }]);
        }, 1200);
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
    }
  };

  const handlePublishDraft = async (draft: ChatMessage) => {
    if (!draft.draftData) return;
    setIsLoading(true);
    const seriousness = Math.min(
      3,
      Math.max(
        1,
        draft.draftData.seriousness ??
          seriousnessLevel ??
          2,
      ),
    );

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;

      const result = await createRequestFromChat(
        userId,
        draft.draftData,
        {
          title: draft.draftData.title,
          description: draft.draftData.description,
          budget_min: draft.draftData.budgetMin || "",
          budget_max: draft.draftData.budgetMax || "",
          budget_type: draft.draftData.budgetType === "negotiable"
            ? "negotiable"
            : (draft.draftData.budgetMin || draft.draftData.budgetMax
              ? "fixed"
              : "not-specified"),
          location: draft.draftData.location,
          delivery_from: draft.draftData.deliveryTimeFrom,
          seriousness,
        },
      );

      const successMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: "ai",
        text: `تم إنشاء الطلب وحفظه (ID: ${
          result?.id || ""
        }). يمكنك متابعة التفاصيل أو إضافة عروض.`,
        isSuccess: true,
      };
      setMessages((prev) => [...prev, successMsg]);
    } catch (error) {
      console.error(error);
      const errMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: "ai",
        text: "تعذر إنشاء الطلب حالياً. تأكد من سياسات Supabase أو الاتصال.",
      };
      setMessages((prev) => [...prev, errMsg]);
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
      setShowResetDialog(true);
    }
  };

  const [showResetDialog, setShowResetDialog] = useState(false);

  const confirmReset = (save: boolean) => {
    if (save) {
      alert("تم حفظ المسودة شكلياً. (أضف حفظ حقيقي لو رغبت)");
    }
    setMessages([]);
    setInput("");
    clearPendingMedia();
    setShowResetDialog(false);
  };

  const setNegotiableBudget = (msgId: string) => {
    updateDraftField(msgId, "budgetMin", "");
    updateDraftField(msgId, "budgetMax", "");
    updateDraftField(msgId, "budgetType", "negotiable");
  };

  return (
    <>
      <div className="flex-1 flex flex-col h-full bg-background relative min-h-0 rounded-xl border border-border shadow-sm">
        <div className="p-3 border-b border-border bg-primary/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-primary text-lg px-2">
              محادثة إنشاء الطلب
            </h2>
            {messages.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleStartNewRequest}
                className="h-7 text-xs gap-1 bg-background hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                <PlusIcon />
                بدء طلب جديد
              </Button>
            )}
          </div>

          <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full items-center gap-1 hidden sm:flex">
            الخصوصية: الملفات تسجّل محلياً قبل الإرسال
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-0">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <NoMessagesEmpty />
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              } animate-in fade-in slide-in-from-bottom-2 ${
                msg.isDraftPreview ? "px-3" : ""
              }`}
            >
              <div
                className={`flex gap-2 ${
                  msg.isDraftPreview ? "w-full" : "max-w-[95%] md:max-w-[85%]"
                } ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Hide avatar for draft preview */}
                {!msg.isDraftPreview && (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-1 ${
                      msg.role === "user"
                        ? "bg-primary text-white"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {msg.role === "user"
                      ? <User size={16} />
                      : <Bot size={16} />}
                  </div>
                )}

                <div className="flex flex-col gap-2 w-full">
                  {/* Text Bubble */}
                  {msg.text && !msg.isDraftPreview && (
                    <div
                      className={`p-3 px-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm w-fit relative ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tl-none mr-auto"
                          : msg.isSuccess
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-tr-none ml-auto"
                          : "bg-secondary text-secondary-foreground rounded-tr-none border border-border ml-auto"
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}

                  {/* Attachments / Audio */}
                  {(msg.attachments?.length || msg.audioUrl) &&
                    !msg.isDraftPreview && (
                    <div className="bg-background border border-border rounded-xl p-3 space-y-2 shadow-sm">
                      {msg.attachments?.length
                        ? (
                          <div className="space-y-1 text-xs">
                            <div className="font-bold text-muted-foreground">
                              المرفقات:
                            </div>
                            {msg.attachments.map((att) => (
                              <a
                                key={att.url}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block px-2 py-1 rounded border border-dashed border-border hover:border-primary hover:text-primary"
                              >
                                {att.name}
                              </a>
                            ))}
                          </div>
                        )
                        : null}
                      {msg.audioUrl && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-muted-foreground">
                            صوت:
                          </span>
                          <audio controls src={msg.audioUrl} className="w-48" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Draft Preview Card - Suggestion-Based UX */}
                  {msg.isDraftPreview && msg.draftData && (
                    <div className="w-full">
                      <DraftPreviewCard
                        msg={msg}
                        seriousnessLevel={seriousnessLevel}
                        setSeriousnessLevel={setSeriousnessLevel}
                        updateDraftField={updateDraftField}
                        handlePublishDraft={handlePublishDraft}
                        setMessages={setMessages}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-fade-up">
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles size={14} className="text-primary animate-pulse" />
                </div>
                <div className="bg-gradient-to-r from-secondary to-secondary/50 p-4 rounded-2xl rounded-tl-none border border-border/50 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      يتم التحضير...
                    </span>
                    <div className="flex flex-row-reverse gap-1">
                      <span
                        className="w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-primary/80 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute inset-x-0 bottom-[110%] p-4 bg-red-500/90 backdrop-blur-md rounded-2xl text-white flex items-center justify-between shadow-2xl animate-in fade-in zoom-in-95">
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
              <span className="text-[11px] font-black tracking-widest uppercase">
                جاري الاستماع إليك...
              </span>
            </div>
            <button
              onClick={toggleRecording}
              className="bg-white text-red-600 px-4 py-1 rounded-full text-[10px] font-black hover:bg-white/90"
            >
              إيقاف
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-2 shadow-md focus-within:shadow-xl focus-within:ring-2 focus-within:ring-primary/30 transition-all relative z-10">
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-background/80 transition-colors shrink-0"
            onClick={handleFilePick}
            title="إرفاق ملفات"
          >
            <Paperclip size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
            accept="image/*,video/*,audio/*,.pdf"
          />

          <button
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${
              isRecording
                ? "bg-red-500 text-white animate-pulse"
                : "text-muted-foreground hover:text-primary hover:bg-background/80"
            }`}
            onClick={toggleRecording}
            title="تسجيل صوتي"
          >
            <Mic size={20} />
          </button>

          <div className="flex-1">
            <textarea
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none max-h-20 text-sm py-2"
              placeholder={placeholders[placeholderIndex]}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>

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
        </div>

        {/* Attachment Previews - Thumbnails Outside Box */}
        {(attachedFiles.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-2 px-1">
            {attachedFiles.map((file) => {
              const isImage = file.type.startsWith("image/");
              return (
                <div
                  key={file.name}
                  className="relative group w-14 h-14 bg-secondary rounded-xl overflow-hidden border border-border shadow-sm"
                >
                  {isImage
                    ? (
                      <img
                        src={URL.createObjectURL(file)}
                        className="w-full h-full object-cover"
                      />
                    )
                    : (
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
          </div>
        )}
      </div>

      {showResetDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-xl border border-border shadow-2xl p-5 transform transition-all scale-100">
            <div className="flex items-center gap-3 mb-4 text-primary">
              <div className="bg-primary/10 p-2 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <h3 className="font-bold text-lg">مسودة جديدة</h3>
            </div>

            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              هل تريد بدء مسودة جديدة؟ يمكن حفظ الحالية بشكل مبدئي أو تجاهلها.
            </p>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => confirmReset(true)}
                className="w-full gap-2 bg-primary hover:bg-primary/90"
              >
                <SaveIcon />
                حفظ المسودة الحالية
              </Button>
              <Button
                onClick={() => confirmReset(false)}
                variant="outline"
                className="w-full gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 size={16} />
                تجاهل والمسودة جديدة
              </Button>
              <Button
                onClick={() => setShowResetDialog(false)}
                variant="ghost"
                className="w-full"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Simple icons to avoid re-importing missing ones
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

// DraftPreviewCard - Suggestion-Based UX
interface DraftPreviewCardProps {
  msg: ChatMessage;
  seriousnessLevel: number;
  setSeriousnessLevel: (val: number) => void;
  updateDraftField: (id: string, field: string, value: any) => void;
  handlePublishDraft: (msg: ChatMessage) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const DraftPreviewCard: React.FC<DraftPreviewCardProps> = ({
  msg,
  seriousnessLevel,
  setSeriousnessLevel,
  updateDraftField,
  handlePublishDraft,
  setMessages,
}) => {
  const [expandedFields, setExpandedFields] = useState<string[]>([]);

  const toggleField = (field: string) => {
    // Toggle the specific field independently (don't close others)
    setExpandedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const suggestions = [
    {
      key: "neighborhood",
      label: "🏘️ الحي/الموقع الدقيق",
      icon: MapPin,
      placeholder: "مثال: حي العليا",
    },
    {
      key: "deliveryTimeFrom",
      label: "⏰ مدة التنفيذ المطلوبة",
      icon: Clock,
      placeholder: "مثال: أسبوع",
    },
    { key: "budget", label: "💰 الميزانية", icon: DollarSign, placeholder: "" },
    {
      key: "seriousness",
      label: "🎯 مستوى الجدية",
      icon: CheckCircle,
      placeholder: "",
    },
  ];

  const draftData = msg.draftData!;

  return (
    <div className="w-full animate-in slide-in-from-left-4 duration-500 mb-4">
      <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
        <div className="bg-primary/5 px-4 py-2.5 flex items-center gap-2 border-b border-border/50">
          <Bot size={20} className="text-primary" />
          <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">
            مقترح طلبك
          </span>
        </div>

        <div className="p-4 space-y-4">
          {/* Core Fields - Always Visible */}
          <div className="space-y-3">
            <FloatingInput
              label="عنوان الطلب"
              value={draftData.title}
              onChange={(e) =>
                updateDraftField(msg.id, "title", e.target.value)}
            />
            <FloatingTextarea
              label="وصف الطلب"
              value={draftData.description}
              onChange={(e) =>
                updateDraftField(msg.id, "description", e.target.value)}
              rows={2}
            />
            {/* City - Required */}
            <div className="pt-1">
              <FloatingInput
                label="المدينة (مطلوب)"
                value={draftData.location}
                onChange={(e) =>
                  updateDraftField(msg.id, "location", e.target.value)}
              />
            </div>
          </div>

          {/* Optional Fields - Switch Based */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-muted-foreground block">
              ➕ تفاصيل إضافية (اختياري):
            </span>

            {/* Neighborhood Switch */}
            <div className="rounded-xl border border-border overflow-hidden">
              <ToggleSwitch
                label="🏘️ الحي/الموقع الدقيق"
                enabled={!!draftData.neighborhood}
                onChange={(enabled) => {
                  if (!enabled) {
                    updateDraftField(msg.id, "neighborhood", "");
                  }
                  toggleField("neighborhood");
                }}
              />
              {!!draftData.neighborhood || expandedFields.includes("neighborhood") ? (
                <div className="p-3 pt-2 border-t border-border/50 animate-in slide-in-from-top-1">
                  <FloatingInput
                    label="الحي/الموقع الدقيق"
                    value={draftData.neighborhood}
                    onChange={(e) => updateDraftField(msg.id, "neighborhood", e.target.value)}
                  />
                </div>
              ) : null}
            </div>

            {/* Duration Switch */}
            <div className="rounded-xl border border-border overflow-hidden">
              <ToggleSwitch
                label="⏰ مدة التنفيذ المطلوبة"
                enabled={!!(draftData.deliveryTimeFrom && draftData.deliveryTimeFrom !== "غير محددة")}
                onChange={(enabled) => {
                  if (!enabled) {
                    updateDraftField(msg.id, "deliveryTimeFrom", "غير محددة");
                  } else {
                    updateDraftField(msg.id, "deliveryTimeFrom", "");
                  }
                  toggleField("deliveryTimeFrom");
                }}
              />
              {draftData.deliveryTimeFrom && draftData.deliveryTimeFrom !== "غير محددة" || expandedFields.includes("deliveryTimeFrom") ? (
                <div className="p-3 pt-2 border-t border-border/50 animate-in slide-in-from-top-1">
                  <FloatingInput
                    label="مدة التنفيذ"
                    value={draftData.deliveryTimeFrom === "غير محددة" ? "" : draftData.deliveryTimeFrom}
                    onChange={(e) => updateDraftField(msg.id, "deliveryTimeFrom", e.target.value)}
                  />
                </div>
              ) : null}
            </div>

            {/* Budget Switch */}
            <div className="rounded-xl border border-border overflow-hidden">
              <ToggleSwitch
                label="💰 الميزانية"
                enabled={!!(draftData.budgetMin || draftData.budgetMax)}
                onChange={(enabled) => {
                  if (!enabled) {
                    updateDraftField(msg.id, "budgetMin", "");
                    updateDraftField(msg.id, "budgetMax", "");
                    updateDraftField(msg.id, "budgetType", "negotiable");
                  } else {
                    updateDraftField(msg.id, "budgetType", "fixed");
                  }
                  toggleField("budget");
                }}
              />
              {(draftData.budgetMin || draftData.budgetMax || expandedFields.includes("budget")) ? (
                <div className="p-3 pt-2 border-t border-border/50 animate-in slide-in-from-top-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <FloatingInput
                      label="من (ر.س)"
                      value={draftData.budgetMin}
                      onChange={(e) => {
                        updateDraftField(msg.id, "budgetMin", e.target.value);
                        updateDraftField(msg.id, "budgetType", "fixed");
                      }}
                      type="number"
                      centered
                      className="flex-1"
                    />
                    <span className="text-muted-foreground font-bold pt-2">—</span>
                    <FloatingInput
                      label="إلى (ر.س)"
                      value={draftData.budgetMax}
                      onChange={(e) => {
                        updateDraftField(msg.id, "budgetMax", e.target.value);
                        updateDraftField(msg.id, "budgetType", "fixed");
                      }}
                      type="number"
                      centered
                      className={`flex-1 ${!draftData.budgetMin ? "opacity-50 pointer-events-none" : ""}`}
                    />
                  </div>
                  {draftData.budgetMin && draftData.budgetMax &&
                    parseFloat(draftData.budgetMax as string) < parseFloat(draftData.budgetMin as string) && (
                    <p className="text-[11px] text-red-500">
                      ⚠️ الحد الأقصى يجب أن يكون أكبر من الحد الأدنى
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {/* Seriousness Switch */}
            <div className="rounded-xl border border-border overflow-hidden">
              <ToggleSwitch
                label="🎯 مستوى الجدية"
                enabled={(draftData.seriousness ?? 0) >= 2}
                onChange={(enabled) => {
                  if (!enabled) {
                    setSeriousnessLevel(0);
                    updateDraftField(msg.id, "seriousness", 0);
                  } else {
                    setSeriousnessLevel(2);
                    updateDraftField(msg.id, "seriousness", 2);
                  }
                  toggleField("seriousness");
                }}
              />
              {(draftData.seriousness ?? 0) >= 2 || expandedFields.includes("seriousness") ? (
                <div className="p-3 pt-2 border-t border-border/50 animate-in slide-in-from-top-1">
                  <div className="flex gap-2">
                    {[
                      { val: 2, label: "عروض جادة", emoji: "💼" },
                      { val: 3, label: "عروض أكثر جدية", emoji: "🎯" },
                    ].map((opt) => {
                      const isSelected = (draftData.seriousness ?? seriousnessLevel) === opt.val;
                      return (
                        <button
                          key={opt.val}
                          onClick={() => {
                            setSeriousnessLevel(opt.val);
                            updateDraftField(msg.id, "seriousness", opt.val);
                          }}
                          className={`flex-1 py-2.5 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                            isSelected
                              ? opt.val === 2
                                ? "bg-blue-600 border-blue-600 text-white shadow-md"
                                : "bg-blue-800 border-blue-800 text-white shadow-md"
                              : "bg-secondary/30 border-border text-foreground hover:border-primary/30"
                          }`}
                        >
                          <span>{opt.emoji}</span>
                          <span className="text-xs font-bold">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-secondary/10 border-t border-border/50">
          <Button
            onClick={() => handlePublishDraft(msg)}
            className="w-full h-10 bg-primary text-white font-bold text-xs rounded-xl shadow-lg active:scale-95 transition-all"
          >
            🚀 نشر الطلب
          </Button>
        </div>
      </div>
    </div>
  );
};
