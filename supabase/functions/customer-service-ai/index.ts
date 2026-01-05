// @ts-ignore - Supabase Edge Runtime types
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ============================================
// Configuration
// ============================================
// Try multiple key names for flexibility
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || 
                          Deno.env.get("VITE_ANTHROPIC_API_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || 
                       Deno.env.get("VITE_OPENAI_API_KEY") || "";
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const OPENAI_MODEL = "gpt-4o";

// Counter for round-robin selection
let requestCounter = 0;

// Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// Types
// ============================================
interface Category {
  id: string; // UUID as string
  label: string;
  emoji: string;
  description?: string;
}

interface CustomerServiceRequest {
  // Input
  text?: string;
  sessionId?: string;
  previousAnswers?: Record<string, string>; // Answers to clarification questions
}

interface AIResponse {
  scratchpad: string;
  language_detected: string;
  clarification_needed: boolean;
  total_pages: number;
  clarification_pages: string[];
  final_review: {
    title: string;
    reformulated_request: string;
    system_category: string;
    new_category_suggestion: string;
    location?: string; // الموقع المستخرج (المدينة أو "عن بعد")
    ui_action: string;
  };
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
// Fetch Categories from Database
// ============================================
async function fetchCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, label, emoji, description')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.warn('Error fetching categories:', error.message);
      return getDefaultCategories();
    }

    if (!data || data.length === 0) {
      return getDefaultCategories();
    }

    return data;
  } catch (err) {
    console.error('Error in fetchCategories:', err);
    return getDefaultCategories();
  }
}

function getDefaultCategories(): Category[] {
  // Fallback categories - these use placeholder UUIDs
  // In production, categories should always come from database
  return [
    { id: 'default-tech', label: 'الدعم التقني', emoji: '💻' },
    { id: 'default-complaints', label: 'الشكاوى والاقتراحات', emoji: '📝' },
    { id: 'default-financial', label: 'الاستفسارات المالية', emoji: '💰' },
    { id: 'default-driving', label: 'طلبات السياقة', emoji: '🚗' },
    { id: 'default-delivery', label: 'خدمات التوصيل', emoji: '📦' },
    { id: 'default-booking', label: 'حجز المواعيد', emoji: '📅' },
    { id: 'default-refund', label: 'استرجاع والغاء', emoji: '↩️' },
    { id: 'default-profile', label: 'تحديث البيانات الشخصية', emoji: '👤' },
    { id: 'default-help', label: 'المساعدة في استخدام التطبيق', emoji: '❓' },
    { id: 'default-partnership', label: 'طلبات الشراكة', emoji: '🤝' },
    { id: 'default-jobs', label: 'التوظيف والعمل', emoji: '💼' },
    { id: 'default-other', label: 'أخرى', emoji: '📋' },
  ];
}

function formatCategoriesForPrompt(categories: Category[]): string {
  // Use label only (not UUID) - AI will match by label name
  return categories
    .map(cat => `- ${cat.emoji} ${cat.label}${cat.description ? `: ${cat.description}` : ''}`)
    .join('\n');
}

// Find category by label (returns the category or null)
function findCategoryByLabel(categories: Category[], label: string): Category | null {
  const lowerLabel = label.toLowerCase().trim();
  return categories.find(cat => 
    cat.label.toLowerCase() === lowerLabel ||
    cat.label.toLowerCase().includes(lowerLabel) ||
    lowerLabel.includes(cat.label.toLowerCase())
  ) || null;
}

// ============================================
// Unified AI Provider (Anthropic or OpenAI)
// ============================================
async function callAnthropic(systemPrompt: string, messages: any[]): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Anthropic API Error:", error);
    throw new Error(error?.error?.message || "Anthropic API call failed");
  }

  const result = await response.json();
  return result.content?.[0]?.text || "";
}

async function callOpenAI(systemPrompt: string, messages: any[]): Promise<string> {
  // Convert messages to OpenAI format (include system in messages array)
  const openAIMessages: any[] = [
    { role: "system", content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content
    }))
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: openAIMessages,
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("OpenAI API Error:", error);
    throw new Error(error?.error?.message || "OpenAI API call failed");
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || "";
}

