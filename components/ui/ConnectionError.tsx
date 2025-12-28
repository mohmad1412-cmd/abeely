import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, UserCircle } from 'lucide-react';

interface ConnectionErrorProps {
  onRetry: () => void;
  onGuestMode: () => void;
  isRetrying?: boolean;
  errorMessage?: string;
}

export const ConnectionError: React.FC<ConnectionErrorProps> = ({
  onRetry,
  onGuestMode,
  isRetrying = false,
  errorMessage
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto w-24 h-24 rounded-full bg-orange-500/10 flex items-center justify-center mb-6"
        >
          <WifiOff className="w-12 h-12 text-orange-500" />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-center text-foreground mb-2"
        >
          عذراً، لم نتمكن من الاتصال
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground text-center mb-8"
        >
          يبدو أن هناك مشكلة في الاتصال بالإنترنت أو أن الخدمة غير متاحة حالياً. جرب مرة أخرى أو تصفح كضيف.
        </motion.p>

        {/* Error Details - simplified message */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mb-6 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20"
          >
            <p className="text-sm text-orange-600 dark:text-orange-400 text-center">
              {errorMessage}
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          {/* Retry Button */}
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full py-3.5 px-4 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'جاري المحاولة...' : 'إعادة المحاولة'}
          </button>

          {/* Guest Mode Button */}
          <button
            onClick={onGuestMode}
            disabled={isRetrying}
            className="w-full py-3.5 px-4 rounded-xl bg-card border border-border text-foreground font-medium flex items-center justify-center gap-2 hover:bg-accent transition-all disabled:opacity-50"
          >
            <UserCircle className="w-5 h-5" />
            الدخول كضيف
          </button>
        </motion.div>

        {/* Info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-xs text-muted-foreground text-center mt-6"
        >
          يمكنك تصفح التطبيق كضيف والاطلاع على الطلبات المتاحة
        </motion.p>
      </motion.div>
    </div>
  );
};

