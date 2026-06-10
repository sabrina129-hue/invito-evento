import { supabase } from "../lib/supabase.js";
import { inviteTable } from "../lib/inviteConfig.js";
import { getServerEnv } from "../lib/serverEnv.js";

const normalizeParticipant = participant => ({
  ...participant,
  partecipate: participant.partecipa ?? participant.partecipate,
  food_preferences: participant.food_preferences || "",
});

export default async function handler(req, res) {
  const auth = req.headers.authorization;

  if (auth !== `Bearer ${getServerEnv("ADMIN_TOKEN")}`) {
    return res.status(401).json({ error: "Non autorizzato" });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from(inviteTable)
      .select("*")
      .order("id", { ascending: false });

    if (error) return res.status(500).json({ error });
    return res.status(200).json({ data: (data || []).map(normalizeParticipant) });
  }

  if (req.method === "POST") {
    const { name, guests, message } = req.body;
    const cleanName = String(name || "").trim();
    const cleanPartecipate = Boolean(req.body.partecipa ?? req.body.partecipate);
    const cleanGuests = cleanPartecipate ? Math.max(1, Number(guests) || 1) : 0;
    const cleanFoodPreferences = String(req.body.food_preferences || req.body.foodPreferences || "").trim();

    if (!cleanName) {
      return res.status(400).json({ error: "Il nome è obbligatorio" });
    }

    let { data, error } = await supabase
      .from(inviteTable)
      .insert([{
        name: cleanName,
        partecipa: cleanPartecipate,
        guests: cleanGuests,
        food_preferences: cleanFoodPreferences,
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
          food_preferences: cleanFoodPreferences,
          message: String(message || "").trim(),
        }])
        .select()
        .single());
    }

    if (error && String(error.message || "").includes("food_preferences")) {
      ({ data, error } = await supabase
        .from(inviteTable)
        .insert([{
          name: cleanName,
          partecipa: cleanPartecipate,
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
    const cleanPartecipate = Boolean(fields.partecipate ?? fields.partecipa);
    const cleanFields = {
      name: String(fields.name || "").trim(),
      partecipa: cleanPartecipate,
      guests: cleanPartecipate ? Math.max(1, Number(fields.guests) || 1) : 0,
      food_preferences: String(fields.food_preferences || fields.foodPreferences || "").trim(),
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
        food_preferences: cleanFields.food_preferences,
        message: cleanFields.message,
      };

      ({ data, error } = await supabase
        .from(inviteTable)
        .update(fallbackFields)
        .eq("id", id)
        .select()
        .single());
    }

    if (error && String(error.message || "").includes("food_preferences")) {
      const fallbackFields = {
        name: cleanFields.name,
        partecipa: cleanPartecipate,
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