async function callAIUnified(systemPrompt: string, messages: any[]): Promise<{ text: string; provider: string; model: string }> {
  // Round-robin: alternate between providers
  requestCounter++;
  const hasAnthropic = !!ANTHROPIC_API_KEY;
  const hasOpenAI = !!OPENAI_API_KEY;
  
  if (!hasAnthropic && !hasOpenAI) {
    throw new Error("No AI provider configured. Please set ANTHROPIC_API_KEY or OPENAI_API_KEY");
  }
  
  let targetProvider: "anthropic" | "openai";
  if (!hasAnthropic) {
    targetProvider = "openai";
  } else if (!hasOpenAI) {
    targetProvider = "anthropic";
  } else {
    // Both available - use round-robin
    targetProvider = (requestCounter % 2 === 0) ? "openai" : "anthropic";
  }

  // Try the target provider, fallback to the other if it fails
  try {
    if (targetProvider === "anthropic") {
      const text = await callAnthropic(systemPrompt, messages);
      return { text, provider: "anthropic", model: ANTHROPIC_MODEL };
    } else {
      const text = await callOpenAI(systemPrompt, messages);
      return { text, provider: "openai", model: OPENAI_MODEL };
    }
  } catch (error) {
    console.warn(`⚠️ ${targetProvider} failed, trying fallback...`, error);
    
    // Fallback to the other provider
    const fallbackProvider = targetProvider === "anthropic" ? "openai" : "anthropic";
    
    if (fallbackProvider === "anthropic" && ANTHROPIC_API_KEY) {
      try {
        const text = await callAnthropic(systemPrompt, messages);
        return { text, provider: "anthropic", model: ANTHROPIC_MODEL };
      } catch (fallbackError) {
        throw new Error(`Both providers failed. Last error: ${fallbackError.message}`);
      }
    } else if (fallbackProvider === "openai" && OPENAI_API_KEY) {
      try {
        const text = await callOpenAI(systemPrompt, messages);
        return { text, provider: "openai", model: OPENAI_MODEL };
      } catch (fallbackError) {
        throw new Error(`Both providers failed. Last error: ${fallbackError.message}`);
      }
    }
    
    throw error;
  }
}

