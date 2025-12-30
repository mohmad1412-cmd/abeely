import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Layers,
  List,
  AlignJustify,
  CreditCard,
  FileText,
  Sparkles,
} from 'lucide-react';

export type ViewMode = 'grid' | 'tall' | 'text';

interface ViewModeToolbarProps {
  currentMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  showLabels?: boolean;
  className?: string;
}

export const ViewModeToolbar: React.FC<ViewModeToolbarProps> = ({
  currentMode,
  onChange,
  showLabels = true,
  className = '',
}) => {
  const modes: { id: ViewMode; icon: React.ReactNode; label: string; description: string }[] = [
    {
      id: 'grid',
      icon: <LayoutGrid className="w-4 h-4" />,
      label: 'شبكة',
      description: 'عرض كروت متعددة',
    },
    {
      id: 'tall',
      icon: <CreditCard className="w-4 h-4" />,
      label: 'كروت',
      description: 'كروت كبيرة متمركزة',
    },
    {
      id: 'text',
      icon: <AlignJustify className="w-4 h-4" />,
      label: 'نصوص',
      description: 'قائمة نصية بسيطة',
    },
  ];

  const handleChange = (mode: ViewMode) => {
    if (mode !== currentMode) {
      if (navigator.vibrate) navigator.vibrate(8);
      onChange(mode);
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div className="inline-flex items-center bg-secondary/60 backdrop-blur-sm rounded-xl p-1 gap-0.5 border border-border/30">
        {modes.map((mode, index) => {
          const isActive = mode.id === currentMode;
          
          return (
            <button
              key={mode.id}
              onClick={() => handleChange(mode.id)}
              className={`
                relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                transition-all duration-200 active:scale-95
                ${isActive
                  ? 'text-white'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {/* Active background */}
              {isActive && (
                <motion.div
                  layoutId="viewmode-active"
                  className="absolute inset-0 bg-primary rounded-lg shadow-sm"
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 35,
                  }}
                />
              )}
              
              {/* Content */}
              <span className="relative z-10 flex items-center gap-1.5">
                {mode.icon}
                {showLabels && <span>{mode.label}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Compact version for small screens or collapsed header
export const ViewModeCompact: React.FC<ViewModeToolbarProps> = ({
  currentMode,
  onChange,
  className = '',
}) => {
  const getNextMode = (): ViewMode => {
    const modes: ViewMode[] = ['grid', 'tall', 'text'];
    const currentIndex = modes.indexOf(currentMode);
    return modes[(currentIndex + 1) % modes.length];
  };

  const getIcon = () => {
    switch (currentMode) {
      case 'grid':
        return <LayoutGrid className="w-4 h-4" />;
      case 'tall':
        return <CreditCard className="w-4 h-4" />;
      case 'text':
        return <AlignJustify className="w-4 h-4" />;
    }
  };

  const handleClick = () => {
    if (navigator.vibrate) navigator.vibrate(8);
    onChange(getNextMode());
  };

  return (
    <button
      onClick={handleClick}
      className={`
        w-9 h-9 rounded-xl flex items-center justify-center
        bg-secondary/60 backdrop-blur-sm border border-border/30
        text-muted-foreground hover:text-foreground
        active:scale-95 transition-all
        ${className}
      `}
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
          {getIcon()}
        </motion.div>
      </AnimatePresence>
    </button>
  );
};

// Floating version for bottom of screen
export const ViewModeFloating: React.FC<ViewModeToolbarProps & { visible?: boolean }> = ({
  currentMode,
  onChange,
  visible = true,
  className = '',
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-40 ${className}`}
        >
          <div className="bg-card/90 backdrop-blur-lg rounded-2xl shadow-2xl shadow-black/20 border border-border/50 p-1.5">
            <ViewModeToolbar
              currentMode={currentMode}
              onChange={onChange}
              showLabels={true}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ViewModeToolbar;

