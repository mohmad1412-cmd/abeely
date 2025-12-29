import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const rawKey = Deno.env.get("GEMINI_API_KEY") ||
  Deno.env.get("VITE_GEMINI_API_KEY") || "";
const GEMINI_API_KEY = rawKey.trim();
const MODEL = "gemini-2.0-flash-001";

// Supabase client للتحقق من التصنيفات
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// التصنيفات الثابتة مع كلماتها المفتاحية
const FIXED_CATEGORIES = [
  { id: 'tech', label: 'خدمات تقنية وبرمجة', keywords: ['برمجة', 'تطبيق', 'موقع', 'ويب', 'تقنية', 'سوفتوير', 'نظام', 'أتمتة', 'كود', 'برنامج', 'ذكاء اصطناعي', 'AI'] },
  { id: 'design', label: 'تصميم وجرافيكس', keywords: ['تصميم', 'شعار', 'لوقو', 'جرافيك', 'هوية', 'بصرية', 'صور', 'فوتوشوب', 'اليستريتور'] },
  { id: 'writing', label: 'كتابة ومحتوى', keywords: ['كتابة', 'محتوى', 'مقال', 'تدقيق', 'نصوص', 'صياغة', 'تأليف', 'إنشاء محتوى'] },
  { id: 'marketing', label: 'تسويق ومبيعات', keywords: ['تسويق', 'إعلان', 'حملة', 'سوشيال', 'ميديا', 'دعاية', 'مبيعات', 'ترويج'] },
  { id: 'engineering', label: 'هندسة وعمارة', keywords: ['هندسة', 'عمارة', 'بناء', 'تصميم معماري', 'ديكور', 'مقاول', 'إنشاءات'] },
  { id: 'mobile', label: 'خدمات جوال', keywords: ['جوال', 'موبايل', 'آيفون', 'أندرويد', 'iOS', 'هاتف'] },
  { id: 'maintenance', label: 'صيانة ومنزل', keywords: ['صيانة', 'إصلاح', 'سباكة', 'كهرباء', 'تكييف', 'منزل', 'أجهزة', 'غسالة', 'ثلاجة'] },
  { id: 'transport', label: 'نقل وخدمات لوجستية', keywords: ['نقل', 'شحن', 'توصيل', 'لوجستيك', 'نقليات', 'ترحيل', 'عفش'] },
  { id: 'health', label: 'صحة ولياقة', keywords: ['صحة', 'طب', 'لياقة', 'تغذية', 'علاج', 'استشارة صحية', 'رياضة', 'دايت'] },
  { id: 'translation', label: 'ترجمة ولغات', keywords: ['ترجمة', 'لغة', 'إنجليزي', 'عربي', 'لغات', 'فرنسي'] },
  { id: 'education', label: 'تعليم وتدريب', keywords: ['تعليم', 'تدريب', 'دورة', 'درس', 'تدريس', 'معلم', 'مدرس', 'كورس'] },
  { id: 'legal', label: 'قانون واستشارات', keywords: ['قانون', 'محامي', 'عقد', 'استشارة قانونية', 'توثيق', 'محكمة'] },
  { id: 'finance', label: 'مالية ومحاسبة', keywords: ['مالية', 'محاسبة', 'ضرائب', 'ميزانية', 'استشارة مالية', 'بنك'] },
  { id: 'photography', label: 'تصوير وفيديو', keywords: ['تصوير', 'فيديو', 'مونتاج', 'كاميرا', 'صور', 'مصور'] },
  { id: 'events', label: 'مناسبات وحفلات', keywords: ['حفلة', 'مناسبة', 'عرس', 'زفاف', 'مؤتمر', 'تنظيم', 'زواج', 'حفل'] },
  { id: 'beauty', label: 'تجميل وعناية', keywords: ['تجميل', 'مكياج', 'شعر', 'بشرة', 'عناية', 'صالون'] },
  { id: 'cleaning', label: 'تنظيف وخدمات منزلية', keywords: ['تنظيف', 'نظافة', 'منزل', 'مكتب', 'غسيل', 'شركة نظافة'] },
  { id: 'food', label: 'طعام ومطاعم', keywords: ['طعام', 'طبخ', 'مطعم', 'حلويات', 'تموين', 'كيترنج', 'أكل', 'شيف'] },
  { id: 'car', label: 'سيارات وقطع غيار', keywords: ['سيارة', 'ميكانيكي', 'قطع غيار', 'صيانة سيارة', 'تأجير', 'ورشة'] },
  { id: 'other', label: 'أخرى', keywords: ['أخرى', 'متنوع', 'عام'] },
];

