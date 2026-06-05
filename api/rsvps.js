import { supabase } from "../lib/supabase.js";

export default async function handler(req, res) {
  const auth = req.headers.authorization;

  if (auth !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return res.status(401).json({ error: "Non autorizzato" });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("partecipanti")
      .select("*")
      .order("id", { ascending: false });

    if (error) return res.status(500).json({ error });
    return res.status(200).json({ data });
  }

  if (req.method === "POST") {
    const { name, partecipate, guests, message } = req.body;
    const cleanName = String(name || "").trim();
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
        message: String(message || "").trim(),
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error });
    return res.status(200).json({ data });
  }

  if (req.method === "PUT") {
    const { id, ...fields } = req.body;
    const cleanPartecipate = Boolean(fields.partecipate);
    const cleanFields = {
      ...fields,
      name: String(fields.name || "").trim(),
      partecipate: cleanPartecipate,
      guests: cleanPartecipate ? Math.max(1, Number(fields.guests) || 1) : 0,
      message: String(fields.message || "").trim(),
    };

    const { data, error } = await supabase
      .from("partecipanti")
      .update(cleanFields)
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ error });
    return res.status(200).json({ data });
  }

  if (req.method === "DELETE") {
    const { id } = req.body;

    const { error } = await supabase
      .from("partecipanti")
      .delete()
      .eq("id", id);

    if (error) return res.status(500).json({ error });
    return res.status(200).json({ success: true });
  }

  res.status(405).end();
}