// ============================================
// Build System Prompt
// ============================================
function buildSystemPrompt(categoriesFormatted: string): string {
  return `# System Prompt: The Abeely Linguistic Orchestrator

## Role
You are the Operational Brain of Abeely (أبيلي), a smart mediator marketplace. Your goal is to process user inputs (text or synthesized voice notes) into structured, professional requests. Users can request SERVICES or want to BUY/SELL products.

## CRITICAL: Saudi Dialect Understanding

**VERY IMPORTANT - Common Saudi Words:**
- "جيب" when followed by a product (car, phone, etc.) = a TYPE of vehicle (SUV/4x4), NOT "bring me"!
  - "جيب لكزس" = Lexus SUV (the vehicle type)
  - "جيب تويوتا" = Toyota SUV (Land Cruiser, FJ, etc.)
  - "أبي جيب" = I want an SUV
- "جيب" alone (imperative) = bring me (but this is rare in marketplace context)
- "أبي/أبغى" = I want (could be to buy, rent, or get a service)

**Request Type Detection:**
- BUYING: When user mentions product + price (e.g., "جيب لكزس بقيمة 300 ألف" = wants to BUY a Lexus SUV for 300k)
- SELLING: When user says "أبي أبيع" or mentions selling
- SERVICE: When user needs someone to DO something (تصليح، صيانة، تركيب، تنظيف، etc.)

## Linguistic Rule (The Mirror Principle)

**Match the User:** You must respond and reformulate using the EXACT same language and dialect the user used:
- If they use Saudi Najdi dialect → use polished Najdi
- If they use Saudi Hijazi dialect → use polished Hijazi  
- If they use Egyptian Arabic → respond in Egyptian
- If they use English → respond in English
- If they use Urdu/Hindi → respond in that language
- If they mix languages → intelligently mirror the mix

**Tone:** Professional, helpful, and native-like. Avoid overly formal language if the user is casual, but maintain professionalism.

## User Journey Logic

### 1. Background Synthesis
You may receive one or multiple inputs (text or follow-up answers). Synthesize them into a single coherent intent.

### 2. Clarity Assessment
- **If the request is clear:** Set \`clarification_needed\` to \`false\` and proceed directly to \`final_review\`
- **If vague/incomplete:** Generate the ABSOLUTE MINIMUM number of questions needed (Max 5 pages)
  - Each question should be on a separate "page"
  - Questions must be in the user's dialect/language
  - Format: "Page X/Y: [Question]"

### 3. Location Extraction

Extract location information from the user's input:
- Look for city names (الرياض، جدة، الدمام، مكة، المدينة، الطائف، تبوك، خميس مشيط، إلخ)
- If user mentions "عن بعد" or "أونلاين" or "online" → set location to "عن بعد"
- If no location mentioned → set location to null or empty string
- Location should be a single city name or "عن بعد"

### 4. Categorization Logic

**Available Categories:**
${categoriesFormatted}

**Rules:**
1. **Match Found:** Assign to the most appropriate existing category
2. **No Match:** Set \`system_category\` to "غير محدد" (Unspecified) and provide a meaningful \`new_category_suggestion\` for Admin approval
3. **Multiple Categories:** If request spans multiple, choose the PRIMARY one

## Output Format (STRICT JSON - No other text!)

You MUST output ONLY valid JSON in this exact format:

{
  "scratchpad": "Your internal reasoning in English: intent analysis, language detection rationale, categorization strategy. IMPORTANT: Note if this is a BUY/SELL request vs SERVICE request.",
  "language_detected": "e.g., Arabic-Najdi, Arabic-Hijazi, Arabic-Egyptian, English, Urdu, Mixed-Arabic-English",
  "clarification_needed": boolean,
  "total_pages": number,
  "clarification_pages": [
    "Page 1/X: [Question in user's dialect/language]",
    "Page 2/X: [Question in user's dialect/language]"
  ],
  "final_review": {
    "title": "[Concise title reflecting EXACTLY what user wants - max 60 chars. For buying: 'شراء X' or 'طلب X'. For services: describe the service. NEVER add words the user didn't imply!]",
    "reformulated_request": "[Professional, complete version of the request in user's language. Expand on details when helpful.]",
    "system_category": "[Exact category ID from the list OR 'غير محدد']",
    "new_category_suggestion": "[If system_category is 'غير محدد', suggest a new category name. Otherwise: 'لا يوجد']",
    "location": "[City name like 'الرياض' or 'جدة' or 'عن بعد' if remote, or null if not mentioned]",
    "ui_action": "show_confirmation_screen"
  }
}

## Title Examples
- "جيب لكزس بقيمة 300 ألف" → "شراء جيب لكزس بميزانية 300 ألف" (NOT "خدمة لكزس"!)
- "أبي أحد يصلح مكيف" → "تصليح مكيف"
- "أبي سباك" → "طلب سباك"
- "عندي ايفون أبي أبيعه" → "بيع ايفون"

## Important Rules
1. NEVER output anything except valid JSON
2. If clarification_needed is false, clarification_pages should be empty array []
3. total_pages should match the length of clarification_pages (0 if no clarification needed)
4. Always fill final_review even if clarification is needed (use best guess)
5. The reformulated_request should be polished and professional while keeping the user's dialect
6. Be concise in clarification questions - one focused question per page
7. NEVER use "خدمة" in the title unless the user is actually requesting a SERVICE (someone to do work for them)
8. For product requests (buy/sell), use appropriate verbs: شراء، بيع، طلب`;
}

// ============================================
// Call AI (Anthropic or OpenAI)
// ============================================
async function callAI(systemPrompt: string, userMessage: string, previousContext?: string): Promise<AIResponse> {
  const messages: any[] = [];
  
  // Add previous context if exists
  if (previousContext) {
    messages.push({
      role: "user",
      content: previousContext
    });
    messages.push({
      role: "assistant", 
      content: "أفهم. سأأخذ هذه المعلومات بالاعتبار."
    });
  }

  // Add current message
  messages.push({
    role: "user",
    content: userMessage
  });

  const { text: textContent, provider, model } = await callAIUnified(systemPrompt, messages);

  if (!textContent) {
    throw new Error(`No response from ${provider}`);
  }

  console.log(`✅ ${provider} (${model}) response received`);

  // Parse JSON from response
  try {
    // Try to extract JSON if wrapped in markdown code blocks
    const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/) || 
                      textContent.match(/(\{[\s\S]*\})/);
    
    const jsonStr = jsonMatch ? jsonMatch[1] : textContent;
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error(`Failed to parse ${provider} response:`, textContent);
    throw new Error("Failed to parse AI response as JSON");
  }
}

