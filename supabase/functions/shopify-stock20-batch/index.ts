import { corsHeaders } from "../_shared/shopify-admin-client.ts";
import { authenticate, AuthError } from "../_shared/admin-v2-auth.ts";
import { canWriteCanary } from "../_shared/admin-v2-permissions.ts";
import { executeStock20Batch } from "./executor.ts";
import { loadServerManifest } from "./manifest.ts";
import { AdminGraphqlStock20Client } from "./shopify-client.ts";
import type { Stock20Mode } from "./types.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(code: string, message: string, status: number): Response {
  return json({ ok: false, error: { code, message } }, status);
}

export async function handleStock20Batch(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail("METHOD_NOT_ALLOWED", "Usare POST", 405);
  }

  try {
    const auth = await authenticate(req);
    if (!canWriteCanary(auth.roles)) {
      return fail(
        "FORBIDDEN",
        "Operazione riservata ad admin o tech_admin",
        403,
      );
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const mode: Stock20Mode = body.mode === "EXECUTE" ? "EXECUTE" : "DRY_RUN";
    if (
      body.mode !== undefined && body.mode !== "DRY_RUN" &&
      body.mode !== "EXECUTE"
    ) {
      return fail("VALIDATION_ERROR", "mode non valido", 422);
    }

    // Il manifest non arriva dal browser: viene installato come configurazione
    // server-side dopo il preflight Lovable e contiene al massimo 25 target.
    const manifest = loadServerManifest(
      Deno.env.get("SHOPIFY_STOCK20_BATCH_MANIFEST_JSON"),
    );
    if (body.batchId !== manifest.batchId) {
      return fail("BATCH_ID_MISMATCH", "batchId non approvato", 409);
    }
    if (mode === "EXECUTE") {
      if (
        body.confirm !== "STOCK20_EXECUTE" ||
        Deno.env.get("SHOPIFY_STOCK20_EXECUTE_ENABLED") !== "true"
      ) {
        return fail(
          "EXECUTE_DISABLED",
          "Execute richiede conferma esplicita e gate server-side",
          409,
        );
      }
    }

    const report = await executeStock20Batch(
      new AdminGraphqlStock20Client(),
      manifest,
      mode,
    );
    console.log(JSON.stringify({
      scope: "shopify-stock20-batch",
      actor: `${auth.userId.slice(0, 8)}…`,
      batchId: manifest.batchId,
      mode,
      summary: report.summary,
      stopped: report.stopped,
    }));
    return json(report, report.ok ? 200 : 207);
  } catch (error) {
    if (error instanceof AuthError) {
      return fail(
        error.code,
        error.message,
        error.code === "UNAUTHENTICATED" ? 401 : 403,
      );
    }
    const raw = error instanceof Error ? error.message : String(error);
    const code = raw.split(":", 1)[0] || "INTERNAL_ERROR";
    const safeMessage =
      /^MANIFEST_|^BATCH_|^DUPLICATE_|^LOCATION_|^TARGET_|^READINESS_|^STRUCTURE_/
          .test(code)
        ? raw
        : "Executor non disponibile; consultare i log server-side";
    return fail(code, safeMessage, 503);
  }
}

if (import.meta.main) Deno.serve(handleStock20Batch);
