import React, { useRef, useEffect, useState, useCallback } from "react";
import { Request, Offer } from "../../types";
import { AVAILABLE_CATEGORIES } from "../../data";
import {
  MapPin,
  Clock,
  DollarSign,
  User,
  MessageCircle,
  CheckCircle,
  ImageIcon,
  ChevronUp,
  ChevronDown,
  Share2,
  X,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

// ========================================
// 🎯 FULLSCREEN CARDS VIEW
// عرض كروت بملء الشاشة مع snap scrolling
// مستوحى من TikTok/Instagram Reels
// ========================================

interface FullScreenCardViewProps {
  requests: Request[];
  myOffers?: Offer[];
  userId?: string;
  onSelectRequest: (request: Request) => void;
  onClose?: () => void;
  initialIndex?: number;
  viewedRequestIds?: Set<string>;
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
  isGuest?: boolean;
}

// Time ago formatter
const getTimeAgo = (date: Date | string): string => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(d, { addSuffix: true, locale: ar });
  } catch {
    return "";
  }
};

// Price formatter
const formatPrice = (min?: string, max?: string): string => {
  if (!min && !max) return "";
  if (min && max) return `${min} - ${max}`;
  if (min) return `من ${min}`;
  if (max) return `حتى ${max}`;
  return "";
};

