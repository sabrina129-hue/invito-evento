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
const PHOTO_TYPES = new Set(["instant", "upload"]);
const MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const cleanName = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9-_ ]/g, "")
  .trim()
  .replace(/\s+/g, "-")
  .slice(0, 52);

const normalizePhotoType = value => (
  PHOTO_TYPES.has(String(value || "").trim()) ? String(value || "").trim() : "instant"
);

const inferPhotoType = photo => {
  const explicitType = normalizePhotoType(photo.photoType || photo.source || photo.type);
  if (explicitType === "upload") {
    return "upload";
  }

  const name = String(photo.name || photo.fileName || "").toLowerCase();
  return name.includes("-upload-") || name.includes("_upload_") ? "upload" : "instant";
};

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
      photoType: body.photoType,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || payload.details || "Upload su Google Drive non riuscito");
  }

  return payload;
};

const postToWebhook = async ({ webhookUrl, secret, body }) => {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, ...body }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || payload.details || "Operazione foto non riuscita");
  }

  return payload;
};

const normalizePhotoList = photos => photos
  .filter(Boolean)
  .map((photo, index) => {
    const id = String(photo.id || photo.fileId || "").trim();
    const imageUrl = id
      ? `/api/photos?id=${encodeURIComponent(id)}`
      : String(photo.url || photo.imageUrl || photo.thumbnailUrl || "").trim();

    return {
      id: id || `photo-${index}`,
      imageUrl,
      name: String(photo.name || photo.fileName || `Foto ${index + 1}`),
      guestName: String(photo.guestName || photo.author || ""),
      createdTime: String(photo.createdTime || photo.createdAt || photo.date || ""),
      photoType: inferPhotoType(photo),
    };
  })
  .filter(photo => photo.imageUrl);

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webhookUrl = getServerEnv("PHOTO_UPLOAD_WEBHOOK_URL");
  const secret = getServerEnv("PHOTO_UPLOAD_SECRET") || "";

  if (!webhookUrl) {
    return res.status(500).json({
      error: "Configurazione foto mancante",
      details: "Imposta PHOTO_UPLOAD_WEBHOOK_URL nelle Environment Variables.",
    });
  }

  if (!secret) {
    return res.status(500).json({
      error: "Configurazione foto mancante",
      details: "Imposta PHOTO_UPLOAD_SECRET con lo stesso valore della costante SECRET nello script Google.",
    });
  }

  if (req.method === "GET") {
    try {
      const fileId = String(req.query?.id || "").trim();

      if (fileId) {
        const payload = await postToWebhook({
          webhookUrl,
          secret,
          body: { action: "get", fileId },
        });
        const mimeType = String(payload.mimeType || "image/jpeg");
        const base64 = String(payload.base64 || "");

        if (!base64) {
          return res.status(404).json({ error: "Foto non trovata" });
        }

        const buffer = Buffer.from(base64, "base64");
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Cache-Control", "public, max-age=300");
        return res.status(200).send(buffer);
      }

      const payload = await postToWebhook({
        webhookUrl,
        secret,
        body: { action: "list" },
      });
      const photos = normalizePhotoList(payload.photos || payload.files || []);

      return res.status(200).json({ success: true, photos });
    } catch (error) {
      const details = error.message === "Foto mancante"
        ? "Lo script Google non gestisce ancora la galleria. Aggiorna Apps Script con le azioni list e get documentate in CONFIGURAZIONE_INVITI.md."
        : error.message;

      return res.status(500).json({
        error: "Non siamo riusciti a caricare la galleria",
        details,
      });
    }
  }

  const parsedImage = parseImagePayload(req.body);
  if (parsedImage.error) {
    return res.status(400).json({ error: parsedImage.error });
  }

  const guestName = String(req.body?.guestName || "").trim();
  const safeGuestName = cleanName(guestName);
  const photoType = normalizePhotoType(req.body?.photoType);
  if (!safeGuestName) {
    return res.status(400).json({ error: "Inserisci il tuo nome prima di inviare la foto." });
  }

  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const extension = MIME_EXTENSIONS[parsedImage.mimeType] || "jpg";
    const file = await uploadViaWebhook({
      webhookUrl,
      secret,
      body: {
        ...parsedImage,
        guestName,
        photoType,
        fileName: `${safeGuestName}-${photoType}-${stamp}.${extension}`,
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
