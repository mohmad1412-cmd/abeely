import { supabase } from "./supabaseClient";
import { AIDraft, classifyAndDraft } from "./aiService";
import { Offer, OfferInsert, Request, RequestInsert } from "../types";
import { getCategoryIdsByLabels } from "./categoriesService";
import { logger } from "../utils/logger";
import { storageService as _storageService } from "./storageService";
import { createNotification } from "./notificationsService";
import { AVAILABLE_CATEGORIES } from "../data";

/**
 * إرسال Push Notifications للمستخدمين المهتمين بطلب جديد
 * ملاحظة: الإشعارات داخل التطبيق للطلبات الجديدة تُنشأ من Edge Function
 */
async function sendPushNotificationForNewRequest(params: {
  requestId: string;
  requestTitle: string;
  requestDescription?: string;
  categories?: string[];
  city?: string;
  authorId: string;
}): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "send-push-notification",
      {
        body: { ...params, notificationType: "new_request" },
      },
    );

    if (error) {
      logger.warn("Edge Function error:", error);
      return;
    }

    logger.log("📱 Push notifications sent for request:", data);
  } catch (err) {
    logger.warn("Failed to call send-push-notification:", err);
  }
}

/**
 * إرسال Push Notification لصاحب الطلب عند وصول عرض جديد
 * + إنشاء إشعار داخل التطبيق
 */
async function sendPushNotificationForNewOffer(params: {
  requestId: string;
  requestTitle: string;
  recipientId: string;
  authorId: string; // مقدم العرض
  offerId: string;
  offerTitle: string;
  offerDescription?: string;
  providerName?: string;
}): Promise<void> {
  try {
    // إنشاء إشعار داخل التطبيق
    await createNotification(
      params.recipientId,
      "offer",
      `🎁 عرض جديد من ${params.providerName || "مقدم خدمة"}`,
      `وصلك عرض على طلبك: ${params.requestTitle}`,
      `/request/${params.requestId}`,
      params.requestId,
      params.offerId,
    );

    // إرسال Push Notification
    const { data, error } = await supabase.functions.invoke(
      "send-push-notification",
      {
        body: { ...params, notificationType: "new_offer" },
      },
    );

    if (error) {
      logger.warn("Edge Function error (new_offer):", error);
      return;
    }

    logger.log("📱 Push notification sent for offer:", data);
  } catch (err) {
    logger.warn("Failed to call send-push-notification for offer:", err);
  }
}

/**
 * إرسال Push Notification للمزود عند قبول عرضه
 * + إنشاء إشعار داخل التطبيق
 */
async function sendPushNotificationForOfferAccepted(params: {
  requestId: string;
  requestTitle: string;
  recipientId: string; // مقدم العرض
  authorId: string; // صاحب الطلب
  offerId: string;
}): Promise<void> {
  try {
    // إنشاء إشعار داخل التطبيق
    await createNotification(
      params.recipientId,
      "offer_accepted",
      "🎉 تم قبول عرضك!",
      `مبروك! تم قبول عرضك للطلب: ${params.requestTitle}`,
      `/request/${params.requestId}`,
      params.requestId,
      params.offerId,
    );

    // إرسال Push Notification
    const { data, error } = await supabase.functions.invoke(
      "send-push-notification",
      {
        body: { ...params, notificationType: "offer_accepted" },
      },
    );

    if (error) {
      logger.warn("Edge Function error (offer_accepted):", error);
      return;
    }

    logger.log("📱 Push notification sent for offer acceptance:", data);
  } catch (err) {
    logger.warn(
      "Failed to call send-push-notification for offer acceptance:",
      err,
    );
  }
}

/**
 * إرسال Push Notification عند إكمال الطلب
 * + إنشاء إشعار داخل التطبيق للطرفين
 */
async function sendPushNotificationForRequestCompleted(params: {
  requestId: string;
  requestTitle: string;
  requesterId: string; // صاحب الطلب
  providerId: string; // مقدم الخدمة
}): Promise<void> {
  try {
    // إشعار لصاحب الطلب
    await createNotification(
      params.requesterId,
      "status",
      "✅ تم إكمال الطلب",
      `تم إكمال الطلب: ${params.requestTitle}. يمكنك الآن تقييم مقدم الخدمة`,
      `/request/${params.requestId}`,
      params.requestId,
    );

    // إشعار لمقدم الخدمة
    await createNotification(
      params.providerId,
      "status",
      "✅ تم إكمال الطلب",
      `تم إكمال الطلب: ${params.requestTitle}. يمكنك الآن تقييم صاحب الطلب`,
      `/request/${params.requestId}`,
      params.requestId,
    );

    // إرسال Push Notifications
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          ...params,
          notificationType: "request_completed",
          recipientId: params.requesterId,
        },
      });
    } catch (err) {
      logger.warn("فشل في إرسال push notification لصاحب الطلب:", err);
    }

    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          ...params,
          notificationType: "request_completed",
          recipientId: params.providerId,
        },
      });
    } catch (err) {
      logger.warn("فشل في إرسال push notification لمقدم الخدمة:", err);
    }

    logger.log("📱 تم إرسال إشعارات إكمال الطلب");
  } catch (err) {
    logger.warn("فشل في إرسال إشعارات إكمال الطلب:", err);
  }
}

/**
 * إرسال Push Notification للمزود عند بدء التفاوض
 * + إنشاء إشعار داخل التطبيق
 */
async function sendPushNotificationForNegotiationStarted(params: {
  requestId: string;
  requestTitle: string;
  recipientId: string; // مقدم العرض
  authorId: string; // صاحب الطلب
  senderName: string; // اسم صاحب الطلب
  offerId: string;
}): Promise<void> {
  try {
    // إنشاء إشعار داخل التطبيق
    await createNotification(
      params.recipientId,
      "negotiation",
      `🤝 ${params.senderName} يريد التفاوض معك`,
      `بخصوص عرضك على الطلب: ${params.requestTitle}`,
      `/request/${params.requestId}`,
      params.requestId,
      params.offerId,
    );

    // إرسال Push Notification
    const { data, error } = await supabase.functions.invoke(
      "send-push-notification",
      {
        body: { ...params, notificationType: "negotiation_started" },
      },
    );

    if (error) {
      logger.warn("Edge Function error (negotiation_started):", error);
      return;
    }

    logger.log("📱 Push notification sent for negotiation start:", data);
  } catch (err) {
    logger.warn(
      "Failed to call send-push-notification for negotiation start:",
      err,
    );
  }
}

/**
 * ربط التصنيفات بالطلب - نستخدم الآن getCategoryIdsByLabels للتحويل الآمن
 */
const linkCategoriesByLabels = async (
  requestId: string,
  labels: string[] = [],
) => {
  try {
    // تحويل الأسماء إلى IDs (يضيف "غير محدد" تلقائياً إذا لم يجد تصنيفات)
    const categoryIds = await getCategoryIdsByLabels(labels);

    if (categoryIds.length === 0) {
      // إذا لم يكن هناك تصنيفات، نضيف "أخرى"
      categoryIds.push("other");
    }

    // ربط التصنيفات بالطلب
    const links = categoryIds.map((id: string) => ({
      request_id: requestId,
      category_id: id,
    }));

    const { error } = await supabase
      .from("request_categories")
      .upsert(links, { onConflict: "request_id,category_id" });

    if (error) {
      logger.warn("Error linking categories:", error);
    }

    return categoryIds;
  } catch (err) {
    logger.error("Error in linkCategoriesByLabels", err, "requestsService");
    // في حالة الخطأ، نحاول إضافة "أخرى" على الأقل
    try {
      await supabase
        .from("request_categories")
        .upsert([{ request_id: requestId, category_id: "other" }], {
          onConflict: "request_id,category_id",
        });
    } catch (_) {
      // Fallback ignored
    }
    return ["other"];
  }
};

// دالة قديمة للتوافق (إضافة بادئة _ لأنها غير مستخدمة حالياً)
const _upsertCategories = async (labels: string[] = []) => {
  if (!labels.length) return [];
  // لم نعد نُنشئ تصنيفات جديدة تلقائياً - نستخدم فقط التصنيفات الموجودة
  const { data, error } = await supabase
    .from("categories")
    .select("id,label")
    .in("label", labels);
  if (error) {
    logger.warn("Error fetching categories:", error);
    return [];
  }
  return data || [];
};

const linkCategories = async (requestId: string, categoryIds: string[]) => {
  if (!categoryIds.length) {
    // إذا لم يكن هناك تصنيفات، نضيف "أخرى"
    categoryIds = ["other"];
  }
  const links = categoryIds.map((id) => ({
    request_id: requestId,
    category_id: id,
  }));
  const { error } = await supabase
    .from("request_categories")
    .upsert(links, { onConflict: "request_id,category_id" });
  if (error) throw error;
};

/**
 * Creates a request in the database.
 * Now accepts the draft data directly from the UI to avoid redundant AI calls.
 */
