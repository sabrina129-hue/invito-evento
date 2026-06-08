export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminPassword || !adminToken) {
    return res.status(500).json({
      error: "Configurazione admin mancante sul server",
    });
  }

  if (password === adminPassword) {
    return res.status(200).json({
      token: adminToken,
    });
  }

  return res.status(401).json({ error: "Password errata" });
}
