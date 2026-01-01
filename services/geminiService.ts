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
 * Simulate finding approximate images based on keywords.
 * In a real app, this would use a Search API or a database of categories.
 */
export const findApproximateImages = async (prompt: string): Promise<string[]> => {
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
  } else {
     images.push(`https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`);
  }

  return images;
};
