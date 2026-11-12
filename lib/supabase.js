import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = String(process.env.SUPABASE_URL || "").trim();
// Accept both the project URL and the REST URL copied from the Supabase dashboard.
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
const supabaseKey = String(process.env.SUPABASE_KEY || "").trim();

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

