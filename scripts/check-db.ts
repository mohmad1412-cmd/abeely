import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTestProfiles() {
  console.log("Checking for test profiles...");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, phone, display_name")
    .like("phone", "%555%")
    .limit(10);

  if (error) {
    console.error("Error fetching profiles:", error);
    return;
  }

  console.log("Found profiles:", data);
}

checkTestProfiles();
