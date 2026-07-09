import { inviteTable } from "../lib/inviteConfig.js";
import { getServerEnv } from "../lib/serverEnv.js";

export default function handler(req, res) {
  res.status(200).json({
    hasSupabaseUrl: Boolean(getServerEnv("SUPABASE_URL")),
    hasSupabaseKey: Boolean(getServerEnv("SUPABASE_KEY")),
    hasAdminPassword: Boolean(getServerEnv("ADMIN_PASSWORD")),
    hasAdminToken: Boolean(getServerEnv("ADMIN_TOKEN")),
    hasGoogleDrivePhotosFolderId: Boolean(getServerEnv("GOOGLE_DRIVE_PHOTOS_FOLDER_ID")),
    hasGoogleServiceAccount: Boolean(getServerEnv("GOOGLE_SERVICE_ACCOUNT_JSON") || (
      getServerEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL") && getServerEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")
    )),
    inviteTable,
  });
}
