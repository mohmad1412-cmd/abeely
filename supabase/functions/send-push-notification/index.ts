// @ts-ignore - Supabase Edge Runtime types
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";

// FCM v1 Configuration
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT") ?? "";

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
  notificationType?:
    | "new_request"
    | "new_offer"
    | "offer_accepted"
    | "new_message"
    | "negotiation_started";
  requestId: string;
  requestTitle: string;
  requestDescription?: string;
  categories?: string[];
  city?: string;
  authorId: string;
  recipientId?: string;
  offerId?: string;
  offerTitle?: string;
  offerDescription?: string;
  providerName?: string;
  messageContent?: string;
  senderName?: string;
}

interface UserProfile {
  id: string;
  interested_categories: string[];
  interested_cities: string[];
  radar_words: string[];
}

// ==========================================
// FCM v1 Authentication (using Service Account)
// ==========================================

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

let cachedAccessToken: { token: string; expiry: number } | null = null;

/**
 * Create JWT for Google OAuth
 */
function createJWT(serviceAccount: ServiceAccount): string {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(
    /\+/g,
    "-",
  ).replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(
    /\+/g,
    "-",
  ).replace(/\//g, "_");

  const signatureInput = `${headerB64}.${payloadB64}`;

  // Use Web Crypto API to sign
  return signatureInput; // Will be signed in getAccessToken
}

/**
 * Sign data with RSA private key
 */
async function signWithPrivateKey(
  data: string,
  privateKeyPem: string,
): Promise<string> {
  // Convert PEM to binary
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyPem
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  // Import the key
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  // Sign the data
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(data),
  );

  // Convert to base64url
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return signatureB64;
}

/**
 * Get OAuth2 Access Token for FCM v1
 */