export async function createRequestFromChat(
  userId: string,
  draftData: AIDraft,
  overrides?: Partial<RequestInsert>,
) {
  if (!userId) {
    throw new Error("User ID is required to create a request");
  }

  // Validate required fields
  if (!draftData.description && !draftData.summary) {
    throw new Error("Description is required to create a request");
  }

  if (!draftData.location) {
    throw new Error("Location is required to create a request");
  }

  const payload: RequestInsert = {
    title: (draftData.title || draftData.summary || "طلب جديد").slice(0, 120),
    description: draftData.description || draftData.summary || "",
    status: "active",
    is_public: true,
    budget_min: draftData.budgetMin,
    budget_max: draftData.budgetMax,
    budget_type: (draftData.budgetType as RequestInsert["budget_type"]) ||
      ((draftData.budgetMin || draftData.budgetMax) ? "fixed" : "negotiable"),
    location: draftData.location,
    delivery_type: "not-specified", // Default to not-specified (valid constraint value)
    delivery_from: draftData.deliveryTime,
    seriousness: 3, // Default (medium)
  };

  payload.author_id = userId;

  if (overrides) {
    // Merge overrides, ensuring images is properly formatted
    Object.assign(payload, overrides);

    // Ensure images is an array if provided
    if (overrides.images !== undefined) {
      if (Array.isArray(overrides.images)) {
        payload.images = overrides.images;
      } else if (overrides.images) {
        // If it's a single string, convert to array
        payload.images = [overrides.images];
      } else {
        // If it's null/undefined/empty, don't include it
        delete payload.images;
      }
    }

    // Validate and map delivery_type to ensure it matches database constraint
    if (overrides.delivery_type !== undefined) {
      const validValues = ["not-specified", "pickup", "delivery", "both"];
      if (!validValues.includes(overrides.delivery_type)) {
        // Map invalid values to valid ones
        const oldValue = overrides.delivery_type;
        if (oldValue === "immediate") {
          payload.delivery_type = "delivery";
        } else if (oldValue === "range") {
          payload.delivery_type = "both";
        } else {
          payload.delivery_type = "not-specified";
        }
        logger.warn(
          `Invalid delivery_type "${oldValue}" mapped to "${payload.delivery_type}"`,
          "requestsService",
        );
      }
    }
  }

  // Ensure delivery_type is always valid (fallback to default)
  if (
    !payload.delivery_type ||
    !["not-specified", "pickup", "delivery", "both"].includes(
      payload.delivery_type,
    )
  ) {
    payload.delivery_type = "not-specified";
  }

  try {
    const attemptInsert = async (
      p: RequestInsert,
      _runId: string,
      _hypothesisId: string,
    ) => {
      // Log the payload for debugging (without sensitive data)
      logger.log("Attempting to insert request:", {
        title: p.title?.substring(0, 50),
        hasDescription: !!p.description,
        hasLocation: !!p.location,
        hasImages: !!p.images?.length,
        imagesCount: p.images?.length || 0,
        images: p.images, // Log actual image URLs for debugging
        authorId: p.author_id ? "present" : "missing",
      });

      // Ensure images is properly formatted as array for Supabase
      const insertPayload = { ...p };
      if (insertPayload.images) {
        // Ensure it's an array
        if (!Array.isArray(insertPayload.images)) {
          insertPayload.images = [insertPayload.images];
        }
        // Remove empty strings
        insertPayload.images = insertPayload.images.filter((img: string) =>
          img && img.trim().length > 0
        );
        // If no valid images, remove the field
        if (insertPayload.images.length === 0) {
          delete insertPayload.images;
        }
      }

      logger.log("Insert payload with images:", {
        hasImages: !!insertPayload.images,
        imagesCount: insertPayload.images?.length || 0,
        images: insertPayload.images,
      }, "requestsService");

      const { data, error } = await supabase.from("requests").insert(
        insertPayload,
      )
        .select("id").single();

      if (error || !data?.id) {
        const errorInfo = {
          error,
          errorMessage: error?.message,
          errorCode: error?.code,
          errorDetails: error?.details,
          errorHint: error?.hint,
          payload: {
            title: p.title?.substring(0, 50),
            hasDescription: !!p.description,
            hasLocation: !!p.location,
            hasImages: !!p.images?.length,
            imagesCount: p.images?.length || 0,
            hasAuthorId: !!p.author_id,
            status: p.status,
            isPublic: p.is_public,
          },
        };

        logger.error(
          "Supabase Insert Error",
          errorInfo,
          "createRequestFromChat",
        );

        // Create a more descriptive error message
        let errorMessage = "فشل إنشاء الطلب في قاعدة البيانات.";
        if (error?.message) {
          if (
            error.message.includes("duplicate") ||
            error.message.includes("unique")
          ) {
            errorMessage = "الطلب موجود بالفعل. يرجى المحاولة مرة أخرى.";
          } else if (
            error.message.includes("permission") ||
            error.message.includes("policy") ||
            error.message.includes("RLS") || error.message.includes("row-level")
          ) {
            errorMessage =
              "ليس لديك صلاحية لإنشاء طلب. يرجى التحقق من تسجيل الدخول.";
          } else if (
            error.message.includes("network") || error.message.includes("fetch")
          ) {
            errorMessage =
              "مشكلة في الاتصال بالإنترنت. يرجى التحقق من الاتصال والمحاولة مرة أخرى.";
          } else if (
            error.message.includes("null value") ||
            error.message.includes("not null")
          ) {
            errorMessage =
              "بيانات ناقصة. يرجى التأكد من إدخال جميع الحقول المطلوبة.";
          } else {
            errorMessage = `فشل إنشاء الطلب: ${error.message}`;
          }
        }

        const descriptiveError = new Error(errorMessage);
        (descriptiveError as any).originalError = error;
        (descriptiveError as any).errorCode = error?.code;
        throw descriptiveError;
      }

      return data;
    };

    // Primary attempt (active, public) - may fail if DB missing columns in triggers
    const data = await attemptInsert(payload, "run2", "G");

    // ربط التصنيفات بالطلب (يضمن وجود "غير محدد" إذا لم يكن هناك تصنيفات)
    try {
      const categories = draftData.categories || [];
      await linkCategoriesByLabels(data.id, categories);
    } catch (catErr) {
      logger.warn(
        "Failed to link categories, but request was created:",
        catErr,
      );
      // نحاول إضافة "أخرى" على الأقل
      try {
        await linkCategories(data.id, ["other"]);
      } catch (_) {
        // Fallback ignored
      }
    }

    // إرسال Push Notifications للمستخدمين المهتمين
    try {
      await sendPushNotificationForNewRequest({
        requestId: data.id,
        requestTitle: payload.title,
        requestDescription: payload.description,
        categories: draftData.categories || [],
        city: payload.location,
        authorId: userId,
      });
    } catch (pushErr) {
      logger.warn("Failed to send push notifications:", pushErr);
      // لا نفشل إنشاء الطلب بسبب خطأ في الإشعارات
    }

    return data;
  } catch (err) {
    const e = err as Error & { code?: string; message?: string };
    const msg = e?.message || "";
    const code = e?.code || "";

    // Fallback: if trigger fails (e.g., interested_categories missing), create as non-public first then update
    const isTriggerError = code === "42703" ||
      msg.includes("interested_categories") || msg.includes("categories");
    if (!isTriggerError) {
      throw err;
    }

    logger.log(
      "⚠️ Trigger error detected, using fallback method (create non-public, then update)",
    );

    // الخطوة 1: إنشاء الطلب كغير عام (لتجاوز الـ trigger)
    const fallbackPayload: RequestInsert = {
      ...payload,
      status: "active",
      is_public: false, // غير عام لتجاوز الـ trigger
    };

    try {
      const { data: insertedData, error: insertError } = await supabase
        .from("requests")
        .insert(fallbackPayload)
        .select("id")
        .single();

      if (insertError || !insertedData?.id) {
        logger.error(
          "Fallback insert failed",
          insertError,
          "createRequestFromChat",
        );
        throw insertError || new Error("Fallback insert failed");
      }

      logger.log("✅ Request created (non-public):", insertedData.id);

      // الخطوة 2: تحديث الطلب ليصبح عاماً
      const { error: updateError } = await supabase
        .from("requests")
        .update({ is_public: true })
        .eq("id", insertedData.id);

      if (updateError) {
        logger.warn("Failed to make request public:", updateError);
        // لا نرمي خطأ، الطلب تم إنشاؤه على أي حال
      } else {
        logger.log("✅ Request made public");
      }

      // الخطوة 3: ربط التصنيفات
      try {
        const categories = draftData.categories || [];
        await linkCategoriesByLabels(insertedData.id, categories);
        logger.log("✅ Categories linked");
      } catch (catErr) {
        logger.warn("Failed to link categories in fallback:", catErr);
        // نحاول إضافة "أخرى" على الأقل
        try {
          await linkCategories(insertedData.id, ["other"]);
        } catch (_) {
          // Fallback ignored
        }
      }

      return insertedData;
    } catch (fallbackErr) {
      logger.error("Fallback method failed:", fallbackErr);
      throw fallbackErr;
    }
  }
}

export async function createOfferFromChat(
  requestId: string,
  providerId: string,
  text: string,
) {
  const ai = await classifyAndDraft(text);

  const { data, error } = await supabase
    .from("offers")
    .insert({
      request_id: requestId,
      provider_id: providerId,
      provider_name: "مزود خدمة",
      title: ai.title || "عرض جديد",
      description: ai.description || text,
      price: ai.budgetMax || ai.budgetMin,
      delivery_time: ai.deliveryTime,
      status: "pending" as const,
      is_negotiable: true,
      location: ai.location,
    })
    .select("id")
    .single();

  if (error) throw error;

  // إرسال إشعار لصاحب الطلب
  if (data?.id) {
    // جلب عنوان الطلب وصاحبه لإرسال الإشعار
    supabase.from("requests").select("title, author_id").eq("id", requestId)
      .single().then(
        (
          { data: req }: { data: { title: string; author_id: string } | null },
        ) => {
          if (req && req.author_id) {
            sendPushNotificationForNewOffer({
              requestId,
              requestTitle: req.title,
              recipientId: req.author_id,
              authorId: providerId,
              offerId: data.id,
              offerTitle: ai.title || "عرض جديد",
              offerDescription: ai.description || text,
              providerName: "مزود خدمة",
            });
          }
        },
      );
  }

  return data;
}

/**
 * Creates an offer with full form data (used by RequestDetail form)
 */
export interface CreateOfferInput {
  requestId: string;
  providerId: string;
  title: string;
  description?: string;
  price: string;
  deliveryTime?: string;
  location?: string;
  isNegotiable?: boolean;
  images?: string[]; // URLs of uploaded images
}

