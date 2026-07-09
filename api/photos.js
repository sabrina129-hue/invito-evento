import crypto from "node:crypto";
import { getServerEnv } from "../lib/serverEnv.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const base64Url = value => Buffer.from(value)
  .toString("base64")
  .replace(/=/g, "")
  .replace(/\+/g, "-")
  .replace(/\//g, "_");

const getServiceAccount = () => {
  const rawJson = getServerEnv("GOOGLE_SERVICE_ACCOUNT_JSON");

  if (rawJson) {
    const trimmed = rawJson.trim();
    const candidates = [
      trimmed,
      Buffer.from(trimmed, "base64").toString("utf8"),
    ];

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed.client_email && parsed.private_key) {
          return {
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key.replace(/\\n/g, "\n"),
          };
        }
      } catch {
        // Try the next format.
      }
    }
  }

  const clientEmail = getServerEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = getServerEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

  if (clientEmail && privateKey) {
    return {
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    };
  }

  return null;
};

const getAccessToken = async ({ clientEmail, privateKey }) => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: DRIVE_SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  }));
  const unsignedJwt = `${header}.${claim}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsignedJwt)
    .sign(privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedJwt}.${signature}`,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Autenticazione Google non riuscita");
  }

  return payload.access_token;
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

  return { buffer, mimeType };
};

const extensionForMimeType = mimeType => ({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
})[mimeType] || "jpg";

const cleanName = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9-_ ]/g, "")
  .trim()
  .replace(/\s+/g, "-")
  .slice(0, 48);

const uploadToDrive = async ({ accessToken, folderId, buffer, mimeType, originalName }) => {
  const boundary = `wedding-photo-${crypto.randomUUID()}`;
  const extension = extensionForMimeType(mimeType);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeOriginalName = cleanName(originalName).replace(/\.(jpg|jpeg|png|webp)$/i, "");
  const name = `${stamp}${safeOriginalName ? `-${safeOriginalName}` : ""}.${extension}`;
  const metadata = {
    name,
    mimeType,
    parents: [folderId],
  };
  const preamble = Buffer.from(
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`,
    "utf8",
  );
  const closing = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");

  const response = await fetch(DRIVE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: Buffer.concat([preamble, buffer, closing]),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Upload su Google Drive non riuscito");
  }

  return payload;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const folderId = getServerEnv("GOOGLE_DRIVE_PHOTOS_FOLDER_ID");
  const serviceAccount = getServiceAccount();

  if (!folderId || !serviceAccount) {
    return res.status(500).json({
      error: "Configurazione Google Drive mancante",
      details: "Imposta GOOGLE_DRIVE_PHOTOS_FOLDER_ID e GOOGLE_SERVICE_ACCOUNT_JSON nelle Environment Variables.",
    });
  }

  const parsedImage = parseImagePayload(req.body);
  if (parsedImage.error) {
    return res.status(400).json({ error: parsedImage.error });
  }

  try {
    const accessToken = await getAccessToken(serviceAccount);
    const file = await uploadToDrive({
      accessToken,
      folderId,
      buffer: parsedImage.buffer,
      mimeType: parsedImage.mimeType,
      originalName: req.body?.fileName,
    });

    return res.status(201).json({
      success: true,
      file: {
        id: file.id,
        name: file.name,
        webViewLink: file.webViewLink,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: "Non siamo riusciti a caricare la foto",
      details: error.message,
    });
  }
}
