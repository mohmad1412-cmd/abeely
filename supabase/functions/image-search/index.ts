/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

// ============================================
// Configuration
// ============================================
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") || "";
const GOOGLE_SEARCH_ENGINE_ID = Deno.env.get("GOOGLE_SEARCH_ENGINE_ID") || "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("VITE_ANTHROPIC_API_KEY") || "";

// Fallback to Unsplash if Google not configured
const UNSPLASH_ACCESS_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY") || "";

// ============================================
// Types
// ============================================
interface ImageSearchRequest {
  query: string;
  count?: number; // Number of images to return (default: 5)
}

interface ImageResult {
  url: string;
  thumbnail: string;
  title: string;
  source: string;
}

// ============================================
// Helper Functions
// ============================================
function res(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

// ============================================
// Google Custom Search API
// ============================================
async function searchGoogleImages(query: string, count: number = 5): Promise<ImageResult[]> {
  console.log("🔑 GOOGLE_API_KEY exists:", !!GOOGLE_API_KEY, "length:", GOOGLE_API_KEY.length);
  console.log("🔑 GOOGLE_SEARCH_ENGINE_ID exists:", !!GOOGLE_SEARCH_ENGINE_ID, "length:", GOOGLE_SEARCH_ENGINE_ID.length);
  
  if (!GOOGLE_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
    throw new Error("Google Search API not configured - API_KEY: " + !!GOOGLE_API_KEY + ", ENGINE_ID: " + !!GOOGLE_SEARCH_ENGINE_ID);
  }

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", GOOGLE_API_KEY);
  url.searchParams.set("cx", GOOGLE_SEARCH_ENGINE_ID);
  url.searchParams.set("q", query);
  url.searchParams.set("searchType", "image");
  url.searchParams.set("num", String(Math.min(count, 10))); // Google max is 10 per request
  url.searchParams.set("safe", "active"); // Safe search
  url.searchParams.set("imgType", "photo"); // Prefer photos over clipart

  console.log("🌐 Fetching from Google:", url.toString().replace(GOOGLE_API_KEY, "***API_KEY***"));

  const response = await fetch(url.toString());
  
  console.log("📡 Google response status:", response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Google Search API Error (raw):", errorText);
    try {
      const error = JSON.parse(errorText);
      throw new Error(error?.error?.message || "Google Search failed with status " + response.status);
    } catch {
      throw new Error("Google Search failed: " + errorText.substring(0, 200));
    }
  }

  const result = await response.json();
  console.log("✅ Google returned items:", result.items?.length || 0);
  
  if (!result.items || result.items.length === 0) {
    console.log("⚠️ No items in Google response");
    return [];
  }

  return result.items.map((item: any) => ({
    url: item.link,
    thumbnail: item.image?.thumbnailLink || item.link,
    title: item.title,
    source: item.displayLink,
  }));
}

// ============================================
// Unsplash API (Fallback)
// ============================================
async function searchUnsplashImages(query: string, count: number = 5): Promise<ImageResult[]> {
  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error("Unsplash API not configured");
  }

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(Math.min(count, 30)));
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Client-ID ${UNSPLASH_ACCESS_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Unsplash API Error:", error);
    throw new Error(error?.errors?.[0] || "Unsplash Search failed");
  }

  const result = await response.json();

  if (!result.results || result.results.length === 0) {
    return [];
  }

  return result.results.map((item: any) => ({
    url: item.urls?.regular || item.urls?.full,
    thumbnail: item.urls?.thumb || item.urls?.small,
    title: item.alt_description || item.description || "Unsplash Image",
    source: "unsplash.com",
  }));
}

// ============================================
// Pexels API (Another Fallback - Free)
// ============================================
async function searchPexelsImages(query: string, count: number = 5): Promise<ImageResult[]> {
  const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY") || "";
  
  if (!PEXELS_API_KEY) {
    throw new Error("Pexels API not configured");
  }

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(Math.min(count, 15)));
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": PEXELS_API_KEY,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Pexels API Error:", error);
    throw new Error("Pexels Search failed");
  }

  const result = await response.json();

  if (!result.photos || result.photos.length === 0) {
    return [];
  }

  return result.photos.map((item: any) => ({
    url: item.src?.large || item.src?.original,
    thumbnail: item.src?.medium || item.src?.small,
    title: item.alt || "Pexels Image",
    source: "pexels.com",
  }));
}

