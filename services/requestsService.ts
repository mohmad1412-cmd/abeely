import { supabase } from "./supabaseClient";
import { AIDraft, classifyAndDraft } from "./aiService";
import { Request, Offer } from "../types";

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

const upsertCategories = async (labels: string[] = []) => {
  if (!labels.length) return [];
  const rows = labels.map((label) => ({ label }));
  const { data, error } = await supabase
    .from("categories")
    .upsert(rows, { onConflict: "label" })
    .select("id,label");
  if (error) throw error;
  return data || [];
};

const linkCategories = async (requestId: string, categoryIds: string[]) => {
  if (!categoryIds.length) return;
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

  const { data, error } = await supabase.from("requests").insert(payload)
    .select("id").single();
  if (error || !data?.id) {
    console.error("Supabase Insert Error:", error);
    throw error || new Error("Insert failed: no id returned");
  }

  if (draftData.categories?.length) {
    try {
      const catRows = await upsertCategories(draftData.categories);
      const ids = catRows.map((c: any) => c.id);
      await linkCategories(data.id, ids);
    } catch (catErr) {
      console.warn(
        "Failed to link categories, but request was created:",
        catErr,
      );
    }
  }

  return data;
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
      `, { count: 'exact' })
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range(from, to);
    data = res.data;
    error = res.error;
    count = res.count ?? null;
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
    // Add 5 second timeout to prevent hanging
    const timeoutPromise = new Promise<{connected: false; error: string}>((_, reject) => {
      setTimeout(() => reject(new Error("Connection timeout (5s)")), 5000);
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
        .update({ status: 'archived' })
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
