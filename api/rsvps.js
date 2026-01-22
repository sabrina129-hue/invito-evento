import { supabase } from "../lib/supabase.js";

export default async function handler(req, res) {
  const auth = req.headers.authorization;

  if (auth !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return res.status(401).json({ error: "Non autorizzato" });
  }

  // GET – lista partecipanti
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("partecipanti")
      .select("*")
      .order("id", { ascending: false });

    if (error) return res.status(500).json({ error });
    return res.status(200).json({ data });
  }

  // POST – crea nuovo partecipante
  if (req.method === "POST") {
    const { name, partecipate, guests, message } = req.body;

    const { data, error } = await supabase
      .from("partecipanti")
      .insert([{ name, partecipate, guests, message }]);

    if (error) return res.status(500).json({ error });
    return res.status(200).json({ data });
  }

  // PUT – modifica partecipante
  if (req.method === "PUT") {
    const { id, ...fields } = req.body;

    const { data, error } = await supabase
      .from("partecipanti")
      .update(fields)
      .eq("id", id);

    if (error) return res.status(500).json({ error });
    return res.status(200).json({ data });
  }

  // DELETE – elimina partecipante
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
