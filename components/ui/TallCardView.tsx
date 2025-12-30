import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Request, Offer } from '../../types';
import {
  Clock,
  MapPin,
  MessageCircle,
  Eye,
  CheckCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { Badge } from './Badge';

interface TallCardViewProps {
  requests: Request[];
  myOffers: Offer[];
  receivedOffersMap?: Map<string, Offer[]>;
  userId?: string;
  viewedRequestIds: Set<string>;
  onSelectRequest: (req: Request) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export const TallCardView: React.FC<TallCardViewProps> = ({
  requests,
  myOffers,
  receivedOffersMap = new Map(),
  userId,
  viewedRequestIds,
  onSelectRequest,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const velocityRef = useRef(0);
  const lastTouchRef = useRef(0);
  const lastTimeRef = useRef(0);

  // Card dimensions
  const CARD_WIDTH = 320;
  const CARD_GAP = 24;
  const CARD_TOTAL_WIDTH = CARD_WIDTH + CARD_GAP;

  // Calculate offset to center first card
  const getInitialOffset = useCallback(() => {
    if (!scrollContainerRef.current) return 0;
    const containerWidth = scrollContainerRef.current.clientWidth;
    return (containerWidth - CARD_WIDTH) / 2;
  }, []);

  // Haptic feedback
  const triggerHaptic = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (navigator.vibrate) {
      switch (intensity) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(20);
          break;
        case 'heavy':
          navigator.vibrate([10, 20, 30]);
          break;
      }
    }
  }, []);

  // Snap to card
  const snapToCard = useCallback((index: number, smooth = true) => {
    if (!scrollContainerRef.current || isSnapping) return;
    
    const targetIndex = Math.max(0, Math.min(index, requests.length - 1));
    const initialOffset = getInitialOffset();
    const targetScroll = targetIndex * CARD_TOTAL_WIDTH;
    
    setIsSnapping(true);
    
    if (smooth) {
      scrollContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
    } else {
      scrollContainerRef.current.scrollLeft = targetScroll;
    }
    
    if (targetIndex !== activeIndex) {
      triggerHaptic('light');
      setActiveIndex(targetIndex);
    }
    
    setTimeout(() => setIsSnapping(false), 300);
  }, [activeIndex, requests.length, getInitialOffset, isSnapping, triggerHaptic]);

  // Handle scroll end
  const handleScrollEnd = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const targetIndex = Math.round(scrollLeft / CARD_TOTAL_WIDTH);
    
    snapToCard(targetIndex);
    
    // Load more if near end
    if (targetIndex >= requests.length - 3 && hasMore && onLoadMore && !isLoadingMore) {
      onLoadMore();
    }
  }, [snapToCard, requests.length, hasMore, onLoadMore, isLoadingMore]);

  // Touch handlers for velocity-based snapping
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    lastTouchRef.current = e.touches[0].clientX;
    lastTimeRef.current = Date.now();
    velocityRef.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const currentTime = Date.now();
    const deltaX = currentX - lastTouchRef.current;
    const deltaTime = currentTime - lastTimeRef.current;
    
    if (deltaTime > 0) {
      velocityRef.current = deltaX / deltaTime;
    }
    
    lastTouchRef.current = currentX;
    lastTimeRef.current = currentTime;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const velocity = velocityRef.current;
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const currentIndex = scrollLeft / CARD_TOTAL_WIDTH;
    
    let targetIndex: number;
    
    // Velocity-based navigation
    if (Math.abs(velocity) > 0.3) {
      if (velocity < 0) {
        targetIndex = Math.ceil(currentIndex);
      } else {
        targetIndex = Math.floor(currentIndex);
      }
      triggerHaptic('medium');
    } else {
      targetIndex = Math.round(currentIndex);
    }
    
    snapToCard(targetIndex);
  }, [snapToCard, triggerHaptic]);

  // Scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        handleScrollEnd();
      }, 150);
      
      // Update active index during scroll
      const scrollLeft = container.scrollLeft;
      const newIndex = Math.round(scrollLeft / CARD_TOTAL_WIDTH);
      if (newIndex !== activeIndex && newIndex >= 0 && newIndex < requests.length) {
        setActiveIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [activeIndex, handleScrollEnd, requests.length]);

  // Navigate to adjacent cards
  const goToPrev = useCallback(() => {
    snapToCard(activeIndex - 1);
  }, [activeIndex, snapToCard]);

  const goToNext = useCallback(() => {
    snapToCard(activeIndex + 1);
  }, [activeIndex, snapToCard]);

  // Format time ago
  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `${diffMins} د`;
    if (diffHours < 24) return `${diffHours} س`;
    return `${diffDays} ي`;
  };

  // Check if user has applied to request
  const hasApplied = (requestId: string) => {
    return myOffers.some(offer => offer.requestId === requestId);
  };

  // Get offers count on user's request
  const getReceivedOffersCount = (requestId: string) => {
    return receivedOffersMap.get(requestId)?.length || 0;
  };

  // Check if request is user's own
  const isOwnRequest = (authorId: string | null) => {
    return userId && authorId === userId;
  };

  if (requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        <div className="text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">لا توجد طلبات</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Navigation arrows - Desktop */}
      <button
        onClick={goToPrev}
        disabled={activeIndex === 0}
        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center bg-background/80 backdrop-blur-sm rounded-full shadow-lg border border-border hover:bg-secondary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
      
      <button
        onClick={goToNext}
        disabled={activeIndex === requests.length - 1}
        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center bg-background/80 backdrop-blur-sm rounded-full shadow-lg border border-border hover:bg-secondary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Cards Container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth pb-4"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          paddingLeft: `calc((100% - ${CARD_WIDTH}px) / 2)`,
          paddingRight: `calc((100% - ${CARD_WIDTH}px) / 2)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="popLayout">
          {requests.map((request, index) => {
            const isActive = index === activeIndex;
            const isViewed = viewedRequestIds.has(request.id);
            const applied = hasApplied(request.id);
            const isOwn = isOwnRequest(request.authorId);
            const offersCount = isOwn ? getReceivedOffersCount(request.id) : (request.offersCount || 0);
            
            return (
              <motion.div
                key={request.id}
                ref={el => {
                  if (el) cardRefs.current.set(index, el);
                }}
                className="flex-shrink-0 snap-center tall-card-item"
                style={{
                  width: CARD_WIDTH,
                  marginRight: index === requests.length - 1 ? 0 : CARD_GAP,
                }}
                initial={{ opacity: 0, scale: 0.85, rotateY: -15 }}
                animate={{
                  opacity: isActive ? 1 : 0.5,
                  scale: isActive ? 1 : 0.85,
                  y: isActive ? 0 : 20,
                  rotateY: isActive ? 0 : (index < activeIndex ? 8 : -8),
                  filter: isActive ? 'blur(0px)' : 'blur(1px)',
                }}
                transition={{
                  type: 'spring',
                  stiffness: 350,
                  damping: 28,
                }}
                onClick={() => {
                  if (isActive) {
                    triggerHaptic('medium');
                    onSelectRequest(request);
                  } else {
                    snapToCard(index);
                  }
                }}
              >
                <div
                  className={`
                    relative h-[520px] rounded-3xl overflow-hidden cursor-pointer
                    border-2 transition-all duration-300
                    ${isActive 
                      ? 'border-primary tall-card-active' 
                      : 'border-border/50 shadow-lg'
                    }
                    ${isViewed && !isActive ? 'opacity-75' : ''}
                  `}
                  style={{
                    background: isActive 
                      ? 'linear-gradient(165deg, var(--card) 0%, var(--background) 50%, rgba(30, 150, 140, 0.03) 100%)'
                      : 'linear-gradient(180deg, var(--card) 0%, var(--background) 100%)',
                  }}
                >
                  {/* Status badges */}
                  <div className="absolute top-4 right-4 left-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                      {isOwn && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs px-2 py-0.5">
                          طلبي
                        </Badge>
                      )}
                      {applied && !isOwn && (
                        <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-xs px-2 py-0.5">
                          <CheckCircle className="w-3 h-3 ml-1" />
                          تقدمت
                        </Badge>
                      )}
                      {!isViewed && !isOwn && (
                        <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground bg-background/70 backdrop-blur-sm px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3 inline ml-1" />
                      {formatTimeAgo(request.createdAt)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col p-5 pt-14">
                    {/* Categories */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {(request.categories || []).slice(0, 3).map((cat, i) => (
                        <span
                          key={i}
                          className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-foreground mb-3 line-clamp-2 leading-relaxed">
                      {request.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-4 mb-4 leading-relaxed flex-grow">
                      {request.description}
                    </p>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{request.location}</span>
                    </div>

                    {/* Budget */}
                    {(request.budgetMin || request.budgetMax) && (
                      <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">
                          {request.budgetMin && request.budgetMax
                            ? `${request.budgetMin} - ${request.budgetMax} ر.س`
                            : request.budgetMin
                              ? `من ${request.budgetMin} ر.س`
                              : `حتى ${request.budgetMax} ر.س`
                          }
                        </span>
                      </div>
                    )}

                    {/* Footer stats */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Eye className="w-3.5 h-3.5" />
                          {request.viewCount || 0}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MessageCircle className="w-3.5 h-3.5" />
                          {offersCount}
                        </span>
                      </div>
                      
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-1 text-xs text-primary font-medium"
                        >
                          <span>عرض التفاصيل</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Active indicator gradient */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary to-primary/50" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoadingMore && (
          <div className="flex-shrink-0 flex items-center justify-center w-20">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Progress indicators */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {requests.slice(0, Math.min(requests.length, 10)).map((_, index) => (
          <button
            key={index}
            onClick={() => snapToCard(index)}
            className={`
              h-2 rounded-full transition-all duration-300
              ${index === activeIndex 
                ? 'w-8 bg-primary' 
                : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }
            `}
          />
        ))}
        {requests.length > 10 && (
          <span className="text-xs text-muted-foreground mr-2">
            +{requests.length - 10}
          </span>
        )}
      </div>

      {/* Current card indicator */}
      <div className="text-center mt-3 text-sm text-muted-foreground">
        <span className="font-bold text-foreground">{activeIndex + 1}</span>
        <span> / {requests.length}</span>
      </div>
    </div>
  );
};