export async function createOffer(
  input: CreateOfferInput,
): Promise<{ id: string } | null> {
  // Create offer initiated

  // التحقق من الحقول المطلوبة
  if (!input.requestId || !input.requestId.trim()) {
    throw new Error("معرف الطلب مطلوب");
  }
  if (!input.providerId || !input.providerId.trim()) {
    throw new Error("معرف مقدم الخدمة مطلوب");
  }
  if (!input.title || !input.title.trim()) {
    throw new Error("عنوان العرض مطلوب");
  }
  if (!input.price || !input.price.trim()) {
    throw new Error("السعر مطلوب");
  }

  // التحقق من أن المستخدم لا يقدم عرض على طلبه الخاص
  try {
    const { data: requestData, error: requestError } = await supabase
      .from("requests")
      .select("author_id")
      .eq("id", input.requestId.trim())
      .single();

    if (requestError) {
      logger.error("Error fetching request:", requestError, "createOffer");
      throw new Error("حدث خطأ في جلب معلومات الطلب");
    }

    if (!requestData) {
      throw new Error("الطلب غير موجود");
    }

    const requestAuthorId = requestData.author_id;
    const providerId = input.providerId.trim();

    if (requestAuthorId && providerId && requestAuthorId === providerId) {
      logger.warn("User attempted to create offer on their own request", {
        requestId: input.requestId,
        providerId: providerId,
        authorId: requestAuthorId,
      }, "createOffer");
      throw new Error("لا يمكنك تقديم عرض على طلبك الخاص");
    }
  } catch (err: unknown) {
    const error = err as Error;
    // إذا كان الخطأ من فحصنا (رسالة بالعربية)، نرميه مباشرة
    if (
      error.message.includes("لا يمكنك") ||
      error.message.includes("الطلب غير موجود") ||
      error.message.includes("حدث خطأ في جلب")
    ) {
      throw error;
    }
    // وإلا نسجل الخطأ ونكمل (لنمنع فشل إنشاء العروض بسبب مشاكل في قاعدة البيانات)
    logger.error("Error checking request author:", error, "createOffer");
  }

  // التحقق من وجود عرض مؤرشف سابق وحذفه نهائياً (للسماح بعرض جديد)
  try {
    const { data: existingArchivedOffer, error: checkError } = await supabase
      .from("offers")
      .select("id")
      .eq("request_id", input.requestId.trim())
      .eq("provider_id", input.providerId.trim())
      .eq("status", "archived")
      .eq("status", "archived")
      .maybeSingle();

    if (existingArchivedOffer && !checkError) {
      // Found archived offer, removing to allow new offer...
      // حذف العرض المؤرشف نهائياً ليسمح بإنشاء عرض جديد
      await supabase
        .from("offers")
        .delete()
        .eq("id", existingArchivedOffer.id);
      // Archived offer removed
    }
  } catch (archiveCheckError) {
    // تجاهل الأخطاء هنا - فقط لتنظيف العروض المؤرشفة القديمة
    // No archived offer found or error suppressed
  }

  // جلب اسم المزود الحقيقي من ملفه الشخصي
  let providerName = "مزود خدمة"; // قيمة افتراضية
  try {
    const { data: providerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", input.providerId.trim())
      .single();

    if (providerProfile?.display_name) {
      providerName = providerProfile.display_name;
    }
  } catch (profileError) {
    logger.warn(
      "Failed to fetch provider profile name, using default",
      profileError,
      "createOffer",
    );
    // نستخدم القيمة الافتراضية في حالة الخطأ
  }

  const payload = {
    request_id: input.requestId.trim(),
    provider_id: input.providerId.trim(),
    provider_name: providerName,
    title: input.title.trim(),
    description: (input.description || "").trim(),
    price: input.price.trim(),
    delivery_time: input.deliveryTime?.trim() || null,
    status: "pending" as const,
    is_negotiable: input.isNegotiable ?? true,
    location: input.location?.trim() || null,
    images: input.images || [],
  };

  try {
    // Inserting offer payload...

    const { data, error } = await supabase
      .from("offers")
      .insert(payload)
      .select("id")
      .single();

    // إذا كان هناك data حتى مع وجود error، يعتبر العرض تم إنشاؤه بنجاح
    // (بعض الأخطاء في triggers قد تحدث بعد إنشاء العرض)
    if (data && data.id) {
      // Offer created successfully (with potential trigger warning)
      return data;
    }

    if (error) {
      logger.error("Create offer error", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        payload: payload,
      }, "createOffer");

      // التحقق من وجود العرض رغم الخطأ (في حالة trigger errors)
      const isTriggerError = error.code === "42703" ||
        error.message?.includes("notifications") ||
        error.message?.includes("related_request_id") ||
        error.code === "PGRST116"; // No rows returned (قد يحدث إذا فشل select بعد insert)

      if (isTriggerError) {
        logger.log(
          "⚠️ Trigger error detected, checking if offer was created...",
        );

        // محاولة العثور على العرض الذي تم إنشاؤه حديثاً (في آخر 5 ثوان)
        const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
        const { data: existingOffers } = await supabase
          .from("offers")
          .select("id")
          .eq("request_id", payload.request_id)
          .eq("provider_id", payload.provider_id)
          .eq("title", payload.title)
          .eq("price", payload.price)
          .gte("created_at", fiveSecondsAgo)
          .order("created_at", { ascending: false })
          .limit(1);

        if (
          existingOffers && existingOffers.length > 0 && existingOffers[0]?.id
        ) {
          logger.log(
            "✅ Offer was created despite trigger error:",
            existingOffers[0],
          );
          return existingOffers[0];
        }

        // إذا لم نجد العرض، نحاول fallback method
        logger.log("⚠️ Offer not found, trying RPC fallback...");
        return await createOfferWithoutTrigger(payload);
      }

      // إرجاع خطأ مفصل للمستخدم
      throw new Error(
        error.message || `خطأ في قاعدة البيانات: ${error.code || "UNKNOWN"}`,
      );
    }

    // Offer created successfully

    // إرسال إشعار لصاحب الطلب (استخدام البيانات التي جلبناها مسبقاً في التحقق)
    if (data && data.id) {
      // نعيد جلب معلومات الطلب لضمان الدقة إذا لم تكن موجودة (رغم أننا جلبناها في سطر 360)
      const { data: requestData } = await supabase
        .from("requests")
        .select("title, author_id")
        .eq("id", input.requestId.trim())
        .single();

      if (requestData && requestData.author_id) {
        sendPushNotificationForNewOffer({
          requestId: input.requestId.trim(),
          requestTitle: requestData.title,
          recipientId: requestData.author_id,
          authorId: input.providerId.trim(),
          offerId: data.id,
          offerTitle: input.title.trim(),
          offerDescription: input.description,
          providerName: providerName,
        });
      }
    }

    return data;
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    logger.error("Create offer failed", {
      message: error.message,
      stack: error.stack,
    }, "createOffer");

    // محاولة الـ fallback
    if (error.message?.includes("notifications") || error.code === "42703") {
      logger.log("⚠️ Trying fallback method...");
      return await createOfferWithoutTrigger(payload);
    }

    return null;
  }
}

/**
 * Fallback: إنشاء عرض بدون trigger (إذا فشل الـ insert العادي)
 * ملاحظة: RPC function غير موجودة حالياً، لذا نعيد null
 */
async function createOfferWithoutTrigger(
  payload: Record<string, any>,
): Promise<{ id: string } | null> {
  try {
    // RPC function غير موجودة حالياً
    // يمكن إضافة RPC function لاحقاً إذا لزم الأمر
    logger.warn(
      "⚠️ RPC fallback method not available (create_offer_simple function not found)",
    );
    logger.warn(
      "⚠️ Please run FIX_NOTIFICATIONS_RLS.sql to fix RLS policies for notifications",
    );

    // محاولة إدراج مباشر بدون select (لتجنب trigger errors)
    const { error: insertError } = await supabase
      .from("offers")
      .insert(payload);

    if (insertError) {
      logger.error("RPC fallback failed:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      }, "createOfferWithoutTrigger");
      return null;
    }

    // محاولة العثور على العرض الذي تم إنشاؤه
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: existingOffers } = await supabase
      .from("offers")
      .select("id")
      .eq("request_id", payload.request_id)
      .eq("provider_id", payload.provider_id)
      .eq("title", payload.title)
      .eq("price", payload.price)
      .gte("created_at", fiveSecondsAgo)
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingOffers && existingOffers.length > 0 && existingOffers[0]?.id) {
      logger.log("✅ Offer created via fallback:", existingOffers[0]);
      return existingOffers[0];
    }

    // إذا الـ RPC غير موجود، نحاول تعطيل الـ trigger مؤقتاً (لن يعمل في معظم الحالات بسبب الصلاحيات)
    // كحل أخير، نعيد الخطأ للمستخدم
    logger.error("❌ RPC fallback failed:", insertError);

    // محاولة أخيرة: إنشاء العرض بدون الحقول التي قد تسبب مشاكل
    const minimalPayload = {
      request_id: payload.request_id,
      provider_id: payload.provider_id,
      provider_name: payload.provider_name,
      title: payload.title,
      description: payload.description || "",
      price: payload.price,
      status: "pending",
      is_negotiable: payload.is_negotiable ?? true,
    };

    const { data: minData, error: minError } = await supabase
      .from("offers")
      .insert(minimalPayload)
      .select("id")
      .single();

    if (!minError && minData) {
      logger.log("✅ Offer created with minimal payload:", minData);
      return minData;
    }

    logger.error("❌ All fallback methods failed");
    return null;
  } catch (err) {
    logger.error("❌ Fallback method failed:", err);
    return null;
  }
}

/**
 * Fetch requests with pagination
 */
