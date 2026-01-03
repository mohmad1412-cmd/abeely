import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  MessageCircle, 
  Eye,
  User,
  ChevronLeft,
  Check,
  Send,
  Lock,
  Hourglass
} from "lucide-react";
import { Request, Offer } from "../../types";
import { formatTimeAgo } from "../../utils/timeFormat";
import { AVAILABLE_CATEGORIES } from "../../data";
import { getKnownCategoryColor } from "../../utils/categoryColors";
import { CategoryIcon } from "./CategoryIcon";

interface SimpleRequestCardProps {
  request: Request;
  onClick: () => void;
  myOffer?: Offer;
  receivedOffersCount?: number;
  isMyRequest?: boolean;
  isViewed?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
  index?: number;
}

export const SimpleRequestCard: React.FC<SimpleRequestCardProps> = ({
  request,
  onClick,
  myOffer,
  receivedOffersCount = 0,
  isMyRequest = false,
  isViewed = false,
  variant = 'default',
  index = 0,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  
  // Format time ago
  const timeAgo = request.createdAt 
    ? formatTimeAgo(request.createdAt, true)
    : "";

  // Status
  const hasOffer = !!myOffer;
  const offerAccepted = myOffer?.status === "accepted";
  const isNew = !isViewed && !isMyRequest;
  const isCompleted = request.status === "assigned" || request.status === "completed";

  // Get budget display - only show if both min and max exist
  const budgetDisplay = request.budgetMin && request.budgetMax
    ? `الميزانية: ${request.budgetMin} - ${request.budgetMax}`
    : null;

  // Get delivery time display - only show if deliveryTimeFrom exists and type is not 'not-specified' or 'immediate'
  const deliveryDisplay = request.deliveryTimeFrom && 
    request.deliveryTimeType !== 'not-specified' && 
    request.deliveryTimeType !== 'immediate'
    ? request.deliveryTimeFrom
    : null;

  // ====================================
  // MINIMAL VARIANT - Text only, super clean
  // ====================================
  if (variant === 'minimal') {
    return (
      <motion.button
        className={`w-full text-right p-4 border-b border-border/30 flex items-center gap-3 transition-all ${
          isPressed ? "bg-primary/5" : "hover:bg-secondary/20"
        } ${isNew ? "bg-primary/[0.02]" : ""}`}
        onClick={onClick}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(index * 0.02, 0.2) }}
      >
        {/* New Indicator */}
        {isNew && (
          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm line-clamp-1 ${isNew ? "font-bold" : "font-medium"}`}>
            {request.title || request.description?.slice(0, 50)}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
            {request.location && (
              <span className="flex items-center gap-0.5">
                <MapPin size={10} />
                {request.location.split('،')[0]}
              </span>
            )}
            <span>•</span>
            <span>{timeAgo}</span>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasOffer && (
            <span className={`w-6 h-6 rounded-full flex items-center justify-center ${
              offerAccepted ? "bg-primary/15 text-primary" : "bg-accent/20 text-accent-foreground"
            }`}>
              {offerAccepted ? <Check size={12} /> : <Clock size={12} />}
            </span>
          )}
          <ChevronLeft size={16} className="text-muted-foreground/50" />
        </div>
      </motion.button>
    );
  }

  // ====================================
  // COMPACT VARIANT - Small card, essential info
  // ====================================
  if (variant === 'compact') {
    return (
      <motion.div
        className={`bg-card border border-border/50 rounded-xl p-4 cursor-pointer transition-all ${
          isPressed ? "scale-[0.98]" : "hover:border-primary/30 hover:shadow-sm"
        }`}
        onClick={onClick}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.03, 0.3) }}
      >
        <div className="flex items-start gap-3">
          {/* Status Indicator */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isMyRequest 
              ? "bg-teal-500/10 text-teal-600" 
              : isNew 
                ? "bg-primary/10 text-primary" 
                : "bg-secondary text-muted-foreground"
          }`}>
            {isMyRequest ? <User size={18} /> : isNew ? <span className="text-lg">🆕</span> : <Eye size={16} />}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm line-clamp-1 mb-1">
              {request.title || request.description?.slice(0, 40)}
            </h3>
            
            <div className="flex items-center flex-wrap gap-2 text-[11px] text-muted-foreground">
              {request.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} />
                  {request.location.split('،')[0]}
                </span>
              )}
              {budgetDisplay && (
                <span className="flex items-center gap-1 text-primary">
                  <DollarSign size={11} />
                  {budgetDisplay}
                </span>
              )}
              {deliveryDisplay && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Hourglass size={11} />
                  التنفيذ خلال: {deliveryDisplay}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {timeAgo}
              </span>
            </div>
          </div>

          {/* Action */}
          <div className="flex-shrink-0">
            {isCompleted ? (
              <Lock size={16} className="text-muted-foreground" />
            ) : isMyRequest ? (
              <div className="flex items-center gap-1 text-xs font-bold text-primary">
                <MessageCircle size={14} />
                {receivedOffersCount}
              </div>
            ) : hasOffer ? (
              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                offerAccepted ? "bg-primary/10 text-primary" : "bg-accent/15 text-accent-foreground"
              }`}>
                {offerAccepted ? "✓" : "⏳"}
              </span>
            ) : (
              <ChevronLeft size={18} className="text-muted-foreground/50" />
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // ====================================
  // DEFAULT VARIANT - Full card with image
  // ====================================
  return (
    <motion.div
      className={`bg-card border border-border rounded-2xl overflow-hidden cursor-pointer transition-all ${
        isPressed ? "scale-[0.98]" : "hover:border-primary/30 hover:shadow-lg"
      }`}
      onClick={onClick}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      whileHover={{ y: -4 }}
    >
      {/* Image or Placeholder */}
      <div className="relative h-32 w-full bg-gradient-to-br from-secondary to-muted/50 overflow-hidden">
        {request.images && request.images.length > 0 ? (
          <>
            <img
              src={request.images[0]}
              alt=""
              className="w-full h-full object-cover"
            />
            {request.images.length > 1 && (
              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium">
                +{request.images.length - 1}
              </span>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl opacity-20">📋</div>
          </div>
        )}
        
        {/* Status Badge */}
        {(isMyRequest || isNew || hasOffer) && (
          <div className="absolute top-2 right-2">
            {isMyRequest ? (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-teal-500 text-white text-[10px] font-bold">
                <User size={10} />
                طلبي
              </span>
            ) : hasOffer ? (
              <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                offerAccepted ? "bg-primary text-white" : "bg-accent text-accent-foreground"
              }`}>
                {offerAccepted ? <Check size={10} /> : <Clock size={10} />}
                {offerAccepted ? "معتمد" : "بانتظار"}
              </span>
            ) : isNew ? (
              <span className="px-2 py-1 rounded-full bg-primary text-white text-[10px] font-bold">
                جديد
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-bold text-base line-clamp-1 mb-1">
          {request.title || request.description?.slice(0, 40)}
        </h3>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
          {request.description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            {request.location && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {request.location.split('،')[0]}
              </span>
            )}
            {budgetDisplay && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <DollarSign size={12} />
                {budgetDisplay}
              </span>
            )}
            {deliveryDisplay && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Hourglass size={12} />
                التنفيذ خلال: {deliveryDisplay}
              </span>
            )}
          </div>
          <span>{timeAgo}</span>
        </div>

        {/* Categories - All categories displayed as circles */}
        {request.categories && request.categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {request.categories.map((catLabel, idx) => {
              const categoryObj = AVAILABLE_CATEGORIES.find(c => c.label === catLabel || c.id === catLabel);
              const categoryId = categoryObj?.id || catLabel;
              const categoryColor = getKnownCategoryColor(categoryId);
              
              return (
                <div
                  key={idx}
                  className={`w-8 h-8 rounded-full flex items-center justify-center border ${categoryColor}`}
                  title={categoryObj?.label || catLabel}
                >
                  <CategoryIcon 
                    icon={categoryObj?.icon} 
                    emoji={categoryObj?.emoji} 
                    size={14} 
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Action Button for My Requests */}
        {isMyRequest && receivedOffersCount > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-center gap-2 text-primary font-bold text-sm">
              <MessageCircle size={16} />
              <span>{receivedOffersCount} عرض جديد</span>
            </div>
          </div>
        )}

        {/* CTA for non-owners */}
        {!isMyRequest && !isCompleted && !hasOffer && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
              <Send size={14} />
              <span>قدّم عرضك</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SimpleRequestCard;

