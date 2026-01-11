/**
 * ReviewsList - قائمة المراجعات مع pagination و filtering
 */

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, Loader2, MessageSquare, Search, Star } from "lucide-react";
import { ReviewCard } from "./ReviewCard.tsx";
import { getReviewsForUser } from "../services/reviewsService.ts";
import { Review, ReviewFilters } from "../types.ts";

interface ReviewsListProps {
  userId: string;
  onRequestClick?: (requestId: string) => void;
  showFilters?: boolean;
  pageSize?: number;
}

type SortOption = "newest" | "oldest" | "highest" | "lowest";

export const ReviewsList: React.FC<ReviewsListProps> = ({
  userId,
  onRequestClick,
  showFilters = true,
  pageSize = 10,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [minRating, setMinRating] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const loadReviews = async (resetPage = false) => {
    setIsLoading(true);
    setError(null);

    const currentPage = resetPage ? 0 : page;
    if (resetPage) setPage(0);

    const filters: ReviewFilters = {
      page: currentPage,
      pageSize,
      sortBy,
      searchQuery: searchQuery || undefined,
      minRating,
    };

    const result = await getReviewsForUser(userId, filters);

    if (result.success) {
      setReviews(result.data || []);
      setTotal(result.total || 0);
    } else {
      setError(result.error || "حدث خطأ أثناء تحميل المراجعات");
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadReviews(true);
  }, [userId, sortBy, minRating]);

  const handleSearch = () => {
    loadReviews(true);
  };

  const totalPages = Math.ceil(total / pageSize);
  const hasMore = page < totalPages - 1;
  const hasPrev = page > 0;

  const ratingFilters = [
    { value: undefined, label: "الكل" },
    { value: 5, label: "5 نجوم" },
    { value: 4, label: "4+ نجوم" },
    { value: 3, label: "3+ نجوم" },
  ];

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "newest", label: "الأحدث" },
    { value: "oldest", label: "الأقدم" },
    { value: "highest", label: "الأعلى تقييماً" },
    { value: "lowest", label: "الأقل تقييماً" },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder="ابحث في المراجعات..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <Search size={18} />
            </button>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilterMenu || minRating
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            <Filter size={16} />
            <span className="text-sm">تصفية</span>
          </button>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-4 py-2 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filter Menu */}
      <AnimatePresence>
        {showFilterMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
              {ratingFilters.map((filter) => (
                <button
                  key={filter.value ?? "all"}
                  onClick={() => setMinRating(filter.value)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    minRating === filter.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border border-border hover:bg-muted"
                  }`}
                >
                  {filter.value && <Star size={12} className="fill-current" />}
                  {filter.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-8 text-red-500">
          <p>{error}</p>
          <button
            onClick={() => loadReviews()}
            className="mt-2 text-primary hover:underline"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && reviews.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <MessageSquare size={32} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">لا توجد مراجعات بعد</p>
        </div>
      )}

      {/* Reviews List */}
      {!isLoading && !error && reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ReviewCard
                review={review}
                onRequestClick={onRequestClick}
                showRequest
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => {
              setPage((p) => p - 1);
              loadReviews();
            }}
            disabled={!hasPrev}
            className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            السابق
          </button>
          <span className="text-sm text-muted-foreground">
            صفحة {page + 1} من {totalPages}
          </span>
          <button
            onClick={() => {
              setPage((p) => p + 1);
              loadReviews();
            }}
            disabled={!hasMore}
            className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewsList;
