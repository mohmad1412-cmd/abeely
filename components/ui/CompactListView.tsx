import React, { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const isNew = !isViewed;

  // Get budget display
  const budgetDisplay = request.budgetMin || request.budgetMax
    ? `${request.budgetMin || "?"} - ${request.budgetMax || "?"} ر.س`
    : null;

  return (
    <motion.button
      className={`w-full text-right p-4 border-b border-border/50 flex items-start gap-3 transition-colors ${
        isPressed ? "bg-primary/5" : "bg-card hover:bg-secondary/30"
      } ${isNew ? "bg-primary/[0.02]" : ""}`}
      onClick={onTap}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
    >
      {/* New Indicator */}
      {isNew && (
        <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary animate-pulse" />
      )}
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <h3 className={`font-bold text-base mb-1 line-clamp-1 ${isNew ? "text-foreground" : "text-foreground/80"}`}>
          {request.title || request.description?.slice(0, 40) || "طلب"}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {request.description}
        </p>
        
        {/* Meta Row */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {request.location && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {request.location}
            </span>
          )}
          
          {budgetDisplay && (
            <span className="flex items-center gap-1">
              <DollarSign size={12} />
              {budgetDisplay}
            </span>
          )}
          
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {timeAgo}
          </span>
          
          <span className="flex items-center gap-1">
            <MessageCircle size={12} />
            {request.offersCount || request.offers?.length || 0}
          </span>
        </div>
      </div>

      {/* Right Side - Status & Arrow */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {hasOffer ? (
          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
            offerAccepted 
              ? "bg-emerald-500/10 text-emerald-600" 
              : "bg-amber-500/10 text-amber-600"
          }`}>
            {offerAccepted ? "✓ معتمد" : "بانتظار"}
          </span>
        ) : request.categories?.[0] ? (
          <span className="px-2 py-1 rounded-lg bg-secondary text-[10px] font-medium text-muted-foreground">
            {request.categories[0]}
          </span>
        ) : null}
        
        <ChevronLeft size={18} className="text-muted-foreground/50" />
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get my offer for a request
  const getMyOffer = useCallback((requestId: string) => {
    return myOffers.find(o => o.requestId === requestId);
  }, [myOffers]);

  // Handle infinite scroll
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !onLoadMore || isLoadingMore || !hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      onLoadMore();
    }
  }, [onLoadMore, isLoadingMore, hasMore]);

  // Empty state
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
          <AlertCircle size={32} className="text-muted-foreground" />
        </div>
        <h3 className="font-bold text-lg mb-2">لا توجد طلبات</h3>
        <p className="text-sm text-muted-foreground">
          لا توجد طلبات مطابقة للبحث حالياً
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-y-auto"
      onScroll={handleScroll}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {requests.length} طلب
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles size={12} className="text-primary" />
            عرض مبسط
          </span>
        </div>
      </div>

      {/* List */}
      <div>
        {requests.map((request, index) => (
          <ListItem
            key={request.id}
            request={request}
            onTap={() => onSelectRequest(request)}
            myOffer={getMyOffer(request.id)}
            isViewed={viewedRequestIds.has(request.id)}
            index={index}
          />
        ))}
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

