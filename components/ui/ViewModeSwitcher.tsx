import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutGrid, 
  List, 
  Layers,
  Maximize2,
  Check
} from "lucide-react";

type ViewMode = 'cards' | 'list' | 'fullscreen';

interface ViewModeSwitcherProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  variant?: 'buttons' | 'dropdown' | 'inline';
  size?: 'sm' | 'md' | 'lg';
}

const viewModes = [
  { id: 'cards' as ViewMode, icon: LayoutGrid, label: 'كروت', labelAr: 'عرض الكروت' },
  { id: 'list' as ViewMode, icon: List, label: 'قائمة', labelAr: 'عرض القائمة' },
  { id: 'fullscreen' as ViewMode, icon: Layers, label: 'ملء الشاشة', labelAr: 'ملء الشاشة' },
];

export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({
  currentMode,
  onModeChange,
  variant = 'buttons',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  // Inline variant - Simple horizontal buttons
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-xl">
        {viewModes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          
          return (
            <motion.button
              key={mode.id}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                onModeChange(mode.id);
              }}
              className={`relative flex items-center justify-center gap-1.5 px-3 ${sizeClasses[size]} rounded-lg transition-colors ${
                isActive 
                  ? "text-white" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {isActive && (
                <motion.div
                  layoutId="viewmode-indicator"
                  className="absolute inset-0 bg-primary rounded-lg"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                <Icon size={iconSizes[size]} />
              </span>
              {size !== 'sm' && (
                <span className="relative z-10 font-medium hidden sm:inline">
                  {mode.label}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  }

  // Buttons variant - Separate buttons
  if (variant === 'buttons') {
    return (
      <div className="flex items-center gap-2">
        {viewModes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          
          return (
            <motion.button
              key={mode.id}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(10);
                onModeChange(mode.id);
              }}
              className={`flex items-center justify-center gap-2 px-4 ${sizeClasses[size]} rounded-xl border transition-all ${
                isActive 
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/25" 
                  : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon size={iconSizes[size]} />
              <span className="font-medium hidden sm:inline">{mode.label}</span>
            </motion.button>
          );
        })}
      </div>
    );
  }

  // Dropdown variant - Will be a dropdown menu
  return (
    <div className="relative">
      {/* Current selection button */}
      <motion.button
        className={`flex items-center justify-center gap-2 px-4 ${sizeClasses[size]} rounded-xl bg-secondary/50 border border-border hover:border-primary/50 transition-colors`}
        whileTap={{ scale: 0.98 }}
      >
        {(() => {
          const current = viewModes.find(m => m.id === currentMode);
          const Icon = current?.icon || LayoutGrid;
          return (
            <>
              <Icon size={iconSizes[size]} />
              <span className="font-medium">{current?.label}</span>
            </>
          );
        })()}
      </motion.button>
    </div>
  );
};

// Compact version for tight spaces
export const CompactViewModeSwitcher: React.FC<{
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}> = ({ currentMode, onModeChange }) => {
  const nextMode = (): ViewMode => {
    const modes: ViewMode[] = ['cards', 'list', 'fullscreen'];
    const currentIndex = modes.indexOf(currentMode);
    return modes[(currentIndex + 1) % modes.length];
  };

  const Icon = viewModes.find(m => m.id === currentMode)?.icon || LayoutGrid;

  return (
    <motion.button
      onClick={() => {
        if (navigator.vibrate) navigator.vibrate(10);
        onModeChange(nextMode());
      }}
      className="w-10 h-10 rounded-xl bg-secondary/50 border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
      whileTap={{ scale: 0.9 }}
      title="تغيير طريقة العرض"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMode}
          initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.15 }}
        >
          <Icon size={18} />
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
};

export default ViewModeSwitcher;

