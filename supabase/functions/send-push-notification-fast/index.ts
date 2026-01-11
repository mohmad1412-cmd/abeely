// @ts-ignore - Supabase Edge Runtime types
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

interface FastPayload {
  type: "new_offer" | "offer_accepted" | "new_message";
  offer_id?: string;
  request_id?: string;
  provider_id?: string;
  provider_name?: string;
  offer_title?: string;
  message_id?: string;
  conversation_id?: string;
  sender_id?: string;
  content_preview?: string;
  recipient_id: string; // مطلوب دائماً
}

let cachedAccessToken: { token: string; expiry: number } | null = null;

// ==========================================
// FCM Authentication (cached)
// ==========================================

async function getAccessToken(serviceAccount: ServiceAccount): Promise<string | null> {
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

    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const signatureInput = `${headerB64}.${payloadB64}`;
    
    const signature = await signWithPrivateKey(signatureInput, serviceAccount.private_key);
    const jwt = `${signatureInput}.${signature}`;

    const response = await fetch(serviceAccount.token_uri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!response.ok) {
      console.error("OAuth error:", response.status);
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

async function signWithPrivateKey(data: string, privateKeyPem: string): Promise<string> {
  const pemContents = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(data)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// ==========================================
// إرسال FCM بسرعة (High Priority)
// ==========================================

async function sendFCMFast(
  token: string,
  title: string,
  body: string,
  data: Record<string, string>,
  serviceAccount: ServiceAccount
): Promise<boolean> {
  const accessToken = await getAccessToken(serviceAccount);
  if (!accessToken) return false;

  // HIGH PRIORITY - هذا هو المفتاح!
  const message = {
    message: {
      token: token,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        timestamp: Date.now().toString(),
      },
      android: {
        priority: "HIGH", // ⚡ مهم جداً!
        notification: {
          channel_id: "default", // ⚡ يجب أن يطابق channel في MainActivity.java
          icon: "notification_icon",
          sound: "default",
          priority: "high", // ⚡
          default_sound: true,
          default_vibrate_timings: true,
          visibility: "public",
          click_action: "FCM_PLUGIN_ACTIVITY",
        },
      },
      apns: {
        headers: {
          "apns-priority": "10", // ⚡ High priority for iOS
        },
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            content_available: 1,
            priority: 10, // ⚡
          },
        },
      },
    },
  };

  try {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(message),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("FCM Send Error:", error);
    return false;
  }
}

// ==========================================
// توليد المحتوى (بدون AI - سريع جداً)
// ==========================================

function getNotificationContent(payload: FastPayload): { title: string; body: string; data: Record<string, string> } {
  const data: Record<string, string> = {
    type: payload.type,
  };

  switch (payload.type) {
    case "new_offer":
      return {
        title: "🎁 عرض جديد!",
        body: `${payload.provider_name || "مقدم خدمة"} عرض عليك عرضاً جديداً`,
        data: { ...data, offer_id: payload.offer_id || "", request_id: payload.request_id || "" },
      };

    case "offer_accepted":
      return {
        title: "🎉 تم قبول عرضك!",
        body: "مبروك! تم قبول عرضك. ابدأ التواصل مع العميل",
        data: { ...data, offer_id: payload.offer_id || "", request_id: payload.request_id || "" },
      };

    case "new_message":
      return {
        title: "💬 رسالة جديدة",
        body: payload.content_preview || "رسالة جديدة وصلت",
        data: { ...data, message_id: payload.message_id || "", conversation_id: payload.conversation_id || "" },
      };

    default:
      return {
        title: "إشعار جديد",
        body: "وصل إشعار جديد",
        data,
      };
  }
}

// ==========================================
// Main Handler - نحيف جداً
// ==========================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!FIREBASE_SERVICE_ACCOUNT) {
    return new Response(
      JSON.stringify({ error: "FIREBASE_SERVICE_ACCOUNT not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let payload: FastPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!payload.recipient_id || !payload.type) {
    return new Response(
      JSON.stringify({ error: "Missing recipient_id or type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 1. جلب FCM token فقط (لا شيء آخر!)
  const { data: tokens, error } = await supabaseAdmin
    .from("fcm_tokens")
    .select("token")
    .eq("user_id", payload.recipient_id)
    .limit(1); // فقط أول token

  if (error || !tokens || tokens.length === 0) {
    return new Response(
      JSON.stringify({ success: false, message: "No token found" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 2. توليد المحتوى (بدون AI)
  const { title, body, data } = getNotificationContent(payload);

  // 3. إرسال FCM
  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid FIREBASE_SERVICE_ACCOUNT" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const sent = await sendFCMFast(tokens[0].token, title, body, data, serviceAccount);

  return new Response(
    JSON.stringify({ success: sent, sent_at: new Date().toISOString() }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
