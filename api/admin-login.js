async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminPassword || !adminToken) {
    return res.status(500).json({
      error: "Configurazione admin mancante sul server",
    });
  }

  let body;

  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: "Body JSON non valido" });
  }

  const { password } = body;

  if (password === adminPassword) {
    return res.status(200).json({
      token: adminToken,
    });
  }

  return res.status(401).json({ error: "Password errata" });
}
