import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, CheckCircle } from "lucide-react";
import { UnifiedFilterIsland } from "./UnifiedFilterIsland";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface FilterDropdownConfig {
  id: string;
  icon: React.ReactNode;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  getLabel: () => string;
  showCount?: boolean;
}

interface FloatingFilterIslandProps {
  filters: FilterDropdownConfig[];
  scrollContainerRef?: React.RefObject<HTMLElement>;
  className?: string;
  isActive?: boolean;
}

export const FloatingFilterIsland: React.FC<FloatingFilterIslandProps> = ({
  filters,
  scrollContainerRef,
  className = "",
  isActive = true,
}) => {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const islandRef = useRef<HTMLDivElement>(null);
  const dropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Simple compact state without complex springs
  const [isCompact, setIsCompact] = useState(false);
  const lastScrollY = useRef(0);
  
  // Track scroll position with debounce to prevent jitter
  useEffect(() => {
    const container = scrollContainerRef?.current || document.querySelector('#main-scroll-container .overflow-auto') as HTMLElement;
    if (!container) return;
    
    let ticking = false;
    
    const handleScroll = () => {
      if (ticking) return;
      
      ticking = true;
      requestAnimationFrame(() => {
        const currentScrollY = container.scrollTop;
        const diff = currentScrollY - lastScrollY.current;
        
        // Only update if significant scroll happened
        if (Math.abs(diff) > 10) {
          const shouldBeCompact = currentScrollY > 80 && diff > 0;
          const shouldExpand = diff < -10;
          
          if (shouldBeCompact && !isCompact) {
            setIsCompact(true);
          } else if (shouldExpand && isCompact) {
            setIsCompact(false);
          }
          
          lastScrollY.current = currentScrollY;
        }
        
        ticking = false;
      });
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef, isCompact]);
  
  // Calculate dropdown position to prevent overflow
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  
  useEffect(() => {
    if (!openDropdownId) {
      setDropdownStyle({});
      return;
    }
    
    const buttonElement = dropdownRefs.current.get(openDropdownId);
    if (!buttonElement) return;
    
    const updateDropdownPosition = () => {
      const rect = buttonElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const dropdownWidth = 256; // w-64 = 256px
      const margin = 16;
      
      const style: React.CSSProperties = {};
      
      // Get parent container (the relative container)
      const parentContainer = buttonElement.offsetParent as HTMLElement;
      const parentRect = parentContainer?.getBoundingClientRect() || { left: 0, width: 0 };
      
      // Calculate button center relative to parent
      const buttonCenterX = rect.left + (rect.width / 2);
      const relativeLeft = buttonCenterX - parentRect.left;
      
      // Calculate dropdown position to center it under button
      let leftPos = relativeLeft - (dropdownWidth / 2);
      
      // Ensure dropdown doesn't overflow viewport
      const absoluteLeft = buttonCenterX - (dropdownWidth / 2);
      const maxLeft = viewportWidth - dropdownWidth - margin;
      const minLeft = margin;
      
      if (absoluteLeft > maxLeft) {
        // Align to right edge
        leftPos = (viewportWidth - margin - dropdownWidth) - parentRect.left;
      } else if (absoluteLeft < minLeft) {
        // Align to left edge
        leftPos = margin - parentRect.left;
      }
      
      // Use left positioning
      style.left = leftPos;
      style.right = 'auto';
      
      // Calculate vertical position - prevent overflow on bottom
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedDropdownHeight = 300; // approximate max height
      
      if (spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow) {
        // Show above button
        style.bottom = viewportHeight - rect.top + 8; // 8px = mt-2
        style.top = 'auto';
      } else {
        // Show below button (default)
        style.top = '100%';
        style.bottom = 'auto';
      }
      
      setDropdownStyle(style);
    };
    
    // Initial calculation
    updateDropdownPosition();
    
    // Recalculate on resize and scroll
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [openDropdownId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId) {
        const dropdownRef = dropdownRefs.current.get(openDropdownId);
        if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
          setOpenDropdownId(null);
        }
      }
    };
    
    if (openDropdownId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openDropdownId]);

  // Prevent body scroll when dropdown is open
  useEffect(() => {
    if (openDropdownId) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [openDropdownId]);

  const toggleDropdown = (id: string) => {
    if (navigator.vibrate) navigator.vibrate(10);
    setOpenDropdownId(openDropdownId === id ? null : id);
  };

  return (
    <div
      ref={islandRef}
      className={`${className}`}
    >
      <UnifiedFilterIsland isActive={isActive} autoWidth={true}>
        {filters.map((filter, idx) => (
          <React.Fragment key={filter.id}>
            {idx > 0 && (
              <div className="w-px h-6 bg-border/50" />
            )}
            <div
              ref={(el) => {
                if (el) dropdownRefs.current.set(filter.id, el);
              }}
              className="relative"
            >
              <motion.button
                onClick={() => toggleDropdown(filter.id)}
                whileTap={{ scale: 0.96 }}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-full transition-all whitespace-nowrap ${
                  openDropdownId === filter.id
                    ? "bg-primary/15 text-primary"
                    : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-primary">{filter.icon}</span>
                <span className="text-xs font-bold">
                  {filter.getLabel()}
                </span>
                {filter.showCount !== false && filter.options.find(o => o.value === filter.value)?.count !== undefined && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[10px] font-bold bg-primary text-white">
                    {filter.options.find(o => o.value === filter.value)?.count}
                  </span>
                )}
                <motion.div
                  animate={{ rotate: openDropdownId === filter.id ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={12} className="text-muted-foreground" />
                </motion.div>
              </motion.button>
            
            {/* Dropdown Menu */}
            <AnimatePresence>
              {openDropdownId === filter.id && (
                <>
                  {/* Backdrop - darkens screen and prevents interactions */}
                  <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] touch-none"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      setOpenDropdownId(null);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      setOpenDropdownId(null);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      setOpenDropdownId(null);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                    }}
                    onMouseUp={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      setOpenDropdownId(null);
                    }}
                    style={{ 
                      touchAction: "none", // منع scroll والسلوك الافتراضي للـ touch events
                      pointerEvents: "auto"
                    }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute w-64 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                    style={{
                      ...dropdownStyle,
                      marginTop: dropdownStyle.bottom ? 0 : 8, // mt-2 only when below
                      maxHeight: 'calc(100vh - 120px)',
                      overflowY: 'auto',
                    }}
                  >
                    <div className="p-2 flex flex-col gap-1">
                      {filter.options.map((option) => (
                        <motion.button
                          key={option.value}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(10);
                            filter.onChange(option.value);
                            setOpenDropdownId(null);
                          }}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                            filter.value === option.value 
                              ? "bg-primary/15 text-primary border border-primary/20" 
                              : "text-foreground hover:bg-secondary/80 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 text-right">
                            {option.icon && <span className={filter.value === option.value ? "text-primary" : "text-muted-foreground"}>{option.icon}</span>}
                            <span className="font-bold">{option.label}</span>
                          </div>
                          {option.count !== undefined ? (
                            <span
                              className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 rounded-full px-2 text-[11px] font-bold ${
                                filter.value === option.value
                                  ? "bg-primary text-white"
                                  : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              {option.count}
                            </span>
                          ) : filter.value === option.value ? (
                            <CheckCircle size={16} className="text-primary" />
                          ) : null}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          </React.Fragment>
        ))}
      </UnifiedFilterIsland>
    </div>
  );
};

