import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ErrorToastProps {
  message: string | null;
  isVisible: boolean;
  onClose: () => void;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  message,
  isVisible,
  onClose,
}) => {
  const [progress, setProgress] = useState(100);

  // Auto-hide after 5 seconds with progress bar
  useEffect(() => {
    if (!isVisible || !message) return;
    
    setProgress(100);
    const duration = 5000;
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
  }, [isVisible, message, onClose]);

  if (!message) return null;

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
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 dark:from-red-950/30 via-card to-card/95 
                       border border-red-500/30 shadow-2xl shadow-red-500/10 backdrop-blur-xl"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Animated gradient border */}
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-30"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.3), transparent)',
                backgroundSize: '200% 100%',
              }}
              animate={{
                backgroundPosition: ['200% 0%', '-200% 0%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear'
              }}
            />

            <div className="relative p-4">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 left-3 w-6 h-6 flex items-center justify-center 
                         rounded-full bg-red-500/10 hover:bg-red-500/20 
                         text-red-600 dark:text-red-400 transition-colors"
                aria-label="إغلاق"
              >
                <X size={14} />
              </button>

              {/* Content */}
              <div className="pr-8">
                {/* Icon and Title */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-start gap-3 mb-2"
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 
                             flex items-center justify-center mt-0.5"
                  >
                    <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="font-bold text-base text-red-700 dark:text-red-400 mb-1"
                    >
                      حدث خطأ
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-sm text-foreground"
                    >
                      {message}
                    </motion.p>
                  </div>
                </motion.div>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-red-500/10 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-red-500 via-red-500/80 to-red-500"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.05, ease: 'linear' }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Hook to manage error toast state
export const useErrorToast = () => {
  const [toastQueue, setToastQueue] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Show next toast from queue
  useEffect(() => {
    if (!isVisible && toastQueue.length > 0 && !currentMessage) {
      const [next, ...rest] = toastQueue;
      setToastQueue(rest);
      setCurrentMessage(next);
      setIsVisible(true);
    }
  }, [toastQueue, isVisible, currentMessage]);

  const showToast = (message: string) => {
    setToastQueue((prev) => [...prev, message]);
  };

  const hideToast = () => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentMessage(null);
    }, 300);
  };

  return {
    currentMessage,
    isVisible,
    showToast,
    hideToast,
  };
};
