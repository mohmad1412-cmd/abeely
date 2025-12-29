import React, { useRef, useCallback, useState } from "react";

interface SwipeGestureHandlerProps {
  children: React.ReactNode;
  // هل السايد بار مفتوح؟
  isSidebarOpen: boolean;
  // دالة إغلاق السايد بار
  onCloseSidebar: () => void;
  // دالة فتح السايد بار
  onOpenSidebar?: () => void;
  // تمكين/تعطيل السحب
  enabled?: boolean;
  // عرض السايد بار (للتأثير البصري)
  sidebarWidth?: number;
  // دالة لتحديث موقع السايد بار أثناء السحب (للسلاسة)
  onSwipeProgress?: (offset: number, isOpening: boolean) => void;
}

export const SwipeGestureHandler: React.FC<SwipeGestureHandlerProps> = ({
  children,
  isSidebarOpen,
  onCloseSidebar,
  onOpenSidebar,
  enabled = true,
  sidebarWidth = 340,
  onSwipeProgress,
}) => {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const hasFiredRef = useRef(false);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const velocityRef = useRef<number>(0);
  const lastXRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipingToOpen, setIsSwipingToOpen] = useState(false);
  const [isSwipingToClose, setIsSwipingToClose] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    lastXRef.current = touch.clientX;
    lastTimeRef.current = Date.now();
    hasFiredRef.current = false;
    isHorizontalSwipeRef.current = null;
    velocityRef.current = 0;
    setSwipeOffset(0);
    setIsSwipingToOpen(false);
    setIsSwipingToClose(false);
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || startXRef.current === null || startYRef.current === null || hasFiredRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;
    
    // حساب السرعة
    const now = Date.now();
    const timeDelta = now - lastTimeRef.current;
    if (timeDelta > 0) {
      velocityRef.current = (touch.clientX - lastXRef.current) / timeDelta;
    }
    lastXRef.current = touch.clientX;
    lastTimeRef.current = now;
    
    // تحديد اتجاه السحب في أول حركة
    if (isHorizontalSwipeRef.current === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      if (!isHorizontalSwipeRef.current) {
        // سحب عمودي - تجاهل
        startXRef.current = null;
        return;
      }
    }
    
    if (!isHorizontalSwipeRef.current) return;
    
    if (isSidebarOpen) {
      // السايد بار مفتوح - السحب لليسار للإغلاق
      if (deltaX < 0) {
        const offset = Math.min(Math.abs(deltaX), sidebarWidth);
        setSwipeOffset(offset);
        setIsSwipingToClose(true);
        setIsSwipingToOpen(false);
        onSwipeProgress?.(offset, false);
      }
    } else {
      // السايد بار مغلق - السحب من الحافة اليمنى لليسار للفتح
      if (startXRef.current > window.innerWidth - 60 && deltaX < 0 && onOpenSidebar) {
        const offset = Math.min(Math.abs(deltaX), sidebarWidth);
        setSwipeOffset(offset);
        setIsSwipingToOpen(true);
        setIsSwipingToClose(false);
        onSwipeProgress?.(offset, true);
      }
    }
  }, [enabled, isSidebarOpen, onSwipeProgress, sidebarWidth, onOpenSidebar]);

  const handleTouchEnd = useCallback(() => {
    if (hasFiredRef.current || startXRef.current === null) {
      resetState();
      return;
    }
    
    const velocity = velocityRef.current;
    const threshold = sidebarWidth * 0.3; // 30% من العرض
    const velocityThreshold = 0.3; // pixels per ms
    
    if (isSwipingToClose && swipeOffset > 0) {
      // قرار الإغلاق: إذا تجاوز 30% أو السرعة عالية لليسار
      if (swipeOffset > threshold || velocity < -velocityThreshold) {
        hasFiredRef.current = true;
        if (navigator.vibrate) navigator.vibrate(10);
        onCloseSidebar();
      }
    } else if (isSwipingToOpen && swipeOffset > 0 && onOpenSidebar) {
      // قرار الفتح: إذا تجاوز 30% أو السرعة عالية لليسار
      if (swipeOffset > threshold || velocity < -velocityThreshold) {
        hasFiredRef.current = true;
        if (navigator.vibrate) navigator.vibrate(10);
        onOpenSidebar();
      }
    }
    
    resetState();
  }, [swipeOffset, isSwipingToClose, isSwipingToOpen, sidebarWidth, onCloseSidebar, onOpenSidebar]);
  
  const resetState = () => {
    startXRef.current = null;
    startYRef.current = null;
    isHorizontalSwipeRef.current = null;
    velocityRef.current = 0;
    setSwipeOffset(0);
    setIsSwipingToOpen(false);
    setIsSwipingToClose(false);
  };

  // حساب شفافية الخلفية
  const overlayOpacity = isSwipingToOpen 
    ? Math.min(swipeOffset / sidebarWidth * 0.5, 0.5)
    : isSwipingToClose 
      ? Math.max(0.5 - (swipeOffset / sidebarWidth * 0.5), 0)
      : 0;

  return (
    <>
      {/* Swipe preview overlay - يظهر أثناء السحب للفتح */}
      {isSwipingToOpen && swipeOffset > 0 && (
        <div 
          className="fixed inset-0 z-[85] pointer-events-none md:hidden"
          style={{
            background: `rgba(0, 0, 0, ${overlayOpacity})`,
            backdropFilter: `blur(${Math.min(swipeOffset / sidebarWidth * 4, 4)}px)`,
          }}
        />
      )}
      
      {/* Swipe preview for sidebar - يظهر preview للسايد بار أثناء السحب للفتح */}
      {isSwipingToOpen && swipeOffset > 0 && (
        <div 
          className="fixed inset-y-0 right-0 z-[86] bg-card border-l border-border shadow-2xl pointer-events-none md:hidden"
          style={{
            width: `${sidebarWidth}px`,
            transform: `translateX(${sidebarWidth - swipeOffset}px)`,
          }}
        />
      )}
      
      <div 
        className="h-full w-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </>
  );
};

export default SwipeGestureHandler;
