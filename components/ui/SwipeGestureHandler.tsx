import React, { useRef, useEffect } from "react";

interface SwipeGestureHandlerProps {
  children: React.ReactNode;
  isSidebarOpen: boolean;
  onCloseSidebar: () => void;
  onOpenSidebar?: () => void;
  enabled?: boolean;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const hasFiredRef = useRef(false);
  
  const directionDecidedRef = useRef(false);
  const isHorizontalRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    // منطقة الفتح: 65% من الشاشة من اليمين
    const getOpenSwipeZone = () => window.innerWidth * 0.65;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const target = e.target as HTMLElement;
      
      // ⚡ تجاهل اللمسات على الأزرار والعناصر التفاعلية
      if (target.closest('button, a, input, textarea, select, [role="button"], [data-no-swipe]')) {
        startXRef.current = null;
        startYRef.current = null;
        return;
      }
      
      // ⚡ تجاهل اللمسات في منطقة الـ header (أول 80px من الأعلى)
      if (touch.clientY < 80) {
        startXRef.current = null;
        startYRef.current = null;
        return;
      }
      
      // تحديد المنطقة الصالحة:
      // - إذا السايدبار مفتوح: كل الشاشة صالحة للإغلاق (يتعامل معها MobileOverlay)
      // - إذا السايدبار مغلق: منطقة اليمين فقط للفتح
      const touchFromRight = window.innerWidth - touch.clientX;
      const isInOpenZone = touchFromRight <= getOpenSwipeZone();
      
      if (!isSidebarOpen && !isInOpenZone) {
        startXRef.current = null;
        startYRef.current = null;
        return;
      }
      
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      hasFiredRef.current = false;
      directionDecidedRef.current = false;
      isHorizontalRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startXRef.current === null || startYRef.current === null || hasFiredRef.current) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      
      // تحديد اتجاه السحب
      if (!directionDecidedRef.current) {
        if (absDeltaX > 8 || absDeltaY > 8) {
          directionDecidedRef.current = true;
          isHorizontalRef.current = absDeltaX >= absDeltaY;
          
          if (isHorizontalRef.current) {
            if (navigator.vibrate) navigator.vibrate(5);
          }
          
          if (!isHorizontalRef.current) {
            // السحب عمودي - نتجاهل
            startXRef.current = null;
            startYRef.current = null;
            return;
          }
        } else {
          return;
        }
      }
      
      if (!isHorizontalRef.current) return;
      
      // ✅ نفس منطق المقبض: نفتح/نغلق مباشرة عند الوصول للعتبة (50px)
      const threshold = 50;
      
      if (!isSidebarOpen && onOpenSidebar) {
        // الفتح: السحب لليسار (deltaX < 0)
        if (deltaX < -threshold) {
          hasFiredRef.current = true;
          if (navigator.vibrate) navigator.vibrate(15);
          onOpenSidebar();
        }
      } else if (isSidebarOpen) {
        // الإغلاق: السحب لليمين (deltaX > 0)
        if (deltaX > threshold) {
          hasFiredRef.current = true;
          if (navigator.vibrate) navigator.vibrate(10);
          onCloseSidebar();
        }
      }
    };

    const handleTouchEnd = () => {
      startXRef.current = null;
      startYRef.current = null;
      directionDecidedRef.current = false;
      isHorizontalRef.current = false;
      hasFiredRef.current = false;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [enabled, isSidebarOpen, sidebarWidth, onOpenSidebar, onCloseSidebar]);

  return (
    <div 
      ref={containerRef}
      className="h-full w-full"
      style={{ touchAction: 'pan-y pinch-zoom' }}
    >
      {children}
    </div>
  );
};

export default SwipeGestureHandler;
