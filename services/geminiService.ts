import Anthropic from "@anthropic-ai/sdk";

// Use Vite environment variable (prefixed with VITE_)
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
const MODEL = "claude-sonnet-4-20250514"; // أو claude-3-5-sonnet-20241022

let anthropic: Anthropic | null = null;

const getAIClient = () => {
    if (!anthropic && API_KEY) {
        anthropic = new Anthropic({ apiKey: API_KEY });
    }
    return anthropic;
};

export const sendMessageToGemini = async (
  message: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
): Promise<string> => {
  const client = getAIClient();
  if (!client) {
    return "عذراً، خدمة الذكاء الاصطناعي غير متوفرة حالياً (API Key missing).";
  }

  try {
    // تحويل التاريخ إلى تنسيق Anthropic
    const messages: Anthropic.MessageParam[] = history.map(h => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: h.parts[0]?.text || ''
    }));

    messages.push({
      role: 'user',
      content: message
    });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: `أنت مساعد ذكي لمنصة "أبيلي". دورك هو مساعدة المستخدمين في صياغة الطلبات والعروض. تحدث بالعربية بمهنية وبلهجة سعودية بيضاء محببة.`,
      messages: messages,
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text || "لم أتمكن من فهم ذلك، هل يمكنك التوضيح؟";
    }
    
    return "لم أتمكن من فهم ذلك، هل يمكنك التوضيح؟";
  } catch (error) {
    console.error("Anthropic Error:", error);
    return "حدث خطأ أثناء الاتصال بالمساعد الذكي.";
  }
};

/**
 * Find approximate images using the image-search Edge Function.
 * Falls back to placeholder if the function is not available.
 */
export const findApproximateImages = async (prompt: string): Promise<string[]> => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // If Supabase is not configured, use fallback
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Supabase not configured, using fallback images");
    return getFallbackImages(prompt);
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/image-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: prompt,
        count: 10,
      }),
    });

    if (!response.ok) {
      console.warn("Image search failed, using fallback");
      return getFallbackImages(prompt);
    }

    const result = await response.json();
    
    if (result.success && result.images && result.images.length > 0) {
      // Return the first image URL (or thumbnail for faster loading)
      return result.images.map((img: { url: string; thumbnail: string }) => img.url || img.thumbnail);
    }

    return getFallbackImages(prompt);
  } catch (error) {
    console.error("Image search error:", error);
    return getFallbackImages(prompt);
  }
};

/**
 * Fallback images based on keywords (used when Edge Function is unavailable)
 */
function getFallbackImages(prompt: string): string[] {
  const keywords = prompt.toLowerCase();
  const images: string[] = [];

  if (keywords.includes('coffee') || keywords.includes('قهوة')) {
     images.push('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=80');
  } else if (keywords.includes('tech') || keywords.includes('code') || keywords.includes('برمجة')) {
     images.push('https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80');
  } else if (keywords.includes('design') || keywords.includes('تصميم')) {
     images.push('https://images.unsplash.com/photo-1626785774573-4b799314346d?auto=format&fit=crop&w=400&q=80');
  } else if (keywords.includes('house') || keywords.includes('منزل') || keywords.includes('building') || keywords.includes('عقار')) {
     images.push('https://images.unsplash.com/photo-1580587771525-78b9dba3b91d?auto=format&fit=crop&w=400&q=80');
  } else if (keywords.includes('تنظيف') || keywords.includes('clean')) {
     images.push('https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80');
  } else if (keywords.includes('سباك') || keywords.includes('plumb')) {
     images.push('https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80');
  } else if (keywords.includes('كهرب') || keywords.includes('electric')) {
     images.push('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80');
  } else if (keywords.includes('سيارة') || keywords.includes('car')) {
     images.push('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=400&q=80');
  } else if (keywords.includes('مكيف') || keywords.includes('تكييف') || keywords.includes('ac')) {
     images.push('https://images.unsplash.com/photo-1631545806609-5bf7e46da9f0?auto=format&fit=crop&w=400&q=80');
  } else {
     images.push(`https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`);
  }

  return images;
}
