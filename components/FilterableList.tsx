import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronDown, CheckCircle } from 'lucide-react';
import { UnifiedFilterIsland } from './ui/UnifiedFilterIsland';

interface FilterConfig {
  id: string;
  icon: React.ReactNode;
  options: Array<{ value: string; label: string; count?: number; icon?: React.ReactNode }>;
  value: string;
  onChange: (value: string) => void;
  getLabel: () => string;
  showCount?: boolean;
}

interface FilterableListProps<T> {
  items: T[];
  filterConfigs: FilterConfig[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isSearchOpen: boolean;
  onSearchToggle: () => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyState?: React.ReactNode;
  isActive?: boolean;
}

export function FilterableList<T>({
  items,
  filterConfigs,
  searchTerm,
  onSearchChange,
  isSearchOpen,
  onSearchToggle,
  renderItem,
  emptyState,
  isActive = true,
}: FilterableListProps<T>) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [openFilterDropdownId, setOpenFilterDropdownId] = useState<string | null>(null);
  const filterDropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openFilterDropdownId) {
        const dropdownRef = filterDropdownRefs.current.get(openFilterDropdownId);
        if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
          setOpenFilterDropdownId(null);
        }
      }
    };
    
    if (openFilterDropdownId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openFilterDropdownId]);

  useEffect(() => {
    if (openFilterDropdownId) {
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
  }, [openFilterDropdownId]);

  return (
    <div 
      ref={scrollContainerRef}
      className="h-full overflow-x-hidden container mx-auto max-w-6xl relative no-scrollbar overflow-y-auto"
    >
      <div className="sticky top-0 z-[60] overflow-visible">
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: '-50px',
            height: 'calc(100% + 100px)',
            background: `linear-gradient(to bottom,
              rgba(var(--background-rgb), 1) 0%,
              rgba(var(--background-rgb), 1) 60%,
              rgba(var(--background-rgb), 0.8) 75%,
              rgba(var(--background-rgb), 0) 100%
            )`,
            zIndex: -1,
          }}
        />
        <div
          className="absolute left-0 right-0 bottom-0 h-16 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(var(--background-rgb), 0), rgba(var(--background-rgb), 0.6), rgba(var(--background-rgb), 1))',
          }}
        />
        <div 
          className="flex flex-col overflow-visible origin-top"
          style={{ transform: 'scale(0.92) translateY(4px)' }}
        >
          <div className="px-4 pt-4 bg-transparent relative z-10">
            <UnifiedFilterIsland isActive={isActive} isSearchOpen={isSearchOpen || !!searchTerm}>
              <div className="flex-1 flex items-center relative min-w-0 overflow-visible">
                <AnimatePresence mode="popLayout">
                  {isSearchOpen || searchTerm ? (
                    <motion.div
                      key="search-input"
                      initial={{ x: 100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 100, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="flex items-center gap-1.5 flex-1 px-2 min-w-0 overflow-hidden relative"
                      dir="rtl"
                    >
                      {!searchTerm && (
                        <div className="absolute inset-0 flex items-center pointer-events-none pl-20 pr-2 overflow-hidden rtl">
                          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1 w-full">
                            <span className="shrink-0">ابحث</span>
                          </span>
                        </div>
                      )}
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder=""
                        dir="rtl"
                        className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-foreground py-2 text-right min-w-0 relative z-10 pl-20"
                        autoFocus
                        onBlur={() => {
                          setTimeout(() => {
                            if (!searchTerm) onSearchToggle();
                          }, 150);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            onSearchChange("");
                            onSearchToggle();
                          }
                        }}
                      />
                      {searchTerm && (
                        <motion.button
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          onClick={() => {
                            onSearchChange("");
                            searchInputRef.current?.focus();
                          }}
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors shrink-0"
                        >
                          <X size={14} strokeWidth={2.5} />
                        </motion.button>
                      )}
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.15 }}
                        onClick={() => {
                          onSearchChange("");
                          onSearchToggle();
                        }}
                        className="text-[11px] font-medium text-primary/70 hover:text-primary px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors shrink-0"
                      >
                        إلغاء
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="filter-dropdown"
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 40, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="flex items-center justify-center flex-1 relative min-w-0 gap-1.5"
                    >
                      {filterConfigs.map((filter, idx) => (
                        <React.Fragment key={filter.id}>
                          {idx > 0 && <div className="w-px h-6 bg-border/50" />}
                          <div
                            ref={(el) => {
                              if (el) filterDropdownRefs.current.set(filter.id, el);
                            }}
                            className="relative"
                          >
                            <motion.button
                              onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                setOpenFilterDropdownId(openFilterDropdownId === filter.id ? null : filter.id);
                              }}
                              whileTap={{ scale: 0.96 }}
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-full transition-all whitespace-nowrap ${
                                openFilterDropdownId === filter.id
                                  ? "bg-primary/15 text-primary"
                                  : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span className="text-primary">{filter.icon}</span>
                              <span className="text-xs font-bold">{filter.getLabel()}</span>
                              {filter.showCount !== false && filter.options.find(o => o.value === filter.value)?.count !== undefined && (
                                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-[10px] font-bold bg-primary text-white">
                                  {filter.options.find(o => o.value === filter.value)?.count}
                                </span>
                              )}
                              <motion.div
                                animate={{ rotate: openFilterDropdownId === filter.id ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronDown size={12} className="text-muted-foreground" />
                              </motion.div>
                            </motion.button>
                            
                            <AnimatePresence>
                              {openFilterDropdownId === filter.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40 touch-none"
                                    onClick={() => setOpenFilterDropdownId(null)}
                                    style={{
                                      touchAction: "none", // منع scroll والسلوك الافتراضي للـ touch events
                                    }}
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="absolute w-64 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden right-0 mt-2"
                                    style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
                                  >
                                    <div className="p-2 flex flex-col gap-1">
                                      {filter.options.map((option) => (
                                        <motion.button
                                          key={option.value}
                                          whileTap={{ scale: 0.98 }}
                                          onClick={() => {
                                            if (navigator.vibrate) navigator.vibrate(10);
                                            filter.onChange(option.value);
                                            setOpenFilterDropdownId(null);
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(10);
                  if (!isSearchOpen && !searchTerm) {
                    onSearchToggle();
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  }
                }}
                className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-colors shrink-0 bg-transparent active:scale-95 ${
                  isSearchOpen || searchTerm
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Search size={15} strokeWidth={2.5} />
              </button>
            </UnifiedFilterIsland>
          </div>
        </div>
      </div>

      <div className="px-4 pb-24">
        <div className="grid grid-cols-1 gap-6 min-h-[100px] pt-2">
          {items.length === 0 ? (
            emptyState || (
              <div className="flex flex-col items-center justify-center py-20 text-center min-h-[50vh]">
                <p className="text-muted-foreground">لا توجد عناصر</p>
              </div>
            )
          ) : (
            items.map((item, index) => renderItem(item, index))
          )}
        </div>
      </div>
    </div>
  );
}

