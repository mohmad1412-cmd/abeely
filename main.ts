import { load } from "@std/dotenv";
import { resolve, toFileUrl } from "@std/path";

// 1. Load environment variables from .env
await load({ export: true });

// 2. Map VITE_ key to standard key if needed
if (Deno.env.get("VITE_GEMINI_API_KEY") && !Deno.env.get("GEMINI_API_KEY")) {
    Deno.env.set("GEMINI_API_KEY", Deno.env.get("VITE_GEMINI_API_KEY")!);
}

console.log("Environment loaded. Starting AI Chat Edge Function...");

// 3. Import and run the actual function logic
const functionPath = resolve(Deno.cwd(), "supabase/functions/ai-chat/index.ts");
await import(toFileUrl(functionPath).href);
