import { supabase } from "../lib/supabase.js";
import { inviteTable } from "../lib/inviteConfig.js";
import { getServerEnv } from "../lib/serverEnv.js";

const normalizeParticipant = participant => ({
  ...participant,
  partecipate: participant.partecipa ?? participant.partecipate,
  food_preferences: participant.food_preferences || "",
});

const participantPayloadVariants = ({
  cleanName,
  cleanPartecipate,
  cleanGuests,
  cleanFoodPreferences,
  cleanMessage,
}) => {
  const variants = [];

  ["partecipa", "partecipate"].forEach(participationColumn => {
    [
      { food: true, message: true },
      { food: false, message: true },
      { food: true, message: false },
      { food: false, message: false },
    ].forEach(({ food, message }) => {
      variants.push({
        name: cleanName,
        [participationColumn]: cleanPartecipate,
        guests: cleanGuests,
        ...(food ? { food_preferences: cleanFoodPreferences } : {}),
        ...(message ? { message: cleanMessage } : {}),
      });
    });
  });

  return variants;
};

const tryWriteParticipant = async (operation, payloads) => {
  let lastError;

  for (const payload of payloads) {
    const { data, error } = await operation(payload).select().single();

    if (!error) {
      return { data, error: null };
    }

    lastError = error;
  }

  return { data: null, error: lastError };
};

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
    const cleanMessage = String(message || "").trim();

    if (!cleanName) {
      return res.status(400).json({ error: "Il nome è obbligatorio" });
    }

    const { data, error } = await tryWriteParticipant(
      payload => supabase.from(inviteTable).insert([payload]),
      participantPayloadVariants({
        cleanName,
        cleanPartecipate,
        cleanGuests,
        cleanFoodPreferences,
        cleanMessage,
      })
    );

    if (error) return res.status(500).json({ error, details: error.message, table: inviteTable });
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

    const { data, error } = await tryWriteParticipant(
      payload => supabase.from(inviteTable).update(payload).eq("id", id),
      participantPayloadVariants({
        cleanName: cleanFields.name,
        cleanPartecipate,
        cleanGuests: cleanFields.guests,
        cleanFoodPreferences: cleanFields.food_preferences,
        cleanMessage: cleanFields.message,
      })
    );

    if (error) return res.status(500).json({ error, details: error.message, table: inviteTable });
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
