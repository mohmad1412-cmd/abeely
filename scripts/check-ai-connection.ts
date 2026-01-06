/**
 * Script to check AI and Backend connection status
 * Run with: deno run --allow-net --allow-env scripts/check-ai-connection.ts
 */

import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";

// Load environment variables
const env = config({ path: ".env.local" });

const SUPABASE_URL = env.VITE_SUPABASE_URL || Deno.env.get("VITE_SUPABASE_URL");
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || Deno.env.get("VITE_SUPABASE_ANON_KEY");
const ANTHROPIC_API_KEY = env.VITE_ANTHROPIC_API_KEY || Deno.env.get("VITE_ANTHROPIC_API_KEY");

console.log("🔍 Checking AI and Backend Connection...\n");

// Check 1: Supabase Configuration
console.log("1️⃣ Checking Supabase Configuration...");
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  console.log("   ✅ Supabase URL:", SUPABASE_URL.substring(0, 30) + "...");
  console.log("   ✅ Supabase Anon Key:", SUPABASE_ANON_KEY.substring(0, 20) + "...");
} else {
  console.log("   ❌ Missing Supabase configuration!");
  console.log("   💡 Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local");
}

// Check 2: Anthropic API Key
console.log("\n2️⃣ Checking Anthropic API Key...");
if (ANTHROPIC_API_KEY) {
  console.log("   ✅ Anthropic API Key found:", ANTHROPIC_API_KEY.substring(0, 20) + "...");
} else {
  console.log("   ❌ Missing Anthropic API Key!");
  console.log("   💡 Add VITE_ANTHROPIC_API_KEY to .env.local");
}

// Check 3: Test Edge Function (if Supabase is configured)
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  console.log("\n3️⃣ Testing Edge Function 'ai-chat'...");
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        prompt: "ping",
        mode: "chat",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("   ✅ Edge Function is working!");
      console.log("   📝 Response:", JSON.stringify(data).substring(0, 100) + "...");
    } else {
      const error = await response.text();
      console.log("   ❌ Edge Function error:", response.status, response.statusText);
      console.log("   📝 Details:", error.substring(0, 200));
      console.log("   💡 Make sure:");
      console.log("      - Edge Function is deployed: supabase functions deploy ai-chat");
      console.log("      - ANTHROPIC_API_KEY is set in Supabase Secrets");
    }
  } catch (error) {
    console.log("   ❌ Failed to connect to Edge Function:", error.message);
    console.log("   💡 Check your Supabase URL and network connection");
  }
} else {
  console.log("\n3️⃣ Skipping Edge Function test (Supabase not configured)");
}

// Check 4: Test Direct Anthropic API (if key is available)
if (ANTHROPIC_API_KEY) {
  console.log("\n4️⃣ Testing Direct Anthropic API...");
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 10,
        messages: [{ role: "user", content: "hi" }],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("   ✅ Direct Anthropic API is working!");
      console.log("   📝 Response:", JSON.stringify(data).substring(0, 100) + "...");
    } else {
      const error = await response.json();
      console.log("   ❌ Anthropic API error:", response.status, response.statusText);
      console.log("   📝 Details:", JSON.stringify(error).substring(0, 200));
      console.log("   💡 Check your API key validity");
    }
  } catch (error) {
    console.log("   ❌ Failed to connect to Anthropic API:", error.message);
    console.log("   💡 Check your network connection");
  }
} else {
  console.log("\n4️⃣ Skipping Direct API test (API Key not configured)");
}

// Summary
console.log("\n" + "=".repeat(50));
console.log("📊 Summary:");
console.log("=".repeat(50));

const checks = [
  { name: "Supabase Config", status: !!(SUPABASE_URL && SUPABASE_ANON_KEY) },
  { name: "Anthropic API Key", status: !!ANTHROPIC_API_KEY },
];

checks.forEach((check) => {
  console.log(`   ${check.status ? "✅" : "❌"} ${check.name}`);
});

console.log("\n💡 Next Steps:");
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.log("   1. Add Supabase configuration to .env.local");
}
if (!ANTHROPIC_API_KEY) {
  console.log("   2. Add VITE_ANTHROPIC_API_KEY to .env.local");
}
if (SUPABASE_URL && SUPABASE_ANON_KEY && !ANTHROPIC_API_KEY) {
  console.log("   3. Add ANTHROPIC_API_KEY to Supabase Secrets:");
  console.log("      supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx");
  console.log("   4. Deploy Edge Functions:");
  console.log("      supabase functions deploy ai-chat");
  console.log("      supabase functions deploy customer-service-ai");
}

console.log("\n");

