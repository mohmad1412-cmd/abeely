import { supabase } from "./supabaseClient.ts";
import { logger } from "../utils/logger.ts";
import { UserProfile } from "./authService.ts";

/**
 * Check if user needs onboarding
 */
export const checkOnboardingStatus = async (
  userId: string,
  cachedProfile?: UserProfile | null,
): Promise<boolean> => {
  // Checking onboarding status...

  // استخدم بيانات الـ user الحالية إن وجدت لتجنب ضرب Supabase بدون داعٍ
  let data: UserProfile | null = cachedProfile ?? null;

  // إذا لم يتم تمرير profile جاهز، اجلبه من Supabase
  if (!data) {
    // console.log("🔍 No cached profile, fetching from database...");
    const { data: profileData, error } = await supabase
      .from("profiles")
      .select(
        "interested_categories, interested_cities, display_name, has_onboarded",
      )
      .eq("id", userId)
      .single();

    if (error) {
      logger.error("❌ Error checking onboarding status:", error, "onboarding");
      // في حالة الخطأ، لا نعرض onboarding تلقائياً
      // نتحقق من localStorage أولاً - إذا كان المستخدم قد أكمل onboarding مسبقاً، لا نحتاج لإظهاره
      const userOnboardedKey = `abeely_onboarded_${userId}`;
      const localOnboarded = localStorage.getItem(userOnboardedKey) === "true";

      if (localOnboarded) {
        logger.log(
          "User already onboarded (localStorage), skipping onboarding despite error",
          undefined,
          "onboarding",
        );
        return false;
      }

      // فقط إذا كان المستخدم جديداً تماماً (لا يوجد في localStorage)، نعرض onboarding
      logger.log(
        "Error fetching profile and no local onboarding flag, showing onboarding",
        undefined,
        "onboarding",
      );
      return true;
    }

    data = profileData as unknown as UserProfile;
    // console.log("🔍 Profile data from DB:", data);
  } else {
    // console.log("🔍 Using cached profile data");
  }

  // إذا لم يكن هناك بيانات للمستخدم، يحتاج onboarding
  if (!data) {
    // console.log("✅ No profile data found, showing onboarding...");
    return true;
  }

  const hasName = !!data?.display_name?.trim();
  const hasInterests = Array.isArray(data?.interested_categories) &&
    data.interested_categories.length > 0;
  const hasCities = Array.isArray(data?.interested_cities) &&
    data.interested_cities.length > 0;
  const alreadyOnboarded = data?.has_onboarded === true;

  /* console.log("🔍 Onboarding check details:", {
      hasName,
      hasInterests,
      hasCities,
      alreadyOnboarded,
      display_name: data?.display_name,
      interested_categories: data?.interested_categories,
      interested_cities: data?.interested_cities,
    }); */

  if (alreadyOnboarded) {
    return false;
  }

  if (hasName && hasInterests && hasCities) {
    // تحديث قاعدة البيانات إذا كانت المعلومات مكتملة
    if (!alreadyOnboarded) {
      // console.log("✨ User has all info, updating has_onboarded=true...");
      try {
        await supabase
          .from("profiles")
          .update({ has_onboarded: true } as any)
          .eq("id", userId);
      } catch (e) {
        logger.warn("Failed to update onboarding status", e, "onboarding");
      }
    }
    return false;
  }

  return true;
};

export const completeOnboarding = async (
  userId: string,
  updates: Partial<UserProfile>,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        ...updates,
        has_onboarded: true,
      } as any)
      .eq("id", userId);

    if (error) {
      logger.error("Error completing onboarding:", error, "onboarding");
      return { success: false, error: error.message };
    }

    // Save to local storage as backup
    localStorage.setItem(`abeely_onboarded_${userId}`, "true");

    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    logger.error("Exception completing onboarding:", error, "onboarding");
    return { success: false, error: error.message };
  }
};
