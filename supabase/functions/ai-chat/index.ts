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
        { error: "Valid JSON body with 'prompt' field is required" },
        400,
      );
    }

    const { prompt } = body;
    if (!prompt) return res({ error: "prompt required" }, 400);

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `أنت مساعد ذكي لمنصة "عبيلي" (منصة طلبات خدمات).
              - بلهجة الطالب (لهجة سعودية ودودة وقصيرة).
              - ردودك يجب أن تكون مختصرة جداً.
              - هدفك جمع معلومتين: (وصف الخدمة) و (المدينة).
              - إذا نقصت المدينة، استفسر عنها. إذا قال "المدينة غير محددة"، اعتبرها مدخلة.
              - بمجرد توفر الوصف والمدينة، اجعل is_ready_to_send = true.
              - في response_to_user: إذا كان is_ready_to_send = true، قل شيئاً مثل (أبشر، أرسل طلبك الآن بالضغط على الزر أدناه) وأضف النص [اضغط زر إرسال الطلب الآن].`,
            }],
          },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            response_schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                city: { type: "string" },
                description_brief: { type: "string" },
                response_to_user: { type: "string" },
                is_ready_to_send: { type: "boolean" },
              },
              required: [
                "title",
                "city",
                "description_brief",
                "response_to_user",
                "is_ready_to_send",
              ],
            },
          },
        }),
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
