import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Check,
  Loader2,
  X,
  Sparkles,
  Plus,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

// ============================================
// Types
// ============================================
export interface VoiceProcessingStatus {
  stage: 'idle' | 'recording' | 'received' | 'processing' | 'done' | 'error';
  message?: string;
}

interface GlobalFloatingOrbProps {
  // Mode: "navigate" for marketplace, "voice" for create-request page
  mode: "navigate" | "voice";
  // Navigation callback (for navigate mode)
  onNavigate?: () => void;
  // Callback when voice recording is sent (for voice mode)
  onVoiceSend?: (audioBlob: Blob) => void;
  // Processing status (for voice mode)
  processingStatus?: VoiceProcessingStatus;
  // Visibility control
  isVisible?: boolean;
  // Hide when scroll-to-top button is visible
  hideForScrollButton?: boolean;
  // Header compressed state - fade out when header is compressed
  isHeaderCompressed?: boolean;
}

// ============================================
// Voice Status Panel - Shows processing status
// ============================================
const VoiceStatusPanel: React.FC<{
  status: VoiceProcessingStatus;
  isVisible: boolean;
  onClose: () => void;
}> = ({ status, isVisible, onClose }) => {
  if (!isVisible || status.stage === 'idle' || status.stage === 'recording') return null;

  const getStatusContent = () => {
    switch (status.stage) {
      case 'received':
        return {
          icon: <Check size={20} className="text-green-500" />,
          title: 'تم استلام الرسالة الصوتية',
          subtitle: 'جاري تحويلها إلى نص...',
          showLoader: true,
        };
      case 'processing':
        return {
          icon: <Sparkles size={20} className="text-primary" />,
          title: 'جاري تحليل الطلب',
          subtitle: status.message || 'الذكاء الاصطناعي يعمل على طلبك...',
          showLoader: true,
        };
      case 'done':
        return {
          icon: <Check size={20} className="text-green-500" />,
          title: 'تم!',
          subtitle: status.message || 'تم تجهيز طلبك',
          showLoader: false,
        };
      case 'error':
        return {
          icon: <X size={20} className="text-red-500" />,
          title: 'حدث خطأ',
          subtitle: status.message || 'حاول مرة أخرى',
          showLoader: false,
        };
      default:
        return null;
    }
  };

  const content = getStatusContent();
  if (!content) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.9 }}
      className="absolute bottom-full left-0 mb-3 rounded-2xl overflow-hidden min-w-[200px]"
      style={{
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(30, 150, 140, 0.2)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
      }}
    >
      <div className="dark:bg-[rgba(10,10,15,0.95)] p-4">
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <motion.div 
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              status.stage === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
              status.stage === 'done' ? 'bg-green-100 dark:bg-green-900/30' :
              'bg-primary/10'
            }`}
            animate={content.showLoader ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {content.icon}
          </motion.div>
          
          {/* Text Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground text-sm">{content.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{content.subtitle}</p>
            
            {/* Progress dots */}
            {content.showLoader && (
              <div className="flex gap-1 mt-2">
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
              </div>
            )}
          </div>

          {/* Close button for error/done states */}
          {(status.stage === 'done' || status.stage === 'error') && (
            <button
              onClick={onClose}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// Main Component
// ============================================
export const GlobalFloatingOrb: React.FC<GlobalFloatingOrbProps> = ({
  mode,
  onNavigate,
  onVoiceSend,
  processingStatus = { stage: 'idle' },
  isVisible = true,
  hideForScrollButton = false,
  isHeaderCompressed = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTooltipVisible, setIsTooltipVisible] = useState(true);
  const tooltipTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Constants for sizing
  const BUBBLE_SIZE = 60;

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      setRecordingTime(0);
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Show panel when processing starts
  useEffect(() => {
    if (processingStatus.stage !== 'idle' && processingStatus.stage !== 'recording') {
      setShowPanel(true);
    }
    
    // Auto-hide panel after 'done' state
    if (processingStatus.stage === 'done') {
      const timer = setTimeout(() => setShowPanel(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [processingStatus.stage]);

  // Tooltip visibility animation (show/hide cycle) - only for navigate mode
  useEffect(() => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }

    if (mode !== "navigate") {
      setIsTooltipVisible(false);
      return;
    }

    // Cycle: show for 3 seconds, hide for 4-5 seconds, repeat
    const cycleTooltip = () => {
      setIsTooltipVisible(true);
      tooltipTimerRef.current = setTimeout(() => {
        setIsTooltipVisible(false);
        tooltipTimerRef.current = setTimeout(() => {
          cycleTooltip();
        }, 5000);
      }, 3000);
    };

    cycleTooltip();

    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
        tooltipTimerRef.current = null;
      }
    };
  }, [mode]);

  // Start recording
  const startRecording = async () => {
    if (isRecording || !navigator.mediaDevices?.getUserMedia) {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("التسجيل الصوتي غير مدعوم في هذا المتصفح");
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size > 0) {
          setShowPanel(true);
          onVoiceSend?.(audioBlob);
        }
        setIsRecording(false);
        setRecordingTime(0);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      if (navigator.vibrate) navigator.vibrate(12);
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("فشل في بدء التسجيل");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error("Error stopping recording:", error);
        setIsRecording(false);
      }
    }
  };

  // Handle click based on mode
  const handleClick = () => {
    if (navigator.vibrate) navigator.vibrate(15);
    if (mode === "navigate") {
      onNavigate?.();
    }
    // Voice mode handles via press-and-hold
  };

  // Hide when scroll button is visible
  if (hideForScrollButton || !isVisible) {
    return null;
  }

  return (
    <motion.div
      ref={containerRef}
      onTapStart={() => setIsPressed(true)}
      onTap={() => setIsPressed(false)}
      onTapCancel={() => setIsPressed(false)}
      initial={{ opacity: 0, scale: 0.9, y: -60 }}
      animate={{ 
        opacity: (mode === 'navigate' && isHeaderCompressed) ? 0.15 : 1, 
        scale: (mode === 'navigate' && isHeaderCompressed) ? 0.8 : 1,
        y: (mode === 'navigate' && isHeaderCompressed) ? -80 : 0,
      }}
      exit={{ opacity: 0, scale: 0.8, y: -60 }}
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 24,
        mass: 0.9,
      }}
      style={{ 
        position: 'fixed', 
        left: 24, 
        top: mode === 'navigate' ? 15 : 'auto', 
        bottom: mode === 'navigate' ? 'auto' : 145,
        pointerEvents: (mode === 'navigate' && isHeaderCompressed) ? 'none' : 'auto',
      }}
      className="z-[100] pointer-events-auto"
    >
      {/* Voice Status Panel - only for voice mode */}
      {mode === "voice" && (
        <AnimatePresence>
          {showPanel && (
            <VoiceStatusPanel 
              status={processingStatus} 
              isVisible={showPanel}
              onClose={() => setShowPanel(false)}
            />
          )}
        </AnimatePresence>
      )}

      {/* "Create Request" Tooltip - only in navigate mode */}
      <AnimatePresence>
        {mode === "navigate" && isTooltipVisible && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-1/2 -translate-y-1/2 left-full ml-3 whitespace-nowrap text-primary text-xs font-medium pointer-events-none z-50 flex items-center gap-2"
          >
            <span>أنشئ طلب</span>
            <ArrowLeft size={18} className="animate-bounce-x" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Animation Wrapper */}
      <motion.div
        animate={{
          y: [0, -12, 0],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Recording Waves Animation - only for voice mode */}
        {mode === "voice" && isRecording && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-2 border-red-500"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{
                  scale: [1, 1.8, 2.5],
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

        {/* Soft Animated Halo */}
        {!(mode === "voice" && isRecording) && (
          <>
            {/* Ground Shadow */}
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 w-10 h-2 bg-black/15 rounded-full blur-sm"
              style={{ bottom: -8 }}
              animate={{
                scale: [1, 0.9, 1],
                opacity: [0.2, 0.15, 0.2],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Soft Outer Halo */}
            <motion.div
              className="absolute -inset-4 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(30,150,140,0.25) 0%, rgba(30,150,140,0.1) 40%, transparent 70%)",
                filter: "blur(8px)",
              }}
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.6, 0.8, 0.6],
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            />
            
            {/* Ping Ring */}
            <motion.div
              className="absolute -inset-1 rounded-full border-2 border-primary/60 pointer-events-none"
              animate={{
                scale: [1, 1.4, 1.6],
                opacity: [0.6, 0.2, 0],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeOut"
              }}
            />
          </>
        )}

        {/* Recording Timer Badge - only for voice mode */}
        {mode === "voice" && isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap font-medium"
          >
            {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
          </motion.div>
        )}

        {/* Main Button */}
        <motion.button
          className={`relative rounded-full flex items-center justify-center ${
            mode === "voice" && isRecording
              ? "bg-red-500"
              : "bg-gradient-to-br from-primary via-primary to-teal-600"
          }`}
          style={{
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            boxShadow: mode === "voice" && isRecording 
              ? "0 10px 35px rgba(239,68,68,0.45), 0 5px 18px rgba(239,68,68,0.35)"
              : "0 10px 35px rgba(30,150,140,0.45), 0 5px 18px rgba(30,150,140,0.35), inset 0 -2px 6px rgba(0,0,0,0.1), inset 0 2px 6px rgba(255,255,255,0.2)"
          }}
          animate={{
            scale: isPressed ? 0.85 : (mode === "voice" && isRecording) ? 1.1 : 1,
          }}
          whileHover={{ scale: 1.05 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
          }}
          onClick={mode === "navigate" ? handleClick : undefined}
          onMouseDown={mode === "voice" ? startRecording : undefined}
          onMouseUp={mode === "voice" ? stopRecording : undefined}
          onMouseLeave={mode === "voice" ? stopRecording : undefined}
          onTouchStart={mode === "voice" ? startRecording : undefined}
          onTouchEnd={mode === "voice" ? stopRecording : undefined}
        >
          {/* Inner Glow */}
          <motion.div
            className="absolute inset-0 rounded-full overflow-hidden"
            initial={false}
          >
            <motion.div
              className="absolute top-1 left-1/4 right-1/4 h-4 bg-gradient-to-b from-white/30 to-transparent rounded-full blur-sm"
            />
          </motion.div>

          {/* Icon based on mode */}
          <motion.div
            animate={mode === "voice" && isRecording ? { 
              scale: [1, 1.2, 1],
            } : mode === "navigate" ? {
              rotate: [0, 90, 90, 0],
            } : {}}
            transition={mode === "voice" && isRecording ? { 
              duration: 0.5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            } : {
              duration: 2,
              repeat: Infinity,
              repeatDelay: 10,
              ease: "easeInOut"
            }}
          >
            {mode === "navigate" ? (
              <Plus size={26} strokeWidth={2} className="text-white relative z-10" />
            ) : (
              <Mic size={26} strokeWidth={2} className="text-white relative z-10" />
            )}
          </motion.div>
        </motion.button>
      </motion.div>

      {/* Helper Text - Hold to Record (only for voice mode) */}
      {mode === "voice" && !isRecording && !showPanel && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap"
        >
          اضغط مع الاستمرار
        </motion.p>
      )}
    </motion.div>
  );
};

export default GlobalFloatingOrb;
