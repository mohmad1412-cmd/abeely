import { supabase } from "./supabaseClient";
import { AIDraft, classifyAndDraft } from "./aiService";
import { Request, Offer } from "../types";
import { getCategoryIdsByLabels, OTHER_CATEGORY } from "./categoriesService";

type RequestInsert = {
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

/**
 * ربط التصنيفات بالطلب - نستخدم الآن getCategoryIdsByLabels للتحويل الآمن
 */
const linkCategoriesByLabels = async (requestId: string, labels: string[] = []) => {
  try {
    // تحويل الأسماء إلى IDs (يضيف "غير محدد" تلقائياً إذا لم يجد تصنيفات)
    const categoryIds = await getCategoryIdsByLabels(labels);
    
    if (categoryIds.length === 0) {
      // إذا لم يكن هناك تصنيفات، نضيف "أخرى"
      categoryIds.push('other');
    }
    
    // ربط التصنيفات بالطلب
    const links = categoryIds.map((id) => ({
      request_id: requestId,
      category_id: id,
    }));
    
    const { error } = await supabase
      .from("request_categories")
      .upsert(links, { onConflict: "request_id,category_id" });
    
    if (error) {
      console.warn("Error linking categories:", error);
    }
    
    return categoryIds;
  } catch (err) {
    console.error("Error in linkCategoriesByLabels:", err);
    // في حالة الخطأ، نحاول إضافة "أخرى" على الأقل
    try {
      await supabase
        .from("request_categories")
        .upsert([{ request_id: requestId, category_id: 'other' }], { onConflict: "request_id,category_id" });
    } catch (_) {}
    return ['other'];
  }
};

// دالة قديمة للتوافق (لا نستخدمها لإنشاء تصنيفات جديدة)
const upsertCategories = async (labels: string[] = []) => {
  if (!labels.length) return [];
  // لم نعد نُنشئ تصنيفات جديدة تلقائياً - نستخدم فقط التصنيفات الموجودة
  const { data, error } = await supabase
    .from("categories")
    .select("id,label")
    .in("label", labels);
  if (error) {
    console.warn("Error fetching categories:", error);
    return [];
  }
  return data || [];
};

const linkCategories = async (requestId: string, categoryIds: string[]) => {
  if (!categoryIds.length) {
    // إذا لم يكن هناك تصنيفات، نضيف "أخرى"
    categoryIds = ['other'];
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
    budget_type: (draftData.budgetType as any) ||
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
      runId: string,
      hypothesisId: string,
    ) => {
      const { data, error } = await supabase.from("requests").insert(p)
        .select("id").single();

      if (error || !data?.id) {
        console.error("Supabase Insert Error:", error);
        throw error || new Error("Insert failed: no id returned");
      }

      return data;
    };

    // Primary attempt (active, public) - may fail if DB missing columns in triggers
    let data = await attemptInsert(payload, "run2", "G");

    // ربط التصنيفات بالطلب (يضمن وجود "غير محدد" إذا لم يكن هناك تصنيفات)
    try {
      const categories = draftData.categories || [];
      await linkCategoriesByLabels(data.id, categories);
    } catch (catErr) {
      console.warn(
        "Failed to link categories, but request was created:",
        catErr,
      );
      // نحاول إضافة "أخرى" على الأقل
      try {
        await linkCategories(data.id, ['other']);
      } catch (_) {}
    }

    return data;
  } catch (err) {
    const e: any = err;
    const msg = e?.message || "";
    const code = e?.code || "";

    // Fallback: if trigger fails (e.g., interested_categories missing), create as non-public first then update
    const isTriggerError = code === "42703" || msg.includes("interested_categories") || msg.includes("categories");
    if (!isTriggerError) {
      throw err;
    }

    console.log("⚠️ Trigger error detected, using fallback method (create non-public, then update)");

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
        console.error("Fallback insert failed:", insertError);
        throw insertError || new Error("Fallback insert failed");
      }

      console.log("✅ Request created (non-public):", insertedData.id);

      // الخطوة 2: تحديث الطلب ليصبح عاماً
      const { error: updateError } = await supabase
        .from("requests")
        .update({ is_public: true })
        .eq("id", insertedData.id);

      if (updateError) {
        console.warn("Failed to make request public:", updateError);
        // لا نرمي خطأ، الطلب تم إنشاؤه على أي حال
      } else {
        console.log("✅ Request made public");
      }

      // الخطوة 3: ربط التصنيفات
      try {
        const categories = draftData.categories || [];
        await linkCategoriesByLabels(insertedData.id, categories);
        console.log("✅ Categories linked");
      } catch (catErr) {
        console.warn("Failed to link categories in fallback:", catErr);
        // نحاول إضافة "أخرى" على الأقل
        try {
          await linkCategories(insertedData.id, ['other']);
        } catch (_) {}
      }

      return insertedData;
    } catch (fallbackErr) {
      console.error("Fallback method failed:", fallbackErr);
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

export async function createOffer(input: CreateOfferInput): Promise<{ id: string } | null> {
  console.log("=== createOffer called ===");
  console.log("Input:", {
    requestId: input.requestId,
    providerId: input.providerId,
    title: input.title,
    price: input.price,
    hasImages: input.images?.length || 0
  });
  
  const payload = {
    request_id: input.requestId,
    provider_id: input.providerId,
    provider_name: "مزود خدمة",
    title: input.title,
    description: input.description || "",
    price: input.price,
    delivery_time: input.deliveryTime,
    status: "pending" as const,
    is_negotiable: input.isNegotiable ?? true,
    location: input.location,
    images: input.images || [],
  };
  
  try {
    console.log("Payload to insert:", payload);
    
    const { data, error } = await supabase
      .from("offers")
      .insert(payload)
      .select("id")
      .single();

    // إذا كان هناك data حتى مع وجود error، يعتبر العرض تم إنشاؤه بنجاح
    // (بعض الأخطاء في triggers قد تحدث بعد إنشاء العرض)
    if (data && data.id) {
      console.log("✅ Offer created successfully (with potential trigger warning):", data);
      return data;
    }
    
    if (error) {
      console.error("❌ Create offer error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // التحقق من وجود العرض رغم الخطأ (في حالة trigger errors)
      const isTriggerError = error.code === "42703" || 
        error.message?.includes("notifications") || 
        error.message?.includes("related_request_id") ||
        error.code === "PGRST116"; // No rows returned (قد يحدث إذا فشل select بعد insert)
      
      if (isTriggerError) {
        console.log("⚠️ Trigger error detected, checking if offer was created...");
        
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
        
        if (existingOffers && existingOffers.length > 0 && existingOffers[0]?.id) {
          console.log("✅ Offer was created despite trigger error:", existingOffers[0]);
          return existingOffers[0];
        }
        
        // إذا لم نجد العرض، نحاول fallback method
        console.log("⚠️ Offer not found, trying RPC fallback...");
        return await createOfferWithoutTrigger(payload);
      }
      
      return null;
    }
    
    console.log("✅ Offer created successfully:", data);
    return data;
  } catch (err: any) {
    console.error("❌ Create offer failed:", {
      message: err?.message,
      stack: err?.stack
    });
    
    // محاولة الـ fallback
    if (err?.message?.includes("notifications") || err?.code === "42703") {
      console.log("⚠️ Trying fallback method...");
      return await createOfferWithoutTrigger(payload);
    }
    
    return null;
  }
}

/**
 * Fallback: إنشاء عرض باستخدام RPC لتجاوز triggers
 */
async function createOfferWithoutTrigger(payload: any): Promise<{ id: string } | null> {
  try {
    // نحاول استخدام RPC إذا كان موجوداً
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_offer_simple', {
      p_request_id: payload.request_id,
      p_provider_id: payload.provider_id,
      p_provider_name: payload.provider_name,
      p_title: payload.title,
      p_description: payload.description,
      p_price: payload.price,
      p_delivery_time: payload.delivery_time,
      p_is_negotiable: payload.is_negotiable,
      p_location: payload.location,
      p_images: payload.images
    });

    if (!rpcError && rpcData) {
      console.log("✅ Offer created via RPC:", rpcData);
      return { id: rpcData };
    }

    // إذا الـ RPC غير موجود، نحاول تعطيل الـ trigger مؤقتاً (لن يعمل في معظم الحالات بسبب الصلاحيات)
    // كحل أخير، نعيد الخطأ للمستخدم
    console.error("❌ RPC fallback failed:", rpcError);
    
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
      console.log("✅ Offer created with minimal payload:", minData);
      return minData;
    }

    console.error("❌ All fallback methods failed");
    return null;
  } catch (err) {
    console.error("❌ Fallback method failed:", err);
    return null;
  }
}

