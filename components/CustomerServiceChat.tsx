/**
 * Customer Service Chat Component
 * 
 * A wizard-style interface for customer service requests with:
 * - Text input
 * - Voice recording (Whisper)
 * - Clarification pages
 * - Final review screen
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Send,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Volume2,
  Loader2,
  MessageSquare,
  FileText,
  Tag,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import {
  processCustomerRequest,
  CustomerServiceResponse,
  FinalReview,
  ClarificationPage,
} from '../services/customerServiceAI';

// ============================================
// Types
// ============================================
interface CustomerServiceChatProps {
  onBack?: () => void;
  onSubmit?: (finalReview: FinalReview) => void;
  initialText?: string;
}

type ChatState = 
  | 'input'        // Initial input state
  | 'processing'   // AI processing
  | 'clarifying'   // Showing clarification questions
  | 'reviewing'    // Final review screen
  | 'submitted';   // Successfully submitted

// ============================================
// Voice Recording Hook
// ============================================
function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('تعذر الوصول للميكروفون. الرجاء السماح بالوصول.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    setRecordingTime(0);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    isRecording,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    clearRecording,
    formatTime,
  };
}

// ============================================
// Progress Indicator
// ============================================
const ProgressIndicator: React.FC<{
  currentPage: number;
  totalPages: number;
}> = ({ currentPage, totalPages }) => {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalPages }).map((_, index) => (
        <motion.div
          key={index}
          className={`h-2 rounded-full transition-all duration-300 ${
            index + 1 === currentPage
              ? 'w-8 bg-primary'
              : index + 1 < currentPage
              ? 'w-2 bg-primary'
              : 'w-2 bg-border'
          }`}
          animate={{
            scale: index + 1 === currentPage ? 1.1 : 1,
          }}
        />
      ))}
      <span className="text-xs text-muted-foreground mr-2">
        {currentPage}/{totalPages}
      </span>
    </div>
  );
};

// ============================================
// Clarification Question Card
// ============================================
const ClarificationCard: React.FC<{
  question: string;
  answer: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack?: () => void;
  isFirst: boolean;
  isLast: boolean;
  isLoading: boolean;
}> = ({ question, answer, onChange, onNext, onBack, isFirst, isLast, isLoading }) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, [question]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && answer.trim()) {
      e.preventDefault();
      onNext();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-4"
    >
      {/* Question */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles size={20} className="text-primary" />
        </div>
        <div className="flex-1 bg-card rounded-2xl rounded-tr-sm p-4 border border-border">
          <p className="text-foreground leading-relaxed">{question}</p>
        </div>
      </div>

      {/* Answer Input */}
      <div className="pr-13">
        <textarea
          ref={inputRef}
          value={answer}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب إجابتك هنا..."
          className="w-full bg-secondary/50 rounded-2xl p-4 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary min-h-[100px]"
          dir="auto"
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 pr-13">
        {!isFirst && onBack && (
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronRight size={18} />
            <span>السابق</span>
          </motion.button>
        )}
        
        <motion.button
          onClick={onNext}
          disabled={!answer.trim() || isLoading}
          whileHover={{ scale: answer.trim() ? 1.02 : 1 }}
          whileTap={{ scale: answer.trim() ? 0.98 : 1 }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all mr-auto ${
            answer.trim()
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-secondary text-muted-foreground cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>جاري المعالجة...</span>
            </>
          ) : (
            <>
              <span>{isLast ? 'إنهاء' : 'التالي'}</span>
              <ChevronLeft size={18} />
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

// ============================================
// Final Review Screen
// ============================================
const FinalReviewScreen: React.FC<{
  review: FinalReview;
  languageDetected?: string;
  onConfirm: () => void;
  onEdit: () => void;
  isSubmitting: boolean;
}> = ({ review, languageDetected, onConfirm, onEdit, isSubmitting }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
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
          <h3 className="text-lg font-semibold text-foreground">{review.title}</h3>
        </div>

        {/* Description */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <MessageSquare size={14} />
            <span>تفاصيل الطلب</span>
          </div>
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {review.reformulated_request}
          </p>
        </div>

        {/* Category */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">التصنيف</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${
            review.system_category === 'غير محدد'
              ? 'bg-accent/15 text-accent-foreground'
              : 'bg-primary/10 text-primary'
          }`}>
            {review.system_category}
          </span>
        </div>


        {/* Language Detected */}
        {languageDetected && (
          <div className="px-4 py-2 bg-secondary/50 text-xs text-muted-foreground flex items-center gap-2">
            <Volume2 size={12} />
            <span>اللغة المكتشفة: {languageDetected}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <motion.button
          onClick={onEdit}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-foreground hover:bg-secondary transition-colors"
        >
          <span>تعديل</span>
        </motion.button>
        
        <motion.button
          onClick={onConfirm}
          disabled={isSubmitting}
          whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
          whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
          className="flex-[2] flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>جاري الإرسال...</span>
            </>
          ) : (
            <>
              <Check size={18} />
              <span>تأكيد وإرسال</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

// ============================================
// Main Component
// ============================================
export const CustomerServiceChat: React.FC<CustomerServiceChatProps> = ({
  onBack,
  onSubmit,
  initialText = '',
}) => {
  // State
  const [state, setState] = useState<ChatState>('input');
  const [inputText, setInputText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  
  // Clarification state
  const [clarificationPages, setClarificationPages] = useState<ClarificationPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Final review state
  const [finalReview, setFinalReview] = useState<FinalReview | null>(null);
  const [languageDetected, setLanguageDetected] = useState<string>('');
  
  // Voice recording
  const {
    isRecording,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    clearRecording,
    formatTime,
  } = useVoiceRecording();

  // ============================================
  // Process Request
  // ============================================
  const processRequest = async (
    text?: string,
    audio?: Blob,
    prevAnswers?: Record<string, string>
  ) => {
    setState('processing');
    setError(null);

    try {
      const response = await processCustomerRequest(text, audio, prevAnswers);

      if (!response.success) {
        setError(response.error || 'حدث خطأ غير متوقع');
        setState('input');
        return;
      }

      const data = response.data!;
      setLanguageDetected(data.language_detected);

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
        setCurrentPage(0);
        setState('clarifying');
      } else {
        // No clarification needed - go to review
        setFinalReview(data.final_review);
        setState('reviewing');
      }
    } catch (err) {
      console.error('Process error:', err);
      setError('حدث خطأ في الاتصال. الرجاء المحاولة مرة أخرى.');
      setState('input');
    }
  };

  // ============================================
  // Handle Submit
  // ============================================
  const handleSubmit = () => {
    if (!inputText.trim() && !audioBlob) return;
    processRequest(inputText || undefined, audioBlob || undefined);
  };

  // ============================================
  // Handle Clarification Answer
  // ============================================
  const handleClarificationNext = async () => {
    const currentQuestion = clarificationPages[currentPage]?.question || '';
    const answer = answers[currentQuestion] || '';
    
    if (!answer.trim()) return;

    if (currentPage < clarificationPages.length - 1) {
      // Move to next page
      setCurrentPage(prev => prev + 1);
    } else {
      // All questions answered - reprocess
      await processRequest(inputText, undefined, answers);
    }
  };

  const handleClarificationBack = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // ============================================
  // Handle Final Confirm
  // ============================================
  const handleConfirm = async () => {
    if (!finalReview) return;
    
    setState('submitted');
    
    // Notify parent
    onSubmit?.(finalReview);
  };

  // ============================================
  // Handle Edit
  // ============================================
  const handleEdit = () => {
    setState('input');
    setClarificationPages([]);
    setCurrentPage(0);
    setAnswers({});
  };

  // ============================================
  // Render
  // ============================================
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        {onBack && (
          <motion.button
            onClick={onBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </motion.button>
        )}
        <div className="flex-1">
          <h1 className="font-semibold text-foreground">خدمة العملاء الذكية</h1>
          <p className="text-xs text-muted-foreground">كيف نقدر نساعدك اليوم؟</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles size={20} className="text-primary" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {/* Input State */}
          {state === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2"
                >
                  <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </motion.div>
              )}

              {/* Welcome Message */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles size={20} className="text-primary" />
                </div>
                <div className="flex-1 bg-card rounded-2xl rounded-tr-sm p-4 border border-border">
                  <p className="text-foreground leading-relaxed">
                    أهلاً بك! 👋 أنا مساعدك الذكي في أبيلي. 
                    اكتب طلبك أو سجّل رسالة صوتية وسأساعدك في صياغته بشكل احترافي.
                  </p>
                </div>
              </div>

              {/* Audio Recording Indicator */}
              {audioBlob && !isRecording && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Volume2 size={16} className="text-primary" />
                  </div>
                  <span className="text-sm text-foreground flex-1">تم تسجيل رسالة صوتية</span>
                  <button
                    onClick={clearRecording}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    حذف
                  </button>
                </motion.div>
              )}

              {/* Text Input */}
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="اكتب طلبك هنا... (مثال: أبغى سباك يصلح تسريب في الحمام)"
                  className="w-full bg-secondary/50 rounded-2xl p-4 pr-4 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary min-h-[120px]"
                  dir="auto"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {/* Voice Recording Button */}
                <motion.button
                  onClick={isRecording ? stopRecording : startRecording}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-4 rounded-xl transition-colors ${
                    isRecording
                      ? 'bg-red-500 text-white'
                      : 'bg-secondary hover:bg-secondary/80 text-foreground'
                  }`}
                >
                  {isRecording ? (
                    <div className="flex items-center gap-2">
                      <MicOff size={20} />
                      <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
                    </div>
                  ) : (
                    <Mic size={20} />
                  )}
                </motion.button>

                {/* Submit Button */}
                <motion.button
                  onClick={handleSubmit}
                  disabled={!inputText.trim() && !audioBlob}
                  whileHover={{ scale: (inputText.trim() || audioBlob) ? 1.02 : 1 }}
                  whileTap={{ scale: (inputText.trim() || audioBlob) ? 0.98 : 1 }}
                  className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl font-medium transition-colors ${
                    inputText.trim() || audioBlob
                      ? 'bg-primary text-white hover:bg-primary/90'
                      : 'bg-secondary text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  <Send size={18} />
                  <span>إرسال للمعالجة</span>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Processing State */}
          {state === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4"
              >
                <Sparkles size={32} className="text-primary" />
              </motion.div>
              <p className="text-foreground font-medium">جاري تحليل طلبك...</p>
              <p className="text-sm text-muted-foreground mt-1">قد يستغرق هذا بضع ثوان</p>
            </motion.div>
          )}

          {/* Clarifying State */}
          {state === 'clarifying' && clarificationPages.length > 0 && (
            <motion.div
              key="clarifying"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ProgressIndicator
                currentPage={currentPage + 1}
                totalPages={clarificationPages.length}
              />
              
              <AnimatePresence mode="wait">
                <ClarificationCard
                  key={currentPage}
                  question={clarificationPages[currentPage]?.question || ''}
                  answer={answers[clarificationPages[currentPage]?.question || ''] || ''}
                  onChange={(value) => {
                    const question = clarificationPages[currentPage]?.question || '';
                    setAnswers(prev => ({ ...prev, [question]: value }));
                  }}
                  onNext={handleClarificationNext}
                  onBack={currentPage > 0 ? handleClarificationBack : undefined}
                  isFirst={currentPage === 0}
                  isLast={currentPage === clarificationPages.length - 1}
                  isLoading={false}
                />
              </AnimatePresence>
            </motion.div>
          )}

          {/* Reviewing State */}
          {state === 'reviewing' && finalReview && (
            <FinalReviewScreen
              review={finalReview}
              languageDetected={languageDetected}
              onConfirm={handleConfirm}
              onEdit={handleEdit}
              isSubmitting={false}
            />
          )}

          {/* Submitted State */}
          {state === 'submitted' && (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mb-4"
              >
                <Check size={40} className="text-primary" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-2">تم إرسال طلبك بنجاح!</h2>
              <p className="text-muted-foreground text-center">
                سيتم مراجعة طلبك والتواصل معك قريباً
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CustomerServiceChat;

