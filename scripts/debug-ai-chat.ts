import { load } from "@std/dotenv";
import * as path from "@std/path";
import { toFileUrl } from "@std/path";

async function main() {
    // Load .env file from root
    const envPath = path.join(Deno.cwd(), ".env");
    console.log(`Loading .env from ${envPath}...`);

    try {
        const env = await load({ envPath });

        // Map VITE_GEMINI_API_KEY to GEMINI_API_KEY if not already set
        if (env["VITE_GEMINI_API_KEY"] && !Deno.env.get("GEMINI_API_KEY")) {
            console.log("Mapping VITE_GEMINI_API_KEY to GEMINI_API_KEY");
            Deno.env.set("GEMINI_API_KEY", env["VITE_GEMINI_API_KEY"]);
        } else if (env["GEMINI_API_KEY"]) {
            Deno.env.set("GEMINI_API_KEY", env["GEMINI_API_KEY"]);
        }

        if (!Deno.env.get("GEMINI_API_KEY")) {
            console.warn("WARNING: GEMINI_API_KEY is not set!");
        } else {
            console.log("GEMINI_API_KEY is set.");
        }

        console.log("Starting Edge Function...");

        // Import the actual function code
        // usage of explicit file scheme or absolute path to avoid ambiguity
        const functionPath = path.resolve(
            Deno.cwd(),
            "supabase",
            "functions",
            "ai-chat",
            "index.ts",
        );
        await import(toFileUrl(functionPath).href);
    } catch (e) {
        console.error("Error setting up debug environment:", e);
    }
}

if (import.meta.main) {
    main();
}
