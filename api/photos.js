import { getServerEnv } from "../lib/serverEnv.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const cleanName = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9-_ ]/g, "")
  .trim()
  .replace(/\s+/g, "-")
  .slice(0, 52);

const parseImagePayload = body => {
  const mimeType = String(body?.mimeType || "").trim().toLowerCase();
  const base64 = String(body?.base64 || "").trim();

  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    return { error: "Formato non supportato. Usa JPG, PNG o WebP." };
  }

  if (!base64) {
    return { error: "Foto mancante." };
  }

  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    return { error: "La foto e troppo grande. Riprova con un'immagine piu leggera." };
  }

  return { base64, mimeType };
};

const uploadViaWebhook = async ({ webhookUrl, secret, body }) => {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret,
      base64: body.base64,
      mimeType: body.mimeType,
      fileName: body.fileName,
      guestName: body.guestName,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || payload.details || "Upload su Google Drive non riuscito");
  }

  return payload;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webhookUrl = getServerEnv("PHOTO_UPLOAD_WEBHOOK_URL");
  const secret = getServerEnv("PHOTO_UPLOAD_SECRET") || "";

  if (!webhookUrl) {
    return res.status(500).json({
      error: "Configurazione upload foto mancante",
      details: "Imposta PHOTO_UPLOAD_WEBHOOK_URL nelle Environment Variables.",
    });
  }

  if (!secret) {
    return res.status(500).json({
      error: "Configurazione upload foto mancante",
      details: "Imposta PHOTO_UPLOAD_SECRET con lo stesso valore della costante SECRET nello script Google.",
    });
  }

  const parsedImage = parseImagePayload(req.body);
  if (parsedImage.error) {
    return res.status(400).json({ error: parsedImage.error });
  }

  const guestName = String(req.body?.guestName || "").trim();
  const safeGuestName = cleanName(guestName);
  if (!safeGuestName) {
    return res.status(400).json({ error: "Inserisci il tuo nome prima di inviare la foto." });
  }

  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = await uploadViaWebhook({
      webhookUrl,
      secret,
      body: {
        ...parsedImage,
        guestName,
        fileName: `${safeGuestName}-${stamp}.jpg`,
      },
    });

    return res.status(201).json({ success: true, file });
  } catch (error) {
    return res.status(500).json({
      error: "Non siamo riusciti a caricare la foto",
      details: error.message,
    });
  }
}
