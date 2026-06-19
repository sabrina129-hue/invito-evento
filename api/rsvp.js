import { createClient } from "@supabase/supabase-js";
import { inviteTable } from "../lib/inviteConfig.js";
import { getServerEnv } from "../lib/serverEnv.js";

const foodPreferenceTranslations = new Map([
  ["Menu dziecięce", "Menu bambino"],
  ["Gluten (celiakia)", "Glutine (celiachia)"],
  ["Mleko i produkty mleczne (laktoza)", "Latte e derivati (lattosio)"],
  ["Jaja", "Uova"],
  ["Orzechy (włoskie, migdały, laskowe, pistacje itd.)", "Frutta a guscio (noci, mandorle, nocciole, pistacchi, ecc.)"],
  ["Orzeszki ziemne", "Arachidi"],
  ["Soja", "Soia"],
  ["Ryby", "Pesce"],
  ["Skorupiaki", "Crostacei"],
  ["Mięczaki", "Molluschi"],
  ["Sezam", "Sesamo"],
  ["Gorczyca", "Senape"],
  ["Seler", "Sedano"],
  ["Lubin", "Lupini"],
  ["Siarczyny", "Solfiti"],
  ["Wegetariańskie", "Vegetariano"],
  ["Wegańskie", "Vegano"],
]);

const translateFoodPreferenceItem = item => {
  const trimmed = item.trim();
  return foodPreferenceTranslations.get(trimmed) || trimmed;
};

const translateFoodPreferenceList = value => {
  const trimmed = value.trim();

  if (!trimmed || trimmed === "-") {
    return trimmed || "-";
  }

  return trimmed
    .split(",")
    .map(translateFoodPreferenceItem)
    .filter(Boolean)
    .join(", ");
};

const translateFoodPreferencesToItalian = value => {
  const textValue = String(value || "").trim();

  if (!textValue) {
    return "";
  }

  return textValue
    .split("|")
    .map(part => {
      const trimmedPart = part.trim();
      const match = trimmedPart.match(/^(?:Osoba|Persona)\s+(\d+):\s*(.*)$/i);

      if (!match) {
        return translateFoodPreferenceList(trimmedPart);
      }

      return `Persona ${match[1]}: ${translateFoodPreferenceList(match[2])}`;
    })
    .join(" | ");
};

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
    const cleanFoodPreferences = translateFoodPreferencesToItalian(req.body.food_preferences || req.body.foodPreferences);
    const cleanPartecipate = Boolean(req.body.partecipa ?? req.body.partecipate);
    const cleanGuests = cleanPartecipate ? Math.max(1, Number(guests) || 1) : 0;

    if (!cleanName) {
      return res.status(400).json({ error: "Il nome è obbligatorio" });
    }

    const { data, error } = await tryInsertParticipant(
      supabase,
      participantPayloadVariants({
        cleanName,
        cleanPartecipate,
        cleanGuests,
        cleanFoodPreferences,
        cleanMessage,
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
