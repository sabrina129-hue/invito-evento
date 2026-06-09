import { createClient } from "@supabase/supabase-js";
import { inviteTable } from "../lib/inviteConfig.js";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey || !inviteTable) {
      return res.status(500).json({
        error: "Configurazione Supabase mancante",
        details: "Controlla SUPABASE_URL, SUPABASE_KEY e INVITE_TABLE nelle Environment Variables di Vercel.",
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { name, guests, message } = req.body;
    const cleanName = String(name || "").trim();
    const cleanMessage = String(message || "").trim();
    const cleanPartecipate = Boolean(req.body.partecipa ?? req.body.partecipate);
    const cleanGuests = cleanPartecipate ? Math.max(1, Number(guests) || 1) : 0;

    if (!cleanName) {
      return res.status(400).json({ error: "Il nome è obbligatorio" });
    }

    let { data, error } = await supabase
      .from(inviteTable)
      .insert([{
        name: cleanName,
        partecipa: cleanPartecipate,
        guests: cleanGuests,
        message: cleanMessage,
      }])
      .select()
      .single();

    if (error) {
      ({ data, error } = await supabase
        .from(inviteTable)
        .insert([{
          name: cleanName,
          partecipate: cleanPartecipate,
          guests: cleanGuests,
          message: cleanMessage,
        }])
        .select()
        .single());
    }

    if (error) {
      return res.status(500).json({
        error: "Non sono riuscito a salvare la risposta",
        details: error.message,
        table: inviteTable,
      });
    }

    return res.status(201).json({ data });
  }

  res.status(405).json({ error: "Method not allowed" });
}
