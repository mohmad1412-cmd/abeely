import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Bell,
  User,
  Search,
  Filter,
  Plus,
  ArrowRight,
  X,
  LogOut,
} from 'lucide-react';
import { NotificationsPopover } from '../NotificationsPopover';

interface CollapsibleHeaderProps {
  scrollY: number;
  maxScroll?: number;
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  onSearchClick?: () => void;
  onFilterClick?: () => void;
  onCreateClick?: () => void;
  showCreateButton?: boolean;
  user: any;
  isGuest?: boolean;
  notifications: any[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onNotificationClick?: (notification: any) => void;
  onProfileClick?: () => void;
  onSignOut?: () => void;
  // View mode selector
  viewMode?: 'grid' | 'tall' | 'text';
  onViewModeChange?: (mode: 'grid' | 'tall' | 'text') => void;
  // Additional content
  children?: React.ReactNode;
}

export const CollapsibleHeader: React.FC<CollapsibleHeaderProps> = ({
  scrollY,
  maxScroll = 120,
  title,
  subtitle,
  onMenuClick,
  onSearchClick,
  onFilterClick,
  onCreateClick,
  showCreateButton = false,
  user,
  isGuest = false,
  notifications,
  unreadCount,
  onMarkAsRead,
  onClearAll,
  onNotificationClick,
  onProfileClick,
  onSignOut,
  viewMode = 'grid',
  onViewModeChange,
  children,
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Calculate collapse progress (0 = fully expanded, 1 = fully collapsed)
  const progress = Math.min(Math.max(scrollY / maxScroll, 0), 1);
  
  // Interpolated values
  const headerHeight = 140 - (progress * 70); // 140px -> 70px
  const titleScale = 1 - (progress * 0.2); // 1 -> 0.8
  const titleY = progress * -10; // Move up slightly
  const subtitleOpacity = 1 - (progress * 1.5); // Fade out faster
  const subtitleY = progress * -20;
  
  // Background blur and shadow
  const blurAmount = progress * 20;
  const shadowOpacity = progress * 0.15;

  return (
    <>
      <motion.header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 md:mr-[340px]"
        style={{
          height: headerHeight,
          backdropFilter: `blur(${blurAmount}px)`,
          WebkitBackdropFilter: `blur(${blurAmount}px)`,
          boxShadow: `0 4px 30px rgba(0, 0, 0, ${shadowOpacity})`,
        }}
      >
        {/* Background with gradient */}
        <div 
          className="absolute inset-0 transition-colors duration-300"
          style={{
            background: `linear-gradient(180deg, 
              rgba(var(--background-rgb, 255, 255, 255), ${0.8 + progress * 0.15}) 0%, 
              rgba(var(--background-rgb, 255, 255, 255), ${0.6 + progress * 0.3}) 100%)`,
          }}
        />

        {/* Content */}
        <div className="relative h-full flex flex-col px-4 safe-area-inset-top">
          {/* Top row - always visible */}
          <div className="flex items-center justify-between h-14 flex-shrink-0">
            {/* Right side - Menu & Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={onMenuClick}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-all"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <motion.div
                style={{
                  scale: titleScale,
                  y: titleY,
                  transformOrigin: 'right center',
                }}
              >
                <h1 className="text-lg font-bold text-foreground">
                  {title}
                </h1>
              </motion.div>
            </div>

            {/* Left side - Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              {onSearchClick && (
                <button
                  onClick={onSearchClick}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-all"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}

              {/* Filter */}
              {onFilterClick && (
                <button
                  onClick={onFilterClick}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-all"
                >
                  <Filter className="w-5 h-5" />
                </button>
              )}

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-all relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isNotifOpen && (
                    <NotificationsPopover
                      notifications={notifications}
                      onMarkAsRead={onMarkAsRead}
                      onClearAll={onClearAll}
                      onClose={() => setIsNotifOpen(false)}
                      onNotificationClick={onNotificationClick}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Create button - collapsed state */}
              {showCreateButton && onCreateClick && progress > 0.5 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={onCreateClick}
                  className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/25 active:scale-95 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </motion.button>
              )}
            </div>
          </div>

          {/* Expanded content - Subtitle & View Mode Selector */}
          <motion.div
            className="flex-1 flex flex-col justify-center overflow-hidden"
            style={{
              opacity: subtitleOpacity,
              y: subtitleY,
              display: progress > 0.9 ? 'none' : 'flex',
            }}
          >
            {/* Subtitle */}
            {subtitle && (
              <p className="text-sm text-muted-foreground mb-3">{subtitle}</p>
            )}

            {/* View Mode Selector */}
            {onViewModeChange && (
              <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-1.5 self-start">
                <ViewModeButton
                  mode="grid"
                  currentMode={viewMode}
                  onClick={() => onViewModeChange('grid')}
                  label="شبكة"
                />
                <ViewModeButton
                  mode="tall"
                  currentMode={viewMode}
                  onClick={() => onViewModeChange('tall')}
                  label="كروت"
                />
                <ViewModeButton
                  mode="text"
                  currentMode={viewMode}
                  onClick={() => onViewModeChange('text')}
                  label="نصوص"
                />
              </div>
            )}

            {/* Additional children */}
            {children}
          </motion.div>

          {/* Create button - expanded state */}
          {showCreateButton && onCreateClick && progress <= 0.5 && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={onCreateClick}
              className="absolute left-4 bottom-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium shadow-lg shadow-primary/25 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>طلب جديد</span>
            </motion.button>
          )}
        </div>

        {/* Bottom border */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-px bg-border/50"
          style={{ opacity: progress }}
        />
      </motion.header>

      {/* Spacer */}
      <div style={{ height: headerHeight }} />
    </>
  );
};

// View Mode Button Component
const ViewModeButton: React.FC<{
  mode: 'grid' | 'tall' | 'text';
  currentMode: string;
  onClick: () => void;
  label: string;
}> = ({ mode, currentMode, onClick, label }) => {
  const isActive = mode === currentMode;
  
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-lg text-xs font-medium transition-all
        ${isActive
          ? 'bg-primary text-white shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
        }
      `}
    >
      {label}
    </button>
  );
};

export default CollapsibleHeader;

