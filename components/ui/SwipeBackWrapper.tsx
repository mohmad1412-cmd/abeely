import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface SwipeBackWrapperProps {
  children: React.ReactNode;
  onBack: () => void;
  enabled?: boolean;
  edgeWidth?: number; // Width of the edge zone where swipe can start (default 30px)
  threshold?: number; // Distance needed to trigger back (default 100px)
  className?: string;
}

export const SwipeBackWrapper: React.FC<SwipeBackWrapperProps> = ({
  children,
  onBack,
  enabled = true,
  edgeWidth = 30,
  threshold = 100,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchCurrentX = useRef<number>(0);
  const isSwipingRef = useRef<boolean>(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isActiveSwiping, setIsActiveSwiping] = useState(false);
  const [willTrigger, setWillTrigger] = useState(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // Check if touch started from the right edge (RTL - swipe from right to left)
    const touchX = touch.clientX;
    const rightEdgeStart = containerRect.right - edgeWidth;
    
    // Check if we're in the edge zone
    if (touchX >= rightEdgeStart) {
      // Check if this element or its parent has data-no-swipe attribute
      const target = e.target as HTMLElement;
      if (target.closest('[data-no-swipe="true"]')) {
        return;
      }
      
      touchStartX.current = touchX;
      touchStartY.current = touch.clientY;
      touchCurrentX.current = touchX;
      isSwipingRef.current = false;
    }
  }, [enabled, edgeWidth]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touch = e.touches[0];
    const deltaX = touchStartX.current - touch.clientX; // Negative for right-to-left
    const deltaY = Math.abs(touch.clientY - touchStartY.current);

    // If vertical movement is greater, cancel swipe (user is scrolling)
    if (!isSwipingRef.current && deltaY > 20 && deltaY > Math.abs(deltaX)) {
      touchStartX.current = null;
      touchStartY.current = null;
      setSwipeProgress(0);
      setIsActiveSwiping(false);
      return;
    }

    // Only activate swiping if horizontal movement is significant
    if (!isSwipingRef.current && deltaX > 15) {
      isSwipingRef.current = true;
      setIsActiveSwiping(true);
      // Haptic feedback at start
      if (navigator.vibrate) navigator.vibrate(8);
    }

    if (isSwipingRef.current) {
      e.preventDefault(); // Prevent scrolling while swiping
      touchCurrentX.current = touch.clientX;
      
      // Calculate progress (0 to 1)
      const progress = Math.min(1, Math.max(0, deltaX / threshold));
      setSwipeProgress(progress);
      
      // Check if will trigger
      const willTriggerNow = progress >= 1;
      if (willTriggerNow !== willTrigger) {
        setWillTrigger(willTriggerNow);
        // Haptic feedback when reaching threshold
        if (willTriggerNow && navigator.vibrate) {
          navigator.vibrate([15, 30, 15]);
        }
      }
    }
  }, [threshold, willTrigger]);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null) return;

    if (isSwipingRef.current && swipeProgress >= 1) {
      // Trigger back action
      if (navigator.vibrate) navigator.vibrate(25);
      onBack();
    }

    // Reset state
    touchStartX.current = null;
    touchStartY.current = null;
    isSwipingRef.current = false;
    setSwipeProgress(0);
    setIsActiveSwiping(false);
    setWillTrigger(false);
  }, [swipeProgress, onBack]);

  const handleTouchCancel = useCallback(() => {
    touchStartX.current = null;
    touchStartY.current = null;
    isSwipingRef.current = false;
    setSwipeProgress(0);
    setIsActiveSwiping(false);
    setWillTrigger(false);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {children}
      
      {/* Swipe Indicator - appears from right edge */}
      <AnimatePresence>
        {isActiveSwiping && (
          <>
            {/* Edge glow effect */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ 
                opacity: swipeProgress * 0.8, 
                x: 0,
              }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed top-0 bottom-0 right-0 w-24 pointer-events-none z-[9998]"
              style={{
                background: `linear-gradient(to left, rgba(30, 150, 140, ${swipeProgress * 0.3}) 0%, transparent 100%)`,
              }}
            />
            
            {/* Swipe indicator circle with arrow */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, x: 50 }}
              animate={{ 
                opacity: 1, 
                scale: willTrigger ? 1.1 : 0.9 + swipeProgress * 0.2,
                x: -swipeProgress * threshold * 0.6,
              }}
              exit={{ opacity: 0, scale: 0.5, x: 50 }}
              transition={{ 
                duration: 0.15, 
                ease: "easeOut",
                scale: { type: "spring", stiffness: 500, damping: 30 }
              }}
              className="fixed top-1/2 right-2 -translate-y-1/2 pointer-events-none z-[9999]"
            >
              <motion.div 
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-150 ${
                  willTrigger 
                    ? "bg-primary shadow-primary/50" 
                    : "bg-card/95 backdrop-blur-xl border border-border"
                }`}
                animate={{
                  boxShadow: willTrigger 
                    ? "0 0 30px rgba(30, 150, 140, 0.6), 0 10px 40px rgba(30, 150, 140, 0.4)"
                    : "0 4px 20px rgba(0, 0, 0, 0.15)",
                }}
              >
                <motion.div
                  animate={{ 
                    x: willTrigger ? [0, 3, 0] : 0,
                    rotate: swipeProgress * 180,
                  }}
                  transition={{
                    x: { repeat: willTrigger ? Infinity : 0, duration: 0.5 },
                    rotate: { duration: 0.3, ease: "easeOut" }
                  }}
                >
                  <ArrowRight 
                    size={24} 
                    strokeWidth={2.5}
                    className={`transition-colors duration-150 ${
                      willTrigger ? "text-white" : "text-primary"
                    }`}
                  />
                </motion.div>
              </motion.div>
              
              {/* Progress ring */}
              <svg 
                className="absolute inset-0 w-14 h-14 -rotate-90"
                viewBox="0 0 56 56"
              >
                <circle
                  cx="28"
                  cy="28"
                  r="25"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className={`transition-colors duration-150 ${
                    willTrigger ? "text-white/50" : "text-primary/30"
                  }`}
                  style={{
                    strokeDasharray: `${swipeProgress * 157} 157`,
                  }}
                />
              </svg>
            </motion.div>
            
            {/* Hint text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ 
                opacity: swipeProgress > 0.3 ? 1 : 0,
                y: 0,
              }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="fixed top-1/2 right-20 -translate-y-1/2 pointer-events-none z-[9999]"
              style={{
                transform: `translateY(-50%) translateX(${-swipeProgress * threshold * 0.4}px)`,
              }}
            >
              <motion.span 
                className={`text-sm font-bold whitespace-nowrap transition-colors duration-150 ${
                  willTrigger ? "text-primary" : "text-muted-foreground"
                }`}
                animate={{
                  scale: willTrigger ? 1.05 : 1,
                }}
              >
                {willTrigger ? "أفلت للرجوع" : "اسحب للرجوع"}
              </motion.span>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

