import { createClient } from "@supabase/supabase-js";
import { inviteTable } from "../lib/inviteConfig.js";
import { getServerEnv } from "../lib/serverEnv.js";
import { mergeMessageWithGuestNames, serializeGuestNames } from "../src/lib/guestNames.js";

const participantPayloadVariants = ({
  cleanName,
  cleanPartecipate,
  cleanGuests,
  cleanFoodPreferences,
  cleanMessage,
  cleanGuestNames,
}) => {
  const variants = [];

  ["partecipa", "partecipate"].forEach(participationColumn => {
    [
      { food: true, message: true },
      { food: false, message: true },
      { food: true, message: false },
      { food: false, message: false },
    ].forEach(({ food, message }) => {
      [true, false].forEach(guestNames => {
        variants.push({
          name: cleanName,
          [participationColumn]: cleanPartecipate,
          guests: cleanGuests,
          ...(food ? { food_preferences: cleanFoodPreferences } : {}),
          ...(guestNames ? { guest_names: serializeGuestNames(cleanGuestNames) } : {}),
          ...(message ? { message: guestNames ? cleanMessage : mergeMessageWithGuestNames(cleanMessage, cleanGuestNames) } : {}),
        });
      });
    });
  });

  return variants;
};

const tryInsertParticipant = async (supabase, payloads) => {
  let lastError;

  for (const payload of payloads) {
    const { data, error } = await supabase
      .from(inviteTable)
      .insert([payload])
      .select()
      .single();

    if (!error) {
      return { data, error: null };
    }

    lastError = error;
  }

  return { data: null, error: lastError };
};

export default async function handler(req, res) {
  if (req.method === "POST") {
    const supabaseUrl = getServerEnv("SUPABASE_URL");
    const supabaseKey = getServerEnv("SUPABASE_KEY");

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
    const cleanFoodPreferences = String(req.body.food_preferences || req.body.foodPreferences || "").trim();
    const cleanPartecipate = Boolean(req.body.partecipa ?? req.body.partecipate);
    const cleanGuests = cleanPartecipate ? Math.max(1, Number(guests) || 1) : 0;
    const rawGuestNames = req.body.guest_names || req.body.guestNames || [];
    const cleanGuestNames = Array.isArray(rawGuestNames)
      ? rawGuestNames.map(guestName => String(guestName || "").trim())
        .filter(Boolean)
      : [];

    if (!cleanName) {
      return res.status(400).json({ error: "Il nome è obbligatorio" });
    }

    if (cleanPartecipate && cleanGuestNames.length < cleanGuests) {
      return res.status(400).json({ error: "Inserisci il nome di tutti gli ospiti" });
    }

    const { data, error } = await tryInsertParticipant(
      supabase,
      participantPayloadVariants({
        cleanName,
        cleanPartecipate,
        cleanGuests,
        cleanFoodPreferences,
        cleanMessage,
        cleanGuestNames,
      })
    );

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
