export default function handler(req, res) {
  console.log("ENV ADMIN_PASSWORD =", process.env.ADMIN_PASSWORD);

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { password } = req.body;
  console.log("PASSWORD INSERITA =", password);

  if (password === process.env.ADMIN_PASSWORD) {
    return res.status(200).json({
      token: process.env.ADMIN_TOKEN,
    });
  }

  return res.status(401).json({ error: "Password errata" });
}
