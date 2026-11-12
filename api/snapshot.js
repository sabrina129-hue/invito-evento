import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { google } from "googleapis";

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

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN, GOOGLE_DRIVE_FOLDER_ID } = process.env;
  const missing = [
    ["GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID],
    ["GOOGLE_CLIENT_SECRET", GOOGLE_CLIENT_SECRET],
    ["GOOGLE_DRIVE_REFRESH_TOKEN", GOOGLE_DRIVE_REFRESH_TOKEN],
    ["GOOGLE_DRIVE_FOLDER_ID", GOOGLE_DRIVE_FOLDER_ID],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length) {
    return fail(500, "DRIVE_CONFIG_MISSING", "Il salvataggio foto non è ancora configurato", { missing });
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
    const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    auth.setCredentials({ refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN });
    const drive = google.drive({ version: "v3", auth });
    const suffix = randomUUID().slice(0, 8);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    await drive.files.create({
      requestBody: {
        name: `istantanea-laurea-corrado-${timestamp}-${suffix}.jpg`,
        mimeType: "image/jpeg",
        parents: [GOOGLE_DRIVE_FOLDER_ID],
      },
      media: { mimeType: "image/jpeg", body: Readable.from(image) },
      fields: "id",
    });

    console.info(JSON.stringify({ event: "snapshot.success", requestId, imageBytes: image.length }));
    return res.status(201).json({ success: true, requestId });
  } catch (error) {
    return fail(500, "DRIVE_UPLOAD_FAILED", "Google Drive non è riuscito a salvare la foto", {
      googleStatus: error?.response?.status || null,
      message: String(error?.message || "Unknown error").slice(0, 400),
    });
  }
}
