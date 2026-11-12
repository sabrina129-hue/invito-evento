import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { inviteTable as configuredInviteTable } from "../lib/inviteConfig.js";
import { event } from "../src/data/event.js";

function getErrorCategory(error) {
  if (error?.status === 401 || error?.status === 403 || error?.code === "42501") return "DATABASE_AUTH_OR_RLS";
  if (error?.code === "42P01") return "DATABASE_TABLE_NOT_FOUND";
  if (error?.code === "PGRST204" || error?.code === "42703") return "DATABASE_COLUMN_MISMATCH";
  return "DATABASE_INSERT_FAILED";
}

export default async function handler(req, res) {
  const requestId = randomUUID();
  const startedAt = Date.now();
  res.setHeader("X-Request-Id", requestId);

  const fail = (status, code, error, diagnostics = {}) => {
    console.error(JSON.stringify({
      event: "rsvp.failure",
      requestId,
      code,
      status,
      elapsedMs: Date.now() - startedAt,
      ...diagnostics,
    }));
    return res.status(status).json({ error, code, requestId });
  };

  if (req.method !== "POST") {
    return fail(405, "METHOD_NOT_ALLOWED", "Metodo non consentito");
  }
  const rsvpDeadline = Date.parse(event.rsvp.deadline);
  if (Number.isFinite(rsvpDeadline) && Date.now() > rsvpDeadline) {
    return fail(410, "RSVP_CLOSED", "Il termine per inviare la risposta è scaduto");
  }

  // Accept either the project URL or the REST URL copied from Supabase.
  const rawUrl = String(process.env.SUPABASE_URL || "").trim();
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
  const supabaseKey = String(process.env.SUPABASE_KEY || "").trim();
  const table = String(process.env.INVITE_TABLE || configuredInviteTable || "").trim();
  const missing = [
    ["SUPABASE_URL", supabaseUrl],
    ["SUPABASE_KEY", supabaseKey],
    ["INVITE_TABLE", table],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length) {
    return fail(500, "SUPABASE_CONFIG_MISSING", "Configurazione del servizio non completa", { missing });
  }

  try {
    const parsedUrl = new URL(supabaseUrl);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") throw new Error("Unsupported protocol");
  } catch {
    return fail(500, "SUPABASE_URL_INVALID", "Configurazione del servizio non valida");
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const cleanName = String(body.name || "").trim();
  const cleanMessage = String(body.message || "").trim();
  const rawAttending = body.partecipa ?? body.partecipate;
  const cleanPartecipate = rawAttending === true || rawAttending === "true";
  const cleanGuests = cleanPartecipate ? Math.max(1, Number(body.guests) || 1) : 0;

  if (!cleanName) {
    return res.status(400).json({ error: "Il nome è obbligatorio", code: "NAME_REQUIRED", requestId });
  }

  let supabase;
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  } catch (error) {
    return fail(500, "SUPABASE_CLIENT_INIT_FAILED", "Impossibile inizializzare il servizio", {
      host: new URL(supabaseUrl).host,
      table,
      message: String(error?.message || "Unknown error").slice(0, 500),
    });
  }

  let result;
  try {
    result = await supabase
      .from(table)
      .insert([{ name: cleanName, partecipa: cleanPartecipate, guests: cleanGuests, message: cleanMessage }])
      .select()
      .single();
  } catch (error) {
    return fail(500, "SUPABASE_REQUEST_FAILED", "Non siamo riusciti a salvare la risposta", {
      host: new URL(supabaseUrl).host,
      table,
      message: String(error?.message || "Unknown error").slice(0, 500),
    });
  }

  let { data, error } = result;

  // Retry only for legacy tables that lack the current column.
  if ((error?.code === "PGRST204" || error?.code === "42703") && /partecipa/i.test(error.message || "")) {
    try {
      ({ data, error } = await supabase
        .from(table)
        .insert([{ name: cleanName, partecipate: cleanPartecipate, guests: cleanGuests, message: cleanMessage }])
        .select()
        .single());
    } catch (retryError) {
      return fail(500, "SUPABASE_RETRY_FAILED", "Non siamo riusciti a salvare la risposta", {
        host: new URL(supabaseUrl).host,
        table,
        message: String(retryError?.message || "Unknown error").slice(0, 500),
      });
    }
  }

  if (error) {
    return fail(500, getErrorCategory(error), "Non siamo riusciti a salvare la risposta", {
      host: new URL(supabaseUrl).host,
      table,
      supabaseCode: error.code || null,
      message: String(error.message || "Unknown error").slice(0, 500),
      details: String(error.details || "").slice(0, 500),
      hint: String(error.hint || "").slice(0, 300),
    });
  }

  console.info(JSON.stringify({
    event: "rsvp.success",
    requestId,
    elapsedMs: Date.now() - startedAt,
    table,
  }));
  return res.status(201).json({ data, requestId });
}
