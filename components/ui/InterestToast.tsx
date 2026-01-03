import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, DollarSign, Clock, Sparkles, ArrowLeft } from 'lucide-react';
import { Request } from '../../types';
import { AVAILABLE_CATEGORIES } from '../../data';

interface InterestToastProps {
  request: Request | null;
  isVisible: boolean;
  onClose: () => void;
  onClick?: () => void;
}

export const InterestToast: React.FC<InterestToastProps> = ({
  request,
  isVisible,
  onClose,
  onClick,
}) => {
  const [progress, setProgress] = useState(100);

  // Auto-hide after 6 seconds with progress bar
  useEffect(() => {
    if (!isVisible || !request) return;
    
    setProgress(100);
    const duration = 6000;
    const interval = 50;
    const step = (interval / duration) * 100;
    
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isVisible, request, onClose]);

  if (!request) return null;

  // Get category info
  const categoryInfo = request.categoryIds?.[0] 
    ? AVAILABLE_CATEGORIES.find(c => c.id === request.categoryIds![0])
    : null;

  // Format budget
  const formatBudget = () => {
    if (request.budgetMin && request.budgetMax) {
      return `${request.budgetMin} - ${request.budgetMax} ر.س`;
    }
    if (request.budgetMax) {
      return `حتى ${request.budgetMax} ر.س`;
    }
    if (request.budgetMin) {
      return `من ${request.budgetMin} ر.س`;
    }
    return 'قابل للتفاوض';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 30,
            mass: 0.8
          }}
          className="fixed top-4 left-4 right-4 z-[9999] max-w-md mx-auto"
        >
          <motion.div
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-card/95 
                       border border-primary/20 shadow-2xl shadow-primary/10 backdrop-blur-xl cursor-pointer"
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Animated gradient border */}
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-30"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(var(--primary-rgb), 0.3), transparent)',
                backgroundSize: '200% 100%',
              }}
              animate={{
                backgroundPosition: ['200% 0%', '-200% 0%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            />

            {/* Header with sparkle effect */}
            <div className="relative px-4 pt-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ 
                    rotate: [0, 15, -15, 0],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20"
                >
                  <Sparkles size={16} className="text-amber-500" />
                </motion.div>
                <span className="text-sm font-bold text-primary">طلب جديد يوافق اهتماماتك!</span>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="relative px-4 pb-3">
              {/* Category badge */}
              {categoryInfo && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full 
                             bg-primary/10 text-primary text-xs font-medium mb-2"
                >
                  <span>{categoryInfo.emoji}</span>
                  <span>{categoryInfo.label}</span>
                </motion.div>
              )}

              {/* Title */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="font-bold text-base text-foreground line-clamp-2 mb-2"
              >
                {request.title}
              </motion.h3>

              {/* Description preview */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-muted-foreground line-clamp-2 mb-3"
              >
                {request.description}
              </motion.p>

              {/* Meta info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="flex flex-wrap gap-3 text-xs text-muted-foreground"
              >
                {request.location && (
                  <div className="flex items-center gap-1">
                    <MapPin size={12} />
                    <span>{request.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <DollarSign size={12} />
                  <span>{formatBudget()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>الآن</span>
                </div>
              </motion.div>

              {/* CTA hint */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-1.5 mt-3 text-xs text-primary font-medium"
              >
                <ArrowLeft size={14} />
                <span>اضغط لعرض التفاصيل</span>
              </motion.div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-muted/30 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.05, ease: 'linear' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Hook to manage toast queue
export const useInterestToast = () => {
  const [toastQueue, setToastQueue] = useState<Request[]>([]);
  const [currentToast, setCurrentToast] = useState<Request | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Show next toast from queue
  useEffect(() => {
    if (!isVisible && toastQueue.length > 0 && !currentToast) {
      const [next, ...rest] = toastQueue;
      setToastQueue(rest);
      setCurrentToast(next);
      setIsVisible(true);
    }
  }, [toastQueue, isVisible, currentToast]);

  const showToast = (request: Request) => {
    setToastQueue((prev) => [...prev, request]);
  };

  const hideToast = () => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentToast(null);
    }, 300);
  };

  return {
    currentToast,
    isVisible,
    showToast,
    hideToast,
  };
};

