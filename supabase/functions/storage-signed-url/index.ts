import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

// READ-ONLY: emette un link firmato temporaneo per un file gia' esistente
// in un bucket privato. Nessuna scrittura, nessuna modifica di bucket.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { bucket, path, expiresIn } = await req.json();
    if (!bucket || !path) {
      return jsonResponse({ ok: false, error: "bucket e path obbligatori" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const ttl = Math.min(Math.max(Number(expiresIn) || 3600, 60), 86400);
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, ttl, { download: true });

    if (error) return jsonResponse({ ok: false, error: error.message }, 400);
    return jsonResponse({ ok: true, signedUrl: data.signedUrl, expiresIn: ttl });
  } catch (e) {
    return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