/**
 * Fetch requests with pagination
 */
export async function fetchRequestsPaginated(page: number = 0, pageSize: number = 10): Promise<{ data: Request[], count: number | null }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let data: any;
  let error: any;
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
      .order("created_at", { ascending: false })
      .range(from, to);
    data = res.data;
    error = res.error;
    count = null; // Don't use heavy count query for faster load
  } catch (thrown: any) {
    throw thrown;
  }

  if (error) {
    console.error("❌ Error fetching requests:", error);
    console.error("Error details:", JSON.stringify({
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    }, null, 2));
    throw error;
  }
  
  console.log(`✅ Fetched ${data?.length || 0} requests (page ${page + 1})`);

  const transformed = Array.isArray(data) ? data.map(transformRequest) : [];
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
export async function checkSupabaseConnection(): Promise<{connected: boolean; error?: string}> {
  try {
    // Add 15 second timeout to prevent hanging (increased for slow connections)
    const timeoutPromise = new Promise<{connected: false; error: string}>((_, reject) => {
      setTimeout(() => reject(new Error("Connection timeout (15s)")), 15000);
    });
    
    const queryPromise = (async () => {
      const { data, error } = await supabase.from("requests").select("id").limit(1);
      
      if (error) {
        console.error("❌ Supabase query error:", JSON.stringify({
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        }, null, 2));
        return { connected: false, error: error.message };
      }
      console.log("✅ Supabase connection check passed");
      return { connected: true };
    })();
    
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (err: any) {
    console.warn("⚠️ Supabase connection failed:", err.message);
    return { connected: false, error: err.message };
  }
}

/**
 * Fetch a single request by ID
 */
export async function fetchRequestById(requestId: string): Promise<Request | null> {
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
    console.error("Error fetching request by ID:", error);
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
    console.error("Error fetching my requests:", error);
    throw error;
  }

  return (data || []).map(transformRequest);
}

