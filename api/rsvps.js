import { randomUUID } from "node:crypto";
import { supabase } from "../lib/supabase.js";
import { inviteTable } from "../lib/inviteConfig.js";

const normalizeParticipant = participant => ({
  ...participant,
  partecipate: participant.partecipa ?? participant.partecipate,
});

export default async function handler(req, res) {
  const requestId = randomUUID();
  res.setHeader("X-Request-Id", requestId);
  const auth = req.headers.authorization;

  if (auth !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return res.status(401).json({ error: "Non autorizzato", code: "ADMIN_TOKEN_MISMATCH", requestId });
  }

  if (req.method === "GET") {
    try {
      const { data, error } = await supabase
        .from(inviteTable)
        .select("*")
        .order("id", { ascending: false });

      if (error) {
        console.error(JSON.stringify({
          event: "admin.rsvps.read.failure",
          requestId,
          table: inviteTable,
          supabaseCode: error.code || null,
          message: String(error.message || "Unknown error").slice(0, 500),
          details: String(error.details || "").slice(0, 500),
          hint: String(error.hint || "").slice(0, 300),
        }));
        return res.status(500).json({ error: "Non sono riuscito a caricare le risposte", code: "ADMIN_RSVPS_READ_FAILED", requestId });
      }

      console.info(JSON.stringify({ event: "admin.rsvps.read.success", requestId, table: inviteTable, count: data?.length || 0 }));
      return res.status(200).json({ data: (data || []).map(normalizeParticipant), requestId });
    } catch (error) {
      console.error(JSON.stringify({
        event: "admin.rsvps.read.exception",
        requestId,
        table: inviteTable,
        message: String(error?.message || "Unknown error").slice(0, 500),
      }));
      return res.status(500).json({ error: "Non sono riuscito a caricare le risposte", code: "ADMIN_RSVPS_READ_FAILED", requestId });
    }
  }

  if (req.method === "POST") {
    const { name, guests, message } = req.body;
    const cleanName = String(name || "").trim();
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
        message: String(message || "").trim(),
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
          message: String(message || "").trim(),
        }])
        .select()
        .single());
    }

    if (error) return res.status(500).json({ error });
    return res.status(200).json({ data: normalizeParticipant(data) });
  }

  if (req.method === "PUT") {
    const { id, ...fields } = req.body;
    const cleanPartecipate = Boolean(fields.partecipa ?? fields.partecipate);
    const cleanFields = {
      name: String(fields.name || "").trim(),
      partecipa: cleanPartecipate,
      guests: cleanPartecipate ? Math.max(1, Number(fields.guests) || 1) : 0,
      message: String(fields.message || "").trim(),
    };

    let { data, error } = await supabase
      .from(inviteTable)
      .update(cleanFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      const fallbackFields = {
        name: cleanFields.name,
        partecipate: cleanPartecipate,
        guests: cleanFields.guests,
        message: cleanFields.message,
      };

      ({ data, error } = await supabase
        .from(inviteTable)
        .update(fallbackFields)
        .eq("id", id)
        .select()
        .single());
    }

    if (error) return res.status(500).json({ error });
    return res.status(200).json({ data: normalizeParticipant(data) });
  }

  if (req.method === "DELETE") {
    const { id } = req.body;

    const { error } = await supabase
      .from(inviteTable)
      .delete()
      .eq("id", id);

    if (error) return res.status(500).json({ error });
    return res.status(200).json({ success: true });
  }

  res.status(405).end();
}
