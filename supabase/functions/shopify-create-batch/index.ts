import { authenticate, AuthError } from "../_shared/admin-v2-auth.ts";
import { canWriteCanary } from "../_shared/admin-v2-permissions.ts";
import { corsHeaders } from "../_shared/shopify-admin-client.ts";
import { executeCreateBatch } from "./executor.ts";
import { SupabaseCreationLedger } from "./ledger.ts";
import { loadServerCreateManifest } from "./manifest.ts";
import { AdminGraphqlCreateClient } from "./shopify-client.ts";
import type { CreateMode } from "./types.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(code: string, message: string, status: number) {
  return json({ ok: false, error: { code, message } }, status);
}

export async function handleShopifyCreateBatch(
  req: Request,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail("METHOD_NOT_ALLOWED", "Usare POST", 405);
  }
  try {
    const auth = await authenticate(req);
    if (!canWriteCanary(auth.roles)) {
      return fail("FORBIDDEN", "Solo admin o tech_admin", 403);
    }
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (
      body.mode !== undefined && body.mode !== "DRY_RUN" &&
      body.mode !== "EXECUTE"
    ) {
      return fail("VALIDATION_ERROR", "mode non valido", 422);
    }
    const mode: CreateMode = body.mode === "EXECUTE" ? "EXECUTE" : "DRY_RUN";
    const manifest = loadServerCreateManifest(
      Deno.env.get("SHOPIFY_CREATE_BATCH_MANIFEST_JSON"),
    );
    if (body.batchId !== manifest.batchId) {
      return fail("BATCH_ID_MISMATCH", "batchId non approvato", 409);
    }
    if (
      mode === "EXECUTE" &&
      (body.confirm !== "SHOPIFY_CREATE_EXECUTE" ||
        Deno.env.get("SHOPIFY_CREATE_EXECUTE_ENABLED") !== "true")
    ) {
      return fail(
        "EXECUTE_DISABLED",
        "Execute richiede conferma esplicita e gate server-side",
        409,
      );
    }
    const report = await executeCreateBatch(
      new AdminGraphqlCreateClient(),
      new SupabaseCreationLedger(),
      manifest,
      mode,
    );
    console.log(JSON.stringify({
      scope: "shopify-create-batch",
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
    const safe = /^(MANIFEST_|BATCH_)/.test(code)
      ? raw
      : "Executor non disponibile; consultare i log server-side";
    return fail(code, safe, 503);
  }
}

if (import.meta.main) Deno.serve(handleShopifyCreateBatch);
