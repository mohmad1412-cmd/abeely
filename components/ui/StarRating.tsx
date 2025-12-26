import React from 'react';
import { Star, StarHalf } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: number;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  max = 5, 
  size = 16,
  className = '' 
}) => {
  return (
    <div className={`flex items-center gap-2 text-yellow-500 ${className}`}>
      {[...Array(max)].map((_, i) => {
        const value = i + 1;
        if (value <= rating) {
          return <Star key={i} size={size} fill="currentColor" />;
        } else if (value - 0.5 <= rating) {
          // Flip the half star for RTL using scale-x-[-1]
          return <StarHalf key={i} size={size} fill="currentColor" className={document.dir === 'rtl' ? 'transform scale-x-[-1]' : ''} />;
        } else {
          return <Star key={i} size={size} className="text-gray-300 dark:text-gray-600" />;
        }
      })}
      <span className="text-sm text-muted-foreground font-medium pt-0.5" dir="ltr">{rating.toFixed(1)}</span>
    </div>
  );
};