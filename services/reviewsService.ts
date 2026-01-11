/**
 * Reviews Service - خدمة إدارة التقييمات والمراجعات
 *
 * توفر هذه الخدمة جميع العمليات المتعلقة بالتقييمات:
 * - إنشاء تقييم جديد
 * - تحديث تقييم موجود
 * - حذف تقييم
 * - جلب المراجعات لمستخدم معين
 * - جلب إحصائيات التقييمات
 */

import { supabase } from "./supabaseClient.ts";
import {
  CreateReviewInput,
  Review,
  ReviewFilters,
  UpdateReviewInput,
  UserRating,
} from "../types.ts";
import { logger } from "../utils/logger.ts";

// ==========================================
// Helper Functions
// ==========================================

/**
 * تحويل بيانات Supabase إلى Review type
 */
function mapDbReviewToReview(dbReview: Record<string, unknown>): Review {
  return {
    id: dbReview.id as string,
    requestId: dbReview.request_id as string,
    reviewerId: dbReview.reviewer_id as string,
    revieweeId: dbReview.reviewee_id as string,
    reviewerName:
      (dbReview.reviewer as Record<string, unknown>)?.display_name as string ||
      "مستخدم",
    reviewerAvatar: (dbReview.reviewer as Record<string, unknown>)
      ?.avatar_url as string,
    rating: dbReview.rating as number,
    comment: dbReview.comment as string | undefined,
    createdAt: new Date(dbReview.created_at as string),
    updatedAt: dbReview.updated_at
      ? new Date(dbReview.updated_at as string)
      : undefined,
    requestTitle: (dbReview.request as Record<string, unknown>)
      ?.title as string,
    requestStatus: (dbReview.request as Record<string, unknown>)
      ?.status as string,
    // Legacy fields
    authorName: (dbReview.reviewer as Record<string, unknown>)
      ?.display_name as string,
    authorAvatar: (dbReview.reviewer as Record<string, unknown>)
      ?.avatar_url as string,
    date: new Date(dbReview.created_at as string),
  };
}

// ==========================================
// CRUD Operations
// ==========================================

/**
 * إنشاء تقييم جديد
 */
export async function createReview(
  input: CreateReviewInput,
  userId: string,
): Promise<{ success: boolean; data?: Review; error?: string }> {
  try {
    logger.log("🔵 createReview: Creating review", { input, userId });

    // التحقق من المدخلات
    if (!input.requestId || !input.revieweeId || !input.rating) {
      return { success: false, error: "بيانات غير مكتملة" };
    }

    if (input.rating < 1 || input.rating > 5) {
      return { success: false, error: "التقييم يجب أن يكون بين 1 و 5" };
    }

    if (
      input.comment &&
      (input.comment.length < 10 || input.comment.length > 1000)
    ) {
      return { success: false, error: "التعليق يجب أن يكون بين 10 و 1000 حرف" };
    }

    // التحقق من إمكانية التقييم
    const canReview = await canUserReviewRequest(userId, input.requestId);
    if (!canReview.canReview) {
      return {
        success: false,
        error: canReview.reason || "لا يمكنك تقييم هذا الطلب",
      };
    }

    // إنشاء التقييم
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        request_id: input.requestId,
        reviewer_id: userId,
        reviewee_id: input.revieweeId,
        rating: input.rating,
        comment: input.comment,
      })
      .select(`
        *,
        reviewer:profiles!reviewer_id(display_name, avatar_url),
        request:requests!request_id(title, status)
      `)
      .single();

    if (error) {
      logger.error("❌ createReview: Error creating review", error);
      if (error.code === "23505") {
        return { success: false, error: "لقد قمت بتقييم هذا الطلب من قبل" };
      }
      return { success: false, error: "حدث خطأ أثناء إنشاء التقييم" };
    }

    logger.log("✅ createReview: Review created successfully", data);
    return { success: true, data: mapDbReviewToReview(data) };
  } catch (error) {
    logger.error("❌ createReview: Unexpected error", error);
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}

/**
 * تحديث تقييم موجود
 */
