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
}

export const SwipeGestureHandler: React.FC<SwipeGestureHandlerProps> = ({
  children,
  isSidebarOpen,
  onCloseSidebar,
  onOpenSidebar,
  enabled = true,
  sidebarWidth = 340,
}) => {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const hasFiredRef = useRef(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipingToOpen, setIsSwipingToOpen] = useState(false);
  const [isSwipingToClose, setIsSwipingToClose] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    hasFiredRef.current = false;
    setSwipeOffset(0);
    setIsSwipingToOpen(false);
    setIsSwipingToClose(false);
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || startXRef.current === null || startYRef.current === null || hasFiredRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startXRef.current; // موجب = سحب لليمين، سالب = سحب لليسار
    const deltaY = Math.abs(touch.clientY - startYRef.current);
    
    // التأكد من أن الحركة أفقية بشكل أساسي
    if (deltaY > 50) {
      startXRef.current = null;
      setSwipeOffset(0);
      setIsSwipingToOpen(false);
      setIsSwipingToClose(false);
      return;
    }
    
    if (isSidebarOpen) {
      // السايد بار مفتوح - السحب لليسار للإغلاق
      if (deltaX < 0) {
        const offset = Math.min(Math.abs(deltaX), sidebarWidth);
        setSwipeOffset(-offset);
        setIsSwipingToClose(true);
        setIsSwipingToOpen(false);
        
        // إذا تجاوز السحب 80 بكسل = إغلاق
        if (offset > 80) {
          hasFiredRef.current = true;
          if (navigator.vibrate) navigator.vibrate(10);
          onCloseSidebar();
          setSwipeOffset(0);
          setIsSwipingToClose(false);
          startXRef.current = null;
        }
      }
    } else {
      // السايد بار مغلق - السحب من الحافة اليمنى لليسار للفتح
      // فقط إذا بدأ السحب من الحافة اليمنى (آخر 50 بكسل)
      if (startXRef.current > window.innerWidth - 50 && deltaX < 0 && onOpenSidebar) {
        const offset = Math.min(Math.abs(deltaX), sidebarWidth);
        setSwipeOffset(offset);
        setIsSwipingToOpen(true);
        setIsSwipingToClose(false);
        
        // إذا تجاوز السحب 80 بكسل = فتح
        if (offset > 80) {
          hasFiredRef.current = true;
          if (navigator.vibrate) navigator.vibrate(10);
          onOpenSidebar();
          setSwipeOffset(0);
          setIsSwipingToOpen(false);
          startXRef.current = null;
        }
      }
    }
  }, [enabled, isSidebarOpen, onCloseSidebar, onOpenSidebar, sidebarWidth]);

  const handleTouchEnd = useCallback(() => {
    startXRef.current = null;
    startYRef.current = null;
    hasFiredRef.current = false;
    setSwipeOffset(0);
    setIsSwipingToOpen(false);
    setIsSwipingToClose(false);
  }, []);

  return (
    <>
      {/* Swipe preview overlay - يظهر أثناء السحب للفتح */}
      {isSwipingToOpen && swipeOffset > 0 && (
        <div 
          className="fixed inset-0 z-[85] pointer-events-none md:hidden"
          style={{
            background: `rgba(0, 0, 0, ${Math.min(swipeOffset / sidebarWidth * 0.5, 0.5)})`,
            transition: 'none'
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
            transition: 'none'
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
