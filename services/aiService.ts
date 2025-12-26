import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.0-flash-exp";
const FALLBACK_MODEL = "gemini-1.5-flash";

let client: GoogleGenerativeAI | null = null;

const getClient = () => {
  if (!client && apiKey) client = new GoogleGenerativeAI(apiKey);
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

export async function generateDraftWithCta(
  text: string,
  attachments?: File[],
  audioBlob?: Blob,
): Promise<AIDraft & { isClarification?: boolean; aiResponse: string }> {
  const gemini = getClient();
  if (!gemini) {
    return {
      summary: text,
      aiResponse: "عذراً، يبدو أن هناك مشكلة في الربط مع المساعد الذكي.",
    };
  }

  const prompt = `
أنت مساعد ذكي متخصص في منصة "أبيلي" - منصة سعودية لربط طالبي الخدمات بمقدميها.
هدفك: فهم احتياج العميل بدقة ومساعدته في صياغة طلب واضح ومفصل.

تعليمات مهمة:
1. كن ذكياً، طبيعياً، وعفوياً - تحدث كإنسان حقيقي وليس كروبوت مبرمج على كلمات محددة
2. استخدم لهجة سعودية بيضاء ودودة وراقية، وتجنب تكرار الكلمات الافتتاحية مثل (أبشر، أبشرك، يا طيب) في كل رسالة
3. نوّع في أسلوبك (مثلاً: سم، من عيوني، أبشر، تم، كفو، ياليت توضح لي، وش في بالك؟) واستخدمها في مكانها المناسب فقط
4. لا تلتزم بقالب ثابت، خلّك مرن وتفاعل مع كلام العميل بذكاء وفهم عميق
5. إذا كانت الرسالة غامضة أو ناقصة، اسأل أسئلة توضيحية ذكية ومختصرة (isClarification: true)
6. إذا كانت الرسالة واضحة، أنشئ مسودة كاملة مباشرة (isClarification: false)
7. استخرج المعلومات بذكاء من النص - لا تكرر ما قاله العميل حرفياً بل صغه باحترافية
8. الفئات: اختر من 1-3 فئات مناسبة للطلب من القائمة التالية (يجب استخدام الأسماء الدقيقة):
   - "خدمات تقنية وبرمجة" (للتطبيقات والبرمجة والأنظمة التقنية)
   - "تصميم وجرافيكس" (للتصميم والشعارات والجرافيكس)
   - "كتابة ومحتوى" (للكتابة والمحتوى النصي)
   - "تسويق ومبيعات" (للتسويق والمبيعات والدعاية)
   - "هندسة وعمارة" (للأعمال الهندسية والمعمارية)
   - "خدمات جوال" (لتطبيقات الجوال والصيانة)
   - "صيانة ومنزل" (للصيانة والخدمات المنزلية)
   - "نقل وخدمات لوجستية" (للنقل والشحن والخدمات اللوجستية)
   - "صحة ولياقة" (للخدمات الصحية واللياقة)
   - "ترجمة ولغات" (للترجمة والخدمات اللغوية)
   إذا لم يكن هناك فئة مناسبة تماماً، اختر الأقرب منطقياً أو أنشئ فئة جديدة واضحة ومنطقية
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

نص العميل: """${text || (attachments && attachments.length > 0 ? "تم إرسال صور بدون نص" : audioBlob ? "تم إرسال تسجيل صوتي بدون نص" : "")}"""

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
`;

  try {
    // Try both the latest and stable models
    const modelsToTry = [MODEL_NAME, FALLBACK_MODEL];
    
    // Prepare content parts
    const parts: any[] = [{ text: prompt }];
    
    // Add images/attachments
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        // Only process image files
        if (file.type.startsWith('image/')) {
          try {
            const base64Data = await fileToBase64(file);
            const mimeType = getMimeType(file);
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            });
          } catch (err) {
            console.error(`Error processing image ${file.name}:`, err);
          }
        }
      }
    }
    
    // Add audio
    if (audioBlob) {
      try {
        // Convert audio blob to base64
        const audioBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });
        
        // Determine audio MIME type (default to webm)
        const audioMimeType = audioBlob.type || 'audio/webm';
        
        parts.push({
          inlineData: {
            data: audioBase64,
            mimeType: audioMimeType,
          },
        });
      } catch (err) {
        console.error('Error processing audio:', err);
      }
    }
    
    // Try multiple models in order of preference
    let lastError: any = null;
    for (const modelName of modelsToTry) {
      try {
        console.log(`🔄 جاري تجربة النموذج: ${modelName}`);
        const model = gemini.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(parts);
        const content = result.response.text();
        
        if (content) {
          console.log(`✅ نجح استخدام النموذج: ${modelName}`);
          return extractJson(content);
        }
      } catch (err: any) {
        console.warn(`⚠️ فشل النموذج ${modelName}:`, err.message);
        lastError = err;
        // Continue to next model
        continue;
      }
    }
    
    // If all models failed, throw the last error
    throw lastError || new Error("فشل جميع النماذج");
  } catch (err: any) {
    console.error("Gemini interaction error", err);
    
    // Handle specific error types
    if (err?.message?.includes("quota") || err?.message?.includes("Quota")) {
      return {
        summary: text,
        aiResponse: "⚠️ تم تجاوز الحد المجاني لـ Gemini API. يرجى التحقق من مفتاح API أو ترقية الحساب.",
        isClarification: true,
      } as any;
    }
    
    if (err?.message?.includes("API key") || err?.message?.includes("invalid")) {
      return {
        summary: text,
        aiResponse: "⚠️ مفتاح Gemini API غير صحيح أو غير موجود. يرجى إضافة VITE_GEMINI_API_KEY في ملف .env",
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
let aiConnectionCache: {connected: boolean; error?: string; timestamp: number} | null = null;
const AI_CACHE_DURATION = 60000; // 1 minute

export async function checkAIConnection(): Promise<{connected: boolean; error?: string}> {
  const startTime = Date.now();
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e4b972a3-10fd-4bed-a97d-4392044af213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiService.ts:checkAIConnection',message:'checkAIConnection called',data:{startTime,hasCachedResult:!!aiConnectionCache,cacheAge:aiConnectionCache?Date.now()-aiConnectionCache.timestamp:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  
  // Return cached result if still valid
  if (aiConnectionCache && (Date.now() - aiConnectionCache.timestamp) < AI_CACHE_DURATION) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e4b972a3-10fd-4bed-a97d-4392044af213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiService.ts:checkAIConnection',message:'returning cached result',data:{connected:aiConnectionCache.connected,duration:0},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return { connected: aiConnectionCache.connected, error: aiConnectionCache.error };
  }
  
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn("⚠️ VITE_GEMINI_API_KEY غير موجود في ملف .env");
    const result = { connected: false, error: "VITE_GEMINI_API_KEY غير موجود في ملف .env" };
    aiConnectionCache = { ...result, timestamp: Date.now() };
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e4b972a3-10fd-4bed-a97d-4392044af213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiService.ts:checkAIConnection',message:'no API key',data:{duration:Date.now()-startTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    return result;
  }

  const gemini = getClient();
  if (!gemini) {
    console.error("❌ فشل في إنشاء عميل Gemini");
    const result = { connected: false, error: "فشل في إنشاء عميل Gemini" };
    aiConnectionCache = { ...result, timestamp: Date.now() };
    return result;
  }

  // Try multiple models with a short timeout to avoid blocking UI
  const modelsToTry = [MODEL_NAME, FALLBACK_MODEL];
  let lastError: any = null;
  
  for (const modelName of modelsToTry) {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/e4b972a3-10fd-4bed-a97d-4392044af213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiService.ts:checkAIConnection',message:'trying model',data:{modelName,elapsed:Date.now()-startTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      const model = gemini.getGenerativeModel({ model: modelName });
      
      // Add timeout to prevent blocking
      const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`AI connection timeout for ${modelName} (3s)`)), 3000)
      );
      
      const result = await Promise.race([
        model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] }),
        timeout
      ]) as any;
      
      const content = result.response?.text();
      
      if (content) {
        console.log(`✅ الاتصال بالذكاء الاصطناعي ناجح باستخدام: ${modelName}`);
        const successResult = { connected: true };
        aiConnectionCache = { ...successResult, timestamp: Date.now() };
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/e4b972a3-10fd-4bed-a97d-4392044af213',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'aiService.ts:checkAIConnection',message:'AI connected successfully',data:{duration:Date.now()-startTime,modelName},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        
        return successResult;
      }
    } catch (err: any) {
      console.warn(`⚠️ فشل النموذج ${modelName}:`, err.message);
      lastError = err;
      // Continue to next model if this one fails
    }
  }
  
  // If we get here, all models failed
  const failResult = { connected: false, error: lastError?.message || "فشلت جميع نماذج الذكاء الاصطناعي" };
  aiConnectionCache = { ...failResult, timestamp: Date.now() };
  return failResult;
}
