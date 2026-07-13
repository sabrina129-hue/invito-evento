import { inviteTable } from "../lib/inviteConfig.js";
import { getServerEnv } from "../lib/serverEnv.js";

export default function handler(req, res) {
  res.status(200).json({
    hasSupabaseUrl: Boolean(getServerEnv("SUPABASE_URL")),
    hasSupabaseKey: Boolean(getServerEnv("SUPABASE_KEY")),
    hasAdminPassword: Boolean(getServerEnv("ADMIN_PASSWORD")),
    hasAdminToken: Boolean(getServerEnv("ADMIN_TOKEN")),
    hasPhotoUploadWebhookUrl: Boolean(getServerEnv("PHOTO_UPLOAD_WEBHOOK_URL")),
    hasPhotoUploadSecret: Boolean(getServerEnv("PHOTO_UPLOAD_SECRET")),
    inviteTable,
  });
}