// دالة للتحقق من تطابق التصنيف مع الكلمات المفتاحية
function findMatchingCategories(text: string): string[] {
  const lowerText = text.toLowerCase();
  const matches: { id: string; label: string; score: number }[] = [];
  
  for (const cat of FIXED_CATEGORIES) {
    let score = 0;
    for (const keyword of cat.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    if (score > 0) {
      matches.push({ id: cat.id, label: cat.label, score });
    }
  }
  
  // ترتيب حسب الأكثر تطابقاً
  matches.sort((a, b) => b.score - a.score);
  
  // إرجاع أفضل 3 تصنيفات
  return matches.slice(0, 3).map(m => m.label);
}

// دالة للتحقق مما إذا كان التصنيف موجوداً
function isKnownCategory(label: string): boolean {
  const lowerLabel = label.toLowerCase();
  return FIXED_CATEGORIES.some(cat => 
    cat.label.toLowerCase() === lowerLabel ||
    cat.label.toLowerCase().includes(lowerLabel) ||
    lowerLabel.includes(cat.label.toLowerCase())
  );
}

// دالة لاقتراح تصنيف جديد في قاعدة البيانات
async function suggestNewCategory(label: string, requestId?: string): Promise<void> {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn("Supabase not configured, skipping category suggestion");
      return;
    }
    
    // التحقق من عدم وجود اقتراح مشابه
    const { data: existing } = await supabase
      .from('pending_categories')
      .select('id')
      .ilike('suggested_label', `%${label}%`)
      .eq('status', 'pending')
      .limit(1);
    
    if (existing && existing.length > 0) {
      console.log(`Category suggestion "${label}" already exists`);
      return;
    }
    
    // إضافة الاقتراح
    await supabase
      .from('pending_categories')
      .insert({
        suggested_label: label,
        suggested_emoji: '📦',
        suggested_by_ai: true,
        request_id: requestId || null,
        status: 'pending'
      });
    
    console.log(`New category suggested: "${label}"`);
  } catch (err) {
    console.error("Error suggesting category:", err);
  }
}

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return res({ ok: true });

  try {
    let body;
    try {
      body = await req.json();
    } catch (_e) {
      return res(
        { error: "Valid JSON body is required" },
        400,
      );
    }

    const { prompt, mode = "chat", history = [], chatHistory = [] } = body;
    if (!prompt) return res({ error: "prompt required" }, 400);
    
    // استخدام chatHistory إذا كان متوفراً، وإلا history (للتوافق مع الكود القديم)
    const conversationHistory = chatHistory.length > 0 ? chatHistory : history;

    if (!GEMINI_API_KEY) {
      return res({ error: "GEMINI_API_KEY is not configured in Supabase Edge Functions" }, 500);
    }

    let systemInstruction = "";
    let responseSchema: any = null;

    if (mode === "draft") {
      // بناء نص تاريخ المحادثة إذا كان موجوداً
      const historyText = conversationHistory && conversationHistory.length > 0
        ? conversationHistory.map((msg: any) => {
            const role = msg.role === 'user' ? '👤 العميل' : '🤖 المساعد';
            const text = msg.text || msg.parts?.[0]?.text || '';
            return `${role}: ${text}`;
          }).join('\n\n')
        : '';
      
      // استخراج التصنيفات المقترحة بناءً على النص
      const suggestedCategories = findMatchingCategories(prompt);
      const categoriesHint = suggestedCategories.length > 0 
        ? `\n🎯 تصنيفات مقترحة بناءً على النص: ${suggestedCategories.join('، ')}`
        : '';
      
      systemInstruction = `
أنت مساعد ذكي متخصص في منصة "أبيلي" - منصة سعودية لربط طالبي الخدمات بمقدميها.
هدفك: فهم احتياج العميل بدقة ومساعدته في صياغة طلب واضح ومفصل.

${historyText ? `
═══════════════════════════════════════════════════════════════
📜 تاريخ المحادثة السابقة (استخدمه لفهم السياق الكامل):
═══════════════════════════════════════════════════════════════
${historyText}
═══════════════════════════════════════════════════════════════
` : ''}

تعليمات مهمة:
1. كن ذكياً، طبيعياً، وعفوياً - تحدث كإنسان حقيقي وليس كروبوت مبرمج على كلمات محددة
2. استخدم لهجة سعودية بيضاء ودودة وراقية
3. إذا كانت الرسالة غامضة أو ناقصة، اسأل أسئلة توضيحية ذكية ومختصرة (isClarification: true)
4. إذا كانت الرسالة واضحة، أنشئ مسودة كاملة مباشرة (isClarification: false)

═══════════════════════════════════════════════════════════════
⚠️ تعليمات التصنيف (مهم جداً - اتبعها بدقة):
═══════════════════════════════════════════════════════════════

📋 التصنيفات المتاحة فقط (يجب الاختيار منها حصرياً):
- "خدمات تقنية وبرمجة" (برمجة، تطبيقات، مواقع، أنظمة، ذكاء اصطناعي)
- "تصميم وجرافيكس" (شعارات، هوية بصرية، جرافيك، تصميم صور)
- "كتابة ومحتوى" (مقالات، محتوى، تدقيق لغوي، صياغة)
- "تسويق ومبيعات" (إعلانات، سوشيال ميديا، حملات تسويقية)
- "هندسة وعمارة" (تصميم معماري، ديكور، بناء، مقاولات)
- "خدمات جوال" (تطبيقات جوال، iOS، Android)
- "صيانة ومنزل" (سباكة، كهرباء، تكييف، أجهزة منزلية)
- "نقل وخدمات لوجستية" (شحن، توصيل، نقل عفش، لوجستيك)
- "صحة ولياقة" (استشارات صحية، تغذية، رياضة)
- "ترجمة ولغات" (ترجمة، تعليم لغات)
- "تعليم وتدريب" (دروس خصوصية، دورات، تدريب)
- "قانون واستشارات" (استشارات قانونية، عقود، محاماة)
- "مالية ومحاسبة" (محاسبة، ضرائب، استشارات مالية)
- "تصوير وفيديو" (تصوير، مونتاج، فيديو)
- "مناسبات وحفلات" (تنظيم حفلات، أعراس، مؤتمرات)
- "تجميل وعناية" (مكياج، شعر، عناية بالبشرة)
- "تنظيف وخدمات منزلية" (تنظيف منازل، مكاتب)
- "طعام ومطاعم" (طبخ، تموين، حلويات)
- "سيارات وقطع غيار" (صيانة سيارات، قطع غيار)
- "أخرى" (خدمات متنوعة لا تناسب التصنيفات السابقة)
${categoriesHint}

🚨 قواعد صارمة للتصنيف:
1. اختر فقط من القائمة أعلاه - لا تختلق تصنيفات جديدة أبداً
2. إذا كان الطلب يناسب أكثر من تصنيف، اختر 1-3 تصنيفات من القائمة
3. إذا لم تجد تصنيفاً مناسباً تماماً، اختر "أخرى"
4. لا تضيف isNewCategory أو أي حقل إضافي - فقط استخدم التصنيفات المتاحة
5. التصنيفات يجب أن تكون بالنص العربي الدقيق كما في القائمة

═══════════════════════════════════════════════════════════════
`;
      responseSchema = {
        type: "object",
        properties: {
          isClarification: { type: "boolean" },
          aiResponse: { type: "string" },
          aiResponseBefore: { type: "string" },
          aiResponseAfter: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          categories: { type: "array", items: { type: "string" } },
          budgetMin: { type: "string" },
          budgetMax: { type: "string" },
          deliveryTime: { type: "string" },
          location: { type: "string" },
          suggestions: { type: "array", items: { type: "string" } }
        },
        required: ["isClarification", "aiResponse"]
      };
    } else {
      // Default Chat Mode (original behavior)
      systemInstruction = `أنت مساعد ذكي لمنصة "أبيلي" (منصة طلبات خدمات).
- بلهجة سعودية ودودة وقصيرة.
- هدفك جمع معلومتين: (وصف الخدمة) و (المدينة).
- بمجرد توفر الوصف والمدينة، اجعل is_ready_to_send = true.`;
      responseSchema = {
        type: "object",
        properties: {
          title: { type: "string" },
          city: { type: "string" },
          description_brief: { type: "string" },
          response_to_user: { type: "string" },
          is_ready_to_send: { type: "boolean" },
        },
        required: ["title", "city", "description_brief", "response_to_user", "is_ready_to_send"]
      };
    }

    // تحويل chatHistory إلى تنسيق Gemini (role + parts)
    const geminiHistory = conversationHistory.map((msg: any) => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.text || msg.parts?.[0]?.text || '' }]
    }));
    
    const payload: any = {
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        ...geminiHistory,
        { role: "user", parts: [{ text: prompt }] }
      ],
      generationConfig: {
        response_mime_type: "application/json",
        response_schema: responseSchema,
      },
    };

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const j = await r.json();
    if (!r.ok) {
      console.error("Google AI Error:", JSON.stringify(j, null, 2));
      return res(
        { error: j?.error?.message || "Google AI Error", details: j },
        r.status,
      );
    }

    const rawOutput = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    let parsed;
    try {
      parsed = JSON.parse(rawOutput);
    } catch (_e) {
      parsed = { text: rawOutput };
    }

    // معالجة التصنيفات في وضع draft
    if (mode === "draft" && parsed.categories && Array.isArray(parsed.categories)) {
      const validCategories: string[] = [];
      const newCategories: string[] = [];
      
      for (const cat of parsed.categories) {
        if (isKnownCategory(cat)) {
          // تصنيف معروف - نضيفه مباشرة
          const matchedCat = FIXED_CATEGORIES.find(fc => 
            fc.label.toLowerCase() === cat.toLowerCase() ||
            fc.label.toLowerCase().includes(cat.toLowerCase()) ||
            cat.toLowerCase().includes(fc.label.toLowerCase())
          );
          if (matchedCat) {
            validCategories.push(matchedCat.label);
          } else {
            validCategories.push(cat);
          }
        } else {
          // تصنيف جديد - نقترحه ونضيف "غير محدد"
          newCategories.push(cat);
        }
      }
      
      // إذا كان هناك تصنيفات جديدة
      if (newCategories.length > 0) {
        // اقتراح التصنيفات الجديدة في قاعدة البيانات
        for (const newCat of newCategories) {
          await suggestNewCategory(newCat);
        }
        
        // إضافة "غير محدد" إذا لم يكن هناك تصنيفات صالحة كافية
        if (!validCategories.includes("غير محدد")) {
          validCategories.push("غير محدد");
        }
        
        // إضافة ملاحظة عن التصنيفات الجديدة
        parsed.suggestedNewCategories = newCategories;
        parsed.categoriesNote = `تم اقتراح تصنيفات جديدة (${newCategories.join('، ')}) وستتم مراجعتها. تم إضافة "غير محدد" مؤقتاً.`;
      }
      
      // إذا لم يكن هناك أي تصنيفات صالحة، نضيف "غير محدد"
      if (validCategories.length === 0) {
        validCategories.push("غير محدد");
      }
      
      parsed.categories = [...new Set(validCategories)]; // إزالة التكرار
    }
    
    // إذا لم يكن هناك تصنيفات أصلاً، نضيف "غير محدد"
    if (mode === "draft" && (!parsed.categories || parsed.categories.length === 0)) {
      parsed.categories = ["غير محدد"];
    }

    return res({
      ...parsed,
      model: MODEL,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return res({ error: String(e) }, 500);
  }
});