export async function fetchRequestsPaginated(
  page: number = 0,
  pageSize: number = 10,
): Promise<{ data: Request[]; count: number | null }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let data: Record<string, any>[] | null;
  let error:
    | { message: string; code?: string; details?: string; hint?: string }
    | null;
  let count: number | null = null;
  try {
    const res = await supabase
      .from("requests")
      .select(`
        *,
        request_categories (
          category_id,
          categories (id, label)
        )
      `)
      .eq("is_public", true)
      .eq("status", "active") // فقط الطلبات النشطة
      .order("created_at", { ascending: false })
      .range(from, to);
    data = res.data;
    error = res.error;
    count = null; // Don't use heavy count query for faster load
  } catch (thrown: unknown) {
    // Handle timeout and network errors
    const err = thrown as Error;
    if (
      err.message?.includes("timeout") ||
      err.message?.includes("Failed to fetch") || err.name === "AbortError"
    ) {
      logger.error("❌ Connection timeout or network error:", err);
      throw new Error(
        "Connection timeout: Unable to reach Supabase. Please check your internet connection and Supabase configuration.",
      );
    }
    throw thrown;
  }

  if (error) {
    logger.error("❌ Error fetching requests:", error);
    logger.error(
      "Error details:",
      JSON.stringify(
        {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        null,
        2,
      ),
    );

    // Handle timeout errors from Supabase
    if (
      error.message?.includes("timeout") ||
      error.message?.includes("Failed to fetch")
    ) {
      throw new Error(
        "Connection timeout: Unable to reach Supabase. Please check your internet connection and Supabase configuration.",
      );
    }

    throw error;
  }

  logger.log(`✅ Fetched ${data?.length || 0} requests (page ${page + 1})`);

  // فلترة إضافية للتأكد من عدم وجود طلبات مخفية
  const filtered = Array.isArray(data)
    ? data.filter((req) => req.is_public === true && req.status === "active")
    : [];

  const transformed = filtered.map(transformRequest);
  return { data: transformed, count };
}

/**
 * Fetch all public requests from database (Legacy - kept for compatibility but uses pagination internally if needed)
 */
export async function fetchAllRequests(): Promise<Request[]> {
  // Just fetch the first 50 for now to be safe, or implement infinite scroll later
  const { data } = await fetchRequestsPaginated(0, 50);
  return data;
}

/**
 * Check connection to Supabase (with timeout)
 */
export async function checkSupabaseConnection(): Promise<
  { connected: boolean; error?: string }
> {
  try {
    // Add 15 second timeout to prevent hanging (increased for slow connections)
    const timeoutPromise = new Promise<{ connected: false; error: string }>(
      (_, reject) => {
        setTimeout(() => reject(new Error("Connection timeout (15s)")), 15000);
      },
    );

    const queryPromise = (async () => {
      const { data: _data, error } = await supabase.from("requests").select(
        "id",
      )
        .limit(1);

      if (error) {
        logger.error(
          "❌ Supabase query error:",
          JSON.stringify(
            {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
            },
            null,
            2,
          ),
        );
        return { connected: false, error: error.message };
      }
      logger.log("✅ Supabase connection check passed");
      return { connected: true };
    })();

    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (err: unknown) {
    const error = err as Error;
    logger.warn("Supabase connection failed:", error.message);
    return { connected: false, error: error.message };
  }
}

/**
 * Fetch a single request by ID
 */
export async function fetchRequestById(
  requestId: string,
): Promise<Request | null> {
  const { data, error } = await supabase
    .from("requests")
    .select(`
      *,
      request_categories (
        category_id,
        categories (id, label)
      )
    `)
    .eq("id", requestId)
    .single();

  if (error) {
    logger.error("Error fetching request by ID:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return transformRequest(data);
}

/**
 * Fetch user's own requests
 */
export async function fetchMyRequests(userId: string): Promise<Request[]> {
  logger.log(
    `📥 fetchMyRequests: Fetching requests for user ${userId.slice(-4)}...`,
  );

  const { data, error } = await supabase
    .from("requests")
    .select(`
      *,
      request_categories (
        category_id,
        categories (id, label)
      )
    `)
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Error fetching my requests:", error);
    throw error;
  }

  const requests = (data || []).map(transformRequest);

  logger.log(`✅ fetchMyRequests: Found ${requests.length} requests`, {
    userId: userId.slice(-4),
    requestIds: requests.map((r) => r.id.slice(-4)),
    requestStatuses: requests.map((r) => ({
      id: r.id.slice(-4),
      status: r.status,
    })),
  });

  return requests;
}

/**
 * Fetch offers for a user
 */
export async function fetchMyOffers(providerId: string): Promise<Offer[]> {
  if (!providerId) {
    logger.warn("fetchMyOffers: No providerId provided, returning empty array");
    return [];
  }

  const { data, error } = await supabase
    .from("offers")
    .select("*, requests!request_id(*, request_categories(categories(*)))")
    .eq("provider_id", providerId)
    .neq("status", "archived") // استبعاد العروض المؤرشفة (الحذف الناعم)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Error fetching offers:", error);
    // بدلاً من رمي الخطأ، نعيد مصفوفة فارغة لتجنب كسر التطبيق
    // هذا يمنع إعادة التوجيه إلى Onboarding بسبب خطأ في جلب العروض
    logger.warn("Returning empty array due to error to prevent app crash");
    return [];
  }

  return (data || []).map((offer: Record<string, any>) => ({
    id: offer.id,
    requestId: offer.request_id,
    providerId: offer.provider_id,
    providerName: offer.provider_name,
    title: offer.title,
    description: offer.description || "",
    price: offer.price || "",
    deliveryTime: offer.delivery_time || "",
    status: offer.status,
    createdAt: new Date(offer.created_at),
    isNegotiable: offer.is_negotiable ?? true,
    location: offer.location || "",
    images: offer.images || [],
    relatedRequest: offer.requests
      ? transformRequest(offer.requests, offer.requests.offers_count)
      : undefined,
  }));
}

/**
 * Fetch offers for a specific request
 */
export async function fetchOffersForRequest(
  requestId: string,
): Promise<Offer[]> {
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("request_id", requestId)
    .neq("status", "archived") // استبعاد العروض المؤرشفة
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Error fetching offers for request:", error);
    throw error;
  }

  // جلب أسماء المزودين من profiles للأعروض التي لا تحتوي على provider_name
  const offersWithMissingNames = (data || []).filter(
    (offer: Record<string, any>) =>
      !offer.provider_name || offer.provider_name === "مزود خدمة",
  );

  const providerIds = offersWithMissingNames
    .map((offer: Record<string, any>) => offer.provider_id)
    .filter((id: string) => id) as string[];

  const providerNamesMap: Map<string, string> = new Map();
  if (providerIds.length > 0) {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", providerIds);

      if (profiles) {
        profiles.forEach(
          (profile: { id: string; display_name: string | null }) => {
            if (profile.display_name) {
              providerNamesMap.set(profile.id, profile.display_name);
            }
          },
        );
      }
    } catch (profileError) {
      logger.warn(
        "Failed to fetch provider names, using stored values",
        profileError,
        "fetchOffersForRequest",
      );
    }
  }

  return (data || []).map((offer: Record<string, any>) => {
    // استخدام اسم المزود من profiles إذا كان provider_name مفقوداً أو هو القيمة الافتراضية
    let providerName = offer.provider_name;
    if (!providerName || providerName === "مزود خدمة") {
      const fetchedName = providerNamesMap.get(offer.provider_id);
      if (fetchedName) {
        providerName = fetchedName;
      } else {
        providerName = "مزود خدمة"; // قيمة افتراضية
      }
    }

    return {
      id: offer.id,
      requestId: offer.request_id,
      providerId: offer.provider_id,
      providerName: providerName,
      title: offer.title,
      description: offer.description || "",
      price: offer.price || "",
      deliveryTime: offer.delivery_time || "",
      status: offer.status,
      createdAt: new Date(offer.created_at),
      isNegotiable: offer.is_negotiable ?? true,
      location: offer.location || "",
      images: offer.images || [],
    };
  });
}

/**
 * Fetch offers for all user's requests (received offers)
 * Returns a map of requestId -> offers array
 */
