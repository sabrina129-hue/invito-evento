import { getServerEnv } from "./serverEnv.js";

export const inviteTable = getServerEnv("INVITE_TABLE") || "partecipanti";
