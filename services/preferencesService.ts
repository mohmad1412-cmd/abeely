import { supabase } from "./supabaseClient";
import { UserPreferences } from "../types";

/**
 * خدمة إدارة اهتمامات المستخدمين
 */

// الحصول على اهتمامات المستخدم
export const getUserPreferences = async (
  userId: string,
): Promise<UserPreferences | null> => {
  try {
    const { data, error } = await supabase
      .rpc("get_user_preferences", { p_user_id: userId });

    if (error) {
      console.error("Error fetching user preferences:", error);
      return null;
    }

    if (!data) {
      return {
        interestedCategories: [],
        interestedCities: [],
        radarWords: [],
        notifyOnInterest: true,
        roleMode: "requester",
        showNameToApprovedProvider: true,
        homePage: "marketplace:all",
      };
    }

    return {
      interestedCategories: data.interested_categories || [],
      interestedCities: data.interested_cities || [],
      radarWords: data.radar_words || [],
      notifyOnInterest: data.notify_on_interest ?? true,
      roleMode: data.role_mode || "requester",
      showNameToApprovedProvider: data.show_name_to_approved_provider ?? true,
      homePage: (data.home_page as any) || "marketplace:all",
    };
  } catch (err) {
    console.error("Error in getUserPreferences:", err);
    return null;
  }
};

// تحديث اهتمامات المستخدم
export const updateUserPreferences = async (
  userId: string,
  preferences: Partial<UserPreferences>,
): Promise<UserPreferences | null> => {
  try {
    const { data, error } = await supabase
      .rpc("update_user_preferences", {
        p_user_id: userId,
        p_categories: preferences.interestedCategories,
        p_cities: preferences.interestedCities,
        p_radar_words: preferences.radarWords,
        p_notify_on_interest: preferences.notifyOnInterest,
        p_role_mode: preferences.roleMode,
        p_home_page: preferences.homePage,
      });

    if (error) {
      console.error("Error updating user preferences:", error);
      return null;
    }

    return {
      interestedCategories: data.interested_categories || [],
      interestedCities: data.interested_cities || [],
      radarWords: data.radar_words || [],
      notifyOnInterest: data.notify_on_interest ?? true,
      roleMode: data.role_mode || "requester",
      showNameToApprovedProvider: data.show_name_to_approved_provider ?? true,
      homePage: data.home_page || "marketplace:all",
    };
  } catch (err) {
    console.error("Error in updateUserPreferences:", err);
    return null;
  }
};

// البحث عن مستخدمين مهتمين (للإشعارات)
export const findInterestedUsers = async (
  category?: string,
  city?: string,
  keywords?: string[],
): Promise<
  Array<
    { userId: string; displayName: string; phone: string; matchType: string }
  >
> => {
  try {
    const { data, error } = await supabase.functions.invoke(
      "find-interested-users",
      {
        body: {
          category,
          city,
          keywords,
        },
      },
    );

    if (error) {
      console.error("Error finding interested users:", error);
      return [];
    }

    const payload = (data && typeof data === "object" && "data" in data)
      ? (data as any).data
      : data;

    return (payload || []).map((user: any) => ({
      userId: user.user_id,
      displayName: user.display_name,
      phone: user.phone,
      matchType: user.match_type,
    }));
  } catch (err) {
    console.error("Error in findInterestedUsers:", err);
    return [];
  }
};

