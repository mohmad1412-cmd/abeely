/**
 * StarRatingInput - مكون إدخال التقييم بالنجوم
 *
 * يستخدم لإدخال أو عرض تقييم من 1 إلى 5 نجوم
 * يدعم RTL وله تأثيرات hover وanimations
 */

import React, { useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

interface StarRatingInputProps {
  value: number;
  onChange?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
  showLabel?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
};

const labels = ["", "سيء", "مقبول", "جيد", "جيد جداً", "ممتاز"];

export const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value,
  onChange,
  size = "md",
  readonly = false,
  showLabel = false,
  className = "",
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const starSize = sizeMap[size];

  const displayValue = hoverValue !== null ? hoverValue : value;

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!readonly) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    setHoverValue(null);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`} dir="rtl">
      <div
        className="flex items-center gap-1"
        onMouseLeave={handleMouseLeave}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            disabled={readonly}
            className={`${
              readonly ? "cursor-default" : "cursor-pointer"
            } focus:outline-none transition-transform`}
            whileHover={!readonly ? { scale: 1.2 } : undefined}
            whileTap={!readonly ? { scale: 0.9 } : undefined}
          >
            <Star
              size={starSize}
              className={`transition-colors duration-150 ${
                star <= displayValue
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-transparent text-gray-300 dark:text-gray-600"
              }`}
            />
          </motion.button>
        ))}
      </div>
      {showLabel && displayValue > 0 && (
        <motion.span
          key={displayValue}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm text-muted-foreground min-w-[60px]"
        >
          {labels[displayValue]}
        </motion.span>
      )}
    </div>
  );
};

export default StarRatingInput;