export async function fetchOffersForUserRequests(
  userId: string,
): Promise<Map<string, Offer[]>> {
  if (!userId) {
    logger.warn(
      "fetchOffersForUserRequests: No userId provided, returning empty map",
    );
    return new Map();
  }

  // First, get all request IDs for this user
  const { data: requests, error: requestsError } = await supabase
    .from("requests")
    .select("id")
    .eq("author_id", userId);

  if (requestsError) {
    logger.error("Error fetching user requests:", requestsError);
    // بدلاً من رمي الخطأ، نعيد Map فارغ لتجنب كسر التطبيق
    return new Map();
  }

  const requestIds = (requests || []).map((r: { id: string }) => r.id);
  logger.log(
    `📋 fetchOffersForUserRequests: Found ${requestIds.length} requests for user ${userId}`,
  );

  if (requestIds.length === 0) {
    logger.log("⚠️ No requests found for user, returning empty offers map");
    return new Map();
  }

  // Fetch all offers for these requests (excluding archived ones)
  logger.log(`🔍 Fetching offers for ${requestIds.length} requests...`);
  const { data: offers, error: offersError } = await supabase
    .from("offers")
    .select("*")
    .in("request_id", requestIds)
    .neq("status", "archived") // استبعاد العروض المؤرشفة
    .order("created_at", { ascending: false });

  if (offersError) {
    logger.error("Error fetching offers for user requests:", offersError);
    return new Map();
  }

  logger.log(`✅ Found ${offers?.length || 0} offers for user requests`);

  // Group offers by request ID
  const offersMap = new Map<string, Offer[]>();
  (offers || []).forEach((offer: Record<string, any>) => {
    // التحقق من أن request_id موجود وصحيح
    if (!offer.request_id) {
      logger.error(
        `❌ Offer ${offer.id?.slice(-4) || "unknown"} has no request_id!`,
        offer,
      );
      return; // تخطي هذا العرض
    }

    const transformed: Offer = {
      id: offer.id,
      requestId: offer.request_id,
      providerId: offer.provider_id,
      providerName: offer.provider_name,
      title: offer.title,
      description: offer.description || "",
      price: offer.price || "",
      deliveryTime: offer.delivery_time || "",
      status: offer.status as Offer["status"],
      createdAt: new Date(offer.created_at),
      isNegotiable: offer.is_negotiable ?? true,
      location: offer.location || "",
      images: offer.images || [],
    };

    const existingOffers = offersMap.get(offer.request_id) || [];
    existingOffers.push(transformed);
    offersMap.set(offer.request_id, existingOffers);

    logger.log(`📝 Adding offer to map:`, {
      offerId: offer.id?.slice(-4) || "unknown",
      requestId: offer.request_id?.slice(-4) || "unknown",
      status: offer.status,
      title: offer.title,
      mapSize: offersMap.size,
    });
  });

  logger.log(`✅ fetchOffersForUserRequests: Final result`, {
    requestIdsCount: requestIds.length,
    requestIdsList: requestIds.map((id) => id.slice(-4)),
    offersCount: offers?.length || 0,
    offersMapSize: offersMap.size,
    mapKeys: Array.from(offersMap.keys()).map((id) => id.slice(-4)),
    offersPerRequest: Array.from(offersMap.entries()).map(([reqId, offs]) => ({
      requestId: reqId.slice(-4),
      offersCount: offs.length,
      offers: offs.map((o) => ({
        id: o.id.slice(-4),
        status: o.status,
        title: o.title,
      })),
    })),
  });

  return offersMap;
}

/**
 * Migrate user's draft requests to active (one-time migration)
 * This is needed to update old draft requests to the new active-only system
 */
export async function migrateUserDraftRequests(
  userId: string,
): Promise<number> {
  try {
    // Get all draft requests for this user
    const { data: draftRequests, error: fetchError } = await supabase
      .from("requests")
      .select("id")
      .eq("author_id", userId)
      .eq("status", "draft");

    if (fetchError || !draftRequests?.length) {
      return 0;
    }

    // Update all draft requests to active
    const { error: updateError } = await supabase
      .from("requests")
      .update({ status: "active", is_public: true })
      .eq("author_id", userId)
      .eq("status", "draft");

    if (updateError) {
      logger.error("Error migrating draft requests:", updateError);
      return 0;
    }

    logger.log(`Migrated ${draftRequests.length} draft requests to active`);
    return draftRequests.length;
  } catch (error) {
    logger.error("Error in migrateUserDraftRequests:", error);
    return 0;
  }
}

/**
 * Updates an existing offer
 */
export interface UpdateOfferInput {
  offerId: string;
  providerId: string;
  title?: string;
  description?: string;
  price?: string;
  deliveryTime?: string;
  location?: string;
  isNegotiable?: boolean;
  images?: string[]; // URLs of uploaded images
}

