import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "./serverEnv.js";

const supabaseUrl = getServerEnv("SUPABASE_URL");
const supabaseKey = getServerEnv("SUPABASE_KEY");

export const supabase = createClient(supabaseUrl, supabaseKey);