export async function updateReview(
  reviewId: string,
  input: UpdateReviewInput,
  userId: string,
): Promise<{ success: boolean; data?: Review; error?: string }> {
  try {
    logger.log("🔵 updateReview: Updating review", { reviewId, input, userId });

    if (input.rating && (input.rating < 1 || input.rating > 5)) {
      return { success: false, error: "التقييم يجب أن يكون بين 1 و 5" };
    }

    if (
      input.comment &&
      (input.comment.length < 10 || input.comment.length > 1000)
    ) {
      return { success: false, error: "التعليق يجب أن يكون بين 10 و 1000 حرف" };
    }

    // التحقق من ملكية التقييم ووقت الإنشاء
    const { data: existingReview, error: checkError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", reviewId)
      .eq("reviewer_id", userId)
      .single();

    if (checkError || !existingReview) {
      return {
        success: false,
        error: "التقييم غير موجود أو ليس لديك صلاحية تعديله",
      };
    }

    // التحقق من مرور أقل من 24 ساعة
    const createdAt = new Date(existingReview.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return { success: false, error: "لا يمكن تعديل التقييم بعد مرور 24 ساعة" };
    }

    // تحديث التقييم
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.rating !== undefined) updateData.rating = input.rating;
    if (input.comment !== undefined) updateData.comment = input.comment;

    const { data, error } = await supabase
      .from("reviews")
      .update(updateData)
      .eq("id", reviewId)
      .select(`
        *,
        reviewer:profiles!reviewer_id(display_name, avatar_url),
        request:requests!request_id(title, status)
      `)
      .single();

    if (error) {
      logger.error("❌ updateReview: Error updating review", error);
      return { success: false, error: "حدث خطأ أثناء تحديث التقييم" };
    }

    logger.log("✅ updateReview: Review updated successfully");
    return { success: true, data: mapDbReviewToReview(data) };
  } catch (error) {
    logger.error("❌ updateReview: Unexpected error", error);
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}

/**
 * حذف تقييم
 */
export async function deleteReview(
  reviewId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.log("🔵 deleteReview: Deleting review", { reviewId, userId });

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId)
      .eq("reviewer_id", userId);

    if (error) {
      logger.error("❌ deleteReview: Error deleting review", error);
      return { success: false, error: "حدث خطأ أثناء حذف التقييم" };
    }

    logger.log("✅ deleteReview: Review deleted successfully");
    return { success: true };
  } catch (error) {
    logger.error("❌ deleteReview: Unexpected error", error);
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}

/**
 * جلب المراجعات لمستخدم معين
 */
export async function getReviewsForUser(
  userId: string,
  filters?: ReviewFilters,
): Promise<
  { success: boolean; data?: Review[]; total?: number; error?: string }
