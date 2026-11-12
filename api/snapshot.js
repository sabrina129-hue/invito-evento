import { randomUUID } from "node:crypto";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export default async function handler(req, res) {
  const requestId = randomUUID();
  res.setHeader("X-Request-Id", requestId);

  const fail = (status, code, error, diagnostics = {}) => {
    console.error(JSON.stringify({ event: "snapshot.failure", requestId, code, ...diagnostics }));
    return res.status(status).json({ error, code, requestId });
  };

  if (req.method !== "POST") {
    return fail(405, "METHOD_NOT_ALLOWED", "Metodo non consentito");
  }

  const { PHOTO_UPLOAD_WEBHOOK_URL, PHOTO_UPLOAD_SECRET } = process.env;
  const missing = [
    ["PHOTO_UPLOAD_WEBHOOK_URL", PHOTO_UPLOAD_WEBHOOK_URL],
    ["PHOTO_UPLOAD_SECRET", PHOTO_UPLOAD_SECRET],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length) {
    return fail(500, "SCRIPT_CONFIG_MISSING", "Il salvataggio foto non è ancora configurato", { missing });
  }

  const dataUrl = req.body?.photo;
  const match = typeof dataUrl === "string" && dataUrl.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[1].length > 2_800_000) {
    return fail(400, "INVALID_IMAGE", "Foto non valida o troppo grande");
  }

  const image = Buffer.from(match[1], "base64");
  if (image.length < 4 || image.length > MAX_IMAGE_BYTES || image[0] !== 0xff || image[1] !== 0xd8 || image[2] !== 0xff) {
    return fail(400, "INVALID_IMAGE", "Foto non valida o troppo grande", { imageBytes: image.length });
  }

  try {
    const response = await fetch(PHOTO_UPLOAD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upload",
        secret: PHOTO_UPLOAD_SECRET,
        base64: match[1],
        mimeType: "image/jpeg",
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success !== true) {
      return fail(502, "SCRIPT_UPLOAD_FAILED", "Google Apps Script non è riuscito a salvare la foto", {
        upstreamStatus: response.status,
        upstreamError: String(result.error || "Risposta del webhook non valida").slice(0, 200),
      });
    }

    console.info(JSON.stringify({ event: "snapshot.success", requestId, imageBytes: image.length }));
    return res.status(201).json({ success: true, requestId });
  } catch (error) {
    return fail(502, "SCRIPT_CONNECTION_FAILED", "Non riesco a raggiungere Google Apps Script", {
      message: String(error?.message || "Unknown error").slice(0, 300),
    });
  }
}
