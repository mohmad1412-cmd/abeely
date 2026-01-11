/**
 * ReviewCard - بطاقة عرض مراجعة واحدة
 *
 * تعرض معلومات المراجعة: الكاتب، التقييم، التعليق، والتاريخ
 */

import React from "react";
import { motion } from "framer-motion";
import { Calendar, ExternalLink, Star, User } from "lucide-react";
import { Review } from "../types.ts";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface ReviewCardProps {
  review: Review;
  onRequestClick?: (requestId: string) => void;
  showRequest?: boolean;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onRequestClick,
  showRequest = false,
}) => {
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={`${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-transparent text-gray-300 dark:text-gray-600"
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
      dir="rtl"
    >
      {/* Header: Author info + Rating */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {review.reviewerAvatar
              ? (
                <img
                  src={review.reviewerAvatar}
                  alt={review.reviewerName}
                  className="w-full h-full object-cover"
                />
              )
              : <User size={20} className="text-muted-foreground" />}
          </div>
          {/* Name and Date */}
          <div>
            <p className="font-medium text-foreground">
              {review.reviewerName || review.authorName || "مستخدم"}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar size={12} />
              <span>
                {formatDate(review.createdAt || review.date || new Date())}
              </span>
            </div>
          </div>
        </div>
        {/* Rating */}
        {renderStars(review.rating)}
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-foreground/80 text-sm leading-relaxed mb-3">
          {review.comment}
        </p>
      )}

      {/* Related Request Link */}
      {showRequest && review.requestTitle && (
        <button
          onClick={() => onRequestClick?.(review.requestId)}
          className="flex items-center gap-2 text-xs text-primary hover:underline"
        >
          <ExternalLink size={12} />
          <span>{review.requestTitle}</span>
        </button>
      )}
    </motion.div>
  );
};

export default ReviewCard;