// Single Card Component
const SnapCard: React.FC<{
  request: Request;
  isActive: boolean;
  myOffer?: Offer;
  isMyRequest: boolean;
  onClick: () => void;
}> = ({ request, isActive, myOffer, isMyRequest, onClick }) => {
  const hasImage = request.images && request.images.length > 0;
  const price = formatPrice(request.budgetMin, request.budgetMax);
  const timeAgo = getTimeAgo(request.createdAt);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Auto-advance images when active
  useEffect(() => {
    if (!isActive || !request.images || request.images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % request.images!.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isActive, request.images]);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(15);
    // Could implement share functionality
    if (navigator.share) {
      navigator.share({
        title: request.title,
        text: request.description,
        url: window.location.href,
      }).catch(() => {});
    }
  };

  return (
    <div className="h-full w-full snap-center snap-always relative flex flex-col bg-black">
      {/* Background Image */}
      <div className="absolute inset-0">
        {hasImage ? (
          <>
            <motion.img
              key={currentImageIndex}
              src={request.images![currentImageIndex]}
              alt=""
              className="w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            />
            {/* Multiple images indicator */}
            {request.images!.length > 1 && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {request.images!.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      idx === currentImageIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, 
                hsl(${Math.abs(request.id.charCodeAt(0) * 10) % 360}, 60%, 25%) 0%, 
                hsl(${(Math.abs(request.id.charCodeAt(0) * 10) + 60) % 360}, 70%, 15%) 100%)`
            }}
          >
            <div className="text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                <ImageIcon size={48} className="text-white/20" />
              </div>
            </div>
          </div>
        )}
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />
      </div>

      {/* Top Bar - Safe Area */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-[env(safe-area-inset-top,12px)] px-4 pb-2">
        <div className="flex items-center justify-between">
          {/* Indicators */}
          <div className="flex gap-2">
            {isMyRequest && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-3 py-1.5 rounded-full bg-primary/90 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
              >
                <User size={12} />
                طلبي
              </motion.div>
            )}
            {myOffer && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-3 py-1.5 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
              >
                <CheckCircle size={12} />
                قدمت عرض
              </motion.div>
            )}
          </div>

          {/* Time */}
          {timeAgo && (
            <span className="text-white/70 text-xs font-medium backdrop-blur-sm bg-black/30 px-2.5 py-1 rounded-full">
              {timeAgo}
            </span>
          )}
        </div>
      </div>

      {/* Side Actions */}
      <div className="absolute left-4 bottom-48 z-30 flex flex-col gap-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20"
          onClick={handleShare}
        >
          <Share2 size={22} />
        </motion.button>
        {request.offersCount !== undefined && request.offersCount > 0 && (
          <div className="flex flex-col items-center text-white">
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <MessageCircle size={22} />
            </div>
            <span className="text-xs font-bold mt-1">{request.offersCount}</span>
          </div>
        )}
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-6 pb-[calc(env(safe-area-inset-bottom,20px)+80px)]">
        {/* Categories */}
        {request.categories && request.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {request.categories.slice(0, 3).map((cat, idx) => {
              const catObj = AVAILABLE_CATEGORIES.find(c => c.label === cat || c.id === cat);
              return (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-medium border border-white/10"
                >
                  {catObj?.emoji} {catObj?.label || cat}
                </span>
              );
            })}
          </div>
        )}

        {/* Title */}
        <h2 className="font-bold text-2xl text-white leading-tight mb-2 drop-shadow-lg">
          {request.title}
        </h2>

        {/* Description */}
        <p className="text-white/80 text-base leading-relaxed line-clamp-3 mb-4">
          {request.description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-white/70 text-sm mb-6">
          {request.location && (
            <span className="flex items-center gap-1.5">
              <MapPin size={16} />
              {request.location}
            </span>
          )}
          {price && (
            <span className="flex items-center gap-1.5 text-primary font-bold">
              <DollarSign size={16} />
              {price} ر.س
            </span>
          )}
        </div>

        {/* CTA Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onClick}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/30 active:shadow-primary/20 flex items-center justify-center gap-2"
        >
          <Send size={20} />
          {isMyRequest ? "إدارة الطلب" : myOffer ? "عرض عرضي" : "قدم عرضك الآن"}
        </motion.button>
      </div>
    </div>
  );
};

// Main Component
export const FullScreenCardView: React.FC<FullScreenCardViewProps> = ({
  requests,
  myOffers = [],
  userId,
  onSelectRequest,
  onClose,
  initialIndex = 0,
  viewedRequestIds = new Set(),
  currentIndex: externalIndex,
  onIndexChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalIndex, setInternalIndex] = useState(initialIndex);
  const currentIndex = externalIndex ?? internalIndex;
  const lastScrollTime = useRef(0);
  const isScrolling = useRef(false);

  // Get my offer on a request
  const getMyOffer = useCallback((requestId: string) => {
    return myOffers.find(o => o.requestId === requestId);
  }, [myOffers]);

  // Check if user owns request
  const isMyRequest = useCallback((request: Request) => {
    if (!userId) return false;
    const authorId = (request as any).authorId || (request as any).author_id || request.author;
    return authorId === userId;
  }, [userId]);

  // Update index
  const setCurrentIndex = useCallback((newIndex: number) => {
    if (onIndexChange) {
      onIndexChange(newIndex);
    } else {
      setInternalIndex(newIndex);
    }
  }, [onIndexChange]);

  // Snap scroll handler with haptic feedback
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isScrolling.current) return;

      const scrollTop = container.scrollTop;
      const cardHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / cardHeight);

      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < requests.length) {
        // Haptic feedback on card change
        const now = Date.now();
        if (now - lastScrollTime.current > 100) {
          if (navigator.vibrate) navigator.vibrate(10);
          lastScrollTime.current = now;
        }
        setCurrentIndex(newIndex);
      }
    };

    const handleScrollEnd = () => {
      isScrolling.current = false;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('scrollend', handleScrollEnd, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('scrollend', handleScrollEnd);
    };
  }, [currentIndex, requests.length, setCurrentIndex]);

  // Scroll to initial index on mount
  useEffect(() => {
    if (containerRef.current && initialIndex > 0) {
      const cardHeight = containerRef.current.clientHeight;
      containerRef.current.scrollTop = initialIndex * cardHeight;
    }
  }, [initialIndex]);

  // Navigation functions
  const goToPrevious = () => {
    if (currentIndex > 0 && containerRef.current) {
      isScrolling.current = true;
      const cardHeight = containerRef.current.clientHeight;
      containerRef.current.scrollTo({
        top: (currentIndex - 1) * cardHeight,
        behavior: 'smooth'
      });
      if (navigator.vibrate) navigator.vibrate(10);
    }
  };

  const goToNext = () => {
    if (currentIndex < requests.length - 1 && containerRef.current) {
      isScrolling.current = true;
      const cardHeight = containerRef.current.clientHeight;
      containerRef.current.scrollTo({
        top: (currentIndex + 1) * cardHeight,
        behavior: 'smooth'
      });
      if (navigator.vibrate) navigator.vibrate(10);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelectRequest(requests[currentIndex]);
      } else if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, requests, onSelectRequest, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black"
    >
      {/* Close Button */}
      {onClose && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute top-[calc(env(safe-area-inset-top,12px)+8px)] right-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/20"
        >
          <X size={20} />
        </motion.button>
      )}

      {/* Progress Indicator */}
      <div className="absolute top-[calc(env(safe-area-inset-top,12px)+8px)] left-4 z-50 text-white/70 text-sm font-medium backdrop-blur-sm bg-black/30 px-3 py-1.5 rounded-full">
        {currentIndex + 1} / {requests.length}
      </div>

      {/* Navigation Arrows - Desktop */}
      <div className="hidden md:flex absolute right-16 z-40 flex-col gap-4 top-1/2 -translate-y-1/2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronUp size={24} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={goToNext}
          disabled={currentIndex === requests.length - 1}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronDown size={24} />
        </motion.button>
      </div>

      {/* Cards Container - Snap Scroll */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory no-scrollbar"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {requests.map((request, index) => (
          <div
            key={request.id}
            className="h-full w-full snap-start snap-always"
            style={{ scrollSnapAlign: 'start' }}
          >
            <SnapCard
              request={request}
              isActive={index === currentIndex}
              myOffer={getMyOffer(request.id)}
              isMyRequest={isMyRequest(request)}
              onClick={() => onSelectRequest(request)}
            />
          </div>
        ))}
      </div>

      {/* Bottom Navigation Dots */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,20px)+8px)] left-1/2 -translate-x-1/2 z-40 flex gap-1.5">
        {requests.slice(Math.max(0, currentIndex - 2), Math.min(requests.length, currentIndex + 3)).map((_, idx) => {
          const actualIndex = Math.max(0, currentIndex - 2) + idx;
          return (
            <motion.div
              key={actualIndex}
              animate={{
                scale: actualIndex === currentIndex ? 1.2 : 1,
                opacity: actualIndex === currentIndex ? 1 : 0.5,
              }}
              className={`h-1.5 rounded-full transition-all ${
                actualIndex === currentIndex ? 'w-6 bg-primary' : 'w-1.5 bg-white/50'
              }`}
            />
          );
        })}
      </div>
    </motion.div>
  );
};

export default FullScreenCardView;
