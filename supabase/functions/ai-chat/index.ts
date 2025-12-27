import "@supabase/functions-js/edge-runtime.d.ts";

const rawKey = Deno.env.get("GEMINI_API_KEY") ||
  Deno.env.get("VITE_GEMINI_API_KEY") || "";
const GEMINI_API_KEY = rawKey.trim();
const MODEL = "gemini-2.0-flash-001";

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

    const { prompt, mode = "chat", history = [] } = body;
    if (!prompt) return res({ error: "prompt required" }, 400);

    if (!GEMINI_API_KEY) {
      return res({ error: "GEMINI_API_KEY is not configured in Supabase Edge Functions" }, 500);
    }

    let systemInstruction = "";
    let responseSchema: any = null;

    if (mode === "draft") {
      systemInstruction = `
أنت مساعد ذكي متخصص في منصة "أبيلي" - منصة سعودية لربط طالبي الخدمات بمقدميها.
هدفك: فهم احتياج العميل بدقة ومساعدته في صياغة طلب واضح ومفصل.

تعليمات مهمة:
1. كن ذكياً، طبيعياً، وعفوياً - تحدث كإنسان حقيقي وليس كروبوت مبرمج على كلمات محددة
2. استخدم لهجة سعودية بيضاء ودودة وراقية
3. إذا كانت الرسالة غامضة أو ناقصة، اسأل أسئلة توضيحية ذكية ومختصرة (isClarification: true)
4. إذا كانت الرسالة واضحة، أنشئ مسودة كاملة مباشرة (isClarification: false)
5. الفئات المتاحة: "خدمات تقنية وبرمجة"، "تصميم وجرافيكس"، "كتابة ومحتوى"، "تسويق ومبيعات"، "هندسة وعمارة"، "خدمات جوال"، "صيانة ومنزل"، "نقل وخدمات لوجستية"، "صحة ولياقة"، "ترجمة ولغات".
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

    const payload: any = {
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        ...history,
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

    return res({
      ...parsed,
      model: MODEL,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return res({ error: String(e) }, 500);
  }
});
