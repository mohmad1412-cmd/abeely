import { supabase } from "./supabaseClient";
import { AIDraft, classifyAndDraft } from "./aiService";
import { Request, Offer } from "../types";
import { getCategoryIdsByLabels, UNSPECIFIED_CATEGORY } from "./categoriesService";

type RequestInsert = {
  author_id?: string;
  title: string;
  description: string;
  status: "draft" | "active" | "assigned" | "completed" | "archived";
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
      // إذا لم يكن هناك تصنيفات، نضيف "غير محدد"
      categoryIds.push('unspecified');
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
    // في حالة الخطأ، نحاول إضافة "غير محدد" على الأقل
    try {
      await supabase
        .from("request_categories")
        .upsert([{ request_id: requestId, category_id: 'unspecified' }], { onConflict: "request_id,category_id" });
    } catch (_) {}
    return ['unspecified'];
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
    // إذا لم يكن هناك تصنيفات، نضيف "غير محدد"
    categoryIds = ['unspecified'];
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
  userId: string | null,
  draftData: AIDraft,
  overrides?: Partial<RequestInsert>,
) {
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
    seriousness: 2, // Default
  };

  if (userId) {
    payload.author_id = userId;
  }

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
      // نحاول إضافة "غير محدد" على الأقل
      try {
        await linkCategories(data.id, ['unspecified']);
      } catch (_) {}
    }

    return data;
  } catch (err) {
    const e: any = err;
    const msg = e?.message || "";
    const code = e?.code || "";

    // Fallback: if missing column (e.g., interested_categories triggers), try draft/non-public to bypass triggers
    const isMissingColumn = code === "42703" || msg.includes("interested_categories");
    if (!isMissingColumn) {
      throw err;
    }

    const fallbackPayload: RequestInsert = {
      ...payload,
      status: "draft",
      is_public: false,
    };

    try {
      const data = await (async () => {
        const { data, error } = await supabase.from("requests").insert(fallbackPayload).select("id").single();
        if (error || !data?.id) {
          throw error || new Error("Fallback insert failed");
        }
        return data;
      })();

      // Skip categories linking in fallback to avoid more errors
      return data;
    } catch (fallbackErr) {
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
  try {
    const { data, error } = await supabase
      .from("offers")
      .insert({
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
      })
      .select("id")
      .single();

    if (error) {
      console.error("Create offer error:", error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error("Create offer failed:", err);
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

  return (data || []).map((req: any) => ({
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
    images: [],
    contactMethod: "both",
    seriousness: req.seriousness || 2,
  }));
}

/**
 * Fetch offers for a user
 */
export async function fetchMyOffers(providerId: string): Promise<Offer[]> {
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching offers:", error);
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
        .update({ status: 'completed' })
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
        .update({ status: 'rejected' })
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
    seriousness: req.seriousness || 2,
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
 * Transform Supabase request to app Request format
 */
function transformRequest(req: any): Request {
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
    seriousness: req.seriousness || 2,
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
  interestedCities: string[]
): Promise<boolean> {
  // If no interests specified, match all
  if (interestedCategories.length === 0 && interestedCities.length === 0) {
    return true;
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
    if (interestedCities.length > 0 && request.location) {
      const requestCity = request.location.split('،').pop()?.trim() || request.location;
      const hasMatchingCity = interestedCities.some(city =>
        requestCity.includes(city) || city.includes(requestCity)
      );
      if (!hasMatchingCity) return false;
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
          interestedCities
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
