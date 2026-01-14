/**
 * ReviewForm - نموذج إنشاء/تعديل التقييم
 *
 * يتيح للمستخدم إدخال تقييم من 1-5 نجوم مع تعليق اختياري
 */

import React, { useState } from "react";
import ReactDOM from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle, Loader2, Send, X } from "lucide-react";
import { StarRatingInput } from "./ui/StarRatingInput.tsx";
import { createReview, updateReview } from "../services/reviewsService.ts";
import { CreateReviewInput, Review } from "../types.ts";

interface ReviewFormProps {
  requestId: string;
  revieweeId: string;
  revieweeName?: string;
  existingReview?: Review;
  onSuccess?: (review: Review) => void;
  onCancel?: () => void;
  isOpen: boolean;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  requestId,
  revieweeId,
  revieweeName = "المستخدم",
  existingReview,
  onSuccess,
  onCancel,
  isOpen,
}) => {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isEditing = !!existingReview;
  const minCommentLength = 10;
  const maxCommentLength = 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("الرجاء اختيار تقييم");
      return;
    }

    if (
      comment &&
      (comment.length < minCommentLength || comment.length > maxCommentLength)
    ) {
      setError(
        `التعليق يجب أن يكون بين ${minCommentLength} و ${maxCommentLength} حرف`,
      );
      return;
    }

    setIsLoading(true);

    try {
      // Get current user ID from localStorage or session
      const storedUser = localStorage.getItem("user");
      const userId = storedUser ? JSON.parse(storedUser).id : null;

      if (!userId) {
        setError("يجب تسجيل الدخول أولاً");
        setIsLoading(false);
        return;
      }

      let result;
      if (isEditing && existingReview) {
        result = await updateReview(
          existingReview.id,
          { rating, comment: comment || undefined },
          userId,
        );
      } else {
        const input: CreateReviewInput = {
          requestId,
          revieweeId,
          rating,
          comment: comment || undefined,
        };
        result = await createReview(input, userId);
      }

      if (result.success && result.data) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.(result.data!);
        }, 1500);
      } else {
        setError(result.error || "حدث خطأ أثناء حفظ التقييم");
      }
    } catch (err) {
      setError("حدث خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isOpen &&
        ReactDOM.createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onCancel}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-bold">
                  {isEditing ? "تعديل التقييم" : "تقييم"} {revieweeName}
                </h2>
                <button
                  type="button"
                  onClick={onCancel}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-4 space-y-6">
                {/* Success State */}
                {success
                  ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex flex-col items-center justify-center py-8 gap-4"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"
                      >
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                      </motion.div>
                      <p className="text-lg font-medium text-green-600 dark:text-green-400">
                        تم حفظ التقييم بنجاح!
                      </p>
                    </motion.div>
                  )
                  : (
                    <>
                      {/* Star Rating */}
                      <div className="flex flex-col items-center gap-4">
                        <p className="text-muted-foreground">
                          كيف تقيم تجربتك؟
                        </p>
                        <StarRatingInput
                          value={rating}
                          onChange={setRating}
                          size="lg"
                          showLabel
                        />
                      </div>

                      {/* Comment */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          تعليق (اختياري)
                        </label>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="اكتب تعليقك هنا..."
                          rows={4}
                          maxLength={maxCommentLength}
                          className="w-full p-3 rounded-xl border border-border bg-background resize-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>الحد الأدنى: {minCommentLength} حرف</span>
                          <span>{comment.length}/{maxCommentLength}</span>
                        </div>
                      </div>

                      {/* Error */}
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg"
                        >
                          <AlertCircle size={18} />
                          <span className="text-sm">{error}</span>
                        </motion.div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={onCancel}
                          className="flex-1 py-3 px-4 rounded-xl border border-border hover:bg-muted transition-colors"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading || rating === 0}
                          className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isLoading
                            ? <Loader2 size={18} className="animate-spin" />
                            : (
                              <>
                                <Send size={18} />
                                <span>{isEditing ? "تحديث" : "إرسال"}</span>
                              </>
                            )}
                        </button>
                      </div>
                    </>
                  )}
              </form>
            </motion.div>
          </motion.div>,
          document.body,
        )}
    </>
  );
};

export default ReviewForm;
