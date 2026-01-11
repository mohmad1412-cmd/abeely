import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gfjtyfwwbpjbwafbnfcc.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmanR5Znd3YnBqYndhZmJuZmNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyNzE0MSwiZXhwIjoyMDgzMjAzMTQxfQ._Ue3Mv-rSdL7kD_GwYCeu0ISIkYk9L2FO9-6fkdJ0mw";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log("Using Service Role Key (Admin Access)...");

  // Check Policies
  console.log("Fetching RLS Policies...");
  const { data: policies, error: polError } = await supabase
    .from("pg_policies") // This might not be accessible via PostgREST even with service role usually?
    // Actually pg_policies is a system view. Supabase exposes it?
    // Often not directly. We might need RPC or just check if we can.
    // However, we can try to query it.
    .select("*")
    .in("tablename", ["requests", "offers"]);

  // If pg_policies fails via valid client, we can't do it this way.
  // Alternative: Use the "rpc" to run arbitrary SQL? No.

  if (polError) {
    console.error("Error fetching policies:", polError);
    console.log("Trying to infer policies by behavior...");
  } else {
    console.log("Active Policies:");
    policies.forEach((p) => {
      console.log(
        `- Table: ${p.tablename}, Policy: ${p.policyname}, Cmd: ${p.cmd}, Roles: ${p.roles}`,
      );
      console.log(`  Qual: ${p.qual}`);
      console.log(`  WithCheck: ${p.with_check}`);
    });
  }

  // Double check the OFFER existence and IDs again just to be 100% sure
  const { data: offers, error: offError } = await supabase
    .from("offers")
    .select(`
       id, 
       status, 
       provider_id, 
       request_id,
       request:requests!request_id ( id, author_id )
     `)
    .eq("status", "pending");

  if (offError) {
    console.error("Error fetching offers join:", offError);
  } else {
    console.log(`\nFound ${offers.length} pending offers.`);
    // Filter for the specific one we know about
    const targetOffer = offers.find((o) =>
      o.provider_id === "89e1112b-9139-4402-ae76-fae03637264c"
    );
    if (targetOffer) {
      console.log("Target Offer Found:");
      console.log(JSON.stringify(targetOffer, null, 2));

      if (targetOffer.requests) {
        console.log("Linked Request Author:", targetOffer.requests.author_id);
      } else {
        console.log("CRITICAL: request join failed or is null!");
        // If request is null, then offer.request_id might not match any request?
        // But we assume referential integrity.
      }
    } else {
      console.log("Target offer not found in pending list (found others).");
    }
  }
}

main();