/**
 * Fetch offers for a user
 */
export async function fetchMyOffers(providerId: string): Promise<Offer[]> {
  if (!providerId) {
    console.warn("fetchMyOffers: No providerId provided, returning empty array");
    return [];
  }

  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching offers:", error);
    // بدلاً من رمي الخطأ، نعيد مصفوفة فارغة لتجنب كسر التطبيق
    // هذا يمنع إعادة التوجيه إلى Onboarding بسبب خطأ في جلب العروض
    console.warn("Returning empty array due to error to prevent app crash");
    return [];
  }

  return (data || []).map((offer: any) => ({
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
    images: [],
  }));
}

/**
 * Fetch offers for a specific request
 */
export async function fetchOffersForRequest(requestId: string): Promise<Offer[]> {
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching offers for request:", error);
    throw error;
  }

  return (data || []).map((offer: any) => ({
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
    images: [],
  }));
}

/**
 * Fetch offers for all user's requests (received offers)
 * Returns a map of requestId -> offers array
 */
export async function fetchOffersForUserRequests(userId: string): Promise<Map<string, Offer[]>> {
  if (!userId) {
    console.warn("fetchOffersForUserRequests: No userId provided, returning empty map");
    return new Map();
  }

  // First, get all request IDs for this user
  const { data: requests, error: requestsError } = await supabase
    .from("requests")
    .select("id")
    .eq("author_id", userId);

  if (requestsError) {
    console.error("Error fetching user requests:", requestsError);
    // بدلاً من رمي الخطأ، نعيد Map فارغ لتجنب كسر التطبيق
    return new Map();
  }

  const requestIds = (requests || []).map(r => r.id);
  if (requestIds.length === 0) return new Map();

  // Fetch all offers for these requests
  const { data: offers, error: offersError } = await supabase
    .from("offers")
    .select("*")
    .in("request_id", requestIds)
    .order("created_at", { ascending: false });

  if (offersError) {
    console.error("Error fetching offers for user requests:", offersError);
    return new Map();
  }

  // Group offers by request ID
  const offersMap = new Map<string, Offer[]>();
  (offers || []).forEach((offer: any) => {
    const transformed: Offer = {
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
      images: [],
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
export async function migrateUserDraftRequests(userId: string): Promise<number> {
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
      console.error("Error migrating draft requests:", updateError);
      return 0;
    }

    console.log(`Migrated ${draftRequests.length} draft requests to active`);
    return draftRequests.length;
  } catch (error) {
    console.error("Error in migrateUserDraftRequests:", error);
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
  console.log("=== updateOffer called ===");
  console.log("Input:", {
    offerId: input.offerId,
    providerId: input.providerId,
    title: input.title,
    price: input.price,
    hasImages: input.images?.length || 0
  });
  
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };
  
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description || "";
  if (input.price !== undefined) updateData.price = input.price;
  if (input.deliveryTime !== undefined) updateData.delivery_time = input.deliveryTime;
  if (input.location !== undefined) updateData.location = input.location;
  if (input.isNegotiable !== undefined) updateData.is_negotiable = input.isNegotiable;
  if (input.images !== undefined) updateData.images = input.images || [];
  
  try {
    console.log("Update payload:", updateData);
    
    const { error } = await supabase
      .from("offers")
      .update(updateData)
      .eq("id", input.offerId)
      .eq("provider_id", input.providerId); // Security: only the owner can update

    if (error) {
      console.error("❌ Update offer error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log("✅ Offer updated successfully");
    return true;
  } catch (err: any) {
    console.error("❌ Error updating offer:", err);
    throw err;
  }
}

/**
 * Archive a request
 */
export async function archiveRequest(requestId: string, userId: string): Promise<boolean> {
  try {
    // Use the database function for security
    const { data, error } = await supabase.rpc('archive_request', {
      request_id_param: requestId,
      user_id_param: userId
    });

    if (error) {
      // Fallback to direct update if function doesn't exist
      const { error: updateError } = await supabase
        .from('requests')
        .update({ status: 'archived', is_public: false })
        .eq('id', requestId)
        .eq('author_id', userId);

      if (updateError) {
        console.error("Error archiving request:", updateError);
        return false;
      }
      return true;
    }

    return data === true;
  } catch (err: any) {
    console.error("Error archiving request:", err);
    return false;
  }
}

/**
 * Unarchive a request
 */
export async function unarchiveRequest(requestId: string, userId: string): Promise<boolean> {
  try {
    // Use the database function for security
    const { data, error } = await supabase.rpc('unarchive_request', {
      request_id_param: requestId,
      user_id_param: userId
    });

    if (error) {
      // Fallback to direct update if function doesn't exist
      const { error: updateError } = await supabase
        .from('requests')
        .update({ status: 'active' })
        .eq('id', requestId)
        .eq('author_id', userId)
        .eq('status', 'archived');

      if (updateError) {
        console.error("Error unarchiving request:", updateError);
        return false;
      }
      return true;
    }

    return data === true;
  } catch (err: any) {
    console.error("Error unarchiving request:", err);
    return false;
  }
}

/**
 * Archive an offer
 */
export async function archiveOffer(offerId: string, userId: string): Promise<boolean> {
  try {
    // Use the database function for security
    const { data, error } = await supabase.rpc('archive_offer', {
      offer_id_param: offerId,
      user_id_param: userId
    });

    if (error) {
      // Fallback to direct update if function doesn't exist
      const { error: updateError } = await supabase
        .from('offers')
        .update({ status: 'archived' })
        .eq('id', offerId)
        .eq('provider_id', userId);

      if (updateError) {
        console.error("Error archiving offer:", updateError);
        return false;
      }
      return true;
    }

    return data === true;
  } catch (err: any) {
    console.error("Error archiving offer:", err);
    return false;
  }
}

/**
 * Unarchive an offer
 */
export async function unarchiveOffer(offerId: string, userId: string): Promise<boolean> {
  try {
    // Use the database function for security
    const { data, error } = await supabase.rpc('unarchive_offer', {
      offer_id_param: offerId,
      user_id_param: userId
    });

    if (error) {
      // Fallback to direct update if function doesn't exist
      const { error: updateError } = await supabase
        .from('offers')
        .update({ status: 'pending' })
        .eq('id', offerId)
        .eq('provider_id', userId)
        .eq('status', 'archived');

      if (updateError) {
        console.error("Error unarchiving offer:", updateError);
        return false;
      }
      return true;
    }

    return data === true;
  } catch (err: any) {
    console.error("Error unarchiving offer:", err);
    return false;
  }
}

/**
 * Fetch archived requests for a user
 */
export async function fetchArchivedRequests(userId: string): Promise<Request[]> {
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
    console.error("Error fetching archived requests:", error);
    throw error;
  }

  return (data || []).map((req: any) => ({
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
    categories: req.request_categories?.map((rc: any) => rc.categories?.label).filter(Boolean) || [],
    deliveryTimeType: req.delivery_type || "not-specified",
    deliveryTimeFrom: req.delivery_from || "",
    deliveryTimeTo: req.delivery_to || "",
    messages: [],
    offers: [],
    images: [],
    contactMethod: "both",
    seriousness: req.seriousness || 3,
  }));
}

/**
 * Fetch archived offers for a user
 */
export async function fetchArchivedOffers(providerId: string): Promise<Offer[]> {
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("provider_id", providerId)
    .eq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching archived offers:", error);
    throw error;
  }

  return (data || []).map((offer: any) => ({
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
    images: [],
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
function transformRequest(req: any, offersCount?: number): Request {
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
    status: req.status,
    isPublic: req.is_public,
    budgetType: req.budget_type || "negotiable",
    budgetMin: req.budget_min || "",
    budgetMax: req.budget_max || "",
    location: req.location || "",
    categories: req.request_categories?.map((rc: any) => rc.categories?.label).filter(Boolean) || [],
    deliveryTimeType: req.delivery_type || "not-specified",
    deliveryTimeFrom: req.delivery_from || "",
    deliveryTimeTo: req.delivery_to || "",
    messages: [],
    offers: [],
    images: req.images || [],
    contactMethod: "both",
    seriousness,
    locationCoords: req.location_lat && req.location_lng ? {
      lat: req.location_lat,
      lng: req.location_lng,
    } : undefined,
  };
}

/**
 * Check if a request matches user interests
 */
async function matchesUserInterests(
  requestId: string,
  interestedCategories: string[],
  interestedCities: string[],
  radarWords: string[] = []
): Promise<boolean> {
  // Filter out "كل المدن" from cities check - it doesn't count as an interest
  const actualCities = interestedCities.filter(city => city !== 'كل المدن');

  // If no interests specified (no categories and no actual cities), don't match
  // "كل المدن" alone doesn't count as having interests
  if (interestedCategories.length === 0 && actualCities.length === 0 && radarWords.length === 0) {
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
      const hasMatchingCategory = requestCategories.some(cat =>
        interestedCategories.some(interest =>
          cat.toLowerCase().includes(interest.toLowerCase()) ||
          interest.toLowerCase().includes(cat.toLowerCase())
        )
      );
      if (!hasMatchingCategory) return false;
    }

    // Check city match
    // إذا تم اختيار "كل المدن" أو لم يتم اختيار أي مدينة، نتخطى الفلترة
    if (actualCities.length > 0 && request.location) {
      const requestCity = request.location.split('،').pop()?.trim() || request.location;
      const hasMatchingCity = actualCities.some(city =>
        requestCity.includes(city) || city.includes(requestCity)
      );
      if (!hasMatchingCity) return false;
    }

    // Check radar words match (title/description)
    if (radarWords.length > 0) {
      const searchText = `${request.title} ${request.description || ''}`.toLowerCase();
      const hasRadarMatch = radarWords.some(word => searchText.includes(word.toLowerCase()));
      if (!hasRadarMatch) return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking user interests:", error);
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
  callback: (newRequest: Request) => void
): () => void {
  const channel = supabase
    .channel('new-requests')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'requests',
        filter: 'is_public=eq.true',
      },
      async (payload) => {
        const newRequest = payload.new as any;
        
        // Only process active requests
        if (newRequest.status !== 'active') return;

        // Check if matches user interests
        const matches = await matchesUserInterests(
          newRequest.id,
          interestedCategories,
          interestedCities,
          radarWords
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
      }
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
  callback: (newRequest: Request) => void
): () => void {
  const channel = supabase
    .channel('all-new-requests')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'requests',
        filter: 'is_public=eq.true',
      },
      async (payload) => {
        const newRequest = payload.new as any;
        
        // Only process active requests
        if (newRequest.status !== 'active') return;

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
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * إخفاء الطلب من السوق (is_public = false)
 */
export async function hideRequest(requestId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('requests')
      .update({ is_public: false })
      .eq('id', requestId)
      .eq('author_id', userId);

    if (error) {
      console.error("Error hiding request:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error hiding request:", err);
    return false;
  }
}

/**
 * إظهار الطلب مجدداً (is_public = true)
 */
export async function unhideRequest(requestId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('requests')
      .update({ is_public: true })
      .eq('id', requestId)
      .eq('author_id', userId);

    if (error) {
      console.error("Error unhiding request:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error unhiding request:", err);
    return false;
  }
}

/**
 * تحديث توقيت الطلب لرفعه (يحدّث updated_at)
 */
export async function bumpRequest(requestId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('requests')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('author_id', userId);

    if (error) {
      console.error("Error bumping request:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error bumping request:", err);
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
  seriousness?: number
): Promise<{ id: string; wasArchived?: boolean } | null> {
  console.log("=== updateRequest called ===");
  console.log("requestId:", requestId);
  console.log("userId:", userId);
  console.log("draftData:", draftData);
  
  try {
    // 1. التحقق من أن المستخدم هو صاحب الطلب وجلب معلومات الطلب الكاملة
    const { data: existingRequest, error: checkError } = await supabase
      .from('requests')
      .select('author_id, status, created_at, accepted_offer_id')
      .eq('id', requestId)
      .single();

    console.log("Existing request check:", { existingRequest, checkError });

    if (checkError || !existingRequest) {
      console.error('الطلب غير موجود:', checkError);
      return null;
    }

    if (existingRequest.author_id !== userId) {
      console.error('غير مصرح لك بتعديل هذا الطلب:', {
        requestAuthorId: existingRequest.author_id,
        currentUserId: userId
      });
      return null;
    }

    // 2. التحقق من عدم إمكانية التعديل إذا كان الطلب مكتمل أو تم قبول عرض
    if (existingRequest.status === 'completed') {
      console.error('لا يمكن تعديل الطلب: الطلب مكتمل');
      return null; // منع التعديل تماماً
    }

    if (existingRequest.accepted_offer_id) {
      console.error('لا يمكن تعديل الطلب: تم قبول عرض على الطلب');
      return null; // منع التعديل تماماً
    }

    // 3. التحقق من شرط الـ 7 أيام للتعديل
    // لا يمكن تعديل الطلب إذا تجاوز 7 أيام من تاريخ الإنشاء
    const createdAt = new Date(existingRequest.created_at);
    const now = new Date();
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const MAX_UPDATE_DAYS = 7; // 7 أيام كحد أقصى للتعديل

    if (daysSinceCreation > MAX_UPDATE_DAYS) {
      console.error(`لا يمكن تعديل الطلب: تجاوز ${MAX_UPDATE_DAYS} أيام من الإنشاء (${daysSinceCreation.toFixed(1)} يوم)`);
      return null; // منع التعديل تماماً
    }

    console.log(`وقت التعديل مسموح (${daysSinceCreation.toFixed(1)} يوم من الإنشاء)`);

    // 4. التحقق من حالة الأرشفة - إذا كان مؤرشف، سنقوم بإلغاء الأرشفة
    const wasArchived = existingRequest.status === 'archived';
    if (wasArchived) {
      console.log('الطلب مؤرشف، سيتم إلغاء الأرشفة تلقائياً');
    }

    // 5. التحقق من شروط تحديث updated_at (bump)
    // يتم تحديث updated_at إذا:
    // - الطلب في حالة active (أو كان archived وسيتم إلغاء الأرشفة)
    // - لم يتم قبول أي عرض بعد
    const canBump = (existingRequest.status === 'active' || wasArchived) && !existingRequest.accepted_offer_id;

    // 6. تحديث بيانات الطلب
    const updatePayload: any = {
      title: (draftData.title || draftData.summary || "طلب جديد").slice(0, 120),
      description: draftData.description || draftData.summary || "",
      budget_min: draftData.budgetMin,
      budget_max: draftData.budgetMax,
      budget_type: (draftData.budgetType as any) ||
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
      updatePayload.status = 'active';
      updatePayload.is_public = true; // إظهار الطلب في السوق
      console.log('سيتم إلغاء الأرشفة وتفعيل الطلب');
    }

    // 8. إذا كانت شروط bump متوفرة، أضف updated_at للتحديث (bump)
    if (canBump) {
      updatePayload.updated_at = new Date().toISOString();
      console.log('سيتم تحديث updated_at لرفع الطلب في القائمة');
    } else {
      console.log('لن يتم تحديث updated_at:', {
        status: existingRequest.status,
        hasAcceptedOffer: !!existingRequest.accepted_offer_id
      });
    }

    console.log("Update payload:", updatePayload);

    const { error: updateError } = await supabase
      .from('requests')
      .update(updatePayload)
      .eq('id', requestId);

    console.log("Update result:", { updateError });

    if (updateError) {
      console.error('خطأ في تحديث الطلب:', updateError);
      return null;
    }
    
    console.log("Request updated successfully!");

    // 5. تحديث التصنيفات - دائماً نحدث التصنيفات عند التعديل
    try {
      // حذف التصنيفات القديمة
      await supabase
        .from('request_categories')
        .delete()
        .eq('request_id', requestId);
      
      // إضافة التصنيفات الجديدة (أو "غير محدد" إذا لم يكن هناك تصنيفات)
      const categories = draftData.categories && draftData.categories.length > 0 
        ? draftData.categories 
        : []; // سيتم إضافة "أخرى" تلقائياً في linkCategoriesByLabels
      await linkCategoriesByLabels(requestId, categories);
      console.log("Categories updated:", categories.length > 0 ? categories : ['أخرى (افتراضي)']);
    } catch (catErr) {
      console.warn('Failed to update categories:', catErr);
      // نحاول إضافة "أخرى" على الأقل
      try {
        await linkCategories(requestId, ['other']);
      } catch (_) {}
    }

    return { id: requestId, wasArchived };
  } catch (error) {
    console.error('خطأ في تحديث الطلب:', error);
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
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. التحقق من أن المستخدم هو صاحب الطلب
    const { data: request, error: requestError } = await supabase
      .from('requests')
      .select('author_id')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return { success: false, error: 'الطلب غير موجود' };
    }

    if (request.author_id !== userId) {
      return { success: false, error: 'غير مصرح لك بقبول هذا العرض' };
    }

    // 2. تحديث حالة العرض المقبول إلى "accepted"
    const { error: acceptError } = await supabase
      .from('offers')
      .update({ status: 'accepted' })
      .eq('id', offerId)
      .eq('request_id', requestId);

    if (acceptError) {
      console.error('خطأ في قبول العرض:', acceptError);
      return { success: false, error: 'فشل في قبول العرض' };
    }

    // 3. رفض العروض الأخرى على نفس الطلب
    const { error: rejectError } = await supabase
      .from('offers')
      .update({ status: 'rejected' })
      .eq('request_id', requestId)
      .neq('id', offerId)
      .in('status', ['pending', 'negotiating']);

    if (rejectError) {
      console.warn('تحذير: فشل في رفض العروض الأخرى:', rejectError);
    }

    // 4. تحديث حالة الطلب إلى "assigned"
    const { error: updateRequestError } = await supabase
      .from('requests')
      .update({ 
        status: 'assigned',
        accepted_offer_id: offerId
      })
      .eq('id', requestId);

    if (updateRequestError) {
      console.warn('تحذير: فشل في تحديث حالة الطلب:', updateRequestError);
    }

    return { success: true };
  } catch (error) {
    console.error('خطأ في قبول العرض:', error);
    return { success: false, error: 'حدث خطأ غير متوقع' };
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
  userId: string
): Promise<{ success: boolean; error?: string; conversationId?: string }> {
  try {
    // 1. التحقق من أن المستخدم هو صاحب الطلب
    const { data: request, error: requestError } = await supabase
      .from('requests')
      .select('author_id, title')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return { success: false, error: 'الطلب غير موجود' };
    }

    if (request.author_id !== userId) {
      return { success: false, error: 'غير مصرح لك ببدء التفاوض على هذا العرض' };
    }

    // 2. جلب بيانات العرض
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('id, provider_id, title, status, is_negotiable')
      .eq('id', offerId)
      .eq('request_id', requestId)
      .single();

    if (offerError || !offer) {
      return { success: false, error: 'العرض غير موجود' };
    }

    // التحقق من أن العرض قابل للتفاوض
    if (!offer.is_negotiable) {
      return { success: false, error: 'هذا العرض غير قابل للتفاوض' };
    }

    // التحقق من أن العرض في حالة تسمح ببدء التفاوض
    if (offer.status !== 'pending') {
      return { success: false, error: 'لا يمكن بدء التفاوض على هذا العرض في حالته الحالية' };
    }

    // 3. تحديث حالة العرض إلى "negotiating"
    const { error: updateError } = await supabase
      .from('offers')
      .update({ status: 'negotiating' })
      .eq('id', offerId);

    if (updateError) {
      console.error('خطأ في تحديث حالة العرض:', updateError);
      return { success: false, error: 'فشل في بدء التفاوض' };
    }

    // 4. إنشاء أو جلب المحادثة بين الطرفين
    let conversationId: string | undefined;
    try {
      // البحث عن محادثة موجودة
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant1_id.eq.${userId},participant2_id.eq.${offer.provider_id}),and(participant1_id.eq.${offer.provider_id},participant2_id.eq.${userId})`)
        .eq('request_id', requestId)
        .eq('offer_id', offerId)
        .single();

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        // إنشاء محادثة جديدة
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            participant1_id: userId,
            participant2_id: offer.provider_id,
            request_id: requestId,
            offer_id: offerId,
            last_message_preview: 'بدأ التفاوض على هذا العرض',
            last_message_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (!convError && newConv) {
          conversationId = newConv.id;
        }
      }
    } catch (convErr) {
      console.warn('تحذير: فشل في إنشاء المحادثة:', convErr);
    }

    // 5. إرسال إشعار للعارض
    try {
      // Get requester name for notification
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single();

      const requesterName = requesterProfile?.display_name || 'صاحب الطلب';
      
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: offer.provider_id,
          type: 'status',
          title: '🤝 بدأ التفاوض على عرضك!',
          message: `${requesterName} يريد التفاوض معك على عرضك في طلب "${request.title}"`,
          link_to: `/request/${requestId}`,
          related_request_id: requestId,
          related_offer_id: offerId
        });

      if (notifError) {
        console.error('خطأ في إرسال الإشعار عند بدء التفاوض:', notifError);
        // لا نعيد false لأن التفاوض نجح، فقط الإشعار فشل
      } else {
        console.log('✅ تم إرسال إشعار بدء التفاوض بنجاح');
      }
    } catch (notifErr) {
      console.error('خطأ غير متوقع في إرسال الإشعار:', notifErr);
      // لا نعيد false لأن التفاوض نجح، فقط الإشعار فشل
    }

    console.log('✅ تم بدء التفاوض بنجاح');
    return { success: true, conversationId };
  } catch (error) {
    console.error('خطأ في بدء التفاوض:', error);
    return { success: false, error: 'حدث خطأ غير متوقع' };
  }
}
