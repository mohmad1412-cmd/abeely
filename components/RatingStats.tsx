/**
 * RatingStats - إحصائيات التقييمات
 *
 * يعرض متوسط التقييم وتوزيع النجوم
 */

import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { UserRating } from "../types.ts";

interface RatingStatsProps {
  rating: UserRating;
  compact?: boolean;
}

export const RatingStats: React.FC<RatingStatsProps> = ({
  rating,
  compact = false,
}) => {
  const { averageRating, totalReviews } = rating;

  // Calculate percentages for the bars
  const getPercentage = (count: number) => {
    if (totalReviews === 0) return 0;
    return Math.round((count / totalReviews) * 100);
  };

  const starCounts = [
    { stars: 5, count: rating.fiveStarCount, label: "ممتاز" },
    { stars: 4, count: rating.fourStarCount, label: "جيد جداً" },
    { stars: 3, count: rating.threeStarCount, label: "جيد" },
    { stars: 2, count: rating.twoStarCount, label: "مقبول" },
    { stars: 1, count: rating.oneStarCount, label: "سيء" },
  ];

  const renderStars = (count: number, size: number = 14) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={`${
              star <= Math.round(count)
                ? "fill-yellow-400 text-yellow-400"
                : "fill-transparent text-gray-300 dark:text-gray-600"
            }`}
          />
        ))}
      </div>
    );
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2" dir="rtl">
        {renderStars(averageRating, 16)}
        <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground">
          ({totalReviews} تقييم)
        </span>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4" dir="rtl">
      {/* Main Rating Display */}
      <div className="flex items-center gap-6 mb-6">
        {/* Large Average */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-5xl font-bold text-foreground mb-2"
          >
            {averageRating.toFixed(1)}
          </motion.div>
          {renderStars(averageRating, 20)}
          <p className="text-sm text-muted-foreground mt-2">
            {totalReviews} تقييم
          </p>
        </div>

        {/* Distribution Bars */}
        <div className="flex-1 space-y-2">
          {starCounts.map((item, index) => (
            <motion.div
              key={item.stars}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3"
            >
              {/* Star Label */}
              <div className="flex items-center gap-1 w-8">
                <span className="text-sm font-medium">{item.stars}</span>
                <Star size={12} className="fill-yellow-400 text-yellow-400" />
              </div>

              {/* Progress Bar */}
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${getPercentage(item.count)}%` }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="h-full bg-yellow-400 rounded-full"
                />
              </div>

              {/* Count */}
              <span className="text-xs text-muted-foreground w-8 text-left">
                {item.count}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RatingStats;
