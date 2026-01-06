// @ts-ignore - Supabase Edge Runtime types
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.trim().split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }
  return authHeader.trim();
}

function getRoleFromJwt(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return payload?.role ?? payload?.["https://supabase.io/jwt/claims"]?.role ?? null;
  } catch {
    return null;
  }
}

function isServiceRole(authHeader: string | null): boolean {
  const token = extractBearerToken(authHeader);
  if (!token) return false;
  if (token === SUPABASE_SERVICE_ROLE_KEY) return true;
  return getRoleFromJwt(token) === "service_role";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Missing Supabase environment variables" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ??
    req.headers.get("authorization");

  if (!isServiceRole(authHeader)) {
    const token = extractBearerToken(authHeader);
    if (!token) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user?.id) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const category = typeof body.category === "string"
    ? body.category.trim().slice(0, 100)
    : null;
  const city = typeof body.city === "string"
    ? body.city.trim().slice(0, 100)
    : null;
  const keywords = Array.isArray(body.keywords)
    ? body.keywords
      .filter((word) => typeof word === "string")
      .map((word) => word.trim())
      .filter((word) => word.length > 0)
      .slice(0, 20)
    : null;

  if (!category && !city && (!keywords || keywords.length === 0)) {
    return jsonResponse({ data: [] });
  }

  const { data, error } = await supabaseAdmin.rpc("find_interested_users", {
    p_category: category,
    p_city: city,
    p_keywords: keywords && keywords.length > 0 ? keywords : null,
  });

  if (error) {
    return jsonResponse({ error: "RPC failed", details: error.message }, 500);
  }

  return jsonResponse({ data: data ?? [] });
});
