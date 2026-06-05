import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { name, partecipate, guests, message } = req.body;
    const cleanName = String(name || "").trim();
    const cleanMessage = String(message || "").trim();
    const cleanPartecipate = Boolean(partecipate);
    const cleanGuests = cleanPartecipate ? Math.max(1, Number(guests) || 1) : 0;

    if (!cleanName) {
      return res.status(400).json({ error: "Il nome è obbligatorio" });
    }

    const { data, error } = await supabase
      .from("partecipanti")
      .insert([{
        name: cleanName,
        partecipate: cleanPartecipate,
        guests: cleanGuests,
        message: cleanMessage,
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error });

    return res.status(201).json({ data });
  }

  res.status(405).json({ error: "Method not allowed" });
}
