import React from "react";
import { motion, LayoutGroup } from "framer-motion";

interface UnifiedFilterIslandProps {
  children: React.ReactNode;
  className?: string;
  hasActiveFilters?: boolean; // للتحكم في padding-bottom
  isActive?: boolean; // هل الصفحة نشطة حالياً
  autoWidth?: boolean; // عرض تلقائي حسب المحتوى (للـ FloatingFilterIsland)
  isSearchOpen?: boolean; // هل البحث مفتوح (لتغيير عرض الجزيرة)
}

export const UnifiedFilterIsland: React.FC<UnifiedFilterIslandProps> = ({
  children,
  className = "",
  hasActiveFilters = false,
  isActive = true,
  autoWidth = false,
  isSearchOpen = false,
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
        style={{ paddingTop: 12, paddingLeft: 16, paddingRight: 16, backgroundColor: 'transparent' }}
      >
        {/* Switch Container - Filter button (left) + Tabs/Search (center) + Search button (right) */}
        <motion.div 
          layout
          layoutId="unified-filter-island-container"
          className={`${autoWidth ? 'inline-flex' : 'inline-flex'} items-center ${autoWidth ? 'justify-start' : 'justify-between'} bg-card/95 backdrop-blur-xl rounded-full p-1.5 gap-1.5 border border-border shadow-lg ${autoWidth ? '' : isSearchOpen ? 'max-w-[90vw] min-w-[320px]' : 'max-w-[350px] min-w-[28px]'}`}
          style={autoWidth ? undefined : isSearchOpen ? { maxWidth: '90vw', minWidth: '320px' } : { maxWidth: '350px', minWidth: '28px' }}
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

