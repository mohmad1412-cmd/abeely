import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  Sparkles,
  Plus,
  GripVertical,
  X,
  Mic,
  Send,
  Loader2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

// ============================================
// Types
// ============================================
interface AIMessage {
  id: string;
  text: string;
  timestamp: Date;
}

interface GlobalFloatingOrbProps {
  // Mode: "ai" for create-request page, "navigate" for other pages
  mode: "ai" | "navigate";
  // Navigation callback (for navigate mode)
  onNavigate?: () => void;
  // AI mode props
  aiMessages?: AIMessage[];
  inputValue?: string;
  onInputChange?: (value: string) => void;
  onSend?: (audioBlob?: Blob) => void;
  isLoading?: boolean;
  // Position persistence
  position?: { x: number; y: number };
  onPositionChange?: (pos: { x: number; y: number }) => void;
  // Visibility control
  isVisible?: boolean;
}

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
export const GlobalFloatingOrb: React.FC<GlobalFloatingOrbProps> = ({
  mode,
  onNavigate,
  aiMessages = [],
  inputValue = "",
  onInputChange,
  onSend,
  isLoading = false,
  position: externalPosition,
  onPositionChange,
  isVisible = true,
}) => {
  const dragControls = useDragControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [initialPositionSet, setInitialPositionSet] = useState(false);
  const [isTooltipVisible, setIsTooltipVisible] = useState(true);
  const tooltipTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Constants for sizing
  const BUBBLE_SIZE = 60;
  const EXPANDED_WIDTH = 320;
  const EXPANDED_HEIGHT = 56;
  const GLASS_PANEL_HEIGHT = 140;
  const MARGIN = 20;
  const BOTTOM_MARGIN = 40;
  const TOOLTIP_WIDTH = 100; // Approximate width of tooltip
  const TOOLTIP_OFFSET = 12; // mr-3 = 12px
  
  // Internal position state
  const [internalPosition, setInternalPosition] = useState({ x: 20, y: 500 });
  const position = externalPosition || internalPosition;
  const setPosition = (pos: { x: number; y: number }) => {
    setInternalPosition(pos);
    onPositionChange?.(pos);
  };
  
  // Track keyboard height for mobile
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Set initial position on mount
  useEffect(() => {
    if (!initialPositionSet && typeof window !== 'undefined') {
      const safeY = window.innerHeight - 150;
      setPosition({ x: 20, y: safeY });
      setInitialPositionSet(true);
    }
  }, [initialPositionSet]);
  
  // Detect keyboard open/close
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    
    const viewport = window.visualViewport;
    
    const handleResize = () => {
      const heightDiff = window.innerHeight - viewport.height;
      setKeyboardHeight(heightDiff > 50 ? heightDiff : 0);
    };
    
    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);
    
    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, []);
  
  // Move capsule up when keyboard opens while expanded
  useEffect(() => {
    if (isExpanded && keyboardHeight > 0) {
      const safeY = window.innerHeight - keyboardHeight - EXPANDED_HEIGHT - GLASS_PANEL_HEIGHT - MARGIN;
      if (position.y > safeY) {
        setPosition({ ...position, y: Math.max(MARGIN + GLASS_PANEL_HEIGHT, safeY) });
      }
    }
  }, [keyboardHeight, isExpanded]);

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
          onSend?.(audioBlob);
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

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded]);
  
  // Click outside to close
  useEffect(() => {
    if (!isExpanded) return;
    
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isExpanded]);

  // Get current bounds based on expanded state
  const getBounds = useCallback(() => {
    if (typeof window === 'undefined') {
      return { minX: MARGIN, maxX: 500, minY: MARGIN, maxY: 500 };
    }
    
    const width = isExpanded ? EXPANDED_WIDTH : BUBBLE_SIZE;
    const height = isExpanded ? EXPANDED_HEIGHT : BUBBLE_SIZE;
    const topSpace = isExpanded ? GLASS_PANEL_HEIGHT + 20 : 0;
    
    return {
      minX: MARGIN,
      maxX: Math.max(MARGIN, window.innerWidth - width - MARGIN),
      minY: MARGIN + topSpace,
      maxY: Math.max(MARGIN + topSpace, window.innerHeight - height - BOTTOM_MARGIN)
    };
  }, [isExpanded]);

  // Clamp position to keep within screen bounds
  const clampPosition = useCallback((x: number, y: number) => {
    const bounds = getBounds();
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, y))
    };
  }, [getBounds]);

  // Track the actual rendered position
  const [renderPos, setRenderPos] = useState({ x: position.x, y: position.y });
  
  // Update render position when position changes
  useEffect(() => {
    const clamped = clampPosition(position.x, position.y);
    setRenderPos(clamped);
  }, [position.x, position.y, clampPosition]);

  // Re-clamp when expanded state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const clamped = clampPosition(renderPos.x, renderPos.y);
      if (clamped.x !== renderPos.x || clamped.y !== renderPos.y) {
        setRenderPos(clamped);
        setPosition(clamped);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isExpanded, clampPosition]);

  // Tooltip visibility animation (show/hide cycle)
  useEffect(() => {
    // Clear any existing timer
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }

    if (mode !== "navigate" || isDragging || isExpanded) {
      setIsTooltipVisible(false);
      return;
    }

    // Cycle: show for 3 seconds, hide for 2 seconds, repeat
    const cycleTooltip = () => {
      setIsTooltipVisible(true);
      tooltipTimerRef.current = setTimeout(() => {
        setIsTooltipVisible(false);
        tooltipTimerRef.current = setTimeout(() => {
          cycleTooltip(); // Repeat cycle
        }, 2000);
      }, 3000);
    };

    // Start the cycle
    cycleTooltip();

    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
        tooltipTimerRef.current = null;
      }
    };
  }, [mode, isDragging, isExpanded]);

  // Calculate tooltip position and ball offset
  const getTooltipConfig = useCallback(() => {
    if (typeof window === 'undefined') {
      return { 
        side: 'right' as const, 
        tooltipX: 0, 
        ballOffsetX: 0,
        shouldShowLeft: false
      };
    }

    const screenWidth = window.innerWidth;
    const ballCenterX = renderPos.x + BUBBLE_SIZE / 2;
    const isOnRightSide = ballCenterX > screenWidth / 2;
    
    // Calculate if tooltip would go off screen
    let shouldShowLeft = false;
    let tooltipX = 0;
    let ballOffsetX = 0;

    if (isOnRightSide) {
      // Ball is on right side, show tooltip on left
      const tooltipRightEdge = renderPos.x - TOOLTIP_OFFSET;
      const tooltipLeftEdge = tooltipRightEdge - TOOLTIP_WIDTH;
      
      if (tooltipLeftEdge < MARGIN) {
        // Tooltip would go off screen, move ball inward
        const neededSpace = MARGIN - tooltipLeftEdge;
        const maxOffset = renderPos.x - MARGIN; // Don't move ball beyond left margin
        ballOffsetX = Math.max(-neededSpace, -maxOffset);
        tooltipX = 0;
      }
      shouldShowLeft = true;
    } else {
      // Ball is on left side, show tooltip on right
      const tooltipLeftEdge = renderPos.x + BUBBLE_SIZE + TOOLTIP_OFFSET;
      const tooltipRightEdge = tooltipLeftEdge + TOOLTIP_WIDTH;
      
      if (tooltipRightEdge > screenWidth - MARGIN) {
        // Tooltip would go off screen, move ball inward
        const neededSpace = tooltipRightEdge - (screenWidth - MARGIN);
        const maxOffset = (screenWidth - MARGIN) - (renderPos.x + BUBBLE_SIZE); // Don't move ball beyond right margin
        ballOffsetX = Math.min(neededSpace, maxOffset);
        tooltipX = 0;
      }
      shouldShowLeft = false;
    }

    return { 
      side: isOnRightSide ? 'right' : 'left' as const, 
      tooltipX, 
      ballOffsetX,
      shouldShowLeft
    };
  }, [renderPos.x, renderPos.y]);
  
  const handleDragStart = () => {
    if (navigator.vibrate) navigator.vibrate(8);
    setIsDragging(true);
  };

  const handleDragEnd = (_: any, info: { offset: { x: number; y: number } }) => {
    setIsDragging(false);
    setIsPressed(false);
    
    const newX = renderPos.x + info.offset.x;
    const newY = renderPos.y + info.offset.y;
    const clamped = clampPosition(newX, newY);
    
    setRenderPos(clamped);
    setPosition(clamped);
  };

  // Handle orb click based on mode
  const handleOrbClick = () => {
    if (navigator.vibrate) navigator.vibrate(15);
    if (mode === "navigate") {
      // Navigate to create-request page
      onNavigate?.();
    } else {
      // AI mode - expand the input
      setIsExpanded(true);
    }
  };

  const bounds = getBounds();

  if (!isVisible) return null;

  // Determine which icon to show
  const OrbIcon = mode === "ai" ? Sparkles : Plus;

  // Calculate tooltip configuration
  const tooltipConfig = getTooltipConfig();
  const ballOffsetX = isTooltipVisible && mode === "navigate" && !isDragging && !isExpanded 
    ? tooltipConfig.ballOffsetX 
    : 0;

  return (
    <motion.div
      ref={containerRef}
      drag
      dragControls={dragControls}
      dragConstraints={{
        left: bounds.minX,
        right: bounds.maxX,
        top: bounds.minY,
        bottom: bounds.maxY
      }}
      dragElastic={0.1}
      dragMomentum={false}
      dragTransition={{ 
        bounceStiffness: 300, 
        bounceDamping: 30
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTapStart={() => setIsPressed(true)}
      onTap={() => setIsPressed(false)}
      onTapCancel={() => setIsPressed(false)}
      initial={false}
      animate={{
        x: renderPos.x + ballOffsetX,
        y: renderPos.y,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
        mass: 0.8
      }}
      style={{ position: 'fixed', left: 0, top: 0 }}
      className="z-[100] pointer-events-auto"
    >
      {/* Floating Animation Wrapper */}
      <motion.div
        animate={!isExpanded && !isDragging ? {
          y: [0, -6, 0],
        } : { y: 0 }}
        transition={!isExpanded && !isDragging ? {
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        } : { duration: 0.2 }}
      >
        {/* Glass Panel - AI Messages (only in AI mode) */}
        <AnimatePresence>
          {mode === "ai" && isExpanded && (
            <GlassPanel messages={aiMessages} isVisible={isExpanded} isLoading={isLoading} />
          )}
        </AnimatePresence>

        {/* "Create Request" Tooltip - only in navigate mode when not dragging */}
        <AnimatePresence>
          {mode === "navigate" && !isDragging && !isExpanded && isTooltipVisible && (
            <motion.div
              initial={{ opacity: 0, x: tooltipConfig.shouldShowLeft ? 20 : -20, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                x: tooltipConfig.tooltipX, 
                scale: 1 
              }}
              exit={{ 
                opacity: 0, 
                x: tooltipConfig.shouldShowLeft ? 10 : -10, 
                scale: 0.8 
              }}
              transition={{ 
                duration: 0.4, 
                ease: [0.16, 1, 0.3, 1] // Custom easing for smoothness
              }}
              className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap bg-white/95 dark:bg-[#1a1a24]/95 backdrop-blur-md text-primary px-3 py-1.5 rounded-full text-[11px] font-medium shadow-xl border border-primary/20 pointer-events-none z-50 flex items-center gap-1.5 ${
                tooltipConfig.shouldShowLeft 
                  ? 'right-full mr-3' 
                  : 'left-full ml-3'
              }`}
              style={{
                // Prevent tooltip from going off screen
                maxWidth: typeof window !== 'undefined' 
                  ? `${Math.min(TOOLTIP_WIDTH, window.innerWidth - MARGIN * 2)}px` 
                  : 'auto'
              }}
            >
              {tooltipConfig.shouldShowLeft ? (
                <>
                  <ArrowRight size={12} className="animate-bounce-x-right" />
                  <span>أنشئ طلب</span>
                </>
              ) : (
                <>
                  <span>أنشئ طلب</span>
                  <ArrowLeft size={12} className="animate-bounce-x" />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Soft Animated Halo - Like a real glowing ball */}
        {!isExpanded && (
          <>
            {/* Ground Shadow */}
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 w-10 h-2 bg-black/15 rounded-full blur-sm"
              style={{ bottom: -8 }}
              animate={{
                scale: isDragging ? 0.6 : [1, 0.9, 1],
                opacity: isDragging ? 0.1 : [0.2, 0.15, 0.2],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Soft Outer Halo - Breathing Effect */}
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
            
            {/* Inner Halo Ring */}
            <motion.div
              className="absolute -inset-2 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(30,150,140,0.3) 0%, transparent 60%)",
                filter: "blur(4px)",
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.5, 0.7, 0.5],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: 0.5
              }}
            />
            
            {/* Ping Ring - Pulsing border effect */}
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
            
            {/* Subtle Shine Arc */}
            <motion.div
              className="absolute top-1 left-1/4 right-1/4 h-3 rounded-full pointer-events-none"
              style={{
                background: "linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)",
                filter: "blur(2px)",
              }}
              animate={{
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            />
          </>
        )}

        {/* Main Input Container */}
        <motion.div
          layout
          className={`relative rounded-full ${
            isExpanded
              ? "bg-card border border-primary/30 shadow-xl"
              : "bg-gradient-to-br from-primary via-primary to-teal-600"
          }`}
          style={{
            borderRadius: isExpanded ? "28px" : "50%",
            boxShadow: !isExpanded 
              ? "0 10px 35px rgba(30,150,140,0.45), 0 5px 18px rgba(30,150,140,0.35), inset 0 -2px 6px rgba(0,0,0,0.1), inset 0 2px 6px rgba(255,255,255,0.2)"
              : "0 8px 32px rgba(0,0,0,0.15)"
          }}
          animate={{
            width: isExpanded ? EXPANDED_WIDTH : BUBBLE_SIZE,
            height: isExpanded ? EXPANDED_HEIGHT : BUBBLE_SIZE,
            scale: isPressed && !isExpanded ? 0.85 : isDragging && !isExpanded ? 1.1 : 1,
            rotate: isDragging && !isExpanded ? [0, 5, -5, 0] : 0,
          }}
          whileHover={!isExpanded ? { 
            scale: 1.05,
          } : {}}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
            scale: { type: "spring", stiffness: 600, damping: 15 }
          }}
        >
          {/* Inner Glow/Shine Effect */}
          {!isExpanded && (
            <motion.div
              className="absolute inset-0 rounded-full overflow-hidden"
              initial={false}
            >
              {/* Top shine */}
              <motion.div
                className="absolute top-1 left-1/4 right-1/4 h-4 bg-gradient-to-b from-white/30 to-transparent rounded-full blur-sm"
              />
              {/* Animated glow pulse */}
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  boxShadow: [
                    "inset 0 0 15px rgba(255,255,255,0.1)",
                    "inset 0 0 25px rgba(255,255,255,0.2)",
                    "inset 0 0 15px rgba(255,255,255,0.1)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          )}

          {/* Collapsed State - Icon */}
          <AnimatePresence mode="popLayout">
            {!isExpanded ? (
              <motion.button
                key="collapsed"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2, type: "spring", stiffness: 500, damping: 30 }}
                onClick={handleOrbClick}
                className="absolute inset-0 flex items-center justify-center text-white z-10"
              >
                <motion.div
                  animate={mode === "ai" ? { 
                    rotate: [0, 5, -5, 0],
                  } : {
                    rotate: [0, 90, 90, 0],
                  }}
                  transition={mode === "ai" ? { 
                    duration: 4, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  } : {
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 10,
                    ease: "easeInOut"
                  }}
                >
                  <OrbIcon size={26} strokeWidth={2} />
                </motion.div>
              </motion.button>
            ) : (
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="flex items-center h-full px-2 gap-1 rounded-full overflow-hidden"
              >
                {/* Drag Handle */}
                <button
                  onPointerDown={(e) => dragControls.start(e)}
                  className="p-2 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
                >
                  <GripVertical size={18} />
                </button>

                {/* Text Input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => onInputChange?.(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSend?.();
                    }
                  }}
                  placeholder="اكتب طلبك هنا..."
                  className="flex-1 bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground/50 text-right min-w-0"
                  dir="rtl"
                />

                {/* Mic Button with Recording Animation */}
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
                    className={`relative p-2 rounded-full transition-colors z-10 ${
                      isRecording
                        ? "bg-red-500 text-white"
                        : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                    }`}
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    title="اضغط مع الاستمرار للتسجيل"
                  >
                    <Mic size={18} />
                  </button>
                  {/* Recording Time */}
                  {isRecording && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
                    >
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </motion.div>
                  )}
                </div>

                {/* Send Button */}
                <motion.button
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(15);
                    onSend?.();
                  }}
                  disabled={!inputValue.trim() || isLoading}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    inputValue.trim()
                      ? "bg-primary text-white shadow-md"
                      : "bg-muted text-muted-foreground"
                  }`}
                  whileHover={inputValue.trim() ? { scale: 1.05 } : {}}
                  whileTap={inputValue.trim() ? { scale: 0.95 } : {}}
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={16} className="-rotate-90" />
                  )}
                </motion.button>

                {/* Close Button */}
                <button
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(10);
                    setIsExpanded(false);
                  }}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default GlobalFloatingOrb;

