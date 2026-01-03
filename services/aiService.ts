import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "./supabaseClient";

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
const MODEL_NAME = "claude-sonnet-4-20250514"; // أو claude-3-5-sonnet-20241022

let client: Anthropic | null = null;

const getClient = () => {
  if (!client && apiKey) client = new Anthropic({ apiKey });
  return client;
};

export type AIDraft = {
  summary?: string;
  title?: string;
  description?: string;
  categories?: string[];
  budgetMin?: string;
  budgetMax?: string;
  deliveryTime?: string;
  location?: string;
  ctaMessage?: string;
  aiResponseBefore?: string;
  aiResponseAfter?: string;
  suggestions?: string[];
  budgetType?: "fixed" | "negotiable" | "not-specified";
};

// Helper function to extract JSON
function extractJson(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("JSON Parse Error", e);
    return { summary: text };
  }
}

// Helper function to convert file to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper function to get MIME type from file
function getMimeType(file: File): string {
  return file.type || 'application/octet-stream';
}

// نوع رسالة المحادثة
export type ChatHistoryMessage = {
  role: "user" | "ai";
  text: string;
};

export async function generateDraftWithCta(
  text: string,
  attachments?: File[],
  audioBlob?: Blob,
  chatHistory?: ChatHistoryMessage[], // تاريخ المحادثة السابقة
): Promise<AIDraft & { isClarification?: boolean; aiResponse: string }> {
  // 1. Try Supabase Edge Function first (Secure, handles API key on server)
  try {
    console.log("🔄 Calling Supabase Edge Function 'ai-chat' (draft mode)...");
    const { data, error } = await supabase.functions.invoke("ai-chat", {
      body: { 
        prompt: text,
        mode: "draft",
        chatHistory: chatHistory || [], // إرسال تاريخ المحادثة
      },
    });

    if (!error && data) {
      console.log("✅ AI response from Supabase Edge Function:", data);
      return data;
    }
    
    if (error) {
      console.error("❌ Supabase Edge Function Error:", {
        message: error.message,
        name: error.name,
        context: error.context,
        details: JSON.stringify(error, null, 2)
      });
      
      // إذا كان الخطأ متعلق بـ ANTHROPIC_API_KEY
      if (error.message?.includes("ANTHROPIC_API_KEY") || 
          error.context?.body?.includes("ANTHROPIC_API_KEY")) {
        return {
          summary: text,
          aiResponse: "⚠️ خدمة الذكاء الاصطناعي غير مهيئة في السيرفر. يرجى التواصل مع الدعم الفني لإضافة ANTHROPIC_API_KEY في Supabase Edge Functions.",
          isClarification: true,
        } as any;
      }
      
      console.warn("⚠️ Supabase function error, falling back to direct API:", error);
    }
  } catch (err: any) {
    console.error("❌ Failed to invoke Supabase function:", {
      message: err?.message,
      stack: err?.stack
    });
    console.warn("⚠️ Falling back to direct API...");
  }

  // 2. Fallback to direct client-side call (if VITE_ANTHROPIC_API_KEY exists)
  const anthropic = getClient();
  if (!anthropic) {
    console.error("❌ No Anthropic client available. VITE_ANTHROPIC_API_KEY:", apiKey ? "موجود" : "غير موجود");
    return {
      summary: text,
      aiResponse: `⚠️ خدمة الذكاء الاصطناعي غير متوفرة حالياً.

**الحل:**
1. تأكد من إضافة ANTHROPIC_API_KEY في Supabase Edge Functions
2. أو أضف VITE_ANTHROPIC_API_KEY في متغيرات البيئة

للمساعدة، تواصل مع الدعم الفني.`,
      isClarification: true,
    };
  }

  // بناء تاريخ المحادثة لتنسيق Anthropic
  const conversationHistory: Anthropic.MessageParam[] = chatHistory && chatHistory.length > 0
    ? chatHistory.map(msg => ({
        role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.text
      }))
    : [];

  const systemPrompt = `
أنت مساعد ذكي متخصص في منصة "أبيلي" - منصة سعودية لربط طالبي الخدمات بمقدميها.
هدفك: فهم احتياج العميل بدقة ومساعدته في صياغة طلب واضح ومفصل.

═══════════════════════════════════════════════════════════════
🎯 قاعدة ذهبية (مهم جداً - اتبعها بدقة):
═══════════════════════════════════════════════════════════════
**النص الذي يكتبه المستخدم هو طلب مباشر لما يريده أو يبحث عنه.**

⚠️ تحويل تلقائي للطلبات:
- إذا كتب "تصميم شعار" → حوّله لـ "مطلوب تصميم شعار" أو "أبغى تصميم شعار" أو "ابحث عن مصمم شعار"
- إذا كتب "صيانة مكيف" → حوّله لـ "مطلوب صيانة مكيف" أو "أبغى فني تكييف"
- إذا كتب "مدرس رياضيات" → حوّله لـ "مطلوب مدرس رياضيات" أو "أبغى معلم خصوصي رياضيات"
- إذا كتب "سباك" → حوّله لـ "مطلوب سباك" أو "أبغى سباك"
- إذا كتب "برمجة موقع" → حوّله لـ "مطلوب برمجة موقع" أو "أبغى مبرمج موقع"

🚫 ممنوع تماماً:
- لا تقل "خدمة" في البداية (مثل: "خدمة تصميم شعار" ❌)
- لا تفترض أنه لغز أو سؤال مخفي - النص هو المطلوب بالضبط!
- لا تكرر نفس الكلمات - حوّل النص لصيغة طلب واضحة ومباشرة

✅ الصيغة الصحيحة:
- استخدم: "مطلوب..." أو "أبغى..." أو "ابحث عن..." أو "أحتاج..."
- العنوان والوصف يجب أن يعكسا الطلب مباشرة بدون كلمة "خدمة" في البداية

═══════════════════════════════════════════════════════════════

تعليمات مهمة:
1. كن ذكياً، طبيعياً، وعفوياً - تحدث كإنسان حقيقي وليس كروبوت مبرمج على كلمات محددة
2. استخدم لهجة سعودية بيضاء ودودة وراقية، وتجنب تكرار الكلمات الافتتاحية مثل (أبشر، أبشرك، يا طيب) في كل رسالة
3. نوّع في أسلوبك (مثلاً: سم، من عيوني، أبشر، تم، كفو، ياليت توضح لي، وش في بالك؟) واستخدمها في مكانها المناسب فقط
4. لا تلتزم بقالب ثابت، خلّك مرن وتفاعل مع كلام العميل بذكاء وفهم عميق
5. إذا كانت الرسالة غامضة أو ناقصة، اسأل أسئلة توضيحية ذكية ومختصرة (isClarification: true)
6. إذا كانت الرسالة واضحة، أنشئ مسودة كاملة مباشرة (isClarification: false)
7. استخرج المعلومات بذكاء من النص - لا تكرر ما قاله العميل حرفياً بل صغه باحترافية
8. حوّل النص المكتوب مباشرة لصيغة طلب واضحة (مطلوب/أبغى/ابحث عن) بدون إضافة كلمة "خدمة" في البداية
8. الفئات: اختر من 1-3 فئات مناسبة للطلب من القائمة التالية فقط (يجب استخدام الأسماء الدقيقة):
   - "خدمات تقنية وبرمجة" (برمجة، تطبيقات، مواقع، أنظمة)
   - "تصميم وجرافيكس" (شعارات، هوية بصرية، جرافيك)
   - "كتابة ومحتوى" (مقالات، محتوى، تدقيق لغوي)
   - "تسويق ومبيعات" (إعلانات، سوشيال ميديا، حملات)
   - "هندسة وعمارة" (تصميم معماري، ديكور، بناء)
   - "خدمات جوال" (تطبيقات جوال، iOS، Android)
   - "صيانة ومنزل" (سباكة، كهرباء، تكييف، أجهزة)
   - "نقل وخدمات لوجستية" (شحن، توصيل، نقل عفش)
   - "صحة ولياقة" (استشارات صحية، تغذية، رياضة)
   - "ترجمة ولغات" (ترجمة، تعليم لغات)
   - "تعليم وتدريب" (دروس، دورات، تدريب)
   - "قانون واستشارات" (استشارات قانونية، عقود)
   - "مالية ومحاسبة" (محاسبة، ضرائب)
   - "تصوير وفيديو" (تصوير، مونتاج)
   - "مناسبات وحفلات" (حفلات، أعراس، مؤتمرات)
   - "تجميل وعناية" (مكياج، شعر، عناية)
   - "تنظيف وخدمات منزلية" (تنظيف منازل، مكاتب)
   - "طعام ومطاعم" (طبخ، تموين، حلويات)
   - "سيارات وقطع غيار" (صيانة سيارات، قطع غيار)
   - "أخرى" (خدمات متنوعة)
   ⚠️ مهم جداً: لا تختلق تصنيفات جديدة - اختر فقط من القائمة أعلاه. إذا لم تجد تصنيفاً مناسباً، اختر "أخرى"
9. العنوان: أنشئ عنواناً احترافياً وجذاباً يعكس جوهر الطلب
10. الوصف: وسّع الوصف بأسلوب فني ومهني بناءً على حاجة العميل المقروءة أو المسموعة أو المرئية (الصور)

${attachments && attachments.length > 0 ? `
⚠️ مهم جداً: تم إرفاق ${attachments.length} صورة/صور مع الرسالة.
- حلّل الصور بدقة واستخرج المعلومات منها
- إذا كانت الصور تحتوي على نص، اقرأه واستخدمه في الوصف
- إذا كانت الصور توضح نوع الخدمة المطلوبة، استخدمها لتحديد الفئات والوصف
- ادمج المعلومات من الصور مع النص المكتوب
` : ''}

${audioBlob ? `
⚠️ مهم جداً: تم إرفاق تسجيل صوتي مع الرسالة.
- استمع للتسجيل الصوتي بدقة
- اكتب النص المنطوق في الوصف
- استخدم المعلومات من التسجيل الصوتي لتحديد تفاصيل الطلب
- ادمج المعلومات من التسجيل الصوتي مع النص المكتوب (إن وجد)
` : ''}

المخرجات المطلوبة (JSON فقط، بدون أي نص إضافي):
{
  "isClarification": boolean,
  "aiResponse": "ردك العام للعميل",
  "aiResponseBefore": "رسالة ترحيبية قصيرة قبل عرض المسودة (فقط إذا isClarification: false)",
  "aiResponseAfter": "نصيحة أو سؤال بعد عرض المسودة (فقط إذا isClarification: false)",
  "title": "عنوان واضح للطلب (فقط إذا isClarification: false)",
  "description": "وصف مفصل وموسع للطلب (فقط إذا isClarification: false)",
  "categories": ["فئة1", "فئة2"],
  "budgetMin": "الحد الأدنى للميزانية (فقط إذا ورد في النص)",
  "budgetMax": "الحد الأقصى للميزانية (فقط إذا ورد في النص)",
  "deliveryTime": "مدة التنفيذ (فقط إذا ورد في النص)",
  "location": "الموقع (فقط إذا ورد في النص)",
  "suggestions": ["اقتراح1", "اقتراح2"]
}

ملاحظات:
- إذا كان النص غامضاً جداً (أقل من 10 كلمات بدون تفاصيل)، ضع isClarification: true
- لا تختلق معلومات - استخدم فقط ما ورد في النص
- إذا لم يذكر العميل ميزانية أو موقع أو مدة، اتركها فارغة
- الفئات يجب أن تكون مناسبة للطلب وواضحة
- أرجِع JSON فقط بدون أي نص إضافي قبل أو بعد JSON
`;

  try {
    console.log(`🔄 جاري استخدام النموذج: ${MODEL_NAME}`);
    
    // بناء الرسائل
    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory,
    ];

    // بناء محتوى الرسالة (نص + صور)
    const userContent: (Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[] = [];
    
    // إضافة النص
    const userText = text || (attachments && attachments.length > 0 ? "تم إرسال صور بدون نص" : audioBlob ? "تم إرسال تسجيل صوتي بدون نص" : "");
    if (userText) {
      userContent.push({ type: 'text', text: userText });
    }

    // إضافة الصور
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        if (file.type.startsWith('image/')) {
          try {
            const base64Data = await fileToBase64(file);
            const mimeType = getMimeType(file);
            // تحويل MIME type إلى نوع مدعوم من Anthropic
            let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/png';
            if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
              mediaType = 'image/jpeg';
            } else if (mimeType === 'image/png') {
              mediaType = 'image/png';
            } else if (mimeType === 'image/gif') {
              mediaType = 'image/gif';
            } else if (mimeType === 'image/webp') {
              mediaType = 'image/webp';
            }
            userContent.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            });
          } catch (err) {
            console.error(`Error processing image ${file.name}:`, err);
          }
        }
      }
    }

    // إضافة رسالة المستخدم
    messages.push({
      role: 'user',
      content: userContent.length > 0 ? userContent : [{ type: 'text', text: userText || '' }]
    });

    // ملاحظة: Anthropic API لا يدعم الصوت حالياً بشكل مباشر
    if (audioBlob) {
      console.warn("⚠️ Anthropic API لا يدعم الصوت حالياً، سيتم تجاهل التسجيل الصوتي");
    }
    
    const response = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages,
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const textContent = content.text;
      console.log(`✅ نجح استخدام النموذج: ${MODEL_NAME}`);
      return extractJson(textContent);
    }
    
    throw new Error("لم يتم الحصول على نص من الرد");
  } catch (err: any) {
    console.error("Anthropic interaction error", err);
    
    // Handle specific error types
    if (err?.message?.includes("quota") || err?.message?.includes("Quota") || err?.status === 429) {
      return {
        summary: text,
        aiResponse: "⚠️ تم تجاوز الحد المسموح لـ Anthropic API. يرجى التحقق من مفتاح API أو ترقية الحساب.",
        isClarification: true,
      } as any;
    }
    
    if (err?.message?.includes("API key") || err?.message?.includes("invalid") || err?.status === 401) {
      return {
        summary: text,
        aiResponse: "⚠️ مفتاح Anthropic API غير صحيح أو غير موجود. يرجى إضافة VITE_ANTHROPIC_API_KEY في ملف .env",
        isClarification: true,
      } as any;
    }
    
    return {
      summary: text,
      aiResponse: "عذراً، حدث خطأ في الاتصال بالمساعد الذكي. يرجى المحاولة مرة أخرى.",
      isClarification: true,
    } as any;
  }
}

