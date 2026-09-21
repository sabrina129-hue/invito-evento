import { createClient } from "@supabase/supabase-js";
import { inviteTable } from "../lib/inviteConfig.js";
import { getServerEnv } from "../lib/serverEnv.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = getServerEnv("CRON_SECRET");
  const auth = req.headers.authorization;

  if (!cronSecret) {
    return res.status(500).json({
      error: "CRON_SECRET non configurato",
      details: "Aggiungi CRON_SECRET alle Environment Variables di Vercel.",
    });
  }

  if (auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Non autorizzato" });
  }

  const supabaseUrl = getServerEnv("SUPABASE_URL");
  const supabaseKey = getServerEnv("SUPABASE_KEY");

  if (!supabaseUrl || !supabaseKey || !inviteTable) {
    return res.status(500).json({
      error: "Configurazione Supabase mancante",
      details: "Controlla SUPABASE_URL, SUPABASE_KEY e INVITE_TABLE nelle Environment Variables di Vercel.",
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from(inviteTable)
    .select("id")
    .limit(1);

  if (error) {
    return res.status(500).json({
      error: "Keep-awake Supabase fallito",
      details: error.message,
      table: inviteTable,
    });
  }

  return res.status(200).json({
    success: true,
    table: inviteTable,
    rowsRead: data?.length || 0,
    checkedAt: new Date().toISOString(),
  });
}
