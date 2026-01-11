import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Helper to parse .env file
function parseEnv(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const env: Record<string, string> = {};
    content.split("\n").forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        let value = match[2].trim();
        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        env[match[1].trim()] = value;
      }
    });
    return env;
  } catch (e) {
    console.error("Could not read file:", filePath);
    return {};
  }
}

const envPath = path.resolve(process.cwd(), ".env.local");
const env = parseEnv(envPath);

const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL ||
  "";
// Try Service Role Key first, then Anon Key
const supabaseKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key in .env.local. Values found:", {
    url: !!supabaseUrl,
    key: !!supabaseKey,
    hasServiceRole: !!env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Using Supabase URL:", supabaseUrl);
  // Do not log the full key for security, just the start
  console.log("Using Key:", supabaseKey.substring(0, 10) + "...");
  console.log("Is Service Role?", !!env.VITE_SUPABASE_SERVICE_ROLE_KEY);

  console.log("Searching for request...");
  const { data: requests, error: reqError } = await supabase
    .from("requests")
    .select("id, title, author_id, status")
    .ilike("title", "%كاتب قانوني%");

  if (reqError) {
    console.error("Error fetching requests:", reqError);
    return;
  }

  if (!requests || requests.length === 0) {
    console.log("No request found with that title.");
    return;
  }

  console.log(`Found ${requests.length} requests:`);

  for (const req of requests) {
    console.log(
      `\nRequest: ${req.title} (ID: ${req.id}) - Status: ${req.status}`,
    );
    console.log(`Author ID: ${req.author_id}`);

    // Check offers
    const { data: offers, error: offError } = await supabase
      .from("offers")
      .select("*")
      .eq("request_id", req.id);

    if (offError) {
      console.error("Error fetching offers:", offError);
      continue;
    }

    if (!offers || offers.length === 0) {
      console.log("  -> NO OFFERS found for this request.");
    } else {
      console.log(`  -> Found ${offers.length} offers:`);
      offers.forEach((o) => {
        console.log(
          `     - Offer ID: ${o.id}, Status: ${o.status}, Provider: ${o.provider_id}`,
        );
      });
    }
  }
}

main();
