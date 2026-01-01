import React from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  // Use ref to avoid resetting timer when callback changes
  const onCompleteRef = React.useRef(onComplete);
  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  React.useEffect(() => {
    // Fast auto-complete - 1.2 seconds
    const timer = setTimeout(() => {
      onCompleteRef.current?.();
    }, 1200);

    return () => clearTimeout(timer);
  }, []); // Empty deps - timer runs once

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-brand px-4"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Logo Container */}
      <motion.div
        className="flex flex-col items-center gap-4 sm:gap-6"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.6, 
          ease: [0.34, 1.56, 0.64, 1] // Spring effect
        }}
      >
        {/* Logo Icon - Responsive sizing for 6.3" screens */}
        <motion.div
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl border border-white/30"
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 2, -2, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <span className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg">أ</span>
        </motion.div>

        {/* App Name */}
        <motion.div
          className="text-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-1 sm:mb-2 tracking-tight">
            أبيلي
          </h1>
          <p className="text-white/80 text-base sm:text-lg font-medium">
            السوق العكسي الذكي
          </p>
        </motion.div>

        {/* Loading Indicator */}
        <div className="flex flex-col items-center gap-2 sm:gap-3 mt-5 sm:mt-8">
          <motion.div
            className="flex gap-1.5 sm:gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/60"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-white/40 text-[11px] sm:text-xs font-medium tracking-widest"
          >
            جاري التحميل
          </motion.span>
        </div>
      </motion.div>

      {/* Bottom Tagline - Safe area aware */}
      <motion.p
        className="absolute bottom-6 sm:bottom-10 pb-[env(safe-area-inset-bottom,0px)] text-white/60 text-xs sm:text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        أنت تطلب، والعروض تجيك ✨
      </motion.p>
    </motion.div>
  );
};

