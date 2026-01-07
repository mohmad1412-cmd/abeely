// @ts-ignore - Supabase Edge Runtime types
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

interface PushPayload {
  requestId: string;
  requestTitle: string;
  requestDescription?: string;
  categories?: string[];
  city?: string;
  authorId: string; // لاستبعاد صاحب الطلب
}

interface FCMMessage {
  to: string;
  notification: {
    title: string;
    body: string;
    icon?: string;
    click_action?: string;
  };
  data?: Record<string, string>;
}

/**
 * إرسال إشعار عبر FCM
 */
async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<boolean> {
  if (!FCM_SERVER_KEY) {
    console.error("FCM_SERVER_KEY not configured");
    return false;
  }

  const message: FCMMessage = {
    to: token,
    notification: {
      title,
      body,
      icon: "notification_icon",
      click_action: "FCM_PLUGIN_ACTIVITY",
    },
    data,
  };

  try {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("FCM Error:", response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log("FCM Response:", result);
    return result.success === 1;
  } catch (error) {
    console.error("FCM Send Error:", error);
    return false;
  }
}

/**
 * البحث عن المستخدمين المهتمين بهذا الطلب
 */
async function findInterestedUsers(
  categories: string[],
  city: string | null,
  authorId: string,
): Promise<string[]> {
  // استخدام الـ RPC الموجود أو query مباشر
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, interested_categories, interested_cities")
    .neq("id", authorId); // استبعاد صاحب الطلب

  if (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }

  const interestedUserIds: string[] = [];

  for (const profile of profiles || []) {
    const userCategories = profile.interested_categories || [];
    const userCities = profile.interested_cities || [];

    // تحقق من تطابق التصنيفات
    const categoryMatch = categories.length === 0 ||
      categories.some((cat) =>
        userCategories.some(
          (userCat: string) =>
            userCat.toLowerCase().includes(cat.toLowerCase()) ||
            cat.toLowerCase().includes(userCat.toLowerCase()),
        )
      );

    // تحقق من تطابق المدينة
    const cityMatch = !city ||
      userCities.length === 0 ||
      userCities.includes("كل المدن") ||
      userCities.some((userCity: string) =>
        userCity.toLowerCase().includes(city.toLowerCase()) ||
        city.toLowerCase().includes(userCity.toLowerCase())
      );

    if (categoryMatch && cityMatch && userCategories.length > 0) {
      interestedUserIds.push(profile.id);
    }
  }

  return interestedUserIds;
}

/**
 * جلب FCM tokens للمستخدمين
 */
async function getTokensForUsers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];

  const { data: tokens, error } = await supabaseAdmin
    .from("fcm_tokens")
    .select("token")
    .in("user_id", userIds);

  if (error) {
    console.error("Error fetching tokens:", error);
    return [];
  }

  return (tokens || []).map((t) => t.token);
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // التحقق من المتغيرات البيئية
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(
      { error: "Missing Supabase environment variables" },
      500,
    );
  }

  if (!FCM_SERVER_KEY) {
    return jsonResponse({ error: "FCM_SERVER_KEY not configured" }, 500);
  }

  // قراءة الـ body
  let body: PushPayload;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const {
    requestId,
    requestTitle,
    requestDescription,
    categories,
    city,
    authorId,
  } = body;

  if (!requestId || !requestTitle || !authorId) {
    return jsonResponse({
      error: "Missing required fields: requestId, requestTitle, authorId",
    }, 400);
  }

  console.log("📱 Processing push notification for request:", requestId);

  // البحث عن المستخدمين المهتمين
  const interestedUserIds = await findInterestedUsers(
    categories || [],
    city || null,
    authorId,
  );

  console.log(`📱 Found ${interestedUserIds.length} interested users`);

  if (interestedUserIds.length === 0) {
    return jsonResponse({
      success: true,
      sent: 0,
      message: "No interested users found",
    });
  }

  // جلب tokens
  const tokens = await getTokensForUsers(interestedUserIds);
  console.log(`📱 Found ${tokens.length} FCM tokens`);

  if (tokens.length === 0) {
    return jsonResponse({
      success: true,
      sent: 0,
      message: "No tokens found for interested users",
    });
  }

  // إرسال الإشعارات
  const notificationTitle = "🎯 طلب جديد يطابق اهتماماتك!";
  const notificationBody = requestTitle.slice(0, 100);
  const notificationData = {
    requestId,
    type: "new_request",
  };

  let successCount = 0;
  let failureCount = 0;

  for (const token of tokens) {
    const success = await sendFCMNotification(
      token,
      notificationTitle,
      notificationBody,
      notificationData,
    );

    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log(
    `📱 Push notifications sent: ${successCount} success, ${failureCount} failed`,
  );

  return jsonResponse({
    success: true,
    sent: successCount,
    failed: failureCount,
    totalTokens: tokens.length,
    interestedUsers: interestedUserIds.length,
  });
});
