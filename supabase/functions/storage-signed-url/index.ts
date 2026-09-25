import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

// Signing is a delegated read capability, not a public read-only operation.
// Keep the caller's JWT: Storage SELECT policies authorize the exact object.
const allowedBuckets = new Set(["csv-pipeline", "sync"]);

function reply(body: unknown, status = 200): Response {
  const response = jsonResponse(body, status);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function validPath(path: unknown): path is string {
  return typeof path === "string" && path.length > 0 && path.length <= 1024 &&
    path === path.trim() && !/[\\%?#\u0000-\u001f\u007f]/.test(path) &&
    path.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return reply({ ok: false, error: "Metodo non consentito" }, 405);

  const token = req.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token) return reply({ ok: false, error: "Autenticazione richiesta" }, 401);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!url || !key) return reply({ ok: false, error: "Servizio non disponibile" }, 500);

    // Never fall back to service_role: it would bypass bucket/path/owner RLS.
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    try {
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) return reply({ ok: false, error: "Autenticazione richiesta" }, 401);
    } catch {
      return reply({ ok: false, error: "Autenticazione richiesta" }, 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return reply({ ok: false, error: "Richiesta non valida" }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return reply({ ok: false, error: "Richiesta non valida" }, 400);
    }
    const { bucket, path, expiresIn } = body as Record<string, unknown>;
    if (typeof bucket !== "string" || !allowedBuckets.has(bucket)) {
      return reply({ ok: false, error: "Bucket non consentito" }, 403);
    }
    if (!validPath(path)) return reply({ ok: false, error: "Percorso non valido" }, 400);
    if (expiresIn !== undefined &&
      (typeof expiresIn !== "number" || !Number.isSafeInteger(expiresIn) || expiresIn <= 0)) {
      return reply({ ok: false, error: "Durata non valida" }, 400);
    }

    const ttl = Math.min(Math.max((expiresIn as number | undefined) ?? 3600, 60), 3600);
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, ttl, { download: true });

    // Do not expose whether an inaccessible object exists or log bearer URLs.
    if (error || !data?.signedUrl) return reply({ ok: false, error: "File non disponibile" }, 404);
    return reply({ ok: true, signedUrl: data.signedUrl, expiresIn: ttl });
  } catch {
    return reply({ ok: false, error: "Servizio non disponibile" }, 500);
  }
});