> {
  try {
    logger.log("🔵 getReviewsForUser: Fetching reviews", { userId, filters });

    const page = filters?.page || 0;
    const pageSize = filters?.pageSize || 10;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("reviews")
      .select(
        `
        *,
        reviewer:profiles!reviewer_id(display_name, avatar_url),
        request:requests!request_id(title, status)
      `,
        { count: "exact" },
      )
      .eq("reviewee_id", userId);

    // Apply filters
    if (filters?.minRating) {
      query = query.gte("rating", filters.minRating);
    }
    if (filters?.maxRating) {
      query = query.lte("rating", filters.maxRating);
    }
    if (filters?.searchQuery) {
      query = query.ilike("comment", `%${filters.searchQuery}%`);
    }

    // Apply sorting
    switch (filters?.sortBy) {
      case "oldest":
        query = query.order("created_at", { ascending: true });
        break;
      case "highest":
        query = query.order("rating", { ascending: false });
        break;
      case "lowest":
        query = query.order("rating", { ascending: true });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      logger.error("❌ getReviewsForUser: Error fetching reviews", error);
      return { success: false, error: "حدث خطأ أثناء جلب المراجعات" };
    }

    const reviews = (data || []).map(mapDbReviewToReview);
    logger.log("✅ getReviewsForUser: Fetched reviews", {
      count: reviews.length,
    });

    return { success: true, data: reviews, total: count || 0 };
  } catch (error) {
    logger.error("❌ getReviewsForUser: Unexpected error", error);
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}

/**
 * جلب تقييم بالمعرف
 */
export async function getReviewById(
  reviewId: string,
): Promise<{ success: boolean; data?: Review; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select(`
        *,
        reviewer:profiles!reviewer_id(display_name, avatar_url),
        request:requests!request_id(title, status)
      `)
      .eq("id", reviewId)
      .single();

    if (error || !data) {
      return { success: false, error: "التقييم غير موجود" };
    }

    return { success: true, data: mapDbReviewToReview(data) };
  } catch (error) {
    logger.error("❌ getReviewById: Unexpected error", error);
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}

/**
 * جلب إحصائيات التقييمات لمستخدم
 */
export async function getUserRating(
  userId: string,
): Promise<{ success: boolean; data?: UserRating; error?: string }> {
  try {
    logger.log("🔵 getUserRating: Fetching user rating", { userId });

    const { data, error } = await supabase
      .from("user_ratings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      // إذا لم يكن للمستخدم تقييمات، إرجاع قيم افتراضية
      if (error.code === "PGRST116") {
        return {
          success: true,
          data: {
            userId,
            averageRating: 0,
            totalReviews: 0,
            fiveStarCount: 0,
            fourStarCount: 0,
            threeStarCount: 0,
            twoStarCount: 0,
            oneStarCount: 0,
            updatedAt: new Date(),
          },
        };
      }
      logger.error("❌ getUserRating: Error fetching user rating", error);
      return { success: false, error: "حدث خطأ أثناء جلب الإحصائيات" };
    }

    return {
      success: true,
      data: {
        userId: data.user_id,
        averageRating: parseFloat(data.average_rating) || 0,
        totalReviews: data.total_reviews || 0,
        fiveStarCount: data.five_star_count || 0,
        fourStarCount: data.four_star_count || 0,
        threeStarCount: data.three_star_count || 0,
        twoStarCount: data.two_star_count || 0,
        oneStarCount: data.one_star_count || 0,
        updatedAt: new Date(data.updated_at),
      },
    };
  } catch (error) {
    logger.error("❌ getUserRating: Unexpected error", error);
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}

/**
 * التحقق من إمكانية تقييم طلب معين
 */
export async function canUserReviewRequest(
  userId: string,
  requestId: string,
): Promise<{ success: boolean; canReview: boolean; reason?: string }> {
  try {
    logger.log("🔵 canUserReviewRequest: Checking", { userId, requestId });

    // التحقق من أن الطلب مكتمل
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select("status, user_id")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      return { success: true, canReview: false, reason: "الطلب غير موجود" };
    }

    if (request.status !== "completed") {
      return {
        success: true,
        canReview: false,
        reason: "لا يمكن التقييم إلا بعد اكتمال الطلب",
      };
    }

    // التحقق من أن المستخدم مشارك في الطلب
    const isRequester = request.user_id === userId;

    if (!isRequester) {
      // التحقق من أن المستخدم هو مقدم العرض المقبول
      const { data: offer, error: offerError } = await supabase
        .from("offers")
        .select("id")
        .eq("request_id", requestId)
        .eq("provider_id", userId)
        .eq("status", "accepted")
        .single();

      if (offerError || !offer) {
        return {
          success: true,
          canReview: false,
          reason: "لست مشاركاً في هذا الطلب",
        };
      }
    }

    // التحقق من عدم وجود تقييم سابق
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("request_id", requestId)
      .eq("reviewer_id", userId)
      .single();

    if (existingReview) {
      return {
        success: true,
        canReview: false,
        reason: "لقد قمت بتقييم هذا الطلب من قبل",
      };
    }

    logger.log("✅ canUserReviewRequest: User can review");
    return { success: true, canReview: true };
  } catch (error) {
    logger.error("❌ canUserReviewRequest: Unexpected error", error);
    return { success: false, canReview: false, reason: "حدث خطأ غير متوقع" };
  }
}

/**
 * جلب التقييمات التي كتبها مستخدم معين
 */
export async function getReviewsByUser(
  userId: string,
  filters?: ReviewFilters,
): Promise<
  { success: boolean; data?: Review[]; total?: number; error?: string }
> {
  try {
    logger.log("🔵 getReviewsByUser: Fetching reviews by user", {
      userId,
      filters,
    });

    const page = filters?.page || 0;
    const pageSize = filters?.pageSize || 10;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("reviews")
      .select(
        `
        *,
        reviewee:profiles!reviewee_id(display_name, avatar_url),
        request:requests!request_id(title, status)
      `,
        { count: "exact" },
      )
      .eq("reviewer_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      logger.error("❌ getReviewsByUser: Error fetching reviews", error);
      return { success: false, error: "حدث خطأ أثناء جلب المراجعات" };
    }

    const reviews = (data || []).map(mapDbReviewToReview);
    return { success: true, data: reviews, total: count || 0 };
  } catch (error) {
    logger.error("❌ getReviewsByUser: Unexpected error", error);
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}