// تحديث مباشر للاهتمامات عبر profiles table (بديل للـ RPC)
export const updatePreferencesDirect = async (
  userId: string,
  preferences: Partial<UserPreferences>,
): Promise<boolean> => {
  try {
    console.log(
      "[updatePreferencesDirect] Saving for userId:",
      userId,
      "preferences:",
      preferences,
    );

    const updateData: any = {};

    if (preferences.interestedCategories !== undefined) {
      // التأكد من أن القيمة array وليست null أو undefined
      // حتى لو كانت فارغة، يجب حفظها كـ array فارغ وليس null
      updateData.interested_categories = Array.isArray(preferences.interestedCategories)
        ? preferences.interestedCategories
        : (preferences.interestedCategories ? [preferences.interestedCategories] : []);
      console.log("[updatePreferencesDirect] Setting interested_categories:", {
        value: updateData.interested_categories,
        type: typeof updateData.interested_categories,
        isArray: Array.isArray(updateData.interested_categories),
        length: updateData.interested_categories?.length || 0,
      });
    }
    if (preferences.interestedCities !== undefined) {
      updateData.interested_cities = Array.isArray(preferences.interestedCities)
        ? preferences.interestedCities
        : (preferences.interestedCities ? [preferences.interestedCities] : []);
      console.log("[updatePreferencesDirect] Setting interested_cities:", {
        value: updateData.interested_cities,
        type: typeof updateData.interested_cities,
        isArray: Array.isArray(updateData.interested_cities),
        length: updateData.interested_cities?.length || 0,
      });
    }
    if (preferences.radarWords !== undefined) {
      updateData.radar_words = Array.isArray(preferences.radarWords)
        ? preferences.radarWords
        : (preferences.radarWords ? [preferences.radarWords] : []);
      console.log("[updatePreferencesDirect] Setting radar_words:", updateData.radar_words);
    }
    if (preferences.notifyOnInterest !== undefined) {
      updateData.notify_on_interest = preferences.notifyOnInterest;
    }
    if (preferences.roleMode !== undefined) {
      updateData.role_mode = preferences.roleMode;
    }
    // Note: show_name_to_approved_provider column doesn't exist in the database yet
    // if (preferences.showNameToApprovedProvider !== undefined) {
    //   updateData.show_name_to_approved_provider = preferences.showNameToApprovedProvider;
    // }
    if (preferences.homePage !== undefined) {
      updateData.home_page = preferences.homePage;
    }

    updateData.updated_at = new Date().toISOString();

    console.log("[updatePreferencesDirect] Update data:", updateData);

    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .select("interested_categories, interested_cities")
      .single();

    if (error) {
      console.error("[updatePreferencesDirect] Error:", error);
      console.error("[updatePreferencesDirect] Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return false;
    }

    // التحقق من أن البيانات تم حفظها بشكل صحيح
    console.log("[updatePreferencesDirect] ✅ Saved successfully");
    console.log("[updatePreferencesDirect] Verified saved data:", {
      interested_categories: data?.interested_categories,
      interested_cities: data?.interested_cities,
      isArray_categories: Array.isArray(data?.interested_categories),
      isArray_cities: Array.isArray(data?.interested_cities),
    });
    
    return true;
  } catch (err) {
    console.error("Error in updatePreferencesDirect:", err);
    return false;
  }
};

// الحصول على الاهتمامات مباشرة من profiles table
export const getPreferencesDirect = async (
  userId: string,
): Promise<UserPreferences | null> => {
  try {
    console.log("[getPreferencesDirect] Fetching for userId:", userId);

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "interested_categories, interested_cities, radar_words, notify_on_interest, role_mode, home_page",
      )
      .eq("id", userId)
      .single();

    if (error) {
      console.error(
        "[getPreferencesDirect] Error fetching preferences:",
        error,
      );
      return null;
    }

    if (!data) {
      console.log("[getPreferencesDirect] No data found for user");
      return null;
    }

    console.log("[getPreferencesDirect] Raw data from DB:", {
      interested_categories: data.interested_categories,
      interested_cities: data.interested_cities,
    });

    // معالجة صحيحة للـ arrays - التأكد من أنها arrays وليست null
    const rawCities = Array.isArray(data.interested_cities)
      ? data.interested_cities
      : (data.interested_cities ? [data.interested_cities] : []);
    
    // تحويل "جميع المدن (شامل عن بعد)" إلى "كل المدن" لتوحيد الاسم مع Marketplace
    const normalizedCities = rawCities.map((city: string) =>
      city === "جميع المدن (شامل عن بعد)" ? "كل المدن" : city
    );
    
    const result = {
      interestedCategories: Array.isArray(data.interested_categories) 
        ? data.interested_categories 
        : (data.interested_categories ? [data.interested_categories] : []),
      interestedCities: normalizedCities,
      radarWords: Array.isArray(data.radar_words)
        ? data.radar_words
        : (data.radar_words ? [data.radar_words] : []),
      notifyOnInterest: data.notify_on_interest ?? true,
      roleMode: data.role_mode || "requester",
      showNameToApprovedProvider: true, // Default value since column doesn't exist
      homePage: (data.home_page as any) || "marketplace:all",
    };

    console.log("[getPreferencesDirect] Returning:", {
      interestedCategories: result.interestedCategories,
      interestedCities: result.interestedCities,
      isArray_categories: Array.isArray(result.interestedCategories),
      isArray_cities: Array.isArray(result.interestedCities),
    });

    return result;
  } catch (err) {
    console.error("[getPreferencesDirect] Exception:", err);
    return null;
  }
};

// حفظ آخر طلب مفتوح
export const saveLastExpandedRequestId = async (
  userId: string,
  requestId: string | null,
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ last_expanded_request_id: requestId })
      .eq("id", userId);

    if (error) {
      console.error(
        "[saveLastExpandedRequestId] Error saving expanded request ID:",
        error,
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error in saveLastExpandedRequestId:", err);
    return false;
  }
};

// الحصول على آخر طلب مفتوح
export const getLastExpandedRequestId = async (
  userId: string,
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("last_expanded_request_id")
      .eq("id", userId)
      .single();

    if (error) {
      console.error(
        "[getLastExpandedRequestId] Error fetching expanded request ID:",
        error,
      );
      return null;
    }

    return data?.last_expanded_request_id || null;
  } catch (err) {
    console.error("Error in getLastExpandedRequestId:", err);
    return null;
  }
};
