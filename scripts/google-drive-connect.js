import http from "node:http";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { google } from "googleapis";

const redirectUri = "http://localhost:8787/oauth2callback";
const credentialsPath = process.argv[2] || "google-oauth-client.json";
const file = JSON.parse(await readFile(credentialsPath, "utf8"));
const client = file.web || file.installed;

if (!client?.client_id || !client?.client_secret) {
  throw new Error("Il file OAuth deve contenere client_id e client_secret.");
}
if (!(client.redirect_uris || []).includes(redirectUri)) {
  throw new Error(`Aggiungi ${redirectUri} tra i redirect URI del client OAuth.`);
}

const oauth = new google.auth.OAuth2(client.client_id, client.client_secret, redirectUri);
const state = randomBytes(24).toString("hex");
const authUrl = oauth.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  state,
  scope: ["https://www.googleapis.com/auth/drive.file"],
});

const server = http.createServer(async (req, res) => {
  const callback = new URL(req.url, redirectUri);
  if (callback.pathname !== "/oauth2callback") {
    res.writeHead(404).end("Non trovato");
    return;
  }
  if (callback.searchParams.get("state") !== state) {
    res.writeHead(400).end("Richiesta OAuth non valida. Puoi chiudere questa finestra.");
    server.close();
    return;
  }

  const code = callback.searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("Autorizzazione Google non completata. Puoi chiudere questa finestra.");
    server.close();
    return;
  }

  try {
    const { tokens } = await oauth.getToken(code);
    if (!tokens.refresh_token) throw new Error("Google non ha restituito il refresh token. Riprova autorizzando di nuovo l’app.");
    oauth.setCredentials(tokens);
    const drive = google.drive({ version: "v3", auth: oauth });
    const { data: folder } = await drive.files.create({
      requestBody: {
        name: "Istantanee Laurea Corrado",
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<p>Google Drive collegato. Puoi chiudere questa scheda e copiare i valori dal terminale.</p>");
    console.log("\nCartella creata su Google Drive. Aggiungi queste variabili in Vercel:");
    console.log(`GOOGLE_CLIENT_ID=${client.client_id}`);
    console.log("GOOGLE_CLIENT_SECRET=<client_secret nel file OAuth>");
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`GOOGLE_DRIVE_FOLDER_ID=${folder.id}\n`);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Collegamento Drive non riuscito. Controlla il terminale.");
    console.error("Collegamento Google Drive non riuscito:", error.message);
  } finally {
    server.close();
  }
});

server.listen(8787, "localhost", () => {
  console.log("Apri questo link e autorizza l’accesso a Google Drive:");
  console.log(authUrl);
  console.log("\nIn attesa del ritorno OAuth su http://localhost:8787/oauth2callback …");
});
