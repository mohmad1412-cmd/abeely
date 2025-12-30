import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Request, Offer } from '../../types';
import {
  Clock,
  MapPin,
  MessageCircle,
  Eye,
  CheckCircle,
  ArrowLeft,
  ChevronDown,
  DollarSign,
  Sparkles,
} from 'lucide-react';

interface TextCardViewProps {
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

export const TextCardView: React.FC<TextCardViewProps> = ({
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Format time ago
  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    return `منذ ${Math.floor(diffDays / 7)} أسبوع`;
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

  // Toggle expand
  const toggleExpand = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId(prev => prev === id ? null : id);
    if (navigator.vibrate) navigator.vibrate(5);
  }, []);

  // Handle card click
  const handleCardClick = useCallback((request: Request) => {
    if (navigator.vibrate) navigator.vibrate(10);
    onSelectRequest(request);
  }, [onSelectRequest]);

  // Intersection observer for infinite scroll
  React.useEffect(() => {
    if (!loadMoreRef.current || !hasMore || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  if (requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        <div className="text-center">
          <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-base font-medium">لا توجد طلبات</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 px-4 py-2">
      <AnimatePresence mode="popLayout">
        {requests.map((request, index) => {
          const isViewed = viewedRequestIds.has(request.id);
          const applied = hasApplied(request.id);
          const isOwn = isOwnRequest(request.authorId);
          const offersCount = isOwn ? getReceivedOffersCount(request.id) : (request.offersCount || 0);
          const isExpanded = expandedId === request.id;

          return (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ 
                delay: Math.min(index * 0.025, 0.12),
                type: 'spring',
                stiffness: 400,
                damping: 30,
              }}
              whileTap={{ scale: 0.98, backgroundColor: 'var(--secondary)' }}
              className={`
                group relative rounded-xl transition-all duration-200 text-card-item
                ${isViewed ? 'opacity-70' : ''}
                ${isExpanded ? 'bg-secondary/60 shadow-sm' : 'hover:bg-secondary/40 active:bg-secondary/60'}
              `}
            >
              {/* Main clickable area */}
              <div
                onClick={() => handleCardClick(request)}
                className="flex items-start gap-3 p-3 cursor-pointer"
              >
                {/* Right side indicator */}
                <div className="flex flex-col items-center gap-2 pt-1">
                  {!isViewed && !isOwn && (
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                  {isOwn && (
                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-[10px] text-primary font-bold">ط</span>
                    </span>
                  )}
                  {applied && !isOwn && (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className={`
                      text-sm font-semibold leading-tight line-clamp-1 flex-1
                      ${isViewed ? 'text-foreground/70' : 'text-foreground'}
                    `}>
                      {request.title}
                    </h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {formatTimeAgo(request.createdAt)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className={`
                    text-xs text-muted-foreground leading-relaxed mb-2
                    ${isExpanded ? '' : 'line-clamp-2'}
                  `}>
                    {request.description}
                  </p>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {/* Location */}
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="line-clamp-1">{request.location}</span>
                    </span>

                    {/* Budget */}
                    {(request.budgetMin || request.budgetMax) && (
                      <span className="flex items-center gap-1 text-primary">
                        <DollarSign className="w-3 h-3" />
                        <span>
                          {request.budgetMin && request.budgetMax
                            ? `${request.budgetMin}-${request.budgetMax}`
                            : request.budgetMin || request.budgetMax
                          }
                        </span>
                      </span>
                    )}

                    {/* Stats */}
                    <span className="flex items-center gap-1 mr-auto">
                      <Eye className="w-3 h-3" />
                      {request.viewCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {offersCount}
                    </span>
                  </div>

                  {/* Categories - shown on expand */}
                  <AnimatePresence>
                    {isExpanded && request.categories && request.categories.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50"
                      >
                        {request.categories.map((cat, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                          >
                            {cat}
                          </span>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Expand/Arrow button */}
                <button
                  onClick={(e) => toggleExpand(request.id, e)}
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.div>
                </button>
              </div>

              {/* Subtle divider */}
              {index < requests.length - 1 && (
                <div className="absolute bottom-0 left-12 right-4 h-px bg-border/50" />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
        {isLoadingMore && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span>جاري التحميل...</span>
          </div>
        )}
        {!hasMore && requests.length > 10 && (
          <span className="text-xs text-muted-foreground">
            نهاية القائمة • {requests.length} طلب
          </span>
        )}
      </div>
    </div>
  );
};