export async function updateOffer(input: UpdateOfferInput): Promise<boolean> {
  logger.log("=== updateOffer called ===");
  logger.log("Input:", {
    offerId: input.offerId,
    providerId: input.providerId,
    title: input.title,
    price: input.price,
    hasImages: input.images?.length || 0,
  });

  const updateData: Partial<OfferInsert> & { updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) {
    updateData.description = input.description || "";
  }
  if (input.price !== undefined) updateData.price = input.price;
  if (input.deliveryTime !== undefined) {
    updateData.delivery_time = input.deliveryTime;
  }
  if (input.location !== undefined) updateData.location = input.location;
  if (input.isNegotiable !== undefined) {
    updateData.is_negotiable = input.isNegotiable;
  }
  if (input.images !== undefined) updateData.images = input.images || [];

  try {
    logger.log("Update payload:", updateData);

    const { error } = await supabase
      .from("offers")
      .update(updateData)
      .eq("id", input.offerId)
      .eq("provider_id", input.providerId); // Security: only the owner can update

    if (error) {
      logger.error("❌ Update offer error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    logger.log("✅ Offer updated successfully");
    return true;
  } catch (err: unknown) {
    logger.error("Error updating offer", err as Error, "updateOffer");
    throw err;
  }
}

/**
 * Archive a request
 */
export async function archiveRequest(
  requestId: string,
  userId: string,
): Promise<boolean> {
  try {
    // Use the database function for security
    const { data, error } = await supabase.rpc("archive_request", {
      request_id_param: requestId,
      user_id_param: userId,
    });

    if (error) {
      // Fallback to direct update if function doesn't exist
      const { error: updateError } = await supabase
        .from("requests")
        .update({ status: "archived", is_public: false })
        .eq("id", requestId)
        .eq("author_id", userId);

      if (updateError) {
        logger.error("Error archiving request:", updateError);
        return false;
      }
      return true;
    }

    return data === true;
  } catch (err: unknown) {
    logger.error("Error archiving request", err as Error, "archiveRequest");
    return false;
  }
}

/**
 * Unarchive a request
 */
export async function unarchiveRequest(
  requestId: string,
  userId: string,
): Promise<boolean> {
  try {
    // Use the database function for security
    const { data, error } = await supabase.rpc("unarchive_request", {
      request_id_param: requestId,
      user_id_param: userId,
    });

    if (error) {
      // Fallback to direct update if function doesn't exist
      const { error: updateError } = await supabase
        .from("requests")
        .update({ status: "active" })
        .eq("id", requestId)
        .eq("author_id", userId)
        .eq("status", "archived");

      if (updateError) {
        logger.error("Error unarchiving request:", updateError);
        return false;
      }
      return true;
    }

    return data === true;
  } catch (err: unknown) {
    logger.error("Error unarchiving request", err as Error, "unarchiveRequest");
    return false;
  }
}

/**
 * Archive an offer (Soft Delete)
 * Marks the offer as archived instead of permanently deleting it
 * This preserves historical data while hiding the offer from active views
 * Note: Images are NOT deleted to preserve history; cleanup can be done via scheduled job if needed
 */
export async function archiveOffer(
  offerId: string,
  userId: string,
): Promise<boolean> {
  try {
    logger.log("archiveOffer called", { offerId, userId });

    // Verify the offer exists and belongs to the user
    const { data: offer, error: fetchError } = await supabase
      .from("offers")
      .select("id, status")
      .eq("id", offerId)
      .eq("provider_id", userId)
      .single();

    if (fetchError || !offer) {
      logger.error("Error fetching offer", fetchError, "archiveOffer");
      return false;
    }

    // Check if already archived
    if (offer.status === "archived") {
      logger.log("Offer is already archived", { offerId }, "archiveOffer");
      return true; // Consider it a success
    }

    // Soft delete: Update status to 'archived' instead of deleting
    logger.log("Attempting to archive offer", {
      offerId,
      userId,
      currentStatus: offer.status,
    });

    const { data: updateResult, error } = await supabase
      .from("offers")
      .update({
        status: "archived",
      })
      .eq("id", offerId)
      .eq("provider_id", userId)
      .select();

    if (error) {
      logger.error("Error archiving offer", error, "archiveOffer", {
        updateResult,
        offerId,
        userId,
      });
      return false;
    }

    // Check if any rows were actually updated
    if (!updateResult || updateResult.length === 0) {
      logger.error(
        "No rows updated - offer may not exist or user doesn't own it",
        undefined,
        "archiveOffer",
        { offerId, userId },
      );
      return false;
    }

    logger.log(
      "Offer archived successfully",
      { offerId, userId },
      "archiveOffer",
    );
    return true;
  } catch (err: unknown) {
    logger.error("Error archiving offer", err as Error, "archiveOffer");
    return false;
  }
}

/**
 * Fetch archived requests for a user
 */
export async function fetchArchivedRequests(
  userId: string,
): Promise<Request[]> {
  const { data, error } = await supabase
    .from("requests")
    .select(`
      *,
      request_categories (
        category_id,
        categories (id, label)
      )
    `)
    .eq("author_id", userId)
    .eq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Error fetching archived requests:", error);
    throw error;
  }

  return (data || []).map((req: Record<string, any>) => ({
    id: req.id,
    title: req.title,
    description: req.description,
    author: req.author_id || "مستخدم",
    createdAt: new Date(req.created_at),
    updatedAt: req.updated_at ? new Date(req.updated_at) : undefined,
    status: req.status,
    isPublic: req.is_public,
    budgetType: req.budget_type || "negotiable",
    budgetMin: req.budget_min || "",
    budgetMax: req.budget_max || "",
    location: req.location || "",
    categories:
      (req.request_categories as Record<string, any>[])?.map((rc) =>
        rc.categories?.label
      )
        .filter(
          Boolean,
        ) || [],
    deliveryTimeType: (() => {
      // Map database values back to frontend values for compatibility
      const dbValue = req.delivery_type || "not-specified";
      if (dbValue === "not-specified") return "not-specified";
      if (dbValue === "pickup") return "immediate"; // Map back to immediate for UI
      if (dbValue === "delivery") return "immediate"; // Map back to immediate for UI
      if (dbValue === "both") return "range"; // Map back to range for UI
      return "not-specified";
    })(),
    deliveryTimeFrom: req.delivery_from || "",
    deliveryTimeTo: req.delivery_to || "",
    messages: [],
    offers: [],
    images: req.images || [],
    contactMethod: "both",
    seriousness: req.seriousness || 3,
  }));
}

/**
 * Calculate seriousness based on offers count (inverse relationship)
 * 0 offers = 5 (very high), 1 offer = 4 (high), 2 offers = 3 (medium), 3-4 offers = 2 (low), 5+ offers = 1 (very low)
 */
export function calculateSeriousness(offersCount: number): number {
  if (offersCount === 0) return 5; // عالية جداً
  if (offersCount === 1) return 4; // عالية
  if (offersCount === 2) return 3; // متوسطة
  if (offersCount <= 4) return 2; // منخفضة
  return 1; // منخفضة جداً
}

/**
 * Transform Supabase request to app Request format
 */
function transformRequest(
  req: Record<string, any>,
  offersCount?: number,
): Request {
  // Calculate seriousness based on offers count if provided, otherwise use stored value
  const seriousness = offersCount !== undefined
    ? calculateSeriousness(offersCount)
    : (req.seriousness || 2);

  return {
    id: req.id,
    title: req.title,
    description: req.description,
    author: req.author_id || "مستخدم",
    createdAt: new Date(req.created_at),
    updatedAt: req.updated_at ? new Date(req.updated_at) : undefined,
    status: req.status,
    isPublic: req.is_public,
    budgetType: req.budget_type || "negotiable",
    budgetMin: req.budget_min || "",
    budgetMax: req.budget_max || "",
    location: req.location || "",
    categories:
      (req.request_categories as Record<string, any>[])?.map((rc) =>
        rc.categories?.label
      )
        .filter(
          Boolean,
        ) || [],
    deliveryTimeType: (() => {
      // Map database values back to frontend values for compatibility
      const dbValue = req.delivery_type || "not-specified";
      if (dbValue === "not-specified") return "not-specified";
      if (dbValue === "pickup") return "immediate"; // Map back to immediate for UI
      if (dbValue === "delivery") return "immediate"; // Map back to immediate for UI
      if (dbValue === "both") return "range"; // Map back to range for UI
      return "not-specified";
    })(),
    deliveryTimeFrom: req.delivery_from || "",
    deliveryTimeTo: req.delivery_to || "",
    messages: [],
    offers: [],
    images: req.images || [],
    contactMethod: "both",
    seriousness,
    locationCoords: req.location_lat && req.location_lng
      ? {
        lat: req.location_lat,
        lng: req.location_lng,
      }
      : undefined,
  };
}

/**
 * Check if a request matches user interests
 */
async function matchesUserInterests(
  requestId: string,
  interestedCategories: string[],
  interestedCities: string[],
  radarWords: string[] = [],
): Promise<boolean> {
  // Filter out "كل المدن" and "جميع المدن (شامل عن بعد)" from cities check - they don't count as interests
  // Check if user selected "all cities" (either name format)
  const hasAllCities = interestedCities.includes("كل المدن") ||
    interestedCities.includes("جميع المدن (شامل عن بعد)");
  const actualCities = interestedCities.filter((city) =>
    city !== "كل المدن" && city !== "جميع المدن (شامل عن بعد)"
  );

  // If no interests specified (no categories and no actual cities), don't match
  // "كل المدن" alone doesn't count as having interests
  if (
    interestedCategories.length === 0 && actualCities.length === 0 &&
    radarWords.length === 0
  ) {
    return false;
  }

  try {
    // Fetch request with categories
    const { data, error } = await supabase
      .from("requests")
      .select(`
        *,
        request_categories (
          category_id,
          categories (id, label)
        )
      `)
      .eq("id", requestId)
      .eq("is_public", true)
      .eq("status", "active")
      .single();

    if (error || !data) return false;

    const request = transformRequest(data);

    // Check category match
    let hasMatchingCategory = false;
    if (interestedCategories.length > 0) {
      const requestCategories = request.categories || [];
      hasMatchingCategory = requestCategories.some((catLabel: string) => {
        const requestCategoryObj = AVAILABLE_CATEGORIES.find((c) =>
          c.label === catLabel || c.label_en === catLabel ||
          c.label_ur === catLabel
        );
        const requestCategoryId = requestCategoryObj?.id;

        return interestedCategories.some((interestId: string) => {
          if (requestCategoryId === interestId) return true;

          const interestCategoryObj = AVAILABLE_CATEGORIES.find((c) =>
            c.id === interestId
          );
          if (!interestCategoryObj) return false;

          const interestLabels = [
            interestId,
            interestCategoryObj.label,
            interestCategoryObj.label_en,
            interestCategoryObj.label_ur,
          ].filter(Boolean);

          if (interestId.startsWith("car-")) {
            interestLabels.push(
              "سيارات",
              "سيارة",
              "قطع غيار",
              "قطع الغيار",
              "صيانة",
              "ميكانيكي",
              "مركبة",
              "عربة",
            );
          }

          const catLabelLower = catLabel.toLowerCase();
          return interestLabels.some((label) => {
            if (!label) return false;
            const labelLower = label.toLowerCase();
            return (
              catLabelLower === labelLower ||
              catLabelLower.includes(labelLower) ||
              labelLower.includes(catLabelLower)
            );
          });
        });
      });
    } else {
      // If no categories selected, we consider it a match to allow filtering by city or radar only
      hasMatchingCategory = true;
    }

    // Check radar words match (title/description)
    let hasRadarMatch = false;
    if (radarWords.length > 0) {
      const searchText = `${request.title} ${request.description || ""}`
        .toLowerCase();
      hasRadarMatch = radarWords.some((word: string) =>
        searchText.includes(word.toLowerCase())
      );
    } else {
      // If no radar words selected, we consider it a match (meaning no filtering by radar words)
      hasRadarMatch = false; // Note: we'll use this in the final logic
    }

    // Logic: (Category Match OR Radar Word Match) AND City Match
    // If no categories AND no radar words, it passed the initial check at line 1908

    // Check city match
    let hasMatchingCity = true;
    if (!hasAllCities && actualCities.length > 0 && request.location) {
      const requestCity = request.location.split("،").pop()?.trim() ||
        request.location;
      hasMatchingCity = actualCities.some((city: string) =>
        requestCity.includes(city) || city.includes(requestCity)
      );
    }

    // Final flexible matching:
    // 1. If categories AND radar words are set: match EITHER (flexible)
    // 2. If only one is set: match that one
    // 3. If neither: match everything in city
    const hasCatSelection = interestedCategories.length > 0;
    const hasRadarSelection = radarWords.length > 0;

    let interestMatch = false;
    if (!hasCatSelection && !hasRadarSelection) {
      interestMatch = true;
    } else {
      interestMatch = (hasCatSelection && hasMatchingCategory) ||
        (hasRadarSelection && hasRadarMatch);
    }

    return interestMatch && hasMatchingCity;
  } catch (error) {
    logger.error("Error checking user interests:", error);
    return false;
  }
}

/**
 * Subscribe to new requests that match user interests
 */
export function subscribeToNewRequests(
  interestedCategories: string[],
  interestedCities: string[],
  radarWords: string[],
  callback: (newRequest: Request) => void,
): () => void {
  const channel = supabase
    .channel("new-requests")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "requests",
        filter: "is_public=eq.true",
      },
      async (payload: any) => {
        const newRequest = payload.new as Record<string, any>;

        // Only process active requests
        if (newRequest.status !== "active") return;

        // Check if matches user interests
        const matches = await matchesUserInterests(
          newRequest.id,
          interestedCategories,
          interestedCities,
          radarWords,
        );

        if (matches) {
          // Fetch full request with categories
          const { data, error } = await supabase
            .from("requests")
            .select(`
              *,
              request_categories (
                category_id,
                categories (id, label)
              )
            `)
            .eq("id", newRequest.id)
            .single();

          if (!error && data) {
            const transformedRequest = transformRequest(data);
            callback(transformedRequest);
          }
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to all new public requests (for "All" view)
 */
export function subscribeToAllNewRequests(
  callback: (newRequest: Request) => void,
): () => void {
  const channel = supabase
    .channel("all-new-requests")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "requests",
        filter: "is_public=eq.true",
      },
      async (payload: any) => {
        const newRequest = payload.new as Record<string, any>;

        // Only process active requests
        if (newRequest.status !== "active") return;

        // Fetch full request with categories
        const { data, error } = await supabase
          .from("requests")
          .select(`
            *,
            request_categories (
              category_id,
              categories (id, label)
            )
          `)
          .eq("id", newRequest.id)
          .single();

        if (!error && data) {
          const transformedRequest = transformRequest(data);
          callback(transformedRequest);
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to request visibility updates (hide/show changes)
 * Listens for UPDATE events where is_public changes
 */
export function subscribeToRequestUpdates(
  onHide: (requestId: string) => void,
  onShow: (request: Request) => void,
): () => void {
  const channel = supabase
    .channel("request-visibility-updates")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "requests",
      },
      async (payload: any) => {
        const oldRecord = payload.old as Record<string, any>;
        const newRecord = payload.new as Record<string, any>;

        // Skip if is_public didn't change
        if (oldRecord.is_public === newRecord.is_public) return;

        // Request was hidden (is_public: true -> false)
        if (oldRecord.is_public === true && newRecord.is_public === false) {
          onHide(newRecord.id);
          return;
        }

        // Request was shown (is_public: false -> true) AND is active
        if (
          oldRecord.is_public === false &&
          newRecord.is_public === true &&
          newRecord.status === "active"
        ) {
          // Fetch full request data with categories
          const { data, error } = await supabase
            .from("requests")
            .select(`
              *,
              request_categories (
                category_id,
                categories (id, label)
              )
            `)
            .eq("id", newRecord.id)
            .single();

          if (!error && data) {
            onShow(transformRequest(data));
          }
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * إخفاء الطلب من السوق (is_public = false)
 */
export async function hideRequest(
  requestId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("requests")
      .update({ is_public: false })
      .eq("id", requestId)
      .eq("author_id", userId);

    if (error) {
      logger.error("Error hiding request:", error);
      return false;
    }
    return true;
  } catch (err) {
    logger.error("Error hiding request:", err);
    return false;
  }
}

/**
 * إظهار الطلب مجدداً (is_public = true)
 */
export async function unhideRequest(
  requestId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("requests")
      .update({ is_public: true })
      .eq("id", requestId)
      .eq("author_id", userId);

    if (error) {
      logger.error("Error unhiding request:", error);
      return false;
    }
    return true;
  } catch (err) {
    logger.error("Error unhiding request:", err);
    return false;
  }
}

/**
 * تحديث توقيت الطلب لرفعه (يحدّث updated_at)
 */
export async function bumpRequest(
  requestId: string,
  userId: string,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("requests")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", requestId)
      .eq("author_id", userId);

    if (error) {
      logger.error("Error bumping request:", error);
      return false;
    }
    return true;
  } catch (err) {
    logger.error("Error bumping request:", err);
    return false;
  }
}

/**
 * تحديث طلب موجود
 * يتحقق من أن المستخدم هو صاحب الطلب قبل التحديث
 * شرط التعديل: يجب ألا يتجاوز الطلب 7 أيام من تاريخ الإنشاء
 * لا يمكن التعديل إذا كان الطلب مكتمل أو تم قبول عرض
 * إذا كان الطلب مؤرشف، يتم إلغاء الأرشفة تلقائياً
 * تحديث updated_at (bump): يتم إذا كان الطلب active ولم يتم قبول أي عرض
 */
export async function updateRequest(
  requestId: string,
  userId: string,
  draftData: AIDraft,
  seriousness?: number,
): Promise<{ id: string; wasArchived?: boolean } | null> {
  logger.log("=== updateRequest called ===");
  logger.log("requestId:", requestId);
  logger.log("userId:", userId);
  logger.log("draftData:", draftData);

  try {
    // 1. التحقق من أن المستخدم هو صاحب الطلب وجلب معلومات الطلب الكاملة
    const { data: existingRequest, error: checkError } = await supabase
      .from("requests")
      .select("author_id, status, created_at, accepted_offer_id")
      .eq("id", requestId)
      .single();

    logger.log("Existing request check:", { existingRequest, checkError });

    if (checkError || !existingRequest) {
      logger.error("الطلب غير موجود:", checkError);
      return null;
    }

    if (existingRequest.author_id !== userId) {
      logger.error("غير مصرح لك بتعديل هذا الطلب:", {
        requestAuthorId: existingRequest.author_id,
        currentUserId: userId,
      });
      return null;
    }

    // 2. التحقق من عدم إمكانية التعديل إذا كان الطلب مكتمل أو تم قبول عرض
    if (existingRequest.status === "completed") {
      logger.error("لا يمكن تعديل الطلب: الطلب مكتمل");
      return null; // منع التعديل تماماً
    }

    if (existingRequest.accepted_offer_id) {
      logger.error("لا يمكن تعديل الطلب: تم قبول عرض على الطلب");
      return null; // منع التعديل تماماً
    }

    // 3. التحقق من شرط الـ 7 أيام للتعديل
    // لا يمكن تعديل الطلب إذا تجاوز 7 أيام من تاريخ الإنشاء
    const createdAt = new Date(existingRequest.created_at);
    const now = new Date();
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) /
      (1000 * 60 * 60 * 24);
    const MAX_UPDATE_DAYS = 7; // 7 أيام كحد أقصى للتعديل

    if (daysSinceCreation > MAX_UPDATE_DAYS) {
      logger.error(
        `لا يمكن تعديل الطلب: تجاوز ${MAX_UPDATE_DAYS} أيام من الإنشاء (${
          daysSinceCreation.toFixed(1)
        } يوم)`,
      );
      return null; // منع التعديل تماماً
    }

    logger.log(
      `وقت التعديل مسموح (${daysSinceCreation.toFixed(1)} يوم من الإنشاء)`,
    );

    // 4. التحقق من حالة الأرشفة - إذا كان مؤرشف، سنقوم بإلغاء الأرشفة
    const wasArchived = existingRequest.status === "archived";
    if (wasArchived) {
      logger.log("الطلب مؤرشف، سيتم إلغاء الأرشفة تلقائياً");
    }

    // 5. التحقق من شروط تحديث updated_at (bump)
    // يتم تحديث updated_at إذا:
    // - الطلب في حالة active (أو كان archived وسيتم إلغاء الأرشفة)
    // - لم يتم قبول أي عرض بعد
    const canBump = (existingRequest.status === "active" || wasArchived) &&
      !existingRequest.accepted_offer_id;

    // 6. تحديث بيانات الطلب
    const updatePayload: Partial<RequestInsert> & { updated_at?: string } = {
      title: (draftData.title || draftData.summary || "طلب جديد").slice(0, 120),
      description: draftData.description || draftData.summary || "",
      budget_min: draftData.budgetMin,
      budget_max: draftData.budgetMax,
      budget_type: (draftData.budgetType as RequestInsert["budget_type"]) ||
        ((draftData.budgetMin || draftData.budgetMax) ? "fixed" : "negotiable"),
      location: draftData.location,
      delivery_from: draftData.deliveryTime,
    };

    // إضافة seriousness فقط إذا كانت محددة
    if (seriousness !== undefined) {
      updatePayload.seriousness = seriousness;
    }

    // 7. إذا كان مؤرشف، إلغاء الأرشفة (تحديث status إلى active)
    if (wasArchived) {
      updatePayload.status = "active";
      updatePayload.is_public = true; // إظهار الطلب في السوق
      logger.log("سيتم إلغاء الأرشفة وتفعيل الطلب");
    }

    // 8. إذا كانت شروط bump متوفرة، أضف updated_at للتحديث (bump)
    if (canBump) {
      updatePayload.updated_at = new Date().toISOString();
      logger.log("سيتم تحديث updated_at لرفع الطلب في القائمة");
    } else {
      logger.log("لن يتم تحديث updated_at:", {
        status: existingRequest.status,
        hasAcceptedOffer: !!existingRequest.accepted_offer_id,
      });
    }

    logger.log("Update payload:", updatePayload);

    const { error: updateError } = await supabase
      .from("requests")
      .update(updatePayload)
      .eq("id", requestId);

    logger.log("Update result:", { updateError });

    if (updateError) {
      logger.error("خطأ في تحديث الطلب:", updateError);
      return null;
    }

    logger.log("Request updated successfully!");

    // 5. تحديث التصنيفات - دائماً نحدث التصنيفات عند التعديل
    try {
      // حذف التصنيفات القديمة
      await supabase
        .from("request_categories")
        .delete()
        .eq("request_id", requestId);

      // إضافة التصنيفات الجديدة (أو "غير محدد" إذا لم يكن هناك تصنيفات)
      const categories = draftData.categories && draftData.categories.length > 0
        ? draftData.categories
        : []; // سيتم إضافة "أخرى" تلقائياً في linkCategoriesByLabels
      await linkCategoriesByLabels(requestId, categories);
      logger.log(
        "Categories updated:",
        categories.length > 0 ? categories : ["أخرى (افتراضي)"],
      );
    } catch (catErr) {
      logger.warn("Failed to update categories:", catErr);
      // نحاول إضافة "أخرى" على الأقل
      try {
        await linkCategories(requestId, ["other"]);
      } catch (_) {
        // Fallback ignored
      }
    }

    return { id: requestId, wasArchived };
  } catch (error) {
    logger.error("خطأ في تحديث الطلب:", error);
    return null;
  }
}

/**
 * قبول عرض معين على طلب
 * - يغير حالة العرض إلى "accepted"
 * - يغير حالة الطلب إلى "assigned"
 * - يرفض العروض الأخرى
 */
/**
 * قبول عرض معين على طلب
 * - يتحقق من صلاحيات المستخدم
 * - يحدث حالة العرض إلى "accepted"
 * - يرفض العروض الأخرى تلقائياً
 * - يحدث حالة الطلب إلى "assigned"
 * - يرسل إشعارات للطرفين
 */
export async function acceptOffer(
  requestId: string,
  offerId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. التحقق من صحة المدخلات
    if (!requestId || !offerId || !userId) {
      return { success: false, error: "بيانات غير صحيحة" };
    }

    // 2. التحقق من وجود الطلب وحالته
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select("id, author_id, status, title")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      logger.error("خطأ في جلب الطلب:", requestError);
      return { success: false, error: "الطلب غير موجود" };
    }

    // 3. التحقق من أن المستخدم هو صاحب الطلب
    if (request.author_id !== userId) {
      logger.warn(
        `محاولة غير مصرح بها: المستخدم ${userId} يحاول قبول عرض على طلب ${requestId}`,
      );
      return { success: false, error: "غير مصرح لك بقبول هذا العرض" };
    }

    // 4. التحقق من أن الطلب في حالة صحيحة (active أو assigned)
    if (request.status === "completed" || request.status === "archived") {
      return {
        success: false,
        error: "لا يمكن قبول عرض على طلب مكتمل أو مؤرشف",
      };
    }

    // 5. التحقق من وجود العرض
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select("id, request_id, provider_id, status, title")
      .eq("id", offerId)
      .eq("request_id", requestId)
      .single();

    if (offerError || !offer) {
      logger.error("خطأ في جلب العرض:", offerError);
      return { success: false, error: "العرض غير موجود" };
    }

    // 6. التحقق من أن العرض في حالة يمكن قبولها
    if (offer.status === "accepted" || offer.status === "rejected") {
      return {
        success: false,
        error: "هذا العرض تم قبوله أو رفضه مسبقاً",
      };
    }

    // 7. تحديث حالة العرض المقبول إلى "accepted"
    const { error: acceptError } = await supabase
      .from("offers")
      .update({
        status: "accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", offerId)
      .eq("request_id", requestId);

    if (acceptError) {
      logger.error("خطأ في قبول العرض:", acceptError);
      return { success: false, error: "فشل في قبول العرض" };
    }

    // 8. رفض العروض الأخرى على نفس الطلب
    const { error: rejectError } = await supabase
      .from("offers")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("request_id", requestId)
      .neq("id", offerId)
      .in("status", ["pending", "negotiating"]);

    if (rejectError) {
      logger.warn("تحذير: فشل في رفض العروض الأخرى:", rejectError);
      // لا نعيد خطأ هنا لأن العملية الأساسية نجحت
    }

    // 9. تحديث حالة الطلب إلى "assigned"
    const { error: updateRequestError } = await supabase
      .from("requests")
      .update({
        status: "assigned",
        accepted_offer_id: offerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateRequestError) {
      logger.error("خطأ حرج: فشل في تحديث حالة الطلب:", updateRequestError);
      // محاولة إرجاع حالة العرض إلى ما كانت عليه
      await supabase
        .from("offers")
        .update({ status: offer.status })
        .eq("id", offerId);
      return {
        success: false,
        error: "فشل في تحديث حالة الطلب. يرجى المحاولة مرة أخرى",
      };
    }

    // 10. إرسال إشعار للمزود بقبول عرضه
    try {
      if (offer.provider_id) {
        await sendPushNotificationForOfferAccepted({
          requestId,
          requestTitle: request.title || "طلب",
          recipientId: offer.provider_id,
          authorId: userId,
          offerId: offerId,
        });
      }
    } catch (pushErr) {
      logger.warn("فشل في إرسال إشعار قبول العرض:", pushErr);
      // لا نعيد خطأ هنا لأن العملية الأساسية نجحت
    }

    logger.log(
      `✅ تم قبول العرض ${offerId} على الطلب ${requestId} بنجاح`,
    );
    return { success: true };
  } catch (error) {
    logger.error("خطأ غير متوقع في قبول العرض:", error);
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}

/**
 * إكمال طلب معين
 * - يتحقق من صلاحيات المستخدم (صاحب الطلب أو مقدم الخدمة المعتمد)
 * - يحدث حالة الطلب إلى "completed"
 * - يرسل إشعارات للطرفين
 * - يسمح للطرفين بتقييم بعضهما البعض بعد الإكمال
 */
export async function completeRequest(
  requestId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. التحقق من صحة المدخلات
    if (!requestId || !userId) {
      return { success: false, error: "بيانات غير صحيحة" };
    }

    // 2. جلب بيانات الطلب
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select("id, author_id, status, title, accepted_offer_id")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      logger.error("خطأ في جلب الطلب:", requestError);
      return { success: false, error: "الطلب غير موجود" };
    }

    // 3. التحقق من أن الطلب في حالة "assigned"
    if (request.status !== "assigned") {
      return {
        success: false,
        error: request.status === "completed"
          ? "الطلب مكتمل بالفعل"
          : request.status === "archived"
          ? "الطلب مؤرشف"
          : "لا يمكن إكمال الطلب إلا بعد قبول عرض",
      };
    }

    // 4. التحقق من أن المستخدم هو صاحب الطلب أو مقدم الخدمة المعتمد
    const isRequester = request.author_id === userId;
    let isProvider = false;

    if (!isRequester && request.accepted_offer_id) {
      // التحقق من أن المستخدم هو مقدم الخدمة المعتمد
      const { data: offer } = await supabase
        .from("offers")
        .select("provider_id")
        .eq("id", request.accepted_offer_id)
        .eq("request_id", requestId)
        .single();

      isProvider = offer?.provider_id === userId;
    }

    if (!isRequester && !isProvider) {
      logger.warn(
        `محاولة غير مصرح بها: المستخدم ${userId} يحاول إكمال طلب ${requestId}`,
      );
      return { success: false, error: "غير مصرح لك بإكمال هذا الطلب" };
    }

    // 5. تحديث حالة الطلب إلى "completed"
    const { error: updateError } = await supabase
      .from("requests")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      logger.error("خطأ في إكمال الطلب:", updateError);
      return { success: false, error: "فشل في إكمال الطلب" };
    }

    // 6. إرسال إشعارات للطرفين
    try {
      if (request.accepted_offer_id) {
        const { data: offer } = await supabase
          .from("offers")
          .select("provider_id")
          .eq("id", request.accepted_offer_id)
          .single();

        if (offer?.provider_id) {
          await sendPushNotificationForRequestCompleted({
            requestId,
            requestTitle: request.title || "طلب",
            requesterId: request.author_id,
            providerId: offer.provider_id,
          });
        }
      }
    } catch (pushErr) {
      logger.warn("فشل في إرسال إشعارات إكمال الطلب:", pushErr);
      // لا نعيد خطأ هنا لأن العملية الأساسية نجحت
    }

    logger.log(`✅ تم إكمال الطلب ${requestId} بنجاح`);
    return { success: true };
  } catch (error) {
    logger.error("خطأ غير متوقع في إكمال الطلب:", error);
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}

/**
 * بدء التفاوض على عرض معين
 * - يغير حالة العرض إلى "negotiating"
 * - يرسل إشعار للعارض
 * - ينشئ محادثة بين الطرفين
 */
export async function startNegotiation(
  requestId: string,
  offerId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; conversationId?: string }> {
  try {
    // 1. التحقق من أن المستخدم هو صاحب الطلب
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select("author_id, title")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      return { success: false, error: "الطلب غير موجود" };
    }

    if (request.author_id !== userId) {
      return {
        success: false,
        error: "غير مصرح لك ببدء التفاوض على هذا العرض",
      };
    }

    // 2. جلب بيانات العرض
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select("id, provider_id, title, status, is_negotiable")
      .eq("id", offerId)
      .eq("request_id", requestId)
      .single();

    if (offerError || !offer) {
      return { success: false, error: "العرض غير موجود" };
    }

    // التحقق من أن العرض قابل للتفاوض
    if (!offer.is_negotiable) {
      return { success: false, error: "هذا العرض غير قابل للتفاوض" };
    }

    // التحقق من أن العرض في حالة تسمح ببدء التفاوض
    if (offer.status !== "pending") {
      return {
        success: false,
        error: "لا يمكن بدء التفاوض على هذا العرض في حالته الحالية",
      };
    }

    // 3. تحديث حالة العرض إلى "negotiating"
    const { error: updateError } = await supabase
      .from("offers")
      .update({ status: "negotiating" })
      .eq("id", offerId);

    if (updateError) {
      logger.error("خطأ في تحديث حالة العرض:", updateError);
      return { success: false, error: "فشل في بدء التفاوض" };
    }

    // 4. إنشاء أو جلب المحادثة بين الطرفين
    let conversationId: string | undefined;
    try {
      // البحث عن محادثة موجودة
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant1_id.eq.${userId},participant2_id.eq.${offer.provider_id}),and(participant1_id.eq.${offer.provider_id},participant2_id.eq.${userId})`,
        )
        .eq("request_id", requestId)
        .eq("offer_id", offerId)
        .single();

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        // إنشاء محادثة جديدة
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            participant1_id: userId,
            participant2_id: offer.provider_id,
            request_id: requestId,
            offer_id: offerId,
            last_message_preview: "بدأ التفاوض على هذا العرض",
            last_message_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (!convError && newConv) {
          conversationId = newConv.id;
        }
      }
    } catch (convErr) {
      logger.warn("تحذير: فشل في إنشاء المحادثة:", convErr);
    }

    // 5. إرسال إشعار للعارض (in-app + Push)
    try {
      // Get requester name for notification
      const { data: requesterProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .single();

      const requesterName = requesterProfile?.display_name || "صاحب الطلب";

      // هذه الدالة تنشئ إشعار داخل التطبيق + تُرسل Push Notification
      await sendPushNotificationForNegotiationStarted({
        requestId,
        requestTitle: request.title,
        recipientId: offer.provider_id,
        authorId: userId,
        senderName: requesterName,
        offerId: offerId,
      });

      logger.log("✅ تم إرسال إشعار بدء التفاوض بنجاح");
    } catch (notifErr) {
      logger.warn("تحذير: فشل في إرسال إشعار بدء التفاوض:", notifErr);
      // لا نعيد false لأن التفاوض نجح، فقط الإشعار فشل
    }

    logger.log("✅ تم بدء التفاوض بنجاح");
    return { success: true, conversationId };
  } catch (error) {
    logger.error("خطأ في بدء التفاوض:", error);
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}

/**
 * الاشتراك في العروض الجديدة لطلبات المستخدم الحالي (Real-time)
 */
export function subscribeToNewOffersForUserRequests(
  userId: string,
  onNewOffer: (offer: Offer, requestId: string) => void,
): () => void {
  if (!userId) return () => {};

  const channel = supabase
    .channel(`user-offers-realtime-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "offers",
      },
      async (payload: any) => {
        const newOffer = payload.new as Record<string, any>;

        // نتحقق أولاً هل هذا الطلب يخص المستخدم الحالي
        // (يمكن تحسين هذا بالفلترة في Supabase إذا كانت الجداول تسمح)
        const { data: request, error: reqError } = await supabase
          .from("requests")
          .select("author_id")
          .eq("id", newOffer.request_id)
          .single();

        if (reqError || !request || request.author_id !== userId) {
          return;
        }

        // تحويل العرض إلى التنسيق المستخدم في التطبيق
        const transformed: Offer = {
          id: newOffer.id,
          requestId: newOffer.request_id,
          providerId: newOffer.provider_id,
          providerName: newOffer.provider_name,
          title: newOffer.title,
          description: newOffer.description || "",
          price: newOffer.price || "",
          deliveryTime: newOffer.delivery_time || "",
          status: newOffer.status as Offer["status"],
          createdAt: new Date(newOffer.created_at),
          isNegotiable: newOffer.is_negotiable ?? true,
          location: newOffer.location || "",
          images: newOffer.images || [],
        };

        onNewOffer(transformed, newOffer.request_id);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
