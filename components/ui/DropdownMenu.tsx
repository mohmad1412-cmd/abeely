import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  showDivider?: boolean;
  keepOpenOnClick?: boolean; // لا تغلق الـ dropdown عند النقر
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  items,
  align = 'left',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const touchHandledRef = useRef<boolean>(false);

  // Calculate position when opening
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 200; // approximate menu width
    const padding = 8;
    
    let left = align === 'left' 
      ? rect.left 
      : rect.right - menuWidth;
    
    // Ensure menu doesn't go off screen
    if (left < padding) left = padding;
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding;
    }
    
    setPosition({
      top: rect.bottom + 4,
      left,
    });
  }, [align]);

  // Toggle menu
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  }, [isOpen, updatePosition]);

  // Handle touch events separately to avoid double-trigger
  const handleTouchToggle = useCallback((e: React.TouchEvent) => {
    if (touchHandledRef.current) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    touchHandledRef.current = true;
    setTimeout(() => {
      touchHandledRef.current = false;
    }, 300);
    
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  }, [isOpen, updatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    // Small delay to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => updatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen, updatePosition]);

  const handleItemClick = (item: DropdownMenuItem) => {
    if (item.disabled) return;
    
    // إذا كان العنصر يريد البقاء مفتوحاً (مثل النسخ)، لا نغلق
    if (!item.keepOpenOnClick) {
      setIsOpen(false);
    }
    
    item.onClick();
  };

  return (
    <>
      <div 
        ref={triggerRef} 
        onClick={handleToggle}
        onTouchStart={handleTouchToggle}
        className={`cursor-pointer ${className}`}
      >
        {trigger}
      </div>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop - darkens screen and prevents interactions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-[1px]"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  setIsOpen(false);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  setIsOpen(false);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  setIsOpen(false);
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
                  setIsOpen(false);
                }}
                style={{ 
                  touchAction: "none",
                  pointerEvents: "auto"
                }}
              />
              
              {/* Menu */}
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ 
                  duration: 0.15,
                  ease: [0.4, 0, 0.2, 1]
                }}
                className="fixed z-[9999] min-w-[200px] bg-card border border-border rounded-xl shadow-xl overflow-hidden"
                style={{
                  top: position.top,
                  left: position.left,
                }}
              >
                <div className="py-1">
                  {items.map((item, index) => (
                    <React.Fragment key={item.id}>
                      {item.showDivider && index > 0 && (
                        <div className="h-px bg-border my-1" />
                      )}
                      <button
                        onClick={() => handleItemClick(item)}
                        disabled={item.disabled}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-right
                          transition-colors duration-150
                          ${item.disabled 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-secondary/50 active:bg-secondary/70'
                          }
                          ${item.variant === 'danger' 
                            ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' 
                            : 'text-foreground'
                          }
                        `}
                      >
                        {item.icon && (
                          <span className={`flex-shrink-0 ${
                            item.variant === 'danger' ? 'text-red-500' : 'text-muted-foreground'
                          }`}>
                            {item.icon}
                          </span>
                        )}
                        <span className="flex-1 text-right">{item.label}</span>
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

