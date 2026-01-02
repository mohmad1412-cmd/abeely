// @ts-ignore - Supabase Edge Runtime types
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ============================================
// Configuration - Now using Claude instead of Gemini
// ============================================
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || 
                          Deno.env.get("VITE_ANTHROPIC_API_KEY") || "";
const MODEL = "claude-sonnet-4-20250514";

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
async function suggestNewCategory(label: string, _requestId?: string): Promise<void> {
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

// ============================================
// Call Claude API
// ============================================
async function callClaude(systemPrompt: string, messages: any[]): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Claude API Error:", error);
    throw new Error(error?.error?.message || "Claude API call failed");
  }

  const result = await response.json();
  return result.content?.[0]?.text || "";
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

    if (!ANTHROPIC_API_KEY) {
      console.error("❌ ANTHROPIC_API_KEY is missing!");
      console.error("Available env vars:", Object.keys(Deno.env.toObject()).filter(k => !k.includes("SECRET")));
      return res({ 
        error: "ANTHROPIC_API_KEY غير مهيأ في Supabase Edge Functions",
        solution: "يرجى إضافة ANTHROPIC_API_KEY في: Supabase Dashboard → Settings → Edge Functions → Add new secret",
        command: "supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx"
      }, 500);
    }

    let systemInstruction = "";

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

أجب بـ JSON فقط بهذا التنسيق (بدون أي نص آخر):
{
  "isClarification": boolean,
  "aiResponse": "ردك للعميل",
  "aiResponseBefore": "رسالة ترحيبية قصيرة (فقط إذا isClarification: false)",
  "aiResponseAfter": "نصيحة أو سؤال بعد المسودة (فقط إذا isClarification: false)",
  "title": "عنوان الطلب (فقط إذا isClarification: false)",
  "description": "وصف مفصل للطلب (فقط إذا isClarification: false)",
  "categories": ["فئة1", "فئة2"],
  "budgetMin": "الحد الأدنى (اختياري)",
  "budgetMax": "الحد الأقصى (اختياري)",
  "deliveryTime": "مدة التنفيذ (اختياري)",
  "location": "الموقع (اختياري)",
  "suggestions": ["اقتراح1", "اقتراح2"]
}`;
    } else {
      // Default Chat Mode (original behavior)
      systemInstruction = `أنت مساعد ذكي لمنصة "أبيلي" (منصة طلبات خدمات).
- بلهجة سعودية ودودة وقصيرة.
- هدفك جمع معلومتين: (وصف الخدمة) و (المدينة).
- بمجرد توفر الوصف والمدينة، اجعل is_ready_to_send = true.

أجب بـ JSON فقط:
{
  "title": "عنوان الطلب",
  "city": "المدينة",
  "description_brief": "وصف مختصر",
  "response_to_user": "ردك للمستخدم",
  "is_ready_to_send": boolean
}`;
    }

    // تحويل chatHistory إلى تنسيق Claude
    const claudeMessages: any[] = conversationHistory.map((msg: any) => ({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.text || msg.parts?.[0]?.text || ''
    }));
    
    // إضافة الرسالة الحالية
    claudeMessages.push({
      role: 'user',
      content: prompt
    });

    // استدعاء Claude
    const rawOutput = await callClaude(systemInstruction, claudeMessages);
    
    // محاولة استخراج JSON
    let parsed;
    try {
      // Try to extract JSON from response
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/) || rawOutput.match(/```json\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawOutput;
      parsed = JSON.parse(jsonStr.trim());
    } catch (_e) {
      console.warn("Failed to parse JSON, using raw output");
      parsed = { 
        aiResponse: rawOutput,
        isClarification: true 
      };
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
    console.error("Error in ai-chat:", e);
    return res({ error: String(e) }, 500);
  }
});
