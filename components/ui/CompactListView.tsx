import React, { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  MessageCircle, 
  ChevronLeft,
  Eye,
  Sparkles,
  Check,
  AlertCircle
} from "lucide-react";
import { Request, Offer } from "../../types";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface CompactListViewProps {
  requests: Request[];
  onSelectRequest: (request: Request) => void;
  myOffers?: Offer[];
  userId?: string;
  isGuest?: boolean;
  viewedRequestIds?: Set<string>;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  // External scroll position (from parent)
  externalScrollY?: number;
}

// ============================================
// Single List Item - Ultra Simple
// ============================================
const ListItem: React.FC<{
  request: Request;
  onTap: () => void;
  myOffer?: Offer;
  isViewed: boolean;
  index: number;
}> = ({ request, onTap, myOffer, isViewed, index }) => {
  const [isPressed, setIsPressed] = useState(false);
  
  // Format time ago
  const timeAgo = request.createdAt 
    ? formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: ar })
    : "";

  // Status
  const hasOffer = !!myOffer;
  const offerAccepted = myOffer?.status === "accepted";

  // Get budget display
  const budgetDisplay = request.budgetMin || request.budgetMax
    ? `${request.budgetMin || "?"} - ${request.budgetMax || "?"} ر.س`
    : null;

  return (
    <motion.button
      className={`w-full text-right p-4 rounded-2xl border transition-all mb-3 overflow-hidden shadow-sm flex items-start gap-3 ${
        isPressed 
          ? "bg-primary/5 border-primary/20 scale-[0.98]" 
          : "bg-card hover:bg-secondary/10 border-border/40 hover:border-primary/20"
      } ${!isViewed ? "border-primary/20 bg-primary/[0.01]" : ""}`}
      onClick={onTap}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        delay: Math.min(index * 0.03, 0.3),
        type: "spring",
        stiffness: 400,
        damping: 30
      }}
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <h3 className={`font-bold text-base mb-1.5 line-clamp-1 ${!isViewed ? "text-foreground" : "text-foreground/80"}`}>
          {request.title || request.description?.slice(0, 40) || "طلب"}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {request.description}
        </p>
        
        {/* Meta Row */}
        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground/70 font-medium">
          {request.location && (
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="text-primary/60" />
              {request.location}
            </span>
          )}
          
          {budgetDisplay && (
            <span className="flex items-center gap-1.5">
              <DollarSign size={13} className="text-primary/60" />
              {budgetDisplay}
            </span>
          )}
          
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="text-primary/60" />
            {timeAgo}
          </span>
          
          <span className="flex items-center gap-1.5">
            <MessageCircle size={13} className="text-primary/60" />
            {request.offersCount || request.offers?.length || 0}
          </span>
        </div>
      </div>

      {/* Right Side - Status & Arrow */}
      <div className="flex flex-col items-end gap-3 flex-shrink-0 self-center">
        {hasOffer ? (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm ${
            offerAccepted 
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
          }`}>
            {offerAccepted ? "✓ معتمد" : "بانتظار"}
          </span>
        ) : request.categories?.[0] ? (
          <span className="px-2.5 py-1 rounded-full bg-secondary/80 text-[10px] font-bold text-muted-foreground border border-border/50">
            {request.categories[0]}
          </span>
        ) : null}
        
        <div className="w-8 h-8 rounded-full bg-secondary/30 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <ChevronLeft size={16} className="text-muted-foreground/50 group-hover:text-primary/70" />
        </div>
      </div>
    </motion.button>
  );
};

// ============================================
// Main Component
// ============================================
export const CompactListView: React.FC<CompactListViewProps> = ({
  requests,
  onSelectRequest,
  myOffers = [],
  userId,
  isGuest = false,
  viewedRequestIds = new Set(),
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  externalScrollY = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get my offer for a request
  const getMyOffer = useCallback((requestId: string) => {
    return myOffers.find(o => o.requestId === requestId);
  }, [myOffers]);

  // Handle infinite scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    
    // Load more trigger
    if (!onLoadMore || isLoadingMore || !hasMore) return;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      onLoadMore();
    }
  }, [onLoadMore, isLoadingMore, hasMore]);

  // Empty state
  if (requests.length === 0) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className="relative"
      onScroll={handleScroll}
    >
      {/* Header with counter */}
      <div className="relative">
        {/* Header */}
        <div className="bg-card/80 backdrop-blur-md border-b border-border px-4 py-3 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {requests.length} طلب
            </span>
          </div>
        </div>
      </div>

      {/* List Content */}
      <div className="px-0 py-4 pb-20 relative z-[1]">
        {requests.map((request, index) => {
          const isUnread = !viewedRequestIds.has(request.id);
          return (
            <div key={request.id} className="flex items-center">
              {/* Right Margin - الهامش الأيمن مع النقطة */}
              <div className="w-4 flex-shrink-0 flex items-center justify-center">
                {isUnread && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25, delay: Math.min(index * 0.03, 0.3) }}
                  >
                    <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(30,150,140,0.6)]" />
                  </motion.div>
                )}
              </div>
              {/* الكرت */}
              <div className="flex-1 min-w-0">
                <ListItem
                  request={request}
                  onTap={() => onSelectRequest(request)}
                  myOffer={getMyOffer(request.id)}
                  isViewed={viewedRequestIds.has(request.id)}
                  index={index}
                />
              </div>
              {/* Left Margin - الهامش الأيسر (للتناظر) */}
              <div className="w-4 flex-shrink-0" />
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {isLoadingMore && (
        <div className="py-4 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* End of List */}
      {!hasMore && requests.length > 0 && (
        <div className="py-6 text-center text-sm text-muted-foreground">
          نهاية القائمة
        </div>
      )}
    </div>
  );
};

export default CompactListView;

