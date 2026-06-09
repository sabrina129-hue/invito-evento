import { inviteTable } from "../lib/inviteConfig.js";

export default function handler(req, res) {
  res.status(200).json({
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasSupabaseKey: Boolean(process.env.SUPABASE_KEY),
    hasAdminPassword: Boolean(process.env.ADMIN_PASSWORD),
    hasAdminToken: Boolean(process.env.ADMIN_TOKEN),
    inviteTable,
  });
}