// Alias for backward compatibility
export const classifyAndDraft = generateDraftWithCta;

/**
 * Check if AI service is properly configured
 */
// Cache the AI connection status to avoid repeated slow checks
let aiConnectionCache: {connected: boolean; error?: string; timestamp: number} | null = (() => {
  try {
    const saved = localStorage.getItem('abeely_ai_connection_cache');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only use if less than 30 minutes old
      if (Date.now() - parsed.timestamp < 1800000) return parsed;
    }
  } catch (e) {}
  return null;
})();

const AI_CACHE_DURATION = 600000; // 10 minutes

export async function checkAIConnection(): Promise<{connected: boolean; error?: string}> {
  // Return cached result if still valid
  if (aiConnectionCache && (Date.now() - aiConnectionCache.timestamp) < AI_CACHE_DURATION) {
    return { connected: aiConnectionCache.connected, error: aiConnectionCache.error };
  }
  
  // ... rest of function ...
  
  // 1. Try checking Edge Function first
  try {
    const { data, error } = await supabase.functions.invoke("ai-chat", {
      body: { prompt: "ping", mode: "chat" },
    });
    
    if (!error && data) {
      console.log("✅ Supabase Edge Function 'ai-chat' is healthy.");
      const result = { connected: true };
      aiConnectionCache = { ...result, timestamp: Date.now() };
      localStorage.setItem('abeely_ai_connection_cache', JSON.stringify(aiConnectionCache));
      return result;
    }
  } catch (err) {
    console.warn("⚠️ Edge Function check failed:", err);
  }

  // 2. Fallback to checking direct API key
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.warn("⚠️ VITE_ANTHROPIC_API_KEY غير موجود في ملف .env");
    const result = { connected: false, error: "VITE_ANTHROPIC_API_KEY غير موجود في ملف .env" };
    aiConnectionCache = { ...result, timestamp: Date.now() };
    localStorage.setItem('abeely_ai_connection_cache', JSON.stringify(aiConnectionCache));
    return result;
  }

  const anthropic = getClient();
  if (!anthropic) {
    console.error("❌ فشل في إنشاء عميل Anthropic");
    const result = { connected: false, error: "فشل في إنشاء عميل Anthropic" };
    aiConnectionCache = { ...result, timestamp: Date.now() };
    localStorage.setItem('abeely_ai_connection_cache', JSON.stringify(aiConnectionCache));
    return result;
  }

  // Try connection with a short timeout to avoid blocking UI
  const modelName = MODEL_NAME;
  
  try {
    // Add timeout to prevent blocking
    const timeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("AI connection timeout (5s)")), 5000)
    );
    
    const result = await Promise.race([
      anthropic.messages.create({
        model: modelName,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'hi' }],
      }),
      timeout
    ]) as any;
    
    if (result?.content?.[0]?.type === 'text') {
      console.log(`✅ الاتصال بالذكاء الاصطناعي ناجح باستخدام: ${modelName}`);
      const successResult = { connected: true };
      aiConnectionCache = { ...successResult, timestamp: Date.now() };
      localStorage.setItem('abeely_ai_connection_cache', JSON.stringify(aiConnectionCache));
      return successResult;
    }
  } catch (err: any) {
    console.warn(`⚠️ فشل النموذج ${modelName}:`, err.message);
    const failResult = { connected: false, error: err.message };
    aiConnectionCache = { ...failResult, timestamp: Date.now() };
    localStorage.setItem('abeely_ai_connection_cache', JSON.stringify(aiConnectionCache));
    return failResult;
  }
  
  // If we get here, something unexpected happened
  const unknownResult = { connected: false, error: "Unknown error" };
  aiConnectionCache = { ...unknownResult, timestamp: Date.now() };
  return unknownResult;
}
