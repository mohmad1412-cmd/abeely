import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  count = 1,
}) => {
  const baseStyles = 'relative overflow-hidden bg-gradient-to-r from-muted via-muted to-muted';
  
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-xl',
  };

  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={`${baseStyles} ${variantStyles[variant]} ${className} skeleton-shimmer`}
          style={{
            width: width || '100%',
            height: height || (variant === 'text' ? '1rem' : variant === 'circular' ? '3rem' : '6rem'),
          }}
        />
      ))}
    </>
  );
};

// Brand-themed Loading Spinner
export const BrandSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  size = 'md',
  className = ''
}) => {
  const sizeMap = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-24 h-24 text-4xl'
  };

  // Removed rotation to prevent "wobble/shake" effect
  return (
    <motion.div
      className={`rounded-2xl bg-gradient-brand flex items-center justify-center shadow-xl ${sizeMap[size]} ${className}`}
      animate={{ 
        scale: [1, 1.05, 1],
      }}
      transition={{ 
        duration: 2, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
    >
      <span className="font-black text-white drop-shadow-md">أ</span>
    </motion.div>
  );
};

// Full-screen Loading
export const FullScreenLoading: React.FC<{ message?: string }> = ({ message = 'جاري التحميل...' }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center"
  >
    <BrandSpinner size="lg" />
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mt-6 text-muted-foreground font-medium"
    >
      {message}
    </motion.p>
    <motion.div
      className="flex gap-1 mt-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 bg-primary rounded-full"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </motion.div>
  </motion.div>
);

// Preset skeletons for common use cases
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div 
    className={`bg-card border border-border rounded-2xl overflow-hidden skeleton-card ${className}`}
  >
    {/* Image placeholder */}
    <div className="h-40 bg-muted skeleton-shimmer" />
    
    {/* Content */}
    <div className="p-4 space-y-3">
      {/* Title */}
      <div className="h-5 w-3/4 bg-muted rounded skeleton-shimmer" />
      {/* Description */}
      <div className="h-4 w-full bg-muted rounded skeleton-shimmer" />
      <div className="h-4 w-1/2 bg-muted rounded skeleton-shimmer" />
      {/* Tags */}
      <div className="flex gap-2 pt-2">
        <div className="h-7 w-20 bg-muted rounded-full skeleton-shimmer" />
        <div className="h-7 w-20 bg-muted rounded-full skeleton-shimmer" />
      </div>
    </div>
  </div>
);

export const ChatMessageSkeleton: React.FC<{ isUser?: boolean }> = ({ isUser = false }) => (
  <div 
    className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
  >
    {isUser ? (
      <LoadingSkeleton variant="circular" width={32} height={32} />
    ) : (
      <motion.div
        className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center shrink-0"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-sm font-black text-white">أ</span>
      </motion.div>
    )}
    <div className={`space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
      <LoadingSkeleton 
        variant="rectangular" 
        width={200} 
        height={60} 
        className={isUser ? 'rounded-tl-none rounded-2xl' : 'rounded-tr-none rounded-2xl'} 
      />
    </div>
  </div>
);

export const ListItemSkeleton: React.FC = () => (
  <div 
    className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
  >
    <LoadingSkeleton variant="circular" width={48} height={48} />
    <div className="flex-1 space-y-2">
      <LoadingSkeleton variant="text" width="60%" />
      <LoadingSkeleton variant="text" width="40%" height={12} />
    </div>
    <LoadingSkeleton variant="rectangular" width={60} height={24} className="rounded-full" />
  </div>
);

// Grid of Card Skeletons with staggered shimmer effect
export const CardsGridSkeleton: React.FC<{ count?: number; showLogo?: boolean }> = ({ count = 6, showLogo = true }) => {
  return (
    <div className="relative">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="skeleton-card-wrapper"
            style={{ 
              animationDelay: `${i * 0.15}s`,
            }}
          >
            <CardSkeletonEnhanced index={i} />
          </div>
        ))}
      </div>
      
      {/* Central Brand Spinner */}
      {showLogo && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-background/40 backdrop-blur-[2px] p-8 rounded-full shadow-2xl">
            <BrandSpinner size="lg" className="shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Card Skeleton with staggered shimmer
const CardSkeletonEnhanced: React.FC<{ index: number; className?: string }> = ({ index, className = '' }) => {
  // Calculate animation delay based on index for wave effect
  const baseDelay = index * 0.15;
  
  return (
    <div 
      className={`bg-card border border-border rounded-2xl overflow-hidden ${className}`}
    >
      {/* Image placeholder with shimmer */}
      <div 
        className="h-40 bg-muted relative overflow-hidden"
        style={{ '--shimmer-delay': `${baseDelay}s` } as React.CSSProperties}
      >
        <div 
          className="absolute inset-0 shimmer-wave"
          style={{ animationDelay: `${baseDelay}s` }}
        />
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="relative overflow-hidden h-5 w-3/4 bg-muted rounded">
          <div 
            className="absolute inset-0 shimmer-wave"
            style={{ animationDelay: `${baseDelay + 0.05}s` }}
          />
        </div>
        {/* Description lines */}
        <div className="relative overflow-hidden h-4 w-full bg-muted rounded">
          <div 
            className="absolute inset-0 shimmer-wave"
            style={{ animationDelay: `${baseDelay + 0.1}s` }}
          />
        </div>
        <div className="relative overflow-hidden h-4 w-1/2 bg-muted rounded">
          <div 
            className="absolute inset-0 shimmer-wave"
            style={{ animationDelay: `${baseDelay + 0.15}s` }}
          />
        </div>
        {/* Tags */}
        <div className="flex gap-2 pt-2">
          <div className="relative overflow-hidden h-7 w-20 bg-muted rounded-full">
            <div 
              className="absolute inset-0 shimmer-wave"
              style={{ animationDelay: `${baseDelay + 0.2}s` }}
            />
          </div>
          <div className="relative overflow-hidden h-7 w-20 bg-muted rounded-full">
            <div 
              className="absolute inset-0 shimmer-wave"
              style={{ animationDelay: `${baseDelay + 0.25}s` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