// ============================================
// Save Category Suggestion
// ============================================
async function saveCategorySuggestion(suggestion: string, requestContext: string): Promise<void> {
  if (!suggestion || suggestion === "لا يوجد") return;

  try {
    // Check if similar suggestion exists
    const { data: existing } = await supabase
      .from('pending_categories')
      .select('id')
      .ilike('suggested_label', `%${suggestion}%`)
      .eq('status', 'pending')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`Category suggestion "${suggestion}" already exists`);
      return;
    }

    // Insert new suggestion
    await supabase
      .from('pending_categories')
      .insert({
        suggested_label: suggestion,
        suggested_emoji: '📋',
        suggested_description: `Suggested from request: ${requestContext.slice(0, 200)}`,
        suggested_by_ai: true,
        status: 'pending'
      });

    console.log(`New category suggested: "${suggestion}"`);
  } catch (err) {
    console.error("Error saving category suggestion:", err);
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
    let body: CustomerServiceRequest;
    try {
      body = await req.json();
    } catch (_e) {
      return res({ error: "Valid JSON body is required" }, 400);
    }

    const { text, previousAnswers } = body;

    // ============================================
    // Step 1: Get user input (text only)
    // ============================================
    const userInput = text || "";

    if (!userInput.trim()) {
      return res({ error: "يرجى إدخال نص" }, 400);
    }

    // ============================================
    // Step 2: Fetch categories from database
    // ============================================
    console.log("📁 Fetching categories from database...");
    const categories = await fetchCategories();
    const categoriesFormatted = formatCategoriesForPrompt(categories);
    console.log(`✅ Loaded ${categories.length} categories`);

    // ============================================
    // Step 3: Build context from previous answers
    // ============================================
    let previousContext = "";
    if (previousAnswers && Object.keys(previousAnswers).length > 0) {
      previousContext = "المعلومات السابقة من المستخدم:\n" + 
        Object.entries(previousAnswers)
          .map(([q, a]) => `س: ${q}\nج: ${a}`)
          .join("\n\n");
    }

    // ============================================
    // Step 4: Build prompt and call AI
    // ============================================
    console.log("🤖 Calling AI API (Anthropic or OpenAI)...");
    const systemPrompt = buildSystemPrompt(categoriesFormatted);
    const aiResponse = await callAI(systemPrompt, userInput, previousContext);

    // ============================================
    // Step 5: Map category label to UUID
    // ============================================
    let categoryId: string | null = null;
    let categoryLabel = aiResponse.final_review?.system_category || "غير محدد";
    
    // Find the category by label
    const matchedCategory = findCategoryByLabel(categories, categoryLabel);
    if (matchedCategory) {
      categoryId = matchedCategory.id;
      categoryLabel = matchedCategory.label; // Use exact label
    } else {
      // No match found - use "غير محدد" and suggest new category
      const unspecifiedCat = categories.find(c => c.label === "غير محدد");
      categoryId = unspecifiedCat?.id || null;
      categoryLabel = "غير محدد";
      
      // Save the original category as a suggestion
      if (aiResponse.final_review?.system_category && 
          aiResponse.final_review.system_category !== "غير محدد") {
        await saveCategorySuggestion(
          aiResponse.final_review.system_category,
          userInput
        );
        aiResponse.final_review.new_category_suggestion = aiResponse.final_review.system_category;
      }
    }

    // ============================================
    // Step 6: Save new category suggestion if any
    // ============================================
    if (aiResponse.final_review?.new_category_suggestion && 
        aiResponse.final_review.new_category_suggestion !== "لا يوجد") {
      await saveCategorySuggestion(
        aiResponse.final_review.new_category_suggestion,
        userInput
      );
    }

    // Update response with resolved category info
    if (aiResponse.final_review) {
      aiResponse.final_review.system_category = categoryLabel;
    }

    // ============================================
    // Step 7: Return response
    // ============================================
    return res({
      success: true,
      data: aiResponse,
      resolved_category: {
        id: categoryId,
        label: categoryLabel,
      },
      meta: {
        categories_count: categories.length,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (e) {
    console.error("Error in customer-service-ai:", e);
    return res({ 
      error: "حدث خطأ في معالجة الطلب",
      details: String(e)
    }, 500);
  }
});