// ============================================
// AI-Powered Query Translation using Claude
// ============================================
async function translateQueryWithAI(query: string): Promise<string> {
  // If query is already in English, return as-is
  if (!/[\u0600-\u06FF]/.test(query)) {
    console.log("📝 Query is already in English:", query);
    return query;
  }

  // If no Anthropic API key, return original query
  if (!ANTHROPIC_API_KEY) {
    console.log("⚠️ No ANTHROPIC_API_KEY, using original query");
    return query;
  }

  try {
    console.log("🤖 Translating query with AI:", query);
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 150,
        messages: [{
          role: "user",
          content: `You are an image search query optimizer. Convert this Arabic text into the best possible English search terms for finding relevant images on Google.

Rules:
1. Return ONLY the search keywords, no explanation
2. Keep brand names in English (Lexus, Toyota, Mercedes, BMW, etc.)
3. Be specific - add descriptive words that help find good images
4. For cars: include "car", model type, and "photo" or "image"
5. For services: include the service type and "professional"
6. Maximum 6-8 keywords

Examples:
- "لكزس" → "Lexus car luxury sedan photo"
- "سباك" → "plumber plumbing service professional"
- "تصميم شعار" → "logo design professional graphic"

Arabic text: "${query}"

English search keywords:`
        }],
      }),
    });

    if (!response.ok) {
      console.error("❌ AI translation failed:", response.status);
      return query;
    }

    const result = await response.json();
    const translation = result.content?.[0]?.text?.trim() || query;
    
    console.log("✅ AI translated to:", translation);
    return translation;
  } catch (error) {
    console.error("❌ AI translation error:", error);
    return query;
  }
}

// ============================================
// Main Handler
// ============================================
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res({ ok: true });
  }

  try {
    // Parse request body
    let body: ImageSearchRequest;
    try {
      body = await req.json();
    } catch (_e) {
      return res({ error: "Valid JSON body is required" }, 400);
    }

    const { query, count = 5 } = body;

    if (!query || query.trim().length === 0) {
      return res({ error: "Query is required" }, 400);
    }

    console.log(`🔍 Image search for: "${query}"`);

    let images: ImageResult[] = [];
    let source = "";
    let usedQuery = query;

    // Try Google first with ORIGINAL query (Arabic works fine on Google)
    if (GOOGLE_API_KEY && GOOGLE_SEARCH_ENGINE_ID) {
      try {
        console.log("🔎 Trying Google with original query:", query);
        images = await searchGoogleImages(query, count);
        source = "google";
        usedQuery = query;
        console.log(`✅ Google returned ${images.length} images for original query`);
        
        // If no results with original query and it's Arabic, try translated
        if (images.length < 3 && /[\u0600-\u06FF]/.test(query)) {
          console.log("🔄 Few results, trying AI translation...");
          const translatedQuery = await translateQueryWithAI(query);
          if (translatedQuery !== query) {
            console.log("🔎 Trying Google with translated query:", translatedQuery);
            const translatedImages = await searchGoogleImages(translatedQuery, count);
            if (translatedImages.length > images.length) {
              images = translatedImages;
              usedQuery = translatedQuery;
              console.log(`✅ Translated query got more results: ${images.length}`);
            }
          }
        }
      } catch (err) {
        console.warn("⚠️ Google Search failed:", err);
        
        // Try with translation as fallback
        try {
          const translatedQuery = await translateQueryWithAI(query);
          console.log("🔎 Retry with translated query:", translatedQuery);
          images = await searchGoogleImages(translatedQuery, count);
          source = "google";
          usedQuery = translatedQuery;
        } catch (err2) {
          console.warn("⚠️ Translated search also failed:", err2);
        }
      }
    }

    // Fallback to Unsplash
    if (images.length === 0 && UNSPLASH_ACCESS_KEY) {
      try {
        console.log("🔎 Trying Unsplash...");
        images = await searchUnsplashImages(enhancedQuery, count);
        source = "unsplash";
        console.log(`✅ Unsplash returned ${images.length} images`);
      } catch (err) {
        console.warn("⚠️ Unsplash Search failed:", err);
      }
    }

    // Fallback to Pexels
    if (images.length === 0) {
      const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");
      if (PEXELS_API_KEY) {
        try {
          console.log("🔎 Trying Pexels...");
          images = await searchPexelsImages(enhancedQuery, count);
          source = "pexels";
          console.log(`✅ Pexels returned ${images.length} images`);
        } catch (err) {
          console.warn("⚠️ Pexels Search failed:", err);
        }
      }
    }

    // Last resort - return placeholder
    if (images.length === 0) {
      console.log("⚠️ No images found, returning placeholder");
      images = [{
        url: `https://picsum.photos/800/600?random=${Date.now()}`,
        thumbnail: `https://picsum.photos/400/300?random=${Date.now()}`,
        title: "صورة توضيحية",
        source: "picsum.photos",
      }];
      source = "placeholder";
    }

    return res({
      success: true,
      images,
      source,
      query: query,
      used_query: usedQuery,
      count: images.length,
    });

  } catch (e) {
    console.error("Error in image-search:", e);
    return res({ 
      error: "حدث خطأ في البحث عن الصور",
      details: String(e)
    }, 500);
  }
});


