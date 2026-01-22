import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { name, partecipate, guests, message } = req.body;
    const { data, error } = await supabase
      .from("partecipanti")
      .insert([{ name: name, partecipate: partecipate, guests, message: message }]);
    if (error) return res.status(500).json({ error });

    return res.status(201).json({ data });
  }

  res.status(405).json({ error: "Method not allowed" });
}
