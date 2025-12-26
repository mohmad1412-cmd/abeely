import { GoogleGenerativeAI } from "@google/generative-ai";

// Use Vite environment variable (prefixed with VITE_)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const MODEL = "gemini-2.0-flash-001";

let genAI: GoogleGenerativeAI | null = null;

const getAIClient = () => {
    if (!genAI && API_KEY) {
        genAI = new GoogleGenerativeAI(API_KEY);
    }
    return genAI;
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
    const model = client.getGenerativeModel({ 
        model: MODEL, // مثال: gemini-2.0-flash-001
    });

    const systemMessage = {
        role: 'user' as const,
        parts: [{ text: `أنت مساعد ذكي لمنصة "أبيلي". دورك هو مساعدة المستخدمين في صياغة الطلبات والعروض. تحدث بالعربية بمهنية وبلهجة سعودية بيضاء محببة.` }]
    };

    const chat = model.startChat({
        history: [
            systemMessage,
            { role: 'model' as const, parts: [{ text: 'فهمت، سأساعدك في صياغة طلبك أو عرضك باحترافية.' }] },
            ...history.map(h => ({
                role: h.role === 'model' ? 'model' as const : 'user' as const,
                parts: [{ text: h.parts[0].text }]
            }))
        ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text() || "لم أتمكن من فهم ذلك، هل يمكنك التوضيح؟";
  } catch (error) {
    console.error("Gemini Error:", error);
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