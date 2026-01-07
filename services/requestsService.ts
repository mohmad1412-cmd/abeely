import { supabase } from "./supabaseClient";
import { AIDraft, classifyAndDraft } from "./aiService";
import { Offer, Request } from "../types";
import { getCategoryIdsByLabels } from "./categoriesService";
import { logger } from "../utils/logger";
import { storageService as _storageService } from "./storageService";

/**
 * إرسال Push Notifications للمستخدمين المهتمين بطلب جديد
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
 */
async function sendPushNotificationForOfferAccepted(params: {
  requestId: string;
  requestTitle: string;
  recipientId: string; // مقدم العرض
  authorId: string; // صاحب الطلب
  offerId: string;
}): Promise<void> {
  try {
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
 * إرسال Push Notification للمزود عند بدء التفاوض
 */
async function sendPushNotificationForNegotiationStarted(params: {
  requestId: string;
  requestTitle: string;
  recipientId: string; // مقدم العرض
  senderName: string; // صاحب الطلب
  offerId: string;
}): Promise<void> {
  try {
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

export type RequestInsert = {
  id?: string;
  author_id?: string;
  title: string;
  description: string;
  status: "active" | "assigned" | "completed" | "archived";
  is_public: boolean;
  budget_min?: string;
  budget_max?: string;
  budget_type?: "not-specified" | "negotiable" | "fixed";
  location?: string;
  delivery_type?: "immediate" | "range" | "not-specified";
  delivery_from?: string;
  delivery_to?: string;
  seriousness?: number;
};

export type OfferInsert = {
  id?: string;
  request_id: string;
  provider_id: string;
  provider_name: string;
  title: string;
  description: string;
  price?: string;
  delivery_time?: string;
  status:
    | "pending"
    | "accepted"
    | "rejected"
    | "negotiating"
    | "cancelled"
    | "completed";
  is_negotiable: boolean;
  location?: string;
  images?: string[];
};

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
    delivery_type: "range",
    delivery_from: draftData.deliveryTime,
    seriousness: 3, // Default (medium)
  };

  payload.author_id = userId;

  if (overrides) {
    Object.assign(payload, overrides);
  }

  try {
    const attemptInsert = async (
      p: RequestInsert,
      _runId: string,
      _hypothesisId: string,
    ) => {
      const { data, error } = await supabase.from("requests").insert(p)
        .select("id").single();

      if (error || !data?.id) {
        logger.error("Supabase Insert Error", error, "createRequestFromChat");
        throw error || new Error("Insert failed: no id returned");
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
  logger.log("=== createOffer called ===");
  logger.log("Input:", {
    requestId: input.requestId,
    providerId: input.providerId,
    title: input.title,
    price: input.price,
    hasImages: input.images?.length || 0,
  });

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
      .single();

    if (existingArchivedOffer && !checkError) {
      logger.log(
        "Found archived offer, permanently deleting:",
        existingArchivedOffer.id,
      );
      // حذف العرض المؤرشف نهائياً ليسمح بإنشاء عرض جديد
      await supabase
        .from("offers")
        .delete()
        .eq("id", existingArchivedOffer.id);
      logger.log("✅ Archived offer deleted successfully");
    }
  } catch (archiveCheckError) {
    // تجاهل الأخطاء هنا - فقط لتنظيف العروض المؤرشفة القديمة
    logger.log("No archived offer found or error checking:", archiveCheckError);
  }

  const payload = {
    request_id: input.requestId.trim(),
    provider_id: input.providerId.trim(),
    provider_name: "مزود خدمة",
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
    logger.log("Payload to insert:", payload);

    const { data, error } = await supabase
      .from("offers")
      .insert(payload)
      .select("id")
      .single();

    // إذا كان هناك data حتى مع وجود error، يعتبر العرض تم إنشاؤه بنجاح
    // (بعض الأخطاء في triggers قد تحدث بعد إنشاء العرض)
    if (data && data.id) {
      logger.log(
        "✅ Offer created successfully (with potential trigger warning):",
        data,
      );
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

    logger.log("✅ Offer created successfully:", data);

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
          providerName: input.providerId.trim() === "مزود خدمة"
            ? "خبير"
            : (input as { providerName?: string; providerId: string })
              .providerName || "مزود خدمة",
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

  return (data || []).map(transformRequest);
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
    .select("*")
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
  }));
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
  if (requestIds.length === 0) return new Map();

  // Fetch all offers for these requests (excluding archived ones)
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

  // Group offers by request ID
  const offersMap = new Map<string, Offer[]>();
  (offers || []).forEach((offer: Record<string, any>) => {
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
      console.error("❌ Error fetching offer:", fetchError);
      logger.error("Error fetching offer:", fetchError);
      return false;
    }

    // Check if already archived
    if (offer.status === "archived") {
      console.log("⚠️ Offer is already archived:", offerId);
      return true; // Consider it a success
    }

    // Soft delete: Update status to 'archived' instead of deleting
    console.log("🔄 Attempting to archive offer:", {
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

    console.log("📊 Update result:", { updateResult, error });

    if (error) {
      console.error("❌ Error archiving offer:", error);
      console.error("❌ Error details:", JSON.stringify(error, null, 2));
      console.error("❌ Update query params:", { offerId, userId });
      logger.error("Error archiving offer:", error);
      return false;
    }

    // Check if any rows were actually updated
    if (!updateResult || updateResult.length === 0) {
      console.error(
        "❌ No rows updated - offer may not exist or user doesn't own it",
      );
      return false;
    }

    console.log("✅ Offer archived successfully (soft delete):", {
      offerId,
      userId,
    });
    logger.log("Offer archived successfully", { offerId });
    return true;
  } catch (err: unknown) {
    console.error("❌ Exception in archiveOffer:", err);
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
    deliveryTimeType: req.delivery_type || "not-specified",
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
    deliveryTimeType: req.delivery_type || "not-specified",
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
  // Filter out "كل المدن" from cities check - it doesn't count as an interest
  const actualCities = interestedCities.filter((city) => city !== "كل المدن");

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

    // Check categories match
    if (interestedCategories.length > 0) {
      const requestCategories = request.categories || [];
      const hasMatchingCategory = requestCategories.some((cat: string) =>
        interestedCategories.some((interest) =>
          cat.toLowerCase().includes(interest.toLowerCase()) ||
          interest.toLowerCase().includes(cat.toLowerCase())
        )
      );
      if (!hasMatchingCategory) return false;
    }

    // Check city match
    // إذا تم اختيار "كل المدن" أو لم يتم اختيار أي مدينة، نتخطى الفلترة
    if (actualCities.length > 0 && request.location) {
      const requestCity = request.location.split("،").pop()?.trim() ||
        request.location;
      const hasMatchingCity = actualCities.some((city: string) =>
        requestCity.includes(city) || city.includes(requestCity)
      );
      if (!hasMatchingCity) return false;
    }

    // Check radar words match (title/description)
    if (radarWords.length > 0) {
      const searchText = `${request.title} ${request.description || ""}`
        .toLowerCase();
      const hasRadarMatch = radarWords.some((word: string) =>
        searchText.includes(word.toLowerCase())
      );
      if (!hasRadarMatch) return false;
    }

    return true;
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
export async function acceptOffer(
  requestId: string,
  offerId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. التحقق من أن المستخدم هو صاحب الطلب
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select("author_id")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      return { success: false, error: "الطلب غير موجود" };
    }

    if (request.author_id !== userId) {
      return { success: false, error: "غير مصرح لك بقبول هذا العرض" };
    }

    // 2. تحديث حالة العرض المقبول إلى "accepted"
    const { error: acceptError } = await supabase
      .from("offers")
      .update({ status: "accepted" })
      .eq("id", offerId)
      .eq("request_id", requestId);

    if (acceptError) {
      logger.error("خطأ في قبول العرض:", acceptError);
      return { success: false, error: "فشل في قبول العرض" };
    }

    // 3. رفض العروض الأخرى على نفس الطلب
    const { error: rejectError } = await supabase
      .from("offers")
      .update({ status: "rejected" })
      .eq("request_id", requestId)
      .neq("id", offerId)
      .in("status", ["pending", "negotiating"]);

    if (rejectError) {
      logger.warn("تحذير: فشل في رفض العروض الأخرى:", rejectError);
    }

    // 4. تحديث حالة الطلب إلى "assigned"
    const { error: updateRequestError } = await supabase
      .from("requests")
      .update({
        status: "assigned",
        accepted_offer_id: offerId,
      })
      .eq("id", requestId);

    if (updateRequestError) {
      logger.warn("تحذير: فشل في تحديث حالة الطلب:", updateRequestError);
    }

    // 5. إرسال إشعار للمزود بقبول عرضه
    try {
      // جلب معرف مقدم العرض وعنوان الطلب
      const { data: offerData } = await supabase
        .from("offers")
        .select("provider_id, title")
        .eq("id", offerId)
        .single();

      const { data: reqData } = await supabase
        .from("requests")
        .select("title")
        .eq("id", requestId)
        .single();

      if (offerData?.provider_id && reqData?.title) {
        sendPushNotificationForOfferAccepted({
          requestId,
          requestTitle: reqData.title,
          recipientId: offerData.provider_id,
          authorId: userId,
          offerId: offerId,
        });
      }
    } catch (pushErr) {
      logger.warn("فشل في إرسال إشعار قبول العرض:", pushErr);
    }

    return { success: true };
  } catch (error) {
    logger.error("خطأ في قبول العرض:", error);
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

    // 5. إرسال إشعار للعارض
    try {
      // Get requester name for notification
      const { data: requesterProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .single();

      const requesterName = requesterProfile?.display_name || "صاحب الطلب";

      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: offer.provider_id,
          type: "status",
          title: "🤝 بدأ التفاوض على عرضك!",
          message:
            `${requesterName} يريد التفاوض معك على عرضك في طلب "${request.title}"`,
          link_to: `/request/${requestId}`,
          related_request_id: requestId,
          related_offer_id: offerId,
        });

      if (notifError) {
        logger.error("خطأ في إرسال الإشعار عند بدء التفاوض:", notifError);
        // لا نعيد false لأن التفاوض نجح، فقط الإشعار فشل
      } else {
        logger.log("✅ تم إرسال إشعار بدء التفاوض بنجاح");

        // إرسال إشعار Push للمزود ببدء التفاوض
        try {
          sendPushNotificationForNegotiationStarted({
            requestId,
            requestTitle: request.title,
            recipientId: offer.provider_id,
            senderName: requesterName,
            offerId: offerId,
          });
        } catch (pushErr) {
          logger.warn("فشل في إرسال إشعار Push لبدء التفاوض:", pushErr);
        }
      }
    } catch (notifErr) {
      logger.error("خطأ غير متوقع في إرسال الإشعار:", notifErr);
      // لا نعيد false لأن التفاوض نجح، فقط الإشعار فشل
    }

    logger.log("✅ تم بدء التفاوض بنجاح");
    return { success: true, conversationId };
  } catch (error) {
    logger.error("خطأ في بدء التفاوض:", error);
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}
