import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  MessageCircle, 
  ChevronUp, 
  ChevronDown,
  Eye,
  User,
  Sparkles,
  ArrowLeft,
  Share2,
  Heart,
  X,
  Check,
  Send
} from "lucide-react";
import { Request, Offer } from "../../types";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface FullScreenCardViewProps {
  requests: Request[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onSelectRequest: (request: Request) => void;
  onClose: () => void;
  myOffers?: Offer[];
  userId?: string;
  isGuest?: boolean;
}

// ============================================
// Single Card Component
// ============================================
const RequestCard: React.FC<{
  request: Request;
  isActive: boolean;
  onTap: () => void;
  myOffer?: Offer;
  index: number;
}> = ({ request, isActive, onTap, myOffer, index }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  // Format time ago
  const timeAgo = request.createdAt 
    ? formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: ar })
    : "";

  // Get first category
  const firstCategory = request.categories?.[0] || "";
  
  // Status badge
  const hasOffer = !!myOffer;
  const offerAccepted = myOffer?.status === "accepted";

  return (
    <motion.div
      className="absolute inset-4 rounded-3xl overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: isActive ? 1 : 0.3,
        scale: isActive ? 1 : 0.95,
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30 
      }}
      onClick={onTap}
    >
      {/* Gradient Background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, 
            hsl(${(index * 40) % 360}, 60%, 25%) 0%, 
            hsl(${(index * 40 + 60) % 360}, 70%, 15%) 100%)`
        }}
      />
      
      {/* Decorative Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 right-10 w-40 h-40 rounded-full border-2 border-white/30" />
        <div className="absolute bottom-20 left-5 w-20 h-20 rounded-full border border-white/20" />
        <div className="absolute top-1/2 right-1/4 w-60 h-60 rounded-full border border-white/10" />
      </div>

      {/* Content Container */}
      <div className="relative h-full flex flex-col justify-between p-6 text-white">
        
        {/* Top Section - Category & Time */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {firstCategory && (
              <span className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium">
                {firstCategory}
              </span>
            )}
            {hasOffer && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  offerAccepted 
                    ? "bg-emerald-500/90 text-white" 
                    : "bg-amber-500/90 text-white"
                }`}
              >
                {offerAccepted ? "✓ معتمد" : "⏳ بانتظار"}
              </motion.span>
            )}
          </div>
          
          <span className="text-white/60 text-sm flex items-center gap-1">
            <Clock size={14} />
            {timeAgo}
          </span>
        </div>

        {/* Middle Section - Title & Description */}
        <div className="flex-1 flex flex-col justify-center py-8">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold mb-4 leading-tight"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {request.title || request.description?.slice(0, 50) || "طلب جديد"}
          </motion.h2>
          
          <motion.p 
            className="text-lg text-white/80 leading-relaxed line-clamp-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {request.description}
          </motion.p>
        </div>

        {/* Bottom Section - Details */}
        <div className="space-y-4">
          {/* Location & Budget */}
          <div className="flex flex-wrap gap-3">
            {request.location && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-sm">
                <MapPin size={18} />
                <span className="font-medium">{request.location}</span>
              </div>
            )}
            
            {(request.budgetMin || request.budgetMax) && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-sm">
                <DollarSign size={18} />
                <span className="font-medium">
                  {request.budgetMin && request.budgetMax 
                    ? `${request.budgetMin} - ${request.budgetMax} ر.س`
                    : request.budgetMin 
                      ? `من ${request.budgetMin} ر.س`
                      : `حتى ${request.budgetMax} ر.س`
                  }
                </span>
              </div>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-white/60">
              <span className="flex items-center gap-1">
                <Eye size={16} />
                {request.viewCount || 0}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle size={16} />
                {request.offersCount || request.offers?.length || 0}
              </span>
            </div>
            
            {/* Author */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <User size={16} />
              </div>
              <span className="text-white/70 text-sm">
                {request.authorName || "مستخدم"}
              </span>
            </div>
          </div>

          {/* Action Hint */}
          <motion.div 
            className="flex justify-center pt-4"
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="text-white/40 text-sm flex items-center gap-2">
              <ChevronUp size={20} />
              اسحب للأعلى للمزيد
            </span>
          </motion.div>
        </div>
      </div>

      {/* Glow Effect on Active */}
      {isActive && (
        <motion.div 
          className="absolute inset-0 rounded-3xl pointer-events-none"
          initial={{ boxShadow: "0 0 0 0 rgba(30, 150, 140, 0)" }}
          animate={{ 
            boxShadow: [
              "0 0 0 0 rgba(30, 150, 140, 0)",
              "0 0 60px 10px rgba(30, 150, 140, 0.3)",
              "0 0 0 0 rgba(30, 150, 140, 0)"
            ] 
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};

// ============================================
// Main Component
// ============================================
export const FullScreenCardView: React.FC<FullScreenCardViewProps> = ({
  requests,
  currentIndex,
  onIndexChange,
  onSelectRequest,
  onClose,
  myOffers = [],
  userId,
  isGuest = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  
  // Touch tracking
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const lastVelocity = useRef(0);
  
  // Get my offer for current request
  const getMyOffer = (requestId: string) => {
    return myOffers.find(o => o.requestId === requestId);
  };

  // Handle snap scroll with haptic
  const snapToIndex = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= requests.length) return;
    if (newIndex === currentIndex) return;
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    onIndexChange(newIndex);
  }, [currentIndex, requests.length, onIndexChange]);

  // Handle drag end with velocity
  const handleDragEnd = (e: any, info: PanInfo) => {
    setIsDragging(false);
    
    const velocity = info.velocity.y;
    const offset = info.offset.y;
    const threshold = 100;
    const velocityThreshold = 500;
    
    if (offset < -threshold || velocity < -velocityThreshold) {
      // Swipe up - next
      snapToIndex(currentIndex + 1);
    } else if (offset > threshold || velocity > velocityThreshold) {
      // Swipe down - previous
      snapToIndex(currentIndex - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        snapToIndex(currentIndex - 1);
      } else if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        snapToIndex(currentIndex + 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelectRequest(requests[currentIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, requests, snapToIndex, onSelectRequest, onClose]);

  // Wheel navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let wheelTimeout: NodeJS.Timeout;
    let accumulatedDelta = 0;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      accumulatedDelta += e.deltaY;
      
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        if (Math.abs(accumulatedDelta) > 50) {
          if (accumulatedDelta > 0) {
            snapToIndex(currentIndex + 1);
          } else {
            snapToIndex(currentIndex - 1);
          }
        }
        accumulatedDelta = 0;
      }, 50);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [currentIndex, snapToIndex]);

  return (
    <motion.div
      ref={containerRef}
      className="fixed inset-0 z-[200] bg-black overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center justify-between">
          <motion.button
            onClick={onClose}
            className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X size={24} />
          </motion.button>
          
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white">
            <span className="font-bold">{currentIndex + 1}</span>
            <span className="text-white/50">/</span>
            <span className="text-white/70">{requests.length}</span>
          </div>
          
          <motion.button
            onClick={() => onSelectRequest(requests[currentIndex])}
            className="px-5 py-2.5 rounded-2xl bg-primary text-white font-bold flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Send size={18} />
            قدّم عرض
          </motion.button>
        </div>
      </div>

      {/* Cards Container with Drag */}
      <motion.div
        className="h-full w-full"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence mode="popLayout">
          {requests.map((request, index) => {
            // Only render nearby cards for performance
            if (Math.abs(index - currentIndex) > 2) return null;
            
            return (
              <motion.div
                key={request.id}
                className="absolute inset-0"
                initial={{ 
                  y: index > currentIndex ? "100%" : "-100%",
                  opacity: 0 
                }}
                animate={{ 
                  y: `${(index - currentIndex) * 100}%`,
                  opacity: Math.abs(index - currentIndex) <= 1 ? 1 : 0
                }}
                exit={{ 
                  y: index > currentIndex ? "100%" : "-100%",
                  opacity: 0 
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30 
                }}
              >
                <RequestCard
                  request={request}
                  isActive={index === currentIndex}
                  onTap={() => {
                    if (!isDragging) {
                      onSelectRequest(request);
                    }
                  }}
                  myOffer={getMyOffer(request.id)}
                  index={index}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Navigation Dots */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {requests.slice(0, Math.min(10, requests.length)).map((_, index) => (
          <motion.button
            key={index}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex 
                ? "bg-primary w-2 h-6" 
                : "bg-white/30"
            }`}
            onClick={() => snapToIndex(index)}
            whileHover={{ scale: 1.5 }}
          />
        ))}
        {requests.length > 10 && (
          <span className="text-white/50 text-xs text-center">+{requests.length - 10}</span>
        )}
      </div>

      {/* Navigation Hints */}
      <AnimatePresence>
        {currentIndex > 0 && (
          <motion.div
            className="absolute top-20 left-1/2 -translate-x-1/2 text-white/40 flex flex-col items-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <ChevronUp size={24} />
            <span className="text-xs">السابق</span>
          </motion.div>
        )}
        
        {currentIndex < requests.length - 1 && (
          <motion.div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/40 flex flex-col items-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span className="text-xs">التالي</span>
            <ChevronDown size={24} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-8">
        <div className="flex justify-center gap-4">
          <motion.button
            className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Share2 size={22} />
          </motion.button>
          
          <motion.button
            className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Heart size={22} />
          </motion.button>
          
          <motion.button
            onClick={() => onSelectRequest(requests[currentIndex])}
            className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Check size={26} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default FullScreenCardView;

