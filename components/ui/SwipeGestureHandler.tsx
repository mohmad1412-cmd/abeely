import React, { useRef, useCallback } from "react";

interface SwipeGestureHandlerProps {
  children: React.ReactNode;
  // هل السايد بار مفتوح؟
  isSidebarOpen: boolean;
  // دالة إغلاق السايد بار
  onCloseSidebar: () => void;
  // تمكين/تعطيل السحب
  enabled?: boolean;
}

export const SwipeGestureHandler: React.FC<SwipeGestureHandlerProps> = ({
  children,
  isSidebarOpen,
  onCloseSidebar,
  enabled = true,
}) => {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const hasFiredRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // فقط عندما يكون السايد بار مفتوح
    if (!enabled || !isSidebarOpen) return;
    
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    hasFiredRef.current = false;
  }, [enabled, isSidebarOpen]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !isSidebarOpen || startXRef.current === null || startYRef.current === null || hasFiredRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = startXRef.current - touch.clientX; // موجب = سحب لليسار
    const deltaY = Math.abs(touch.clientY - startYRef.current);
    
    // التأكد من أن الحركة أفقية بشكل أساسي
    if (deltaY > 50) {
      startXRef.current = null;
      return;
    }
    
    // إذا تجاوز السحب لليسار 60 بكسل = إغلاق السايد بار
    if (deltaX > 60) {
      hasFiredRef.current = true;
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      onCloseSidebar();
      startXRef.current = null;
    }
  }, [enabled, isSidebarOpen, onCloseSidebar]);

  const handleTouchEnd = useCallback(() => {
    startXRef.current = null;
    startYRef.current = null;
    hasFiredRef.current = false;
  }, []);

  return (
    <div 
      className="h-full w-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

export default SwipeGestureHandler;
