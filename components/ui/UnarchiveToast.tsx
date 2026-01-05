import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArchiveRestore, RefreshCw, AlertCircle } from 'lucide-react';

interface UnarchiveToastProps {
  isVisible: boolean;
  willBump: boolean; // هل سيتم تحديث تلقائي (bump)
  onConfirm: () => void;
  onCancel: () => void;
}

export const UnarchiveToast: React.FC<UnarchiveToastProps> = ({
  isVisible,
  willBump,
  onConfirm,
  onCancel,
}) => {
  const [progress, setProgress] = useState(100);

  // Auto-hide after 8 seconds with progress bar
  useEffect(() => {
    if (!isVisible) return;
    
    setProgress(100);
    const duration = 8000;
    const interval = 50;
    const step = (interval / duration) * 100;
    
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onCancel(); // إلغاء تلقائي إذا لم يتم التأكيد
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isVisible, onCancel]);

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
                       border border-yellow-500/30 shadow-2xl shadow-yellow-500/10 backdrop-blur-xl"
            whileHover={{ scale: 1.02 }}
          >
            {/* Animated gradient border */}
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-30"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(234, 179, 8, 0.3), transparent)',
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

            {/* Header */}
            <div className="relative px-4 pt-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ 
                    rotate: [0, 15, -15, 0],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="p-1.5 rounded-lg bg-yellow-500/20"
                >
                  <AlertCircle size={16} className="text-yellow-500" />
                </motion.div>
                <span className="text-sm font-bold text-yellow-500">تنبيه</span>
              </div>
              
              <button
                onClick={onCancel}
                className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="relative px-4 pb-3">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-sm text-foreground mb-3"
              >
                سيتم إلغاء أرشفة الطلب {willBump && 'وتحديثه تلقائياً'}
              </motion.p>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={onCancel}
                  className="flex-1 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-sm font-medium text-primary-foreground transition-colors flex items-center justify-center gap-2"
                >
                  {willBump ? (
                    <>
                      <RefreshCw size={14} />
                      <span>تأكيد والتحديث</span>
                    </>
                  ) : (
                    <>
                      <ArchiveRestore size={14} />
                      <span>تأكيد والإظهار</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-muted/30 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-500 via-yellow-500/80 to-yellow-500"
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