async function getAccessToken(
  serviceAccount: ServiceAccount,
): Promise<string | null> {
  // Check cache
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiry - 60000) {
    return cachedAccessToken.token;
  }

  try {
    const header = { alg: "RS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: serviceAccount.token_uri,
      iat: now,
      exp: now + 3600,
    };

    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(
      /\+/g,
      "-",
    ).replace(/\//g, "_");
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(
      /\+/g,
      "-",
    ).replace(/\//g, "_");

    const signatureInput = `${headerB64}.${payloadB64}`;
    const signature = await signWithPrivateKey(
      signatureInput,
      serviceAccount.private_key,
    );
    const jwt = `${signatureInput}.${signature}`;

    // Exchange JWT for access token
    const response = await fetch(serviceAccount.token_uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body:
        `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OAuth error:", response.status, errorText);
      return null;
    }

    const tokenData = await response.json();
    cachedAccessToken = {
      token: tokenData.access_token,
      expiry: Date.now() + (tokenData.expires_in * 1000),
    };

    return tokenData.access_token;
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
}

/**
 * إرسال إشعار عبر FCM v1
 */
async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<boolean> {
  if (!FIREBASE_SERVICE_ACCOUNT) {
    console.error("FIREBASE_SERVICE_ACCOUNT not configured");
    return false;
  }

  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error("Invalid FIREBASE_SERVICE_ACCOUNT JSON:", e);
    return false;
  }

  const accessToken = await getAccessToken(serviceAccount);
  if (!accessToken) {
    console.error("Failed to get FCM access token");
    return false;
  }

  const message = {
    message: {
      token: token,
      notification: {
        title,
        body,
      },
      android: {
        notification: {
          icon: "notification_icon",
          click_action: "FCM_PLUGIN_ACTIVITY",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
      data: data || {},
    },
  };

  try {
    const projectId = serviceAccount.project_id;
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(message),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("FCM v1 Error:", response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log("FCM v1 Response:", result);
    return true;
  } catch (error) {
    console.error("FCM Send Error:", error);
    return false;
  }
}

/**
 * توليد محتوى الإشعارات والبحث عن المستخدمين المهتمين باستخدام AI
 */
async function getAIContentAndUsers(
  payload: PushPayload,
): Promise<{ userIds: string[]; title: string; body: string }> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
  const type = payload.notificationType || "new_request";

  // 1. تحديد المستخدمين المستهدفين
  let targetUserIds: string[] = [];
  let usersDataForAI: any[] = [];

  if (
    type === "new_offer" || type === "offer_accepted" ||
    type === "new_message" || type === "negotiation_started"
  ) {
    if (!payload.recipientId) {
      console.error(`${type} requires recipientId`);
      return { userIds: [], title: "", body: "" };
    }
    targetUserIds = [payload.recipientId];
  } else {
    // جلب جميع المستخدمين مع اهتماماتهم (باستثناء صاحب الطلب الجديد)
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, interested_categories, interested_cities, radar_words")
      .neq("id", payload.authorId);

    if (error) {
      console.error("Error fetching profiles:", error);
      return { userIds: [], title: "", body: "" };
    }

    // فلترة المستخدمين الذين لديهم اهتمامات
    const usersWithInterests = (profiles || []).filter(
      (p: any) =>
        (p.interested_categories?.length > 0) || (p.radar_words?.length > 0),
    );

    if (usersWithInterests.length === 0) {
      console.log("📱 No users with interests found");
      return { userIds: [], title: "", body: "" };
    }

    usersDataForAI = usersWithInterests.map((p: any, idx: number) => ({
      index: idx,
      id: p.id,
      categories: p.interested_categories || [],
      cities: p.interested_cities || [],
      radarWords: p.radar_words || [],
    }));
  }

  // 2. صياغة الـ Prompt بناءً على النوع
  let prompt = "";
  if (type === "new_offer") {
    prompt = `أنت كاتب محتوى إبداعي لبق جداً. أرسل مقدم خدمة يسمى "${
      payload.providerName || "خبير"
    }" عرضاً جديداً على الطلب: "${payload.requestTitle}".
تفاصيل العرض: ${payload.offerTitle} - ${payload.offerDescription || ""}

المطلوب:
صِغ عنواناً وجسماً للإشعار (Push Notification) باللغة العربية بأسلوب جذاب ومحفز لصاحب الطلب ليقوم بمراجعة العرض الآن.

أجب بـ JSON فقط بهذا الشكل:
{
  "notificationTitle": "العنوان الإبداعي",
  "notificationBody": "نص الإشعار الجذاب (بحد أقصى 100 حرف)"
}`;
  } else if (type === "offer_accepted") {
    prompt =
      `أنت كاتب محتوى مبهج. تم قبول عرض مقدم الخدمة للطلب: "${payload.requestTitle}".
صِغ رسالة تهنئة قصيرة جداً (بحد أقصى 100 حرف) لمقدم الخدمة تخبره ببدء العمل والتواصل مع العميل.
أجب بـ JSON فقط بهذا الشكل:
{
  "notificationTitle": "العنوان الإبداعي",
  "notificationBody": "نص الإشعار (بحد أقصى 100 حرف)"
}`;
  } else if (type === "new_message") {
    prompt = `أنت كاتب محتوى لبق. وصل رسالة جديدة من "${
      payload.senderName || "مستخدم"
    }".
محتوى الرسالة: "${payload.messageContent || ""}"
السياق (الطلب): "${payload.requestTitle || "محادثة عامة"}"
صِغ إشعاراً جذاباً يخبر المستلم بوصول رسالة جديدة بأسلوب ودود.
أجب بـ JSON فقط بهذا الشكل:
{
  "notificationTitle": "العنوان الإبداعي",
  "notificationBody": "نص الإشعار (بحد أقصى 100 حرف)"
}`;
  } else if (type === "negotiation_started") {
    prompt = `أنت كاتب محتوى لبق جداً. العميل "${
      payload.senderName || "صاحب الطلب"
    }" يريد التفاوض معك بخصوص عرضك على الطلب: "${payload.requestTitle}".
صِغ رسالة إشعار جذابة تخبر المزود بأن هناك فرصة للتفاوض والعمل على الطلب.
أجب بـ JSON فقط بهذا الشكل:
{
  "notificationTitle": "العنوان الإبداعي",
  "notificationBody": "نص الإشعار الجذاب (بحد أقصى 100 حرف)"
}`;
  } else {
    prompt =
      `أنت محلل ذكي وكاتب محتوى إبداعي. لديك طلب جديد ومجموعة مستخدمين لكل منهم اهتمامات.

الطلب الجديد:
العنوان: ${payload.requestTitle}
الوصف: ${payload.requestDescription || "لا يوجد وصف"}
التصنيفات: ${payload.categories?.join(", ") || "غير محدد"}
المدينة: ${payload.city || "غير محدد"}

المستخدمين واهتماماتهم:
${
        usersDataForAI.map((u: any) =>
          `[${u.index}] التصنيفات: ${
            u.categories.join(", ") || "لا يوجد"
          } | المدن: ${u.cities.join(", ") || "كل المدن"} | كلمات رادار: ${
            u.radarWords.join(", ") || "لا يوجد"
          }`
        ).join("\n")
      }

المطلوب:
1. حدد أرقام المستخدمين (index) المهتمين حقاً بهذا الطلب الجديد.
2. صِغ عنواناً وجسماً موحداً للإشعار باللغة العربية بأسلوب جذاب وشخصي.

أجب بـ JSON فقط بهذا الشكل:
{
  "matches": [0, 2],
  "notificationTitle": "العنوان الإبداعي",
  "notificationBody": "نص الإشعار الجذاب (بحد أقصى 100 حرف)"
}`;
  }

  // 3. استدعاء AI أو Fallback
  if (!ANTHROPIC_API_KEY) {
    if (type === "new_offer") {
      return {
        userIds: targetUserIds,
        title: "🎁 عرض جديد متاح!",
        body: `وصلك عرض من ${
          payload.providerName || "خبير"
        } لطلبك: ${payload.requestTitle}`,
      };
    } else if (type === "offer_accepted") {
      return {
        userIds: targetUserIds,
        title: "🎉 تم قبول عرضك!",
        body: `مبروك! تم قبول عرضك للطلب: ${payload.requestTitle}`,
      };
    } else if (type === "new_message") {
      return {
        userIds: targetUserIds,
        title: `💬 رسالة من ${payload.senderName || "مستخدم"}`,
        body: payload.messageContent || "رسالة جديدة وصلت",
      };
    } else if (type === "negotiation_started") {
      return {
        userIds: targetUserIds,
        title: "🤝 بدأ التفاوض!",
        body: `${payload.senderName || "العميل"} يريد التفاوض معك بخصوص عرضك.`,
      };
    } else {
      return {
        userIds: simpleMatching(
          usersDataForAI,
          payload.categories || [],
          payload.city || null,
        ),
        title: "🎯 طلب جديد يطابق اهتماماتك!",
        body: payload.requestTitle,
      };
    }
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) throw new Error("AI call failed");

    const result = await response.json();
    const aiText = result.content?.[0]?.text || "";
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      if (
        type === "new_offer" || type === "offer_accepted" ||
        type === "new_message" || type === "negotiation_started"
      ) {
        return {
          userIds: targetUserIds,
          title: parsed.notificationTitle || "🎁 إشعار جديد!",
          body: parsed.notificationBody || payload.requestTitle || "لا يوجد نص",
        };
      } else {
        const matchedUserIds = (parsed.matches || []).map((idx: number) =>
          usersDataForAI[idx]?.id
        ).filter(Boolean);
        return {
          userIds: matchedUserIds,
          title: parsed.notificationTitle || "🎯 طلب جديد!",
          body: parsed.notificationBody || payload.requestTitle,
        };
      }
    }

    throw new Error("Invalid AI response");
  } catch (err) {
    console.error("AI/JSON Error:", err);
    const defaultTitle = type === "new_offer"
      ? "🎁 عرض جديد!"
      : (type === "offer_accepted"
        ? "🎉 عرض مقبول!"
        : (type === "new_message"
          ? "💬 رسالة جديدة"
          : (type === "negotiation_started"
            ? "🤝 بدأ التفاوض!"
            : "🎯 طلب جديد!")));
    return {
      userIds: targetUserIds.length > 0 ? targetUserIds : simpleMatching(
        usersDataForAI,
        payload.categories || [],
        payload.city || null,
      ),
      title: defaultTitle,
      body: payload.requestTitle || "إشعار جديد وصلك",
    };
  }
}

/**
 * مطابقة بسيطة كـ fallback
 */
function simpleMatching(
  profiles: UserProfile[],
  categories: string[],
  city: string | null,
): string[] {
  const result: string[] = [];

  for (const profile of profiles) {
    const userCategories = profile.interested_categories || [];
    const userCities = profile.interested_cities || [];

    const categoryMatch = categories.length === 0 ||
      categories.some((cat: string) =>
        userCategories.some(
          (userCat: string) =>
            userCat.toLowerCase().includes(cat.toLowerCase()) ||
            cat.toLowerCase().includes(userCat.toLowerCase()),
        )
      );

    const cityMatch = !city ||
      userCities.length === 0 ||
      userCities.includes("كل المدن") ||
      userCities.some((userCity: string) =>
        userCity.toLowerCase().includes(city.toLowerCase()) ||
        city.toLowerCase().includes(userCity.toLowerCase())
      );

    if (categoryMatch && cityMatch && userCategories.length > 0) {
      result.push(profile.id);
    }
  }

  return result;
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

  return (tokens || []).map((t: any) => t.token);
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

  if (!FIREBASE_SERVICE_ACCOUNT) {
    console.warn(
      "FIREBASE_SERVICE_ACCOUNT not configured - Push notifications disabled",
    );
    // Continue without FCM - will use in-app notifications only
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
    authorId,
  } = body;

  if (!requestId || !requestTitle || !authorId) {
    return jsonResponse({
      error: "Missing required fields: requestId, requestTitle, authorId",
    }, 400);
  }

  console.log(
    `📱 Processing push notification for ${
      body.notificationType || "request"
    }:`,
    requestId,
  );

  // البحث عن المستخدمين وإنشاء المحتوى بـ AI
  const { userIds, title, body: notificationBodyText } =
    await getAIContentAndUsers(
      body,
    );

  console.log(`📱 Targeted ${userIds.length} users`);

  if (userIds.length === 0) {
    return jsonResponse({
      success: true,
      sent: 0,
      message: "No target users found",
    });
  }

  // جلب tokens
  const tokens = await getTokensForUsers(userIds);
  console.log(`📱 Found ${tokens.length} FCM tokens`);

  if (tokens.length === 0 || !FIREBASE_SERVICE_ACCOUNT) {
    return jsonResponse({
      success: true,
      sent: 0,
      message: !FIREBASE_SERVICE_ACCOUNT
        ? "FCM not configured - in-app notifications only"
        : "No tokens found for target users",
      aiGeneratedTitle: title,
      aiGeneratedBody: notificationBodyText,
    });
  }

  // إرسال الإشعارات
  const notificationData = {
    requestId,
    offerId: body.offerId || "",
    type: body.notificationType || "new_request",
  };

  let successCount = 0;
  for (const token of tokens) {
    const success = await sendFCMNotification(
      token,
      title,
      notificationBodyText,
      notificationData,
    );
    if (success) successCount++;
  }

  console.log(
    `📱 Push notifications sent: ${successCount} success`,
  );

  return jsonResponse({
    success: true,
    sent: successCount,
    aiGeneratedTitle: title,
    aiGeneratedBody: notificationBodyText,
  });
});
