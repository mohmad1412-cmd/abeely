import React from "react";
import { motion, LayoutGroup } from "framer-motion";

interface UnifiedFilterIslandProps {
  children: React.ReactNode;
  className?: string;
  hasActiveFilters?: boolean; // للتحكم في padding-bottom
  isActive?: boolean; // هل الصفحة نشطة حالياً
  autoWidth?: boolean; // عرض تلقائي حسب المحتوى (للـ FloatingFilterIsland)
}

export const UnifiedFilterIsland: React.FC<UnifiedFilterIslandProps> = ({
  children,
  className = "",
  hasActiveFilters = false,
  isActive = true,
  autoWidth = false,
}) => {
  // إذا لم تكن الصفحة نشطة، لا نعرض الجزيرة
  if (!isActive) return null;

  return (
    <LayoutGroup id="unified-filter-island-group">
      <motion.div 
        layout
        layoutId="unified-filter-island-wrapper"
        initial={false}
        animate={{ 
          opacity: 1, 
          y: 0,
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 35,
          layout: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }
        }}
        className={`flex items-center justify-center overflow-visible w-full ${hasActiveFilters ? '' : 'pb-2'} ${className}`}
        style={{ paddingTop: 12, paddingLeft: 16, paddingRight: 16 }}
      >
        {/* Switch Container - Filter button (left) + Tabs/Search (center) + Search button (right) */}
        <motion.div 
          layout
          layoutId="unified-filter-island-container"
          className={`${autoWidth ? 'inline-flex' : 'flex'} items-center bg-card/95 backdrop-blur-xl rounded-full p-1 gap-0.5 border border-border shadow-lg max-w-[calc(100vw-32px)]`}
          style={autoWidth ? undefined : { minWidth: 280, maxWidth: 380 }}
          dir="rtl"
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 35,
            layout: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </LayoutGroup>
  );
};

