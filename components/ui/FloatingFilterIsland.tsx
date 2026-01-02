import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, CheckCircle } from "lucide-react";

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
}

export const FloatingFilterIsland: React.FC<FloatingFilterIslandProps> = ({
  filters,
  scrollContainerRef,
  className = "",
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
      
      // Calculate horizontal position - prevent overflow on right side
      const spaceOnRight = viewportWidth - rect.left;
      if (spaceOnRight < dropdownWidth + margin) {
        // Not enough space on right, align to right edge with margin
        style.right = margin;
        style.left = 'auto';
      } else {
        // Enough space, use left positioning
        style.left = 0;
        style.right = 'auto';
      }
      
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
      className={`sticky top-0 z-30 flex justify-center px-4 pt-3 pb-2 ${className}`}
    >
      <motion.div
        className="flex items-center justify-between bg-card/95 backdrop-blur-xl rounded-full p-1.5 border border-border relative mx-auto shadow-lg origin-center w-auto"
        animate={{
          scale: isCompact ? 0.95 : 1,
          opacity: isCompact ? 0.95 : 1,
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{
          minWidth: 280,
          maxWidth: 400,
          gap: isCompact ? 4 : 8,
        }}
      >
        {filters.map((filter, idx) => (
          <React.Fragment key={filter.id}>
            {idx > 0 && (
              <div 
                className="w-[1px] bg-border/60 transition-all duration-200"
                style={{ 
                  height: isCompact ? 16 : 24,
                  opacity: isCompact ? 0.4 : 0.6 
                }}
              />
            )}
            <div
              ref={(el) => {
                if (el) dropdownRefs.current.set(filter.id, el);
              }}
              className="relative flex-1"
            >
              <motion.button
                onClick={() => toggleDropdown(filter.id)}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center justify-between gap-2 px-3 h-10 rounded-full transition-all w-full ${
                  openDropdownId === filter.id
                    ? "bg-primary/15 text-primary"
                    : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-primary">{filter.icon}</span>
                  <span 
                    className="text-xs font-bold whitespace-nowrap"
                  >
                    {filter.getLabel()}
                  </span>
                  {filter.showCount !== false && filter.options.find(o => o.value === filter.value)?.count !== undefined && (
                    <span 
                      className="inline-flex items-center justify-center min-w-[1rem] h-4 rounded-full px-1 text-[9px] font-bold bg-primary text-white transition-transform duration-200"
                      style={{ transform: isCompact ? 'scale(0.9)' : 'scale(1)' }}
                    >
                      {filter.options.find(o => o.value === filter.value)?.count}
                    </span>
                  )}
                </div>
                <motion.div
                  animate={{ rotate: openDropdownId === filter.id ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={14} className="text-muted-foreground" />
                </motion.div>
              </motion.button>
            
            {/* Dropdown Menu */}
            <AnimatePresence>
              {openDropdownId === filter.id && (
                <>
                  {/* Backdrop - blocks scroll */}
                  <div
                    className="fixed inset-0 z-40 touch-none"
                    onClick={() => setOpenDropdownId(null)}
                    onWheel={(e) => e.preventDefault()}
                    onTouchMove={(e) => e.preventDefault()}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute w-64 bg-card dark:bg-card border border-border rounded-3xl shadow-2xl z-50 overflow-hidden"
                    style={{
                      ...dropdownStyle,
                      marginTop: dropdownStyle.bottom ? 0 : 8, // mt-2 only when below
                      maxHeight: 'calc(100vh - 120px)',
                      overflowY: 'auto',
                    }}
                  >
                    <div className="p-3">
                      {filter.options.map((option, optIdx) => (
                        <React.Fragment key={option.value}>
                          {optIdx > 0 && <div className="my-1.5 border-t border-white/20 dark:border-slate-700/50" />}
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(10);
                              filter.onChange(option.value);
                              setOpenDropdownId(null);
                            }}
                            className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                              filter.value === option.value 
                                ? "bg-primary/15 text-primary dark:bg-primary/20" 
                                : "text-foreground hover:bg-white/50 dark:hover:bg-slate-800/50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {option.icon && <span className={filter.value === option.value ? "text-primary" : "text-muted-foreground"}>{option.icon}</span>}
                              <span>{option.label}</span>
                            </div>
                            {option.count !== undefined ? (
                              <span
                                className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[11px] font-bold ${
                                  filter.value === option.value
                                    ? "bg-primary text-white"
                                    : "bg-primary/10 text-primary"
                                }`}
                              >
                                {option.count}
                              </span>
                            ) : filter.value === option.value ? (
                              <CheckCircle size={14} className="text-primary" />
                            ) : null}
                          </motion.button>
                        </React.Fragment>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
};

